// src/app/flaeche-verpachten/page.js – Landingpage für Flächeneigentümer

import { CalendarClock, HandCoins, Landmark, Wallet } from "lucide-react";

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

const PFAD = "/flaeche-verpachten";
const TITEL = "Fläche für Solarpark verpachten | ÖkoInvest";
const BESCHREIBUNG =
  "Acker oder Grünland für einen Solarpark verpachten: Pachtmodelle, Vertrag, Rückbausicherheit, Steuern und Ablauf bis zur ersten Pacht. Jetzt Fläche melden.";

export const metadata = {
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

const FAKTEN = [
  { icon: Wallet, wert: `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)}`, einheit: "€ je Hektar und Jahr", text: `übliche Solarpacht im DACH-Raum, typisch um ${fmt(PACHT.freiflaecheProHa.mittel)} €` },
  { icon: CalendarClock, wert: `${PACHT.laufzeit} J.`, einheit: "Laufzeit", text: `ab Inbetriebnahme, dazu ${PACHT.verlaengerung}` },
  { icon: HandCoins, wert: `${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} €`, einheit: "Reservierungsprämie", text: "je Hektar und Jahr bis Baubeginn – Sie bewirtschaften weiter" },
  { icon: Landmark, wert: "0 €", einheit: "Kosten für Sie", text: `Prüfung, Angebot, Vertrag und Notar – ${PROVISION.flaeche.text}` },
];

const FAQ = [
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

export default function FlaecheVerpachtenPage() {
  return (
    <div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Pacht von Flächen für Solarparks",
          serviceType: "Flächenpacht für Freiflächen-Photovoltaik",
          provider: { "@id": `${abs("/")}/#organization` },
          areaServed: ["DE", "AT", "CH"],
          audience: { "@type": "Audience", audienceType: "Flächeneigentümer und Landwirte" },
          url: abs(PFAD),
          description: BESCHREIBUNG,
        }}
      />

      <Hero />
      <Faktenleiste titel="Eckdaten der Solarpacht" fakten={FAKTEN} />
      <Pachtmodelle />
      <Vertrag />
      <Steuern />
      <Pruefung />
      <Weg />
      <Anfrage />

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Fragen von Flächeneigentümern" lead="Ihre Frage ist nicht dabei? Stellen Sie sie im Formular – wir antworten persönlich." />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/rechner/pacht", titel: "Pachtrechner", text: "Fest, indexiert oder Umsatzbeteiligung – Ihre Pacht über 30 Jahre im Vergleich zum Ackerbau." },
          { href: "/flaechencheck", titel: "Flächencheck", text: "Ampel, Leistung und Pachtspanne Ihrer Fläche in zwei Minuten." },
          { href: "/dachflaeche-verpachten", titel: "Dachfläche verpachten", text: "Gewerbe-, Hallen- und Stalldächer ab etwa 1.000 m² – Pacht, Dachstrom oder Sanierung als Gegenleistung." },
          { href: "/landwirte", titel: "Für Landwirte", text: "Verpachten, selbst investieren oder beteiligen – die vier Wege mit Agri-PV." },
          { href: "/ratgeber/solarpark-pacht-pro-hektar", titel: "Solarpark-Pacht pro Hektar", text: "Spannen, Einflussfaktoren und ein Rechenbeispiel für 2026." },
          { href: "/ratgeber/pachtvertrag-solarpark", titel: "Pachtvertrag Solarpark", text: "Die wichtigsten Klauseln und eine Checkliste für Eigentümer." },
        ]}
      />

      <CtaBand
        eyebrow="Für Flächeneigentümer kostenfrei"
        title="Was ist Ihre Fläche als Solarpark wert?"
        text="Zwei Minuten im Flächencheck – mit Ampel, möglicher Leistung und Pachtspanne. Das Ergebnis landet auf Wunsch direkt bei unserem Flächenteam."
        primary={{ label: "Zum Flächencheck", href: "/flaechencheck" }}
        secondary={{ label: "Pachtrechner", href: "/rechner/pacht" }}
      />
    </div>
  );
}
