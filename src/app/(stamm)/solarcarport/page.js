// src/app/solarcarport/page.js – Solarcarports & Parkplatz-PV
//
// Sprachmodell: feste Texte im Wörterbuch TEXTE (en nur Texte, Zahlen im englischen Format).
import Link from "@/components/Land/Link";
import { ArrowUpRight, BookOpen, Building2, Calculator, Car, ClipboardList, FileSearch, Handshake, Landmark, Leaf, PlugZap, ShieldCheck, ShoppingBag, Sun, Warehouse, Zap } from "lucide-react";

import SeitenHero from "@/components/Energie/Seite/SeitenHero";
import Faktenleiste from "@/components/Energie/Seite/Faktenleiste";
import Kopf from "@/components/Energie/Seite/Kopf";
import Ablaufleiste from "@/components/Energie/Seite/Ablaufleiste";
import AnfrageBuehne from "@/components/Energie/Seite/AnfrageBuehne";
import Weiterlesen from "@/components/Energie/Seite/Weiterlesen";
import HeroBuehne from "@/components/Carport/Seite/HeroBuehne";
import Solarpflicht from "@/components/Carport/Seite/Solarpflicht";
import Bauarten from "@/components/Carport/Seite/Bauarten";
import Laden from "@/components/Carport/Seite/Laden";
import Finanzierung from "@/components/Carport/Seite/Finanzierung";
import AuswahlAnfrage from "@/components/Carport/AuswahlAnfrage";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import Faq from "@/components/ui/Faq";
import Reveal from "@/components/ui/Reveal";
import { abs, SITE } from "@/data/site";
import { CARPORT, STAND } from "@/lib/invest/markt";
import { rechneCarport } from "@/lib/rechner/carport";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import JsonLd from "@/components/JsonLd";
import { pfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { GiltFuer } from "@/components/Land/LandHinweis";
import { faqFuerLand, listeFuerLand, nurDeText } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { datumText, fmtZahl } from "@/lib/sprache/format";

const PFAD = pfad("/solarcarport");
const TITEL = "Solarcarport & Parkplatz-PV für Unternehmen | ÖkoInvest";
const BESCHREIBUNG =
  "Solarcarports für Unternehmen und Kommunen: Solarpflicht je Bundesland, Bauarten, Ladepunkte nach GEIG, Contracting – wir bauen, Sie nutzen den Strom.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  keywords: ["Solarcarport Unternehmen", "Parkplatz Photovoltaik", "Solarpflicht Parkplatz", "Solarcarport Contracting", "PV Parkplatz Ladeinfrastruktur", "GEIG Ladepunkte"],
  alternates: { canonical: abs(PFAD) },
  openGraph: { type: "website", url: abs(PFAD), siteName: "ÖkoInvest", title: TITEL, description: BESCHREIBUNG, images: [{ url: abs("/img/gewerbedach.jpg"), width: 1280, height: 852, alt: "Gewerbegebäude mit Photovoltaik" }] },
};

/** Solarpflicht für neue Parkplätze – Kurzfassung, ausführlich im Ratgeber (Stand September 2026) */
const PFLICHT = [
  ["Baden-Württemberg", "mehr als 35", "60 % der geeigneten Fläche", "seit 2022"],
  ["Hamburg", "mehr als 35 neue", "40 % der geeigneten Fläche", "seit 2024"],
  ["Hessen", "mehr als 50 (landeseigen: mehr als 35)", "Anlage über der Stellplatzfläche", "Bauanträge ab Ende 2023"],
  ["Niedersachsen", "mehr als 25", "auch bei Erneuerung von mind. 50 % eines Parkplatzes", "seit 2025 (vorher mehr als 50)"],
  ["Nordrhein-Westfalen", "mehr als 35 (Nichtwohngebäude)", "30 % der geeigneten Fläche, alternativ Bäume", "seit 2022"],
  ["Rheinland-Pfalz", "ab 50 (gewerblich, öffentlich)", "60 % der geeigneten Fläche", "seit 2023"],
  ["Saarland", "ab 35 (gewerblich), öffentliche Parkplätze", "60 % der geeigneten Fläche", "seit 2025"],
  ["Schleswig-Holstein", "mehr als 70", "Neubau und grundlegende Sanierung", "Novelle 2025"],
];
/** Schwelle je Land als Zahl für den Balkenvergleich – abgeleitet aus PFLICHT („mehr als 35“ → > 35) */
const SCHWELLEN = [
  { land: "Niedersachsen", wert: 25, label: "> 25" },
  { land: "Baden-Württemberg", wert: 35, label: "> 35" },
  { land: "Hamburg", wert: 35, label: "> 35" },
  { land: "Nordrhein-Westfalen", wert: 35, label: "> 35" },
  { land: "Saarland", wert: 35, label: "ab 35" },
  { land: "Hessen", wert: 50, label: "> 50" },
  { land: "Rheinland-Pfalz", wert: 50, label: "ab 50" },
  { land: "Schleswig-Holstein", wert: 70, label: "> 70" },
];

const ZIELGRUPPEN = [
  { icon: Building2, title: "Unternehmen", tag: "Mitarbeiter & Flotte", text: "Mitarbeiter- und Besucherparkplätze: Strom für Produktion und Büro, Laden für Dienstwagen und E-Flotte – dann, wenn die Sonne scheint." },
  { icon: ShoppingBag, title: "Handel & Freizeit", tag: "Kundenparkplätze", text: "Kundenparkplätze mit Ladeangebot, Schatten im Sommer und Strom für Kühlung und Beleuchtung – sichtbar nachhaltig." },
  { icon: Landmark, title: "Kommunen", tag: "Rathaus, Schule, Bad", text: "Parkplätze an Rathaus, Schule, Bad und Bahnhof: Solarpflicht erfüllen, Ladeinfrastruktur schaffen, Haushalt entlasten.", href: pfad("/kommunen") },
];

const OHNE = "Bayern, Berlin, Bremen, Mecklenburg-Vorpommern, Sachsen, Sachsen-Anhalt, Thüringen; in Brandenburg wurde die Parkplatzpflicht 2026 wieder aufgehoben";

const beispiel = rechneCarport({ stellplaetze: 100, eigenverbrauch: 0.75, ac: 10, dc: 2 });

const FAQ = [
  {
    q: "Ab wie vielen Stellplätzen gilt die Solarpflicht?",
    a: "Das regelt jedes Bundesland selbst: nach aktuellem Stand ab mehr als 25 Stellplätzen in Niedersachsen, ab mehr als 35 in Baden-Württemberg, Hamburg und NRW, ab 35 gewerblich genutzten im Saarland, ab mehr als 50 in Hessen, ab 50 in Rheinland-Pfalz und ab mehr als 70 in Schleswig-Holstein. Sie gilt in der Regel für neue Parkplätze oder große Erweiterungen, nicht für den Bestand. Maßgeblich ist der aktuelle Gesetzestext zum Zeitpunkt des Bauantrags.",
    nurDE: "Solarpflichten für Parkplätze",
  },
  {
    q: "Was verlangt das GEIG auf Parkplätzen?",
    a: "Das Gebäude-Elektromobilitätsinfrastruktur-Gesetz verlangt bei neuen Nichtwohngebäuden mit mehr als sechs Stellplätzen Leitungsinfrastruktur für mindestens jeden dritten Stellplatz und mindestens einen Ladepunkt; bei größeren Renovierungen mit mehr als zehn Stellplätzen für jeden fünften. Bestehende Nichtwohngebäude mit mehr als 20 Stellplätzen brauchen seit dem 1. Januar 2025 mindestens einen Ladepunkt. Ein Solarcarport ist die naheliegende Stelle dafür.",
    nurDE: "Pflichten für Ladepunkte",
    AT: { q: "Welche Pflichten gibt es für Ladepunkte auf Parkplätzen?", a: nurDeText("AT", "Pflichten für Ladepunkte") },
    CH: { q: "Welche Pflichten gibt es für Ladepunkte auf Parkplätzen?", a: nurDeText("CH", "Pflichten für Ladepunkte") },
  },
  {
    q: "Was kostet ein Solarcarport?",
    a: `Wir rechnen mit ${fmt(CARPORT.capexProKwp.min)}–${fmt(CARPORT.capexProKwp.max)} €/kWp inklusive Stahlbau, Fundamenten und Entwässerung – bei rund ${fmt(CARPORT.kwpProStellplatz, 1)} kWp je Stellplatz also etwa ${fmtEur(CARPORT.kwpProStellplatz * CARPORT.capexProKwp.min)} bis ${fmtEur(CARPORT.kwpProStellplatz * CARPORT.capexProKwp.max)} je Stellplatz. Dazu kommen Ladepunkte: AC rund ${fmtEur(CARPORT.ladepunktAc)}, DC-Schnelllader rund ${fmtEur(CARPORT.ladepunktDc)} je Stück, ohne Netzausbau.`,
    nurDE: "Kostenwerte",
  },
  {
    q: "Wie funktioniert das Contracting?",
    a: `Wir planen, finanzieren, bauen und betreiben den Solarcarport. Sie stellen die Fläche und kaufen den Solarstrom, den Sie vor Ort nutzen, zu einem festen Preis – typischerweise über ${CARPORT.contractingJahre} Jahre. Sie binden kein Kapital, Wartung und Versicherung liegen bei uns. Nach Vertragsende kann die Anlage an Sie übergehen. Voraussetzung sind ein ausreichender Eigenverbrauch und eine gesicherte Nutzung der Fläche.`,
  },
  {
    q: "Stahl oder Holz?",
    a: "Stahl ist schlank, wirtschaftlich bei großen Spannweiten und in vielen Systemen vorgefertigt. Holz – meist Brettschichtholz – bindet CO₂, wirkt wärmer und passt zu Kommunen und Handel mit Nachhaltigkeitsanspruch; es braucht konstruktiven Holzschutz und ist oft etwas teurer. Wir planen beides.",
  },
  {
    q: "Gibt es Regeln in Österreich und der Schweiz?",
    a: "In Österreich regeln die Bundesländer Solarpflichten in ihren Bau- und Energiegesetzen unterschiedlich; eine flächendeckende Parkplatzpflicht wie in einigen deutschen Ländern ist uns nach aktuellem Stand nicht bekannt. In der Schweiz verlangen viele Kantone bei Neubauten Eigenstromerzeugung. Zusätzlich sieht die EU-Gebäuderichtlinie von 2024 schrittweise Solarpflichten vor, auch für überdachte Parkplätze an Gebäuden. Wir prüfen die Lage im Einzelfall.",
  },
];

/* ------------------------------------------------------------------------------------------- */
/* Englisch (Sprachmodell): inhaltlich identisch, Zahlen im englischen Format                    */
/* ------------------------------------------------------------------------------------------- */
const z = (n, stellen = 0) => fmtZahl(n, stellen, "en");
const eurEn = (n) => `€${z(Math.round(n))}`;

const TITEL_EN = "Solar carports & car park PV for businesses | ÖkoInvest";
const BESCHREIBUNG_EN =
  "Solar carports for businesses and municipalities: solar obligation by German federal state, designs, charging points under the GEIG, contracting – we build, you use the power.";

const metadataEn = {
  title: TITEL_EN,
  description: BESCHREIBUNG_EN,
  keywords: ["solar carport for businesses", "car park photovoltaics", "solar obligation car park", "solar carport contracting", "PV car park charging infrastructure", "GEIG charging points"],
  openGraph: { title: TITEL_EN, description: BESCHREIBUNG_EN, images: [{ alt: "Commercial building with photovoltaics" }] },
};

const PFLICHT_EN = [
  ["Baden-Württemberg", "more than 35", "60 % of the suitable area", "since 2022"],
  ["Hamburg", "more than 35 new", "40 % of the suitable area", "since 2024"],
  ["Hesse", "more than 50 (state-owned: more than 35)", "installation above the parking area", "building applications from the end of 2023"],
  ["Lower Saxony", "more than 25", "also when at least 50 % of a car park is renewed", "since 2025 (previously more than 50)"],
  ["North Rhine-Westphalia", "more than 35 (non-residential buildings)", "30 % of the suitable area, alternatively trees", "since 2022"],
  ["Rhineland-Palatinate", "from 50 (commercial, public)", "60 % of the suitable area", "since 2023"],
  ["Saarland", "from 35 (commercial), public car parks", "60 % of the suitable area", "since 2025"],
  ["Schleswig-Holstein", "more than 70", "new construction and major renovation", "2025 amendment"],
];
const LAND_EN = { "Baden-Württemberg": "Baden-Württemberg", Hamburg: "Hamburg", Hessen: "Hesse", Niedersachsen: "Lower Saxony", "Nordrhein-Westfalen": "North Rhine-Westphalia", "Rheinland-Pfalz": "Rhineland-Palatinate", Saarland: "Saarland", "Schleswig-Holstein": "Schleswig-Holstein" };
const SCHWELLEN_EN = SCHWELLEN.map((s) => ({ ...s, land: LAND_EN[s.land] ?? s.land, label: s.label.replace("ab ", "from ") }));
const OHNE_EN = "Bavaria, Berlin, Bremen, Mecklenburg-Western Pomerania, Saxony, Saxony-Anhalt, Thuringia; in Brandenburg, the car park obligation was repealed again in 2026";

const FAQ_EN = [
  {
    q: "From how many parking spaces does the solar obligation apply?",
    a: "Each German federal state regulates this itself: according to the current status, from more than 25 parking spaces in Lower Saxony, from more than 35 in Baden-Württemberg, Hamburg and North Rhine-Westphalia, from 35 commercially used spaces in Saarland, from more than 50 in Hesse, from 50 in Rhineland-Palatinate and from more than 70 in Schleswig-Holstein. It generally applies to new car parks or large extensions, not to existing ones. The legal text in force at the time of the building application is authoritative.",
    nurDE: "Solar obligations for car parks",
  },
  {
    q: "What does the GEIG require for car parks?",
    a: "The GEIG (German Building Electromobility Infrastructure Act) requires new non-residential buildings with more than six parking spaces to have cabling infrastructure for at least every third space and at least one charging point; for major renovations with more than ten parking spaces, for every fifth space. Since 1 January 2025, existing non-residential buildings with more than 20 parking spaces have needed at least one charging point. A solar carport is the obvious place for this.",
    nurDE: "Obligations for charging points",
    AT: { q: "What obligations apply to charging points on car parks?", a: nurDeText("AT", "Obligations for charging points", "en") },
    CH: { q: "What obligations apply to charging points on car parks?", a: nurDeText("CH", "Obligations for charging points", "en") },
  },
  {
    q: "How much does a solar carport cost?",
    a: `We calculate with €${z(CARPORT.capexProKwp.min)}–${z(CARPORT.capexProKwp.max)}/kWp including steel structure, foundations and drainage – at around ${z(CARPORT.kwpProStellplatz, 1)} kWp per parking space, that is roughly ${eurEn(CARPORT.kwpProStellplatz * CARPORT.capexProKwp.min)} to ${eurEn(CARPORT.kwpProStellplatz * CARPORT.capexProKwp.max)} per space. Charging points come on top: AC around ${eurEn(CARPORT.ladepunktAc)}, DC fast chargers around ${eurEn(CARPORT.ladepunktDc)} each, excluding grid reinforcement.`,
    nurDE: "Cost figures",
  },
  {
    q: "How does contracting work?",
    a: `We plan, finance, build and operate the solar carport. You provide the space and buy the solar power you use on site at a fixed price – typically over ${CARPORT.contractingJahre} years. You do not tie up capital; maintenance and insurance are our responsibility. When the contract ends, the installation can pass to you. The prerequisites are sufficient self-consumption and secured use of the site.`,
  },
  {
    q: "Steel or timber?",
    a: "Steel is slim, economical for large spans and prefabricated in many systems. Timber – usually glued laminated timber – stores CO₂, looks warmer and suits municipalities and retailers with sustainability ambitions; it needs structural wood protection and is often somewhat more expensive. We plan both.",
  },
  {
    q: "Are there rules in Austria and Switzerland?",
    a: "In Austria, the federal states regulate solar obligations differently in their building and energy laws; as far as we know, there is currently no comprehensive car park obligation like in some German states. In Switzerland, many cantons require new buildings to generate their own electricity. In addition, the 2024 EU Energy Performance of Buildings Directive provides for gradual solar obligations, including for covered car parks at buildings. We assess the situation case by case.",
  },
];

/** Feste Texte der Seite (en nur Texte; Listen je Index). */
const TEXTE = {
  de: {
    pflicht: PFLICHT,
    schwellen: SCHWELLEN,
    ohne: OHNE,
    faq: FAQ,
    zielgruppen: ZIELGRUPPEN,
    schema: { name: "Solarcarports und Parkplatz-Photovoltaik", serviceType: "Planung, Bau, Finanzierung und Betrieb von Solarcarports mit Ladeinfrastruktur", audience: "Unternehmen, Handel, Kommunen", description: BESCHREIBUNG },
    hero: {
      brotkrumen: "Solarcarports & Parkplätze",
      pillDe: { marke: "Solarpflicht", text: "In acht Bundesländern gilt sie für neue Parkplätze", kurz: "Solarpflicht in acht Ländern" },
      pillLand: { marke: "Contracting", text: "Solarcarport ohne eigenes Kapital", kurz: "Contracting" },
      titelA: "Solarcarports: Parkplätze, die ",
      titelB: "Strom erzeugen.",
      leadA: "Für Unternehmen, Handel und Kommunen:",
      leadB: " Solarcarports mit Ladepunkten",
      leadDe: ", geplant nach Solarpflicht und GEIG",
      leadC: ". Selbst investieren oder im Contracting – wir bauen und betreiben, Sie nutzen den Strom.",
      primaer: "Carport anfragen",
      sekundaer: "Carport-Rechner",
      hinweis: "Unverbindlich · erste Einschätzung zu Größe, Ladepunkten und Modell",
      chips: ["Solarpflicht sicher erfüllen", "Für Unternehmen und Kommunen", "Ladeinfrastruktur AC & DC", "Kauf oder Contracting", "Stahl oder Holz"],
      bildunterschrift: "Schematische Darstellung · Lastmanagement mit fiktiven Werten",
    },
    fakten: {
      titel: "Solarcarport in Zahlen",
      liste: [
        { einheit: "kWp je Stellplatz", text: "Leistung eines überdachten Stellplatzes" },
        { einheit: "kWp bei 100 Stellplätzen", text: "Leistung eines Parkplatzes mit 100 Stellplätzen" },
        { einheit: "MWh pro Jahr", text: "Ertrag bei 100 Stellplätzen in Süddeutschland" },
        { einheit: "t CO₂ pro Jahr", text: "vermieden bei 100 Stellplätzen" },
      ],
      ersatz: { einheit: "Ladepunkte", text: "Laden mit Solarstrom, wenn Fahrzeuge tagsüber stehen" },
      fussnote: `Beispielwerte aus dem Carport-Rechner, Stand ${STAND}.`,
    },
    zielKopf: { eyebrow: "Für wen", titel: "Überall, wo Autos tagsüber stehen." },
    ablaufKopf: { eyebrow: "Ablauf", titel: "Vom Lageplan zum Solarcarport." },
    ablauf: [
      { title: "Lageplan & Verbrauch", text: "Stellplätze, Fahrgassen, Leitungen, Lastgang und Ladebedarf – daraus ergeben sich Größe und Layout." },
      { title: "Konzept & Angebot", text: "Bauart, Statik, Ladepunkte und Netzanschluss; Kauf und Contracting als Varianten." },
      { title: "Genehmigung & Netz", text: "Baugenehmigung, wo nötig, Anmeldung beim Netzbetreiber, Abstimmung mit Brandschutz und Versicherung." },
      { title: "Bau & Betrieb", text: "Montage abschnittsweise, damit der Parkplatz nutzbar bleibt; danach Monitoring und Wartung." },
    ],
    faqKopf: {
      eyebrow: "Häufige Fragen",
      titel: "Solarcarports – gut zu wissen",
      leadDe: "Solarpflicht, GEIG, Kosten und Contracting nach aktuellem Stand.",
      leadLand: "Bauarten, Ladepunkte, Kosten und Contracting nach aktuellem Stand.",
      button: "Frage direkt stellen",
    },
    anfrage: {
      titelA: "Ihr Parkplatz, ",
      titelB: "unser Konzept.",
      lead: "Ein paar Angaben genügen für eine erste Einschätzung. Lageplan und Lastgang können Sie später im Portal hochladen.",
      zusagen: ["Unverbindlich anfragen", "Kauf oder Contracting", "Ladepunkte gleich mitplanen"],
      ablauf: [
        { titel: "Sie schildern kurz Ihren Parkplatz", text: "Stellplätze, Ladebedarf und Modell – Schätzungen genügen." },
        { titel: "Sie erhalten eine Vorgangsnummer", text: "Direkt nach dem Absenden. Lageplan und Lastgang laden Sie später im Portal hoch." },
        { titel: "Wir melden uns mit einer ersten Einschätzung", text: "Zu Größe, Bauart, Ladepunkten und Netzanschluss – Kauf und Contracting als Varianten." },
      ],
      formText: "Pflicht sind nur Name, E-Mail und Ihre Einwilligung.",
      button: "Carport anfragen",
      gruppen: [
        { legende: "Stellplätze", optionen: [{ label: "bis 50" }, { label: "50–150" }, { label: "150–500" }, { label: "über 500" }] },
        { legende: "Sie sind", optionen: [{ label: "Unternehmen" }, { label: "Handel" }, { label: "Kommune" }, { label: "Sonstige" }] },
        { legende: "Interesse an", optionen: [{ label: "Noch offen" }, { label: "Kauf" }, { label: "Contracting" }] },
        { legende: "Ladepunkte", optionen: [{ label: "AC" }, { label: "DC-Schnellladen" }] },
      ],
    },
    weiter: {
      text: "Rechnen, vergleichen, vertiefen – in Ruhe nachlesen.",
      items: [
        { titel: "Carport-Rechner", text: "Leistung, Ertrag, Investition und Amortisation – Kauf vs. Contracting." },
        { titel: "Reststrom-Pool", text: "Den Strom, den Sie trotz Carport noch kaufen, gebündelt günstiger beziehen." },
        { titel: "Ratgeber Solarpflicht", text: "Alle Bundesländer mit Rechtsgrundlage, Stichtag und Ausnahmen." },
        { titel: "Speicher", text: "Mehr Eigenverbrauch und Lastspitzen kappen – vom Gewerbe- bis zum Großspeicher." },
      ],
    },
  },
  en: {
    pflicht: PFLICHT_EN,
    schwellen: SCHWELLEN_EN,
    ohne: OHNE_EN,
    faq: FAQ_EN,
    zielgruppen: [
      { title: "Businesses", tag: "Employees & fleet", text: "Employee and visitor car parks: power for production and offices, charging for company cars and the e-fleet – when the sun is shining." },
      { title: "Retail & leisure", tag: "Customer car parks", text: "Customer car parks with charging, shade in summer and power for cooling and lighting – visibly sustainable." },
      { title: "Municipalities", tag: "Town hall, school, pool", text: "Car parks at the town hall, school, swimming pool and station: meet the solar obligation, create charging infrastructure, ease the budget." },
    ],
    schema: { name: "Solar carports and car park photovoltaics", serviceType: "Planning, construction, financing and operation of solar carports with charging infrastructure", audience: "Businesses, retail, municipalities", description: BESCHREIBUNG_EN },
    hero: {
      brotkrumen: "Solar carports & car parks",
      pillDe: { marke: "Solar obligation", text: "Eight German federal states require it for new car parks", kurz: "Solar obligation in eight states" },
      pillLand: { marke: "Contracting", text: "Solar carport without your own capital", kurz: "Contracting" },
      titelA: "Solar carports: car parks that ",
      titelB: "generate power.",
      leadA: "For businesses, retail and municipalities:",
      leadB: " solar carports with charging points",
      leadDe: ", planned in line with the solar obligation and the GEIG",
      leadC: ". Invest yourself or use contracting – we build and operate, you use the power.",
      primaer: "Enquire about a carport",
      sekundaer: "Carport calculator",
      hinweis: "Without obligation · initial assessment of size, charging points and model",
      chips: ["Meet the solar obligation reliably", "For businesses and municipalities", "AC & DC charging infrastructure", "Purchase or contracting", "Steel or timber"],
      bildunterschrift: "Schematic illustration · load management with fictitious values",
    },
    fakten: {
      titel: "Solar carports in figures",
      liste: [
        { einheit: "kWp per parking space", text: "capacity of one covered parking space" },
        { einheit: "kWp for 100 spaces", text: "capacity of a car park with 100 spaces" },
        { einheit: "MWh per year", text: "yield for 100 spaces in southern Germany" },
        { einheit: "t CO₂ per year", text: "avoided with 100 spaces" },
      ],
      ersatz: { einheit: "Charging points", text: "charging with solar power while vehicles are parked during the day" },
      fussnote: `Example figures from the carport calculator, as of ${datumText(STAND, "en")}.`,
    },
    zielKopf: { eyebrow: "Who it is for", titel: "Wherever cars are parked during the day." },
    ablaufKopf: { eyebrow: "Process", titel: "From site plan to solar carport." },
    ablauf: [
      { title: "Site plan & consumption", text: "Parking spaces, driving lanes, cables, load profile and charging demand – these determine size and layout." },
      { title: "Concept & offer", text: "Design, structural engineering, charging points and grid connection; purchase and contracting as options." },
      { title: "Permits & grid", text: "Building permit where required, registration with the grid operator, coordination with fire protection and insurance." },
      { title: "Construction & operation", text: "Installation in sections so that the car park remains usable; then monitoring and maintenance." },
    ],
    faqKopf: {
      eyebrow: "Frequently asked questions",
      titel: "Solar carports – good to know",
      leadDe: "Solar obligation, GEIG, costs and contracting – current status.",
      leadLand: "Designs, charging points, costs and contracting – current status.",
      button: "Ask your question directly",
    },
    anfrage: {
      titelA: "Your car park, ",
      titelB: "our concept.",
      lead: "A few details are enough for an initial assessment. You can upload the site plan and load profile later in the portal.",
      zusagen: ["Enquire without obligation", "Purchase or contracting", "Plan charging points at the same time"],
      ablauf: [
        { titel: "You briefly describe your car park", text: "Parking spaces, charging demand and model – estimates are enough." },
        { titel: "You receive a case number", text: "Immediately after submitting. You upload the site plan and load profile later in the portal." },
        { titel: "We get back to you with an initial assessment", text: "On size, design, charging points and grid connection – purchase and contracting as options." },
      ],
      formText: "Only name, email and your consent are required.",
      button: "Enquire about a carport",
      gruppen: [
        { legende: "Parking spaces", optionen: [{ label: "up to 50" }, { label: "50–150" }, { label: "150–500" }, { label: "over 500" }] },
        { legende: "You are", optionen: [{ label: "Business" }, { label: "Retail" }, { label: "Municipality" }, { label: "Other" }] },
        { legende: "Interested in", optionen: [{ label: "Not decided yet" }, { label: "Purchase" }, { label: "Contracting" }] },
        { legende: "Charging points", optionen: [{ label: "AC" }, { label: "DC fast charging" }] },
      ],
    },
    weiter: {
      text: "Calculate, compare, go deeper – read up at your leisure.",
      items: [
        { titel: "Carport calculator", text: "Capacity, yield, investment and payback – purchase vs. contracting." },
        { titel: "Residual power pool", text: "Buy the power you still need despite the carport more cheaply as part of a pool." },
        { titel: "Solar obligation guide", text: "All federal states with legal basis, effective date and exemptions." },
        { titel: "Storage", text: "More self-consumption and peak shaving – from commercial to large-scale storage." },
      ],
    },
  },
};

export default async function SolarcarportSeite({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const w = uebersetze(TEXTE, sprache);
  const f = en ? (n, s = 0) => z(n, s) : fmt;
  const fEur = en ? eurEn : fmtEur;
  const de = !land || land === "DE";
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: w.schema.name,
    serviceType: w.schema.serviceType,
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: ["DE", "AT", "CH"],
    audience: { "@type": "BusinessAudience", audienceType: w.schema.audience },
    url: abs(PFAD),
    description: w.schema.description,
  };

  return (
    <div>
      <JsonLd daten={schema} />

      <SeitenHero
        breadcrumbs={[{ name: w.hero.brotkrumen }]}
        pill={de ? { ...w.hero.pillDe, href: "#solarpflicht" } : { ...w.hero.pillLand, href: "#anfrage" }}
        titel={
          <>
            {w.hero.titelA}<span className="ov-text-gradient-light">{w.hero.titelB}</span>
          </>
        }
        lead={
          <>
            <span className="font-medium text-white">{w.hero.leadA}</span>
            {w.hero.leadB}
            {de ? w.hero.leadDe : ""}
            {w.hero.leadC}
          </>
        }
        primaer={{ label: w.hero.primaer, href: "#anfrage" }}
        sekundaer={{ label: w.hero.sekundaer, href: pfad("/rechner/solarcarport"), icon: Calculator }}
        hinweis={w.hero.hinweis}
        chips={[de ? w.hero.chips[0] : w.hero.chips[1], w.hero.chips[2], w.hero.chips[3], w.hero.chips[4]]}
        buehne={<HeroBuehne kwp={f(beispiel.kwp)} mwh={f(beispiel.ertrag / 1000)} />}
        bildunterschrift={w.hero.bildunterschrift}
      />

      <Faktenleiste
        titel={w.fakten.titel}
        items={listeFuerLand(
          [
          { icon: Car, wert: `≈ ${f(CARPORT.kwpProStellplatz, 1)}`, zahl: { wert: CARPORT.kwpProStellplatz, nachkomma: 1, vor: "≈ " }, ...w.fakten.liste[0] },
          { icon: Sun, wert: `≈ ${f(beispiel.kwp)}`, zahl: { wert: Math.round(beispiel.kwp), vor: "≈ " }, ...w.fakten.liste[1] },
          { icon: Zap, wert: `≈ ${f(beispiel.ertrag / 1000)}`, zahl: { wert: Math.round(beispiel.ertrag / 1000), vor: "≈ " }, ...w.fakten.liste[2] },
          { icon: Leaf, wert: `≈ ${f(beispiel.co2Tonnen)}`, zahl: { wert: Math.round(beispiel.co2Tonnen), vor: "≈ " }, ...w.fakten.liste[3], nurDE: true },
          ],
          land,
          () => ({ icon: PlugZap, wert: "AC & DC", ...w.fakten.ersatz }),
          (x) => ({ ...x, text: <>{x.text} <GiltFuer /></> })
        )}
        fussnote={w.fakten.fussnote}
      />

      {/* ---------------- Zielgruppen ---------------- */}
      <Section tone="white" space="lg" data-abschnitt="zielgruppen" aria-labelledby="zielgruppen-titel">
        <Kopf id="zielgruppen-titel" eyebrow={w.zielKopf.eyebrow} titel={w.zielKopf.titel} className="mb-12 md:mb-14" />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {w.zielgruppen.map((z, i) => (
            <Reveal as="li" key={i} delay={i * 70} className="ov-card-hover group relative flex flex-col rounded-[2rem] bg-sand-50 p-6 ring-1 ring-ink-200/70 focus-within:ring-2 focus-within:ring-ov-500 sm:p-8">
              <div className="flex items-start justify-between gap-3">
                <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-ov-600 shadow-e2 ring-1 ring-ink-200/70 transition-colors duration-300 group-hover:bg-ov-600 group-hover:text-white">
                  <z.icon className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-ink-600 ring-1 ring-ink-200/70">{z.tag}</span>
              </div>
              <h3 className="mt-6 font-display text-[21px] font-bold text-ink-900">
                {z.href ? (
                  <Link href={z.href} className="inline-flex items-center gap-1.5 outline-none after:absolute after:inset-0 after:rounded-[2rem] after:content-['']">
                    {z.title}
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-ov-600 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                ) : (
                  z.title
                )}
              </h3>
              <p className="mt-2 text-[15.5px] leading-relaxed text-ink-600">{z.text}</p>
            </Reveal>
          ))}
        </ul>
      </Section>

      <Solarpflicht pflicht={w.pflicht} schwellen={w.schwellen} ohne={w.ohne} stand={en ? datumText(STAND, "en") : STAND} land={land} />

      <Bauarten />

      <Laden ac={fEur(CARPORT.ladepunktAc)} dc={fEur(CARPORT.ladepunktDc)} land={land} />

      <Finanzierung
        amortisation={f(beispiel.kauf.amortisation, 0)}
        invest={fEur(Math.round(beispiel.invest.summe / 1000) * 1000)}
        preisCt={f(beispiel.contracting.preisCt, 1)}
        jahre={CARPORT.contractingJahre}
        land={land}
      />

      {/* ---------------- Ablauf ---------------- */}
      <Section tone="sand" space="lg" data-abschnitt="ablauf" aria-labelledby="ablauf-titel">
        <Kopf id="ablauf-titel" eyebrow={w.ablaufKopf.eyebrow} titel={w.ablaufKopf.titel} className="mb-12 md:mb-16" />
        <Ablaufleiste
          items={[
            { icon: Car, ...w.ablauf[0] },
            { icon: Calculator, ...w.ablauf[1] },
            { icon: Warehouse, ...w.ablauf[2] },
            { icon: Zap, ...w.ablauf[3] },
          ]}
        />
      </Section>

      {/* ---------------- FAQ ---------------- */}
      <Section tone="white" space="lg" data-abschnitt="faq" aria-labelledby="faq-titel">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Kopf id="faq-titel" eyebrow={w.faqKopf.eyebrow} titel={w.faqKopf.titel} lead={de ? w.faqKopf.leadDe : w.faqKopf.leadLand} />
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
          { icon: Handshake, text: w.anfrage.zusagen[1] },
          { icon: PlugZap, text: w.anfrage.zusagen[2] },
        ]}
        ablauf={[
          { icon: ClipboardList, ...w.anfrage.ablauf[0] },
          { icon: FileSearch, ...w.anfrage.ablauf[1] },
          { icon: Handshake, ...w.anfrage.ablauf[2] },
        ]}
        formText={w.anfrage.formText}
      >
        <AuswahlAnfrage
          typ="carport"
          felder={["firma", "telefon", "plz", "ort", "nachricht"]}
          button={w.anfrage.button}
          gruppen={uebersetze(
            {
              de: [
                { id: "stellplaetze", legende: "Stellplätze", optionen: [{ id: "bis50", label: "bis 50" }, { id: "50-150", label: "50–150" }, { id: "150-500", label: "150–500" }, { id: "ueber500", label: "über 500" }], start: "50-150" },
                { id: "art", legende: "Sie sind", optionen: [{ id: "unternehmen", label: "Unternehmen" }, { id: "handel", label: "Handel" }, { id: "kommune", label: "Kommune" }, { id: "sonstige", label: "Sonstige" }] },
                { id: "modell", legende: "Interesse an", optionen: [{ id: "offen", label: "Noch offen" }, { id: "kauf", label: "Kauf" }, { id: "contracting", label: "Contracting" }] },
                { id: "laden", legende: "Ladepunkte", mehrfach: true, optionen: [{ id: "ac", label: "AC" }, { id: "dc", label: "DC-Schnellladen" }], start: ["ac"] },
              ],
              en: TEXTE.en.anfrage.gruppen,
            },
            sprache
          )}
        />
      </AnfrageBuehne>

      <Weiterlesen
        text={w.weiter.text}
        items={[
          { href: pfad("/rechner/solarcarport"), icon: Calculator, ...w.weiter.items[0] },
          { href: pfad("/reststrom"), icon: Building2, ...w.weiter.items[1] },
          { href: "/ratgeber/parkplatz-solarpflicht-bundeslaender", icon: BookOpen, ...w.weiter.items[2] },
          { href: pfad("/grossspeicher"), icon: Zap, ...w.weiter.items[3] },
        ]}
      />
    </div>
  );
}

export const generateMetadata = seitenMetadata("/solarcarport", metadata, { en: metadataEn });
