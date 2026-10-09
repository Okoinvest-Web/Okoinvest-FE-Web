// src/app/bestandsanlagen/page.js – Zweitmarkt für PV-Bestandsanlagen (Dach und Freifläche)

import { BadgePercent, FileSignature, FolderLock, Gauge, Handshake, Search, ShieldCheck } from "lucide-react";

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import Hero from "@/components/Bestand/Seite/Hero";
import Bewertung from "@/components/Bestand/Seite/Bewertung";
import { Anfrage, Datenraum, Perspektiven, Provision } from "@/components/Bestand/Seite/Abschnitte";
import { FaktenLeiste } from "@/components/Dach/Seite/Fakten";
import Zeitleiste from "@/components/Dach/Seite/Zeitleiste";
import { abs } from "@/data/site";
import { BESTAND, ERLOESE, PROVISION, STAND } from "@/lib/invest/markt";
import { PHASE_BESTAND, rechneBestand, verguetungRichtwert } from "@/lib/rechner/bestandsanlage";
import { fmt, fmtMio } from "@/lib/rechner/annahmen";
import JsonLd from "@/components/JsonLd";
import { pfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { inhaltFuerSprache, uebersetze } from "@/lib/sprache/woerterbuch";
import { chTexte } from "@/data/laender/ch/schreibung";
import { datumText, fmtZahl } from "@/lib/sprache/format";

const PFAD = pfad("/bestandsanlagen");
const TITEL = "PV-Bestandsanlagen kaufen und verkaufen | ÖkoInvest";
const BESCHREIBUNG =
  "Zweitmarkt für laufende PV-Anlagen auf Dach und Freifläche: Bewertung nach Ertragswert, Due Diligence, vertraulicher Verkauf, offene Provision.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  keywords: ["PV Bestandsanlage verkaufen", "Solarpark kaufen Bestand", "Photovoltaik Zweitmarkt", "Bestandsanlage Bewertung", "PV-Anlage gebraucht kaufen"],
  alternates: { canonical: abs(PFAD) },
  openGraph: {
    type: "website",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/solarpark-reihen.jpg"), width: 1280, height: 852, alt: "Reihen eines laufenden Solarparks" }],
  },
};

const BOERSE = "/projektboerse?phase=cod";

// Drei Beispiele: gleiche Anlage (2 MWp Freifläche, 1.000 kWh/kWp), unterschiedliches Baujahr
const BEISPIELE = [2010, 2013, 2021].map((j) => {
  const r = rechneBestand({ ibnJahr: j, verguetungCt: verguetungRichtwert(j), modell: j >= 2015 ? "marktpraemie" : "fest", wrJahr: 2029 });
  return { jahr: j, ct: verguetungRichtwert(j), r };
});
const bsp = BEISPIELE[1].r;

const FAQ = [
  {
    q: "Was ist meine PV-Anlage wert?",
    a: `So viel, wie ihre künftigen Cashflows heute wert sind. Entscheidend sind Förderrestlaufzeit und Tarif, der tatsächliche Ertrag, Betriebskosten und Pacht, anstehende Ersatzinvestitionen und die Laufzeit des Pacht- oder Dachvertrags. Für jüngere Anlagen mit heutigen Tarifen liegen übliche Preise grob bei ${fmt(PHASE_BESTAND.preisProKwp.min)}–${fmt(PHASE_BESTAND.preisProKwp.max)} € je kWp; ältere Anlagen mit hohem EEG-Tarif können darüber liegen. Den Ertragswert Ihrer Anlage rechnen Sie im Bewertungsrechner.`,
  },
  {
    q: "Ab welcher Größe lohnt der Verkauf über die Börse?",
    a: "Käufer am Zweitmarkt suchen meist Anlagen ab einigen Hundert kWp, institutionelle Käufer eher ab mehreren MWp oder Portfolios. Kleinere Dachanlagen lassen sich bündeln. Sprechen Sie uns an – wir sagen offen, ob sich ein Verkauf lohnt.",
  },
  {
    q: "Wie lange dauert ein Verkauf?",
    a: "Von der Bewertung bis zum Übergang meist einige Monate. Den Takt bestimmen Vollständigkeit der Unterlagen, Due Diligence des Käufers und Zustimmungen Dritter (etwa Bank, Flächen- oder Dacheigentümer). Ein gut vorbereiteter Datenraum spart die meiste Zeit.",
  },
  {
    q: "Share Deal oder Asset Deal?",
    a: "Bei einer Projektgesellschaft wird häufig die Gesellschaft verkauft (Share Deal) – Verträge und Genehmigungen bleiben in der Gesellschaft. Beim Asset Deal wird die Anlage selbst übertragen; Pacht-, Wartungs- und Vermarktungsverträge müssen übergeleitet werden. Welche Form besser passt, hängt von Steuern, Finanzierung und Vertragslage ab – das klären Sie mit Ihrer Beratung.",
  },
  {
    q: "Wer sieht meine Anlage in der Börse?",
    a: "Öffentlich nur ein anonymer Teaser mit Region, Größe, Inbetriebnahmejahr und Eckdaten. Standort, Verträge, Ertragsdaten und Gutachten sehen registrierte Käufer erst nach Vertraulichkeitsvereinbarung und Freigabe – jeder Zugriff auf den Datenraum wird protokolliert.",
  },
  {
    q: "Wie werden Anlagen in Österreich und der Schweiz bewertet?",
    a: "Nach derselben Logik, aber mit anderen Förderregimen: In Österreich laufen ältere Anlagen häufig mit Tarifen nach dem Ökostromgesetz, neuere mit Marktprämie oder Investitionszuschuss nach dem EAG. In der Schweiz gibt es bei älteren Anlagen teils eine laufende Einspeisevergütung, bei neueren meist eine Einmalvergütung – dann zählen Eigenverbrauch und Rückliefertarif. Förderdauer und Tarif übernehmen Sie im Rechner aus dem Bescheid.",
  },
];

// Österreich (Länderinhalt): Preise je kWp und Tarife sind für AT nicht geprüft → keine Werte; die
// AT-Frage steht vorn. Förderregime-Aussage wie in der gemeinsamen FAQ (Ökostromgesetz, EAG).
const FAQ_AT = (() => {
  const at = FAQ.find((f) => f.q.startsWith("Wie werden Anlagen in Österreich"));
  const rest = FAQ.filter((f) => f !== at).map((f) =>
    f.q === "Was ist meine PV-Anlage wert?"
      ? {
          q: f.q,
          a: "So viel, wie ihre künftigen Cashflows heute wert sind. Entscheidend sind Förderregime und Restlaufzeit laut Bescheid, der tatsächliche Ertrag, Betriebskosten und Pacht, anstehende Ersatzinvestitionen und die Laufzeit des Pacht- oder Dachvertrags. Preiswerte je kWp für Österreich werden geprüft – eine Einschätzung Ihrer Anlage erhalten Sie auf Anfrage.",
        }
      : f
  );
  return [{ q: "Wie werden Anlagen in Österreich bewertet?", a: at.a.replace(" In der Schweiz gibt es bei älteren Anlagen teils eine laufende Einspeisevergütung, bei neueren meist eine Einmalvergütung – dann zählen Eigenverbrauch und Rückliefertarif.", "") }, ...rest];
})();

// Schweiz (QM Ländermodell, Entscheidung 5): Preise je kWp und Tarife sind für CH nicht geprüft → keine Werte;
// die Länderfrage steht vorn (Aussage zur Schweiz wie in der gemeinsamen FAQ).
const FAQ_CH = (() => {
  const ch = FAQ.find((f) => f.q.startsWith("Wie werden Anlagen in Österreich"));
  const rest = FAQ.filter((f) => f !== ch).map((f) =>
    f.q === "Was ist meine PV-Anlage wert?"
      ? {
          q: f.q,
          a: "So viel, wie ihre künftigen Cashflows heute wert sind. Entscheidend sind Förderung und Restlaufzeit, der tatsächliche Ertrag, Betriebskosten und Pacht, anstehende Ersatzinvestitionen und die Laufzeit des Pacht- oder Dachvertrags. Preiswerte je kWp für die Schweiz werden geprüft – eine Einschätzung Ihrer Anlage erhalten Sie auf Anfrage.",
        }
      : f
  );
  return chTexte([{ q: "Wie werden Anlagen in der Schweiz bewertet?", a: "Nach derselben Logik wie überall: Massgeblich sind die künftigen Cashflows. In der Schweiz gibt es bei älteren Anlagen teils eine laufende Einspeisevergütung, bei neueren meist eine Einmalvergütung – dann zählen Eigenverbrauch und Rückliefertarif. Förderdauer und Tarif übernehmen Sie im Rechner aus Ihren Förderunterlagen." }, ...rest], "CH");
})();

// Englisch (Sprachmodell): gleiche Aussagen und Werte, Zahlen im englischen Format
const z = (n, s = 0) => fmtZahl(n, s, "en");
const SPANNE_EN = `${z(PROVISION.verkaeufer.min * 100, 1)}–${z(PROVISION.verkaeufer.max * 100)} %`;
const metadataEn = {
  title: "Buy and sell operating PV plants | ÖkoInvest",
  description: "Secondary market for operating rooftop and ground-mounted PV plants: valuation by income value, due diligence, confidential sale, disclosed commission.",
  openGraph: {
    title: "Buy and sell operating PV plants | ÖkoInvest",
    description: "Secondary market for operating rooftop and ground-mounted PV plants: valuation by income value, due diligence, confidential sale, disclosed commission.",
    images: [{ alt: "Rows of an operating solar park" }],
  },
};

const FAQ_EN = [
  {
    q: "What is my PV plant worth?",
    a: `As much as its future cash flows are worth today. What matters are the remaining subsidy term and tariff, the actual yield, operating costs and lease, upcoming replacement investments and the term of the land or roof lease. For younger plants with today's tariffs, usual prices are roughly €${z(PHASE_BESTAND.preisProKwp.min)}–${z(PHASE_BESTAND.preisProKwp.max)} per kWp; older plants with a high EEG tariff (German Renewable Energy Sources Act) can be above this. You can calculate the income value of your plant in the valuation calculator.`,
  },
  {
    q: "From what size is it worth selling via the exchange?",
    a: "Buyers on the secondary market usually look for plants from a few hundred kWp, institutional buyers rather from several MWp or portfolios. Smaller rooftop systems can be bundled. Talk to us – we will tell you openly whether a sale is worthwhile.",
  },
  {
    q: "How long does a sale take?",
    a: "From valuation to transfer, usually a few months. The pace is set by the completeness of the documents, the buyer's due diligence and third-party consents (for example from the bank, landowner or roof owner). A well-prepared data room saves the most time.",
  },
  {
    q: "Share deal or asset deal?",
    a: "With a project company, the company itself is often sold (share deal) – contracts and permits remain within the company. In an asset deal, the plant itself is transferred; lease, maintenance and marketing contracts must be transferred. Which form suits you better depends on taxes, financing and the contractual situation – clarify this with your advisers.",
  },
  {
    q: "Who sees my plant on the exchange?",
    a: "Publicly, only an anonymous teaser with region, size, year of commissioning and key data. Registered buyers only see the location, contracts, yield data and expert reports after signing the non-disclosure agreement and being approved – every access to the data room is logged.",
  },
  {
    q: "How are plants in Austria and Switzerland valued?",
    a: "Using the same logic, but under different subsidy regimes: in Austria, older plants often run on tariffs under the Green Electricity Act (Ökostromgesetz), newer ones on a market premium or investment grant under the EAG (Renewable Energy Expansion Act). In Switzerland, older plants sometimes receive an ongoing feed-in tariff, newer ones usually a one-off remuneration (Einmalvergütung) – in which case self-consumption and the feed-in tariff paid by the utility count. Enter the subsidy period and tariff from the funding decision in the calculator.",
  },
];

// Österreich auf Englisch: Übersetzung von FAQ_AT (gleiche Aussagen, keine zusätzlichen Werte)
const FAQ_AT_EN = (() => {
  const at = FAQ_EN[5];
  const rest = FAQ_EN.filter((f) => f !== at).map((f, i) =>
    i === 0
      ? {
          q: f.q,
          a: "As much as its future cash flows are worth today. What matters are the subsidy regime and remaining term according to the funding decision, the actual yield, operating costs and lease, upcoming replacement investments and the term of the land or roof lease. Price figures per kWp for Austria are being reviewed – you can obtain an assessment of your plant on request.",
        }
      : f
  );
  return [{ q: "How are plants in Austria valued?", a: at.a.replace(" In Switzerland, older plants sometimes receive an ongoing feed-in tariff, newer ones usually a one-off remuneration (Einmalvergütung) – in which case self-consumption and the feed-in tariff paid by the utility count.", "") }, ...rest];
})();

// Schweiz auf Englisch: Übersetzung von FAQ_CH (gleiche Aussagen, keine zusätzlichen Werte)
const FAQ_CH_EN = (() => {
  const ch = FAQ_EN[5];
  const rest = FAQ_EN.filter((f) => f !== ch).map((f, i) =>
    i === 0
      ? {
          q: f.q,
          a: "As much as its future cash flows are worth today. What matters are the subsidy and remaining term, the actual yield, operating costs and lease, upcoming replacement investments and the term of the land or roof lease. Price figures per kWp for Switzerland are being reviewed – you can obtain an assessment of your plant on request.",
        }
      : f
  );
  return [{ q: "How are plants in Switzerland valued?", a: "Using the same logic as everywhere: future cash flows are what count. In Switzerland, older plants sometimes receive an ongoing feed-in tariff, newer ones usually a one-off remuneration (Einmalvergütung) – in which case self-consumption and the feed-in tariff paid by the utility count. Enter the subsidy period and tariff from the funding decision in the calculator." }, ...rest];
})();

const TEXTE = {
  de: {
    schemaName: "Kauf und Verkauf von PV-Bestandsanlagen",
    schemaTyp: "Vermittlung laufender Photovoltaikanlagen (Dach und Freifläche) am Zweitmarkt",
    schemaPublikum: "Anlagenbetreiber, Investoren, Stadtwerke, Family Offices",
    faktenTitel: "Zweitmarkt in Zahlen",
    fakten: [
      { einheit: "Erfolgsprovision", text: "für Verkäufer – nur bei erfolgreichem Abschluss" },
      { wert: "0 €", einheit: "für Käufer", text: "Suchprofil, NDA und Datenraum kostenfrei" },
      { wert: "0 €", einheit: "Listungsgebühren", text: "keine Einstell-, Listungs- oder Datenraumgebühren" },
      { einheit: "€ je kWp", text: "übliche Preise für jüngere Anlagen mit heutigen Tarifen" },
    ],
    ablaufEyebrow: "Ablauf über die Plattform",
    ablaufTitel: "Von der Bewertung bis zur Übergabe",
    schritte: [
      { title: "Bewertung", text: "Erste Einschätzung im Rechner, dann mit Ihren Ertragsdaten und Verträgen eine belastbare Wertspanne – kostenfrei." },
      { title: "Datenraum", text: "Unterlagen hochladen, wir prüfen auf Vollständigkeit und Plausibilität. Lücken zeigen wir, bevor ein Käufer sie findet." },
      { title: "Anonymer Teaser", text: "Region, Größe, Inbetriebnahme, Vergütung und Eckdaten in der Projektbörse – ohne Standort und Namen." },
      { title: "NDA & Due Diligence", text: "Registrierte Käufer akzeptieren die Vertraulichkeitsvereinbarung, erhalten Datenraumzugriff und prüfen technisch und rechtlich." },
      { title: "Angebot & Vertrag", text: "Indikative Angebote, Absichtserklärung, Kaufvertrag – als Share Deal oder Asset Deal, mit Ihrer Beratung." },
      { title: "Übergang & Betrieb", text: "Meldungen an Netzbetreiber, Register und Vermarkter. Betriebsführung auf Wunsch weiter durch die Gruppe." },
    ],
    provisionText: `Keine Einstell-, Listungs- oder Datenraumgebühren. Verkäufer zahlen eine Erfolgsprovision von ${PROVISION.verkaeufer.text}. Käufer zahlen nichts – ${PROVISION.kaeufer.text.replace("für Investoren ", "")}.`,
    faqEyebrow: "Häufige Fragen",
    faqTitel: "Fragen zu Bestandsanlagen",
    faqLead: "Ihre Frage ist nicht dabei? Stellen Sie sie im Formular – wir antworten persönlich.",
    quer: [
      { titel: "Bewertungsrechner", text: "Ertragswert, Spanne und Sensitivität Ihrer laufenden Anlage." },
      { titel: "Bestand in der Börse", text: "Laufende Anlagen als anonymer Teaser – Details nach NDA." },
      { titel: "Für Investoren", text: "Projektrechte, baureife Projekte und Bestand – Phasenmodell und Due-Diligence-Checkliste." },
      { titel: "Warum ÖkoInvest", text: "Marktplatz, Makler oder Entwickler-Plattform – die Modelle im offenen Vergleich." },
      { titel: "Wert eines Solarparks", text: "DCF, Restlaufzeit und technische Due Diligence beim Kauf." },
      { titel: "Repowering alter Solarparks", text: "Modultausch, EEG-Regeln und Wirtschaftlichkeit." },
    ],
    ctaEyebrow: "Für Verkäufer und Käufer",
    ctaTitel: "Was ist Ihre Anlage heute wert?",
    ctaText: "Im Bewertungsrechner sehen Sie den Ertragswert in wenigen Minuten. Mit Ihren Daten machen wir daraus eine belastbare Spanne – und auf Wunsch einen vertraulichen Verkauf.",
    ctaPrimaer: "Anlage bewerten",
    ctaSekundaer: "Bestand in der Börse",
  },
  en: {
    schemaName: "Purchase and sale of operating PV plants",
    schemaTyp: "Brokerage of operating photovoltaic plants (rooftop and ground-mounted) on the secondary market",
    schemaPublikum: "Plant operators, investors, municipal utilities, family offices",
    faktenTitel: "The secondary market in figures",
    fakten: [
      { einheit: "Success fee", text: "for sellers – only on successful closing" },
      { wert: "€0", einheit: "for buyers", text: "search profile, NDA and data room free of charge" },
      { wert: "€0", einheit: "listing fees", text: "no posting, listing or data room fees" },
      { einheit: "€ per kWp", text: "usual prices for younger plants with today's tariffs" },
    ],
    ablaufEyebrow: "How it works on the platform",
    ablaufTitel: "From valuation to handover",
    schritte: [
      { title: "Valuation", text: "Initial assessment in the calculator, then a robust value range based on your yield data and contracts – free of charge." },
      { title: "Data room", text: "Upload your documents, we check them for completeness and plausibility. We point out gaps before a buyer finds them." },
      { title: "Anonymous teaser", text: "Region, size, commissioning, remuneration and key data on the project exchange – without location or names." },
      { title: "NDA & due diligence", text: "Registered buyers accept the non-disclosure agreement, receive data room access and carry out technical and legal checks." },
      { title: "Offer & contract", text: "Indicative offers, letter of intent, purchase agreement – as a share deal or asset deal, with your advisers." },
      { title: "Transfer & operation", text: "Notifications to the grid operator, registers and marketer. Operations management by the group can continue on request." },
    ],
    provisionText: `No posting, listing or data room fees. Sellers pay a success fee of ${SPANNE_EN} of the purchase price, only on successful closing. Buyers pay nothing – search profile, NDA and data room are free of charge.`,
    faqEyebrow: "Frequently asked questions",
    faqTitel: "Questions about operating plants",
    faqLead: "Your question is not listed? Ask it in the form – we will answer personally.",
    quer: [
      { titel: "Valuation calculator", text: "Income value, range and sensitivity of your operating plant." },
      { titel: "Operating assets on the exchange", text: "Operating plants as an anonymous teaser – details after NDA." },
      { titel: "For investors", text: "Project rights, ready-to-build projects and operating assets – stage model and due diligence checklist." },
      { titel: "Why ÖkoInvest", text: "Marketplace, broker or developer platform – the models compared openly." },
      { titel: "Value of a solar park", text: "DCF, remaining term and technical due diligence when buying." },
      { titel: "Repowering old solar parks", text: "Module replacement, EEG rules and economic viability." },
    ],
    ctaEyebrow: "For sellers and buyers",
    ctaTitel: "What is your plant worth today?",
    ctaText: "The valuation calculator shows you the income value in a few minutes. With your data, we turn it into a robust range – and, on request, a confidential sale.",
    ctaPrimaer: "Value your plant",
    ctaSekundaer: "Operating assets on the exchange",
  },
};

export default async function BestandsanlagenPage({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  const f = (n, s = 0) => (en ? z(n, s) : fmt(n, s));
  const faq = inhaltFuerSprache({ de: { gemeinsam: FAQ, AT: FAQ_AT, CH: FAQ_CH }, en: { gemeinsam: FAQ_EN, AT: FAQ_AT_EN, CH: FAQ_CH_EN } }, land, sprache);
  const spanne = en ? SPANNE_EN : `${fmt(PROVISION.verkaeufer.min * 100, 1)}–${fmt(PROVISION.verkaeufer.max * 100)} %`;
  const schritte = [Gauge, FolderLock, Search, ShieldCheck, FileSignature, Handshake].map((icon, i) => ({ icon, ...t.schritte[i] }));
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: t.schemaName,
    serviceType: t.schemaTyp,
    provider: { "@id": `${abs("/")}/#organization` },
    areaServed: ["DE", "AT", "CH"],
    audience: { "@type": "BusinessAudience", audienceType: t.schemaPublikum },
    url: abs(PFAD),
    description: en ? metadataEn.description : BESCHREIBUNG,
  };

  return (
    <div>
      <JsonLd daten={schema} />

      <Hero bsp={bsp} ct={BEISPIELE[1].ct} jahr={BEISPIELE[1].jahr} provision={spanne} boerse={BOERSE} />
      <FaktenLeiste
        titel={t.faktenTitel}
        fakten={[
          { icon: BadgePercent, wert: spanne, ...t.fakten[0] },
          { icon: Search, ...t.fakten[1] },
          { icon: ShieldCheck, ...t.fakten[2] },
          { icon: Gauge, wert: `${f(PHASE_BESTAND.preisProKwp.min)}–${f(PHASE_BESTAND.preisProKwp.max)}`, ...t.fakten[3] },
        ]}
      />
      <Perspektiven />
      <Bewertung beispiele={BEISPIELE} band={PHASE_BESTAND.preisProKwp} bestand={BESTAND} merchantCt={ERLOESE.merchantCt} stand={en ? datumText(STAND, "en") : STAND} />
      <Datenraum />
      <Zeitleiste
        titelId="ablauf-titel"
        eyebrow={t.ablaufEyebrow}
        titel={t.ablaufTitel}
        ton="sand"
        schritte={schritte}
      />
      <Provision
        text={t.provisionText}
        beispielWert={en ? `€${z(bsp.wert / 1e6, 2)}m` : fmtMio(bsp.wert, 2)}
        von={f(Math.round((bsp.wert * PROVISION.verkaeufer.min) / 1000))}
        bis={f(Math.round((bsp.wert * PROVISION.verkaeufer.max) / 1000))}
        maxProzent={PROVISION.verkaeufer.max * 100}
        boerse={BOERSE}
      />
      <Anfrage />

      <Section tone="sand" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow={t.faqEyebrow} title={t.faqTitel} lead={t.faqLead} />
          <Faq items={faq} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: pfad("/rechner/bestandsanlage"), ...t.quer[0] },
          { href: BOERSE, ...t.quer[1] },
          { href: "/investoren", ...t.quer[2] },
          { href: pfad("/warum-oekoinvest"), ...t.quer[3] },
          { href: "/ratgeber/solarpark-bestandsanlage-wert", ...t.quer[4] },
          { href: "/ratgeber/repowering-solarpark", ...t.quer[5] },
        ]}
      />

      <CtaBand
        eyebrow={t.ctaEyebrow}
        title={t.ctaTitel}
        text={t.ctaText}
        primary={{ label: t.ctaPrimaer, href: pfad("/rechner/bestandsanlage") }}
        secondary={{ label: t.ctaSekundaer, href: BOERSE }}
      />
    </div>
  );
}

export const generateMetadata = seitenMetadata("/bestandsanlagen", metadata, { en: metadataEn });
