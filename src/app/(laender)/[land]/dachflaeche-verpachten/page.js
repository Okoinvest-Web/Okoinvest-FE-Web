// src/app/dachflaeche-verpachten/page.js – Landingpage für Dacheigentümer (Gewerbe, Hallen, Landwirtschaft, Logistik)

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
import { landDerSeite, landMetadata } from "@/lib/land/seite";

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

export default async function DachflaecheVerpachtenPage({ params }) {
  await landDerSeite(params, "/dachflaeche-verpachten");
  return (
    <div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Dachpacht für Photovoltaik",
          serviceType: "Pacht und Nutzung großer Dachflächen für Photovoltaikanlagen",
          provider: { "@id": `${abs("/")}/#organization` },
          areaServed: ["DE", "AT", "CH"],
          audience: { "@type": "BusinessAudience", audienceType: "Eigentümer von Gewerbe-, Hallen-, Landwirtschafts- und Logistikdächern" },
          url: abs(PFAD),
          description: BESCHREIBUNG,
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
          <SectionHeading eyebrow="Häufige Fragen" title="Fragen von Dacheigentümern" lead="Ihre Frage ist nicht dabei? Stellen Sie sie im Formular – wir antworten persönlich." />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: pfad("/rechner/dachpacht"), titel: "Dachpacht-Rechner", text: "Leistung, Ertrag und Pachtspanne Ihres Dachs – Pacht, Dachstrom und Eigeninvestition im Vergleich." },
          { href: pfad("/reststrom"), titel: "Reststrom-Pool", text: "Den Strom, den Sie trotz Dachanlage noch kaufen, gebündelt über das virtuelle Kraftwerk beziehen." },
          { href: pfad("/flaeche-verpachten"), titel: "Fläche verpachten", text: "Acker, Grünland oder Konversionsfläche für einen Solarpark verpachten." },
          { href: pfad("/solarcarport"), titel: "Solarcarport", text: "Parkplatz neben der Halle? Strom und Ladepunkte unter einem Dach." },
        ]}
      />

      <CtaBand
        eyebrow="Für Dacheigentümer kostenfrei"
        title="Was ist Ihr Dach als Kraftwerk wert?"
        text="Im Dachpacht-Rechner sehen Sie Leistung, Ertrag und Pachtspanne in einer Minute – und vergleichen Pacht, Dachstrom und Eigeninvestition."
        primary={{ label: "Zum Dachpacht-Rechner", href: pfad("/rechner/dachpacht") }}
        secondary={{ label: "Dach vorstellen", href: "#anfrage" }}
      />
    </div>
  );
}

export const generateMetadata = landMetadata("/dachflaeche-verpachten", metadata);
