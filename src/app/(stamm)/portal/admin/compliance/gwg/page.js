import Link from "next/link";
import { FileWarning, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge, Hinweis, Karte, Kennzahl, SeitenKopf } from "@/components/Portal/ui";
import { VerdachtAktionen, VerdachtFormular } from "@/components/Portal/Compliance/Werkzeuge";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";
import { darfSchreiben } from "@/lib/plattform/rechte";
import { MELDESTELLEN, VERDACHT_ANLAESSE } from "@/lib/plattform/compliance/verdacht";
import { cn } from "@/components/ui/cn";

export const metadata = { title: "Compliance · Geldwäsche-Verdacht (intern)" };

const FILTER = [["offen", "Offen"], ["gemeldet", "Gemeldet"], ["keine_meldung", "Keine Meldung"], ["abgeschlossen", "Abgeschlossen"], ["alle", "Alle"]];
const datum = (s) => (s ? String(s).slice(0, 10).split("-").reverse().join(".") : "–");

export default async function GwgSeite({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = (await searchParams) || {};
  const status = FILTER.some(([k]) => k === sp.status) ? sp.status : "offen";
  const kopf = (
    <SeitenKopf
      eyebrow="Backoffice · Compliance"
      titel="Geldwäsche-Verdacht"
      text="Interner Workflow: Hinweis erfassen, durch die/den Geldwäschebeauftragte/n prüfen (Vier-Augen), Entscheidung dokumentieren. Die Meldung an die Meldestelle erfolgt ausschließlich manuell über deren Portal – die Plattform versendet nichts."
      aktionen={<><Button href="/portal/admin/compliance" size="sm" variant="secondary" icon={ShieldCheck}>KYC/KYB</Button><Button href="/portal/admin/compliance/datenschutz" size="sm" variant="secondary" icon={FileWarning}>Datenschutz</Button></>}
    />
  );
  if (!darfSchreiben(n, "compliance")) {
    return (
      <>
        {kopf}
        <Hinweis ton="info" titel="Vertrauliche Akten" icon={Lock}>Verdachtsakten sieht nur die Backoffice-Rolle „Compliance“ (Need-to-know). Einen Hinweis geben Sie vertraulich über das Formular unten – Sie sehen die Akte danach nicht.</Hinweis>
        <Karte className="mt-6" titel="Vertraulichen Hinweis an Compliance geben"><VerdachtFormular anlaesse={VERDACHT_ANLAESSE} ziel="/api/admin/hinweis" /></Karte>
      </>
    );
  }
  const d = await laden(() => werkzeugeBackend().verdachtListe(n, { status }));
  const heute = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Vienna" }).format(new Date());
  return (
    <>
      {kopf}
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-3 gap-3">
        <Kennzahl ton="dunkel" icon={ShieldAlert} label="Offen" wert={String(d.kennzahlen.offen)} />
        <Kennzahl icon={FileWarning} label="Gemeldet" wert={String(d.kennzahlen.gemeldet)} href="/portal/admin/compliance/gwg?status=gemeldet" />
        <Kennzahl icon={Lock} label="Akten gesamt" wert={String(d.kennzahlen.gesamt)} href="/portal/admin/compliance/gwg?status=alle" />
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Karte titel="Verdachtsfälle" innen="p-0" className="self-start">
          <nav aria-label="Filter" className="flex gap-1.5 overflow-x-auto border-b border-ink-100 px-5 py-3 ov-no-scrollbar md:px-6">
            {FILTER.map(([key, label]) => <Link key={key} href={`/portal/admin/compliance/gwg?status=${key}`} aria-current={status === key ? "page" : undefined} className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 ring-inset", status === key ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200")}>{label}</Link>)}
          </nav>
          {d.faelle.length ? (
            <ul className="divide-y divide-ink-100">
              {d.faelle.map((f) => (
                <li key={f.id} className="px-5 py-4 md:px-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge ton={f.statusTon}>{f.statusLabel}</Badge>
                    <Badge>{f.anlassLabel}</Badge>
                    {f.transaktionGesperrt && <Badge ton="warn">Transaktion angehalten</Badge>}
                    <span className="text-[12.5px] text-ink-500">{f.id} · erfasst {datum(f.erfasstAm)} von {f.erfasstVonName || "–"} · {f.tageOffen} Tg.</span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-[13.5px] text-ink-800">{f.sachverhalt}</p>
                  <p className="mt-1 text-[12.5px] text-ink-600">
                    {f.konto ? <>Konto <strong>{f.konto.id}</strong> {f.konto.name} · </> : null}
                    {f.kycFallId ? <>KYC <Link className="font-semibold text-ov-700" href={`/portal/admin/compliance/${f.kycFallId}`}>{f.kycFallId}</Link> ({f.kycStatus}) · </> : null}
                    {f.betrag ? `Betrag ${f.betrag.toLocaleString("de-DE")} € · ` : ""}Meldestelle: {f.meldestelle.name}
                  </p>
                  {f.entscheidung && <p className="mt-1 text-[13px] text-ink-700">Entscheidung: {f.entscheidung.art === "meldung" ? "Meldung erforderlich" : "keine Meldung"} – {f.entscheidung.begruendung}</p>}
                  {f.meldung && <p className="mt-1 text-[13px] text-ink-700">Gemeldet am {datum(f.meldung.am)} an {f.meldung.stelle}, Az. {f.meldung.aktenzeichen}</p>}
                  {f.aufbewahrenBis && <p className="mt-1 text-[12.5px] text-ink-500">Aufbewahren bis {datum(f.aufbewahrenBis)}</p>}
                  <details className="mt-2"><summary className="cursor-pointer text-[13px] font-semibold text-ov-700">Verlauf</summary><ul className="mt-1 space-y-1 text-[12.5px] text-ink-600">{f.verlauf.map((x, i) => <li key={i}>{datum(x.am)} · {x.text}</li>)}</ul></details>
                  <VerdachtAktionen fall={f} heute={heute} />
                </li>
              ))}
            </ul>
          ) : <p className="px-6 py-10 text-center text-[14px] text-ink-500">Keine Verdachtsfälle in dieser Ansicht.</p>}
        </Karte>
        <div className="min-w-0 space-y-6">
          <Karte titel="Verdachtsfall erfassen"><VerdachtFormular anlaesse={d.anlaesse} vorbelegt={{ kontoId: typeof sp.konto === "string" ? sp.konto.slice(0, 20) : "", kycFallId: typeof sp.fall === "string" ? sp.fall.slice(0, 20) : "" }} /></Karte>
          <Karte titel="Meldestellen (Orientierung)" untertitel="Nach aktuellem Stand – keine Rechtsberatung">
            <ul className="space-y-3 text-[13px] text-ink-700">
              {Object.entries(MELDESTELLEN).map(([land, m]) => <li key={land}><strong>{land}: {m.name}</strong><br />{m.portal} · {m.norm}<br /><span className="text-ink-500">{m.stillhalte} Informationsverbot: {m.info}.</span></li>)}
            </ul>
            <p className="mt-3 text-[12.5px] text-ink-500">Ob ÖkoInvest Verpflichtete im Sinne des Geldwäscherechts ist, ist rechtlich zu klären (docs/handbuch/backoffice-compliance.md).</p>
          </Karte>
        </div>
      </div>
    </>
  );
}
