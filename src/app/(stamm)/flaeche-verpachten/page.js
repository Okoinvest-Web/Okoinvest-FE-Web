// src/app/flaeche-verpachten/page.js – Landingpage für Flächeneigentümer
//
// Sprachmodell: feste Texte im Wörterbuch TEXTE (en nur Texte), Länderinhalt AT und CH über inhaltFuerSprache().

import { CalendarClock, HandCoins, Landmark, Scale, Wallet } from "lucide-react";

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import { Faktenleiste } from "@/components/Flaeche/Seite/teile";
import Hero from "@/components/Flaeche/Verpachten/Hero";
import Pachtmodelle from "@/components/Flaeche/Verpachten/Pachtmodelle";
import { Steuern, Vertrag } from "@/components/Flaeche/Verpachten/Vertrag";
import { Anfrage, Pruefung, Weg } from "@/components/Flaeche/Verpachten/Ablauf";
import { abs } from "@/data/site";
import { PACHT, PROVISION } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import JsonLd from "@/components/JsonLd";
import { pfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { inhaltFuerSprache, uebersetze } from "@/lib/sprache/woerterbuch";
import { fmtZahl } from "@/lib/sprache/format";
import { chTexte } from "@/data/laender/ch/schreibung";

const PFAD = pfad("/flaeche-verpachten");
const TITEL = "Fläche für Solarpark verpachten | ÖkoInvest";
const BESCHREIBUNG =
  "Acker oder Grünland für einen Solarpark verpachten: Pachtmodelle, Vertrag, Rückbausicherheit, Steuern und Ablauf bis zur ersten Pacht. Jetzt Fläche melden.";

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
    images: [{ url: abs("/img/freiflaeche-begehung.jpg"), width: 1280, height: 852, alt: "Begehung einer Fläche für einen Solarpark" }],
  },
};

const FAKTEN_GEMEINSAM = [
  { icon: Wallet, wert: `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)}`, einheit: "€ je Hektar und Jahr", text: `übliche Solarpacht im DACH-Raum, typisch um ${fmt(PACHT.freiflaecheProHa.mittel)} €` },
  { icon: CalendarClock, wert: `${PACHT.laufzeit} J.`, einheit: "Laufzeit", text: `ab Inbetriebnahme, dazu ${PACHT.verlaengerung}` },
  { icon: HandCoins, wert: `${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} €`, einheit: "Reservierungsprämie", text: "je Hektar und Jahr bis Baubeginn – Sie bewirtschaften weiter" },
  { icon: Landmark, wert: "0 €", einheit: "Kosten für Sie", text: `Prüfung, Angebot, Vertrag und Notar – ${PROVISION.flaeche.text}` },
];

const FAQ_GEMEINSAM = [
  {
    q: "Wie viel Pacht bekomme ich für einen Solarpark?",
    a: `Für Freiflächen-PV liegen die Pachten im DACH-Raum derzeit meist zwischen ${fmt(PACHT.freiflaecheProHa.min)} und ${fmt(PACHT.freiflaecheProHa.max)} € je Hektar und Jahr, typisch um ${fmt(PACHT.freiflaecheProHa.mittel)} €. Entscheidend sind Netzanschluss, Größe, Einstrahlung und ob die Fläche in der EEG-Kulisse liegt. Das ist ein Vielfaches der üblichen Ackerpacht von durchschnittlich rund ${fmt(PACHT.ackerProHa)} € je Hektar.`,
  },
  {
    q: "Kostet mich die Prüfung oder der Vertrag etwas?",
    a: `Nein. ${PROVISION.flaeche.text[0].toUpperCase()}${PROVISION.flaeche.text.slice(1)} – Flächencheck, Pachtangebot, Vertragsentwurf und Notartermin für die Dienstbarkeit tragen wir. Eine anwaltliche oder steuerliche Prüfung auf Ihrer Seite empfehlen wir ausdrücklich; auf Wunsch beteiligen wir uns an den Kosten.`,
  },
  {
    q: "Ab wann wird die Pacht gezahlt?",
    a: `Die volle Pacht beginnt in der Regel mit Baubeginn oder Inbetriebnahme. Bis dahin – meist 2 bis 4 Jahre – zahlen wir eine Reservierungsprämie von typischerweise ${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} € je Hektar und Jahr, und Sie bewirtschaften die Fläche weiter wie bisher.`,
  },
  {
    q: "Was passiert, wenn der Solarpark doch nicht gebaut wird?",
    a: "Dann endet der Vertrag nach Ablauf einer vereinbarten Frist automatisch oder durch Rücktritt, die Dienstbarkeit wird gelöscht und Sie haben Ihre Fläche uneingeschränkt zurück. Bereits gezahlte Reservierungsprämien behalten Sie.",
  },
  {
    q: "Kann ich die Fläche während der Laufzeit verkaufen oder vererben?",
    a: "Ja. Der Pachtvertrag und die Dienstbarkeit im Grundbuch gehen auf Käufer oder Erben über – die Pacht auch. Für die Erbschaftsteuer kann die Verpachtung an einen Solarpark allerdings nachteilig sein; lassen Sie das vor der Unterschrift steuerlich prüfen.",
  },
  {
    q: "Was ist, wenn ich die Fläche bereits an einen Landwirt verpachtet habe?",
    a: "Das ist häufig. Landpachtverträge lassen sich meist mit Frist kündigen oder für Teilflächen anpassen. Wir planen die Kündigungsfristen in den Zeitplan ein und sprechen auf Wunsch mit Ihrem Pächter – oft kann er die Pflege der Fläche, etwa durch Beweidung, übernehmen.",
  },
  {
    q: "Wie sicher ist der Rückbau nach 30 Jahren?",
    a: "Die Rückbaupflicht steht im Vertrag und in der Dienstbarkeit. Zusätzlich hinterlegt der Betreiber vor Baubeginn eine Rückbaubürgschaft einer Bank oder Versicherung. Fällt der Betreiber aus, kann aus der Bürgschaft zurückgebaut werden.",
  },
];

// ---------------------------------------------------------------------------------------------
// Österreich (Länderinhalt, src/lib/land/inhalte.js). Nur Aussagen mit Primärquelle:
//   § 33 EAG (RIS, abgerufen 04.10.2026): 25 % Abschlag auf den Zuschlagswert für PV auf landwirtschaftlich
//     genutzten Flächen oder im Grünland; entfällt u. a. für Agri-PV, Deponien/Altlasten, Bergbau- und
//     Infrastrukturstandorte, Gebäude.
//   Statistik Austria, Landwirtschaftliche Pachtpreise 2024 (Datenstand 30.01.2026): Ackerland 364 €/ha,
//     Dauergrünland 257 €/ha.
//   LK Kärnten, „PV auf Freiflächen: Steuerbombe bei Planung vermeiden“: Entnahme aus dem land- und
//     forstwirtschaftlichen Betriebsvermögen, Bewertung als Grundvermögen, Grunderwerbsteuer bei Hofübergabe.
// Solarpachten in € je Hektar für AT sind NICHT geprüft (Faktenregister at.js: zu_pruefen) → keine Werte.
// ---------------------------------------------------------------------------------------------
const FAKTEN_AT = FAKTEN_GEMEINSAM.map((f, i) =>
  i === 0
    ? { icon: Scale, wert: "§ 33", einheit: "EAG", text: "25 % Abschlag auf Acker- und Grünland bei der Marktprämie – nicht für Agri-PV und vorbelastete Flächen" }
    : i === 2
      ? { ...f, wert: "Ja", text: "je Hektar und Jahr bis Baubeginn – Höhe nach Prüfung, Sie bewirtschaften weiter" }
      : f
);

const FAQ_AT = FAQ_GEMEINSAM.map((f, i) => {
  if (i === 0)
    return {
      q: f.q,
      a: "Pachtwerte für Österreich werden geprüft – Ihr Angebot erhalten Sie nach der Prüfung Ihrer Fläche. Entscheidend sind Widmung bzw. Lage in einer PV-Zone, Netzanschluss, Größe und Einstrahlung. Wichtig für die Wirtschaftlichkeit: Bei der EAG-Marktprämie sinkt der Zuschlagswert für Anlagen auf landwirtschaftlich genutzten Flächen oder im Grünland um 25 % (§ 33 EAG); für Agri-PV und vorbelastete Flächen wie Deponien oder Infrastrukturstandorte entfällt der Abschlag. Zum Vergleich: Die landwirtschaftliche Pacht lag 2024 im Bundesschnitt bei 364 € je Hektar Ackerland und 257 € je Hektar Dauergrünland (Statistik Austria).",
    };
  if (i === 1) return { ...f, a: f.a.replace("Notartermin für die Dienstbarkeit", "Eintragung der Dienstbarkeit im Grundbuch") };
  if (i === 2)
    return {
      q: f.q,
      a: "Die volle Pacht beginnt in der Regel mit Baubeginn oder Inbetriebnahme. Bis dahin – meist 2 bis 4 Jahre – zahlen wir eine Reservierungsprämie je Hektar und Jahr, deren Höhe wir nach der Prüfung Ihrer Fläche nennen. Sie bewirtschaften die Fläche weiter wie bisher.",
    };
  if (i === 4)
    return {
      q: "Kann ich die Fläche während der Laufzeit verkaufen oder übergeben?",
      a: "Ja. Der Pachtvertrag und die Dienstbarkeit im Grundbuch gehen auf Käufer oder Übernehmer über – die Pacht auch. Steuerlich kann die Verpachtung an einen Solarpark die Hofübergabe verteuern: Wird die Fläche als Grundvermögen bewertet, fällt die Grunderwerbsteuer vom Grundstückswert statt vom Einheitswert an. Lassen Sie das vor der Unterschrift steuerlich prüfen.",
    };
  return f;
});

// ---------------------------------------------------------------------------------------------
// Schweiz (QM Ländermodell, Entscheidung 5): Solarpachten, Reservierungsprämie und Ackerpacht in € sind
// für die Schweiz NICHT geprüft → keine Werte, stattdessen „nach Prüfung“. Rechtsaussage nur aus den
// geprüften CH-Stammdaten (src/data/laender/ch/freiflaeche.js: Art. 24ter RPG, Standortgebundenheit).
// ---------------------------------------------------------------------------------------------
const FAKTEN_CH = chTexte(
  FAKTEN_GEMEINSAM.map((f, i) =>
    i === 0
      ? { icon: Scale, wert: "Art. 24ter", einheit: "RPG", text: "ausserhalb der Bauzone nur für standortgebundene Anlagen – Pacht nach Prüfung Ihrer Parzelle" }
      : i === 2
        ? { ...f, wert: "Ja", text: "je Hektar und Jahr bis Baubeginn – Höhe nach Prüfung, Sie bewirtschaften weiter" }
        : f
  ),
  "CH"
);

const FAQ_CH = chTexte(
  FAQ_GEMEINSAM.map((f, i) => {
    if (i === 0)
      return {
        q: f.q,
        a: "Pachtwerte für die Schweiz werden geprüft – Ihr Angebot erhalten Sie nach der Prüfung Ihrer Parzelle. Vorher entscheidet die Bewilligungsfähigkeit: Ausserhalb der Bauzone ist eine Solaranlage nur möglich, wenn sie als standortgebunden gilt (Art. 24ter RPG). Danach zählen Netzanschluss, Grösse und Einstrahlung.",
      };
    if (i === 2)
      return {
        q: f.q,
        a: "Die volle Pacht beginnt in der Regel mit Baubeginn oder Inbetriebnahme. Bis dahin zahlen wir eine Reservierungsprämie je Hektar und Jahr, deren Höhe wir nach der Prüfung Ihrer Parzelle nennen. Sie bewirtschaften die Fläche weiter wie bisher.",
      };
    if (i === 4)
      return {
        q: f.q,
        a: "Ja. Der Pachtvertrag und die Dienstbarkeit im Grundbuch gehen auf Käufer oder Erben über – die Pacht auch. Steuerliche Folgen der Verpachtung an einen Solarpark lassen Sie vor der Unterschrift prüfen.",
      };
    return f;
  }),
  "CH"
);

// ---------------------------------------------------------------------------------------------
// Englisch (Sprachmodell): inhaltlich identisch mit der deutschen Fassung, Zahlen im englischen Format.
// ---------------------------------------------------------------------------------------------
const z = (n, stellen = 0) => fmtZahl(n, stellen, "en");
const KOSTENFREI_EN = "always free of charge for landowners";

const metadataEn = {
  title: "Lease land for a solar park | ÖkoInvest",
  description: "Lease arable land or grassland for a solar park: lease models, contract, decommissioning security, tax and the process up to the first lease payment. Register your land now.",
  openGraph: {
    title: "Lease land for a solar park | ÖkoInvest",
    description: "Lease arable land or grassland for a solar park: lease models, contract, decommissioning security, tax and the process up to the first lease payment. Register your land now.",
    images: [{ alt: "Site visit to land for a solar park" }],
  },
};

const FAKTEN_GEMEINSAM_EN = [
  { wert: `${z(PACHT.freiflaecheProHa.min)}–${z(PACHT.freiflaecheProHa.max)}`, einheit: "€ per hectare per year", text: `typical solar lease in the DACH region, usually around €${z(PACHT.freiflaecheProHa.mittel)}` },
  { wert: `${PACHT.laufzeit} yrs`, einheit: "Term", text: `from commissioning, plus ${String(PACHT.verlaengerung).replace(/^(.*) Jahre Option$/, "options of $1 years")}` },
  { wert: `€${z(PACHT.reservierungProHa.min)}–${z(PACHT.reservierungProHa.max)}`, einheit: "Reservation fee", text: "per hectare per year until construction – you keep farming" },
  { wert: "€0", einheit: "Cost to you", text: `assessment, offer, contract and notary – ${KOSTENFREI_EN}` },
];

const FAQ_GEMEINSAM_EN = [
  {
    q: "How much lease will I receive for a solar park?",
    a: `For ground-mounted PV, leases in the DACH region are currently mostly between €${z(PACHT.freiflaecheProHa.min)} and €${z(PACHT.freiflaecheProHa.max)} per hectare per year, typically around €${z(PACHT.freiflaecheProHa.mittel)}. What matters are the grid connection, size, irradiation and whether the land lies within the EEG land categories (German Renewable Energy Sources Act). That is many times the usual arable lease of around €${z(PACHT.ackerProHa)} per hectare on average.`,
  },
  {
    q: "Does the assessment or the contract cost me anything?",
    a: "No. It is always free of charge for landowners – we cover the land check, lease offer, draft contract and the notary appointment for the easement. We expressly recommend a legal or tax review on your side; on request, we will contribute to the costs.",
  },
  {
    q: "When is the lease paid?",
    a: `The full lease usually starts when construction begins or the plant is commissioned. Until then – usually 2 to 4 years – we pay a reservation fee of typically €${z(PACHT.reservierungProHa.min)}–${z(PACHT.reservierungProHa.max)} per hectare per year, and you continue to farm the land as before.`,
  },
  {
    q: "What happens if the solar park is not built after all?",
    a: "Then the contract ends automatically after an agreed period or by withdrawal, the easement is deleted and you get your land back without restriction. You keep any reservation fees already paid.",
  },
  {
    q: "Can I sell or bequeath the land during the term?",
    a: "Yes. The lease agreement and the easement in the land register pass to buyers or heirs – and so does the lease. However, leasing to a solar park can be disadvantageous for inheritance tax; have this checked by a tax adviser before signing.",
  },
  {
    q: "What if I have already leased the land to a farmer?",
    a: "That is common. Agricultural leases can usually be terminated with notice or adjusted for parts of the land. We build the notice periods into the timeline and, if you wish, talk to your tenant – often they can take over the maintenance of the land, for example through grazing.",
  },
  {
    q: "How secure is decommissioning after 30 years?",
    a: "The decommissioning obligation is set out in the contract and in the easement. In addition, the operator deposits a decommissioning guarantee from a bank or insurer before construction starts. If the operator fails, decommissioning can be paid for from the guarantee.",
  },
];

// Österreich auf Englisch: Übersetzung von FAKTEN_AT / FAQ_AT (gleiche Quellen, keine zusätzlichen Werte)
const FAKTEN_AT_EN = FAKTEN_GEMEINSAM_EN.map((f, i) =>
  i === 0
    ? { wert: "§ 33", einheit: "EAG", text: "25 % reduction on arable land and grassland under the market premium – not for agrivoltaics or pre-impacted land" }
    : i === 2
      ? { ...f, wert: "Yes", text: "per hectare per year until construction – amount after assessment, you keep farming" }
      : f
);

const FAQ_AT_EN = FAQ_GEMEINSAM_EN.map((f, i) => {
  if (i === 0)
    return {
      q: f.q,
      a: "Lease rates for Austria are being reviewed – you will receive your offer once we have assessed your land. What matters are the zoning (Widmung) or location in a PV zone, grid connection, size and irradiation. Important for profitability: under the EAG market premium (Austrian Renewable Energy Expansion Act), the award value for plants on agriculturally used land or grassland is reduced by 25 % (§ 33 EAG); the reduction does not apply to agrivoltaics and pre-impacted land such as landfills or infrastructure sites. For comparison: in 2024, the national average agricultural lease was €364 per hectare of arable land and €257 per hectare of permanent grassland (Statistik Austria).",
    };
  if (i === 1) return { ...f, a: f.a.replace("the notary appointment for the easement", "entering the easement in the land register") };
  if (i === 2)
    return {
      q: f.q,
      a: "The full lease usually starts when construction begins or the plant is commissioned. Until then – usually 2 to 4 years – we pay a reservation fee per hectare per year, the amount of which we will tell you after assessing your land. You continue to farm the land as before.",
    };
  if (i === 4)
    return {
      q: "Can I sell or hand over the land during the term?",
      a: "Yes. The lease agreement and the easement in the land register pass to buyers or successors – and so does the lease. For tax purposes, leasing to a solar park can make a farm handover more expensive: if the land is valued as real property (Grundvermögen), real estate transfer tax is charged on the property value instead of the assessed standard value (Einheitswert). Have this checked by a tax adviser before signing.",
    };
  return f;
});

// Schweiz auf Englisch: Übersetzung von FAKTEN_CH / FAQ_CH (gleiche Quelle, keine Werte)
const FAKTEN_CH_EN = FAKTEN_GEMEINSAM_EN.map((f, i) =>
  i === 0
    ? { wert: "Art. 24ter", einheit: "RPG", text: "outside the building zone only for site-bound plants (Swiss Spatial Planning Act) – lease after assessing your plot" }
    : i === 2
      ? { ...f, wert: "Yes", text: "per hectare per year until construction – amount after assessment, you keep farming" }
      : f
);

const FAQ_CH_EN = FAQ_GEMEINSAM_EN.map((f, i) => {
  if (i === 0)
    return {
      q: f.q,
      a: "Lease rates for Switzerland are being reviewed – you will receive your offer once we have assessed your plot. First, what matters is whether a permit is possible: outside the building zone, a solar plant is only allowed if it counts as site-bound (Art. 24ter RPG, Swiss Spatial Planning Act). After that, grid connection, size and irradiation count.",
    };
  if (i === 2)
    return {
      q: f.q,
      a: "The full lease usually starts when construction begins or the plant is commissioned. Until then, we pay a reservation fee per hectare per year, the amount of which we will tell you after assessing your plot. You continue to farm the land as before.",
    };
  if (i === 4)
    return {
      q: f.q,
      a: "Yes. The lease agreement and the easement in the land register pass to buyers or heirs – and so does the lease. Have the tax consequences of leasing to a solar park checked before signing.",
    };
  return f;
});

const INHALT = {
  de: {
    gemeinsam: { fakten: FAKTEN_GEMEINSAM, faq: FAQ_GEMEINSAM },
    AT: { fakten: FAKTEN_AT, faq: FAQ_AT },
    CH: { fakten: FAKTEN_CH, faq: FAQ_CH },
  },
  en: {
    gemeinsam: { fakten: FAKTEN_GEMEINSAM_EN, faq: FAQ_GEMEINSAM_EN },
    AT: { fakten: FAKTEN_AT_EN, faq: FAQ_AT_EN },
    CH: { fakten: FAKTEN_CH_EN, faq: FAQ_CH_EN },
  },
};

/** Feste Texte der Seite. en enthält nur Texte; Listen werden je Index zusammengeführt. */
const TEXTE = {
  de: {
    jsonLd: { name: "Pacht von Flächen für Solarparks", serviceType: "Flächenpacht für Freiflächen-Photovoltaik", audience: "Flächeneigentümer und Landwirte", description: BESCHREIBUNG },
    faktenTitel: "Eckdaten der Solarpacht",
    faqKopf: { eyebrow: "Häufige Fragen", titel: "Fragen von Flächeneigentümern", lead: "Ihre Frage ist nicht dabei? Stellen Sie sie im Formular – wir antworten persönlich." },
    querverweise: [
      { href: pfad("/rechner/pacht"), titel: "Pachtrechner", text: "Fest, indexiert oder Umsatzbeteiligung – Ihre Pacht über 30 Jahre im Vergleich zum Ackerbau." },
      { href: pfad("/flaechencheck"), titel: "Flächencheck", text: "Ampel, Leistung und Pachtspanne Ihrer Fläche in zwei Minuten." },
      { href: pfad("/dachflaeche-verpachten"), titel: "Dachfläche verpachten", text: "Gewerbe-, Hallen- und Stalldächer ab etwa 1.000 m² – Pacht, Dachstrom oder Sanierung als Gegenleistung." },
      { href: pfad("/landwirte"), titel: "Für Landwirte", text: "Verpachten, selbst investieren oder beteiligen – die vier Wege mit Agri-PV." },
      { href: "/ratgeber/solarpark-pacht-pro-hektar", titel: "Solarpark-Pacht pro Hektar", text: "Spannen, Einflussfaktoren und ein Rechenbeispiel für 2026." },
      { href: "/ratgeber/pachtvertrag-solarpark", titel: "Pachtvertrag Solarpark", text: "Die wichtigsten Klauseln und eine Checkliste für Eigentümer." },
    ],
    cta: {
      eyebrow: "Für Flächeneigentümer kostenfrei",
      titel: "Was ist Ihre Fläche als Solarpark wert?",
      text: "Zwei Minuten im Flächencheck – mit Ampel, möglicher Leistung und Pachtspanne. Das Ergebnis landet auf Wunsch direkt bei unserem Flächenteam.",
      primaer: "Zum Flächencheck",
      sekundaer: "Pachtrechner",
    },
  },
  en: {
    jsonLd: { name: "Leasing land for solar parks", serviceType: "Land lease for ground-mounted photovoltaics", audience: "Landowners and farmers", description: metadataEn.description },
    faktenTitel: "Key figures of the solar lease",
    faqKopf: { eyebrow: "Frequently asked questions", titel: "Questions from landowners", lead: "Your question is not listed? Ask it in the form – we will reply personally." },
    querverweise: [
      { titel: "Lease calculator", text: "Fixed, indexed or revenue share – your lease over 30 years compared with arable farming." },
      { titel: "Land check", text: "Traffic light, capacity and lease range for your land in two minutes." },
      { titel: "Lease your roof", text: `Commercial, warehouse and barn roofs from around ${z(1000)} m² – lease, rooftop power or a roof renovation in return.` },
      { titel: "For farmers", text: "Lease, invest yourself or participate – the four routes with agrivoltaics." },
      { titel: "Solar park lease per hectare", text: "Ranges, influencing factors and a worked example for 2026." },
      { titel: "Solar park lease agreement", text: "The most important clauses and a checklist for owners." },
    ],
    cta: {
      eyebrow: "Free of charge for landowners",
      titel: "What is your land worth as a solar park?",
      text: "Two minutes in the land check – with a traffic light, possible capacity and lease range. If you wish, the result goes straight to our land team.",
      primaer: "To the land check",
      sekundaer: "Lease calculator",
    },
  },
};

export default async function FlaecheVerpachtenPage({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const w = uebersetze(TEXTE, sprache);
  const { fakten: FAKTEN, faq: FAQ } = inhaltFuerSprache(INHALT, land, sprache);
  return (
    <div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: w.jsonLd.name,
          serviceType: w.jsonLd.serviceType,
          provider: { "@id": `${abs("/")}/#organization` },
          areaServed: ["DE", "AT", "CH"],
          audience: { "@type": "Audience", audienceType: w.jsonLd.audience },
          url: abs(PFAD),
          description: w.jsonLd.description,
        }}
      />

      <Hero />
      <Faktenleiste titel={w.faktenTitel} fakten={FAKTEN} />
      <Pachtmodelle />
      <Vertrag />
      <Steuern />
      <Pruefung />
      <Weg />
      <Anfrage />

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow={w.faqKopf.eyebrow} title={w.faqKopf.titel} lead={w.faqKopf.lead} />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise items={w.querverweise} />

      <CtaBand
        eyebrow={w.cta.eyebrow}
        title={w.cta.titel}
        text={w.cta.text}
        primary={{ label: w.cta.primaer, href: pfad("/flaechencheck") }}
        secondary={{ label: w.cta.sekundaer, href: pfad("/rechner/pacht") }}
      />
    </div>
  );
}

export const generateMetadata = seitenMetadata("/flaeche-verpachten", metadata, { en: metadataEn });
