// src/app/wissen/lexikon/page.js

import Link from "next/link";
import { BookOpen, Calculator, HelpCircle } from "lucide-react";

import Section from "@/components/ui/Section";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import LexikonExplorer from "@/components/Lexikon/LexikonExplorer";
import LexikonHero from "@/components/Lexikon/LexikonHero";
import { WeiterWissen } from "@/components/Ratgeber/Uebersicht";
import { BEGRIFFE, KATEGORIEN, LEXIKON_STAND, begriffeNachBuchstabe } from "@/data/lexikon";
import { SITE, abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { pfad } from "@/lib/land";

const PAGE_URL = abs("/wissen/lexikon");
const ANZAHL = BEGRIFFE.length;

const TITLE = `Lexikon Solarpark & Agri-PV: ${ANZAHL} Begriffe | ÖkoInvest`;
const DESCRIPTION = `${ANZAHL} Fachbegriffe aus Projektentwicklung, Genehmigung, Strommarkt und Investment – von Aufstellungsbeschluss über PPA bis Zuschlagswert, für DE, AT und CH.`;

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["Solarpark Lexikon", "Agri-PV Begriffe", "Photovoltaik Glossar Freifläche", "Projektrechte", "Ready-to-Build", "PPA Definition", "Energy Sharing"],
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: "ÖkoInvest",
    locale: "de_DE",
    title: `Lexikon: ${ANZAHL} Fachbegriffe zu Solarpark, Agri-PV und Strommarkt`,
    description: DESCRIPTION,
    images: [{ url: abs("/img/solarpark-reihen.jpg"), alt: "Modulreihen eines Solarparks" }],
  },
};

const BELIEBT = ["aufstellungsbeschluss", "dienstbarkeit", "din-spec-91434", "rtb", "ppa", "capture-rate", "energy-sharing"];
const FOKUS = "projektrechte";

export default function LexikonPage() {
  const gruppen = begriffeNachBuchstabe();
  const namen = Object.fromEntries(BEGRIFFE.map((b) => [b.id, b.begriff]));
  const beliebt = BELIEBT.filter((id) => namen[id]);
  const fokus = BEGRIFFE.find((b) => b.id === FOKUS);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${PAGE_URL}/#webpage`,
        url: PAGE_URL,
        name: TITLE,
        description: DESCRIPTION,
        inLanguage: "de",
        isPartOf: { "@id": `${SITE.url}/#website` },
        publisher: { "@id": `${SITE.url}/#organization` },
        dateModified: LEXIKON_STAND,
        mainEntity: { "@id": `${PAGE_URL}/#termset` },
      },
      {
        "@type": "DefinedTermSet",
        "@id": `${PAGE_URL}/#termset`,
        name: "ÖkoInvest-Lexikon",
        description: "Fachbegriffe zu Freiflächen-PV, Agri-PV, Genehmigung, Netzanschluss, Strommarkt, Projekttransaktionen und Energiegemeinschaften in Deutschland, Österreich und der Schweiz.",
        url: PAGE_URL,
        inLanguage: "de",
        publisher: { "@id": `${SITE.url}/#organization` },
        hasDefinedTerm: BEGRIFFE.map((b) => ({
          "@type": "DefinedTerm",
          "@id": `${PAGE_URL}#${b.id}`,
          name: b.begriff,
          description: b.kurz,
          url: `${PAGE_URL}#${b.id}`,
          ...(b.synonyme?.length ? { alternateName: b.synonyme } : {}),
          inDefinedTermSet: { "@id": `${PAGE_URL}/#termset` },
        })),
      },
    ],
  };

  return (
    <>
      <JsonLd daten={jsonLd} />

      <LexikonHero
        anzahl={ANZAHL}
        proBuchstabe={Object.fromEntries(gruppen.map(([l, liste]) => [l, liste.length]))}
        stand="September 2026"
        fokus={fokus ? { id: fokus.id, begriff: fokus.begriff, kurz: fokus.kurz } : null}
        beliebt={beliebt.map((id) => ({ id, begriff: namen[id] }))}
        kennzahlen={[
          { wert: ANZAHL, label: "Fachbegriffe erklärt" },
          { wert: KATEGORIEN.length, label: "Themenfelder" },
          { wert: new Set(BEGRIFFE.filter((b) => b.link).map((b) => b.link.href.split("#")[0])).size, label: "verlinkte Rechner & Seiten" },
        ]}
      />

      <Section tone="sand" space="md" id="lexikon" className="scroll-mt-16 md:pt-16">
        <LexikonExplorer
          gruppen={gruppen}
          kategorien={KATEGORIEN.map((k) => ({ ...k, anzahl: BEGRIFFE.filter((b) => b.kategorie === k.id).length }))}
          namen={namen}
        />
      </Section>

      <WeiterWissen
        eyebrow="Vom Begriff zur Entscheidung"
        titel="Verstanden – und jetzt?"
        wege={[
          { icon: Calculator, titel: "Rechner", text: "Pacht, Agri-PV, Solarpark, Projektbewertung und Reststrom – mit Marktannahmen, Stand September 2026.", href: pfad("/rechner") },
          { icon: BookOpen, titel: "Ratgeber", text: "Pachtvertrag, Bebauungsplan, EEG-Ausschreibung, Projektrechte und PPA ausführlich erklärt – mit Quellen.", href: "/wissen/ratgeber" },
          { icon: HelpCircle, titel: "Häufige Fragen", text: "Kurze Antworten zu Flächencheck, Projektbörse, Portal und Provision.", href: pfad("/faq") },
        ]}
        hinweis={
          <p>
            Fehlt ein Begriff oder hat sich eine Regel geändert?{" "}
            <Link href="/kontakt" className="font-semibold text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current">
              Schreiben Sie uns
            </Link>{" "}
            – wir pflegen das Lexikon laufend.
          </p>
        }
      />

      <Querverweise
        items={[
          { href: pfad("/flaechencheck"), titel: "Flächencheck", text: "Eignet sich Ihre Fläche für Freiflächen- oder Agri-PV? Kostenfreie Ersteinschätzung." },
          { href: "/projektboerse", titel: "Projektbörse", text: "PV-Projekte in allen Phasen – von der Flächensicherung bis Ready-to-Build." },
          { href: pfad("/rechner/pacht"), titel: "Pachtrechner", text: "Was Ihre Fläche als Solarpark über die Laufzeit einbringen kann." },
          { href: "/wissen/ratgeber", titel: "Alle Ratgeber", text: "Fachartikel zu Fläche, Agri-PV, Recht, Investment und Strommarkt." },
        ]}
      />
      <CtaBand
        title="Genug Theorie? Wir prüfen Ihre Fläche oder Ihr Projekt."
        text="Wir erklären jeden Begriff, der in Ihrem Pachtangebot, Ihrem Exposé oder Ihrem Stromvertrag steht – und sagen Ihnen ehrlich, was Ihre Fläche oder Ihr Projekt hergibt."
      />
    </>
  );
}
