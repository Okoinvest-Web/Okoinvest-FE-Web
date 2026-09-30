import Link from "next/link";
import { ArrowLeft, Check, CircleDot, Circle, FileText } from "lucide-react";
import { Badge, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import Gantt from "@/components/Portal/Entwicklung/Gantt";
import GutachterAuftrag from "@/components/Portal/Entwicklung/GutachterAuftrag";
import { Fortschritt, RisikoBadge, Wert, datumKurz, monatText, mwpText } from "@/components/Portal/Entwicklung/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";
import { heuteIso } from "@/lib/plattform/entwicklung";
import { LAENDER } from "@/lib/plattform/konstanten";
import { cn } from "@/components/ui/cn";
import { PlanungExtern } from "@/components/Portal/Planung/Reiter"; // Planungsdateien (Gutachter/Co-Investor)

export const metadata = { title: "Projektentwicklung" };

const STAND = {
  erledigt: { label: "erledigt", icon: Check, klasse: "bg-ov-600 text-white" },
  laeuft: { label: "läuft", icon: CircleDot, klasse: "bg-navy-700 text-white" },
  geplant: { label: "geplant", icon: Circle, klasse: "bg-white text-ink-400 ring-1 ring-ink-200" },
};

export default async function EntwicklungExtern({ params }) {
  const n = await portalNutzer();
  const { id } = await params;
  const p = await laden(() => entwicklungBackend().entwicklungExtern(n, id));
  const heute = heuteIso();

  return (
    <>
      <Link href="/portal/entwicklung" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Projektentwicklung</Link>
      <SeitenKopf eyebrow={p.typLabel} titel={p.titel} text={[p.gemeinde, p.bundesland, LAENDER[p.land]].filter(Boolean).join(" · ")}>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge ton="info">{p.phaseLabel}</Badge>
          <Badge>{p.statusLabel}</Badge>
        </div>
      </SeitenKopf>

      <div className="space-y-6">
        {p.eigentuemer && (
          <>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <Karte titel="Wo steht Ihr Projekt?" untertitel="Die wichtigsten Schritte bis zur Inbetriebnahme – Zeiträume sind Planwerte">
                <div className="mb-5"><Fortschritt wert={p.fortschritt} label="Fortschritt des Projekts" /></div>
                <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-0.5 before:bg-ink-100">
                  {p.eigentuemer.schritte.map((s, i) => {
                    const st = STAND[s.stand];
                    return (
                      <li key={i} className="relative flex items-start gap-3">
                        <span className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", st.klasse)}><st.icon aria-hidden="true" className="h-4 w-4" /></span>
                        <div className="min-w-0 pt-1">
                          <p className={cn("text-[15px]", s.stand === "geplant" ? "text-ink-600" : "font-semibold text-ink-900")}>{s.titel}</p>
                          <p className="text-[12.5px] text-ink-500"><span className="sr-only">Stand: </span>{st.label} · {s.stand === "erledigt" ? "abgeschlossen" : "voraussichtlich"} {s.zeitraum}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </Karte>
              <div className="space-y-6">
                <Wert ton="dunkel" label="Inbetriebnahme voraussichtlich" wert={p.eigentuemer.inbetriebnahme || "–"} hinweis="Planwert – Genehmigung und Netzanschluss können Termine verschieben." />
                <Karte titel="Ihre Fläche">
                  <ul className="space-y-3">
                    {p.eigentuemer.meineFlaechen.map((f) => (
                      <li key={f.flaecheId} className="flex flex-wrap items-center justify-between gap-2">
                        <Link href={`/portal/flaechen/${f.flaecheId}`} className="font-semibold text-ink-900 hover:text-ov-700">{f.bezeichnung}</Link>
                        <span className="flex items-center gap-2 text-[13px] text-ink-600">{f.ha ? `${f.ha} ha` : ""}<Badge ton="info">{f.pachtStatusLabel}</Badge></span>
                      </li>
                    ))}
                  </ul>
                </Karte>
                <Hinweis titel="Fragen zu Ihrem Projekt?">Schreiben Sie uns über „Nachrichten“ an Ihrer Fläche – wir melden uns, sobald es Neuigkeiten gibt. Jeden abgeschlossenen Schritt erhalten Sie zusätzlich als Benachrichtigung.</Hinweis>
              </div>
            </div>
          </>
        )}

        {p.investor && (
          <>
            <section aria-label="Kennzahlen Co-Development" className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Wert ton="dunkel" label="Leistung" wert={mwpText(p.investor.mwp)} hinweis={p.investor.mwh ? `${p.investor.mwh} MWh` : p.investor.vermarktungLabel} />
              <Wert label="Fortschritt" wert={`${p.fortschritt} %`} hinweis={p.phaseLabel} />
              <Wert label="Fläche gesichert" wert={`${p.investor.flaecheGesichertHa} ha`} hinweis={`von ${p.investor.flaecheHa} ha`} />
              <Wert label="COD Ziel / Prognose" wert={monatText((p.investor.prognoseCod || "").slice(0, 7))} hinweis={`Ziel ${monatText(p.investor.zielCod)}`} />
            </section>
            <Karte titel="Terminplan" untertitel="Co-Development-Sicht: Soll, Ist/Prognose, kritischer Pfad, Verzug">
              <Gantt meilensteine={p.investor.meilensteine.map((m) => ({ ...m, ueberfaellig: !["erledigt", "entfaellt"].includes(m.status) && m.verzugTage > 0 }))} heute={heute} kompakt />
            </Karte>
            <div className="grid gap-6 lg:grid-cols-2">
              <Karte titel="Risiken (freigegeben)" innen="p-0">
                <ul className="divide-y divide-ink-100">
                  {p.investor.risiken.map((r) => (
                    <li key={r.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-3"><span className="font-semibold text-ink-900">{r.titel}</span><RisikoBadge score={r.score} ampel={r.ampel} /></div>
                      <p className="text-[12.5px] text-ink-500">{r.kategorieLabel} · {r.statusLabel}</p>
                      {r.massnahme && <p className="mt-1 text-[13.5px] text-ink-700">Maßnahme: {r.massnahme}</p>}
                    </li>
                  ))}
                  {!p.investor.risiken.length && <li className="px-5 py-4 text-[14px] text-ink-500">Keine freigegebenen Risiken.</li>}
                </ul>
              </Karte>
              <Karte titel="Dokumente (freigegeben)" innen="p-0">
                <ul className="divide-y divide-ink-100">
                  {p.investor.dokumente.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 px-5 py-3 text-[14px]"><FileText aria-hidden="true" className="h-4 w-4 text-ink-400" /><a href={d.link} className="font-semibold text-ov-700 hover:text-ov-800">{d.name}</a><span className="text-[12px] text-ink-500">{datumKurz(d.am)}</span></li>
                  ))}
                  {!p.investor.dokumente.length && <li className="px-5 py-4 text-[14px] text-ink-500">Noch keine Dokumente freigegeben.</li>}
                </ul>
              </Karte>
            </div>
          </>
        )}

        {p.gutachter && (
          <>
            <Hinweis titel="Ihr Auftrag">Sie sehen nur die Meilensteine, die Ihnen zugewiesen sind. Laden Sie Ihre Unterlagen hoch und reichen Sie sie zur Prüfung ein – die Projektleitung schließt den Meilenstein ab.</Hinweis>
            {p.gutachter.auftraege.map((a) => <GutachterAuftrag key={a.id} projektId={p.id} a={a} />)}
          </>
        )}
        {(p.investor || p.gutachter) && <PlanungExtern nutzer={n} projektId={p.id} />}
      </div>
    </>
  );
}

