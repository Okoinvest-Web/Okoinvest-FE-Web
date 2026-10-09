// src/app/landwirte/page.js – Landwirte & Agri-PV: die vier Wege
//
// Sprachmodell: feste Texte im Wörterbuch TEXTE (en nur Texte), Länderinhalt AT und CH über inhaltFuerSprache().

import { BatteryCharging, CalendarClock, CloudHail, Compass, Scale, ShieldCheck, Sprout, TrendingUp, Users, Warehouse, Wheat } from "lucide-react";

import Section from "@/components/ui/Section";
import SectionHeading, { Eyebrow } from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import JsonLd from "@/components/JsonLd";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import WegeEntscheider from "@/components/Agri/WegeEntscheider";
import AgriBild from "@/components/Agri/AgriBild";
import { wegeFuer } from "@/components/Agri/wege";
import AgriHero from "@/components/Agri/Seite/AgriHero";
import WegeBuehne from "@/components/Agri/Seite/WegeBuehne";
import WegeKarten from "@/components/Agri/Seite/WegeKarten";
import Faktenleiste from "@/components/Agri/Seite/Faktenleiste";
import Sprungleiste from "@/components/Agri/Seite/Sprungleiste";
import { abs } from "@/data/site";
import { AGRI, PACHT, STAND, STROM } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { inhaltFuerSprache, uebersetze } from "@/lib/sprache/woerterbuch";
import { datumText, fmtZahl } from "@/lib/sprache/format";
import { chTexte } from "@/data/laender/ch/schreibung";

const PFAD = pfad("/landwirte");
const TITEL = "Agri-PV für Landwirte: vier Wege zum Solarstrom | ÖkoInvest";
const BESCHREIBUNG =
  "Fläche verpachten, selbst investieren, Investor baut oder Genossenschaft: die vier Wege zu Agri-PV für Landwirte im Vergleich – mit Entscheidungshilfe.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  alternates: { canonical: abs(PFAD) },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/freiflaeche-begehung.jpg"), width: 1280, height: 852, alt: "Begehung einer landwirtschaftlichen Fläche" }],
  },
};

const ZEILEN = [
  ["Eigene Investition", "invest"],
  ["Einnahmen", "einnahmen"],
  ["Risiko", "risiko"],
  ["Landwirtschaft", "bewirtschaftung"],
  ["Ihr Aufwand", "aufwand"],
  ["Passt für", "fuer"],
];

const GRUENDE = [
  { icon: TrendingUp, title: "Zweites Standbein", text: "Eine feste Pacht fließt jährlich – unabhängig von Ernte und Getreidepreis. Stromerlöse schwanken mit Sonne und Strompreis, aber nicht mit der Ernte." },
  { icon: Scale, title: "Risikostreuung", text: "Strom und Ernte auf derselben Fläche: Fällt eines schwächer aus, trägt das andere. Die Fläche bleibt Ihr Betriebsmittel." },
  { icon: CloudHail, title: "Schutz für Kulturen", text: "Hoch aufgeständerte Module schützen Obst und Beeren vor Hagel, Starkregen und Sonnenbrand; der Boden verdunstet weniger Wasser." },
  { icon: BatteryCharging, title: "Eigenstrom für den Hof", text: "Melktechnik, Kühlung, Lüftung, Trocknung: Bei hofnahen Anlagen kann Solarstrom direkt im Betrieb genutzt werden." },
  { icon: Warehouse, title: "Hofnachfolge stärken", text: "Ein planbares Zusatzeinkommen macht den Betrieb für die nächste Generation attraktiver – ohne die Fläche abzugeben." },
  { icon: Users, title: "Akzeptanz im Dorf", text: "Agri-PV erhält die Landwirtschaft sichtbar. Über eine Energiegenossenschaft könnten Nachbarn und Gemeinde mitverdienen – unsere ist in Vorbereitung." },
];

const SCHRITTE = [
  "Fläche, Kulturen, Maschinenbreiten und Netz – wir prüfen alles vorab",
  "Wir stimmen uns mit Landwirtschaftsamt und Gemeinde ab",
  "Status, Unterlagen und Nachrichten später im Portal",
];

const FAQ = [
  {
    q: "Welcher der vier Wege bringt am meisten?",
    a: "Je Hektar bringt die Pacht für einen klassischen Solarpark meist die höchste feste Zahlung – dafür endet die Bewirtschaftung. Bei Agri-PV ist die Pacht niedriger, Sie ernten aber weiter und behalten den größten Teil der Direktzahlungen. Eine Eigeninvestition hat die höchsten Chancen, aber auch das unternehmerische Risiko. Der Agri-PV-Rechner stellt die Wege mit Ihren Zahlen nebeneinander.",
  },
  {
    q: "Verliere ich mit Agri-PV meine Direktzahlungen?",
    a: `In Deutschland in der Regel nicht vollständig: Flächen mit Agri-PV nach DIN SPEC 91434 bleiben unter Voraussetzungen beihilfefähig, üblicherweise mit einem Abzug für die durch die Anlage nicht nutzbare Fläche – rechnerisch bleiben etwa ${fmt(AGRI.gapFoerderfaehig * 100)} % förderfähig. Maßgeblich sind die aktuellen GAP-Regeln; klären Sie den Einzelfall vorab mit Ihrem Landwirtschaftsamt.`,
  },
  {
    q: "Wie funktioniert die Beteiligung über die Genossenschaft?",
    a: "Die Anlage gehört ganz oder teilweise einer Energiegenossenschaft. Mitglieder zeichnen Anteile und erhalten neben der Pacht gegebenenfalls eine Ausschüttung, deren Höhe von Ertrag und Beschlüssen der Generalversammlung abhängt – eine feste Zusage gibt es nicht, Anteile können an Wert verlieren. Nachbarn und Gemeinde können ebenfalls Mitglied werden. Jedes Mitglied hat in der Regel eine Stimme, unabhängig von der Zahl der Anteile. Wichtig: Unsere Genossenschaft ist in Vorbereitung; Anteile können noch nicht gezeichnet werden.",
  },
  {
    q: "Kann ich den Strom selbst auf dem Hof nutzen?",
    a: `Das hängt vom Anschlusskonzept ab. Liegt die Anlage nah am Hof und gehört Ihnen (Weg B), kann ein Teil des Stroms direkt in Stall, Kühlung oder Trocknung fließen. Land- und forstwirtschaftliche Betriebe profitieren zudem seit 2026 von der auf ${fmt(STROM.stromsteuerProduzierend, 2)} ct/kWh gesenkten Stromsteuer. Bei großen Anlagen wird der Strom meist vollständig eingespeist und direkt vermarktet.`,
  },
  {
    q: "Brauche ich für Agri-PV einen Bebauungsplan?",
    a: `Nicht immer. Agri-PV-Anlagen bis ${fmt(AGRI.privilegierungHa, 1)} ha Grundfläche im räumlich-funktionalen Zusammenhang mit einem landwirtschaftlichen Betrieb sind im Außenbereich privilegiert (§ 35 BauGB) – eine Anlage je Hofstelle. Größere Anlagen brauchen in der Regel einen Bebauungsplan der Gemeinde.`,
  },
  {
    q: "Was bedeutet Agri-PV für Hofnachfolge und Erbschaft?",
    a: "Eine Agri-PV-Anlage kann die Hofnachfolge stärken: Sie bringt ein zweites Einkommen, das nicht von der Ernte abhängt – bei Festpacht weitgehend planbar –, und die Fläche bleibt landwirtschaftlich genutzt. Steuerlich ist Agri-PV oft günstiger zu gestalten als ein klassischer Solarpark, weil die landwirtschaftliche Nutzung erhalten bleibt – die Details sind aber komplex und sollten mit der Steuerberatung geklärt werden.",
  },
];

// ---------------------------------------------------------------------------------------------
// Österreich (Länderinhalt, src/lib/land/inhalte.js). Quellen: § 33 EAG (RIS, abgerufen 04.10.2026 –
// kein Abschlag für Agri-PV); LK Kärnten zu Entnahme/Grundvermögen/Grunderwerbsteuer bei Hofübergabe;
// Regionsdatei Kärnten (Agri-PV ohne eigene Widmung über Intensivobst, Geflügel, Fischzucht).
// Nicht geprüft für AT (→ keine Werte): GAP-Anteil (AMA), Pacht in €, Stromsteuer/Elektrizitätsabgabe für Höfe.
// ---------------------------------------------------------------------------------------------
const FAQ_AT = FAQ.map((f) => {
  if (f.q.startsWith("Welcher der vier Wege"))
    return { q: f.q, a: f.a.replace("und behalten den größten Teil der Direktzahlungen", "und die Fläche bleibt landwirtschaftlich genutzt – in Österreich auch ohne den EAG-Abschlag von 25 %, der für Solarparks auf Acker- und Grünland gilt") };
  if (f.q.startsWith("Verliere ich mit Agri-PV"))
    return {
      q: f.q,
      a: "Das regeln in Österreich die Vorgaben der AMA zum Mehrfachantrag. Entscheidend ist, dass die landwirtschaftliche Nutzung Hauptnutzung bleibt. Welcher Anteil der Fläche förderfähig bleibt, klären wir für Ihr System vorab mit Ihnen und Ihrer Landwirtschaftskammer – eine pauschale Zahl nennen wir dafür bewusst nicht.",
    };
  if (f.q.startsWith("Kann ich den Strom selbst"))
    return { q: f.q, a: "Das hängt vom Anschlusskonzept ab. Liegt die Anlage nah am Hof und gehört Ihnen (Weg B), kann ein Teil des Stroms direkt in Stall, Kühlung oder Trocknung fließen. Über eine Erneuerbare-Energie-Gemeinschaft lässt sich Strom zudem mit Nachbarn und Gemeinde im Nahebereich teilen. Bei großen Anlagen wird der Strom meist vollständig eingespeist und vermarktet." };
  if (f.q.startsWith("Brauche ich für Agri-PV einen Bebauungsplan"))
    return {
      q: "Brauche ich für Agri-PV eine Widmung?",
      a: "In der Regel ja – nach der Raumordnung Ihres Bundeslandes. Manche Länder erleichtern Agri-PV gegenüber reinen Freiflächenanlagen: In Kärnten ist Agri-PV über Intensivobst, Geflügelhaltung oder Fischzucht ohne eigene Widmung möglich. Welche Regeln für Ihre Fläche gelten, prüfen wir mit Gemeinde und Land.",
    };
  if (f.q.startsWith("Was bedeutet Agri-PV für Hofnachfolge"))
    return {
      q: "Was bedeutet Agri-PV für die Hofübergabe?",
      a: "Eine Agri-PV-Anlage kann die Hofnachfolge stärken: Sie bringt ein zweites Einkommen, das nicht von der Ernte abhängt, und die Fläche bleibt landwirtschaftlich genutzt. Bei einem klassischen Solarpark wird die Fläche dagegen meist aus dem land- und forstwirtschaftlichen Betriebsvermögen entnommen und als Grundvermögen bewertet – dann fällt bei der Übergabe Grunderwerbsteuer vom Grundstückswert statt vom Einheitswert an. Klären Sie Ihren Fall mit Steuerberatung und Landwirtschaftskammer.",
    };
  return f;
});

// ---------------------------------------------------------------------------------------------
// Schweiz (QM Ländermodell, Entscheidung 5). Nur geprüfte Aussagen aus src/data/laender/ch/agri-pv.js
// (Art. 24ter Abs. 2 RPG; Direktzahlungen als Position des Schweizer Bauernverbands; Bewilligung durch
// Kanton/Gemeinde). Nicht geprüft für CH (→ keine Werte): Pacht in CHF/€, GAP-Anteil, Stromsteuer für Höfe.
// ---------------------------------------------------------------------------------------------
const FAQ_CH = chTexte(
  FAQ.map((f) => {
    if (f.q.startsWith("Welcher der vier Wege")) return { q: f.q, a: f.a.replace("und behalten den größten Teil der Direktzahlungen", "und die Fläche bleibt landwirtschaftlich genutzt") };
    if (f.q.startsWith("Verliere ich mit Agri-PV"))
      return {
        q: "Verliere ich mit Agri-PV meine Direktzahlungen?",
        a: "Nicht zwingend. Flächen mit Solaranlagen zählen grundsätzlich nicht zur landwirtschaftlichen Nutzfläche. Nach dem Positionspapier des Schweizer Bauernverbands bleiben sie aber beitragsberechtigt, wenn die Anlage als Agri-PV mit Vorteil für die Produktion oder zu Forschungszwecken rechtskräftig bewilligt ist. Klären Sie das vorab mit dem kantonalen Landwirtschaftsamt.",
      };
    if (f.q.startsWith("Kann ich den Strom selbst"))
      return { q: f.q, a: "Das hängt vom Anschlusskonzept ab. Liegt die Anlage nah am Hof und gehört Ihnen (Weg B), kann ein Teil des Stroms direkt in Stall, Kühlung oder Trocknung fliessen. Bei grossen Anlagen wird der Strom meist vollständig eingespeist und vermarktet." };
    if (f.q.startsWith("Brauche ich für Agri-PV einen Bebauungsplan"))
      return {
        q: "Braucht Agri-PV in der Schweiz eine Bewilligung?",
        a: "Ja. Ausserhalb der Bauzone braucht es eine Ausnahmebewilligung des Kantons; das Baugesuch wird bei der Gemeinde eingereicht und öffentlich aufgelegt. Bewilligt wird nur, wenn die Anlage der landwirtschaftlichen Produktion Vorteile bringt oder Versuchs- und Forschungszwecken dient (Art. 24ter Abs. 2 RPG), nach einer umfassenden Interessenabwägung.",
      };
    if (f.q.startsWith("Was bedeutet Agri-PV für Hofnachfolge"))
      return { q: f.q, a: "Eine Agri-PV-Anlage kann die Hofnachfolge stärken: Sie bringt ein zweites Einkommen, das nicht von der Ernte abhängt, und die Fläche bleibt landwirtschaftlich genutzt. Steuerliche Fragen klären Sie mit Ihrer Steuerberatung." };
    return f;
  }),
  "CH"
);

const INHALT_DE = {
  gemeinsam: {
    punkte: ["Nach DIN SPEC 91434", "GAP bleibt größtenteils", "Deutschland, Österreich und Schweiz", "Von der Idee bis zum Betrieb"],
    gapFakt: { icon: ShieldCheck, wert: fmt(AGRI.gapFoerderfaehig * 100), suffix: "%", einheit: "GAP-förderfähig", text: "der Fläche bleiben in Deutschland rechnerisch beihilfefähig" },
    schritte: SCHRITTE,
    faq: FAQ,
    pachtWerte: true,
    tabellenFuss: null,
    agriText: "Systeme nach DIN SPEC 91434, Kulturen, GAP, Baurecht und EEG.",
  },
  AT: {
    punkte: ["Geplant nach DIN SPEC 91434", "Ohne EAG-Abschlag bei Agri-PV", "Österreich, Deutschland und Schweiz", "Von der Idee bis zum Betrieb"],
    gapFakt: { icon: ShieldCheck, wert: "0", suffix: "%", einheit: "EAG-Abschlag", text: "für Agri-PV – statt 25 % für PV auf Acker- und Grünland (§ 33 EAG)" },
    schritte: [SCHRITTE[0], "Wir stimmen uns mit Landwirtschaftskammer, Gemeinde und Land ab", SCHRITTE[2]],
    faq: FAQ_AT,
    pachtWerte: false,
    tabellenFuss: "Pachtwerte für Österreich werden geprüft – Ergebnis auf Anfrage. Die Wege B–D setzen eine Agri-PV-Anlage nach DIN SPEC 91434 voraus. Die Stufen in den Karten fassen diese Tabelle zusammen.",
    agriText: "Systeme nach DIN SPEC 91434, Kulturen, Widmung und EAG.",
  },
  CH: chTexte(
    {
      punkte: ["Geplant nach DIN SPEC 91434", "Vorteil für die Produktion nach Art. 24ter RPG", "Schweiz, Deutschland und Österreich", "Von der Idee bis zum Betrieb"],
      gapFakt: { icon: ShieldCheck, wert: "Abs. 2", einheit: "Art. 24ter RPG", text: "auf Nutzfläche nur mit Vorteil für die Produktion oder zu Forschungszwecken" },
      schritte: [SCHRITTE[0], "Wir stimmen uns mit Gemeinde, Kanton und kantonalem Landwirtschaftsamt ab", SCHRITTE[2]],
      faq: FAQ_CH,
      pachtWerte: false,
      tabellenFuss: "Pachtwerte für die Schweiz werden geprüft – Ergebnis auf Anfrage. Die Wege B–D setzen eine Agri-PV-Anlage nach DIN SPEC 91434 voraus. Die Stufen in den Karten fassen diese Tabelle zusammen.",
      agriText: "Systeme nach DIN SPEC 91434, Kulturen, Art. 24ter RPG und Direktzahlungen.",
    },
    "CH"
  ),
};

// ---------------------------------------------------------------------------------------------
// Englisch (Sprachmodell): inhaltlich identisch, Zahlen im englischen Format
// ---------------------------------------------------------------------------------------------
const z = (n, stellen = 0) => fmtZahl(n, stellen, "en");

const metadataEn = {
  title: "Agrivoltaics for farmers: four routes to solar power | ÖkoInvest",
  description: "Lease your land, invest yourself, an investor builds or a cooperative: the four routes to agrivoltaics for farmers compared – with a decision aid.",
  openGraph: {
    title: "Agrivoltaics for farmers: four routes to solar power | ÖkoInvest",
    description: "Lease your land, invest yourself, an investor builds or a cooperative: the four routes to agrivoltaics for farmers compared – with a decision aid.",
    images: [{ alt: "Site visit to agricultural land" }],
  },
};

const SCHRITTE_EN = [
  "Land, crops, machine widths and grid – we check everything in advance",
  "We coordinate with the agricultural office and the municipality",
  "Status, documents and messages later in the portal",
];

const FAQ_EN = [
  {
    q: "Which of the four routes earns the most?",
    a: "Per hectare, the lease for a conventional solar park usually brings the highest fixed payment – but farming ends. With agrivoltaics the lease is lower, but you keep harvesting and retain most of the direct payments. Investing yourself offers the greatest opportunities, but also the entrepreneurial risk. The agrivoltaics calculator puts the routes side by side with your figures.",
  },
  {
    q: "Will I lose my direct payments with agrivoltaics?",
    a: `In Germany, generally not completely: land with agrivoltaics under DIN SPEC 91434 remains eligible for support subject to conditions, usually with a deduction for the area that cannot be used because of the installation – mathematically, around ${z(AGRI.gapFoerderfaehig * 100)} % remains eligible. The current CAP rules are authoritative; clarify your individual case in advance with your agricultural office.`,
  },
  {
    q: "How does participation through the cooperative work?",
    a: "The installation is wholly or partly owned by an energy cooperative. Members subscribe to shares and, in addition to the lease, may receive a distribution whose amount depends on the yield and on resolutions of the general meeting – there is no fixed promise, and shares can lose value. Neighbours and the municipality can also become members. As a rule, each member has one vote, regardless of the number of shares. Important: our cooperative is in preparation; shares cannot yet be subscribed.",
  },
  {
    q: "Can I use the power on the farm myself?",
    a: `That depends on the connection concept. If the installation is close to the farm and belongs to you (route B), part of the power can flow directly into the barn, cooling or drying. Since 2026, agricultural and forestry businesses have also benefited from electricity tax reduced to ${z(STROM.stromsteuerProduzierend, 2)} ct/kWh. For large installations, the power is usually fed into the grid in full and sold through direct marketing.`,
  },
  {
    q: "Do I need a development plan for agrivoltaics?",
    a: `Not always. Agrivoltaic installations with a footprint of up to ${z(AGRI.privilegierungHa, 1)} ha that are spatially and functionally linked to a farm are privileged in the outer zone (§ 35 BauGB, German Federal Building Code) – one installation per farmstead. Larger installations generally need a development plan (Bebauungsplan) from the municipality.`,
  },
  {
    q: "What does agrivoltaics mean for farm succession and inheritance?",
    a: "An agrivoltaic installation can strengthen farm succession: it brings a second income that does not depend on the harvest – largely predictable with a fixed lease – and the land remains in agricultural use. For tax purposes, agrivoltaics can often be structured more favourably than a conventional solar park because agricultural use is retained – but the details are complex and should be clarified with a tax adviser.",
  },
];

// Österreich auf Englisch: Übersetzung von FAQ_AT (gleiche Quellen, Reihenfolge wie FAQ)
const FAQ_AT_EN = FAQ_EN.map((f, i) => {
  if (i === 0) return { q: f.q, a: f.a.replace("and retain most of the direct payments", "and the land remains in agricultural use – in Austria also without the 25 % EAG reduction that applies to solar parks on arable land and grassland") };
  if (i === 1)
    return {
      q: f.q,
      a: "In Austria, this is governed by the AMA (Agrarmarkt Austria) requirements for the multiple application. What matters is that agricultural use remains the main use. We clarify in advance with you and your chamber of agriculture what share of the land remains eligible for your system – we deliberately do not give a flat figure for this.",
    };
  if (i === 3)
    return { q: f.q, a: "That depends on the connection concept. If the installation is close to the farm and belongs to you (route B), part of the power can flow directly into the barn, cooling or drying. Through a renewable energy community, power can also be shared with neighbours and the municipality nearby. For large installations, the power is usually fed into the grid in full and sold." };
  if (i === 4)
    return {
      q: "Do I need zoning for agrivoltaics?",
      a: "As a rule, yes – under the spatial planning law of your federal state (Widmung). Some states make agrivoltaics easier than pure ground-mounted plants: in Carinthia, agrivoltaics over intensive fruit growing, poultry farming or fish farming is possible without separate zoning. We check with the municipality and the state which rules apply to your land.",
    };
  if (i === 5)
    return {
      q: "What does agrivoltaics mean for the farm handover?",
      a: "An agrivoltaic installation can strengthen farm succession: it brings a second income that does not depend on the harvest, and the land remains in agricultural use. With a conventional solar park, by contrast, the land is usually withdrawn from agricultural and forestry business assets and valued as real property (Grundvermögen) – the handover then incurs real estate transfer tax on the property value instead of the assessed standard value (Einheitswert). Clarify your case with your tax adviser and chamber of agriculture.",
    };
  return f;
});

// Schweiz auf Englisch: Übersetzung von FAQ_CH (gleiche Quellen, Reihenfolge wie FAQ)
const FAQ_CH_EN = FAQ_EN.map((f, i) => {
  if (i === 0) return { q: f.q, a: f.a.replace("and retain most of the direct payments", "and the land remains in agricultural use") };
  if (i === 1)
    return {
      q: f.q,
      a: "Not necessarily. Land with solar installations generally does not count as utilised agricultural area. According to the position paper of the Swiss Farmers' Union, however, it remains eligible if the installation has been approved with legal effect as agrivoltaics with a benefit for production or for research purposes. Clarify this in advance with the cantonal agricultural office.",
    };
  if (i === 3)
    return { q: f.q, a: "That depends on the connection concept. If the installation is close to the farm and belongs to you (route B), part of the power can flow directly into the barn, cooling or drying. For large installations, the power is usually fed into the grid in full and sold." };
  if (i === 4)
    return {
      q: "Does agrivoltaics need a permit in Switzerland?",
      a: "Yes. Outside the building zone, an exceptional permit from the canton is required; the building application is submitted to the municipality and put on public display. It is only granted if the installation benefits agricultural production or serves trial and research purposes (Art. 24ter para. 2 RPG, Swiss Spatial Planning Act), after a comprehensive weighing of interests.",
    };
  if (i === 5)
    return { q: f.q, a: "An agrivoltaic installation can strengthen farm succession: it brings a second income that does not depend on the harvest, and the land remains in agricultural use. Clarify tax questions with your tax adviser." };
  return f;
});

const INHALT = {
  de: INHALT_DE,
  en: {
    gemeinsam: {
      punkte: ["Under DIN SPEC 91434", "CAP largely retained", "Germany, Austria and Switzerland", "From idea to operation"],
      gapFakt: { wert: z(AGRI.gapFoerderfaehig * 100), einheit: "CAP-eligible", text: "of the land remains eligible for support in Germany (mathematically)" },
      schritte: SCHRITTE_EN,
      faq: FAQ_EN,
      agriText: "Systems under DIN SPEC 91434, crops, CAP, building law and EEG.",
    },
    AT: {
      punkte: ["Planned under DIN SPEC 91434", "No EAG reduction for agrivoltaics", "Austria, Germany and Switzerland", "From idea to operation"],
      gapFakt: { wert: "0", einheit: "EAG reduction", text: "for agrivoltaics – instead of 25 % for PV on arable land and grassland (§ 33 EAG)" },
      schritte: [SCHRITTE_EN[0], "We coordinate with the chamber of agriculture, the municipality and the federal state", SCHRITTE_EN[2]],
      faq: FAQ_AT_EN,
      tabellenFuss: "Lease rates for Austria are being reviewed – result on request. Routes B–D require an agrivoltaic installation under DIN SPEC 91434. The levels in the cards summarise this table.",
      agriText: "Systems under DIN SPEC 91434, crops, zoning and EAG.",
    },
    CH: {
      punkte: ["Planned under DIN SPEC 91434", "Benefit for production under Art. 24ter RPG", "Switzerland, Germany and Austria", "From idea to operation"],
      gapFakt: { wert: "Para. 2", einheit: "Art. 24ter RPG", text: "on agricultural land only with a benefit for production or for research purposes" },
      schritte: [SCHRITTE_EN[0], "We coordinate with the municipality, the canton and the cantonal agricultural office", SCHRITTE_EN[2]],
      faq: FAQ_CH_EN,
      tabellenFuss: "Lease rates for Switzerland are being reviewed – result on request. Routes B–D require an agrivoltaic installation under DIN SPEC 91434. The levels in the cards summarise this table.",
      agriText: "Systems under DIN SPEC 91434, crops, Art. 24ter RPG and direct payments.",
    },
  },
};

/** Feste Texte der Seite. en enthält nur Texte; Listen werden je Index zusammengeführt. */
const TEXTE = {
  de: {
    zeilen: ZEILEN,
    gruende: GRUENDE,
    jsonLd: { name: "Agri-PV und Solarprojekte für landwirtschaftliche Betriebe", audience: "Landwirtinnen und Landwirte", description: BESCHREIBUNG },
    hero: {
      brotkrumen: "Für Landwirte",
      pill: { marke: "Tipp", text: "Entscheidungshilfe: Welcher Weg passt zu Ihrem Betrieb?", textKurz: "Welcher Weg passt zu Ihnen?" },
      titelA: "Agri-PV: Die Ernte bleibt. ",
      titelB: "Strom kommt dazu.",
      lead: "Agri-PV macht Ihre Fläche zum zweiten Standbein – ohne die Landwirtschaft aufzugeben. Verpachten, selbst investieren, einen Investor bauen lassen oder über eine Genossenschaft mitverdienen (unsere ist in Vorbereitung): Sie wählen den Weg, wir setzen ihn um.",
      aktionen: ["Welcher Weg passt?", "Agri-PV-Rechner"],
      unterzeile: "Für Landwirte kostenfrei · fünf Fragen, eine Empfehlung mit Begründung",
      bildAlt: "Begehung einer landwirtschaftlichen Fläche mit Photovoltaik",
      notiz: { marke: "Wege B–D", titel: "Sie ernten weiter", text: "auf rund 85–90 % der Fläche" },
    },
    faktenTitel: "Agri-PV für Landwirte: Richtwerte",
    fakten: [
      { einheit: "Wege", text: "Verpachten, selbst investieren, Investor oder Genossenschaft" },
      { einheit: "Fläche bewirtschaftet", text: "bei Agri-PV (Wege B–D) bleibt der Großteil in Ihrer Hand" },
      { suffix: "Jahre", einheit: "Laufendes Einkommen", text: "aus Pacht oder Strom – unabhängig von der Ernte, Stromerlöse aber abhängig von Sonne und Strompreis" },
    ],
    sprung: ["Die vier Wege", "Vergleich", "Warum Agri-PV", "Entscheidungshilfe", "Anfrage", "Fragen"],
    wege: { eyebrow: "Die vier Wege", titel: "Vier Wege – ein Ziel: Ihr Hof verdient mit.", lead: "Jeder Weg hat seine Stärken. Viele Betriebe kombinieren sie auch – etwa eine Fläche verpachten und bei einer anderen über die Genossenschaft einsteigen." },
    vergleich: {
      titel: "Die Wege im direkten Vergleich",
      stand: `Orientierungswerte DACH, Stand ${STAND}`,
      caption: "Die vier Wege im Vergleich",
      merkmal: "Merkmal",
      richtwert: "Richtwert Pacht",
      pachtFrei: `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €/ha`,
      pachtAgri: `${fmt(PACHT.agriProHa.min)}–${fmt(PACHT.agriProHa.max)} €/ha`,
      ausschuettung: " + Ausschüttung",
      nachPruefung: "nach Prüfung",
      entfaellt: "entfällt – Erlöse aus Strom",
      wischen: "Tabelle seitlich wischen, um alle Wege zu sehen.",
      fuss: `Orientierungswerte DACH, Stand ${STAND}. Die Wege B–D setzen eine Agri-PV-Anlage nach DIN SPEC 91434 voraus. Die Stufen in den Karten fassen diese Tabelle zusammen.`,
    },
    warum: {
      eyebrow: "Warum Agri-PV",
      titel: "Ein zweites Standbein neben der Ernte.",
      lead: "Ernte, Preise und Auflagen machen die Landwirtschaft schwer planbar. Strom aus der eigenen Fläche bringt über die Laufzeit ein zweites Einkommen: Eine feste Pacht ist davon unabhängig, Stromerlöse hängen von Einstrahlung und Strompreis ab – aber nicht von Ernte und Getreidepreis.",
      bild: "Im Bild: hoch aufgeständert, Bewirtschaftung unter den Modulen",
    },
    entscheider: {
      eyebrow: "Entscheidungshilfe",
      titel: "Welcher Weg passt zu Ihrem Betrieb?",
      lead: "Fünf Fragen, eine Empfehlung mit Begründung. Dauert keine Minute – und ersetzt nicht das Gespräch, bereitet es aber gut vor.",
      themen: ["Bewirtschaftung & Fläche", "Kapital & Risiko", "Zeit & Ziele"],
    },
    anfrage: {
      eyebrow: "Kostenlos & unverbindlich",
      titel: "Sprechen wir über Ihren Hof.",
      lead: "Erzählen Sie uns von Fläche, Kulturen und Zielen. Wir melden uns mit einer ersten Einschätzung, welche Wege für Sie realistisch sind – und rechnen sie gemeinsam mit Ihnen durch. Offen gesagt: Wir sind selbst Projektentwickler; das Gespräch kostet Sie nichts, weil wir an gemeinsamen Projekten verdienen.",
      formTitel: "Ihr Betrieb",
      formText: "Gern mit Angaben zu Fläche (ha), Kulturen und dem Weg, der Sie interessiert.",
      button: "Anfrage senden",
    },
    faqKopf: { eyebrow: "Häufige Fragen", titel: "Was Landwirte uns fragen", lead: "Ihre Frage ist nicht dabei? Schreiben Sie uns – wir antworten persönlich." },
    weiter: "Weiter für Ihren Betrieb",
    querverweise: [
      { titel: "Agri-PV im Detail" },
      { titel: "Agri-PV-Rechner", text: "Pacht, Eigeninvestition und Genossenschaft mit Ihren Zahlen." },
      { titel: "Genossenschaft", text: "Wie die Beteiligung als Mitglied funktioniert." },
      { titel: "Fläche verpachten", text: "Pachtmodelle und Vertragsinhalte für klassische Solarparks." },
      { titel: "Agri-PV Wirtschaftlichkeit", text: "Kosten, Erlöse und Rendite vertikaler und hoher Anlagen." },
      { titel: "Steuern für Landwirte mit PV", text: "Was bei Pacht und eigener Anlage steuerlich gilt." },
    ],
    cta: {
      eyebrow: "Für Landwirte kostenfrei",
      titel: "Ihr Hof, Ihr Weg – wir rechnen ihn durch.",
      text: "Ob Pacht, eigene Anlage oder später die Genossenschaft: Wir zeigen Ihnen die Zahlen für Ihre Fläche und begleiten Sie von der Idee bis zum Betrieb. Wir sind selbst Projektentwickler – kostenfrei ist das für Sie, weil wir an gemeinsamen Projekten verdienen.",
      primaer: "Agri-PV-Rechner",
      sekundaer: "Fläche prüfen",
    },
  },
  en: {
    zeilen: [["Own investment"], ["Income"], ["Risk"], ["Farming"], ["Your effort"], ["Suits"]],
    gruende: [
      { title: "A second pillar", text: "A fixed lease is paid every year – regardless of the harvest and grain prices. Power revenue fluctuates with sunshine and power prices, but not with the harvest." },
      { title: "Spreading risk", text: "Power and crops on the same land: if one is weaker, the other carries it. The land remains your means of production." },
      { title: "Protection for crops", text: "Elevated modules protect fruit and berries from hail, heavy rain and sunburn; the soil loses less water through evaporation." },
      { title: "Own power for the farm", text: "Milking equipment, cooling, ventilation, drying: with installations close to the farm, solar power can be used directly on the farm." },
      { title: "Strengthening farm succession", text: "A predictable additional income makes the farm more attractive for the next generation – without giving up the land." },
      { title: "Acceptance in the village", text: "Agrivoltaics visibly keeps farming going. Through an energy cooperative, neighbours and the municipality could share in the earnings – ours is in preparation." },
    ],
    jsonLd: { name: "Agrivoltaics and solar projects for farms", audience: "Farmers", description: metadataEn.description },
    hero: {
      brotkrumen: "For farmers",
      pill: { marke: "Tip", text: "Decision aid: which route suits your farm?", textKurz: "Which route suits you?" },
      titelA: "Agrivoltaics: the harvest stays. ",
      titelB: "Power comes on top.",
      lead: "Agrivoltaics turns your land into a second pillar – without giving up farming. Lease, invest yourself, let an investor build or share in the earnings through a cooperative (ours is in preparation): you choose the route, we make it happen.",
      aktionen: ["Which route suits you?", "Agrivoltaics calculator"],
      unterzeile: "Free of charge for farmers · five questions, one recommendation with reasons",
      bildAlt: "Site visit to agricultural land with photovoltaics",
      notiz: { marke: "Routes B–D", titel: "You keep harvesting", text: "on around 85–90 % of the land" },
    },
    faktenTitel: "Agrivoltaics for farmers: guide values",
    fakten: [
      { einheit: "Routes", text: "Lease, invest yourself, investor or cooperative" },
      { einheit: "Land farmed", text: "with agrivoltaics (routes B–D), most of it stays in your hands" },
      { suffix: "years", einheit: "Ongoing income", text: "from lease or power – independent of the harvest, although power revenue depends on sunshine and power prices" },
    ],
    sprung: ["The four routes", "Comparison", "Why agrivoltaics", "Decision aid", "Enquiry", "Questions"],
    wege: { eyebrow: "The four routes", titel: "Four routes – one goal: your farm earns too.", lead: "Each route has its strengths. Many farms also combine them – for example leasing one plot and joining the cooperative with another." },
    vergleich: {
      titel: "The routes compared directly",
      stand: `Guide values for the DACH region, as of ${datumText(STAND, "en")}`,
      caption: "The four routes compared",
      merkmal: "Feature",
      richtwert: "Guide lease",
      pachtFrei: `€${z(PACHT.freiflaecheProHa.min)}–${z(PACHT.freiflaecheProHa.max)}/ha`,
      pachtAgri: `€${z(PACHT.agriProHa.min)}–${z(PACHT.agriProHa.max)}/ha`,
      ausschuettung: " + distribution",
      nachPruefung: "after assessment",
      entfaellt: "none – revenue from power",
      wischen: "Swipe the table sideways to see all routes.",
      fuss: `Guide values for the DACH region, as of ${datumText(STAND, "en")}. Routes B–D require an agrivoltaic installation under DIN SPEC 91434. The levels in the cards summarise this table.`,
    },
    warum: {
      eyebrow: "Why agrivoltaics",
      titel: "A second pillar alongside the harvest.",
      lead: "Harvests, prices and regulations make farming hard to plan. Power from your own land brings a second income over the term: a fixed lease is independent of all this; power revenue depends on irradiation and power prices – but not on the harvest or grain prices.",
      bild: "Pictured: elevated, farming underneath the modules",
    },
    entscheider: {
      eyebrow: "Decision aid",
      titel: "Which route suits your farm?",
      lead: "Five questions, one recommendation with reasons. Takes less than a minute – it does not replace a conversation, but prepares it well.",
      themen: ["Farming & land", "Capital & risk", "Time & goals"],
    },
    anfrage: {
      eyebrow: "Free of charge & without obligation",
      titel: "Let’s talk about your farm.",
      lead: "Tell us about your land, crops and goals. We will get back to you with an initial assessment of which routes are realistic for you – and work through the figures with you. To be open: we are project developers ourselves; the conversation costs you nothing because we earn from joint projects.",
      formTitel: "Your farm",
      formText: "Ideally with details of the land (ha), crops and the route you are interested in.",
      button: "Send enquiry",
    },
    faqKopf: { eyebrow: "Frequently asked questions", titel: "What farmers ask us", lead: "Your question is not listed? Write to us – we will reply personally." },
    weiter: "Next steps for your farm",
    querverweise: [
      { titel: "Agrivoltaics in detail" },
      { titel: "Agrivoltaics calculator", text: "Lease, own investment and cooperative with your figures." },
      { titel: "Cooperative", text: "How participation as a member works." },
      { titel: "Lease your land", text: "Lease models and contract terms for conventional solar parks." },
      { titel: "Agrivoltaics economics", text: "Costs, revenue and returns of vertical and elevated installations." },
      { titel: "Tax for farmers with PV", text: "What applies for tax purposes with a lease or your own installation." },
    ],
    cta: {
      eyebrow: "Free of charge for farmers",
      titel: "Your farm, your route – we work out the figures.",
      text: "Whether a lease, your own installation or later the cooperative: we show you the figures for your land and support you from the idea to operation. We are project developers ourselves – it is free of charge for you because we earn from joint projects.",
      primaer: "Agrivoltaics calculator",
      sekundaer: "Check your land",
    },
  },
};

export default async function LandwirtePage({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const w = uebersetze(TEXTE, sprache);
  const WEGE = wegeFuer(sprache);
  const t = inhaltFuerSprache(INHALT, land, sprache);
  return (
    <div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: w.jsonLd.name,
          provider: { "@id": `${abs("/")}/#organization` },
          areaServed: ["DE", "AT", "CH"],
          audience: { "@type": "Audience", audienceType: w.jsonLd.audience },
          url: abs(PFAD),
          description: w.jsonLd.description,
        }}
      />

      <AgriHero
        breadcrumbs={[{ name: w.hero.brotkrumen }]}
        pill={{ href: "#entscheider", ...w.hero.pill }}
        titel={
          <>
            {w.hero.titelA}<span className="ov-text-gradient-light">{w.hero.titelB}</span>
          </>
        }
        lead={w.hero.lead}
        aktionen={[
          { label: w.hero.aktionen[0], href: "#entscheider" },
          { label: w.hero.aktionen[1], href: pfad("/rechner/agri-pv") },
        ]}
        unterzeile={w.hero.unterzeile}
        punkte={t.punkte}
        buehne={
          <WegeBuehne
            bild={{ src: "/img/freiflaeche-begehung.jpg", alt: w.hero.bildAlt, position: "center 55%" }}
            notiz={w.hero.notiz}
          />
        }
      />

      <Faktenleiste
        titel={w.faktenTitel}
        fakten={[
          { icon: Compass, wert: "4", ...w.fakten[0] },
          { icon: Wheat, wert: "85–90", suffix: "%", ...w.fakten[1] },
          t.gapFakt,
          { icon: CalendarClock, wert: "30", ...w.fakten[2] },
        ]}
      />

      <Sprungleiste
        ziele={[
          { href: "#wege", label: w.sprung[0] },
          { href: "#vergleich", label: w.sprung[1] },
          { href: "#warum", label: w.sprung[2] },
          { href: "#entscheider", label: w.sprung[3] },
          { href: "#anfrage", label: w.sprung[4] },
          { href: "#fragen", label: w.sprung[5] },
        ]}
      />

      {/* Vier Wege */}
      <Section tone="white" space="lg" id="wege" className="scroll-mt-24">
        <div className="mb-10 grid gap-x-16 gap-y-6 md:mb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <SectionHeading eyebrow={w.wege.eyebrow} title={w.wege.titel} />
          <Reveal delay={80}>
            <p className="ov-lead text-pretty text-ink-600">{w.wege.lead}</p>
          </Reveal>
        </div>
        <WegeKarten />

        {/* Vergleichstabelle */}
        <div id="vergleich" className="scroll-mt-24 pt-16 md:pt-20">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
            <h3 className="ov-h3 text-ink-900">{w.vergleich.titel}</h3>
            <p className="text-[14px] text-ink-500">{w.vergleich.stand}</p>
          </div>
          <Reveal className="overflow-hidden rounded-[1.75rem] bg-white shadow-e2 ring-1 ring-ink-200/70">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left text-[14.5px]">
                <caption className="sr-only">{w.vergleich.caption}</caption>
                <thead>
                  <tr className="bg-navy-950 text-white">
                    <th scope="col" className="w-[15%] px-5 py-4 font-semibold">
                      <span className="sr-only">{w.vergleich.merkmal}</span>
                    </th>
                    {WEGE.map((weg) => (
                      <th key={weg.id} scope="col" className="px-5 py-4 align-bottom font-display text-[15.5px] font-bold">
                        <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-ov-400/20 text-[13px] text-ov-300 ring-1 ring-inset ring-ov-300/30">{weg.buchstabe}</span>
                        {weg.titel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {w.zeilen.map(([label, key], i) => (
                    <tr key={key} className={i % 2 ? "bg-sand-50" : "bg-white"}>
                      <th scope="row" className="sticky left-0 bg-inherit px-5 py-3.5 align-top font-semibold text-ink-800">
                        {label}
                      </th>
                      {WEGE.map((weg) => (
                        <td key={weg.id} className="px-5 py-3.5 align-top leading-snug text-ink-600">
                          {weg[key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-ov-50">
                    <th scope="row" className="sticky left-0 bg-inherit px-5 py-4 align-top font-semibold text-ov-800">
                      {w.vergleich.richtwert}
                    </th>
                    <td className="ov-num px-5 py-4 align-top font-semibold text-ink-900">
                      {t.pachtWerte ? w.vergleich.pachtFrei : w.vergleich.nachPruefung}
                    </td>
                    <td className="px-5 py-4 align-top text-ink-600">{w.vergleich.entfaellt}</td>
                    <td className="ov-num px-5 py-4 align-top font-semibold text-ink-900">
                      {t.pachtWerte ? w.vergleich.pachtAgri : w.vergleich.nachPruefung}
                    </td>
                    <td className="ov-num px-5 py-4 align-top font-semibold text-ink-900">
                      {(t.pachtWerte ? w.vergleich.pachtAgri : w.vergleich.nachPruefung) + w.vergleich.ausschuettung}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Reveal>
          <p className="mt-3 text-[12.5px] text-ink-500 md:hidden">{w.vergleich.wischen}</p>
          <p className="mt-4 text-[13px] text-ink-500">{t.tabellenFuss ?? w.vergleich.fuss}</p>
        </div>
      </Section>

      {/* Warum Agri-PV */}
      <Section tone="green" space="lg" id="warum" className="scroll-mt-24 overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg-light absolute inset-0 opacity-60" />
        <div className="relative">
          <div className="mb-10 grid gap-x-16 gap-y-6 md:mb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
            <SectionHeading eyebrow={w.warum.eyebrow} title={w.warum.titel} />
            <Reveal delay={80}>
              <p className="ov-lead text-pretty text-ink-600">{w.warum.lead}</p>
            </Reveal>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Reveal className="ov-noise relative flex flex-col overflow-hidden rounded-[1.75rem] bg-navy-950 text-white lg:row-span-2">
              <div className="relative min-h-[13rem] flex-1 bg-navy-50">
                <AgriBild typ="hoch" fuellen className="absolute inset-0 block h-full w-full" />
              </div>
              <div className="relative flex flex-col p-6 md:p-7">
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-ov-500/25 blur-3xl" />
                <span aria-hidden="true" className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-400/15 text-ov-300 ring-1 ring-inset ring-ov-300/30">
                  <TrendingUp className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <h3 className="relative mt-5 font-display text-[21px] font-bold tracking-[-0.01em]">{w.gruende[0].title}</h3>
                <p className="relative mt-2 text-pretty text-[15px] leading-relaxed text-white/75">{w.gruende[0].text}</p>
                <p className="relative mt-5 text-[13px] text-white/60">{w.warum.bild}</p>
              </div>
            </Reveal>
            <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
              {w.gruende.slice(1).map((g, i) => (
                <Reveal as="li" key={i} delay={(i % 2) * 70} className={i === 4 ? "sm:col-span-2" : undefined}>
                  <div className="flex h-full gap-4 rounded-[1.5rem] bg-white p-6 shadow-e1 ring-1 ring-ov-100">
                    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200">
                      <g.icon className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <div>
                      <h3 className="font-display text-[17.5px] font-bold text-ink-900">{g.title}</h3>
                      <p className="mt-1.5 text-pretty text-[14.5px] leading-relaxed text-ink-600">{g.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Entscheider */}
      <section id="entscheider" data-abschnitt="entscheider" aria-labelledby="entscheider-titel" className="ov-verlauf-nacht ov-noise relative isolate scroll-mt-24 overflow-hidden py-20 text-white md:py-32">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-60" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-1/3 -z-10 h-[460px] w-[460px] rounded-full bg-ov-500/20 blur-[120px]" />
        <div className="ov-container">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-14">
            <Reveal>
              <Eyebrow dark className="mb-4">
                {w.entscheider.eyebrow}
              </Eyebrow>
              <h2 id="entscheider-titel" className="ov-h2 text-balance text-white">
                {w.entscheider.titel}
              </h2>
              <p className="ov-lead mt-5 text-pretty text-white/70">{w.entscheider.lead}</p>
              <ol className="mt-8 space-y-3">
                {w.entscheider.themen.map((t, i) => (
                  <li key={t} className="flex items-center gap-3 text-[15px] text-white/85">
                    <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[12px] font-bold text-ov-300 ring-1 ring-inset ring-white/15">
                      {i + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
            </Reveal>
            <Reveal delay={100} className="text-ink-900">
              <WegeEntscheider />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Anfrage */}
      <Section tone="sand" space="lg" id="anfrage" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow={w.anfrage.eyebrow}
              title={w.anfrage.titel}
              lead={w.anfrage.lead}
            />
            <ol className="relative mt-10 space-y-6 before:absolute before:bottom-5 before:left-[19px] before:top-5 before:w-px before:bg-ov-200">
              {t.schritte.map((schritt, i) => (
                <li key={schritt} className="relative flex items-start gap-4 text-[15.5px] leading-snug text-ink-700">
                  <span aria-hidden="true" className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white font-display text-[14px] font-bold text-ov-700 shadow-e1 ring-1 ring-ov-200">
                    {i === SCHRITTE.length - 1 ? <Sprout className="h-4 w-4" /> : String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="pt-2.5">{schritt}</span>
                </li>
              ))}
            </ol>
          </div>
          <Reveal className="rounded-[2rem] bg-white p-6 shadow-e3 ring-1 ring-ink-200/70 md:p-9">
            <AnfrageFormular
              typ="agri"
              daten={{ quelle: "landwirte" }}
              felder={["firma", "telefon", "plz", "ort", "land", "nachricht"]}
              titel={w.anfrage.formTitel}
              text={w.anfrage.formText}
              button={w.anfrage.button}
              rolle="landwirt"
            />
          </Reveal>
        </div>
      </Section>

      <Section tone="white" space="lg" id="fragen" className="scroll-mt-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow={w.faqKopf.eyebrow} title={w.faqKopf.titel} lead={w.faqKopf.lead} />
          <Faq items={t.faq} />
        </div>
      </Section>

      <Querverweise
        ueberschrift={w.weiter}
        items={[
          { href: pfad("/agri-pv"), titel: w.querverweise[0].titel, text: t.agriText },
          { href: pfad("/rechner/agri-pv"), ...w.querverweise[1] },
          { href: pfad("/genossenschaft"), ...w.querverweise[2] },
          { href: pfad("/flaeche-verpachten"), ...w.querverweise[3] },
          { href: "/ratgeber/agri-pv-wirtschaftlichkeit", ...w.querverweise[4] },
          { href: "/ratgeber/photovoltaik-landwirt-steuern", ...w.querverweise[5] },
        ]}
      />

      <CtaBand
        eyebrow={w.cta.eyebrow}
        title={w.cta.titel}
        text={w.cta.text}
        primary={{ label: w.cta.primaer, href: pfad("/rechner/agri-pv") }}
        secondary={{ label: w.cta.sekundaer, href: pfad("/flaechencheck") }}
      />
    </div>
  );
}

export const generateMetadata = seitenMetadata("/landwirte", metadata, { en: metadataEn });
