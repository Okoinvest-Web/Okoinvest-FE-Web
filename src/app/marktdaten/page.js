// marktdaten/page.js – Marktdaten-Hub Freiflächen-PV (EEG-Ausschreibungen, Marktwert Solar, Capture Rate, Zubau, Pacht)

import Link from "next/link";
import { ArrowRight, BarChart3, Database, ExternalLink, Gavel, Sun, TrendingDown, Zap } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import AusschreibungsChart from "@/components/Marktdaten/AusschreibungsChart";
import MarktwertChart from "@/components/Marktdaten/MarktwertChart";
import LiveEinordnung from "@/components/Marktdaten/LiveEinordnung";
import { abs } from "@/data/site";
import {
  AUSSCHREIBUNGEN,
  AUSSCHREIBUNGEN_JAHR,
  MARKTWERTE,
  MARKTWERT_SOLAR_FRUEHER,
  NEGATIVE_STUNDEN,
  ZUBAU,
  MARKTDATEN_QUELLEN,
  MARKTDATEN_STAND,
  MARKTDATEN_STAND_TEXT,
  NAECHSTER_GEBOTSTERMIN,
  LETZTE_AUSSCHREIBUNG,
  LETZTER_MARKTWERT,
  MIN_ZUSCHLAG,
  MAX_ZUSCHLAG,
  SUMME_ZUSCHLAG_MW,
  LANDPACHT_DESTATIS,
} from "@/data/marktdaten";
import { PACHT, ERLOESE, FREIFLAECHE } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { getEnergySnapshot } from "@/lib/energy";

export const revalidate = 900;

const PFAD = "/marktdaten";
const PAGE_URL = abs(PFAD);

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Marktdaten Solar: EEG-Zuschläge & Marktwert | ÖkoInvest",
  description:
    "Marktdaten Freiflächen-PV: EEG-Zuschlagswerte Solar seit 2017, Höchstwerte, Gebotsmengen, Marktwert Solar, Capture Rate, Zubau DACH und Pachtniveau – mit Quellen.",
  keywords: [
    "EEG Ausschreibung Solar Ergebnisse",
    "Zuschlagswert Solar Freifläche",
    "Marktwert Solar Jahresmarktwert",
    "Capture Rate Solar Deutschland",
    "Solarpark Marktdaten",
    "negative Strompreise Stunden",
    "PV Zubau Freifläche",
  ],
});

/* ------------------------------------------------------------------ */
/* Abgeleitete Aussagen                                                */
/* ------------------------------------------------------------------ */

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const termin = (iso) => `${Number(iso.slice(8, 10))}. ${MONATE[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const ct = (v, s = 2) => `${fmt(v, s)} ct/kWh`;
const L = LETZTE_AUSSCHREIBUNG;
const VORLETZTE = AUSSCHREIBUNGEN[AUSSCHREIBUNGEN.length - 2];
const JAHR_2025 = AUSSCHREIBUNGEN_JAHR.find((j) => j.jahr === 2025);
const MW_2020 = MARKTWERTE.find((m) => m.jahr === 2020);
const NEG_2025 = NEGATIVE_STUNDEN.find((n) => n.jahr === 2025);
const NEG_2022 = NEGATIVE_STUNDEN.find((n) => n.jahr === 2022);
const ERSTER = AUSSCHREIBUNGEN[0];
const SEIT_2024 = AUSSCHREIBUNGEN.filter((a) => a.datum >= "2024").reduce((r, a) => ({ min: Math.min(r.min, a.mittel), max: Math.max(r.max, a.mittel) }), { min: Infinity, max: -Infinity });
const faktorAcker = PACHT.freiflaecheProHa.mittel / LANDPACHT_DESTATIS.schnitt;

const ANTWORT = `Beim letzten Gebotstermin am ${termin(L.datum)} lag der mengengewichtete Zuschlagswert für Freiflächen-Solaranlagen bei ${ct(L.mittel)} (Vorrunde: ${ct(VORLETZTE.mittel)}). Seit ${ERSTER.datum.slice(0, 4)} schwankten die Ergebnisse zwischen ${ct(MIN_ZUSCHLAG.mittel)} (${termin(MIN_ZUSCHLAG.datum)}) und ${ct(MAX_ZUSCHLAG.mittel)} (${termin(MAX_ZUSCHLAG.datum)}).`;

const KENNZAHLEN = [
  { icon: Gavel, wert: fmt(L.mittel, 2), einheit: "ct/kWh", text: `Ø Zuschlag Solar, ${termin(L.datum)}` },
  { icon: BarChart3, wert: fmt(L.gebote / L.volumen, 1), einheit: "fach", text: `überzeichnet im ${MONATE[Number(L.datum.slice(5, 7)) - 1]} ${L.datum.slice(0, 4)}` },
  { icon: Sun, wert: fmt(LETZTER_MARKTWERT.capture * 100), einheit: "%", text: `Capture Rate Solar ${LETZTER_MARKTWERT.jahr}` },
  { icon: TrendingDown, wert: fmt(NEG_2025.stunden), einheit: "h", text: `Stunden mit negativem Preis ${NEG_2025.jahr}` },
];

const PHASEN_TEXT = [
  {
    titel: "2017–2021: Kostenverfall und stabiler Wettbewerb",
    text: `Von ${ct(ERSTER.mittel)} im Februar 2017 fielen die Zuschläge binnen eines Jahres auf ${ct(4.33)}. Danach pendelten sie sich – mit Ausreißern bei den Sonderausschreibungen 2019 – um 5 ct ein – bei zunächst kleinen Ausschreibungsmengen von 100 bis 600 MW je Termin.`,
  },
  {
    titel: "2022–2023: Zinswende, Lieferketten, höherer Höchstwert",
    text: "2022 blieben einzelne Runden unterzeichnet, die Zuschläge stiegen bis an den Höchstwert. Die Bundesnetzagentur hob den Höchstwert für 2023 auf 7,37 ct an – im März 2023 lag der Durchschnitt mit 7,03 ct auf dem höchsten Stand seit 2017.",
  },
  {
    titel: "Seit 2024: große Volumen, starker Wettbewerb",
    text: `Mit Ausschreibungsmengen von über 2 GW je Termin und deutlicher Überzeichnung liegen die Ergebnisse wieder zwischen ${fmt(SEIT_2024.min, 2)} und ${fmt(SEIT_2024.max, 2)} ct. 2025 wurden in drei Runden zusammen rund ${fmt(JAHR_2025.zuschlag / 1000, 1)} GW bezuschlagt, im Mittel ${ct(JAHR_2025.mittel)}.`,
  },
];

const FAQ = [
  {
    q: "Wie hoch ist der aktuelle Zuschlagswert für Freiflächen-Solaranlagen?",
    a: `Beim Gebotstermin am ${termin(L.datum)} lag der mengengewichtete durchschnittliche Zuschlagswert bei ${ct(L.mittel)}; bezuschlagt wurden Gebote zwischen ${ct(L.min)} und ${ct(L.max)}. Der Höchstwert betrug ${ct(L.hoechst)}. Der nächste reguläre Gebotstermin ist der ${NAECHSTER_GEBOTSTERMIN}.`,
  },
  {
    q: "Was bedeutet „mengengewichteter Zuschlagswert“?",
    a: "Jeder bezuschlagte Bieter erhält seinen eigenen Gebotswert (Pay-as-bid). Der mengengewichtete Durchschnitt gewichtet diese Werte mit der jeweiligen Leistung – große Parks zählen also stärker als kleine. Er ist die übliche Kennzahl, um Gebotstermine zu vergleichen.",
  },
  {
    q: "Was ist der Unterschied zwischen Zuschlagswert und Marktwert Solar?",
    a: "Der Zuschlagswert ist der anzulegende Wert, den ein Park über 20 Jahre als Untergrenze seiner Erlöse erhält – die Differenz zum Marktwert zahlt das EEG-Konto als Marktprämie. Der Marktwert Solar ist das, was Solarstrom an der Börse tatsächlich im Schnitt erlöst. Liegt der Marktwert über dem Zuschlagswert, entfällt die Prämie.",
  },
  {
    q: "Was ist die Capture Rate und warum sinkt sie?",
    a: `Die Capture Rate setzt den Jahresmarktwert Solar ins Verhältnis zum durchschnittlichen Börsenpreis. ${LETZTER_MARKTWERT.jahr} lag sie bei rund ${fmt(LETZTER_MARKTWERT.capture * 100)} %, ${MW_2020.jahr} noch bei ${fmt(MW_2020.capture * 100)} %. Weil immer mehr Solaranlagen gleichzeitig mittags einspeisen, sinkt der Preis genau dann, wenn Solarparks produzieren (Kannibalisierung).`,
  },
  {
    q: "Wie oft gab es negative Strompreise?",
    a: `Nach Auswertung von Energy-Charts-Daten gab es ${NEG_2025.jahr} rund ${fmt(NEG_2025.stunden)} Stunden mit negativem Day-Ahead-Preis, ${NEG_2022.jahr} waren es nur ${fmt(NEG_2022.stunden)}. Für neue Anlagen entfällt in diesen Zeiten die Marktprämie; Speicher und flexible Abnehmer gewinnen deshalb an Wert.`,
  },
  {
    q: "Wie aktuell sind die Marktdaten und woher stammen sie?",
    a: `Stand der Seite: ${MARKTDATEN_STAND_TEXT}. Ausschreibungsergebnisse stammen von der Bundesnetzagentur, Marktwerte von den Übertragungsnetzbetreibern (netztransparenz.de), negative Stunden aus Energy-Charts (Fraunhofer ISE), Zubauzahlen von Bundesnetzagentur, PV Austria und Swissolar. Den Börsenpreis zeigen wir live. Alle Angaben ohne Gewähr.`,
  },
];

const QUERVERWEISE = [
  { href: "/ratgeber/eeg-ausschreibung-freiflaeche", titel: "EEG-Ausschreibung Freifläche", text: "Termine, Voraussetzungen, Sicherheiten und Gebotsstrategie." },
  { href: "/rechner/solarpark", titel: "Solarpark-Renditerechner", text: "IRR und Cashflow mit Zuschlagswert, PPA oder Marktwert rechnen." },
  { href: "/energie-live", titel: "Strommarkt live", text: "Day-Ahead-Preis, Strommix und Capture Rate von heute." },
  { href: "/projektboerse", titel: "Projektbörse", text: "Solarprojekte in allen Phasen finden oder anbieten." },
];

/* ------------------------------------------------------------------ */
/* JSON-LD                                                             */
/* ------------------------------------------------------------------ */

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  "@id": `${PAGE_URL}/#dataset`,
  name: "Marktdaten Freiflächen-Photovoltaik: EEG-Ausschreibungen Solar erstes Segment, Marktwert Solar und Capture Rate",
  description:
    "Ergebnisse aller Gebotstermine der EEG-Ausschreibungen für Solaranlagen des ersten Segments seit 2017 (Volumen, Gebotsmenge, Zuschlagsmenge, mengengewichteter Zuschlagswert, Spanne, Höchstwert), Jahresmarktwerte Spot und Solar mit Capture Rate seit 2020, Stunden mit negativen Strompreisen sowie Photovoltaik-Zubau in Deutschland, Österreich und der Schweiz.",
  url: PAGE_URL,
  keywords: ["EEG-Ausschreibung", "Photovoltaik", "Freiflächenanlagen", "Zuschlagswert", "Marktwert Solar", "Capture Rate", "negative Strompreise", "DACH"],
  isAccessibleForFree: true,
  inLanguage: "de",
  creator: { "@type": "Organization", name: "ÖkoInvest GmbH", url: abs("/") },
  publisher: { "@id": `${abs("/")}/#organization` },
  isBasedOn: MARKTDATEN_QUELLEN.map((q) => q.url),
  spatialCoverage: [
    { "@type": "Place", name: "Deutschland" },
    { "@type": "Place", name: "Österreich" },
    { "@type": "Place", name: "Schweiz" },
  ],
  temporalCoverage: `${ERSTER.datum}/${L.datum}`,
  dateModified: MARKTDATEN_STAND,
  variableMeasured: [
    { "@type": "PropertyValue", name: "Mengengewichteter durchschnittlicher Zuschlagswert", unitText: "ct/kWh" },
    { "@type": "PropertyValue", name: "Höchstwert je Gebotstermin", unitText: "ct/kWh" },
    { "@type": "PropertyValue", name: "Ausgeschriebene Menge, Gebotsmenge, Zuschlagsmenge", unitText: "MW" },
    { "@type": "PropertyValue", name: "Jahresmarktwert Spot und Solar", unitText: "ct/kWh" },
    { "@type": "PropertyValue", name: "Capture Rate Solar", unitText: "Prozent" },
    { "@type": "PropertyValue", name: "Stunden mit negativem Day-Ahead-Preis", unitText: "h" },
  ],
};

const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${PAGE_URL}/#webpage`,
  url: PAGE_URL,
  name: "Marktdaten Freiflächen-PV: EEG-Zuschläge, Marktwert Solar und Capture Rate",
  description: ANTWORT,
  isPartOf: { "@id": `${abs("/")}/#website` },
  about: { "@id": `${PAGE_URL}/#dataset` },
  dateModified: MARKTDATEN_STAND,
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Startseite", item: abs("/") },
      { "@type": "ListItem", position: 2, name: "Ratgeber", item: abs("/ratgeber") },
      { "@type": "ListItem", position: 3, name: "Marktdaten", item: PAGE_URL },
    ],
  },
};

/* ------------------------------------------------------------------ */

function Tabelle({ caption, kopf, zeilen, rechtsAb = 1, minBreite = 560, markiert }) {
  return (
    <div className="overflow-x-auto rounded-3xl bg-white ring-1 ring-ink-200/70" tabIndex={0} role="region" aria-label={`${caption} (horizontal scrollbar)`}>
      <table className="w-full border-collapse text-left text-[14px]" style={{ minWidth: minBreite }}>
        <caption className="px-5 pt-5 text-left text-[13px] font-semibold text-ink-600 md:px-6">{caption}</caption>
        <thead>
          <tr className="border-b border-ink-200 text-[12px] uppercase tracking-[0.08em] text-ink-500">
            {kopf.map((k, i) => (
              <th key={k} scope="col" className={`px-5 py-3 font-semibold md:px-6 ${i >= rechtsAb ? "text-right" : ""}`}>
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {zeilen.map((z, zi) => (
            <tr key={zi} className={`border-b border-ink-100 last:border-0 ${markiert === zi ? "bg-ov-50" : ""}`}>
              {z.map((zelle, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className="px-5 py-2.5 font-medium text-ink-900 md:px-6">
                    {zelle}
                  </th>
                ) : (
                  <td key={i} className={`ov-num px-5 py-2.5 text-ink-700 md:px-6 ${i >= rechtsAb ? "text-right" : ""}`}>
                    {zelle}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TextLink({ href, children }) {
  return (
    <Link href={href} className="font-medium text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current">
      {children}
    </Link>
  );
}

export default async function MarktdatenPage() {
  let live = null;
  try {
    const s = await getEnergySnapshot();
    live = { preis: { aktuell: s.preis.aktuell, heute: s.preis.heute } };
  } catch {
    // Live-Wert lädt dann im Browser nach
  }

  const jahreAbsteigend = [...AUSSCHREIBUNGEN_JAHR].reverse();
  const marktwertZeilen = [
    ...[...MARKTWERTE].reverse().map((m) => [String(m.jahr), fmt(m.spot, 2), fmt(m.solar, 2), `${fmt(m.capture * 100)} %`]),
    ...[...MARKTWERT_SOLAR_FRUEHER].reverse().map((m) => [`${m.jahr}*`, "–", fmt(m.solar, 2), "–"]),
  ];

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }} />

      <PageHero
        variant="dark"
        breadcrumbs={[{ name: "Wissen", href: "/ratgeber" }, { name: "Marktdaten" }]}
        eyebrow="Marktdaten · Freiflächen-PV DACH"
        title={
          <>
            Marktdaten Solar: <span className="ov-text-gradient-light">Zuschläge, Marktwerte, Trends</span>
          </>
        }
        lead="Alle EEG-Ausschreibungen für Freiflächen-Solaranlagen seit 2017, der Marktwert von Solarstrom, die Capture Rate, negative Preise, Zubau und Pachtniveau – mit Quellen, als Diagramm und Tabelle."
      >
        <ul className="mt-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {KENNZAHLEN.map((k) => (
            <li key={k.text} className="ov-glass rounded-3xl p-4 sm:p-5">
              <k.icon aria-hidden="true" className="h-5 w-5 text-ov-300" />
              <p className="mt-4 flex items-baseline gap-1.5 font-display font-extrabold leading-none">
                <span className="ov-num text-[28px] sm:text-[34px]">{k.wert}</span>
                <span className="text-[15px] font-bold text-white/65">{k.einheit}</span>
              </p>
              <p className="mt-2 text-[13.5px] leading-snug text-white/65">{k.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[12.5px] text-white/50">Datenstand {MARKTDATEN_STAND_TEXT}. Börsenpreis live weiter unten.</p>
      </PageHero>

      {/* Ausschreibungen */}
      <Section tone="white" space="lg" id="ausschreibungen" className="scroll-mt-24">
        <SectionHeading
          eyebrow="EEG-Ausschreibungen Solar, erstes Segment"
          title={
            <>
              Zuschlagswerte für Freiflächen <span className="ov-text-gradient">seit 2017</span>
            </>
          }
          lead={ANTWORT}
          className="mb-10 md:mb-12"
        />
        <Reveal dir="scale">
          <AusschreibungsChart termine={AUSSCHREIBUNGEN} jahre={AUSSCHREIBUNGEN_JAHR} />
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PHASEN_TEXT.map((p, i) => (
            <Reveal key={p.titel} delay={i * 80} className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-7">
              <h3 className="font-display text-[18px] font-bold text-ink-900">{p.titel}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{p.text}</p>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:gap-14">
          <Tabelle
            caption="Ausschreibungen Solar erstes Segment je Jahr (Summen, mengengewichteter Ø)"
            kopf={["Jahr", "Termine", "Volumen MW", "Gebote MW", "Zuschläge MW", "Ø ct/kWh"]}
            zeilen={jahreAbsteigend.map((j) => [String(j.jahr), fmt(j.termine), fmt(j.volumen), fmt(j.gebote), fmt(j.zuschlag), fmt(j.mittel, 2)])}
            minBreite={620}
          />
          <div className="space-y-5 text-[15.5px] leading-relaxed text-ink-600">
            <h3 className="font-display text-[20px] font-bold text-ink-900">So lesen Sie die Zahlen</h3>
            <p>
              Seit {ERSTER.datum.slice(0, 4)} hat die Bundesnetzagentur in diesem Segment rund <strong className="text-ink-900">{fmt(SUMME_ZUSCHLAG_MW / 1000, 1)} GW</strong>{" "}
              bezuschlagt. Der <TextLink href="/wissen/lexikon#zuschlagswert">Zuschlagswert</TextLink> ist der{" "}
              <TextLink href="/wissen/lexikon#anzulegender-wert">anzulegende Wert</TextLink>, den ein Park 20 Jahre lang als Untergrenze erhält; die
              Differenz zum Marktwert zahlt das EEG-Konto als <TextLink href="/wissen/lexikon#marktpraemie">Marktprämie</TextLink>.
            </p>
            <p>
              Für unsere Rechner setzen wir derzeit {ct(ERLOESE.eegFreiflaecheCt, 1)} an. Wie Sie ein Gebot vorbereiten und welche Flächen zugelassen
              sind, erklärt der Ratgeber <TextLink href="/ratgeber/eeg-ausschreibung-freiflaeche">EEG-Ausschreibung Freifläche</TextLink>. Nächster
              regulärer <TextLink href="/wissen/lexikon#gebotstermin">Gebotstermin</TextLink>: {NAECHSTER_GEBOTSTERMIN}.
            </p>
            <Link
              href="/rechner/solarpark"
              className="inline-flex items-center gap-2 rounded-2xl bg-ov-600 px-5 py-3 text-[14.5px] font-semibold text-white transition-colors hover:bg-ov-700"
            >
              Rendite mit Zuschlagswert rechnen
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Section>

      {/* Marktwert & Capture Rate */}
      <Section tone="sand" space="lg" id="marktwert-solar" className="scroll-mt-24">
        <SectionHeading
          eyebrow="Marktwert Solar & Capture Rate"
          title={
            <>
              Was Solarstrom an der Börse <span className="ov-text-gradient">wirklich erlöst</span>
            </>
          }
          lead={`Der Jahresmarktwert Solar lag ${LETZTER_MARKTWERT.jahr} bei ${ct(LETZTER_MARKTWERT.solar, 3)} – nur rund ${fmt(LETZTER_MARKTWERT.capture * 100)} % des durchschnittlichen Börsenpreises von ${ct(LETZTER_MARKTWERT.spot, 3)}. Je mehr Solaranlagen gleichzeitig einspeisen, desto stärker sinkt der Preis zur Mittagszeit.`}
          className="mb-10 md:mb-12"
        />
        <div className="grid items-start gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
          <Reveal dir="scale" className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-ink-200/70 sm:p-6 md:p-8">
            <MarktwertChart daten={MARKTWERTE} />
          </Reveal>
          <div className="space-y-5">
            <Tabelle
              caption="Jahresmarktwerte in ct/kWh"
              kopf={["Jahr", "Spot", "Solar", "Capture"]}
              zeilen={marktwertZeilen}
              minBreite={320}
            />
            <p className="text-[12.5px] leading-relaxed text-ink-500">
              * bis 2019 tatsächlicher Jahresmittelwert des Marktwerts Solar nach § 33 EEG 2012 – methodisch nicht exakt vergleichbar. Quelle:
              netztransparenz.de, Zusammenstellung DGS.
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="space-y-4 text-[15.5px] leading-relaxed text-ink-600">
            <h3 className="font-display text-[20px] font-bold text-ink-900">Warum das für Investoren zählt</h3>
            <p>
              Solange ein Park eine Marktprämie erhält, sichert der Zuschlagswert die Erlöse nach unten ab. Ohne Förderung – bei{" "}
              <TextLink href="/ratgeber/ppa-fuer-unternehmen">PPA</TextLink>-Parks oder nach 20 Jahren – bestimmt die{" "}
              <TextLink href="/wissen/lexikon#capture-rate">Capture Rate</TextLink> das Ergebnis. Für die Zeit nach der Förderung rechnen wir
              vorsichtig mit einem <TextLink href="/wissen/lexikon#marktwert-solar">Marktwert Solar</TextLink> von {ct(ERLOESE.merchantCt, 1)}.
            </p>
            <p>
              Gegenmittel sind Speicher am Park, Ost-West-Aufständerung, flexible Abnehmer und die Bündelung im{" "}
              <TextLink href="/virtuelles-kraftwerk">virtuellen Kraftwerk</TextLink>. Wie sich negative Preise auf die Förderung auswirken, erklärt der
              Ratgeber <TextLink href="/ratgeber/negative-strompreise-solarspitzengesetz">Negative Strompreise und Solarspitzengesetz</TextLink>.
            </p>
          </div>
          <Tabelle
            caption="Stunden mit negativem Day-Ahead-Preis (DE-LU) je Jahr"
            kopf={["Jahr", "Stunden"]}
            zeilen={[...NEGATIVE_STUNDEN].reverse().map((n) => [String(n.jahr), fmt(n.stunden)])}
            minBreite={260}
          />
        </div>
      </Section>

      {/* Zubau DACH */}
      <Section tone="white" space="lg" id="zubau" className="scroll-mt-24">
        <SectionHeading
          eyebrow="Zubau Photovoltaik DACH"
          title="Wie schnell der Markt in Deutschland, Österreich und der Schweiz wächst"
          lead="Deutschland baut mit Abstand am meisten zu – 2025 entfiel erstmals etwa die Hälfte des Zubaus auf Freiflächenanlagen. In Österreich und der Schweiz dominieren Dachanlagen."
          className="mb-10 md:mb-12"
        />
        <div className="grid gap-5 md:grid-cols-3">
          {ZUBAU.map((z, i) => (
            <Reveal key={z.land} delay={i * 80} className="flex flex-col rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-7">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-[20px] font-bold text-ink-900">{z.land}</h3>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-[12px] font-semibold text-ink-600 ring-1 ring-ink-200">{z.kurz}</span>
              </div>
              <dl className="mt-5 space-y-2">
                {z.werte.map((w) => (
                  <div key={w.jahr} className="flex items-baseline justify-between gap-3 border-b border-ink-200/70 pb-2">
                    <dt className="text-[14px] text-ink-600">Zubau {w.jahr}</dt>
                    <dd className="ov-num font-display text-[20px] font-bold text-ink-900">{fmt(w.gw, 1)} GW</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[14px] leading-relaxed text-ink-700">
                <strong className="text-ink-900">Freifläche:</strong> {z.freiflaeche}
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{z.einordnung}</p>
              <p className="mt-auto pt-4 text-[12.5px] text-ink-500">Bestand: {z.kumuliert}</p>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-[13.5px] leading-relaxed text-ink-500">
          Grobe Einordnung, Bruttozubau aller Segmente. Rahmenbedingungen im Detail:{" "}
          <TextLink href="/ratgeber/freiflaechen-pv-oesterreich">Freiflächen-PV in Österreich</TextLink> und{" "}
          <TextLink href="/ratgeber/freiflaechen-pv-schweiz">Freiflächen-PV in der Schweiz</TextLink>.
        </p>
      </Section>

      {/* Pachtniveau */}
      <Section tone="sand" space="lg" id="pacht" className="scroll-mt-24">
        <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Pachtniveau"
              title="Was Flächen für Solarparks einbringen"
              lead={`Für Freiflächen-Solarparks werden nach aktuellem Stand meist ${fmt(PACHT.freiflaecheProHa.min)} bis ${fmt(PACHT.freiflaecheProHa.max)} € je Hektar und Jahr gezahlt – im Mittel rund das ${fmt(faktorAcker, 0)}-Fache der durchschnittlichen Landpacht.`}
            />
            <p className="mt-6 text-[15.5px] leading-relaxed text-ink-600">
              Entscheidend für die Höhe sind Netzanschluss, Förderkulisse und Flächengröße. Bei rund {fmt(FREIFLAECHE.haProMwp, 1)} ha je MWp
              entspricht die mittlere Pacht etwa {fmt((PACHT.freiflaecheProHa.mittel * FREIFLAECHE.haProMwp) / 1000, 1)} € je kWp und Jahr. Details im
              Ratgeber <TextLink href="/ratgeber/solarpark-pacht-pro-hektar">Solarpark-Pacht pro Hektar</TextLink>.
            </p>
            <Link
              href="/rechner/pacht"
              className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-ov-600 px-5 py-3 text-[14.5px] font-semibold text-white transition-colors hover:bg-ov-700"
            >
              Pacht für Ihre Fläche berechnen
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <Tabelle
            caption="Pachtniveau je Hektar und Jahr, Orientierung"
            kopf={["Nutzung", "€ je ha und Jahr"]}
            zeilen={[
              ["Freiflächen-PV (DACH)", `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)}, Mittel ${fmt(PACHT.freiflaecheProHa.mittel)}`],
              ["Agri-PV", `${fmt(PACHT.agriProHa.min)}–${fmt(PACHT.agriProHa.max)}`],
              ["Umsatzpacht alternativ", `${fmt(PACHT.umsatzbeteiligung.min * 100)}–${fmt(PACHT.umsatzbeteiligung.max * 100)} % der Stromerlöse`],
              ["Reservierung bis Baubeginn", `${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)}`],
              [`Landpacht DE Ø ${LANDPACHT_DESTATIS.jahr} (Destatis)`, fmt(LANDPACHT_DESTATIS.schnitt)],
              [`Landpacht Spanne der Länder`, `${fmt(LANDPACHT_DESTATIS.min)} (${LANDPACHT_DESTATIS.minLand}) – ${fmt(LANDPACHT_DESTATIS.max)} (${LANDPACHT_DESTATIS.maxLand})`],
            ]}
            markiert={0}
            minBreite={440}
          />
        </div>
      </Section>

      {/* Live */}
      <Section tone="navy" space="lg" id="live" className="scroll-mt-24 overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -right-40 top-10 h-[420px] w-[420px] rounded-full bg-ov-500/20 blur-[130px]" />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <SectionHeading
              dark
              eyebrow="Börsenpreis live"
              title="Der heutige Strompreis im Vergleich zur Historie"
              lead="Der Day-Ahead-Preis schwankt viertelstündlich – mittags an sonnigen Tagen oft nahe null oder darunter, abends deutlich höher. Die Einordnung rechts zeigt, wo er gerade im Verhältnis zum letzten EEG-Zuschlag und zum Jahresmarktwert Solar liegt."
            />
            <ul className="mt-8 space-y-4 text-[15px] leading-relaxed text-white/70">
              <li className="flex gap-3">
                <Zap aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-sun-400" />
                <span>Liegt der Börsenpreis unter dem Zuschlagswert, gleicht die Marktprämie die Differenz aus – solange er nicht negativ ist.</span>
              </li>
              <li className="flex gap-3">
                <Sun aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ov-300" />
                <span>Ungeförderte Parks erlösen den Marktwert Solar – daher der Wert von Speichern und Stromlieferverträgen.</span>
              </li>
            </ul>
          </div>
          <LiveEinordnung
            zuschlagCt={L.mittel}
            zuschlagText={`Gebotstermin ${termin(L.datum)}`}
            solarCt={LETZTER_MARKTWERT.solar}
            solarJahr={LETZTER_MARKTWERT.jahr}
            initial={live}
          />
        </div>
      </Section>

      {/* Methodik + FAQ */}
      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <SectionHeading eyebrow="Häufige Fragen" title="Marktdaten verständlich erklärt" lead={`Zuschlagswert, Marktwert, Capture Rate – Stand ${MARKTDATEN_STAND_TEXT}.`} />
            <Reveal className="mt-10 rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-7">
              <h3 className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
                <Database aria-hidden="true" className="h-4 w-4 text-ov-600" />
                Quellen & Methodik
              </h3>
              <ul className="mt-4 space-y-3 text-[14px] leading-relaxed text-ink-600">
                {MARKTDATEN_QUELLEN.map((q) => (
                  <li key={q.id}>
                    <a href={q.url} target="_blank" rel="noopener noreferrer" className="font-medium text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current">
                      {q.titel}
                      <ExternalLink aria-hidden="true" className="ml-1 inline h-3.5 w-3.5" />
                    </a>
                    <span className="text-ink-500"> · Stand {q.stand}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[13px] leading-relaxed text-ink-500">
                Werte unverändert aus den Quellen übernommen, Jahressummen, mengengewichtete Jahresmittel und Capture Rate eigene Berechnung. Keine
                Anlage- oder Rechtsberatung, alle Angaben ohne Gewähr.
              </p>
            </Reveal>
          </div>
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise items={QUERVERWEISE} />
      <CtaBand
        eyebrow="Von der Marktlage zum Projekt"
        title="Solarprojekte finden, bewerten oder anbieten."
        text="Investoren finden auf der Projektbörse Freiflächen- und Agri-PV-Projekte in allen Phasen. Für Flächeneigentümer ist die erste Einschätzung ihrer Fläche kostenfrei."
        primary={{ label: "Zur Projektbörse", href: "/projektboerse" }}
        secondary={{ label: "Fläche prüfen lassen", href: "/flaechencheck" }}
      />
    </div>
  );
}
