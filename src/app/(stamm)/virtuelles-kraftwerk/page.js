// src/app/virtuelles-kraftwerk/page.js – Virtuelles Kraftwerk
//
// Sprachmodell: feste Texte im Wörterbuch TEXTE (en nur Texte), FAQ aus src/data/faq-en.js.
import { Activity, BatteryCharging, Building2, Calculator, Car, Clock, Factory, Gauge, LineChart, Radio, ShoppingCart, Sprout, Sun, Tractor, Users } from "lucide-react";
import SeitenHero from "@/components/Energie/Seite/SeitenHero";
import Faktenleiste from "@/components/Energie/Seite/Faktenleiste";
import Kopf from "@/components/Energie/Seite/Kopf";
import Weiterlesen from "@/components/Energie/Seite/Weiterlesen";
import HeroBuehne from "@/components/Energie/Vpp/HeroBuehne";
import Prinzip from "@/components/Energie/Vpp/Prinzip";
import { Bausteine, Einstieg, FuerWen, Leistungen } from "@/components/Energie/Vpp/Abschnitte";
import Section from "@/components/ui/Section";
import Faq from "@/components/ui/Faq";
import Reveal from "@/components/ui/Reveal";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import EnergieflussGrafik from "@/components/Energie/EnergieflussGrafik";
import { liveStart } from "@/components/Energie/liveStart";
import { FAQ_VPP } from "@/data/faq";
import { FAQ_VPP_EN } from "@/data/faq-en";
import { abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { LAENDER, landHinweisText, landHinweisTextEn } from "@/lib/land";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { faqFuerLand, listeFuerLand } from "@/components/Land/Laenderteile";

const PFAD = seitenPfad("/virtuelles-kraftwerk");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Virtuelles Kraftwerk für Parks & Mittelstand | ÖkoInvest",
  description:
    "Solarparks, Agri-PV, Speicher und Unternehmen im Verbund: Wie das virtuelle Kraftwerk von ÖkoInvest Strom vermarktet, Flexibilität nutzt und Preise senkt.",
  keywords: ["virtuelles Kraftwerk", "VPP", "Direktvermarktung", "Flexibilitätsvermarktung", "Redispatch 2.0", "Stromspeicher", "Solar-PPA"],
});

const LEISTUNGEN = [
  {
    icon: LineChart,
    title: "Direktvermarktung",
    text: "Prognose, Vermarktung und Fernsteuerung der Parks – mit Marktprämie nach EEG oder als ungeförderte Anlage per PPA. Bei negativen Preisen wird abgeregelt statt draufgezahlt.",
    textLand: "Prognose, Vermarktung und Fernsteuerung der Parks – gefördert oder als ungeförderte Anlage per PPA. Bei negativen Preisen wird abgeregelt statt draufgezahlt.",
  },
  {
    icon: BatteryCharging,
    title: "Flexibilitätsvermarktung",
    text: "Speicher und verschiebbare Lasten werden in die günstigsten und teuersten Viertelstunden gelegt – Arbitrage am Spotmarkt und, nach Präqualifikation, Regelleistung im Pool.",
  },
  {
    icon: ShoppingCart,
    title: "Pool-Beschaffung",
    text: "Der Reststrom der Unternehmen wird gebündelt und in Tranchen beschafft, ergänzt um Solarstrom aus den Parks der Gruppe für die Tagesstunden.",
  },
  {
    icon: Gauge,
    title: "Monitoring & Meldewesen",
    text: "Erzeugung, Verbrauch und Speicherstände im Viertelstundenraster, Alarme bei Abweichungen und die Datenmeldungen für Redispatch 2.0 – gebündelt statt je Anlage.",
    textLand: "Erzeugung, Verbrauch und Speicherstände im Viertelstundenraster, Alarme bei Abweichungen und die Datenmeldungen an die Netzbetreiber – gebündelt statt je Anlage.",
  },
];

const BAUSTEINE = [
  {
    icon: Sun,
    title: "Erzeuger",
    tag: "Tagsüber",
    text: "Freiflächen-Solarparks, Agri-PV und Solarcarports. Ost/West- und vertikale Anlagen verteilen die Erzeugung besser über den Tag als reine Südanlagen.",
  },
  {
    icon: BatteryCharging,
    title: "Speicher",
    tag: "Verschieben",
    text: "Großspeicher am Park oder Netzknoten und Gewerbespeicher bei den Unternehmen. Sie machen aus schwankender Erzeugung planbare Lieferung.",
  },
  {
    icon: Factory,
    title: "Verbraucher",
    tag: "Mittelstand",
    text: "Unternehmen mit Ein- bis Dreischichtbetrieb, Handel und Logistik. Ihr gebündelter Bedarf gibt dem Verbund Masse – und ihre Flexibilität senkt die Kosten.",
  },
];

const ZIELGRUPPEN = [
  { icon: Building2, title: "Unternehmen & Mittelstand", text: "Reststrom gebündelt einkaufen, Solarstrom aus den Parks für die Tagesstunden nutzen, Flexibilität zu Geld machen.", href: seitenPfad("/reststrom") },
  { icon: LineChart, title: "Investoren & Parkbetreiber", text: "Erlöse aus Direktvermarktung, PPA und Speicher kombinieren – mit einem Abnehmerpool, der die Vermarktung planbarer macht.", href: "/investoren" },
  { icon: Tractor, title: "Landwirte mit Agri-PV", text: "Ihre Anlage wird Teil des Verbunds; über die geplante Genossenschaft können Sie zusätzlich Mitglied werden.", href: seitenPfad("/landwirte") },
  { icon: Users, title: "Gemeinden & Gemeinschaften", text: "Energiegemeinschaften mit Strom aus Parks der Region versorgen – in DE, AT und CH nach den jeweiligen Regeln.", href: seitenPfad("/energiegemeinschaften") },
];

const REGELN = [
  { nurDE: true, titel: "Direktvermarktung (EEG)", text: "Neuere Anlagen ab 100 kW vermarkten ihren Strom in der Regel direkt und müssen fernsteuerbar sein." },
  { nurDE: true, titel: "Redispatch 2.0", text: "Seit Oktober 2021 sind Anlagen ab 100 kW in das Engpassmanagement der Netzbetreiber einbezogen – mit Daten- und Meldepflichten." },
  {
    titel: "Regelleistung",
    text: "Für Primär- und Sekundärregelleistung ist eine Präqualifikation beim Übertragungsnetzbetreiber nötig; kleine Einheiten dürfen im Pool anbieten.",
    // Geprüft am 04.10.2026 an der Quelle: APG beschafft die Regelreserve in Österreich marktbasiert über
    // Ausschreibungen, Anbieter brauchen die Präqualifikation bei APG (markt.apg.at/en/power-grid/balancing/);
    // Swissgrid beschafft Systemdienstleistungen über Ausschreibungen und präqualifiziert die Anbieter von Primär-,
    // Sekundär- und Tertiärregelung (swissgrid.ch/en/home/customers/topics/ancillary-services/prequalification.html).
    AT: { text: "Regelreserve beschafft in Österreich der Übertragungsnetzbetreiber APG über Ausschreibungen; anbieten darf, wer bei APG präqualifiziert ist." },
    CH: { text: "Primär-, Sekundär- und Tertiärregelung beschafft in der Schweiz Swissgrid über Ausschreibungen; anbieten darf, wer bei Swissgrid präqualifiziert ist." },
  },
  { nurDE: true, titel: "§ 14a EnWG", text: "Steuerbare Verbrauchseinrichtungen wie Wärmepumpen, Wallboxen und Speicher im Niederspannungsnetz erhalten reduzierte Netzentgelte, wenn der Netzbetreiber sie im Engpass dimmen darf." },
];

const QUERVERWEISE = [
  { href: seitenPfad("/reststrom"), icon: Building2, titel: "Reststrom-Pool Mittelstand", text: "Was PV und Speicher nicht decken – gebündelt und günstiger beschafft." },
  { href: seitenPfad("/grossspeicher"), icon: BatteryCharging, titel: "Großspeicher", text: "Batteriespeicher am Netzknoten und im Park – Erlösquellen und Planung." },
  { href: seitenPfad("/energie-live"), icon: Activity, titel: "Strommarkt live", text: "Börsenpreis, Solar-Capture-Rate und negative Preise in Echtzeit." },
  { href: seitenPfad("/rechner/reststrom"), icon: Calculator, titel: "Reststrom-Rechner", text: "Ersparnis durch den Pool für Ihr Lastprofil in einer Minute." },
];

const schema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${abs(PFAD)}/#service`,
  name: "Virtuelles Kraftwerk ÖkoInvest",
  serviceType: "Virtuelles Kraftwerk: Direktvermarktung, Flexibilitätsvermarktung, Pool-Beschaffung, Monitoring",
  description:
    "Verbund aus Solarparks, Agri-PV, Solarcarports, Speichern und mittelständischen Verbrauchern mit gemeinsamer Vermarktung und Beschaffung.",
  provider: { "@id": `${abs("/")}/#organization` },
  areaServed: [
    { "@type": "Country", name: "Deutschland" },
    { "@type": "Country", name: "Österreich" },
    { "@type": "Country", name: "Schweiz" },
  ],
  url: abs(PFAD),
};

export const revalidate = 900;

// Länderfassung: deutsche Regeln (EEG, Redispatch 2.0, § 14a EnWG) nur in DE und gemeinsam; in AT/CH
// die geprüften Angaben zur Regelreserve und der LandHinweis für die übrigen Regeln.
const UEBERTRAGUNGSNETZ = { AT: "APG", CH: "Swissgrid" };

/* ------------------------------------------------------------------------------------------- */
/* Englisch (Sprachmodell): nur Texte, Listen je Index wie oben                                  */
/* ------------------------------------------------------------------------------------------- */
const metadataEn = {
  title: "Virtual power plant for parks & SMEs | ÖkoInvest",
  description: "Solar parks, agrivoltaics, storage and businesses in one network: how ÖkoInvest’s virtual power plant markets power, uses flexibility and lowers prices.",
  keywords: ["virtual power plant", "VPP", "direct marketing", "flexibility marketing", "Redispatch 2.0", "power storage", "solar PPA"],
  openGraph: {
    title: "Virtual power plant for parks & SMEs | ÖkoInvest",
    description: "Solar parks, agrivoltaics, storage and businesses in one network: how ÖkoInvest’s virtual power plant markets power, uses flexibility and lowers prices.",
  },
};

const LEISTUNGEN_EN = [
  {
    title: "Direct marketing",
    text: "Forecasting, marketing and remote control of the parks – with a market premium under the EEG or as an unsubsidised installation via PPA. At negative prices, output is curtailed rather than paying extra.",
    textLand: "Forecasting, marketing and remote control of the parks – subsidised or as an unsubsidised installation via PPA. At negative prices, output is curtailed rather than paying extra.",
  },
  {
    title: "Flexibility marketing",
    text: "Storage and shiftable loads are placed in the cheapest and most expensive quarter-hours – arbitrage on the spot market and, after prequalification, balancing power in the pool.",
  },
  {
    title: "Pool procurement",
    text: "The companies’ residual power is pooled and procured in tranches, supplemented by solar power from the group’s parks for the daytime hours.",
  },
  {
    title: "Monitoring & reporting",
    text: "Generation, consumption and storage levels in 15-minute intervals, alerts for deviations and the data reports for Redispatch 2.0 – pooled instead of per installation.",
    textLand: "Generation, consumption and storage levels in 15-minute intervals, alerts for deviations and the data reports to the grid operators – pooled instead of per installation.",
  },
];

const BAUSTEINE_EN = [
  { title: "Generators", tag: "Daytime", text: "Ground-mounted solar parks, agrivoltaics and solar carports. East/west and vertical installations spread generation better over the day than purely south-facing ones." },
  { title: "Storage", tag: "Shifting", text: "Battery storage at the park or grid node and commercial storage at the companies. They turn fluctuating generation into predictable supply." },
  { title: "Consumers", tag: "SMEs", text: "Companies with one- to three-shift operation, retail and logistics. Their pooled demand gives the network scale – and their flexibility lowers costs." },
];

const ZIELGRUPPEN_EN = [
  { title: "Businesses & SMEs", text: "Buy residual power as a pool, use solar power from the parks for daytime hours, turn flexibility into money." },
  { title: "Investors & park operators", text: "Combine revenue from direct marketing, PPAs and storage – with a pool of buyers that makes marketing more predictable." },
  { title: "Farmers with agrivoltaics", text: "Your installation becomes part of the network; through the planned cooperative you can also become a member." },
  { title: "Municipalities & communities", text: "Supply energy communities with power from parks in the region – in DE, AT and CH according to the respective rules." },
];

const REGELN_EN = [
  { titel: "Direct marketing (EEG)", text: "Newer installations from 100 kW generally market their power directly and must be remotely controllable." },
  { titel: "Redispatch 2.0", text: "Since October 2021, installations from 100 kW have been included in the grid operators’ congestion management – with data and reporting obligations." },
  {
    titel: "Balancing power",
    text: "Prequalification with the transmission system operator is required for primary and secondary balancing power; small units may bid in a pool.",
    AT: { text: "In Austria, balancing reserve is procured by the transmission system operator APG through tenders; anyone prequalified with APG may bid." },
    CH: { text: "In Switzerland, Swissgrid procures primary, secondary and tertiary control through tenders; anyone prequalified with Swissgrid may bid." },
  },
  { titel: "§ 14a EnWG", text: "Controllable consumption devices such as heat pumps, wall boxes and storage in the low-voltage grid receive reduced grid fees if the grid operator may dim them during congestion." },
];

const QUERVERWEISE_EN = [
  { titel: "Residual power pool for SMEs", text: "What PV and storage cannot cover – pooled and procured more cheaply." },
  { titel: "Battery storage", text: "Battery storage at the grid node and in the park – revenue sources and planning." },
  { titel: "Power market live", text: "Exchange price, solar capture rate and negative prices in real time." },
  { titel: "Residual power calculator", text: "Savings through the pool for your load profile in one minute." },
];

/** Feste Texte der Seite. */
const TEXTE = {
  de: {
    leistungen: LEISTUNGEN,
    bausteine: BAUSTEINE,
    zielgruppen: ZIELGRUPPEN,
    regeln: REGELN,
    querverweise: QUERVERWEISE,
    faq: FAQ_VPP,
    schema: { name: schema.name, serviceType: schema.serviceType, description: schema.description },
    weitereRegeln: (l) => ({ titel: `Weitere Regeln ${LAENDER[l].inLand}`, text: `${landHinweisText(l, "Regeln zu Direktvermarktung, Netzengpässen und Netzentgelten")}.` }),
    fakten: [
      { einheit: "Viertelstundenraster", text: "Prognosen und Fahrpläne für Parks, Speicher und Verbraucher" },
      { einheit: "Direktvermarktung", text: "neuere EEG-Anlagen ab 100 kW vermarkten in der Regel direkt" },
      { einheit: "Redispatch 2.0", text: "seit Oktober 2021 mit Daten- und Meldepflichten ab 100 kW" },
      { einheit: "EnWG", text: "reduzierte Netzentgelte für steuerbare Verbrauchseinrichtungen" },
    ],
    regelreserve: { einheit: "Regelreserve", text: "Ausschreibung durch den Übertragungsnetzbetreiber, mit Präqualifikation" },
    pruefung: (l) => ({ wert: "in Prüfung", einheit: "Vermarktung & Netz", text: landHinweisText(l, "Regeln") }),
    hero: {
      brotkrumen: "Virtuelles Kraftwerk",
      pill: { marke: "Live", text: "Börsenpreis und Signal der Leitwarte – jetzt", kurz: "Strommarkt live" },
      titelA: "Viele Anlagen. ",
      titelB: "Ein Kraftwerk.",
      lead: "Wir verbinden Solarparks, Agri-PV, Solarcarports und Speicher mit dem Strombedarf mittelständischer Unternehmen. Eine Leitwarte plant im Viertelstundenraster, vermarktet gemeinsam und beschafft gemeinsam – das senkt Kosten auf beiden Seiten.",
      primaer: "Teil des Verbunds werden",
      sekundaer: "Energiefluss ansehen",
      hinweis: "Für Parkbetreiber, Investoren, Landwirte, Gemeinden und den Mittelstand",
      chips: ["Erzeugung, Speicher und Verbrauch im Verbund", "Direktvermarktung und Flexibilität", "Vermarktung und Flexibilität", "Gebündelte Beschaffung für den Mittelstand", "Monitoring und Meldewesen gebündelt"],
      unterschriftDe: "Verbund schematisch · Börsenpreis live (Day-Ahead, netto)",
      unterschriftLand: "Verbund schematisch · Börsenpreis live (Day-Ahead Deutschland-Luxemburg, netto)",
    },
    faktenTitel: "Regeln, nach denen ein Verbund spielt",
    faktenFuss: "Direktvermarktung, Redispatch 2.0 und § 14a EnWG: Regeln für Deutschland",
    fluss: {
      eyebrow: "So funktioniert unser Verbund",
      titelA: "Energieflüsse im ",
      titelB: "Tagesverlauf",
      lead: "Wählen Sie eine Situation und tippen Sie auf die Bausteine. Die Grafik zeigt vereinfacht, wie die Leitwarte Erzeugung, Speicher und Verbrauch aufeinander abstimmt.",
      fuss: "Schematische Darstellung. Energie fließt physikalisch über das öffentliche Netz; die Zuordnung zu den Pool-Teilnehmern erfolgt bilanziell über den Bilanzkreis des Lieferanten.",
    },
    arten: [
      { t: "Solarparks", s: "Freifläche, Süd oder Ost/West" },
      { t: "Agri-PV", s: "vertikal oder hoch aufgeständert" },
      { t: "Solarcarports", s: "Erzeugung direkt beim Verbraucher" },
    ],
    rahmen: (l) => `Rahmen ${LAENDER[l || "DE"].inLand}`,
    faqKopf: { eyebrow: "Häufige Fragen", titel: "Virtuelles Kraftwerk verständlich erklärt", leadDe: "Direktvermarktung, Speicher, Redispatch – die wichtigsten Antworten nach aktuellem Stand.", leadLand: "Verbund, Speicher, Vermarktung – die wichtigsten Antworten nach aktuellem Stand." },
    weiter: { titel: "Tiefer einsteigen", text: "Pool, Speicher und Strommarkt – in Ruhe nachlesen und rechnen." },
  },
  en: {
    leistungen: LEISTUNGEN_EN,
    bausteine: BAUSTEINE_EN,
    zielgruppen: ZIELGRUPPEN_EN,
    regeln: REGELN_EN,
    querverweise: QUERVERWEISE_EN,
    faq: FAQ_VPP_EN,
    schema: {
      name: "ÖkoInvest virtual power plant",
      serviceType: "Virtual power plant: direct marketing, flexibility marketing, pool procurement, monitoring",
      description: "A network of solar parks, agrivoltaics, solar carports, storage and mid-sized consumers with joint marketing and procurement.",
    },
    weitereRegeln: (l) => ({ titel: `Further rules ${LAENDER[l].en.inLand}`, text: `${landHinweisTextEn(l, "Rules on direct marketing, grid congestion and grid fees")}.` }),
    fakten: [
      { einheit: "15-minute intervals", text: "forecasts and schedules for parks, storage and consumers" },
      { einheit: "Direct marketing", text: "newer EEG installations from 100 kW generally market directly" },
      { einheit: "Redispatch 2.0", text: "since October 2021, with data and reporting obligations from 100 kW" },
      { einheit: "EnWG", text: "reduced grid fees for controllable consumption devices" },
    ],
    regelreserve: { einheit: "Balancing reserve", text: "tendered by the transmission system operator, with prequalification" },
    pruefung: (l) => ({ wert: "under review", einheit: "Marketing & grid", text: landHinweisTextEn(l, "Rules") }),
    hero: {
      brotkrumen: "Virtual power plant",
      pill: { marke: "Live", text: "Exchange price and control centre signal – now", kurz: "Power market live" },
      titelA: "Many installations. ",
      titelB: "One power plant.",
      lead: "We connect solar parks, agrivoltaics, solar carports and storage with the power demand of mid-sized companies. A control centre plans in 15-minute intervals, markets jointly and procures jointly – which lowers costs on both sides.",
      primaer: "Join the network",
      sekundaer: "View the energy flow",
      hinweis: "For park operators, investors, farmers, municipalities and SMEs",
      chips: ["Generation, storage and consumption in one network", "Direct marketing and flexibility", "Marketing and flexibility", "Pooled procurement for SMEs", "Monitoring and reporting pooled"],
      unterschriftDe: "Network schematic · exchange price live (day-ahead, net)",
      unterschriftLand: "Network schematic · exchange price live (day-ahead Germany-Luxembourg, net)",
    },
    faktenTitel: "The rules a network plays by",
    faktenFuss: "Direct marketing, Redispatch 2.0 and § 14a EnWG: rules for Germany",
    fluss: {
      eyebrow: "How our network works",
      titelA: "Energy flows ",
      titelB: "over the day",
      lead: "Choose a situation and tap the components. The chart shows in simplified form how the control centre coordinates generation, storage and consumption.",
      fuss: "Schematic illustration. Energy physically flows via the public grid; allocation to the pool participants is done on the balance sheet via the supplier’s balancing group.",
    },
    arten: [
      { t: "Solar parks", s: "ground-mounted, south or east/west" },
      { t: "Agrivoltaics", s: "vertical or elevated" },
      { t: "Solar carports", s: "generation directly at the consumer" },
    ],
    rahmen: (l) => `Framework ${LAENDER[l || "DE"].en.inLand}`,
    faqKopf: { eyebrow: "Frequently asked questions", titel: "The virtual power plant explained", leadDe: "Direct marketing, storage, redispatch – the most important answers based on the current position.", leadLand: "Network, storage, marketing – the most important answers based on the current position." },
    weiter: { titel: "Go deeper", text: "Pool, storage and power market – read up and calculate at your leisure." },
  },
};

function regelnFuer(land, w) {
  const liste = listeFuerLand(w.regeln, land, () => null);
  if (!land || land === "DE") return liste;
  return [...liste, w.weitereRegeln(land)];
}

function faktenFuer(land, w) {
  const basis = [
    { icon: Clock, wert: "15 min", zahl: { wert: 15, nach: " min" }, ...w.fakten[0] },
    { icon: LineChart, wert: "100 kW", zahl: { wert: 100, nach: " kW" }, ...w.fakten[1], nurDE: true },
    { icon: Radio, wert: "2021", ...w.fakten[2], nurDE: true },
    { icon: Gauge, wert: "§ 14a", ...w.fakten[3], nurDE: true },
  ];
  const liste = listeFuerLand(basis, land, () => null);
  if (!land || land === "DE") return liste;
  return [
    ...liste,
    { icon: Radio, wert: UEBERTRAGUNGSNETZ[land], ...w.regelreserve },
    { icon: Gauge, ...w.pruefung(land) },
  ];
}

export default async function VirtuellesKraftwerkPage({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const w = uebersetze(TEXTE, sprache);
  const de = !land || land === "DE";
  const leistungen = w.leistungen.map(({ textLand, ...l }) => (textLand && !de ? { ...l, text: textLand } : l));
  const live = await liveStart(land);
  const schemaS = { ...schema, ...w.schema };
  return (
    <div>
      <JsonLd daten={schemaS} />

      <SeitenHero
        breadcrumbs={[{ name: w.hero.brotkrumen }]}
        pill={{ ...w.hero.pill, href: seitenPfad("/energie-live") }}
        titel={
          <>
            {w.hero.titelA}<span className="ov-text-gradient-light">{w.hero.titelB}</span>
          </>
        }
        lead={w.hero.lead}
        primaer={{ label: w.hero.primaer, href: "#anfrage" }}
        sekundaer={{ label: w.hero.sekundaer, href: "#energiefluss", icon: Activity }}
        hinweis={w.hero.hinweis}
        chips={[w.hero.chips[0], de ? w.hero.chips[1] : w.hero.chips[2], w.hero.chips[3], w.hero.chips[4]]}
        buehne={<HeroBuehne live={live} />}
        bildunterschrift={de ? w.hero.unterschriftDe : w.hero.unterschriftLand}
      />

      <Faktenleiste
        titel={w.faktenTitel}
        items={faktenFuer(land, w)}
        fussnote={land ? undefined : w.faktenFuss}
      />

      <Prinzip />

      <Section tone="sand" space="lg" id="energiefluss" data-abschnitt="energiefluss" aria-labelledby="energiefluss-titel" className="scroll-mt-24">
        <Kopf
          id="energiefluss-titel"
          eyebrow={w.fluss.eyebrow}
          titel={
            <>
              {w.fluss.titelA}<span className="ov-text-gradient">{w.fluss.titelB}</span>
            </>
          }
          lead={w.fluss.lead}
          className="mb-10 md:mb-12"
        />
        <Reveal dir="scale" className="rounded-[2rem] bg-white p-3 shadow-e4 ring-1 ring-ink-200/70 sm:p-5">
          <EnergieflussGrafik />
        </Reveal>
        <p className="mt-5 text-[13px] leading-relaxed text-ink-500">{w.fluss.fuss}</p>
      </Section>

      <Bausteine
        items={w.bausteine}
        arten={[
          { icon: Sun, ...w.arten[0] },
          { icon: Sprout, ...w.arten[1] },
          { icon: Car, ...w.arten[2] },
        ]}
      />

      <Leistungen items={leistungen} />

      <FuerWen zielgruppen={w.zielgruppen} regeln={regelnFuer(land, w)} rahmen={w.rahmen(land)} />

      <Section tone="sand" space="lg" data-abschnitt="faq" aria-labelledby="faq-titel">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Kopf id="faq-titel" eyebrow={w.faqKopf.eyebrow} titel={w.faqKopf.titel} lead={de ? w.faqKopf.leadDe : w.faqKopf.leadLand} />
          </div>
          <Faq items={faqFuerLand(w.faq, land, { sprache })} />
        </div>
      </Section>

      <Einstieg />

      <Weiterlesen items={w.querverweise} titel={w.weiter.titel} text={w.weiter.text} />
    </div>
  );
}

export const generateMetadata = seitenMetadata("/virtuelles-kraftwerk", metadata, { en: metadataEn });
