// src/app/flaechencheck/page.js – Flächencheck (Wizard)

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import FlaechenWizard from "@/components/Flaeche/FlaechenWizard";
import { CheckHero, SoBewertenWir } from "@/components/Flaeche/Check/Abschnitte";
import { AnnahmenBox } from "@/components/Rechner/RechnerSeite";
import { abs } from "@/data/site";
import { FREIFLAECHE, PACHT, PROVISION } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import JsonLd from "@/components/JsonLd";

const PFAD = "/flaechencheck";
const TITEL = "Flächencheck Solarpark: Eignet sich Ihre Fläche? | ÖkoInvest";
const BESCHREIBUNG =
  "Eignet sich Ihre Fläche für Solarpark oder Agri-PV? Lage, Größe, Nutzung und Netz angeben – Ampel, Leistung, Stromertrag und Pachtspanne in zwei Minuten.";

export const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  alternates: { canonical: abs(PFAD) },
  robots: { index: true, follow: true },
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

const FAQ = [
  {
    q: "Wie genau ist der Flächencheck?",
    a: "Er ist eine erste, transparente Einschätzung auf Basis Ihrer Angaben und typischer Marktwerte – vergleichbar mit dem ersten Gespräch mit einem Projektentwickler. Netzkapazität, Planungsrecht, Schutzgebiete und Bodenverhältnisse prüfen wir anschließend flurstückgenau.",
  },
  {
    q: "Was passiert mit meinen Angaben?",
    a: "Solange Sie das Formular nicht absenden, bleiben alle Angaben in Ihrem Browser. Senden Sie das Ergebnis ab, legen wir einen Vorgang an; registrieren Sie sich später mit derselben E-Mail, sehen Sie ihn samt Status im Portal.",
  },
  {
    q: "Warum ist die Netzentfernung so wichtig?",
    a: `Jeder Kilometer Mittelspannungskabel kostet grob ${fmt(FREIFLAECHE.kabelProMeter)} Tsd. €. Bei einem kleinen Park fällt das je Kilowatt stark ins Gewicht, bei einem großen kaum. Deshalb rechnet der Check die Netzkosten je kWp – und noch wichtiger ist, ob das Netz überhaupt Kapazität frei hat.`,
  },
  {
    q: "Meine Fläche ist rot – lohnt sich eine Anfrage trotzdem?",
    a: "Oft ja. Die Heuristik kennt Ihre Fläche nicht im Detail. Mit Nachbarflächen, als Agri-PV oder mit einem anderen Netzanschlusspunkt kann ein Projekt trotzdem möglich sein. Wenn nicht, sagen wir es Ihnen offen.",
  },
  {
    q: "Was kostet mich die Prüfung?",
    a: `Nichts. ${PROVISION.flaeche.text[0].toUpperCase()}${PROVISION.flaeche.text.slice(1)} – vom Flächencheck über das Pachtangebot bis zum Vertrag.`,
  },
];

export default function FlaechencheckPage() {
  return (
    <div>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "ÖkoInvest Flächencheck",
          url: abs(PFAD),
          description: BESCHREIBUNG,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          inLanguage: "de",
          isAccessibleForFree: true,
          publisher: { "@id": `${abs("/")}/#organization` },
        }}
      />

      <CheckHero />

      <section id="check" aria-label="Flächencheck" className="relative z-10 -mt-20 scroll-mt-24 pb-6 md:-mt-28 md:pb-10">
        <div className="ov-container">
          <FlaechenWizard />
        </div>
      </section>

      <Section tone="white" space="lg">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <SoBewertenWir />
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <AnnahmenBox
              punkte={[
                ["Ampel", "grün ab 65, gelb ab 40 Punkten"],
                ["Flächenbedarf", `${fmt(FREIFLAECHE.haProMwp, 1)} ha je MWp`],
                ["Mindestgröße Solarpark", `ab ${FREIFLAECHE.mindestHa} ha`],
                ["Kabeltrasse Mittelspannung", `${fmt(FREIFLAECHE.kabelProMeter)} €/m`],
                ["Übergabestation", `${fmt(FREIFLAECHE.netzanschlussFixProMwp)} €/MWp`],
                ["Pacht Freifläche", `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €/ha·a`],
                ["Pacht Agri-PV", `${fmt(PACHT.agriProHa.min)}–${fmt(PACHT.agriProHa.max)} €/ha·a`],
                ["Indexierung Pacht", `${fmt(PACHT.indexierung * 100, 1)} % p. a.`],
              ]}
              quellen={[
                { name: "PVGIS", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" },
                { name: "Bundesnetzagentur", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" },
              ]}
            />
          </Reveal>
        </div>
      </Section>

      <Section tone="sand" space="md">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Zum Flächencheck" lead="Ihre Frage ist nicht dabei? Stellen Sie sie im Formular unter dem Ergebnis." />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/freiflaeche", titel: "Freiflächen-PV", text: "Flächenkriterien, EEG-Kulisse, Genehmigung in DE, AT und CH." },
          { href: "/rechner/pacht", titel: "Pachtrechner", text: "Festpacht, indexiert oder Umsatzbeteiligung über 30 Jahre." },
          { href: "/flaeche-verpachten", titel: "Fläche verpachten", text: "Was im Vertrag steht und wie es bis zur ersten Pacht weitergeht." },
          { href: "/agri-pv", titel: "Agri-PV", text: "Strom und Landwirtschaft auf derselben Fläche." },
        ]}
      />

      <CtaBand
        eyebrow="Persönlich statt Formular"
        title="Lieber gleich mit dem Flächenteam sprechen?"
        text="Schicken Sie uns Ihre Flurstücke – wir prüfen Netz, Kulisse und Restriktionen und melden uns mit einer ehrlichen Einschätzung."
        primary={{ label: "Fläche verpachten", href: "/flaeche-verpachten" }}
        secondary={{ label: "Für Landwirte", href: "/landwirte" }}
      />
    </div>
  );
}
