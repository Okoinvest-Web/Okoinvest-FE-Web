// src/app/(stamm)/rechner/gewerbestrom-check/page.js – Rechnungs-Check Gewerbestrom (Welle 3, Paket B5, Preisradar Schritt 1)
//
// Deutschland rechnet (Werte aus src/lib/fakten/daten/gewerbestrom-de.js, Logik src/lib/rechner/gewerbestrom.js).
// Österreich (Welle 4, Paket ATSNE): Vorbereitungs-Maske für die SNE-VO 2027 – Netzebene, Jahresverbrauch,
// Leistung werden erfasst, das Ergebnis bleibt ein Länderhinweis mit Zeitplan („erwartet Q1 2027“),
// keine geschätzten Werte (GewerbestromCheckAT, Fakten src/lib/fakten/daten/gewerbestrom-at.js,
// Logik src/lib/rechner/gewerbestromAt.js, Nachtrag scripts/at-sne-nachtrag.md).
// Schweiz: Länderhinweis (in Vorbereitung).
// noindex bis zur Fachprüfung (src/lib/land/seiten.js index: false; englisch src/lib/sprache/seiten.js).
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur; Regeln: src/lib/sprache/woerterbuch.js).

import Link from "@/components/Land/Link";
import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import GewerbestromCheck from "@/components/Rechner/GewerbestromCheck";
import GewerbestromCheckAT from "@/components/Rechner/GewerbestromCheckAT";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand, NurDEBlock } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";
import { boerseBase, werte } from "@/lib/rechner/gewerbestrom";

const PFAD = seitenPfad("/rechner/gewerbestrom-check");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Gewerbestrom-Rechnung prüfen: Rechnungs-Check | ÖkoInvest",
  description:
    "Stromrechnung Ihres Betriebs zerlegen: Umlagen, Stromsteuer, Konzessionsabgabe und Börsenwert (SMARD) gegen Ihren Energieanteil. Jetzt Rechnung prüfen.",
  keywords: ["Gewerbestrom Rechnung prüfen", "Strompreis Gewerbe zusammensetzung", "Umlagen 2026 Strom", "Konzessionsabgabe Sondervertragskunde", "Stromsteuer Entlastung § 9b", "Lastgang auswerten"],
});

// Fachprüfung offen (Register index: false): auch die gemeinsame Seite trägt noindex
metadata.robots = { index: false, follow: true };

const metadataEn = rechnerMetadataEn({
  title: "Check your commercial electricity bill | ÖkoInvest",
  description:
    "Break down your business electricity bill: levies, electricity tax, concession fee and exchange value (SMARD) vs your energy component. Check your bill now.",
  keywords: ["check commercial electricity bill Germany", "business electricity price breakdown", "German electricity levies 2026", "concession fee special contract", "electricity tax relief § 9b", "load profile analysis"],
});

// AT zeigt seit Welle 4 (Paket ATSNE) die Vorbereitungs-Maske statt eines Hinweises; nur CH bleibt gesperrt.
const LAND_HINWEISE = {
  CH: {
    de: "Den Rechnungs-Check gibt es bisher nur für Deutschland. Eine Fassung für die Schweiz ist in Vorbereitung.",
    en: "The bill check is currently available for Germany only. A version for Switzerland is in preparation.",
  },
};

function annahmenZeilen(sprache) {
  const w = werte();
  const f = formate(sprache);
  const ct = (x) => `${f.fmt(x, 3)} ct/kWh`;
  const en = sprache === "en";
  const tarif = w.kavTarif.wert.map((s) => f.fmt(s.ct, 2)).join(" · ");
  const m = w.monate.wert;
  return en
    ? [
        ["CHP levy (KWKG) 2026", ct(w.kwkg.wert)],
        ["Offshore grid levy 2026", ct(w.offshore.wert)],
        ["Surcharge for special grid use, first GWh", ct(w.aufschlagA.wert)],
        ["… above 1 GWh (manufacturing > 4% costs)", `${ct(w.aufschlagB.wert)} (${f.fmt(w.aufschlagC.wert, 3)})`],
        ["Electricity tax, standard rate", ct(w.stromsteuer.wert)],
        ["Electricity tax relief § 9b", `${ct(w.entlastung.wert)}, above €${f.fmt(w.sockel.wert)}/yr`],
        ["Concession fee, special contract", ct(w.kavSonder.wert)],
        ["Concession fee, tariff customer", `${tarif} ct/kWh`],
        ["Exchange value day-ahead (12 months)", `${f.fmt(boerseBase(m), 2)} ct/kWh`],
        ["Usual mark-up over exchange value (estimate)", `${f.fmt(w.aufschlag.wert.min, 1)}–${f.fmt(w.aufschlag.wert.max, 1)} ct/kWh`],
        ["Exchange data period", `${m[0].monat} to ${m[m.length - 1].monat}`],
      ]
    : [
        ["KWKG-Umlage 2026", ct(w.kwkg.wert)],
        ["Offshore-Netzumlage 2026", ct(w.offshore.wert)],
        ["Aufschlag besondere Netznutzung, erste GWh", ct(w.aufschlagA.wert)],
        ["… über 1 GWh (produzierend > 4 % Kosten)", `${ct(w.aufschlagB.wert)} (${f.fmt(w.aufschlagC.wert, 3)})`],
        ["Stromsteuer Regelsatz", ct(w.stromsteuer.wert)],
        ["Stromsteuer-Entlastung § 9b", `${ct(w.entlastung.wert)}, über ${f.fmt(w.sockel.wert)} €/Jahr`],
        ["Konzessionsabgabe Sondervertrag", ct(w.kavSonder.wert)],
        ["Konzessionsabgabe Tarifkunde", `${tarif} ct/kWh`],
        ["Börsenwert Day-Ahead (12 Monate)", `${f.fmt(boerseBase(m), 2)} ct/kWh`],
        ["Üblicher Aufschlag über Börse (Schätzung)", `${f.fmt(w.aufschlag.wert.min, 1)}–${f.fmt(w.aufschlag.wert.max, 1)} ct/kWh`],
        ["Zeitraum Börsendaten", `${m[0].monat.split("-").reverse().join("/")} bis ${m[m.length - 1].monat.split("-").reverse().join("/")}`],
      ];
}

const FAQ = [
  {
    q: "Welche Werte brauche ich aus meiner Stromrechnung?",
    nurDE: "Rechnungsangaben",
    a: "Jahresverbrauch in kWh, den Arbeitspreis in ct/kWh (netto), den Grundpreis und das Netzentgelt. Netzbetreiber und Lieferanten müssen das Netzentgelt und den Messstellenbetrieb auf der Rechnung getrennt ausweisen (§ 40 EnWG). Bei Leistungsmessung steht dort auch die höchste Leistung in kW.",
  },
  {
    q: "Was ist „amtlich“, was „berechnet“, was „Schätzung“?",
    nurDE: "Quellen",
    a: "Amtlich sind Werte aus Gesetz oder amtlicher Veröffentlichung: Umlagen (netztransparenz.de), Stromsteuer (StromStG) und die Höchstbeträge der Konzessionsabgabe (KAV). Berechnet sind Ihr Energieanteil (Rechnung minus amtliche Bestandteile minus Netzentgelt) und der Börsenwert aus den SMARD-Daten der Bundesnetzagentur. Eine Schätzung ist nur der übliche Aufschlag der Lieferanten über dem Börsenwert – er ist als Spanne angegeben.",
  },
  {
    q: "Warum steht bei mir „marktgerecht“?",
    a: "Weil Ihr Energieanteil in der üblichen Spanne liegt. Das ist ein ehrliches Ergebnis: Nicht jeder Vertrag ist zu teuer. Achten Sie dann vor allem auf Laufzeit, Kündigungsfrist und Preisanpassungsklauseln.",
  },
  {
    q: "Wird mein Lastgang hochgeladen?",
    a: "Nein. Die Datei wird ausschließlich in Ihrem Browser gelesen und ausgewertet. Übrig bleiben Jahresverbrauch, Spitzenleistung und ein Profilfaktor. Nur wenn Sie einen Bericht anfordern, gehen diese drei Zahlen mit Ihren übrigen Eingaben an uns – nie die Datei selbst.",
  },
  {
    q: "Wie hoch ist die Konzessionsabgabe für meinen Betrieb?",
    nurDE: "Konzessionsabgabe",
    a: "Das hängt von der Kundengruppe ab. Sondervertragskunden zahlen höchstens 0,11 ct/kWh. In Niederspannung gilt ein Betrieb als Tarifkunde, solange die gemessene Leistung nicht in mindestens zwei Monaten über 30 kW liegt und der Verbrauch nicht über 30.000 kWh im Jahr. Dann richtet sich der Höchstbetrag nach der Einwohnerzahl der Gemeinde (1,32 bis 2,39 ct/kWh).",
  },
  {
    q: "Bekomme ich Stromsteuer zurück?",
    nurDE: "Stromsteuer",
    a: "Unternehmen des Produzierenden Gewerbes und der Land- und Forstwirtschaft erhalten auf Antrag beim Hauptzollamt 2,0 ct/kWh zurück (§ 9b StromStG), soweit der Betrag im Jahr 250 € übersteigt. Auf der Rechnung steht meist der Regelsatz von 2,05 ct/kWh – die Entlastung kommt nachträglich.",
  },
  {
    q: "Was ist mit den Umlagen 2027?",
    nurDE: "Umlagen",
    a: "Die Übertragungsnetzbetreiber veröffentlichen KWKG-Umlage, Offshore-Netzumlage und Aufschlag für besondere Netznutzung für 2027 bis zum 25. Oktober 2026. Sobald sie veröffentlicht und geprüft sind, zeigt der Check, was sich für Ihren Verbrauch ändert.",
  },
  {
    q: "Gibt es den Check auch für Österreich und die Schweiz?",
    a: "Für Österreich können Sie Netzebene, Jahresverbrauch und Leistung bereits erfassen – gerechnet wird erst, wenn die neuen Systemnutzungsentgelte (SNE-VO 2027) im RIS veröffentlicht und geprüft sind, erwartet im ersten Quartal 2027. Für die Schweiz ist der Check in Vorbereitung. Zahlen, Recht und Rechner bleiben dabei je Land getrennt.",
  },
];

const FAQ_EN = [
  {
    q: "Which figures do I need from my electricity bill?",
    nurDE: "Bill details",
    a: "Annual consumption in kWh, the energy price in ct/kWh (net), the standing charge and the grid fee. Grid operators and suppliers must show the grid fee and metering separately on the bill (§ 40 EnWG). With metered demand, the peak demand in kW is shown there too.",
  },
  {
    q: "What is “official”, what is “calculated”, what is an “estimate”?",
    nurDE: "Sources",
    a: "Official values come from law or official publications: levies (netztransparenz.de), electricity tax (StromStG) and the maximum concession fees (KAV). Calculated are your energy component (bill minus official components minus grid fee) and the exchange value from the Federal Network Agency’s SMARD data. Only the suppliers’ usual mark-up over the exchange value is an estimate – it is shown as a range.",
  },
  {
    q: "Why does my result say “in line with the market”?",
    a: "Because your energy component lies within the usual range. That is an honest result: not every contract is too expensive. In that case, pay particular attention to the term, notice period and price adjustment clauses.",
  },
  {
    q: "Is my load profile uploaded?",
    a: "No. The file is read and analysed exclusively in your browser. What remains is the annual consumption, peak demand and a profile factor. Only if you request a report are these three numbers sent to us with your other inputs – never the file itself.",
  },
  {
    q: "How high is the concession fee for my business?",
    nurDE: "Concession fee",
    a: "That depends on the customer group. Special contract customers pay at most 0.11 ct/kWh. At low voltage, a business counts as a tariff customer unless its metered demand exceeds 30 kW in at least two months and its consumption exceeds 30,000 kWh a year. The maximum then depends on the municipality’s population (1.32 to 2.39 ct/kWh).",
  },
  {
    q: "Can I get electricity tax back?",
    nurDE: "Electricity tax",
    a: "Manufacturing companies and agricultural and forestry businesses receive 2.0 ct/kWh back on application to the main customs office (§ 9b StromStG), insofar as the amount exceeds €250 a year. The bill usually shows the standard rate of 2.05 ct/kWh – the relief comes afterwards.",
  },
  {
    q: "What about the 2027 levies?",
    nurDE: "Levies",
    a: "The transmission system operators publish the CHP levy, offshore grid levy and surcharge for special grid use for 2027 by 25 October 2026. As soon as they are published and checked, the tool shows what changes for your consumption.",
  },
  {
    q: "Is the check also available for Austria and Switzerland?",
    a: "For Austria you can already record your grid level, annual consumption and peak demand – calculations will start once the new system usage charges (SNE-VO 2027) have been published in the RIS and verified, expected in the first quarter of 2027. For Switzerland the check is in preparation. Figures, law and calculators remain separate for each country.",
  },
];

const DE = {
  breadcrumb: "Rechnungs-Check Gewerbestrom",
  eyebrow: "Für Unternehmen · Rechnungs-Check",
  title: (
    <>
      Ist Ihr Gewerbestrom <span className="ov-text-gradient-light">zu teuer?</span>
    </>
  ),
  lead: "Werte aus der Stromrechnung eingeben: Wir ziehen amtliche Umlagen, Stromsteuer, Konzessionsabgabe und Ihr Netzentgelt ab und vergleichen Ihren Energieanteil mit dem Börsenwert. Ehrlich – auch wenn Ihr Vertrag marktgerecht ist.",
  chips: ["Amtliche Werte mit Quelle", "Börsenwert aus SMARD", "Lastgang nur im Browser", "Ohne Anbieterranking"],
  app: {
    name: "Rechnungs-Check Gewerbestrom",
    description: "Zerlegt den Strompreis eines Gewerbebetriebs in amtliche Bestandteile, Netzentgelt und Energieanteil und vergleicht den Energieanteil mit Börsenwert und üblichem Aufschlag.",
    featureList: [
      "Umlagen 2026, Stromsteuer und Konzessionsabgabe aus amtlichen Quellen",
      "Energieanteil aus Ihrer Rechnung berechnet",
      "Börsenwert Day-Ahead aus SMARD, gewichtet mit Lastprofil oder Lastgang",
      "Qualitätsstufen amtlich, berechnet, Schätzung",
      "Preisradar der amtlichen Bestandteile je Bundesland",
      "Bericht mit Rechenweg und Annahmenbuch",
    ],
  },
  quellen: [
    { name: "netztransparenz.de – Umlagen", url: "https://www.netztransparenz.de/de-de/Erneuerbare-Energien-und-Umlagen/KWKG/KWKG-Umlage" },
    { name: "StromStG §§ 3, 9b", url: "https://www.gesetze-im-internet.de/stromstg/__9b.html" },
    { name: "KAV § 2", url: "https://www.gesetze-im-internet.de/kav/__2.html" },
    { name: "Bundesnetzagentur | SMARD.de (CC BY 4.0)", url: "https://www.smard.de/home/marktdaten" },
    { name: "Aufschlag: eigene Einschätzung ÖkoInvest" },
  ],
  faqTitel: "Rechnungs-Check – gut zu wissen",
  querverweise: [
    { href: seitenPfad("/reststrom"), titel: "Reststrom-Pool Mittelstand", text: "Gemeinsam und strukturiert beschaffen – Ablauf und Voraussetzungen." },
    { href: seitenPfad("/rechner/ppa"), titel: "PPA-Rechner", text: "Solarstrom zum Festpreis: Ersparnis und Risiko in drei Szenarien." },
    { href: seitenPfad("/energie-live"), titel: "Strommarkt live", text: "Börsenpreis, negative Preise und Solar-Capture-Rate in Echtzeit." },
  ],
  cta: {
    eyebrow: "Reststrom-Pool",
    title: "Vertrag läuft aus? Rechtzeitig vergleichen.",
    text: "Schicken Sie uns Verbrauch oder Lastgang und Ihren Kündigungstermin. Wir prüfen Profil und Preisbestandteile – kostenlos und unverbindlich.",
    primary: { label: "Pool-Angebot anfragen", href: seitenPfad("/reststrom#anfrage") },
    secondary: { label: "Wie der Pool funktioniert", href: seitenPfad("/reststrom") },
  },
};

const EN = {
  breadcrumb: "Commercial electricity bill check",
  eyebrow: "For businesses · bill check",
  title: (
    <>
      Is your business electricity <span className="ov-text-gradient-light">too expensive?</span>
    </>
  ),
  lead: "Enter the figures from your electricity bill: we deduct official levies, electricity tax, the concession fee and your grid fee and compare your energy component with the exchange value. Honestly – even if your contract is in line with the market.",
  chips: ["Official values with source", "Exchange value from SMARD", "Load profile stays in your browser", "No supplier ranking"],
  app: {
    name: "Commercial electricity bill check",
    description: "Breaks down a business’s electricity price into official components, grid fee and energy component and compares the energy component with the exchange value and the usual mark-up.",
    featureList: [
      "2026 levies, electricity tax and concession fee from official sources",
      "Energy component calculated from your bill",
      "Day-ahead exchange value from SMARD, weighted by load profile",
      "Quality levels official, calculated, estimate",
      "Price radar of official components by federal state",
      "Report with calculation method and assumptions",
    ],
  },
  quellen: [
    { name: "netztransparenz.de – levies (German TSOs)" },
    { name: "German Electricity Tax Act (StromStG) §§ 3, 9b" },
    { name: "Concession Fee Ordinance (KAV) § 2" },
    { name: "Bundesnetzagentur | SMARD.de (CC BY 4.0)" },
    { name: "Mark-up: ÖkoInvest’s own estimate" },
  ],
  faqTitel: "Bill check – good to know",
  querverweise: [
    { titel: "Residual power pool for SMEs", text: "Procure together and in a structured way – process and requirements." },
    { titel: "PPA calculator", text: "Solar power at a fixed price: savings and risk in three scenarios." },
    { titel: "Power market live", text: "Exchange price, negative prices and solar capture rate in real time." },
  ],
  cta: {
    eyebrow: "Residual power pool",
    title: "Contract ending? Compare in good time.",
    text: "Send us your consumption or load profile and your notice date. We check the profile and price components – free of charge and without obligation.",
    primary: { label: "Request a pool offer" },
    secondary: { label: "How the pool works" },
  },
};

// Österreich (Paket ATSNE): Quellen und Methodik-Text der Vorbereitungs-Schiene – nur belegte Aussagen (RIS)
const QUELLEN_AT = {
  de: [
    { name: "RIS – Systemnutzungsentgelte-Verordnung 2018 (SNE-V 2018)", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20010107" },
    { name: "RIS – ElWOG 2010, § 63 Netzebenen", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20007045" },
    { name: "RIS – Elektrizitätsabgabegesetz, § 4", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10005027" },
    { name: "RIS – Erneuerbaren-Ausbau-Gesetz, § 75 Erneuerbaren-Förderbeitrag", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20011619" },
    { name: "E-Control – Marktkonsultation SNE-GV (Zeitplan neue Entgelte 2027)", url: "https://www.e-control.at/documents/1785851/0/Marktkonsultation+SNE-GV+Teil+1_20260219_1v0.pdf/c37b0eeb-080d-fd5c-9c4a-86b75b5f2051?t=1771832185841" },
  ],
  en: [
    { name: "RIS – System usage charges ordinance 2018 (SNE-V 2018)", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20010107" },
    { name: "RIS – ElWOG 2010, § 63 grid levels", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20007045" },
    { name: "RIS – Austrian Electricity Levy Act, § 4", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10005027" },
    { name: "RIS – Renewables Expansion Act (EAG), § 75 renewables support contribution", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20011619" },
    { name: "E-Control – market consultation SNE-GV (timeline for the new 2027 charges)", url: "https://www.e-control.at/documents/1785851/0/Marktkonsultation+SNE-GV+Teil+1_20260219_1v0.pdf/c37b0eeb-080d-fd5c-9c4a-86b75b5f2051?t=1771832185841" },
  ],
};

// Auf /at beschreibt der Seitenkopf die AT-Vorbereitungs-Schiene statt des DE-Rechners
// (DE-Begriffe wie Stromsteuer, Konzessionsabgabe oder SMARD gehören nicht auf die Österreich-Seite).
const AT_KOPF = {
  de: {
    lead: "Österreich bereitet sich auf die neuen Systemnutzungsentgelte 2027 vor: Erfassen Sie Netzebene, Jahresverbrauch und Leistung schon jetzt – gerechnet wird, sobald die neuen Entgelte im RIS kundgemacht und geprüft sind. Bis dahin zeigen wir bewusst keine geschätzten Werte.",
    chips: ["Nur belegte Angaben (RIS)", "Netzebene und Benutzungsstunden", "Keine geschätzten Entgelte", "Erinnerung zur Kundmachung"],
    app: {
      name: "Rechnungs-Check Gewerbestrom (Österreich: Vorbereitung)",
      description: "Erfasst Netzebene, Jahresverbrauch und Leistung für den österreichischen Rechnungs-Check und dokumentiert die Struktur der Systemnutzungsentgelte nach der geltenden SNE-V 2018 – Werte folgen nach Kundmachung der neuen Entgelte 2027 im RIS.",
      featureList: [
        "Netzebene nach § 63 ElWOG 2010 wählen",
        "Benutzungsstunden aus Jahresverbrauch und Leistung (Plausibilität)",
        "Entgeltstruktur der geltenden SNE-V 2018, am RIS geprüft",
        "Abgaben-Rechtsgrundlagen: ElAbgG und § 75 EAG",
        "Erinnerung, sobald die Werte 2027 eingepflegt sind",
      ],
    },
  },
  en: {
    lead: "Austria is preparing for the new 2027 system usage charges: record your grid level, annual consumption and peak demand now – calculations start once the new charges are published and verified in the RIS. Until then we deliberately show no estimated values.",
    chips: ["Only substantiated statements (RIS)", "Grid level and utilisation hours", "No estimated charges", "Reminder on publication"],
    app: {
      name: "Commercial electricity bill check (Austria: in preparation)",
      description: "Records grid level, annual consumption and peak demand for the Austrian bill check and documents the structure of system usage charges under the current SNE-V 2018 – values follow once the new 2027 charges are published in the RIS.",
      featureList: [
        "Choose your grid level under § 63 ElWOG 2010",
        "Utilisation hours from annual consumption and peak demand (plausibility)",
        "Charge structure of the current SNE-V 2018, verified in the RIS",
        "Legal basis of levies: ElAbgG and § 75 EAG",
        "Reminder once the 2027 values are in",
      ],
    },
  },
};

function ErklaerungAt({ en }) {
  return en ? (
    <div className="ov-prose">
      <h2>Austria: preparing for the SNE-VO 2027</h2>
      <p>
        From 1 January 2027, new system usage charges under the Austrian Electricity Industry Act (ElWG) apply: E-Control first issues a framework ordinance (SNE-GV) and, building on it, the tariff ordinance (SNE-TV). Until the new ordinance is published in the official legal information system (RIS) and verified at the source, this check deliberately shows <strong>no estimated Austrian charges</strong> – values follow after publication in the RIS, expected in Q1 2027.
      </p>
      <p>
        What is documented already, verified in the RIS: today’s charges follow the SNE-V 2018 and are set per grid area and grid level (levels 1–7 under § 63 ElWOG 2010). The grid bill contains the grid usage charge (energy and, with metered demand, demand rate), the grid loss charge, one-off grid provision charges and metering charges. On top of that, end consumers pay the electricity levy (standard rate under § 4 ElAbgG) and the renewables support contribution under § 75 EAG, whose annual rate is set by ordinance.
      </p>
      <p>You can record your grid level, annual consumption and peak demand now – and have us remind you when the 2027 values are in.</p>
      <h3>Sources (checked at the original)</h3>
      <ul>
        {QUELLEN_AT.en.map((q) => (
          <li key={q.url + q.name}>
            <a href={q.url} target="_blank" rel="noreferrer">
              {q.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  ) : (
    <div className="ov-prose">
      <h2>Österreich: Vorbereitung auf die SNE-VO 2027</h2>
      <p>
        Ab dem 1. Jänner 2027 gelten in Österreich neue Systemnutzungsentgelte nach dem Elektrizitätswirtschaftsgesetz (ElWG): Die E-Control erlässt zuerst eine Grundsatzverordnung (SNE-GV) und darauf aufbauend die Tarifverordnung (SNE-TV). Bis die neue Verordnung im Rechtsinformationssystem des Bundes (RIS) kundgemacht und am Original geprüft ist, zeigt dieser Check bewusst <strong>keine geschätzten österreichischen Entgelte</strong> – die Werte folgen nach Veröffentlichung im RIS, erwartet im ersten Quartal 2027.
      </p>
      <p>
        Was heute schon dokumentiert ist, am RIS geprüft: Die geltenden Entgelte folgen der SNE-V 2018 und sind je Netzbereich und Netzebene festgelegt (Ebenen 1–7 nach § 63 ElWOG 2010). Auf der Netzrechnung stehen das Netznutzungsentgelt (Arbeitspreis und – bei Leistungsmessung – Leistungspreis), das Netzverlustentgelt, einmalige Netzbereitstellungsentgelte und Entgelte für Messleistungen. Dazu kommen die Elektrizitätsabgabe (Regelsatz nach § 4 ElAbgG) und der Erneuerbaren-Förderbeitrag nach § 75 EAG, dessen Jahressatz per Verordnung festgelegt wird.
      </p>
      <p>Netzebene, Jahresverbrauch und Leistung können Sie jetzt schon erfassen – und sich erinnern lassen, sobald die Werte 2027 eingepflegt sind.</p>
      <h3>Quellen (am Original geprüft)</h3>
      <ul>
        {QUELLEN_AT.de.map((q) => (
          <li key={q.url + q.name}>
            <a href={q.url} target="_blank" rel="noreferrer">
              {q.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function GewerbestromCheckPage({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze({ de: DE, en: EN }, sprache);
  const at = land === "AT";
  const kopf = at ? (en ? AT_KOPF.en : AT_KOPF.de) : t;
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="gewerbestrom-check"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={kopf.lead}
      chips={kopf.chips}
      app={kopf.app}
      rechner={at ? <GewerbestromCheckAT /> : <GewerbestromCheck />}
      landHinweise={LAND_HINWEISE}
      erklaerung={
        at ? <ErklaerungAt en={en} /> : (
        <NurDEBlock land={land} thema="Rechenwerte und Annahmen" themaEn="Figures and assumptions">
          {en ? (
            <div className="ov-prose">
              <h2>How the bill check works</h2>
              <p>
                Your electricity price consists of parts you cannot influence and one part you can. <strong>Official</strong> and the same for every business: the levies under the Energy Financing Act, the surcharge for special grid use, the electricity tax and the concession fee, whose maximum depends on the customer group and the size of the municipality. Your <strong>grid fee</strong> is set by your grid operator – you take it from your bill.
              </p>
              <p>
                What remains is your <strong>energy component</strong>: procurement, structuring, balancing and sales. We compare it with the <strong>exchange value</strong> – the day-ahead price of the last twelve months from the Federal Network Agency’s SMARD data, weighted with your load profile – plus the usual supplier mark-up. If your energy component lies within this range, your contract is in line with the market.
              </p>
              <h3>What the check cannot do</h3>
              <ul>
                <li>Assess your contract terms: term, notice period and price adjustment clauses are often more important than one cent.</li>
                <li>Replace the forward market: a contract signed a year ago reflects the prices of that time.</li>
                <li>Name suppliers: we deliberately do not rank providers.</li>
              </ul>
              <p>
                If the result suggests that procurement is worthwhile, the <Link href={seitenPfad("/reststrom")}>residual power pool</Link> shows how businesses procure together.
              </p>
            </div>
          ) : (
            <div className="ov-prose">
              <h2>So rechnet der Rechnungs-Check</h2>
              <p>
                Ihr Strompreis besteht aus Teilen, die Sie nicht beeinflussen können, und einem, den Sie verhandeln. <strong>Amtlich</strong> und für jeden Betrieb gleich sind die Umlagen nach
                dem Energiefinanzierungsgesetz, der Aufschlag für besondere Netznutzung, die Stromsteuer und die Konzessionsabgabe, deren Höchstbetrag von Kundengruppe und Gemeindegröße abhängt.
                Ihr <strong>Netzentgelt</strong> legt Ihr Netzbetreiber fest – Sie übernehmen es aus der Rechnung.
              </p>
              <p>
                Übrig bleibt Ihr <strong>Energieanteil</strong>: Beschaffung, Strukturierung, Bilanzkreis und Vertrieb. Wir vergleichen ihn mit dem <strong>Börsenwert</strong> – dem Day-Ahead-Preis der
                letzten zwölf Monate aus den SMARD-Daten der Bundesnetzagentur, gewichtet mit Ihrem Lastprofil – plus dem üblichen Aufschlag der Lieferanten. Liegt Ihr Energieanteil in dieser Spanne,
                ist Ihr Vertrag marktgerecht.
              </p>
              <h3>Was der Check nicht kann</h3>
              <ul>
                <li>Ihre Vertragsbedingungen bewerten: Laufzeit, Kündigungsfrist und Preisanpassungsklauseln sind oft wichtiger als ein Cent.</li>
                <li>Den Terminmarkt ersetzen: Ein Vertrag, der vor einem Jahr geschlossen wurde, spiegelt die Preise von damals.</li>
                <li>Anbieter nennen: Wir erstellen bewusst keine Rangliste von Lieferanten.</li>
              </ul>
              <p>
                Zeigt das Ergebnis, dass sich die Beschaffung lohnt, erklärt der <Link href={seitenPfad("/reststrom")}>Reststrom-Pool</Link>, wie Unternehmen gemeinsam beschaffen.
              </p>
            </div>
          )}
        </NurDEBlock>
        )
      }
      annahmen={annahmenZeilen(sprache)}
      quellen={t.quellen}
      faq={faqFuerLand(uebersetze({ de: FAQ, en: FAQ_EN }, sprache), land, { sprache })}
      faqTitel={t.faqTitel}
      querverweise={t.querverweise}
      cta={t.cta}
    />
  );
}

export const generateMetadata = seitenMetadata("/rechner/gewerbestrom-check", metadata, { en: metadataEn });
