import Link from "next/link";
import { FileSpreadsheet, Link2, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import DateiLink from "@/components/Portal/DateiLink";
import { eingabe, auswahlfeld } from "@/components/Portal/felder";
import { querschnittBackend } from "@/lib/plattform/backend/querschnitt"; // Querschnitt: Audit-Protokoll-Suche
import { Hinweis, Karte, Kennzahl, SeitenKopf } from "@/components/Portal/ui";
import { cn } from "@/components/ui/cn";
import { KetteNeuPruefen } from "@/components/Portal/Backoffice/Rechte";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { datumZeit } from "@/lib/plattform/format";
import { fmt } from "@/lib/rechner/annahmen";

export const metadata = { title: "Revisionsprotokoll" };

const kurz = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "–");

export default async function AdminProtokoll({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  const limit = Math.min(200, Number(sp?.limit) || 40);
  const filter = Object.fromEntries(["q", "aktion", "objektArt", "nutzer", "von", "bis", "seite"].map((x) => [x, typeof sp?.[x] === "string" ? sp[x] : ""]));
  const [k, treffer] = await Promise.all([backend().protokollKette(n, { limit }), querschnittBackend().protokollSuche(n, { ...filter, proSeite: 50 })]);
  const f = treffer.filter;
  const suchAktiv = !!(f.q || f.aktion || f.objektArt || f.nutzer || f.von || f.bis);
  const qs = (extra = {}) => new URLSearchParams(Object.entries({ ...f, proSeite: "", alle: "", ...extra }).filter(([, w]) => w !== "" && w !== false && w !== null && w !== undefined).map(([a, w]) => [a, String(w)])).toString();
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice" titel="Revisionssicheres Protokoll" text="Jeder Eintrag des Aktivitätsprotokolls ist über SHA-256 mit seinem Vorgänger verkettet (prevHash + Inhalt). Änderungen, Löschungen und Einfügungen fallen bei der Prüfung auf." aktionen={<KetteNeuPruefen />} />

      {k.ok ? (
        <Hinweis ton="ok" icon={ShieldCheck} titel="Kette intakt">
          {fmt(k.geprueft)} Einträge geprüft ({datumZeit(k.geprueftAm)}). Letzter Hash <span className="font-mono">{kurz(k.letzterHash)}</span>.
        </Hinweis>
      ) : (
        <Hinweis ton="warn" icon={ShieldAlert} titel={`Kette gebrochen – ${k.fehler.length} Abweichung(en)`}>
          <ul className="mt-1 space-y-0.5">
            {k.fehler.slice(0, 10).map((f) => <li key={`${f.index}-${f.id}`}>Eintrag {f.index + 1} ({f.id || "ohne Kennung"}, {datumZeit(f.am)}): {f.grund}</li>)}
          </ul>
        </Hinweis>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl label="Einträge in der Kette" wert={fmt(k.anzahl)} hinweis={k.erster ? `seit ${datumZeit(k.erster.am)}` : ""} icon={Link2} />
        <Kennzahl label="Archiviert (Anker)" wert={fmt(k.anker?.anzahl || 0)} hinweis={k.anker ? `bis ${datumZeit(k.anker.bis)} · Anker ${kurz(k.anker.hash)}` : "noch keine Archivierung"} />
        <Kennzahl label="Nachgesiegelt" wert={fmt(k.nachgesiegelt)} hinweis={`Einträge vor Einführung der Kette (${k.seit ? datumZeit(k.seit) : "–"}) bzw. ohne protokoll()`} />
        <Kennzahl label="Verfahren" wert="SHA-256" hinweis={k.verfahren} ton="dunkel" />
      </div>

      <Karte
        titel={suchAktiv ? `${fmt(treffer.gesamt)} Treffer` : "Protokoll durchsuchen"}
        untertitel={suchAktiv ? `Seite ${f.seite} von ${treffer.seiten} · neueste zuerst` : `Neueste zuerst · ${fmt(treffer.gesamt)} Einträge · hash = SHA-256(prevHash + Inhalt)`}
        aktion={<DateiLink href={`/api/admin/protokoll/suche?${qs({ seite: "", format: "csv" })}`} icon={FileSpreadsheet} size="xs">Treffer als CSV</DateiLink>}
      >
        <form method="get" role="search" className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_minmax(0,9.5rem)_minmax(0,9.5rem)_auto]">
          <label className="relative min-w-0 sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Freitext</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input type="search" name="q" defaultValue={f.q} placeholder="Text, Objekt-ID, Eintrag …" className={cn(eingabe, "h-10 pl-10 text-[14px]")} />
          </label>
          <label className="min-w-0"><span className="sr-only">Aktion</span>
            <select name="aktion" defaultValue={f.aktion} className={cn(auswahlfeld, "h-10 text-[14px]")}>
              <option value="">Alle Aktionen</option>
              {[...new Set([f.aktion, ...treffer.facetten.aktion.map((x) => x.wert)].filter(Boolean))].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="min-w-0"><span className="sr-only">Objektart</span>
            <select name="objektArt" defaultValue={f.objektArt} className={cn(auswahlfeld, "h-10 text-[14px]")}>
              <option value="">Alle Objekte</option>
              {[...new Set([f.objektArt, ...treffer.facetten.objektArt.map((x) => x.wert)].filter(Boolean))].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="min-w-0"><span className="sr-only">Nutzer (Name oder ID)</span>
            <input name="nutzer" defaultValue={f.nutzer} placeholder="Nutzer" className={cn(eingabe, "h-10 text-[14px]")} />
          </label>
          <label className="min-w-0"><span className="sr-only">Von</span><input type="date" name="von" defaultValue={f.von} className={cn(eingabe, "h-10 text-[14px]")} /></label>
          <label className="min-w-0"><span className="sr-only">Bis</span><input type="date" name="bis" defaultValue={f.bis} className={cn(eingabe, "h-10 text-[14px]")} /></label>
          <div className="flex gap-2">
            <button type="submit" className="h-10 rounded-full bg-navy-700 px-4 text-[14px] font-semibold text-white hover:bg-navy-800">Suchen</button>
            {suchAktiv && <Link href="/portal/admin/protokoll" className="inline-flex h-10 items-center rounded-full px-3 text-[13.5px] font-semibold text-ov-700 hover:bg-ov-50">Zurücksetzen</Link>}
          </div>
        </form>
        {treffer.eintraege.length === 0 && <p className="rounded-2xl bg-sand-50 px-4 py-6 text-center text-[14px] text-ink-500">Keine Einträge zu dieser Suche.</p>}
        <ol className="divide-y divide-ink-100">
          {treffer.eintraege.map((e) => (
            <li key={e.id} className="grid gap-1 py-3 first:pt-0 md:grid-cols-[10rem_minmax(0,1fr)_minmax(0,15rem)]">
              <p className="text-[12.5px] text-ink-500">{datumZeit(e.am)}</p>
              <div className="min-w-0">
                <p className="text-[14px] text-ink-900"><span className="font-semibold">{e.aktion}</span> · {e.text}</p>
                <p className="text-[12px] text-ink-500">{e.nutzer} · {e.objektArt} <span className="font-mono">{e.objektId}</span>{e.nachgesiegelt ? " · nachgesiegelt" : ""}</p>
              </div>
              <p className={cn("font-mono text-[11.5px] leading-snug text-ink-500")} title={`prevHash ${e.prevHash}\nhash ${e.hash}`}>
                <span className="block">prev {kurz(e.prevHash)}</span>
                <span className="block text-ink-800">hash {kurz(e.hash)}</span>
              </p>
            </li>
          ))}
        </ol>
        {treffer.seiten > 1 && (
          <nav aria-label="Seiten" className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
            {f.seite > 1 ? <Link href={`/portal/admin/protokoll?${qs({ seite: f.seite - 1 })}`} className="rounded-full px-3 py-1.5 font-semibold text-ov-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">Neuere</Link> : <span />}
            <span className="text-ink-500">Seite {f.seite} von {treffer.seiten}</span>
            {f.seite < treffer.seiten ? <Link href={`/portal/admin/protokoll?${qs({ seite: f.seite + 1 })}`} className="rounded-full px-3 py-1.5 font-semibold text-ov-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">Ältere</Link> : <span />}
          </nav>
        )}
      </Karte>
    </div>
  );
}
