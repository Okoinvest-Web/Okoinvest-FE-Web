// energie-live/page.js – Strommarkt live (Land der Seite: DE-LU, AT oder CH; gemeinsame Seite = DE-LU)

import { Activity, AlertTriangle, BatteryCharging, Clock, Database, ExternalLink, Scale, Sun } from "lucide-react";
import Hero from "@/components/EnergieLive/Seite/Hero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import LiveKennzahlen from "@/components/EnergieLive/LiveKennzahlen";
import PreisChart from "@/components/EnergieLive/PreisChart";
import ErzeugungChart from "@/components/EnergieLive/ErzeugungChart";
import Empfehlungen from "@/components/EnergieLive/Empfehlungen";
import MeritOrder from "@/components/EnergieLive/MeritOrder";
import CaptureRate from "@/components/EnergieLive/CaptureRate";
import { abs } from "@/data/site";
import { getEnergySnapshot } from "@/lib/energy";
import { preisTage, zeitfenster, ct, formate, markt } from "@/components/EnergieLive/berechnung";
import JsonLd from "@/components/JsonLd";
import { pfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage, landDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";

// Schweiz (/ch, /en/ch): fest geschriebene Texte ohne „ß“ (W3-0, src/components/Land/SchweizerSchreibweise.js)
const chBaum = (el) => schreibweiseBaum(el, landDerAnfrage());

// Geprüft am 04.10.2026 an der Quelle: Seit 1. Oktober 2018 sind Deutschland(-Luxemburg) und Österreich getrennte
// Gebotszonen (E-Control, Presseaussendung „Trennung der deutsch-österreichischen Strompreiszone“, 2018); die Schweiz
// ist nicht Teil der europäischen Day-Ahead-Marktkopplung (SDAC) und hat eine eigene lokale Day-Ahead-Auktion bei
// EPEX SPOT (epexspot.com, „Trading at EPEX SPOT“). Ergänzt 11.10.2026 per Probeabruf an der Datenquelle
// (api.energy-charts.info): /price?bzn=AT liefert 96 Viertelstundenwerte je Tag, /price?bzn=CH 24 Stundenwerte,
// beide in EUR/MWh – die Schweizer Auktion notiert in Euro. Seit der Länderwahl zeigt die Seite die Daten des
// gewählten Landes; die gemeinsame Seite (ohne Wahl) weiterhin DE-LU.
const FAQ_LAND = {
  AT: {
    q: "Gilt der Börsenpreis auf dieser Seite für Österreich?",
    a: "Ja. Seit dem 1. Oktober 2018 bilden Deutschland-Luxemburg und Österreich getrennte Gebotszonen; Österreich hat einen eigenen Day-Ahead-Preis. Diese Seite zeigt die Preise der österreichischen Gebotszone (AT) – nicht die deutschen Werte.",
  },
  CH: {
    q: "Gilt der Börsenpreis auf dieser Seite für die Schweiz?",
    a: "Ja. Die Schweiz ist nicht Teil der europäischen Day-Ahead-Marktkopplung und hat eine eigene Day-Ahead-Auktion bei EPEX SPOT. Diese Seite zeigt die Schweizer Day-Ahead-Preise; die Auktion wird stündlich gehandelt und notiert in Euro – nicht in Franken.",
  },
};

const FAQ_LAND_EN = {
  AT: {
    q: "Does the exchange price on this page apply to Austria?",
    a: "Yes. Since 1 October 2018, Germany-Luxembourg and Austria have formed separate bidding zones; Austria has its own day-ahead price. This page shows the prices of the Austrian bidding zone (AT) – not the German figures.",
  },
  CH: {
    q: "Does the exchange price on this page apply to Switzerland?",
    a: "Yes. Switzerland is not part of European day-ahead market coupling and has its own day-ahead auction at EPEX SPOT. This page shows the Swiss day-ahead prices; the auction is traded hourly and is denominated in euros – not in Swiss francs.",
  },
};

export const revalidate = 900;

const PAGE_URL = abs(pfad("/energie-live"));
const OG_BILD = abs("/img/solarpark-himmel.jpg");

async function basisMetadata(land, p) {
  const en = p?.sprache === "en";
  if (en) return metadataEn(land);
  const m = markt(land);
  const anders = land === "AT" || land === "CH";
  const aufl = land === "CH" ? "Stundenwerten" : "15-Minuten-Werten";
  const title = anders
    ? `Strompreis Börse ${m.name} live: Day-Ahead & Capture-Rate | ÖkoInvest`
    : "Strompreis Börse live: Day-Ahead & Capture-Rate | ÖkoInvest";
  let description = anders
    ? `Börsenstrompreis ${m.name} live: Day-Ahead-Preis (Gebotszone ${m.zone}) in ${aufl}, Solar-Capture-Rate, negative Preise und Strommix – eingeordnet für Unternehmen und Investoren.`
    : "Börsenstrompreis live: Day-Ahead-Preis in 15-Minuten-Werten, Solar-Capture-Rate, negative Preise und Strommix – eingeordnet für Unternehmen und Investoren.";
  try {
    const s = await getEnergySnapshot(land || "DE");
    const a = s.preis.aktuell;
    if (a) {
      description = anders
        ? `Börsenstrompreis ${m.name} jetzt ${ct(a.eurMwh)} ct/kWh. Day-Ahead in ${aufl}, Solar-Capture-Rate, negative Preise und Strommix für Unternehmen und Investoren.`
        : `Börsenstrompreis jetzt ${ct(a.eurMwh)} ct/kWh. Day-Ahead in 15-Minuten-Werten, Solar-Capture-Rate, negative Preise und Strommix für Unternehmen und Investoren.`;
    }
  } catch {
    // statische Beschreibung genügt
  }
  return {
    title,
    description,
    keywords: [
      "Strompreis Börse aktuell",
      "Day-Ahead Preis heute",
      "Börsenstrompreis",
      "Strompreis live",
      "negative Strompreise",
      "EPEX Spot Preis",
      "Solar Capture Rate",
      "Capture Price Solar",
      "Strommix Deutschland",
    ],
    alternates: { canonical: PAGE_URL },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "de_DE",
      url: PAGE_URL,
      siteName: "ÖkoInvest",
      title: `Strommarkt ${m.name} live – Börsenstrompreis & Strommix`,
      description,
      images: [{ url: OG_BILD, width: 1280, height: 852, alt: "ÖkoInvest – Strommarkt live" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_BILD] },
  };
}

/** Englische Metadaten (Sprachmodell) */
async function metadataEn(land = null) {
  const { ct: ctEn } = formate("en");
  const m = markt(land);
  const anders = land === "AT" || land === "CH";
  const auflEn = land === "CH" ? "hourly values" : "15-minute values";
  const title = anders
    ? `Live power exchange price ${m.nameEn}: day-ahead & capture rate | ÖkoInvest`
    : "Live power exchange price: day-ahead & capture rate | ÖkoInvest";
  let description = anders
    ? `Live power exchange price for ${m.nameEn} (bidding zone ${m.zone}): day-ahead price in ${auflEn}, solar capture rate, negative prices and power mix – put into context for companies and investors.`
    : "Live power exchange price: day-ahead price in 15-minute values, solar capture rate, negative prices and power mix – put into context for companies and investors.";
  try {
    const s = await getEnergySnapshot(land || "DE");
    const a = s.preis.aktuell;
    if (a) {
      description = anders
        ? `Power exchange price in ${m.nameEn} now ${ctEn(a.eurMwh)} ct/kWh. Day-ahead in ${auflEn}, solar capture rate, negative prices and power mix for companies and investors.`
        : `Power exchange price now ${ctEn(a.eurMwh)} ct/kWh. Day-ahead in 15-minute values, solar capture rate, negative prices and power mix for companies and investors.`;
    }
  } catch {
    // statische Beschreibung genügt
  }
  return {
    title,
    description,
    keywords: ["power exchange price today", "day-ahead price today", "wholesale electricity price Germany", "live electricity price", "negative electricity prices", "EPEX Spot price", "solar capture rate", "solar capture price", "German power mix"],
    alternates: { canonical: PAGE_URL },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "en_GB",
      url: PAGE_URL,
      siteName: "ÖkoInvest",
      title: `${land === "AT" ? "Austrian" : land === "CH" ? "Swiss" : "German"} power market live – exchange price & power mix`,
      description,
      images: [{ url: OG_BILD, width: 1280, height: 852, alt: "ÖkoInvest – power market live" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_BILD] },
  };
}

const FAQ = [
  {
    q: "Was ist der Day-Ahead-Preis?",
    a: "Der Day-Ahead-Preis ist der Großhandelspreis für Strom, der am Vortag in einer Auktion an der Strombörse (EPEX Spot) für jede Viertelstunde des Folgetages ermittelt wird. Die Ergebnisse für Deutschland und Luxemburg (Gebotszone DE-LU) werden gegen 13 Uhr veröffentlicht. Seit Oktober 2025 wird der Day-Ahead-Markt in 15-Minuten-Produkten gehandelt.",
    AT: {
      a: "Der Day-Ahead-Preis ist der Großhandelspreis für Strom, der am Vortag in einer Auktion an der Strombörse (EPEX Spot) für jede Viertelstunde des Folgetages ermittelt wird. Österreich ist seit dem 1. Oktober 2018 eine eigene Gebotszone (AT); die Ergebnisse werden gegen 13 Uhr veröffentlicht. Seit Oktober 2025 wird der Day-Ahead-Markt in 15-Minuten-Produkten gehandelt.",
    },
    CH: {
      a: "Der Day-Ahead-Preis ist der Großhandelspreis für Strom, der am Vortag in einer Auktion an der Strombörse ermittelt wird. Die Schweiz hat eine eigene Day-Ahead-Auktion bei EPEX SPOT: Sie wird stündlich gehandelt, notiert in Euro, und die Ergebnisse werden gegen Mittag veröffentlicht.",
    },
  },
  {
    q: "Was zahlt ein Unternehmen im Vergleich zum Börsenpreis?",
    a: "Der Börsenpreis ist nur ein Teil des Gewerbestrompreises. Hinzu kommen Strukturierungs- und Vertriebskosten des Lieferanten, Netzentgelte, Umlagen, Konzessionsabgabe und Stromsteuer. Die meisten Betriebe haben einen Festpreis, der Monate im Voraus am Terminmarkt beschafft wurde – die Schwankungen der Day-Ahead-Preise kommen dann nur indirekt über den nächsten Vertrag an.",
    nurDE: "Preisbestandteile",
  },
  {
    q: "Was ist die Solar-Capture-Rate?",
    a: "Die Capture-Rate setzt den durchschnittlichen Börsenerlös von Solarstrom (Capture-Preis, gewichtet mit der Einspeisung) ins Verhältnis zum Tagesdurchschnitt aller Viertelstunden (Base). Weil viele Solaranlagen gleichzeitig einspeisen, liegt der Capture-Preis im Sommer oft deutlich unter dem Base-Preis. Für ungeförderte Solarparks ist sie eine der wichtigsten Kennzahlen.",
    CH: {
      a: "Die Capture-Rate setzt den durchschnittlichen Börsenerlös von Solarstrom (Capture-Preis, gewichtet mit der Einspeisung) ins Verhältnis zum Tagesdurchschnitt aller Handelsstunden (Base). Weil viele Solaranlagen gleichzeitig einspeisen, liegt der Capture-Preis im Sommer oft deutlich unter dem Base-Preis. Für ungeförderte Solarparks ist sie eine der wichtigsten Kennzahlen.",
    },
  },
  {
    q: "Warum gibt es negative Strompreise?",
    a: "Negative Preise entstehen, wenn mehr Strom angeboten als nachgefragt wird – typischerweise an sonnigen, windigen Feiertagen oder Wochenenden zur Mittagszeit. Konventionelle Kraftwerke lassen sich nicht beliebig schnell herunterfahren, und viele ältere Solaranlagen speisen ungesteuert ein. Erzeuger zahlen dann dafür, dass jemand den Strom abnimmt.",
  },
  {
    q: "Was bedeuten negative Preise für einen Solarpark?",
    a: "Für Anlagen, die seit dem 25. Februar 2025 (Solarspitzengesetz) in Betrieb gehen, entfällt die Marktprämie in Zeiträumen mit negativen Börsenpreisen; diese Zeiten werden am Ende des Förderzeitraums angehängt. Direktvermarktete Parks werden in solchen Viertelstunden in der Regel abgeregelt. Speicher, PPAs und flexible Abnehmer machen Parks unabhängiger davon.",
    nurDE: "Förderregeln bei negativen Preisen",
  },
  {
    q: "Warum zählen Speicher und Flexibilität?",
    a: "Die Preisspanne zwischen Mittag und Abend wächst mit jedem zusätzlichen Gigawatt Solar. Speicher verschieben Strom in die teuren Stunden, flexible Verbraucher ziehen Last in die günstigen. Beides stabilisiert die Erlöse von Solarparks und senkt die Beschaffungskosten von Unternehmen – das ist der Kern eines virtuellen Kraftwerks.",
  },
  {
    q: "Woher stammen die Daten und wie aktuell sind sie?",
    a: "Börsenpreise und Stromerzeugung stammen von Energy-Charts des Fraunhofer-Instituts für Solare Energiesysteme ISE (Lizenz CC BY 4.0). Fällt diese Quelle aus, nutzen wir für die Preise ersatzweise die stündlichen Day-Ahead-Werte von aWATTar. Die Seite aktualisiert sich alle fünf Minuten; Erzeugungsdaten laufen mit etwas Verzögerung ein. Alle Angaben ohne Gewähr.",
    CH: {
      a: "Börsenpreise und Stromerzeugung stammen von Energy-Charts des Fraunhofer-Instituts für Solare Energiesysteme ISE (Lizenz CC BY 4.0). Für die Schweiz gibt es keine schlüsselfreie Ersatzquelle – fällt die Quelle aus, zeigt die Seite das offen an. Die Seite aktualisiert sich alle fünf Minuten; Erzeugungsdaten laufen mit etwas Verzögerung ein. Alle Angaben ohne Gewähr.",
    },
  },
];

const FAQ_EN = [
  {
    q: "What is the day-ahead price?",
    a: "The day-ahead price is the wholesale price for electricity determined the day before in an auction on the power exchange (EPEX Spot) for every quarter-hour of the following day. The results for Germany and Luxembourg (DE-LU bidding zone) are published at around 13:00. Since October 2025, the day-ahead market has been traded in 15-minute products.",
    AT: {
      a: "The day-ahead price is the wholesale price for electricity determined the day before in an auction on the power exchange (EPEX Spot) for every quarter-hour of the following day. Austria has been its own bidding zone (AT) since 1 October 2018; the results are published at around 13:00. Since October 2025, the day-ahead market has been traded in 15-minute products.",
    },
    CH: {
      a: "The day-ahead price is the wholesale price for electricity determined the day before in an auction on the power exchange. Switzerland has its own day-ahead auction at EPEX SPOT: it is traded hourly, is denominated in euros, and the results are published around midday.",
    },
  },
  {
    q: "What does a business pay compared with the exchange price?",
    a: "The exchange price is only one part of the business electricity price. On top come the supplier’s structuring and sales costs, grid fees, levies, the concession fee and electricity tax. Most businesses have a fixed price procured months in advance on the futures market – fluctuations in day-ahead prices then only reach them indirectly via the next contract.",
    nurDE: "Price components",
  },
  {
    q: "What is the solar capture rate?",
    a: "The capture rate puts the average exchange revenue of solar power (capture price, weighted by feed-in) in relation to the daily average of all quarter-hours (base). Because many solar installations feed in at the same time, the capture price in summer is often well below the base price. For unsubsidised solar parks, it is one of the most important key figures.",
    CH: {
      a: "The capture rate puts the average exchange revenue of solar power (capture price, weighted by feed-in) in relation to the daily average of all trading hours (base). Because many solar installations feed in at the same time, the capture price in summer is often well below the base price. For unsubsidised solar parks, it is one of the most important key figures.",
    },
  },
  {
    q: "Why are there negative electricity prices?",
    a: "Negative prices occur when more electricity is offered than is demanded – typically at midday on sunny, windy public holidays or weekends. Conventional power plants cannot be ramped down at any speed, and many older solar installations feed in without control. Generators then pay for someone to take the power.",
  },
  {
    q: "What do negative prices mean for a solar park?",
    a: "For installations commissioned since 25 February 2025 (Solarspitzengesetz, the German “solar peak act”), the market premium does not apply in periods with negative exchange prices; these periods are added at the end of the support period. Directly marketed parks are usually curtailed in such quarter-hours. Storage, PPAs and flexible buyers make parks more independent of this.",
    nurDE: "Support rules for negative prices",
  },
  {
    q: "Why do storage and flexibility matter?",
    a: "The price spread between midday and evening grows with every additional gigawatt of solar. Storage shifts power into the expensive hours, flexible consumers move load into the cheap ones. Both stabilise the revenues of solar parks and lower the procurement costs of companies – that is the core of a virtual power plant.",
  },
  {
    q: "Where does the data come from and how up to date is it?",
    a: "Exchange prices and power generation come from Energy-Charts by the Fraunhofer Institute for Solar Energy Systems ISE (licence CC BY 4.0). If this source fails, we use the hourly day-ahead values from aWATTar as a fallback for prices. The page refreshes every five minutes; generation data comes in with a slight delay. All information without guarantee.",
    CH: {
      a: "Exchange prices and power generation come from Energy-Charts by the Fraunhofer Institute for Solar Energy Systems ISE (licence CC BY 4.0). For Switzerland there is no key-free fallback source – if the source fails, the page says so openly. The page refreshes every five minutes; generation data comes in with a slight delay. All information without guarantee.",
    },
  },
];

const QUERVERWEISE_EN = [
  { titel: "Virtual power plant", text: "How parks, storage and companies make joint use of the price spread." },
  { titel: "Residual power pool for SMEs", text: "Procure as a pool and in a structured way instead of on a cut-off date." },
  { titel: "Battery storage", text: "Battery storage at grid nodes and in parks – revenue sources and planning." },
  { titel: "Solar park return calculator", text: "IRR and cash flow with EEG, PPA or market value." },
];

const HINTERGRUND = [
  { titel: "Merit-Order", text: "Kraftwerke werden nach ihren Grenzkosten sortiert. Wind und Sonne kosten fast nichts, Gas am meisten. Je mehr Erneuerbare einspeisen, desto weiter rechts endet die Kurve – und desto günstiger wird Strom." },
  { titel: "Negative Preise", text: "Übersteigt das Angebot die Nachfrage, fällt der Preis unter null. Unflexible Kraftwerke und ungesteuerte Einspeisung zahlen dann lieber, als abzuschalten." },
  { titel: "Was das für Parks und Unternehmen heißt", text: "Mittags ist Solarstrom an der Börse wenig wert, abends ist Strom teuer. Speicher, PPAs und flexible Verbraucher verbinden beide Seiten – genau das leistet ein virtuelles Kraftwerk." },
];
const HINTERGRUND_EN = [
  { titel: "Merit order", text: "Power plants are ranked by their marginal costs. Wind and sun cost almost nothing, gas the most. The more renewables feed in, the further to the right the curve ends – and the cheaper power becomes." },
  { titel: "Negative prices", text: "If supply exceeds demand, the price falls below zero. Inflexible power plants and uncontrolled feed-in would then rather pay than switch off." },
  { titel: "What this means for parks and companies", text: "At midday solar power is worth little on the exchange; in the evening power is expensive. Storage, PPAs and flexible consumers connect both sides – which is exactly what a virtual power plant does." },
];

const QUERVERWEISE = [
  { href: pfad("/virtuelles-kraftwerk"), titel: "Virtuelles Kraftwerk", text: "Wie Parks, Speicher und Unternehmen die Preisspanne gemeinsam nutzen." },
  { href: pfad("/reststrom"), titel: "Reststrom-Pool Mittelstand", text: "Gebündelt und strukturiert beschaffen statt zum Stichtag." },
  { href: pfad("/grossspeicher"), titel: "Großspeicher", text: "Batteriespeicher am Netzknoten und im Park – Erlösquellen und Planung." },
  { href: pfad("/rechner/solarpark"), titel: "Solarpark-Renditerechner", text: "IRR und Cashflow mit EEG, PPA oder Marktwert." },
];

export default async function EnergieLivePage({ params }) {
  // Länderwahl: Die Seite zeigt die Live-Daten DES GEWÄHLTEN LANDES (AT und CH mit eigener
  // Gebotszone), die gemeinsame Seite (ohne Wahl) weiter DE-LU mit Vermerk. Deutsche Förder-
  // und Preisregeln (nurDE-Einträge) zeigen in AT/CH den LandHinweis statt deutscher Aussagen.
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const { ct, gw, uhr, spanne, tagLang } = formate(sprache);
  const m = markt(land);
  const landName = en ? m.nameEn : m.name;
  // Zusatz in den Eyebrows: gemeinsame Seite kennzeichnet DE-LU, /de braucht keinen, AT/CH ihr Land
  const zonenZusatz =
    land === "DE" ? "" : land === "AT" || land === "CH" ? ` · ${landName}` : en ? " · Germany-Luxembourg" : " · Deutschland-Luxemburg";
  const landZusatz = land === "DE" ? "" : ` · ${landName}`;
  const faqBasis = en ? uebersetze({ de: FAQ, en: FAQ_EN }, "en") : FAQ;
  const faqLand = (en ? FAQ_LAND_EN : FAQ_LAND)[land];
  const faq = faqFuerLand(faqLand ? [faqBasis[0], faqLand, ...faqBasis.slice(1)] : faqBasis, land, { sprache });
  const querverweise = en ? uebersetze({ de: QUERVERWEISE, en: QUERVERWEISE_EN }, "en") : QUERVERWEISE;
  const hintergrund = en ? HINTERGRUND_EN : HINTERGRUND;
  const s = await getEnergySnapshot(land || "DE");
  const jetzt = Date.parse(s.stand);
  const tage = preisTage(s.preis, jetzt);
  const fenster = tage.heute ? zeitfenster(tage.heute.punkte, 180, tage.schrittMs).guenstig : null;

  // Kompakte Startwerte für die Client-Bausteine (klein halten: RSC-Payload)
  const kompakt = {
    stand: s.stand,
    preis: { quelle: s.preis.quelle, aufloesungMin: s.preis.aufloesungMin, punkte: s.preis.punkte },
    erzeugung: {
      quelle: s.erzeugung.quelle,
      zeitpunkt: s.erzeugung.zeitpunkt,
      solarMw: s.erzeugung.solarMw,
      windMw: s.erzeugung.windMw,
      lastMw: s.erzeugung.lastMw,
      eeAnteil: s.erzeugung.eeAnteil,
      solarAnteil: s.erzeugung.solarAnteil,
    },
  };
  const nurErzeugung = { stand: s.stand, preis: null, erzeugung: s.erzeugung };
  const solarReihe = { zeiten: s.erzeugung.zeiten || [], werte: s.erzeugung.serien?.solar || [] };

  // Zitierfähiger Antwortsatz (auch ohne JavaScript im HTML)
  const antwort = en
    ? tage.heute
      ? `On ${tagLang(tage.heute.start)}, power on the exchange costs an average of ${ct(tage.heute.avg)} ct/kWh (net). It is cheapest at ${uhr(tage.heute.min.t)} at ${ct(tage.heute.min.eurMwh)} ct/kWh and most expensive at ${uhr(tage.heute.max.t)} at ${ct(tage.heute.max.eurMwh)} ct/kWh${fenster ? `; the cheapest 3-hour window is ${spanne(fenster.start, fenster.ende)}` : ""}.`
      : "The day-ahead price is determined on the power exchange for every quarter-hour of the following day and published at around 13:00."
    : tage.heute
    ? `Am ${tagLang(tage.heute.start)} kostet Strom an der Börse im Schnitt ${ct(tage.heute.avg)} ct/kWh (netto). Am günstigsten ist er um ${uhr(tage.heute.min.t)} Uhr mit ${ct(tage.heute.min.eurMwh)} ct/kWh, am teuersten um ${uhr(tage.heute.max.t)} Uhr mit ${ct(tage.heute.max.eurMwh)} ct/kWh${fenster ? `; das günstigste 3-Stunden-Fenster liegt zwischen ${spanne(fenster.start, fenster.ende)}` : ""}.`
    : "Der Day-Ahead-Preis wird für jede Viertelstunde des Folgetages an der Strombörse ermittelt und gegen 13 Uhr veröffentlicht.";

  // Zone und Auflösung je Land (CH handelt stündlich, DE-LU/AT viertelstündlich)
  const zonenNameDe = land === "AT" ? "Österreich" : land === "CH" ? "Schweiz" : "Deutschland-Luxemburg";
  const zonenNameEn = land === "AT" ? "Austria" : land === "CH" ? "Switzerland" : "Germany-Luxembourg";
  const auflDe = land === "CH" ? "stündlicher Auflösung" : "15-Minuten-Auflösung";
  const auflEn = land === "CH" ? "hourly resolution" : "15-minute resolution";
  const apiUrl = abs(`/api/energie/live?land=${(land || "DE").toLowerCase()}&voll=1`);

  const datasetSchemaDe = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${PAGE_URL}/#dataset`,
    name: `Strommarkt ${m.name} live: Day-Ahead-Börsenstrompreis und Stromerzeugung nach Quelle`,
    description: `Day-Ahead-Großhandelspreis für Strom in der Gebotszone ${zonenNameDe} (${m.zone}) in ${auflDe} sowie öffentliche Nettostromerzeugung nach Energieträger und Netzlast für ${m.name === "Schweiz" ? "die Schweiz" : m.name}, fortlaufend aktualisiert.`,
    url: PAGE_URL,
    keywords: ["Day-Ahead", "Börsenstrompreis", "Strommix", "Erneuerbare Energien", m.name],
    isAccessibleForFree: true,
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: { "@type": "Organization", name: "Fraunhofer-Institut für Solare Energiesysteme ISE – Energy-Charts", url: "https://www.energy-charts.info" },
    publisher: { "@id": `${abs("/")}/#organization` },
    spatialCoverage: { "@type": "Place", name: m.name },
    temporalCoverage: tage.heute ? new Date(tage.heute.start).toISOString().slice(0, 10) : undefined,
    dateModified: s.stand,
    variableMeasured: [
      { "@type": "PropertyValue", name: `Day-Ahead-Preis ${m.zone}`, unitText: "EUR/MWh" },
      { "@type": "PropertyValue", name: "Nettostromerzeugung je Energieträger", unitText: "MW" },
      { "@type": "PropertyValue", name: "Netzlast", unitText: "MW" },
      { "@type": "PropertyValue", name: "Anteil erneuerbarer Energien an der Last", unitText: "Prozent" },
    ],
    distribution: [
      { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: apiUrl },
    ],
  };

  const datasetSchema = en
    ? {
        ...datasetSchemaDe,
        name: `Power market ${m.nameEn} live: day-ahead exchange power price and power generation by source`,
        description: `Day-ahead wholesale electricity price in the ${zonenNameEn} bidding zone (${m.zone}) in ${auflEn}, plus public net power generation by energy source and grid load for ${m.nameEn}, continuously updated.`,
        keywords: ["day-ahead", "power exchange price", "power mix", "renewable energy", m.nameEn],
        creator: { ...datasetSchemaDe.creator, name: "Fraunhofer Institute for Solar Energy Systems ISE – Energy-Charts" },
        spatialCoverage: { "@type": "Place", name: m.nameEn },
        variableMeasured: [
          { "@type": "PropertyValue", name: `Day-ahead price ${m.zone}`, unitText: "EUR/MWh" },
          { "@type": "PropertyValue", name: "Net power generation per energy source", unitText: "MW" },
          { "@type": "PropertyValue", name: "Grid load", unitText: "MW" },
          { "@type": "PropertyValue", name: "Share of renewable energy in load", unitText: "percent" },
        ],
      }
    : datasetSchemaDe;

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${PAGE_URL}/#webpage`,
    url: PAGE_URL,
    name: en
      ? `${land === "AT" ? "Austrian" : land === "CH" ? "Swiss" : "German"} power market live – current exchange price & day-ahead price today`
      : `Strommarkt ${m.name} live – Börsenstrompreis aktuell & Day-Ahead-Preis heute`,
    description: antwort,
    isPartOf: { "@id": `${abs("/")}/#website` },
    about: { "@id": `${PAGE_URL}/#dataset` },
    dateModified: s.stand,
  };

  return chBaum(
    <div>
      <JsonLd daten={webPageSchema} />
      <JsonLd daten={datasetSchema} />

      <Hero>
        <LiveKennzahlen initial={kompakt} />
      </Hero>

      {/* Preisverlauf */}
      <Section tone="white" space="lg" id="preisverlauf" className="scroll-mt-24">
        <SectionHeading
          eyebrow={(en ? "Day-ahead price today" : "Day-Ahead-Preis heute") + zonenZusatz}
          title={
            en ? (
              <>
                When power is <span className="ov-text-gradient">cheapest</span> today
              </>
            ) : (
            <>
              Wann Strom heute <span className="ov-text-gradient">am günstigsten</span> ist
            </>
            )
          }
          lead={antwort}
          className="mb-10 md:mb-12"
        />
        <Reveal dir="scale">
          <PreisChart initial={kompakt} />
        </Reveal>
      </Section>

      {/* Was bedeutet das für Sie? */}
      <Section tone="sand" space="lg" id="entscheidungen" className="scroll-mt-24">
        <SectionHeading
          eyebrow={en ? "What does this mean for you?" : "Was bedeutet das für Sie?"}
          title={en ? "Turning exchange data into decisions" : "Aus Börsendaten werden Entscheidungen"}
          lead={
            en
              ? "For companies, what matters is when power is cheap and how much flexibility is worth. For investors, what matters is which price spread a storage system can capture – and what solar power actually earns at midday."
              : "Für Unternehmen zählt, wann Strom günstig ist und wie viel Flexibilität wert ist. Für Investoren zählt, welche Preisspanne ein Speicher heben kann – und was Solarstrom mittags tatsächlich erlöst."
          }
          className="mb-10 md:mb-12"
        />
        <Empfehlungen initial={kompakt} />
        <p className="mt-6 text-[13px] leading-relaxed text-ink-500">
          {en
            ? "For orientation, not advice: calculated from the published day-ahead prices, net and excluding grid fees, levies and taxes. How much of this can be realised in your own business or project depends on contract, metering and flexibility."
            : "Orientierung, keine Beratung: Berechnet aus den veröffentlichten Day-Ahead-Preisen, netto und ohne Netzentgelte, Umlagen und Steuern. Was sich davon im eigenen Betrieb oder Projekt heben lässt, hängt von Vertrag, Messung und Flexibilität ab."}
        </p>
      </Section>

      {/* Strommix */}
      <Section tone="white" space="lg" id="strommix" className="scroll-mt-24">
        <SectionHeading
          eyebrow={(en ? "Power generation by source" : "Stromerzeugung nach Quelle") + landZusatz}
          title={
            en ? (
              <>
                The power mix of the <span className="ov-text-gradient">last 24 hours</span>
              </>
            ) : (
            <>
              Der Strommix der <span className="ov-text-gradient">letzten 24 Stunden</span>
            </>
            )
          }
          lead={
            en
              ? s.erzeugung.eeAnteil != null
                ? `Most recently (${uhr(s.erzeugung.zeitpunkt)}), renewable energy covered ${Math.round(s.erzeugung.eeAnteil)} % of electricity consumption in ${m.nameEn}: ${gw(s.erzeugung.solarMw)} GW solar and ${gw(s.erzeugung.windMw)} GW wind at a grid load of ${gw(s.erzeugung.lastMw)} GW.`
                : "How much power comes from sun, wind, biomass, water, coal and gas – and how this shifts over the day."
              : s.erzeugung.eeAnteil != null
              ? `Zuletzt (${uhr(s.erzeugung.zeitpunkt)} Uhr) deckten erneuerbare Energien ${Math.round(s.erzeugung.eeAnteil)} % des Stromverbrauchs in ${m.name === "Schweiz" ? "der Schweiz" : m.name}: ${gw(s.erzeugung.solarMw)} GW Solar und ${gw(s.erzeugung.windMw)} GW Wind bei einer Netzlast von ${gw(s.erzeugung.lastMw)} GW.`
              : "Wie viel Strom aus Sonne, Wind, Biomasse, Wasser, Kohle und Gas stammt – und wie sich das über den Tag verschiebt."
          }
          className="mb-10 md:mb-12"
        />
        <Reveal dir="scale">
          <ErzeugungChart initial={nurErzeugung} />
        </Reveal>
      </Section>

      {/* Solar-Capture-Rate */}
      <Section tone="sand" space="lg" id="capture-rate" className="scroll-mt-24">
        <SectionHeading
          eyebrow={en ? "For investors" : "Für Investoren"}
          title={
            en ? (
              <>
                What solar power <span className="ov-text-gradient">really earns</span> today
              </>
            ) : (
            <>
              Was Solarstrom heute <span className="ov-text-gradient">wirklich erlöst</span>
            </>
            )
          }
          lead={
            en
              ? "The capture rate shows how much a solar park earns on the exchange compared with the daily average. It falls the more solar feeds in at the same time – and is the reason why storage, PPAs and flexible buyers are gaining in value."
              : "Die Capture-Rate zeigt, wie viel ein Solarpark im Vergleich zum Tagesdurchschnitt an der Börse verdient. Sie sinkt, je mehr Solar gleichzeitig einspeist – und ist der Grund, warum Speicher, PPAs und flexible Abnehmer an Wert gewinnen."
          }
          className="mb-10 md:mb-12"
        />
        <CaptureRate initial={kompakt} initialSolar={solarReihe} />
      </Section>

      {/* Merit-Order & negative Preise */}
      <Section tone="navy" space="lg" id="hintergrund" className="scroll-mt-24 overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -left-40 top-20 h-[460px] w-[460px] rounded-full bg-ov-500/20 blur-[130px]" />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading
              dark
              eyebrow={en ? "Background" : "Hintergrund"}
              title={en ? "Why the power price fluctuates – and sometimes turns negative" : "Warum der Strompreis schwankt – und manchmal negativ wird"}
              lead={
                en
                  ? "On the exchange, the most expensive power plant still needed to meet demand sets the price for everyone. This principle is called the merit order."
                  : "An der Börse bestimmt das teuerste Kraftwerk, das zur Deckung der Nachfrage gerade noch gebraucht wird, den Preis für alle. Dieses Prinzip heißt Merit-Order."
              }
            />
            <ul className="mt-10 space-y-6">
              {hintergrund.map((p, i) => ({ ...p, icon: [Scale, AlertTriangle, Sun][i] })).map((p, i) => (
                <Reveal as="li" key={i} delay={i * 80} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-ov-300">
                    <p.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-[18px] font-bold text-white">{p.titel}</h3>
                    <p className="mt-1.5 text-[15.5px] leading-relaxed text-white/65">{p.text}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
          <Reveal dir="right">
            <MeritOrder />
          </Reveal>
        </div>
      </Section>

      {/* FAQ + Quellen */}
      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <SectionHeading
              eyebrow={en ? "Frequently asked questions" : "Häufige Fragen"}
              title={en ? "The power exchange price explained" : "Börsenstrompreis verständlich erklärt"}
              lead={en ? "Day-ahead, capture rate, negative prices – the key answers, as of 2026." : "Day-Ahead, Capture-Rate, negative Preise – die wichtigsten Antworten, Stand 2026."}
            />
            <Reveal className="mt-10 rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-7">
              <h3 className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
                <Database aria-hidden="true" className="h-4 w-4 text-ov-600" />
                {en ? "Sources & methodology" : "Quellen & Methodik"}
              </h3>
              <ul className="mt-4 space-y-3 text-[14.5px] leading-relaxed text-ink-600">
                <li className="flex gap-2.5">
                  <Activity aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ink-400" />
                  <span>
                    {en ? `Exchange prices (bidding zone ${m.zone}) and generation:` : `Börsenpreise (Gebotszone ${m.zone}) und Erzeugung:`}{" "}
                    <a href={`https://www.energy-charts.info/?l=${en ? "en" : "de"}&c=${land || "DE"}`} target="_blank" rel="noopener noreferrer" className="font-medium text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current">
                      Fraunhofer ISE – Energy-Charts
                      <ExternalLink aria-hidden="true" className="ml-1 inline h-3.5 w-3.5" />
                    </a>
                    {en ? ", licence" : ", Lizenz"}{" "}
                    <a href={en ? "https://creativecommons.org/licenses/by/4.0/" : "https://creativecommons.org/licenses/by/4.0/deed.de"} target="_blank" rel="noopener noreferrer" className="font-medium text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current">
                      CC BY 4.0
                    </a>
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <BatteryCharging aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ink-400" />
                  <span>
                    {land === "CH"
                      ? en
                        ? "No fallback source for Swiss prices – if Energy-Charts is unavailable, the page says so openly. The Swiss day-ahead auction is denominated in euros (EPEX SPOT); no CHF conversion is shown."
                        : "Keine Ersatzquelle für Schweizer Preise – fällt Energy-Charts aus, zeigt die Seite das offen an. Die Schweizer Day-Ahead-Auktion notiert in Euro (EPEX SPOT); eine CHF-Umrechnung zeigen wir nicht."
                      : land === "AT"
                        ? en
                          ? "Fallback source for prices: aWATTar Austria (hourly day-ahead values)"
                          : "Ersatzquelle für Preise: aWATTar Österreich (stündliche Day-Ahead-Werte)"
                        : en
                          ? "Fallback source for prices: aWATTar (hourly day-ahead values)"
                          : "Ersatzquelle für Preise: aWATTar (stündliche Day-Ahead-Werte)"}
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <Clock aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ink-400" />
                  <span>
                    {en
                      ? `Data as of: ${tagLang(jetzt)}, ${uhr(jetzt)} · updated every 5 minutes · prices net in ct/kWh (€1/MWh = 0.1 ct/kWh)`
                      : `Datenstand: ${tagLang(jetzt)}, ${uhr(jetzt)} Uhr · Aktualisierung alle 5 Minuten · Preise netto in ct/kWh (1 €/MWh = 0,1 ct/kWh)`}
                  </span>
                </li>
              </ul>
              <p className="mt-4 text-[13px] text-ink-500">{en ? "All information without guarantee. No investment or tariff advice." : "Alle Angaben ohne Gewähr. Keine Anlage- oder Tarifberatung."}</p>
            </Reveal>
          </div>
          <Faq items={faq} />
        </div>
      </Section>

      <Querverweise items={querverweise} />
      {en ? (
        <CtaBand
          eyebrow="From market signal to advantage"
          title="Make use of the price spread – as a company or investor."
          text="Companies lower their procurement costs in the residual power pool. Investors find solar parks and storage projects in all phases on the project exchange."
          primary={{ label: "Calculate residual power savings", href: pfad("/rechner/reststrom") }}
          secondary={{ label: "To the project exchange", href: "/projektboerse" }}
        />
      ) : (
      <CtaBand
        eyebrow="Vom Marktsignal zum Vorteil"
        title="Nutzen Sie die Preisspanne – als Unternehmen oder Investor."
        text="Unternehmen senken im Reststrom-Pool ihre Beschaffungskosten. Investoren finden auf der Projektbörse Solarparks und Speicherprojekte in allen Phasen."
        primary={{ label: "Reststrom-Ersparnis berechnen", href: pfad("/rechner/reststrom") }}
        secondary={{ label: "Zur Projektbörse", href: "/projektboerse" }}
      />
      )}
    </div>
  );
}

export const generateMetadata = seitenMetadata("/energie-live", basisMetadata);
