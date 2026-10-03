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
import { landDerSeite, landMetadata } from "@/lib/land/seite";

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

export default async function BestandsanlagenPage({ params }) {
  await landDerSeite(params, "/bestandsanlagen");
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Kauf und Verkauf von PV-Bestandsanlagen",
    serviceType: "Vermittlung laufender Photovoltaikanlagen (Dach und Freifläche) am Zweitmarkt",
    provider: { "@id": `${abs("/")}/#organization` },
    areaServed: ["DE", "AT", "CH"],
    audience: { "@type": "BusinessAudience", audienceType: "Anlagenbetreiber, Investoren, Stadtwerke, Family Offices" },
    url: abs(PFAD),
    description: BESCHREIBUNG,
  };

  return (
    <div>
      <JsonLd daten={schema} />

      <Hero bsp={bsp} ct={BEISPIELE[1].ct} jahr={BEISPIELE[1].jahr} provision={`${fmt(PROVISION.verkaeufer.min * 100, 1)}–${fmt(PROVISION.verkaeufer.max * 100)} %`} boerse={BOERSE} />
      <FaktenLeiste
        titel="Zweitmarkt in Zahlen"
        fakten={[
          { icon: BadgePercent, wert: `${fmt(PROVISION.verkaeufer.min * 100, 1)}–${fmt(PROVISION.verkaeufer.max * 100)} %`, einheit: "Erfolgsprovision", text: "für Verkäufer – nur bei erfolgreichem Abschluss" },
          { icon: Search, wert: "0 €", einheit: "für Käufer", text: "Suchprofil, NDA und Datenraum kostenfrei" },
          { icon: ShieldCheck, wert: "0 €", einheit: "Listungsgebühren", text: "keine Einstell-, Listungs- oder Datenraumgebühren" },
          { icon: Gauge, wert: `${fmt(PHASE_BESTAND.preisProKwp.min)}–${fmt(PHASE_BESTAND.preisProKwp.max)}`, einheit: "€ je kWp", text: "übliche Preise für jüngere Anlagen mit heutigen Tarifen" },
        ]}
      />
      <Perspektiven />
      <Bewertung beispiele={BEISPIELE} band={PHASE_BESTAND.preisProKwp} bestand={BESTAND} merchantCt={ERLOESE.merchantCt} stand={STAND} />
      <Datenraum />
      <Zeitleiste
        titelId="ablauf-titel"
        eyebrow="Ablauf über die Plattform"
        titel="Von der Bewertung bis zur Übergabe"
        ton="sand"
        schritte={[
          { icon: Gauge, title: "Bewertung", text: "Erste Einschätzung im Rechner, dann mit Ihren Ertragsdaten und Verträgen eine belastbare Wertspanne – kostenfrei." },
          { icon: FolderLock, title: "Datenraum", text: "Unterlagen hochladen, wir prüfen auf Vollständigkeit und Plausibilität. Lücken zeigen wir, bevor ein Käufer sie findet." },
          { icon: Search, title: "Anonymer Teaser", text: "Region, Größe, Inbetriebnahme, Vergütung und Eckdaten in der Projektbörse – ohne Standort und Namen." },
          { icon: ShieldCheck, title: "NDA & Due Diligence", text: "Registrierte Käufer akzeptieren die Vertraulichkeitsvereinbarung, erhalten Datenraumzugriff und prüfen technisch und rechtlich." },
          { icon: FileSignature, title: "Angebot & Vertrag", text: "Indikative Angebote, Absichtserklärung, Kaufvertrag – als Share Deal oder Asset Deal, mit Ihrer Beratung." },
          { icon: Handshake, title: "Übergang & Betrieb", text: "Meldungen an Netzbetreiber, Register und Vermarkter. Betriebsführung auf Wunsch weiter durch die Gruppe." },
        ]}
      />
      <Provision
        text={`Keine Einstell-, Listungs- oder Datenraumgebühren. Verkäufer zahlen eine Erfolgsprovision von ${PROVISION.verkaeufer.text}. Käufer zahlen nichts – ${PROVISION.kaeufer.text.replace("für Investoren ", "")}.`}
        beispielWert={fmtMio(bsp.wert, 2)}
        von={fmt(Math.round((bsp.wert * PROVISION.verkaeufer.min) / 1000))}
        bis={fmt(Math.round((bsp.wert * PROVISION.verkaeufer.max) / 1000))}
        maxProzent={PROVISION.verkaeufer.max * 100}
        boerse={BOERSE}
      />
      <Anfrage />

      <Section tone="sand" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Fragen zu Bestandsanlagen" lead="Ihre Frage ist nicht dabei? Stellen Sie sie im Formular – wir antworten persönlich." />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: pfad("/rechner/bestandsanlage"), titel: "Bewertungsrechner", text: "Ertragswert, Spanne und Sensitivität Ihrer laufenden Anlage." },
          { href: BOERSE, titel: "Bestand in der Börse", text: "Laufende Anlagen als anonymer Teaser – Details nach NDA." },
          { href: "/investoren", titel: "Für Investoren", text: "Projektrechte, baureife Projekte und Bestand – Phasenmodell und Due-Diligence-Checkliste." },
          { href: pfad("/warum-oekoinvest"), titel: "Warum ÖkoInvest", text: "Marktplatz, Makler oder Entwickler-Plattform – die Modelle im offenen Vergleich." },
          { href: "/wissen/ratgeber/solarpark-bestandsanlage-wert", titel: "Wert eines Solarparks", text: "DCF, Restlaufzeit und technische Due Diligence beim Kauf." },
          { href: "/wissen/ratgeber/repowering-solarpark", titel: "Repowering alter Solarparks", text: "Modultausch, EEG-Regeln und Wirtschaftlichkeit." },
        ]}
      />

      <CtaBand
        eyebrow="Für Verkäufer und Käufer"
        title="Was ist Ihre Anlage heute wert?"
        text="Im Bewertungsrechner sehen Sie den Ertragswert in wenigen Minuten. Mit Ihren Daten machen wir daraus eine belastbare Spanne – und auf Wunsch einen vertraulichen Verkauf."
        primary={{ label: "Anlage bewerten", href: pfad("/rechner/bestandsanlage") }}
        secondary={{ label: "Bestand in der Börse", href: BOERSE }}
      />
    </div>
  );
}

export const generateMetadata = landMetadata("/bestandsanlagen", metadata);
