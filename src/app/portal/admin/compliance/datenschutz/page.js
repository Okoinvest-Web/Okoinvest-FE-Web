import Link from "next/link";
import { AlarmClock, Archive, CheckCircle2, FileSpreadsheet, FileText, Hourglass, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge, Karte, Kennzahl, SeitenKopf } from "@/components/Portal/ui";
import { AnfrageAktionen, AnfrageFormular, FristenLauf } from "@/components/Portal/Compliance/Werkzeuge";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";
import { VVT } from "@/lib/plattform/compliance/vvt";
import { cn } from "@/components/ui/cn";

export const metadata = { title: "Compliance · Datenschutz (DSGVO)" };

const FILTER = [["offen", "Offen"], ["verlaengert", "Verlängert"], ["erledigt", "Erledigt"], ["abgelehnt", "Abgelehnt"], ["alle", "Alle"]];
const AMPEL = { gruen: "ok", gelb: "warn", rot: "dunkel", erledigt: "neutral" };
const datum = (s) => (s ? String(s).slice(0, 10).split("-").reverse().join(".") : "–");

export default async function DatenschutzSeite({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = (await searchParams) || {};
  const status = FILTER.some(([k]) => k === sp.status) ? sp.status : "offen";
  const w = werkzeugeBackend();
  const [d, sla] = await Promise.all([laden(() => w.dsUebersicht(n, { status })), laden(() => w.kycSlaUebersicht(n))]);
  const k = d.kennzahlen;
  return (
    <>
      <SeitenKopf
        eyebrow="Backoffice · Compliance"
        titel="Datenschutz"
        text="Betroffenenanfragen nach Art. 15–21 DSGVO mit Monatsfrist (Art. 12 Abs. 3), Verzeichnis der Verarbeitungstätigkeiten, Löschkonzept und Fristen-Läufe. Schweiz: revDSG mit 30 Tagen für Auskünfte."
        aktionen={<><Button href="/portal/admin/compliance" size="sm" variant="secondary" icon={ShieldCheck}>KYC/KYB</Button><Button href="/portal/admin/compliance/gwg" size="sm" variant="secondary" icon={AlarmClock}>Geldwäsche-Verdacht</Button></>}
      />
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kennzahl ton="dunkel" icon={Hourglass} label="Offene Anfragen" wert={String(k.offen)} href="/portal/admin/compliance/datenschutz" />
        <Kennzahl icon={AlarmClock} label="Frist ≤ 7 Tage" wert={String(k.faellig7)} />
        <Kennzahl icon={AlarmClock} label="Frist überschritten" wert={String(k.ueberfaellig)} />
        <Kennzahl icon={CheckCircle2} label="Erledigt (12 Monate)" wert={String(k.erledigt12m)} href="/portal/admin/compliance/datenschutz?status=erledigt" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Karte titel="Betroffenenanfragen" untertitel="Sortiert nach Frist" innen="p-0" className="self-start">
          <nav aria-label="Filter" className="flex gap-1.5 overflow-x-auto border-b border-ink-100 px-5 py-3 ov-no-scrollbar md:px-6">
            {FILTER.map(([key, label]) => <Link key={key} href={`/portal/admin/compliance/datenschutz?status=${key}`} aria-current={status === key ? "page" : undefined} className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 ring-inset", status === key ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200")}>{label}</Link>)}
          </nav>
          {d.anfragen.length ? (
            <ul className="divide-y divide-ink-100">
              {d.anfragen.map((a) => (
                <li key={a.id} className="px-5 py-4 md:px-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge ton={a.statusTon}>{a.statusLabel}</Badge>
                    <Badge>{a.artLabel} · {a.norm}</Badge>
                    {a.restTage !== null && <Badge ton={AMPEL[a.ampel]}>{a.ueberfaellig ? `Frist seit ${-a.restTage} Tg. überschritten` : `Frist ${datum(a.frist)} · ${a.restTage} Tg.`}</Badge>}
                    <span className="text-[12.5px] text-ink-500">{a.id} · Eingang {datum(a.eingangAm)} · {a.kanal} · {a.land}</span>
                  </div>
                  <p className="mt-1.5 font-semibold text-ink-900">{a.name}{a.email ? <span className="font-normal text-ink-500"> · {a.email}</span> : null}{a.konto ? <span className="font-normal text-ink-500"> · Konto {a.konto.id}{a.konto.geloescht ? " (anonymisiert)" : ""}</span> : null}</p>
                  {a.beschreibung && <p className="mt-1 whitespace-pre-line text-[13.5px] text-ink-700">{a.beschreibung}</p>}
                  {a.identitaet && <p className="mt-1 text-[13px] text-ink-600">Identität: {a.identitaet.status === "bestaetigt" ? "bestätigt" : "angefordert"} – {a.identitaet.notiz}</p>}
                  {a.ergebnis && <p className="mt-1 text-[13px] text-ink-600">Ergebnis: {a.ergebnis}{a.loeschErgebnis ? ` (${a.loeschErgebnis})` : ""}</p>}
                  {a.exportAm && <p className="mt-1 text-[12.5px] text-ink-500">Datenexport erstellt am {datum(a.exportAm)} (SHA-256 {a.exportSha.slice(0, 12)}…)</p>}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[13px] font-semibold text-ov-700">Antwortentwurf & Verlauf</summary>
                    <p className="mt-2 rounded-2xl bg-ink-50 p-3 text-[13px] text-ink-800 ring-1 ring-ink-200">{a.antwortEntwurf}</p>
                    <ul className="mt-2 space-y-1 text-[12.5px] text-ink-600">{a.verlauf.map((x, i) => <li key={i}>{datum(x.am)} · {x.text}</li>)}</ul>
                  </details>
                  {d.darfSchreiben && <AnfrageAktionen anfrage={a} />}
                </li>
              ))}
            </ul>
          ) : <p className="px-6 py-10 text-center text-[14px] text-ink-500">Keine Anfragen in dieser Ansicht.</p>}
        </Karte>

        <div className="min-w-0 space-y-6">
          {d.darfSchreiben ? (
            <Karte titel="Anfrage erfassen" untertitel="Eingang per E-Mail, Brief, Telefon oder Portal – die Frist läuft ab Eingang"><AnfrageFormular arten={d.arten} heute={d.heute} /></Karte>
          ) : <Karte titel="Nur Übersicht"><p className="text-[14px] text-ink-600">Bearbeitung ist der Backoffice-Rolle „Compliance“ vorbehalten.</p></Karte>}
          <Karte titel="KYC-Warteschlange: Bearbeitungsziel" untertitel={`KYC ${sla.sla.kyc} / KYB ${sla.sla.kyb} / Zweitprüfung ${sla.sla.zweitpruefung} Werktage (internes Ziel)`}>
            <p className="text-[14px] text-ink-700"><strong>{sla.rot}</strong> Fälle über dem Ziel · <strong>{sla.gelb}</strong> heute fällig · {sla.faelle.length} offen</p>
            {sla.faelle.filter((f) => f.ampel !== "gruen").slice(0, 8).map((f) => <p key={f.id} className="mt-1 text-[13px]"><Link href={`/portal/admin/compliance/${f.id}`} className="font-semibold text-ov-700 hover:text-ov-800">{f.id}</Link> · Ziel {datum(f.faelligAm)} · {f.restWerktage < 0 ? `${-f.restWerktage} Werktage drüber` : "heute"}</p>)}
          </Karte>
          <Karte titel="Verzeichnis der Verarbeitungstätigkeiten" untertitel={`Art. 30 DSGVO · ${VVT.length} Tätigkeiten · Entwurf zur Prüfung durch Datenschutzbeauftragte`} aktion={<div className="flex gap-2"><Button href="/api/admin/compliance/vvt?format=csv" size="sm" variant="secondary" icon={FileSpreadsheet}>CSV</Button><Button href="/api/admin/compliance/vvt?format=json" size="sm" variant="secondary" icon={FileText}>JSON</Button></div>}>
            <ul className="space-y-1.5 text-[13px] text-ink-700">{VVT.map((t) => <li key={t.id}><strong>{t.titel}</strong> – {t.rechtsgrundlage}{t.offen ? <span className="text-ink-500"> · offen: {t.offen}</span> : null}</li>)}</ul>
          </Karte>
          <Karte titel="Löschkonzept & Fristen-Läufe" untertitel="Aufbewahrungsklassen und technische Umsetzung">
            <ul className="mb-4 space-y-1.5 text-[13px] text-ink-700">{d.loeschkonzept.map((l) => <li key={l.id}><Archive aria-hidden="true" className="mr-1 inline h-3.5 w-3.5 text-ink-400" /><strong>{l.titel}</strong>: {l.frist} <span className="text-ink-500">({l.umsetzung})</span></li>)}</ul>
            {d.darfSchreiben && <FristenLauf />}
          </Karte>
        </div>
      </div>
    </>
  );
}
