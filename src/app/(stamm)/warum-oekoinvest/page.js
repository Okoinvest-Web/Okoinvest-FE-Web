// src/app/warum-oekoinvest/page.js – Vergleich Marktplatz vs. Makler vs. Entwickler-Plattform

import Link from "@/components/Land/Link";
import {
  AlertTriangle, ArrowUpRight, BadgePercent, Calculator, Globe2, HardHat, LayoutDashboard, Megaphone, Network, Sprout, Store, UserRound, Zap,
} from "lucide-react";

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import FeatureGrid from "@/components/ui/FeatureGrid";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import ModellVergleich from "@/components/Vergleich/ModellVergleich";
import ModellBilanz from "@/components/Vergleich/ModellBilanz";
import NachtHero from "@/components/Unternehmen/NachtHero";
import { cn } from "@/components/ui/cn";
import { abs, KENNZAHLEN } from "@/data/site";
import { PROVISION, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import JsonLd from "@/components/JsonLd";
import { pfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { datumText, fmtZahl } from "@/lib/sprache/format";

const PFAD = pfad("/warum-oekoinvest");
const TITEL = "Warum ÖkoInvest: Plattform-Modelle im Vergleich | ÖkoInvest";
const BESCHREIBUNG =
  "Marktplatz, Makler oder Entwickler-Plattform? Offener Vergleich der Modelle im PV-Projekthandel – was ÖkoInvest anders macht und wo unsere Grenzen liegen.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  alternates: { canonical: abs(PFAD) },
  openGraph: {
    type: "website",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/team-praesentation.jpg"), width: 1280, height: 852, alt: "Projektteam bei einer Besprechung" }],
  },
};

const provisionKurz = `${fmt(PROVISION.verkaeufer.min * 100, 1)}⁠–⁠${fmt(PROVISION.verkaeufer.max * 100)} %`;

const SPALTEN = [
  { id: "markt", titel: "Reiner Marktplatz", sub: "Inserate von Anbietern, Plattform vermittelt Kontakt" },
  { id: "makler", titel: "Makler / Berater", sub: "Persönliche Vermittlung einzelner Projekte" },
  { id: "oi", titel: "Entwickler-Plattform", sub: "ÖkoInvest: Börse + Entwicklung, Bau und Betrieb in der Gruppe", hervorheben: true },
];

const ZEILEN = [
  {
    kriterium: "Konditionen sichtbar",
    werte: [
      { t: "Preise und Provision häufig erst nach Login, Mitgliedschaft oder Anfrage.", stufe: "teils" },
      { t: "Individuell verhandelt, selten öffentlich.", stufe: "nein" },
      { t: `Öffentlich: Verkäuferprovision ${provisionKurz}, nur bei Abschluss. Pachtspannen und Preisbänder auf der Website.`, stufe: "gut" },
    ],
  },
  {
    kriterium: "Kosten für Käufer",
    werte: [
      { t: "Je nach Anbieter Mitgliedschaft, Abo oder Käuferprovision.", stufe: "teils" },
      { t: "Oft Käufer- oder Doppelprovision.", stufe: "teils" },
      { t: "Kostenfrei – Suchprofil, NDA und Datenraum.", stufe: "gut" },
    ],
  },
  {
    kriterium: "Rechner & Rechenweg",
    werte: [
      { t: "Selten; Bewertung bleibt Sache der Parteien.", stufe: "nein" },
      { t: "Einzelbewertung im Mandat, Rechenweg meist intern.", stufe: "teils" },
      { t: "Öffentliche Rechner für Pacht, Dachpacht, Rendite, Projekt- und Bestandsbewertung – mit offenen Annahmen.", stufe: "gut" },
    ],
  },
  {
    kriterium: "Prüfung vor Veröffentlichung",
    werte: [
      { t: "Meist Angaben des Anbieters, Prüftiefe unterschiedlich.", stufe: "teils" },
      { t: "Abhängig von Makler und Mandat.", stufe: "teils" },
      { t: "Vollständigkeits- und Plausibilitätsprüfung der Kernunterlagen. Ersetzt keine Due Diligence.", stufe: "teils" },
    ],
  },
  {
    kriterium: "Entwicklung, Bau, Betrieb",
    werte: [
      { t: "Nicht Teil des Modells.", stufe: "nein" },
      { t: "Nicht Teil des Modells, teils Partnernetzwerk.", stufe: "nein" },
      { t: "In der Gruppe: Projektentwicklung, Bau (ÖKOVOLT, seit 2010), eigene Solarparks seit 2012.", stufe: "gut" },
    ],
  },
  {
    kriterium: "Status & Dokumente",
    werte: [
      { t: "Inserate und Nachrichten.", stufe: "teils" },
      { t: "E-Mail, Telefon, Datenraum je Mandat.", stufe: "teils" },
      { t: "Portal mit Status je Vorgang, Nachrichten, Dokumenten und Datenraum nach Klick-NDA.", stufe: "gut" },
    ],
  },
  {
    kriterium: "Agri-PV, Speicher, Strom",
    werte: [
      { t: "Als Inseratskategorie.", stufe: "teils" },
      { t: "Je nach Spezialisierung.", stufe: "teils" },
      { t: "Agri-PV-Modelle für Landwirte, Speicher-Projekte, virtuelles Kraftwerk und Reststrom-Pool für Unternehmen.", stufe: "gut" },
    ],
  },
  {
    kriterium: "Reichweite & Angebotsmenge",
    werte: [
      { t: "Groß – etablierte Marktplätze sind teils seit über zehn Jahren am Markt.", stufe: "gut" },
      { t: "Netzwerk des Maklers, oft sehr gezielt.", stufe: "teils" },
      { t: "Im Aufbau. Die Plattform ist jung, die Zahl der Projekte in der Börse noch überschaubar.", stufe: "nein" },
    ],
  },
];

const FAQ = [
  {
    q: "Ist ÖkoInvest ein Marktplatz oder ein Entwickler?",
    a: `Beides. Die Projektbörse funktioniert wie ein Marktplatz: Anbieter stellen Projekte ein, Investoren suchen und prüfen. Gleichzeitig entwickelt die ÖKOVOLT Gruppe selbst – rund ${KENNZAHLEN.entwicklungMwProJahr} MWp pro Jahr gehen neu in die Entwicklung – baut und betreibt eigene Solarparks. Das bringt Fachwissen in jede Prüfung, bedeutet aber auch, dass wir in manchen Fällen selbst Interessent sein können.`,
  },
  {
    q: "Gibt es einen Interessenkonflikt, wenn die Gruppe selbst entwickelt?",
    a: "Er kann entstehen – etwa wenn ein Projekt aus der eigenen Entwicklung in der Börse steht oder die Gruppe selbst an einem angebotenen Projekt interessiert ist. Fragen Sie bei jedem Projekt nach, wer Anbieter ist und ob die Gruppe beteiligt ist. Verkäufer entscheiden selbst, an wen sie verkaufen.",
  },
  {
    q: "Warum sind Ihre Konditionen öffentlich?",
    a: `Weil Flächeneigentümer, Anbieter und Investoren vor dem ersten Gespräch wissen sollten, woran sie sind. Die Verkäuferprovision beträgt ${PROVISION.verkaeufer.text}; ${PROVISION.kaeufer.text}; ${PROVISION.flaeche.text}.`,
  },
  {
    q: "Wie viele Projekte gibt es in der Börse?",
    a: "Den aktuellen Stand sehen Sie direkt in der Projektbörse. Ehrlich: Die Plattform ist jung, das Angebot wächst. Baureife Leistung aus der eigenen Entwicklung entsteht zeitversetzt, weil zwischen Flächensicherung und Baureife meist zwei bis drei Jahre liegen.",
  },
  {
    q: "Wann ist ein anderes Modell die bessere Wahl?",
    a: "Wenn Sie ein Standardprojekt möglichst breit streuen wollen, erreichen große, etablierte Marktplätze heute mehr Interessenten. Für komplexe Portfolio-Transaktionen mit umfassender M&A-Begleitung sind spezialisierte Berater oft die richtige Wahl. Wir sagen Ihnen offen, wenn wir nicht der beste Weg sind.",
  },
];

// Englisch (Sprachmodell): gleiche Einordnung, nur Texte
const provisionKurzEn = `${fmtZahl(PROVISION.verkaeufer.min * 100, 1, "en")}\u2060–\u2060${fmtZahl(PROVISION.verkaeufer.max * 100, 0, "en")} %`;
const PROVISION_EN = `${fmtZahl(PROVISION.verkaeufer.min * 100, 1, "en")}–${fmtZahl(PROVISION.verkaeufer.max * 100, 0, "en")} % of the purchase price, only on successful closing`;
const metadataEn = {
  title: "Why ÖkoInvest: platform models compared | ÖkoInvest",
  description: "Marketplace, broker or developer platform? An open comparison of the models in PV project trading – what ÖkoInvest does differently and where our limits are.",
  openGraph: {
    title: "Why ÖkoInvest: platform models compared | ÖkoInvest",
    description: "Marketplace, broker or developer platform? An open comparison of the models in PV project trading – what ÖkoInvest does differently and where our limits are.",
    images: [{ alt: "Project team in a meeting" }],
  },
};

const SPALTEN_EN = [
  { titel: "Pure marketplace", sub: "Listings from sellers, the platform puts parties in touch" },
  { titel: "Broker / adviser", sub: "Personal brokerage of individual projects" },
  { titel: "Developer platform", sub: "ÖkoInvest: exchange + development, construction and operation within the group" },
];

const ZEILEN_EN = [
  { kriterium: "Visible terms", werte: [{ t: "Prices and commission often only after login, membership or request." }, { t: "Negotiated individually, rarely public." }, { t: `Public: seller commission ${provisionKurzEn}, only on closing. Lease ranges and price bands on the website.` }] },
  { kriterium: "Costs for buyers", werte: [{ t: "Depending on the provider, membership, subscription or buyer's commission." }, { t: "Often a buyer's or double commission." }, { t: "Free of charge – search profile, NDA and data room." }] },
  { kriterium: "Calculators & methodology", werte: [{ t: "Rare; valuation remains up to the parties." }, { t: "Individual valuation under the mandate, methodology mostly internal." }, { t: "Public calculators for land lease, roof lease, returns, project and operating asset valuation – with open assumptions." }] },
  { kriterium: "Checks before publication", werte: [{ t: "Mostly information provided by the seller, depth of checks varies." }, { t: "Depends on the broker and the mandate." }, { t: "Completeness and plausibility check of the core documents. Does not replace due diligence." }] },
  { kriterium: "Development, construction, operation", werte: [{ t: "Not part of the model." }, { t: "Not part of the model, sometimes a partner network." }, { t: "Within the group: project development, construction (ÖKOVOLT, since 2010), own solar parks since 2012." }] },
  { kriterium: "Status & documents", werte: [{ t: "Listings and messages." }, { t: "E-mail, phone, data room per mandate." }, { t: "Portal with status per case, messages, documents and data room after click-through NDA." }] },
  { kriterium: "Agrivoltaics, storage, power", werte: [{ t: "As a listing category." }, { t: "Depending on specialisation." }, { t: "Agrivoltaics models for farmers, storage projects, virtual power plant and residual power pool for companies." }] },
  { kriterium: "Reach & volume of offers", werte: [{ t: "Large – established marketplaces have in some cases been around for more than ten years." }, { t: "The broker's network, often very targeted." }, { t: "Still being built. The platform is young, and the number of projects on the exchange is still limited." }] },
];

const FAQ_EN = [
  {
    q: "Is ÖkoInvest a marketplace or a developer?",
    a: `Both. The project exchange works like a marketplace: sellers list projects, investors search and review them. At the same time, the ÖKOVOLT Group develops itself – around ${KENNZAHLEN.entwicklungMwProJahr} MWp of new capacity enters development each year – and builds and operates its own solar parks. That brings expertise to every review, but also means that in some cases we may be an interested party ourselves.`,
  },
  {
    q: "Is there a conflict of interest if the group develops itself?",
    a: "It can arise – for example if a project from our own development is listed on the exchange or the group itself is interested in a project on offer. For every project, ask who the seller is and whether the group is involved. Sellers decide for themselves whom they sell to.",
  },
  {
    q: "Why are your terms public?",
    a: `Because landowners, sellers and investors should know where they stand before the first conversation. The seller commission is ${PROVISION_EN}; free of charge for investors (search profile, NDA, data room); always free of charge for landowners.`,
  },
  {
    q: "How many projects are on the exchange?",
    a: "You can see the current status directly on the project exchange. To be honest: the platform is young and the offering is growing. Ready-to-build capacity from our own development comes on stream with a time lag, because there are usually two to three years between securing land and reaching ready-to-build.",
  },
  {
    q: "When is another model the better choice?",
    a: "If you want to market a standard project as widely as possible, large established marketplaces currently reach more interested parties. For complex portfolio transactions with comprehensive M&A support, specialised advisers are often the right choice. We will tell you openly if we are not the best route.",
  },
];

const TEXTE = {
  de: {
    schemaName: "Warum ÖkoInvest – Plattform-Modelle im Vergleich",
    brotkrumen: "Warum ÖkoInvest",
    eyebrow: "Offener Vergleich",
    titel1: "Marktplatz, Makler oder ",
    titel2: "Entwickler-Plattform?",
    lead: "Wer im PV-Projekthandel kauft, verkauft oder verpachtet, hat drei Arten von Partnern zur Auswahl. Jedes Modell hat Stärken. Hier sehen Sie offen, worin sie sich unterscheiden – und wo unsere Grenzen liegen.",
    chips: ["Konditionen öffentlich", "Rechner mit Rechenweg", "Entwicklung, Bau und Betrieb in der Gruppe", "Grenzen offen benannt"],
    zumVergleich: "Zum Vergleich",
    zurBoerse: "Zur Projektbörse",
    dEyebrow: "Drei Modelle",
    dTitel: "Jedes Modell löst ein anderes Problem.",
    dLead: "Keines ist per se besser. Entscheidend ist, was Sie brauchen: Reichweite, persönliche Begleitung oder einen Partner, der ein Projekt auch selbst weiterbringen kann.",
    modelle: [
      { t: "Reiner Marktplatz", stark: "Große Reichweite, viele Segmente, oft lange am Markt.", grenze: "Die Plattform bewertet, entwickelt und baut nicht. Konditionen und Preise sind häufig erst nach Login sichtbar." },
      { t: "Makler / Berater", stark: "Persönliche Begleitung, gezielte Ansprache, Verhandlung im Mandat.", grenze: "Abhängig von Netzwerk und Kapazität einzelner Personen; Konditionen und Bewertung meist nicht öffentlich." },
      { t: "Entwickler-Plattform", stark: "Börse plus Fachwissen aus Entwicklung, Bau und Betrieb – mit offenen Konditionen und Rechnern.", grenze: "Junge Plattform mit noch begrenzter Reichweite; die Gruppe kann selbst Marktteilnehmer sein." },
    ],
    unserModell: "Unser Modell",
    staerke: "Stärke",
    grenze: "Grenze",
    vEyebrow: "Vergleich der Modelle",
    vTitel: "Acht Kriterien, drei Modelle.",
    vLead: "Beschrieben ist, was im jeweiligen Modell typisch ist – einzelne Anbieter können abweichen. Wir nennen bewusst keine Namen.",
    vFuss: (s) => `Stand ${s}. Eigene Einordnung auf Basis öffentlich zugänglicher Informationen über die jeweiligen Geschäftsmodelle.`,
    aEyebrow: "Was ÖkoInvest konkret anders macht",
    aTitel: "Sechs Dinge, die Sie bei uns prüfen können.",
    aLead: "Keine Versprechen, sondern Punkte, die Sie auf dieser Website nachvollziehen – bevor Sie mit uns sprechen.",
    punkte: [
      { title: "Offene Provision", text: (p) => `Verkäuferprovision ${p}, nur bei Abschluss. Für Käufer und Flächeneigentümer kostenfrei. Keine Listungsgebühren.` },
      { title: "Rechner mit Rechenweg", text: "Pacht, Dachpacht, Solarpark-Rendite, Projekt- und Bestandsbewertung – alle Annahmen und Quellen stehen daneben." },
      { title: "Entwicklung, Bau, Betrieb", text: "Die ÖKOVOLT Gruppe baut seit 2010, betreibt eigene Solarparks seit 2012 und hat eigene Rammtechnik. Das fließt in jede Prüfung ein." },
      { title: "Agri-PV-Tiefe", text: "Verpachten, selbst investieren oder über die Genossenschaft beteiligen – mit DIN SPEC 91434 und GAP-Förderfähigkeit im Blick." },
      { title: "Virtuelles Kraftwerk & Reststrom", text: "Strom aus den Parks der Gruppe und Flexibilität aus Speichern – gebündelt für Unternehmen, die weiterhin Netzstrom brauchen." },
      { title: "Portal mit Status", text: "Jede Anfrage wird ein Vorgang mit Status, Nachrichten und Dokumenten; Datenraum nach Klick-NDA mit protokolliertem Zugriff." },
    ],
    gEyebrow: "Ehrliche Grenzen",
    gTitel: "Was wir (noch) nicht sind.",
    gLead: "Ein Vergleich ohne eigene Schwächen wäre Werbung. Deshalb hier, was Sie wissen sollten.",
    grenzen: [
      { t: "Junge Plattform", x: "Die ÖkoInvest GmbH ist seit 2020 im Firmenbuch eingetragen; die Online-Plattform ist neu. Andere Marktplätze haben über Jahre Bekanntheit aufgebaut." },
      { t: "Reichweite im Aufbau", x: "Die Zahl registrierter Investoren und der Projekte in der Börse wächst erst. Für maximale Streuung eines Standardprojekts sind große Marktplätze heute breiter." },
      { t: "Mögliche Eigeninteressen", x: "Die Gruppe entwickelt selbst und kann Anbieter oder Interessent sein. Fragen Sie bei jedem Projekt nach, ob und wie die Gruppe beteiligt ist." },
      { t: "Fokus DACH", x: "Wir arbeiten in Deutschland, Österreich und der Schweiz – nicht europaweit. Baureife Leistung aus der eigenen Entwicklung entsteht zeitversetzt über Jahre." },
    ],
    sEyebrow: "Alle Segmente",
    sTitel: "Wofür Sie ÖkoInvest nutzen können.",
    sLead: "Von der Fläche bis zur laufenden Anlage – jeweils mit eigener Seite, Rechner und Anfrage.",
    segmente: [
      { t: "Grundstück verpachten", x: "Acker, Grünland, Konversion" },
      { t: "Dachfläche verpachten", x: "Gewerbe, Halle, Landwirtschaft, Logistik" },
      { t: "Agri-PV", x: "Weiter bewirtschaften, zusätzlich Strom" },
      { t: "Projektrechte & RTB", x: "Von der Flächensicherung bis baureif" },
      { t: "Bestandsanlagen", x: "Laufende Anlagen kaufen und verkaufen" },
      { t: "Großspeicher", x: "Eigenständig oder am Solarpark" },
      { t: "Solarcarports", x: "Parkflächen mit Strom und Ladepunkten" },
      { t: "Reststrom-Pool", x: "Strom für Unternehmen gebündelt" },
    ],
    faqEyebrow: "Häufige Fragen",
    faqTitel: "Fragen zum Modell",
    faqLead: "Ihre Frage ist nicht dabei? Stellen Sie sie über das Kontaktformular – wir antworten persönlich.",
    quer: [
      { titel: "Projektbörse", text: "Projekte in allen Phasen – anonymer Teaser, Details nach NDA." },
      { titel: "Rechner & Tools", text: "Alle Rechner mit offenen Annahmen und Quellen." },
      { titel: "Unternehmen", text: "ÖkoInvest und die ÖKOVOLT Gruppe – wer hinter der Plattform steht." },
    ],
    ctaEyebrow: "Selbst prüfen",
    ctaTitel: "Überzeugen Sie sich mit Zahlen, nicht mit Werbung.",
    ctaText: "Rechnen Sie Ihr Projekt, Ihre Fläche oder Ihre Anlage durch – ohne Anmeldung. Wenn es passt, sprechen wir über den nächsten Schritt.",
    ctaPrimaer: "Zu den Rechnern",
  },
  en: {
    schemaName: "Why ÖkoInvest – platform models compared",
    brotkrumen: "Why ÖkoInvest",
    eyebrow: "An open comparison",
    titel1: "Marketplace, broker or ",
    titel2: "developer platform?",
    lead: "Anyone buying, selling or leasing in PV project trading can choose between three types of partner. Each model has its strengths. Here you can see openly how they differ – and where our limits are.",
    chips: ["Terms made public", "Calculators with methodology", "Development, construction and operation in the group", "Limits stated openly"],
    zumVergleich: "Go to the comparison",
    zurBoerse: "Go to the project exchange",
    dEyebrow: "Three models",
    dTitel: "Each model solves a different problem.",
    dLead: "None is better per se. What matters is what you need: reach, personal support or a partner who can also take a project forward itself.",
    modelle: [
      { t: "Pure marketplace", stark: "Wide reach, many segments, often long established.", grenze: "The platform does not value, develop or build. Terms and prices are often only visible after logging in." },
      { t: "Broker / adviser", stark: "Personal support, targeted approach, negotiation under the mandate.", grenze: "Dependent on the network and capacity of individuals; terms and valuation usually not public." },
      { t: "Developer platform", stark: "Exchange plus expertise from development, construction and operation – with open terms and calculators.", grenze: "A young platform with still limited reach; the group itself may be a market participant." },
    ],
    unserModell: "Our model",
    staerke: "Strength",
    grenze: "Limitation",
    vEyebrow: "Comparison of the models",
    vTitel: "Eight criteria, three models.",
    vLead: "We describe what is typical of each model – individual providers may differ. We deliberately do not name names.",
    vFuss: (s) => `As of ${datumText(s, "en")}. Our own classification based on publicly available information about the respective business models.`,
    aEyebrow: "What ÖkoInvest specifically does differently",
    aTitel: "Six things you can check with us.",
    aLead: "Not promises, but points you can verify on this website – before you talk to us.",
    punkte: [
      { title: "Open commission", text: () => `Seller commission ${provisionKurzEn}, only on closing. Free of charge for buyers and landowners. No listing fees.` },
      { title: "Calculators with methodology", text: "Land lease, roof lease, solar park returns, project and operating asset valuation – all assumptions and sources are shown alongside." },
      { title: "Development, construction, operation", text: "The ÖKOVOLT Group has been building since 2010, has operated its own solar parks since 2012 and has its own pile-driving equipment. This feeds into every review." },
      { title: "Depth in agrivoltaics", text: "Lease, invest yourself or take a stake via the cooperative – with DIN SPEC 91434 and CAP eligibility in mind." },
      { title: "Virtual power plant & residual power", text: "Power from the group's parks and flexibility from storage – pooled for companies that still need grid power." },
      { title: "Portal with status", text: "Every enquiry becomes a case with status, messages and documents; data room after a click-through NDA, with every access logged." },
    ],
    gEyebrow: "Honest limitations",
    gTitel: "What we are not (yet).",
    gLead: "A comparison without our own weaknesses would be advertising. So here is what you should know.",
    grenzen: [
      { t: "A young platform", x: "ÖkoInvest GmbH has been entered in the Austrian commercial register since 2020; the online platform is new. Other marketplaces have built up their profile over years." },
      { t: "Reach still growing", x: "The number of registered investors and of projects on the exchange is only just growing. For the widest possible distribution of a standard project, large marketplaces currently reach further." },
      { t: "Possible own interests", x: "The group develops itself and may be a seller or an interested party. For every project, ask whether and how the group is involved." },
      { t: "Focus on DACH", x: "We work in Germany, Austria and Switzerland – not across Europe. Ready-to-build capacity from our own development comes on stream with a time lag over years." },
    ],
    sEyebrow: "All segments",
    sTitel: "What you can use ÖkoInvest for.",
    sLead: "From land to the operating plant – each with its own page, calculator and enquiry.",
    segmente: [
      { t: "Lease your land", x: "Arable land, grassland, conversion sites" },
      { t: "Lease your roof", x: "Commercial, halls, agriculture, logistics" },
      { t: "Agrivoltaics", x: "Keep farming, generate power as well" },
      { t: "Project rights & RTB", x: "From land securing to ready-to-build" },
      { t: "Operating assets", x: "Buy and sell operating plants" },
      { t: "Battery storage", x: "Stand-alone or at a solar park" },
      { t: "Solar carports", x: "Car parks with power and charging points" },
      { t: "Residual power pool", x: "Power for companies, pooled" },
    ],
    faqEyebrow: "Frequently asked questions",
    faqTitel: "Questions about the model",
    faqLead: "Your question is not listed? Ask it via the contact form – we will answer personally.",
    quer: [
      { titel: "Project exchange", text: "Projects at every stage – anonymous teaser, details after NDA." },
      { titel: "Calculators & tools", text: "All calculators with open assumptions and sources." },
      { titel: "Company", text: "ÖkoInvest and the ÖKOVOLT Group – who is behind the platform." },
    ],
    ctaEyebrow: "Check for yourself",
    ctaTitel: "Let the numbers convince you, not the advertising.",
    ctaText: "Run the numbers for your project, your land or your plant – no sign-up required. If it fits, we will talk about the next step.",
    ctaPrimaer: "Go to the calculators",
  },
};

export default async function WarumOekoinvestPage({ params }) {
  await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  const spalten = uebersetze({ de: SPALTEN, en: SPALTEN_EN }, sprache);
  const zeilen = uebersetze({ de: ZEILEN, en: ZEILEN_EN }, sprache);
  return (
    <div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: t.schemaName,
          url: abs(PFAD),
          description: en ? metadataEn.description : BESCHREIBUNG,
          about: { "@id": `${abs("/")}/#organization` },
          inLanguage: en ? "en" : "de-DE",
        }}
      />

      <NachtHero
        breadcrumbs={[{ name: t.brotkrumen }]}
        eyebrow={t.eyebrow}
        buehne={<ModellBilanz spalten={spalten} zeilen={zeilen} />}
        title={<>{t.titel1}<span className="ov-text-gradient-light">{t.titel2}</span></>}
        lead={t.lead}
        chips={t.chips}
        actions={[
          { label: t.zumVergleich, href: "#vergleich" },
          { label: t.zurBoerse, href: "/projektboerse" },
        ]}
      />

      {/* Drei Modelle */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow={t.dEyebrow}
          title={t.dTitel}
          lead={t.dLead}
          className="mb-12"
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {[Store, UserRound, HardHat].map((icon, i) => ({ icon, ...t.modelle[i] })).map((m, i) => (
            <Reveal
              key={m.t}
              delay={i * 80}
              className={cn("relative flex flex-col overflow-hidden rounded-3xl p-6 md:p-8", i === 2 ? "ov-verlauf-nacht text-white shadow-e4" : "bg-sand-50 ring-1 ring-ink-200/60")}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", i === 2 ? "bg-white/10 text-ov-300 ring-1 ring-white/15" : "bg-white text-ov-600 ring-1 ring-ink-200")}>
                  <m.icon aria-hidden="true" className="h-5 w-5" />
                </span>
                {i === 2 && <span className="rounded-full bg-ov-300 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">{t.unserModell}</span>}
              </div>
              <h3 className={cn("mt-5 font-display text-[20px] font-bold", i === 2 ? "text-white" : "text-ink-900")}>{m.t}</h3>
              <div className={cn("mt-5 rounded-2xl p-4", i === 2 ? "bg-white/[0.06] ring-1 ring-white/10" : "bg-white ring-1 ring-ink-200/60")}>
                <p className={cn("ov-overline", i === 2 ? "text-ov-300" : "text-ov-700")}>{t.staerke}</p>
                <p className={cn("mt-1.5 text-[15px] leading-relaxed", i === 2 ? "text-white/85" : "text-ink-700")}>{m.stark}</p>
              </div>
              <div className="mt-3 px-4">
                <p className={cn("ov-overline", i === 2 ? "text-white/60" : "text-ink-500")}>{t.grenze}</p>
                <p className={cn("mt-1.5 text-[15px] leading-relaxed", i === 2 ? "text-white/70" : "text-ink-600")}>{m.grenze}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Vergleichstabelle */}
      <Section tone="sand" space="lg" id="vergleich" className="scroll-mt-24">
        <SectionHeading
          eyebrow={t.vEyebrow}
          title={t.vTitel}
          lead={t.vLead}
          className="mb-10"
        />
        <ModellVergleich spalten={spalten} zeilen={zeilen} />
        <p className="mt-6 max-w-4xl text-[13px] leading-relaxed text-ink-500">{t.vFuss(STAND)}</p>
      </Section>

      {/* Was wir anders machen */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow={t.aEyebrow}
          title={t.aTitel}
          lead={t.aLead}
          className="mb-12"
        />
        <FeatureGrid
          cols={3}
          items={[
            { icon: BadgePercent, title: t.punkte[0].title, text: t.punkte[0].text(provisionKurz), href: "/projektboerse" },
            { icon: Calculator, ...t.punkte[1], href: pfad("/rechner") },
            { icon: HardHat, ...t.punkte[2], href: "/unternehmen" },
            { icon: Sprout, ...t.punkte[3], href: pfad("/agri-pv") },
            { icon: Zap, ...t.punkte[4], href: pfad("/reststrom") },
            { icon: LayoutDashboard, ...t.punkte[5], href: "/registrieren" },
          ]}
        />
      </Section>

      {/* Ehrliche Grenzen */}
      <Section tone="green" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            eyebrow={t.gEyebrow}
            title={t.gTitel}
            lead={t.gLead}
          />
          <ul className="grid gap-3 sm:grid-cols-2">
            {[Megaphone, Network, AlertTriangle, Globe2].map((icon, i) => ({ icon, ...t.grenzen[i] })).map((k, i) => (
              <Reveal as="li" key={k.t} delay={i * 60} className="rounded-3xl bg-white p-5 ring-1 ring-ov-100 md:p-6">
                <div className="flex items-center gap-3">
                  <k.icon aria-hidden="true" className="h-5 w-5 shrink-0 text-ov-600" />
                  <p className="font-display text-[16.5px] font-bold text-ink-900">{k.t}</p>
                </div>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{k.x}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      {/* Segmente */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow={t.sEyebrow}
          title={t.sTitel}
          lead={t.sLead}
          className="mb-10"
        />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[pfad("/flaeche-verpachten"), pfad("/dachflaeche-verpachten"), pfad("/agri-pv"), "/projektboerse", pfad("/bestandsanlagen"), pfad("/grossspeicher"), pfad("/solarcarport"), pfad("/reststrom")].map((href, i) => ({ href, ...t.segmente[i] })).map((s, i) => (
            <Reveal as="li" key={s.href} delay={i * 40} className="flex">
              <Link href={s.href} className="group ov-card-hover flex w-full items-start justify-between gap-3 rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 hover:bg-white">
                <span>
                  <span className="block font-display text-[16.5px] font-bold text-ink-900">{s.t}</span>
                  <span className="mt-1 block text-[14px] text-ink-600">{s.x}</span>
                </span>
                <ArrowUpRight aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-400 transition-colors group-hover:text-ov-600" />
              </Link>
            </Reveal>
          ))}
        </ul>
      </Section>

      <Section tone="sand" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow={t.faqEyebrow} title={t.faqTitel} lead={t.faqLead} />
          <Faq items={en ? FAQ_EN : FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/projektboerse", ...t.quer[0] },
          { href: pfad("/rechner"), ...t.quer[1] },
          { href: "/unternehmen", ...t.quer[2] },
        ]}
      />

      <CtaBand
        eyebrow={t.ctaEyebrow}
        title={t.ctaTitel}
        text={t.ctaText}
        primary={{ label: t.ctaPrimaer, href: pfad("/rechner") }}
        secondary={{ label: t.zurBoerse, href: "/projektboerse" }}
      />
    </div>
  );
}

export const generateMetadata = seitenMetadata("/warum-oekoinvest", metadata, { en: metadataEn });
