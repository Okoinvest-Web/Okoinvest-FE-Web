// src/app/wissen/lexikon/page.js

import Link from "@/components/Land/Link";
import { BookOpen, Calculator, HelpCircle } from "lucide-react";

import Section from "@/components/ui/Section";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import LexikonExplorer from "@/components/Lexikon/LexikonExplorer";
import LexikonHero from "@/components/Lexikon/LexikonHero";
import { WeiterWissen } from "@/components/Ratgeber/Uebersicht";
import { BEGRIFFE, KATEGORIEN, LEXIKON_STAND, begriffeNachBuchstabe } from "@/data/lexikon";
import { begriffeEn, begriffeNachBuchstabeEn, kategorienEn } from "@/data/lexikon-en";
import { SITE, abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { pfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage, landDerAnfrage } from "@/lib/land/seite";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";

// Schweiz (/ch, /en/ch): fest geschriebene Texte ohne „ß“ (W3-0, src/components/Land/SchweizerSchreibweise.js)
const chBaum = (el) => schreibweiseBaum(el, landDerAnfrage());

const PAGE_URL = abs("/wissen/lexikon");
const ANZAHL = BEGRIFFE.length;

const TITLE = `Lexikon Solarpark & Agri-PV: ${ANZAHL} Begriffe | ÖkoInvest`;
const DESCRIPTION = `${ANZAHL} Fachbegriffe aus Projektentwicklung, Genehmigung, Strommarkt und Investment – von Aufstellungsbeschluss über PPA bis Zuschlagswert, für DE, AT und CH.`;

const metadata = {
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

const TITLE_EN = `Solar park & agri-PV glossary: ${ANZAHL} terms | ÖkoInvest`;
const DESCRIPTION_EN = `${ANZAHL} technical terms from project development, permitting, the power market and investment – from the decision to draw up a development plan to PPAs and award values, for Germany, Austria and Switzerland.`;

const metadataEn = {
  title: TITLE_EN,
  description: DESCRIPTION_EN,
  keywords: ["solar park glossary", "agri-PV terms", "ground-mounted photovoltaics glossary", "project rights", "ready-to-build", "PPA definition", "energy sharing"],
  openGraph: {
    title: `Glossary: ${ANZAHL} technical terms on solar parks, agri-PV and the power market`,
    description: DESCRIPTION_EN,
    images: [{ url: abs("/img/solarpark-reihen.jpg"), alt: "Module rows of a solar park" }],
  },
};

const TEXTE = {
  de: {
    stand: "September 2026",
    kennzahlen: ["Fachbegriffe erklärt", "Themenfelder", "verlinkte Rechner & Seiten"],
    setName: "ÖkoInvest-Lexikon",
    setText: "Fachbegriffe zu Freiflächen-PV, Agri-PV, Genehmigung, Netzanschluss, Strommarkt, Projekttransaktionen und Energiegemeinschaften in Deutschland, Österreich und der Schweiz.",
    weiterEyebrow: "Vom Begriff zur Entscheidung",
    weiterTitel: "Verstanden – und jetzt?",
    wege: [
      { titel: "Rechner", text: "Pacht, Agri-PV, Solarpark, Projektbewertung und Reststrom – mit Marktannahmen, Stand September 2026." },
      { titel: "Ratgeber", text: "Pachtvertrag, Bebauungsplan, EEG-Ausschreibung, Projektrechte und PPA ausführlich erklärt – mit Quellen." },
      { titel: "Häufige Fragen", text: "Kurze Antworten zu Flächencheck, Projektbörse, Portal und Provision." },
    ],
    fehlt: "Fehlt ein Begriff oder hat sich eine Regel geändert?",
    schreiben: "Schreiben Sie uns",
    pflegen: "– wir pflegen das Lexikon laufend.",
    querverweise: [
      { titel: "Flächencheck", text: "Eignet sich Ihre Fläche für Freiflächen- oder Agri-PV? Kostenfreie Ersteinschätzung." },
      { titel: "Projektbörse", text: "PV-Projekte in allen Phasen – von der Flächensicherung bis Ready-to-Build." },
      { titel: "Pachtrechner", text: "Was Ihre Fläche als Solarpark über die Laufzeit einbringen kann." },
      { titel: "Alle Ratgeber", text: "Fachartikel zu Fläche, Agri-PV, Recht, Investment und Strommarkt." },
    ],
    ctaTitel: "Genug Theorie? Wir prüfen Ihre Fläche oder Ihr Projekt.",
    ctaText: "Wir erklären jeden Begriff, der in Ihrem Pachtangebot, Ihrem Exposé oder Ihrem Stromvertrag steht – und sagen Ihnen ehrlich, was Ihre Fläche oder Ihr Projekt hergibt.",
  },
  en: {
    stand: "September 2026",
    kennzahlen: ["terms explained", "topic areas", "linked calculators & pages"],
    setName: "ÖkoInvest glossary",
    setText: "Technical terms on ground-mounted PV, agri-PV, permitting, grid connection, the power market, project transactions and energy communities in Germany, Austria and Switzerland.",
    weiterEyebrow: "From term to decision",
    weiterTitel: "Understood – what next?",
    wege: [
      { titel: "Calculators", text: "Lease, agri-PV, solar park, project valuation and residual power – with market assumptions as of September 2026." },
      { titel: "Guides", text: "Lease agreements, development plans, EEG tenders, project rights and PPAs explained in detail – with sources." },
      { titel: "Frequently asked questions", text: "Short answers on the land check, project exchange, portal and commission." },
    ],
    fehlt: "Is a term missing or has a rule changed?",
    schreiben: "Write to us",
    pflegen: "– we keep the glossary up to date.",
    querverweise: [
      { titel: "Land check", text: "Is your land suitable for ground-mounted or agri-PV? Free initial assessment." },
      { titel: "Project exchange", text: "PV projects in all phases – from land security to ready-to-build." },
      { titel: "Lease calculator", text: "What your land could earn as a solar park over the term." },
      { titel: "All guides", text: "Articles on land, agri-PV, law, investment and the power market." },
    ],
    ctaTitel: "Enough theory? We'll review your land or your project.",
    ctaText: "We explain every term in your lease offer, your information memorandum or your electricity contract – and tell you honestly what your land or your project can achieve.",
  },
};

const BELIEBT = ["aufstellungsbeschluss", "dienstbarkeit", "din-spec-91434", "rtb", "ppa", "capture-rate", "energy-sharing"];
const FOKUS = "projektrechte";

export default async function LexikonPage({ params }) {
  await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = TEXTE[sprache] || TEXTE.de;
  const begriffe = en ? begriffeEn() : BEGRIFFE;
  const kategorienListe = en ? kategorienEn() : KATEGORIEN;
  const gruppen = en ? begriffeNachBuchstabeEn() : begriffeNachBuchstabe();
  const namen = Object.fromEntries(begriffe.map((b) => [b.id, b.begriff]));
  const beliebt = BELIEBT.filter((id) => namen[id]);
  const fokus = begriffe.find((b) => b.id === FOKUS);
  const seitenUrl = en ? abs("/en/wissen/lexikon") : PAGE_URL;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${seitenUrl}/#webpage`,
        url: seitenUrl,
        name: en ? TITLE_EN : TITLE,
        description: en ? DESCRIPTION_EN : DESCRIPTION,
        inLanguage: sprache,
        isPartOf: { "@id": `${SITE.url}/#website` },
        publisher: { "@id": `${SITE.url}/#organization` },
        dateModified: LEXIKON_STAND,
        mainEntity: { "@id": `${seitenUrl}/#termset` },
      },
      {
        "@type": "DefinedTermSet",
        "@id": `${seitenUrl}/#termset`,
        name: t.setName,
        description: t.setText,
        url: seitenUrl,
        inLanguage: sprache,
        publisher: { "@id": `${SITE.url}/#organization` },
        hasDefinedTerm: begriffe.map((b) => ({
          "@type": "DefinedTerm",
          "@id": `${seitenUrl}#${b.id}`,
          name: b.begriff,
          description: b.kurz,
          url: `${seitenUrl}#${b.id}`,
          ...(b.synonyme?.length ? { alternateName: b.synonyme } : {}),
          inDefinedTermSet: { "@id": `${seitenUrl}/#termset` },
        })),
      },
    ],
  };

  return chBaum(
    <>
      <JsonLd daten={jsonLd} />

      <LexikonHero
        anzahl={ANZAHL}
        proBuchstabe={Object.fromEntries(gruppen.map(([l, liste]) => [l, liste.length]))}
        stand={t.stand}
        sprache={sprache}
        fokus={fokus ? { id: fokus.id, begriff: fokus.begriff, kurz: fokus.kurz } : null}
        beliebt={beliebt.map((id) => ({ id, begriff: namen[id] }))}
        kennzahlen={[
          { wert: ANZAHL, label: t.kennzahlen[0] },
          { wert: KATEGORIEN.length, label: t.kennzahlen[1] },
          { wert: new Set(BEGRIFFE.filter((b) => b.link).map((b) => b.link.href.split("#")[0])).size, label: t.kennzahlen[2] },
        ]}
      />

      <Section tone="sand" space="md" id="lexikon" className="scroll-mt-16 md:pt-16">
        <LexikonExplorer
          gruppen={gruppen}
          kategorien={kategorienListe.map((k) => ({ ...k, anzahl: BEGRIFFE.filter((b) => b.kategorie === k.id).length }))}
          namen={namen}
        />
      </Section>

      <WeiterWissen
        eyebrow={t.weiterEyebrow}
        titel={t.weiterTitel}
        wege={[
          { icon: Calculator, ...t.wege[0], href: pfad("/rechner") },
          { icon: BookOpen, ...t.wege[1], href: "/ratgeber" },
          { icon: HelpCircle, ...t.wege[2], href: pfad("/faq") },
        ]}
        hinweis={
          <p>
            {t.fehlt}{" "}
            <Link href="/kontakt" className="font-semibold text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current">
              {t.schreiben}
            </Link>{" "}
            {t.pflegen}
          </p>
        }
      />

      <Querverweise
        items={[
          { href: pfad("/flaechencheck"), ...t.querverweise[0] },
          { href: "/projektboerse", ...t.querverweise[1] },
          { href: pfad("/rechner/pacht"), ...t.querverweise[2] },
          { href: "/ratgeber", ...t.querverweise[3] },
        ]}
      />
      <CtaBand
        title={t.ctaTitel}
        text={t.ctaText}
      />
    </>
  );
}

export const generateMetadata = seitenMetadata("/wissen/lexikon", metadata, { en: metadataEn });
