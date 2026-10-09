// src/app/dachflaeche-verpachten/page.js – Landingpage für Dacheigentümer (Gewerbe, Hallen, Landwirtschaft, Logistik)
//
// Sprachmodell: feste Texte im Wörterbuch TEXTE (en nur Texte), Länderinhalt AT und CH über inhaltFuerSprache().

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import Hero from "@/components/Dach/Seite/Hero";
import Fakten from "@/components/Dach/Seite/Fakten";
import Dachtypen from "@/components/Dach/Seite/Dachtypen";
import Modelle from "@/components/Dach/Seite/Modelle";
import Voraussetzungen from "@/components/Dach/Seite/Voraussetzungen";
import Vertrag from "@/components/Dach/Seite/Vertrag";
import Steuern from "@/components/Dach/Seite/Steuern";
import { Ablauf, Gruppe } from "@/components/Dach/Seite/Gruppe";
import Anfrage from "@/components/Dach/Seite/Anfrage";
import { abs } from "@/data/site";
import { DACH, PROVISION, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { rechneDach } from "@/lib/rechner/dachpacht";
import JsonLd from "@/components/JsonLd";
import { pfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { inhaltFuerSprache, uebersetze } from "@/lib/sprache/woerterbuch";
import { chTexte } from "@/data/laender/ch/schreibung";
import { fmtZahl } from "@/lib/sprache/format";

const PFAD = pfad("/dachflaeche-verpachten");
const TITEL = "Dachfläche für Photovoltaik verpachten | ÖkoInvest";
const BESCHREIBUNG =
  "Gewerbe-, Hallen-, Agrar- oder Logistikdach ab 1.000 m² für PV verpachten: Pachtmodelle, Dachstrom, Sanierung, Vertrag, Steuern und Ablauf – kostenfrei.";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  keywords: ["Dachfläche verpachten", "Dach verpachten Photovoltaik", "Dachpacht Gewerbedach", "Hallendach vermieten Solar", "Dachpacht pro m²"],
  alternates: { canonical: abs(PFAD) },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/gewerbedach.jpg"), width: 1280, height: 852, alt: "Photovoltaikanlage auf einem Gewerbedach" }],
  },
};

const BEISPIEL_M2 = 5000;
const bsp = rechneDach({ m2: BEISPIEL_M2, dachart: "trapez", ausrichtung: "sued", regionId: "de-sued" });

const FAQ = [
  {
    q: "Ab welcher Dachgröße lohnt sich die Verpachtung?",
    a: `In der Regel ab rund ${fmt(DACH.mindestM2)} m² zusammenhängender, gut zugänglicher Fläche – das sind grob ${fmt(DACH.mindestM2 / DACH.dacharten[0].m2ProKwp)} kWp oder mehr. Kleinere Dächer rechnen sich für einen fremden Betreiber selten; dann ist eine eigene Anlage meist der bessere Weg. Mehrere Dächer an einem Standort oder in einer Gruppe lassen sich bündeln.`,
  },
  {
    q: "Wie viel Dachpacht ist realistisch?",
    a: `Als Orientierung ${fmt(DACH.pachtProM2.min, 2)}–${fmt(DACH.pachtProM2.max, 2)} € je m² und Jahr bzw. ${fmt(DACH.pachtProKwp.min)}–${fmt(DACH.pachtProKwp.max)} € je kWp. Höhere Werte sind möglich bei sehr großen, unverschatteten Dächern mit Netzanschluss am Gebäude oder einem Stromabnehmer vor Ort. Werbewerte von 4–5 €/m² sollten Sie gegenrechnen: Die Pacht muss zum Stromerlös passen, sonst wird die Anlage nicht gebaut – und eine unterschriebene, nie gebaute Anlage blockiert Ihr Dach.`,
  },
  {
    q: "Was passiert, wenn das Dach während der Laufzeit saniert werden muss?",
    a: "Das regelt der Vertrag: Der Betreiber demontiert und montiert die Anlage auf Anforderung – wer die Kosten trägt und wie ein Ertragsausfall behandelt wird, wird vorab festgelegt. Am besten wird ein sanierungsbedürftiges Dach vor der Belegung erneuert; das kann auch Teil der Gegenleistung des Betreibers sein.",
  },
  {
    q: "Wer haftet bei Schäden am Dach oder bei einem Brand?",
    a: "Der Betreiber versichert die Anlage (Allgefahren/Elektronik) und seine Haftpflicht und stellt Sie von Schäden frei, die durch Anlage, Montage oder Wartung entstehen. Ihre Gebäudeversicherung informieren Sie vor dem Bau; manche Versicherer verlangen zusätzliche Brandschutzmaßnahmen. Planung und Ausführung nach anerkannten Regeln (z. B. VDE-Normen, Brandschutz-Richtlinien der Versicherer) schreiben wir in den Vertrag.",
  },
  {
    q: "Kann ich das Gebäude trotzdem verkaufen oder vermieten?",
    a: "Ja. Eine beschränkte persönliche Dienstbarkeit im Grundbuch sichert die Anlage auch gegenüber Käufern; der Vertrag geht auf den Erwerber über. Bestehende Mietverträge im Gebäude sollten den Dachzugang und – falls gewünscht – die Stromlieferung an den Mieter berücksichtigen.",
  },
  {
    q: "Kann ich den Strom vom eigenen Dach günstig beziehen?",
    a: `Ja, das ist oft der größte Hebel: Der Betreiber liefert Ihnen den Dachstrom per Vertrag (On-Site-PPA), typischerweise für ${fmt(DACH.ppaVorOrtCt.min)}–${fmt(DACH.ppaVorOrtCt.max)} ct/kWh netto – deutlich unter üblichen Gewerbestrompreisen, weil für Strom, der das Gebäude nicht verlässt, keine Netzentgelte anfallen. Den restlichen Bedarf können Sie über unseren Reststrom-Pool beziehen.`,
  },
  {
    q: "Was kostet mich die Prüfung?",
    a: `Nichts. ${PROVISION.flaeche.text[0].toUpperCase()}${PROVISION.flaeche.text.slice(1)} – das gilt auch für Dächer. Erstprüfung, Angebot und Vertragsentwurf sind kostenfrei; ein Statikgutachten beauftragen und bezahlen wir, wenn das Projekt weiterverfolgt wird.`,
  },
];

// Österreich (Länderinhalt): Dachpacht- und Strompreiswerte sind für AT nicht geprüft → keine Werte.
// § 33 EAG (RIS, abgerufen 04.10.2026): Anlagen auf Gebäuden, die mind. drei Jahre vor dem Förderantrag
// fertiggestellt wurden, sind vom Abschlag ausgenommen (für Dächer ohnehin nicht Acker/Grünland).
const FAQ_AT = FAQ.map((f) => {
  if (f.q === "Wie viel Dachpacht ist realistisch?")
    return {
      q: f.q,
      a: "Pachtwerte für Österreich werden geprüft – ein Angebot erhalten Sie nach der Prüfung Ihres Dachs. Entscheidend sind Größe, Verschattung, Statik, Netzanschluss am Gebäude und ob es einen Stromabnehmer vor Ort gibt. Werbewerte sollten Sie gegenrechnen: Die Pacht muss zum Stromerlös passen, sonst wird die Anlage nicht gebaut – und eine unterschriebene, nie gebaute Anlage blockiert Ihr Dach.",
    };
  if (f.q.startsWith("Kann ich das Gebäude trotzdem"))
    return { q: f.q, a: f.a.replace("Eine beschränkte persönliche Dienstbarkeit im Grundbuch", "Eine im Grundbuch eingetragene Dienstbarkeit") };
  if (f.q.startsWith("Kann ich den Strom vom eigenen Dach"))
    return {
      q: f.q,
      a: "Ja, das ist oft der größte Hebel: Der Betreiber liefert Ihnen den Dachstrom per Vertrag (On-Site-PPA). Für Strom, der das Gebäude nicht verlässt, fallen keine Netzentgelte an. Preiswerte für Österreich werden geprüft – ein Angebot erhalten Sie nach der Prüfung. Überschüsse lassen sich auch über eine Erneuerbare-Energie-Gemeinschaft im Nahebereich teilen.",
    };
  return f;
});

// Schweiz (QM Ländermodell, Entscheidung 5): Dachpacht- und Strompreiswerte sind für CH nicht geprüft → keine Werte.
const FAQ_CH = chTexte(
  FAQ.map((f) => {
    if (f.q === "Wie viel Dachpacht ist realistisch?")
      return {
        q: f.q,
        a: "Pachtwerte für die Schweiz werden geprüft – ein Angebot erhalten Sie nach der Prüfung Ihres Dachs. Entscheidend sind Grösse, Verschattung, Statik, Netzanschluss am Gebäude und ob es einen Stromabnehmer vor Ort gibt. Werbewerte sollten Sie gegenrechnen: Die Pacht muss zum Stromerlös passen, sonst wird die Anlage nicht gebaut – und eine unterschriebene, nie gebaute Anlage blockiert Ihr Dach.",
      };
    if (f.q.startsWith("Kann ich das Gebäude trotzdem"))
      return { q: f.q, a: f.a.replace("Eine beschränkte persönliche Dienstbarkeit im Grundbuch", "Eine im Grundbuch eingetragene Dienstbarkeit") };
    if (f.q.startsWith("Wer haftet bei Schäden"))
      return { q: f.q, a: f.a.replace("(z. B. VDE-Normen, Brandschutz-Richtlinien der Versicherer)", "(z. B. Normen und Brandschutzvorgaben der Versicherer)") };
    if (f.q.startsWith("Kann ich den Strom vom eigenen Dach"))
      return {
        q: f.q,
        a: "Ja, das ist oft der grösste Hebel: Der Betreiber liefert Ihnen den Dachstrom per Vertrag (On-Site-PPA). Preiswerte für die Schweiz werden geprüft – ein Angebot erhalten Sie nach der Prüfung.",
      };
    return f;
  }),
  "CH"
);

// ---------------------------------------------------------------------------------------------
// Englisch (Sprachmodell): inhaltlich identisch, Zahlen im englischen Format
// ---------------------------------------------------------------------------------------------
const z = (n, stellen = 0) => fmtZahl(n, stellen, "en");

const metadataEn = {
  title: "Lease your roof for photovoltaics | ÖkoInvest",
  description: "Lease commercial, warehouse, agricultural or logistics roofs from 1,000 m² for PV: lease models, rooftop power, renovation, contract, tax and process – free of charge.",
  keywords: ["lease roof space", "lease roof for photovoltaics", "commercial roof lease", "rent warehouse roof for solar", "roof lease per m²"],
  openGraph: {
    title: "Lease your roof for photovoltaics | ÖkoInvest",
    description: "Lease commercial, warehouse, agricultural or logistics roofs from 1,000 m² for PV: lease models, rooftop power, renovation, contract, tax and process – free of charge.",
    images: [{ alt: "Photovoltaic installation on a commercial roof" }],
  },
};

const FAQ_EN = [
  {
    q: "From what roof size is leasing worthwhile?",
    a: `Usually from around ${z(DACH.mindestM2)} m² of contiguous, easily accessible area – roughly ${z(DACH.mindestM2 / DACH.dacharten[0].m2ProKwp)} kWp or more. Smaller roofs rarely pay off for a third-party operator; in that case, your own installation is usually the better route. Several roofs at one site or within a group can be pooled.`,
  },
  {
    q: "What roof lease is realistic?",
    a: `As a guide, €${z(DACH.pachtProM2.min, 2)}–${z(DACH.pachtProM2.max, 2)} per m² per year or €${z(DACH.pachtProKwp.min)}–${z(DACH.pachtProKwp.max)} per kWp. Higher values are possible for very large, unshaded roofs with a grid connection at the building or a power buyer on site. You should check advertised figures of €4–5/m²: the lease must match the power revenue, otherwise the installation will not be built – and a signed installation that is never built blocks your roof.`,
  },
  {
    q: "What happens if the roof needs renovating during the term?",
    a: "The contract governs this: the operator dismantles and reinstalls the installation on request – who bears the costs and how lost yield is treated is agreed in advance. Ideally, a roof in need of renovation is renewed before it is covered; this can also be part of the operator’s consideration.",
  },
  {
    q: "Who is liable for damage to the roof or in the event of fire?",
    a: "The operator insures the installation (all risks/electronics) and its liability and indemnifies you against damage caused by the installation, assembly or maintenance. Inform your building insurer before construction; some insurers require additional fire protection measures. We write planning and execution in accordance with recognised rules (e.g. VDE standards, insurers’ fire protection guidelines) into the contract.",
  },
  {
    q: "Can I still sell or rent out the building?",
    a: "Yes. A limited personal easement (beschränkte persönliche Dienstbarkeit) in the land register secures the installation vis-à-vis buyers too; the contract passes to the purchaser. Existing leases in the building should take roof access and – if desired – power supply to the tenant into account.",
  },
  {
    q: "Can I buy power from my own roof at a low price?",
    a: `Yes, this is often the biggest lever: the operator supplies you with the rooftop power under a contract (on-site PPA), typically for ${z(DACH.ppaVorOrtCt.min)}–${z(DACH.ppaVorOrtCt.max)} ct/kWh net – well below usual commercial power prices, because no grid fees are due for power that does not leave the building. You can source the rest of your demand through our residual power pool.`,
  },
  {
    q: "What does the assessment cost me?",
    a: "Nothing. It is always free of charge for landowners – and that also applies to roofs. Initial assessment, offer and draft contract are free of charge; we commission and pay for a structural report if the project goes ahead.",
  },
];

// Österreich auf Englisch: Übersetzung von FAQ_AT (gleiche Quellen, Reihenfolge wie FAQ)
const FAQ_AT_EN = FAQ_EN.map((f, i) => {
  if (i === 1)
    return {
      q: f.q,
      a: "Lease rates for Austria are being reviewed – you will receive an offer once we have assessed your roof. What matters are size, shading, structure, grid connection at the building and whether there is a power buyer on site. You should check advertised figures: the lease must match the power revenue, otherwise the installation will not be built – and a signed installation that is never built blocks your roof.",
    };
  if (i === 4) return { q: f.q, a: f.a.replace("A limited personal easement (beschränkte persönliche Dienstbarkeit) in the land register", "An easement (Dienstbarkeit) entered in the land register") };
  if (i === 5)
    return {
      q: f.q,
      a: "Yes, this is often the biggest lever: the operator supplies you with the rooftop power under a contract (on-site PPA). No grid fees are due for power that does not leave the building. Price levels for Austria are being reviewed – you will receive an offer after the assessment. Surpluses can also be shared within a renewable energy community nearby.",
    };
  return f;
});

// Schweiz auf Englisch: Übersetzung von FAQ_CH (Reihenfolge wie FAQ)
const FAQ_CH_EN = FAQ_EN.map((f, i) => {
  if (i === 1)
    return {
      q: f.q,
      a: "Lease rates for Switzerland are being reviewed – you will receive an offer once we have assessed your roof. What matters are size, shading, structure, grid connection at the building and whether there is a power buyer on site. You should check advertised figures: the lease must match the power revenue, otherwise the installation will not be built – and a signed installation that is never built blocks your roof.",
    };
  if (i === 4) return { q: f.q, a: f.a.replace("A limited personal easement (beschränkte persönliche Dienstbarkeit) in the land register", "An easement (Dienstbarkeit) entered in the land register") };
  if (i === 5)
    return {
      q: f.q,
      a: "Yes, this is often the biggest lever: the operator supplies you with the rooftop power under a contract (on-site PPA). Price levels for Switzerland are being reviewed – you will receive an offer after the assessment.",
    };
  return f;
});

/** Feste Texte der Seite (en nur Texte, Listen je Index). */
const TEXTE = {
  de: {
    jsonLd: { name: "Dachpacht für Photovoltaik", serviceType: "Pacht und Nutzung großer Dachflächen für Photovoltaikanlagen", audience: "Eigentümer von Gewerbe-, Hallen-, Landwirtschafts- und Logistikdächern", description: BESCHREIBUNG },
    faqKopf: { eyebrow: "Häufige Fragen", titel: "Fragen von Dacheigentümern", lead: "Ihre Frage ist nicht dabei? Stellen Sie sie im Formular – wir antworten persönlich." },
    querverweise: [
      { titel: "Dachpacht-Rechner", text: "Leistung, Ertrag und Pachtspanne Ihres Dachs – Pacht, Dachstrom und Eigeninvestition im Vergleich." },
      { titel: "Reststrom-Pool", text: "Den Strom, den Sie trotz Dachanlage noch kaufen, gebündelt über das virtuelle Kraftwerk beziehen." },
      { titel: "Fläche verpachten", text: "Acker, Grünland oder Konversionsfläche für einen Solarpark verpachten." },
      { titel: "Solarcarport", text: "Parkplatz neben der Halle? Strom und Ladepunkte unter einem Dach." },
    ],
    cta: {
      eyebrow: "Für Dacheigentümer kostenfrei",
      titel: "Was ist Ihr Dach als Kraftwerk wert?",
      text: "Im Dachpacht-Rechner sehen Sie Leistung, Ertrag und Pachtspanne in einer Minute – und vergleichen Pacht, Dachstrom und Eigeninvestition.",
      primaer: "Zum Dachpacht-Rechner",
      sekundaer: "Dach vorstellen",
    },
  },
  en: {
    jsonLd: { name: "Roof lease for photovoltaics", serviceType: "Lease and use of large roof areas for photovoltaic installations", audience: "Owners of commercial, warehouse, agricultural and logistics roofs", description: metadataEn.description },
    faqKopf: { eyebrow: "Frequently asked questions", titel: "Questions from roof owners", lead: "Your question is not listed? Ask it in the form – we will reply personally." },
    querverweise: [
      { titel: "Roof lease calculator", text: "Capacity, yield and lease range for your roof – lease, rooftop power and own investment compared." },
      { titel: "Residual power pool", text: "Buy the power you still need despite your rooftop installation as part of a pool via the virtual power plant." },
      { titel: "Lease your land", text: "Lease arable land, grassland or a conversion site for a solar park." },
      { titel: "Solar carport", text: "Car park next to the hall? Power and charging points under one roof." },
    ],
    cta: {
      eyebrow: "Free of charge for roof owners",
      titel: "What is your roof worth as a power plant?",
      text: "In the roof lease calculator you can see capacity, yield and lease range in one minute – and compare lease, rooftop power and own investment.",
      primaer: "To the roof lease calculator",
      sekundaer: "Present your roof",
    },
  },
};

export default async function DachflaecheVerpachtenPage({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const w = uebersetze(TEXTE, sprache);
  const faq = inhaltFuerSprache({ de: { gemeinsam: FAQ, AT: FAQ_AT, CH: FAQ_CH }, en: { gemeinsam: FAQ_EN, AT: FAQ_AT_EN, CH: FAQ_CH_EN } }, land, sprache);
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
          audience: { "@type": "BusinessAudience", audienceType: w.jsonLd.audience },
          url: abs(PFAD),
          description: w.jsonLd.description,
        }}
      />

      <Hero bsp={bsp} m2={BEISPIEL_M2} laufzeit={DACH.laufzeit} />
      <Fakten dach={DACH} />
      <Dachtypen mindestM2={DACH.mindestM2} />
      <Modelle bsp={bsp} dach={DACH} m2={BEISPIEL_M2} stand={STAND} />
      <Voraussetzungen restnutzung={DACH.restnutzungMinJahre} />
      <Vertrag laufzeit={DACH.laufzeit} verlaengerung={DACH.verlaengerung} />
      <Steuern stand={STAND} />
      <Gruppe />
      <Ablauf />
      <Anfrage />

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow={w.faqKopf.eyebrow} title={w.faqKopf.titel} lead={w.faqKopf.lead} />
          <Faq items={faq} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: pfad("/rechner/dachpacht"), ...w.querverweise[0] },
          { href: pfad("/reststrom"), ...w.querverweise[1] },
          { href: pfad("/flaeche-verpachten"), ...w.querverweise[2] },
          { href: pfad("/solarcarport"), ...w.querverweise[3] },
        ]}
      />

      <CtaBand
        eyebrow={w.cta.eyebrow}
        title={w.cta.titel}
        text={w.cta.text}
        primary={{ label: w.cta.primaer, href: pfad("/rechner/dachpacht") }}
        secondary={{ label: w.cta.sekundaer, href: "#anfrage" }}
      />
    </div>
  );
}

export const generateMetadata = seitenMetadata("/dachflaeche-verpachten", metadata, { en: metadataEn });
