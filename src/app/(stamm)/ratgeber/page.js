// src/app/ratgeber/page.js

import Section from "@/components/ui/Section";
import CtaBand from "@/components/ui/CtaBand";
import { Eyebrow } from "@/components/ui/SectionHeading";
import RatgeberListe from "@/components/Ratgeber/RatgeberListe";
import RatgeberHero from "@/components/Ratgeber/RatgeberHero";
import { FaktenBand, Lesepfade, ThemenRaster, WeiterWissen } from "@/components/Ratgeber/Uebersicht";
import { KATEGORIEN, alleArtikelIn, artikelPfad, kategorieName } from "@/lib/ratgeber";
import { BEGRIFFE } from "@/data/lexikon";
import { AGRI, KOMMUNE, PACHT, PROVISION, STAND } from "@/lib/invest/markt";
import { formate } from "@/lib/sprache/zahlformat";
import { SITE, abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { NewsletterBand } from "@/components/Newsletter/NewsletterAnmeldung";
import { pfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage, landDerAnfrage } from "@/lib/land/seite";
import { ertragFuerLand, foerderwegFuerLand } from "@/components/Land/Laenderteile";
import { landHinweisText, landHinweisTextEn } from "@/lib/land";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";

// Schweiz (/ch, /en/ch): fest geschriebene Texte ohne „ß“ (W3-0, src/components/Land/SchweizerSchreibweise.js)
const chBaum = (el) => schreibweiseBaum(el, landDerAnfrage());

const PAGE_URL = abs("/ratgeber");

const TITEL = "Ratgeber Solarpark, Agri-PV & Pacht 2026 | ÖkoInvest";
const DESCRIPTION =
  "Fachwissen für Flächeneigentümer, Landwirte und Investoren: Pacht, Agri-PV, Genehmigung, Projektrechte, PPA und Energiegemeinschaften in DE, AT und CH.";

const metadata = {
  title: TITEL,
  description: DESCRIPTION,
  keywords: ["Solarpark Ratgeber", "Solarpark Pacht", "Agri-PV", "Freiflächen-PV Genehmigung", "Projektrechte kaufen", "PPA Unternehmen", "Energiegemeinschaft"],
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: "ÖkoInvest",
    locale: "de_DE",
    title: "Ratgeber: Solarpark, Agri-PV, Pacht & Investment | ÖkoInvest",
    description: DESCRIPTION,
    images: [{ url: abs("/img/solarpark-himmel.jpg"), alt: "Solarpark unter blauem Himmel" }],
  },
};

const DESCRIPTION_EN =
  "Expertise for landowners, farmers and investors: lease, agri-PV, permits, project rights, PPAs and energy communities in Germany, Austria and Switzerland.";

const metadataEn = {
  title: "Guides: solar parks, agri-PV & lease 2026 | ÖkoInvest",
  description: DESCRIPTION_EN,
  keywords: ["solar park guide", "solar park lease", "agri-PV", "ground-mounted PV permits", "buying project rights", "PPA for businesses", "energy community"],
  openGraph: {
    title: "Guides: solar parks, agri-PV, lease & investment | ÖkoInvest",
    description: DESCRIPTION_EN,
    images: [{ url: abs("/img/solarpark-himmel.jpg"), alt: "Solar park under a blue sky" }],
  },
};

const TEXTE = {
  de: {
    sammlung: "ÖkoInvest-Ratgeber",
    beschreibung: DESCRIPTION,
    provision: "Verkäuferprovision in der Projektbörse – nur bei Abschluss, für Investoren kostenfrei",
    inPruefung: "in Prüfung",
    giltDe: " (gilt für Deutschland)",
    pacht: (g) => `Pacht je Hektar und Jahr für Freiflächen-PV – ein Vielfaches der üblichen Ackerpacht${g}`,
    gap: "der Fläche einer Agri-PV-Anlage bleiben in Deutschland für GAP-Direktzahlungen förderfähig",
    kommune: (g) => `je kWh dürfen Betreiber nach § 6 EEG freiwillig an die Standortgemeinden zahlen${g}`,
    kennzahlen: ["Fachartikel", "Begriffe im Lexikon", "drei Märkte"],
    alleEyebrow: "Alle Ratgeber",
    alleTitel: "Alle Artikel durchsuchen.",
    alleText: "Nach Thema filtern oder nach Stichwort suchen – Titel, Kurzfassung und Schlagwörter werden durchsucht.",
    ctaEyebrow: "Vom Lesen zum Projekt",
    ctaTitel: "Genug gelesen? Wir prüfen Ihre Fläche oder Ihr Projekt konkret.",
    ctaText: "Aus Richtwerten wird eine Einschätzung: Netzanschluss, Planungsrecht, Flächenkulisse und Wirtschaftlichkeit – kostenfrei für Flächeneigentümer und Investoren.",
  },
  en: {
    sammlung: "ÖkoInvest guides",
    beschreibung: DESCRIPTION_EN,
    provision: "seller commission on the project exchange – only on closing, free of charge for investors",
    inPruefung: "under review",
    giltDe: " (applies to Germany)",
    pacht: (g) => `lease per hectare and year for ground-mounted PV – a multiple of the usual farm rent${g}`,
    gap: "of the area of an agri-PV plant remains eligible for CAP direct payments in Germany",
    kommune: (g) => `per kWh operators may pay host municipalities voluntarily under Section 6 EEG${g}`,
    kennzahlen: ["articles", "glossary terms", "three markets"],
    alleEyebrow: "All guides",
    alleTitel: "Search all articles.",
    alleText: "Filter by topic or search by keyword – titles, summaries and keywords are searched.",
    ctaEyebrow: "From reading to your project",
    ctaTitel: "Read enough? We'll review your land or your project in concrete terms.",
    ctaText: "Indicative values become an assessment: grid connection, planning law, eligible area and economics – free of charge for landowners and investors.",
  },
};

// Redaktionell empfohlene Artikel (suchstärkste Themen); Fallback: neueste
const EMPFOHLEN = ["solarpark-pacht-pro-hektar", "agri-pv-wirtschaftlichkeit", "projektrechte-kaufen-due-diligence"];

export default async function RatgeberPage({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = TEXTE[sprache] || TEXTE.de;
  const { fmt } = formate(sprache);
  const prozent = (n) => (en ? `${n}%` : `${n} %`);
  // Englisch: Artikel ohne englischen Volltext tragen den Vermerk „in German“ (deutsch: true)
  const artikel = alleArtikelIn(sprache).map((a) => (en && !a.englisch ? { ...a, deutsch: true } : a));
  const empfohlen = EMPFOHLEN.map((s) => artikel.find((a) => a.slug === s)).filter(Boolean);
  const buehne = (empfohlen.length === EMPFOHLEN.length ? empfohlen : artikel).slice(0, 3);
  const themen = KATEGORIEN.map((k) => ({ name: k, artikel: artikel.filter((a) => a.kategorie === k) }));
  const zuletzt = artikel.reduce((m, a) => (a.aktualisiert > m ? a.aktualisiert : m), artikel[0]?.aktualisiert || "");
  const vorhanden = new Set(artikel.map((a) => a.slug));
  const ratgeberOder = (slug, ersatz) => (vorhanden.has(slug) ? artikelPfad(slug) : ersatz);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${PAGE_URL}/#collection`,
        url: PAGE_URL,
        name: t.sammlung,
        description: t.beschreibung,
        inLanguage: sprache,
        isPartOf: { "@id": `${SITE.url}/#website` },
        publisher: { "@id": `${SITE.url}/#organization` },
        mainEntity: { "@id": `${PAGE_URL}/#list` },
      },
      {
        "@type": "ItemList",
        "@id": `${PAGE_URL}/#list`,
        itemListElement: artikel.map((a, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: a.title,
          url: abs(artikelPfad(a.slug)),
        })),
      },
    ],
  };

  // Zitierfähige Kennzahlen – alle aus src/lib/invest/markt.js (Werte für Deutschland).
  // Länderfassung AT/CH: statt der deutschen Werte geprüfte Fakten des Landes aus dem Faktenregister
  // (Ertrag PVGIS, Förderweg) und der LandHinweis für Pacht- und Förderwerte.
  const provision = {
    wert: prozent(`${fmt(PROVISION.verkaeufer.min * 100, 1)}–${fmt(PROVISION.verkaeufer.max * 100)}`),
    text: t.provision,
    href: ratgeberOder("projektrechte-kaufen-due-diligence", "/projektboerse"),
  };
  const landRatgeber = land === "AT" ? "freiflaechen-pv-oesterreich" : "freiflaechen-pv-schweiz";
  const ertrag = ertragFuerLand(land, sprache);
  const foerderweg = foerderwegFuerLand(land, sprache);
  const faktenLand = [
    ertrag && { wert: ertrag.wert, text: ertrag.text, href: ratgeberOder(landRatgeber, pfad("/rechner/solarpark")) },
    foerderweg && { wert: foerderweg.wert, text: foerderweg.text, href: ratgeberOder(landRatgeber, pfad("/marktdaten")) },
    { wert: t.inPruefung, text: `${en ? landHinweisTextEn(land, "Lease and support values") : landHinweisText(land, "Pacht- und Förderwerte")}.`, href: "/kontakt" },
    provision,
  ].filter(Boolean);
  const giltDe = land ? "" : t.giltDe;
  const fakten = land === "AT" || land === "CH" ? faktenLand : [
    {
      wert: en ? `€${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)}` : `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €`,
      text: t.pacht(giltDe),
      href: ratgeberOder("solarpark-pacht-pro-hektar", pfad("/flaeche-verpachten")),
    },
    {
      wert: prozent(fmt(AGRI.gapFoerderfaehig * 100)),
      text: t.gap,
      anteil: AGRI.gapFoerderfaehig,
      href: ratgeberOder("agri-pv-foerderung-gap", pfad("/agri-pv")),
    },
    {
      wert: `${fmt(KOMMUNE.beteiligungCt, 1)} ct`,
      text: t.kommune(giltDe),
      href: ratgeberOder("solarpark-genehmigung-bebauungsplan", pfad("/kommunen")),
    },
    provision,
  ];

  return chBaum(
    <>
      <JsonLd daten={jsonLd} />

      <RatgeberHero
        empfohlen={buehne}
        themen={themen.map((t) => ({ name: t.name, anzahl: t.artikel.length }))}
        stand={STAND}
        aktualisiert={zuletzt}
        sprache={sprache}
        kennzahlen={[
          { wert: artikel.length, label: t.kennzahlen[0] },
          { wert: BEGRIFFE.length, label: t.kennzahlen[1] },
          { wert: "DE · AT · CH", label: t.kennzahlen[2] },
        ]}
      />

      <ThemenRaster themen={themen} gesamt={artikel.length} />

      <Lesepfade artikel={artikel} />

      <FaktenBand fakten={fakten} stand={STAND} />

      <Section tone="sand" space="lg" id="alle-artikel" aria-labelledby="alle-titel" className="scroll-mt-16">
        <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="max-w-2xl">
            <Eyebrow className="mb-3">{t.alleEyebrow}</Eyebrow>
            <h2 id="alle-titel" className="ov-h2 text-balance text-ink-900">{t.alleTitel}</h2>
          </div>
          <p className="max-w-sm text-[15.5px] leading-relaxed text-ink-600">{t.alleText}</p>
        </div>
        <RatgeberListe
          kategorien={KATEGORIEN}
          kategorieLabels={Object.fromEntries(KATEGORIEN.map((k) => [k, kategorieName(k, sprache)]))}
          artikel={artikel.map(({ slug, title, excerpt, kategorie, kategorieLabel, bild, bildAlt, lesezeit, keywords, deutsch }) => ({
            slug,
            title,
            excerpt,
            kategorie,
            kategorieLabel,
            bild,
            bildAlt,
            lesezeit,
            keywords: keywords || [],
            ...(deutsch ? { deutsch: true } : {}),
          }))}
        />
      </Section>

      {/* Welle 3, Paket NL: Newsletter je Land (nur sichtbar, solange er Anmeldungen annimmt) */}
      <NewsletterBand quelle="ratgeber" tone="white" />

      <WeiterWissen begriffe={BEGRIFFE.length} />

      <CtaBand
        eyebrow={t.ctaEyebrow}
        title={t.ctaTitel}
        text={t.ctaText}
      />
    </>
  );
}

export const generateMetadata = seitenMetadata("/ratgeber", metadata, { en: metadataEn });
