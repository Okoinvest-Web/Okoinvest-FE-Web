import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Angaben, Badge, Karte, SeitenKopf } from "@/components/Portal/ui";
import Gantt from "@/components/Portal/Entwicklung/Gantt";
import Plan from "@/components/Portal/Entwicklung/Plan";
import { Entscheidungen, Flaechen, Freigaben, Kontakte, Kosten, Risiken, Stammdaten, Uebergaben } from "@/components/Portal/Entwicklung/Bereiche";
import { Fortschritt, MeilensteinBadge, PhaseBadge, ProjektStatusBadge, Reiter, RisikoBadge, Wert, datumKurz, eurKurz, monatText, mwpText } from "@/components/Portal/Entwicklung/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";
import { heuteIso } from "@/lib/plattform/entwicklung";
import { LAENDER } from "@/lib/plattform/konstanten";
import { KalkulationReiter, PlanungReiter } from "@/components/Portal/Planung/Reiter"; // Planungsdateien & Projektkosten
import { SteuerungReiter } from "@/components/Portal/Entwicklung/SteuerungReiter"; // Ampel, Flächensicherung, Entscheidungsvorlagen

export const metadata = { title: "Entwicklungsprojekt" };

const REITER = ["uebersicht", "plan", "flaechen", "risiken", "kontakte", "entscheidungen", "kosten", "freigaben", "planung", "kalkulation", "steuerung"];

export default async function EntwicklungProjektSeite({ params, searchParams }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const sp = await searchParams;
  const b = entwicklungBackend();
  const [p, auswahl] = await Promise.all([laden(() => b.entwicklungProjekt(n, id)), laden(() => b.entwicklungAuswahl(n))]);
  const reiter = REITER.includes(sp?.reiter) ? sp.reiter : "uebersicht";
  const heute = heuteIso();
  const basis = `/portal/admin/entwicklung/${p.id}`;
  const offeneRisiken = p.risiken.filter((r) => r.status !== "geschlossen");

  return (
    <>
      <Link href="/portal/admin/entwicklung" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Entwicklungs-Pipeline</Link>
      <SeitenKopf
        eyebrow={`${p.typLabel} · ${p.id}`}
        titel={p.titel}
        text={[p.gemeinde, p.landkreis, p.bundesland, LAENDER[p.land]].filter(Boolean).join(" · ")}
        aktionen={<a href={`/portal/admin/entwicklung/${p.id}/steckbrief`} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><Printer aria-hidden="true" className="h-4 w-4" />Projektsteckbrief</a>}
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ProjektStatusBadge status={p.status} />
          <PhaseBadge label={p.phaseLabel} phase={p.phase} />
          {p.meilensteine.some((m) => m.ueberfaellig && m.kritisch) && <Badge className="bg-red-50 text-red-800 ring-red-200">Kritischer Verzug</Badge>}
        </div>
      </SeitenKopf>

      <Reiter
        basis={basis}
        aktiv={reiter}
        reiter={[
          { id: "uebersicht", label: "Übersicht" },
          { id: "plan", label: "Plan & Gantt", zaehler: p.meilensteine.filter((m) => m.ueberfaellig).length, warn: true },
          { id: "flaechen", label: "Flächen", zaehler: p.flaechen.length },
          { id: "risiken", label: "Risiken", zaehler: offeneRisiken.length },
          { id: "kontakte", label: "Behörden & Stakeholder", zaehler: p.kontakte.length },
          { id: "entscheidungen", label: "Entscheidungen", zaehler: p.entscheidungen.length },
          { id: "kosten", label: "Kosten" },
          { id: "freigaben", label: "Freigaben & Gutachter", zaehler: p.rueckfragen.filter((r) => !r.backoffice).length },
          { id: "planung", label: "Pläne" }, // Planungsdateien (CAD)
          { id: "kalkulation", label: "Kostenkalkulation" }, // Projektkostenkalkulation
          { id: "steuerung", label: "Steuerung & Vorlagen" }, // Ampel, Grundbuch, Entscheidungsvorlagen
        ]}
      />

      {reiter === "uebersicht" && (
        <div className="space-y-6">
          <section aria-label="Kennzahlen" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Wert ton="dunkel" label="Leistung" wert={mwpText(p.mwp)} hinweis={p.mwh ? `${p.mwh} MWh Speicher` : p.vermarktungLabel} />
            <Wert label="Pipeline-Wert" wert={eurKurz(p.pipeline.wert)} hinweis={`${Math.round(p.pipeline.wahrscheinlichkeit * 100)} % × ${eurKurz(p.pipeline.volumen)} (${p.pipeline.preisProKwp} €/kWp)`} />
            <Wert label="Fortschritt" wert={`${p.fortschritt} %`} hinweis={`${p.meilensteine.filter((m) => m.status === "erledigt").length} von ${p.meilensteine.filter((m) => m.status !== "entfaellt").length} Meilensteinen`} />
            <Wert ton={p.codVerzugMonate ? "warn" : undefined} label="COD Prognose" wert={monatText((p.prognoseCod || "").slice(0, 7))} hinweis={`Ziel ${monatText(p.zielCod)}${p.codVerzugMonate ? ` · +${p.codVerzugMonate} Monate` : ""}`} />
            <Wert label="Fläche gesichert" wert={`${p.flaecheGesichertHa} ha`} hinweis={`von ${p.flaecheHa} ha`} />
            <Wert label="Budget Ist / Plan" wert={eurKurz(p.budgetIst)} hinweis={`von ${eurKurz(p.budgetPlan)}`} />
          </section>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Karte titel="Terminplan (Überblick)" untertitel="Details, Bearbeiten und Nachweise im Reiter „Plan & Gantt“">
              <Gantt meilensteine={p.meilensteine} heute={heute} kompakt />
            </Karte>
            <div className="space-y-6">
              <Karte titel="Eckdaten">
                <Angaben items={[
                  { label: "Projektleitung", wert: p.projektleiter?.name },
                  { label: "Vermarktung", wert: p.vermarktungLabel },
                  { label: "Netzverknüpfungspunkt", wert: p.nvp },
                  { label: "Netzbetreiber", wert: p.netzbetreiber },
                  { label: "Projektstart", wert: datumKurz(p.start) },
                  { label: "Nächster Meilenstein", wert: p.naechsterMeilenstein ? `${p.naechsterMeilenstein.titel} (${datumKurz(p.naechsterMeilenstein.sollEnde)})` : "–" },
                  { label: "Beschreibung", wert: p.beschreibung, breit: true },
                ]} />
                <div className="mt-4"><Fortschritt wert={p.fortschritt} /></div>
              </Karte>
              <Karte titel="Größte Risiken" innen="p-0">
                <ul className="divide-y divide-ink-100">
                  {offeneRisiken.slice(0, 4).map((r) => (
                    <li key={r.id} className="flex items-start justify-between gap-3 px-5 py-3"><span className="min-w-0 text-[14px] text-ink-800">{r.titel}</span><RisikoBadge score={r.score} ampel={r.ampel} /></li>
                  ))}
                  {!offeneRisiken.length && <li className="px-5 py-4 text-[14px] text-ink-500">Keine offenen Risiken.</li>}
                </ul>
              </Karte>
              <Karte titel="Überfällig" innen="p-0">
                <ul className="divide-y divide-ink-100">
                  {p.meilensteine.filter((m) => m.ueberfaellig).map((m) => (
                    <li key={m.id} className="flex items-start justify-between gap-3 px-5 py-3"><Link href={`${basis}?reiter=plan&ms=${m.id}`} className="min-w-0 text-[14px] font-semibold text-ink-900 hover:text-ov-700">{m.titel}</Link><MeilensteinBadge m={m} /></li>
                  ))}
                  {!p.meilensteine.some((m) => m.ueberfaellig) && <li className="px-5 py-4 text-[14px] text-ink-500">Alles im Plan.</li>}
                </ul>
              </Karte>
            </div>
          </div>
          <Uebergaben projekt={p} />
          <Stammdaten projekt={p} auswahl={auswahl} />
        </div>
      )}
      {reiter === "plan" && <Plan projekt={p} auswahl={auswahl} heute={heute} />}
      {reiter === "flaechen" && <Flaechen projekt={p} auswahl={auswahl} />}
      {reiter === "risiken" && <Risiken projekt={p} auswahl={auswahl} />}
      {reiter === "kontakte" && <Kontakte projekt={p} auswahl={auswahl} />}
      {reiter === "entscheidungen" && <Entscheidungen projekt={p} />}
      {reiter === "kosten" && <Kosten projekt={p} />}
      {reiter === "freigaben" && <Freigaben projekt={p} auswahl={auswahl} />}
      {reiter === "planung" && <PlanungReiter nutzer={n} projektId={p.id} />}
      {reiter === "kalkulation" && <KalkulationReiter nutzer={n} projektId={p.id} />}
      {reiter === "steuerung" && <SteuerungReiter nutzer={n} projektId={p.id} />}
    </>
  );
}
