// Faktenleiste unter dem Hero – Rechtsrahmen in vier Zahlen (keine Unternehmenskennzahlen).
import { CalendarRange, HandCoins, Receipt, Route, Scale, Users } from "lucide-react";
import { landDerAnfrage, spracheDerAnfrage } from "@/lib/land/seite";
import { fmtZahl } from "@/lib/sprache/format";
import { cn } from "@/components/ui/cn";
import { KOMMUNE } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const FAKTEN_GEMEINSAM = [
  { icon: HandCoins, wert: fmt(KOMMUNE.beteiligungCt, 1), einheit: "ct/kWh nach § 6 EEG", text: "freiwillig an die Gemeinde – ab dem ersten Betriebsjahr" },
  { icon: Receipt, wert: `${fmt(KOMMUNE.gewerbesteuerStandort * 100)} %`, einheit: "Gewerbesteuer am Standort", text: "Zerlegung nach installierter Leistung (§ 29 GewStG)" },
  { icon: CalendarRange, wert: "1–2", einheit: "Jahre Bauleitplanung", text: "realistische Dauer des gesamten Verfahrens" },
  { icon: Route, wert: "200", einheit: "Meter privilegiert", text: "Streifen an Autobahn und Schiene (§ 35 Abs. 1 Nr. 8 b BauGB)" },
];

// Österreich (Länderinhalt): § 6 EEG, Gewerbesteuer und BauGB gelten nicht. Quellen: § 33 EAG (RIS);
// Koordinationsstelle Energiegemeinschaften (ElWG seit 01.10.2026); Regionsdateien (Widmung je Bundesland).
const FAKTEN_AT = [
  { icon: HandCoins, wert: "0 €", einheit: "Planungskosten", text: "Unterlagen und Gutachten für Widmung und Bewilligungen trägt der Entwickler" },
  { icon: Scale, wert: "25 %", einheit: "EAG-Abschlag", text: "auf Acker- und Grünland – vorbelastete Flächen und Agri-PV sind ausgenommen (§ 33 EAG)" },
  { icon: CalendarRange, wert: "9", einheit: "Landesregeln", text: "Widmung nach der Raumordnung des jeweiligen Bundeslandes" },
  { icon: Users, wert: "ElWG", einheit: "seit 1. Oktober 2026", text: "neue Regeln für Energiegemeinschaften – auch mit der Gemeinde als Mitglied" },
];

// Schweiz (Länderinhalt): § 6 EEG, Gewerbesteuer und BauGB gelten nicht. Quellen: RPG Stand 01.01.2026 (Art. 24ter,
// Art. 25 Abs. 2), Art. 9a EnV – wie src/data/laender/ch/freiflaeche.js; LEG seit 01.01.2026.
const FAKTEN_CH = [
  { icon: HandCoins, wert: "0 CHF", einheit: "Planungskosten", text: "Unterlagen und Gutachten für Baugesuch und Bewilligungen trägt der Entwickler" },
  { icon: Scale, wert: "24ter", einheit: "Art. RPG", text: "ausserhalb der Bauzone nur standortgebundene Anlagen – Ausnahmebewilligung durch den Kanton" },
  { icon: CalendarRange, wert: "5", einheit: "GWh Winterstrom", text: "ab dieser Produktion von Oktober bis März von nationalem Interesse (Art. 9a EnV)" },
  { icon: Users, wert: "LEG", einheit: "seit 1. Januar 2026", text: "lokale Elektrizitätsgemeinschaften – Strom innerhalb der Gemeinde teilen" },
];
const FAKTEN_CH_EN = [
  { einheit: "Planning costs", text: "documents and expert reports for the building application and permits are paid for by the developer" },
  { einheit: "Art. RPG", text: "outside the building zone only site-bound installations – exemption permit from the canton (Swiss Spatial Planning Act)" },
  { einheit: "GWh winter power", text: "from this output between October and March of national interest (Art. 9a EnV)" },
  { einheit: "since 1 January 2026", text: "local electricity communities – share power within the municipality" },
];

// Englisch (Sprachmodell): je Index wie oben, nur Texte (Werte im englischen Format)
const FAKTEN_GEMEINSAM_EN = [
  { wert: fmtZahl(KOMMUNE.beteiligungCt, 1, "en"), einheit: "ct/kWh under § 6 EEG", text: "voluntary payment to the municipality – from the first year of operation" },
  { einheit: "Trade tax at the site", text: "allocated according to installed capacity (§ 29 GewStG, Trade Tax Act)" },
  { einheit: "Years of zoning", text: "realistic duration of the entire procedure" },
  { einheit: "metres privileged", text: "strip along motorways and railways (§ 35 (1) no. 8 b BauGB)" },
];
const FAKTEN_AT_EN = [
  { wert: "€0", einheit: "Planning costs", text: "documents and expert reports for zoning and permits are paid for by the developer" },
  { einheit: "EAG reduction", text: "on arable land and grassland – pre-impacted land and agrivoltaics are exempt (§ 33 EAG)" },
  { einheit: "State rules", text: "zoning (Widmung) under the spatial planning law of the respective federal state" },
  { einheit: "since 1 October 2026", text: "new rules for energy communities – including with the municipality as a member" },
];

export default function Fakten() {
  const land = landDerAnfrage();
  const en = spracheDerAnfrage() === "en";
  const [basis, basisEn] = land === "AT" ? [FAKTEN_AT, FAKTEN_AT_EN] : land === "CH" ? [FAKTEN_CH, FAKTEN_CH_EN] : [FAKTEN_GEMEINSAM, FAKTEN_GEMEINSAM_EN];
  const FAKTEN = en ? basis.map((f, i) => ({ ...f, ...basisEn[i] })) : basis;
  return (
    <section data-abschnitt="fakten" aria-labelledby="fakten-titel" className="relative z-10 -mt-12 md:-mt-16">
      <h2 id="fakten-titel" className="sr-only">{en ? "Legal framework in figures" : "Rechtsrahmen in Zahlen"}</h2>
      <div className="ov-container">
        <div className="relative rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70 md:rounded-[2rem]">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <dl className="grid px-5 sm:grid-cols-2 sm:px-2 lg:grid-cols-4 lg:px-0 lg:py-3">
            {FAKTEN.map((f, i) => (
              <div
                key={i}
                className={cn(
                  "grid grid-cols-[5.25rem_minmax(0,1fr)] items-start gap-x-4 border-ink-100 py-5 sm:px-5 sm:py-6 lg:grid-cols-1 lg:gap-x-0 lg:px-7 lg:py-5 xl:px-8",
                  i > 0 && "border-t",
                  i === 1 && "sm:border-l sm:border-t-0",
                  i === 3 && "sm:border-l",
                  i > 0 && "lg:border-l lg:border-t-0"
                )}
              >
                <dt className="col-start-2 row-start-1 lg:col-start-1 lg:row-start-2">
                  <span className="block font-display text-[16px] font-bold leading-tight tracking-[-0.01em] text-ov-700 lg:mt-2.5 lg:text-[17px]">{f.einheit}</span>
                  <span className="mt-1 block text-pretty text-[14px] leading-snug text-ink-600">{f.text}</span>
                </dt>
                <dd className="col-start-1 row-start-1 flex items-center gap-3">
                  <span aria-hidden="true" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200 lg:order-last lg:ml-auto lg:flex"><f.icon className="h-4 w-4" /></span>
                  <span className="ov-kpi-l block w-full whitespace-nowrap text-right text-ink-900 max-lg:text-[1.75rem] lg:w-auto lg:text-left">{f.wert}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
