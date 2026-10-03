// Fairer Marktvergleich (belegt aus docs/EG-MARKT.md, keine Herabsetzung)
import { Check, Info } from "lucide-react";
import Button from "@/components/ui/Button";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

/** Vergleich: Aussagen zum Markt aus der Marktanalyse (öffentliche Anbieterangaben, Stand 01.10.2026) */
const VERGLEICH = [
  { thema: "Online-Beitritt, EDA-Anbindung, Rechnungen und Gutschriften, Mitgliederportal", markt: "bei nahezu allen Anbietern Standard", wir: "Ebenso enthalten – mit geführter Zustimmung je Netzbetreiber und Fristanzeige" },
  { thema: "Hilfe bei der Zustimmung im Netzbetreiber-Portal", markt: "teils als Anleitung (PDF, Seiten je Netzbetreiber)", wir: "Status Schritt für Schritt im Portal, Countdown und Anleitung im Kontext des Zählpunkts" },
  { thema: "Mehrfachteilnahme mit Teilnahmefaktor", markt: "bei einzelnen Anbietern, teils als eigenes Paket", wir: "Übersicht je Zählpunkt, Regeln Σ ≤ 100 % und max. 5 geprüft, Vorschlag des Optimierers" },
  { thema: "Prognose „grüne Stunden“, Speicher- und Lastverschiebungs-Hinweise", markt: "in öffentlichen Quellen selten belegt", wir: "Prognose aus Messwerten und Wetter, Hinweise ohne Steuerung" },
  { thema: "Vereinsführung, Mahnwesen, Umsatzsteuer-Sonderfälle", markt: "in öffentlichen Quellen selten belegt", wir: "Organe, Versammlungen, Vier-Augen-Freigaben, USt-Fälle (Kleinunternehmer, Landwirt, Reverse Charge)" },
  { thema: "Gründung, Anlagen und Finanzierung aus einer Hand", markt: "Gründungsbegleitung verbreitet, eigene Anlagenprojekte selten", wir: "Gründung als Dienstleistung, PV und Speicher über die ÖKOVOLT-Gruppe, Bürgerbeteiligung" },
];
const MARKT_KOPF = "Am Markt (laut öffentlichen Angaben)";
const HINWEIS = "Grundlage: eigene Auswertung öffentlicher Anbieterangaben (Websites, Preisblätter, Dokumentationen), Stand 01.10.2026. „Selten belegt“ heißt: in öffentlichen Quellen nicht gefunden – nicht, dass es eine Funktion nicht gibt.";

/* „≤ 100 %“ und „max. 5“ nicht über Zeilen trennen */
const fest = (t) => t.replace(/ (%|≤)/g, " $1").replace(/(≤|max\.) /g, "$1 ");
const nr = (i) => String(i + 1).padStart(2, "0");

function HakenPunkt({ klein = false, legende = false }) {
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-ov-600 text-white shadow-[0_4px_10px_-4px_rgba(85,130,39,0.7)] ${legende ? "" : "mt-0.5"} ${klein ? "h-[18px] w-[18px]" : "h-5 w-5"}`}>
      <Check className={klein ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={3} />
    </span>
  );
}

function MarktPunkt({ className = "mt-[7px]" }) {
  return <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ring-[1.5px] ring-inset ring-ink-350 ${className}`} />;
}

/* Ab lg: Tabelle mit hervorgehobener, „schwebender“ eigener Spalte */
function Tabelle() {
  return (
    <div className="relative hidden lg:block">
      {/* Hintergrund-Karte der eigenen Spalte (Breite = letzte Spalte, 38 %) */}
      <div aria-hidden="true" className="absolute -bottom-3 -top-3 right-0 w-[38%] rounded-[1.75rem] bg-gradient-to-b from-ov-50 to-white shadow-e4 ring-1 ring-ov-200" />
      <table aria-describedby="vergleich-hinweis" className="relative w-full table-fixed border-separate border-spacing-0 text-left">
        <caption className="sr-only">Vergleich der Funktionen: am Markt laut öffentlichen Angaben und bei der ÖkoInvest-Plattform</caption>
        <colgroup><col className="w-[31%]" /><col className="w-[31%]" /><col className="w-[38%]" /></colgroup>
        <thead>
          <tr>
            <th scope="col" className="border-b border-ink-200 px-6 pb-4 pt-6 align-bottom text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-500">Aufgabe</th>
            <th scope="col" className="border-b border-ink-200 px-6 pb-4 pt-6 align-bottom text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-500">{MARKT_KOPF}</th>
            <th scope="col" className="border-b border-ov-200 px-8 pb-4 pt-6 align-bottom">
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl bg-ov-600 text-white shadow-[0_6px_16px_-6px_rgba(85,130,39,0.8)]">
                  <Check className="h-[18px] w-[18px]" strokeWidth={2.75} />
                </span>
                <span className="font-display text-[17px] font-extrabold tracking-[-0.01em] text-ink-900">ÖkoInvest-Plattform</span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {VERGLEICH.map((v, i) => {
            const letzte = i === VERGLEICH.length - 1;
            const linie = letzte ? "" : "border-b border-ink-100";
            return (
              <tr key={v.thema} className="group">
                <th scope="row" className={`px-6 py-6 align-top font-normal ${linie}`}>
                  <span className="flex gap-4">
                    <span aria-hidden="true" className="ov-num pt-[3px] font-display text-[12.5px] font-bold text-ink-400">{nr(i)}</span>
                    <span className="font-display text-[16px] font-bold leading-snug text-ink-900">{v.thema}</span>
                  </span>
                </th>
                <td className={`px-6 py-6 align-top text-[15px] leading-relaxed text-ink-600 ${linie}`}>
                  <span className="flex gap-3"><MarktPunkt />{v.markt}</span>
                </td>
                <td className={`px-8 py-6 align-top text-[15px] font-medium leading-relaxed text-ink-800 ${letzte ? "" : "border-b border-ov-200/70"}`}>
                  <span className="flex gap-3"><HakenPunkt />{fest(v.wir)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* Unter lg: scanbare Liste – Aufgabe als Kopf, Markt kompakt, eigene Lösung hervorgehoben */
function Liste() {
  return (
    <div className="lg:hidden">
      {/* Legende einmal statt Beschriftung in jeder Karte */}
      <div aria-hidden="true" className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-600">
        <span className="inline-flex items-center gap-2"><MarktPunkt className="" />{MARKT_KOPF}</span>
        <span className="inline-flex items-center gap-2 font-semibold text-ov-800"><HakenPunkt klein legende />ÖkoInvest-Plattform</span>
      </div>
      <ol aria-label="Vergleich der Funktionen am Markt und bei der ÖkoInvest-Plattform" className="grid gap-3 md:grid-cols-2 md:gap-4">
        {VERGLEICH.map((v, i) => (
          <Reveal as="li" key={v.thema} delay={(i % 2) * 60} className="flex flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-e2 ring-1 ring-ink-200/70">
            <div className="flex gap-3 px-5 pb-4 pt-5">
              <span aria-hidden="true" className="ov-num pt-[2px] font-display text-[12.5px] font-bold text-ink-400">{nr(i)}</span>
              <div className="min-w-0">
                <h3 className="font-display text-[16px] font-bold leading-snug text-ink-900">{v.thema}</h3>
                <dl className="mt-3">
                  <dt className="sr-only">{MARKT_KOPF}</dt>
                  <dd className="flex gap-2.5 text-[14px] leading-relaxed text-ink-600"><MarktPunkt />{v.markt}</dd>
                </dl>
              </div>
            </div>
            <dl className="mt-auto border-t border-ov-200 bg-ov-50 px-5 py-4">
              <dt className="sr-only">ÖkoInvest-Plattform</dt>
              <dd className="flex gap-2.5 text-[14.5px] font-medium leading-relaxed text-ink-800"><HakenPunkt klein />{fest(v.wir)}</dd>
            </dl>
          </Reveal>
        ))}
      </ol>
    </div>
  );
}

export default function Vergleich() {
  return (
    <Section data-abschnitt="vergleich" tone="white" space="lg" className="overflow-hidden">
      <div aria-hidden="true" className="ov-grid-bg-light pointer-events-none absolute inset-x-0 top-0 h-[28rem]" />
      <div className="relative grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12">
        <SectionHeading
          eyebrow="Warum ÖkoInvest"
          title="Was es am Markt gibt – und was wir anders machen"
          lead="Rund ein Dutzend Plattformen decken den Grundumfang solide ab. Den Unterschied machen die Aufgaben rund um die Abrechnung, die in Vorständen die meiste Zeit kosten. Die Plattform geht schrittweise in Betrieb – wir sagen Ihnen im Angebot genau, was ab wann verfügbar ist."
          className="lg:col-span-8"
        />
        <Reveal delay={120} className="lg:col-span-4">
          <div className="flex gap-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-sand-200 md:p-5">
            <Info aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-navy-600" strokeWidth={2} />
            <p id="vergleich-hinweis" className="text-[13px] leading-relaxed text-ink-600">{HINWEIS}</p>
          </div>
        </Reveal>
      </div>

      <Reveal className="relative mt-10 md:mt-14">
        <Tabelle />
        <Liste />
      </Reveal>

      <div className="relative mt-10 flex flex-col items-start gap-4 border-t border-ink-100 pt-8 sm:flex-row sm:items-center sm:justify-between lg:mt-14">
        <p className="max-w-2xl text-[15px] leading-relaxed text-ink-600">
          <span className="font-semibold text-ink-900">Was ist heute schon verfügbar?</span> Fragen Sie uns nach dem aktuellen Stand je Funktion.
        </p>
        <Button href="#anfrage" variant="primary" pfeil className="shrink-0">Aktuellen Funktionsstand erfragen</Button>
      </div>
    </Section>
  );
}
