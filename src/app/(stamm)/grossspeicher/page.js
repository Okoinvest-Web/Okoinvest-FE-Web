// src/app/grossspeicher/page.js – Batteriegroßspeicher
//
// Sprachmodell: feste Texte im Wörterbuch TEXTE (en nur Texte, Zahlen im englischen Format).
import { Activity, BookOpen, Calculator, ClipboardList, Clock, FileSearch, Gauge, Handshake, LineChart, MapPinned, Network, ShieldCheck, Zap } from "lucide-react";

import SeitenHero from "@/components/Energie/Seite/SeitenHero";
import Faktenleiste from "@/components/Energie/Seite/Faktenleiste";
import Kopf from "@/components/Energie/Seite/Kopf";
import Ablaufleiste from "@/components/Energie/Seite/Ablaufleiste";
import AnfrageBuehne from "@/components/Energie/Seite/AnfrageBuehne";
import Weiterlesen from "@/components/Energie/Seite/Weiterlesen";
import HeroBuehne from "@/components/Speicher/Seite/HeroBuehne";
import Modelle from "@/components/Speicher/Seite/Modelle";
import Erloese from "@/components/Speicher/Seite/Erloese";
import Netz from "@/components/Speicher/Seite/Netz";
import Technik from "@/components/Speicher/Seite/Technik";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import Faq from "@/components/ui/Faq";
import Reveal from "@/components/ui/Reveal";
import AuswahlAnfrage from "@/components/Carport/AuswahlAnfrage";
import { abs, SITE } from "@/data/site";
import { SPEICHER, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import JsonLd from "@/components/JsonLd";
import { pfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { datumText, fmtZahl } from "@/lib/sprache/format";
import { GiltFuer } from "@/components/Land/LandHinweis";
import { faqFuerLand, listeFuerLand } from "@/components/Land/Laenderteile";

const PFAD = pfad("/grossspeicher");
const TITEL = "Batteriegroßspeicher: Co-Location & Stand-alone | ÖkoInvest";
const BESCHREIBUNG =
  "Batteriegroßspeicher am Solarpark oder Netzknoten: Erlöse aus Arbitrage und Regelenergie, Netzanschluss, Baukostenzuschuss, LFP-Technik und Sicherheit.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  keywords: ["Batteriegroßspeicher", "Großspeicher Solarpark", "Co-Location Speicher", "BESS Erlöse", "Baukostenzuschuss Speicher", "Stand-alone Batteriespeicher", "Speicher Netzanschluss"],
  alternates: { canonical: abs(PFAD) },
  openGraph: { type: "website", url: abs(PFAD), siteName: "ÖkoInvest", title: TITEL, description: BESCHREIBUNG, images: [{ url: abs("/img/speicher.jpg"), width: 1280, height: 852, alt: "Batteriespeicher-Container" }] },
};

// Beispiel 10 MW / 20 MWh (2-h-System) aus den Marktannahmen
const MW = 10;
const MWH = 20;
const invest = { min: MWH * 1000 * SPEICHER.capexProKwh.min, mittel: MWH * 1000 * SPEICHER.capexProKwh.mittel, max: MWH * 1000 * SPEICHER.capexProKwh.max };
const erloes = { min: MW * SPEICHER.erloesProMwJahr.min, mittel: MW * SPEICHER.erloesProMwJahr.mittel, max: MW * SPEICHER.erloesProMwJahr.max };

const FAQ = [
  {
    q: "Co-Location oder Stand-alone – was ist besser?",
    a: "Das hängt vom Netzanschluss ab. Co-Location nutzt den Netzanschluss eines Solarparks mit: Der Speicher nimmt Mittagsspitzen auf, die sonst abgeregelt oder billig verkauft würden, und speist abends ein – ohne zusätzliche Anschlussleistung. Stand-alone-Speicher an Umspannwerken sind frei in der Fahrweise und größer skalierbar, brauchen aber einen eigenen, oft knappen Netzanschluss und zahlen in der Regel einen Baukostenzuschuss.",
  },
  {
    q: "Womit verdient ein Großspeicher Geld?",
    a: `Mit Preisunterschieden am Strommarkt (Day-Ahead und Intraday), mit Regelenergie (Primärregelleistung FCR und Sekundärregelleistung aFRR) und – am Solarpark – mit verschobenem Solarstrom. Die Erlöse schwanken stark mit dem Markt; wir rechnen vorsichtig mit ${fmt(SPEICHER.erloesProMwJahr.min / 1000)}–${fmt(SPEICHER.erloesProMwJahr.max / 1000)} T€ je MW und Jahr. Indizes zeigen zeitweise höhere theoretische Potenziale, die in der Praxis nur teilweise erreicht werden. Für die Finanzierung werden zunehmend Tolling- oder Floor-Verträge mit Vermarktern genutzt.`,
    nurDE: "Erlöswerte",
  },
  {
    q: "Muss ein Speicher einen Baukostenzuschuss zahlen?",
    a: "Nach der Entscheidung des Bundesgerichtshofs vom 15. Juli 2025 (EnVR 1/24) dürfen Netzbetreiber auch von Batteriespeichern einen Baukostenzuschuss nach dem Leistungspreismodell verlangen. Je nach Netzebene und Netzgebiet kann das die Investition spürbar erhöhen. Bei Co-Location am bestehenden Anschluss eines Solarparks fällt er für die gemeinsam genutzte Leistung in der Regel nicht erneut an – das ist im Einzelfall mit dem Netzbetreiber zu klären.",
    nurDE: "Regeln zu Anschlusskosten",
  },
  {
    q: "Zahlt ein Speicher Netzentgelte?",
    a: "Nach § 118 Abs. 6 EnWG sind Stromspeicher, die bis zum 4. August 2029 in Betrieb gehen, 20 Jahre lang von Netzentgelten für den eingespeicherten und wieder eingespeisten Strom befreit. Die Bundesnetzagentur arbeitet an einer Reform der Netzentgeltsystematik; nach aktuellem Stand ist für Anlagen innerhalb der Frist Vertrauensschutz zu erwarten – die Entwicklung sollte bei jeder Investitionsentscheidung geprüft werden.",
    nurDE: "Regeln zu Netzentgelten für Speicher",
  },
  {
    q: "Wie sicher sind Großspeicher?",
    a: "Heute werden fast ausschließlich Lithium-Eisenphosphat-Zellen (LFP) eingesetzt, die thermisch deutlich stabiler sind als ältere Zellchemien. Dazu kommen Zell- und Modulüberwachung, Gasdetektion, Abstände zwischen Containern, Löschkonzepte mit der Feuerwehr und Prüfungen nach anerkannten Normen. Ein Brandschutzkonzept ist Teil jeder Genehmigung.",
  },
  {
    q: "Gilt das auch in Österreich und der Schweiz?",
    a: "Die Erlösquellen sind ähnlich – Regelenergie über APG bzw. Swissgrid, Arbitrage an den Strombörsen. Netzentgelte, Anschlussregeln und Genehmigung unterscheiden sich aber. In Österreich spielen Speicher zudem in Erneuerbare-Energie-Gemeinschaften und bei Photovoltaik-Parks mit begrenzter Einspeiseleistung eine wachsende Rolle. Wir prüfen die Rahmenbedingungen je Standort.",
  },
];

// Faktenkarte mit deutschem Recht: gemeinsam mit Vermerk, in AT/CH durch eine länderneutrale Karte ersetzt
const NEUTRAL = { icon: Network, wert: "2", zahl: { wert: 2 }, einheit: "Modelle", text: "Co-Location am Solarpark oder Stand-alone am Netzknoten" };

/* ------------------------------------------------------------------------------------------- */
/* Englisch (Sprachmodell)                                                                      */
/* ------------------------------------------------------------------------------------------- */
const z = (n, stellen = 0) => fmtZahl(n, stellen, "en");
const TITEL_EN = "Battery storage: co-location & stand-alone | ÖkoInvest";
const BESCHREIBUNG_EN =
  "Large-scale battery storage at the solar park or grid node: revenue from arbitrage and balancing power, grid connection, connection contribution, LFP technology and safety.";
const metadataEn = {
  title: TITEL_EN,
  description: BESCHREIBUNG_EN,
  keywords: ["battery storage", "battery storage solar park", "co-location storage", "BESS revenue", "grid connection contribution storage", "stand-alone battery storage", "storage grid connection"],
  openGraph: { title: TITEL_EN, description: BESCHREIBUNG_EN, images: [{ alt: "Battery storage container" }] },
};

const FAQ_EN = [
  {
    q: "Co-location or stand-alone – which is better?",
    a: "It depends on the grid connection. Co-location shares a solar park’s grid connection: the storage absorbs midday peaks that would otherwise be curtailed or sold cheaply, and feeds in during the evening – without additional connection capacity. Stand-alone storage at substations is free to operate and more scalable, but needs its own, often scarce grid connection and usually pays a grid connection contribution.",
  },
  {
    q: "How does a battery storage system make money?",
    a: `From price differences on the power market (day-ahead and intraday), from balancing power (frequency containment reserve FCR and automatic frequency restoration reserve aFRR) and – at the solar park – from shifted solar power. Revenue fluctuates strongly with the market; we calculate conservatively with €${z(SPEICHER.erloesProMwJahr.min / 1000)}k–${z(SPEICHER.erloesProMwJahr.max / 1000)}k per MW per year. Indices at times show higher theoretical potential that is only partly achieved in practice. For financing, tolling or floor contracts with traders are increasingly used.`,
    nurDE: "Revenue figures",
  },
  {
    q: "Does a storage system have to pay a grid connection contribution?",
    a: "Following the ruling of the German Federal Court of Justice (BGH) of 15 July 2025 (EnVR 1/24), grid operators may also charge battery storage systems a grid connection contribution (Baukostenzuschuss) based on the capacity price model. Depending on the grid level and area, this can increase the investment noticeably. With co-location at an existing solar park connection, it is generally not charged again for the shared capacity – this needs to be clarified with the grid operator in each case.",
    nurDE: "Rules on connection costs",
  },
  {
    q: "Does a storage system pay grid fees?",
    a: "Under § 118 (6) EnWG (German Energy Industry Act), power storage systems commissioned by 4 August 2029 are exempt from grid fees for 20 years for the power stored and fed back in. The Federal Network Agency is working on a reform of the grid fee system; according to the current status, legitimate expectations protection can be expected for installations within the deadline – developments should be checked for every investment decision.",
    nurDE: "Rules on grid fees for storage",
  },
  {
    q: "How safe are battery storage systems?",
    a: "Today, lithium iron phosphate (LFP) cells are used almost exclusively; they are thermally much more stable than older cell chemistries. In addition, there is cell and module monitoring, gas detection, distances between containers, firefighting concepts agreed with the fire brigade and testing to recognised standards. A fire protection concept is part of every permit.",
  },
  {
    q: "Does this also apply in Austria and Switzerland?",
    a: "The revenue sources are similar – balancing power via APG or Swissgrid, arbitrage on the power exchanges. However, grid fees, connection rules and permitting differ. In Austria, storage is also playing a growing role in renewable energy communities and in photovoltaic parks with limited feed-in capacity. We check the framework for each site.",
  },
];

/** Feste Texte der Seite (en nur Texte, Listen je Index). */
const TEXTE = {
  de: {
    faq: FAQ,
    neutral: { einheit: NEUTRAL.einheit, text: NEUTRAL.text },
    schema: { name: "Entwicklung von Batteriegroßspeichern", serviceType: "Projektentwicklung von Batteriespeichern (Co-Location am Solarpark und Stand-alone)", description: BESCHREIBUNG },
    hero: {
      brotkrumen: "Großspeicher",
      pillDe: { marke: "BGH 2025", text: "Baukostenzuschuss auch für Speicher – was das heißt", kurz: "Baukostenzuschuss für Speicher" },
      pillLand: { marke: "Netz", text: "Der Engpass heißt Netz – nicht Batterie", kurz: "Engpass Netz" },
      titelA: "Großspeicher: Solarstrom, ",
      titelB: "wenn er gebraucht wird.",
      leadA: "Batteriegroßspeicher am Solarpark oder am Netzknoten:",
      leadB: " Wir entwickeln Speicherprojekte vom Netzanschluss bis zur Vermarktung – für Flächeneigentümer, Investoren und Stadtwerke.",
      primaer: "Speicherprojekt anfragen",
      sekundaer: "Für Investoren",
      hinweis: "Unverbindlich · erste Einschätzung zu Standort, Netz und Modell",
      chips: ["Co-Location & Stand-alone", "Arbitrage & Regelenergie", "LFP, 2 h und 4 h", "Vom Netzanschluss bis zur Vermarktung"],
      bildunterschrift: "Schematische Darstellung · Beispielansicht mit fiktiven Werten",
    },
    fakten: {
      titel: "Großspeicher in Zahlen",
      liste: [
        { wert: "2–4 h", einheit: "Speicherdauer", text: "2-Stunden-Systeme für Regelenergie, 4 Stunden für mehr Solarverschiebung" },
        { einheit: "Vollzyklen pro Jahr", text: "Annahme in unseren Rechnungen" },
        { einheit: "Wirkungsgrad (AC)", text: "vom Laden bis zum Entladen" },
        { wert: "20 J.", nach: " J.", einheit: "ohne Netzentgelte", text: "§ 118 Abs. 6 EnWG bei Inbetriebnahme bis 4. August 2029" },
      ],
      fussnote: `Annahmen Stand ${STAND}`,
    },
    ablaufKopf: { eyebrow: "Ablauf", titel: "Vom Standort zum laufenden Speicher.", modelle: "Vermarktungsmodelle:" },
    ablauf: [
      { title: "Standort & Netz", text: "Fläche sichern, Netzanschluss anfragen oder bestehenden Solarpark-Anschluss prüfen." },
      { title: "Erlöse & Auslegung", text: "Erlösgutachten, Leistung und Dauer, Vermarktungsmodell (Merchant, Tolling, Floor)." },
      { title: "Genehmigung", text: "Bau- und Brandschutzkonzept, Abstimmung mit Gemeinde und Feuerwehr." },
      { title: "Bau & Vermarktung", text: "Lieferung, Montage, Inbetriebnahme, Präqualifikation für Regelenergie und Betrieb." },
    ],
    faqKopf: { eyebrow: "Häufige Fragen", titel: "Großspeicher – gut zu wissen", lead: "Modelle, Erlöse, Netz und Sicherheit nach aktuellem Stand.", button: "Frage direkt stellen" },
    anfrage: {
      titelA: "Fläche, Park oder Kapital ",
      titelB: "für einen Speicher?",
      lead: "Ob Sie eine Fläche nahe einem Umspannwerk haben, einen Solarpark nachrüsten oder in Speicherprojekte investieren möchten – wir melden uns mit einer ersten Einschätzung.",
      zusagen: ["Unverbindlich anfragen", "Co-Location & Stand-alone", "Deutschland, Österreich, Schweiz"],
      ablauf: [
        { titel: "Sie schildern kurz Ihre Ausgangslage", text: "Fläche, Solarpark, Netzanschluss oder Kapital – ein paar Angaben genügen." },
        { titel: "Sie erhalten eine Vorgangsnummer", text: "Direkt nach dem Absenden. Mit einer Registrierung verfolgen Sie den Stand im Portal." },
        { titel: "Wir melden uns mit einer ersten Einschätzung", text: "Zu Standort, Netz, Modell und Erlösen – und den nächsten Schritten." },
      ],
      formText: "Pflicht sind nur Name, E-Mail und Ihre Einwilligung.",
      button: "Speicherprojekt anfragen",
      gruppen: [
        { id: "rolle", legende: "Sie haben …", optionen: [{ id: "flaeche", label: "eine Fläche" }, { id: "solarpark", label: "einen Solarpark" }, { id: "kapital", label: "Kapital" }, { id: "netz", label: "einen Netzanschluss" }] },
        { id: "modell", legende: "Modell", optionen: [{ id: "offen", label: "Noch offen" }, { id: "colocation", label: "Co-Location" }, { id: "standalone", label: "Stand-alone" }] },
        { id: "groesse", legende: "Größenordnung", optionen: [{ id: "bis10", label: "bis 10 MW" }, { id: "10-50", label: "10–50 MW" }, { id: "ueber50", label: "über 50 MW" }] },
      ],
    },
    weiter: {
      text: "Rechnen, vergleichen, vertiefen – in Ruhe nachlesen.",
      items: [
        { titel: "Für Investoren", text: "Speicher- und Solarprojekte in jeder Phase – Suchprofil, NDA, Datenraum." },
        { titel: "Solarpark-Renditerechner", text: "IRR, LCOE und DSCR des Solarparks, an dem der Speicher stehen kann." },
        { titel: "Virtuelles Kraftwerk", text: "Wie Speicher, Parks und Verbraucher gemeinsam am Markt agieren." },
        { titel: "Ratgeber Speichererlöse", text: "Arbitrage, FCR und aFRR im Detail – mit Marktentwicklung." },
      ],
    },
  },
  en: {
    faq: FAQ_EN,
    neutral: { einheit: "Models", text: "Co-location at the solar park or stand-alone at the grid node" },
    schema: { name: "Development of large-scale battery storage", serviceType: "Project development of battery storage (co-location at the solar park and stand-alone)", description: BESCHREIBUNG_EN },
    hero: {
      brotkrumen: "Battery storage",
      pillDe: { marke: "BGH 2025", text: "Grid connection contribution for storage too – what it means", kurz: "Connection contribution for storage" },
      pillLand: { marke: "Grid", text: "The bottleneck is the grid – not the battery", kurz: "Grid bottleneck" },
      titelA: "Battery storage: solar power ",
      titelB: "when it is needed.",
      leadA: "Large-scale battery storage at the solar park or the grid node:",
      leadB: " we develop storage projects from grid connection to marketing – for landowners, investors and municipal utilities.",
      primaer: "Enquire about a storage project",
      sekundaer: "For investors",
      hinweis: "Without obligation · initial assessment of site, grid and model",
      chips: ["Co-location & stand-alone", "Arbitrage & balancing power", "LFP, 2 h and 4 h", "From grid connection to marketing"],
      bildunterschrift: "Schematic illustration · example view with fictitious values",
    },
    fakten: {
      titel: "Battery storage in figures",
      liste: [
        { wert: "2–4 h", einheit: "Storage duration", text: "2-hour systems for balancing power, 4 hours for more solar shifting" },
        { einheit: "Full cycles per year", text: "assumption in our calculations" },
        { einheit: "Efficiency (AC)", text: "from charging to discharging" },
        { wert: "20 yrs", nach: " yrs", einheit: "without grid fees", text: "§ 118 (6) EnWG for commissioning by 4 August 2029" },
      ],
      fussnote: `Assumptions as of ${datumText(STAND, "en")}`,
    },
    ablaufKopf: { eyebrow: "Process", titel: "From site to operating storage.", modelle: "Marketing models:" },
    ablauf: [
      { title: "Site & grid", text: "Secure the land, request a grid connection or check the existing solar park connection." },
      { title: "Revenue & design", text: "Revenue assessment, capacity and duration, marketing model (merchant, tolling, floor)." },
      { title: "Permitting", text: "Building and fire protection concept, coordination with the municipality and fire brigade." },
      { title: "Construction & marketing", text: "Delivery, installation, commissioning, prequalification for balancing power and operation." },
    ],
    faqKopf: { eyebrow: "Frequently asked questions", titel: "Battery storage – good to know", lead: "Models, revenue, grid and safety – current status.", button: "Ask your question directly" },
    anfrage: {
      titelA: "Land, a park or capital ",
      titelB: "for a storage system?",
      lead: "Whether you have land near a substation, want to retrofit a solar park or invest in storage projects – we will get back to you with an initial assessment.",
      zusagen: ["Enquire without obligation", "Co-location & stand-alone", "Germany, Austria, Switzerland"],
      ablauf: [
        { titel: "You briefly describe your situation", text: "Land, solar park, grid connection or capital – a few details are enough." },
        { titel: "You receive a case number", text: "Immediately after submitting. If you register, you can follow the status in the portal." },
        { titel: "We get back to you with an initial assessment", text: "On site, grid, model and revenue – and the next steps." },
      ],
      formText: "Only name, email and your consent are required.",
      button: "Enquire about a storage project",
      gruppen: [
        { legende: "You have …", optionen: [{ label: "land" }, { label: "a solar park" }, { label: "capital" }, { label: "a grid connection" }] },
        { legende: "Model", optionen: [{ label: "Not decided yet" }, { label: "Co-location" }, { label: "Stand-alone" }] },
        { legende: "Size", optionen: [{ label: "up to 10 MW" }, { label: "10–50 MW" }, { label: "over 50 MW" }] },
      ],
    },
    weiter: {
      text: "Calculate, compare, go deeper – read up at your leisure.",
      items: [
        { titel: "For investors", text: "Storage and solar projects in every phase – search profile, NDA, data room." },
        { titel: "Solar park return calculator", text: "IRR, LCOE and DSCR of the solar park where the storage can be located." },
        { titel: "Virtual power plant", text: "How storage, parks and consumers act together on the market." },
        { titel: "Storage revenue guide", text: "Arbitrage, FCR and aFRR in detail – with market developments." },
      ],
    },
  },
};

export default async function GrossspeicherSeite({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const w = uebersetze(TEXTE, sprache);
  const f = en ? (n, s = 0) => z(n, s) : fmt;
  const deRecht = !land || land === "DE";
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: w.schema.name,
    serviceType: w.schema.serviceType,
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: ["DE", "AT", "CH"],
    url: abs(PFAD),
    description: w.schema.description,
  };

  return (
    <div>
      <JsonLd daten={schema} />

      <SeitenHero
        breadcrumbs={[{ name: w.hero.brotkrumen }]}
        pill={deRecht ? { ...w.hero.pillDe, href: "#netz" } : { ...w.hero.pillLand, href: "#netz" }}
        titel={
          <>
            {w.hero.titelA}<span className="ov-text-gradient-light">{w.hero.titelB}</span>
          </>
        }
        lead={
          <>
            <span className="font-medium text-white">{w.hero.leadA}</span>
            {w.hero.leadB}
          </>
        }
        primaer={{ label: w.hero.primaer, href: "#anfrage" }}
        sekundaer={{ label: w.hero.sekundaer, href: "/investoren", icon: LineChart }}
        hinweis={w.hero.hinweis}
        chips={w.hero.chips}
        buehne={<HeroBuehne />}
        bildunterschrift={w.hero.bildunterschrift}
      />

      <Faktenleiste
        titel={w.fakten.titel}
        items={listeFuerLand(
          [
          { icon: Clock, wert: w.fakten.liste[0].wert, einheit: w.fakten.liste[0].einheit, text: w.fakten.liste[0].text },
          { icon: Activity, wert: f(SPEICHER.zyklenProJahr), zahl: { wert: SPEICHER.zyklenProJahr }, einheit: w.fakten.liste[1].einheit, text: w.fakten.liste[1].text },
          { icon: Gauge, wert: `${f(SPEICHER.wirkungsgrad * 100)} %`, zahl: { wert: Math.round(SPEICHER.wirkungsgrad * 100), nach: " %" }, einheit: w.fakten.liste[2].einheit, text: w.fakten.liste[2].text },
          { icon: ShieldCheck, wert: w.fakten.liste[3].wert, zahl: { wert: 20, nach: w.fakten.liste[3].nach }, einheit: w.fakten.liste[3].einheit, text: w.fakten.liste[3].text, nurDE: true },
          ],
          land,
          () => ({ ...NEUTRAL, ...w.neutral }),
          (x) => ({ ...x, text: <>{x.text} <GiltFuer /></> })
        )}
        fussnote={w.fakten.fussnote}
      />

      <Modelle land={land} />

      <Erloese mw={MW} mwh={MWH} invest={invest} erloes={erloes} land={land} />

      <Netz land={land} />

      <Technik />

      {/* ---------------- Ablauf ---------------- */}
      <Section tone="white" space="lg" data-abschnitt="ablauf" aria-labelledby="ablauf-titel">
        <div className="mb-12 flex flex-col gap-6 md:mb-16 lg:flex-row lg:items-end lg:justify-between">
          <Kopf id="ablauf-titel" eyebrow={w.ablaufKopf.eyebrow} titel={w.ablaufKopf.titel} />
          <Reveal className="flex flex-wrap gap-2 lg:justify-end">
            <span className="sr-only">{w.ablaufKopf.modelle}</span>
            {["Merchant", "Tolling", "Floor"].map((v) => (
              <span key={v} className="inline-flex min-h-9 items-center rounded-full bg-sand-50 px-3.5 text-[13.5px] font-semibold text-ink-700 ring-1 ring-ink-200/70">
                {v}
              </span>
            ))}
          </Reveal>
        </div>
        <Ablaufleiste
          items={[
            { icon: MapPinned, ...w.ablauf[0] },
            { icon: LineChart, ...w.ablauf[1] },
            { icon: ShieldCheck, ...w.ablauf[2] },
            { icon: Zap, ...w.ablauf[3] },
          ]}
        />
      </Section>

      {/* ---------------- FAQ ---------------- */}
      <Section tone="sand" space="lg" data-abschnitt="faq" aria-labelledby="faq-titel">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Kopf id="faq-titel" eyebrow={w.faqKopf.eyebrow} titel={w.faqKopf.titel} lead={w.faqKopf.lead} />
            <Reveal className="mt-8">
              <Button href="#anfrage" variant="secondary" pfeil>
                {w.faqKopf.button}
              </Button>
            </Reveal>
          </div>
          <Faq items={faqFuerLand(w.faq, land, { sprache })} />
        </div>
      </Section>

      {/* ---------------- Anfrage ---------------- */}
      <AnfrageBuehne
        titel={
          <>
            {w.anfrage.titelA}<span className="ov-text-gradient-light">{w.anfrage.titelB}</span>
          </>
        }
        lead={w.anfrage.lead}
        zusagen={[
          { icon: ShieldCheck, text: w.anfrage.zusagen[0] },
          { icon: Network, text: w.anfrage.zusagen[1] },
          { icon: MapPinned, text: w.anfrage.zusagen[2] },
        ]}
        ablauf={[
          { icon: ClipboardList, ...w.anfrage.ablauf[0] },
          { icon: FileSearch, ...w.anfrage.ablauf[1] },
          { icon: Handshake, ...w.anfrage.ablauf[2] },
        ]}
        formText={w.anfrage.formText}
      >
        <AuswahlAnfrage typ="speicher" felder={["firma", "telefon", "plz", "land", "nachricht"]} button={w.anfrage.button} gruppen={w.anfrage.gruppen} />
      </AnfrageBuehne>

      <Weiterlesen
        text={w.weiter.text}
        items={[
          { href: "/investoren", icon: LineChart, ...w.weiter.items[0] },
          { href: pfad("/rechner/solarpark"), icon: Calculator, ...w.weiter.items[1] },
          { href: pfad("/virtuelles-kraftwerk"), icon: Network, ...w.weiter.items[2] },
          { href: "/ratgeber/grossspeicher-erloese", icon: BookOpen, ...w.weiter.items[3] },
        ]}
      />
    </div>
  );
}

export const generateMetadata = seitenMetadata("/grossspeicher", metadata, { en: metadataEn });
