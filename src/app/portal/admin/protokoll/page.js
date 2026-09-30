import { Link2, ShieldAlert, ShieldCheck } from "lucide-react";
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
  const k = await backend().protokollKette(n, { limit });
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

      <Karte titel={`Letzte ${k.eintraege.length} Einträge`} untertitel="Neueste zuerst – hash = SHA-256(prevHash + Inhalt)">
        <ol className="divide-y divide-ink-100">
          {k.eintraege.map((e) => (
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
      </Karte>
    </div>
  );
}
