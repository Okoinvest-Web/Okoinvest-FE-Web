// src/app/ratgeber/page.js

import Section from "@/components/ui/Section";
import CtaBand from "@/components/ui/CtaBand";
import { Eyebrow } from "@/components/ui/SectionHeading";
import RatgeberListe from "@/components/Ratgeber/RatgeberListe";
import RatgeberHero from "@/components/Ratgeber/RatgeberHero";
import { FaktenBand, Lesepfade, ThemenRaster, WeiterWissen } from "@/components/Ratgeber/Uebersicht";
import { KATEGORIEN, alleArtikel, artikelPfad } from "@/lib/ratgeber";
import { BEGRIFFE } from "@/data/lexikon";
import { AGRI, KOMMUNE, PACHT, PROVISION, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { SITE, abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { pfad } from "@/lib/land";

const PAGE_URL = abs("/wissen/ratgeber");

const TITEL = "Ratgeber Solarpark, Agri-PV & Pacht 2026 | ÖkoInvest";
const DESCRIPTION =
  "Fachwissen für Flächeneigentümer, Landwirte und Investoren: Pacht, Agri-PV, Genehmigung, Projektrechte, PPA und Energiegemeinschaften in DE, AT und CH.";

export const metadata = {
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

// Redaktionell empfohlene Artikel (suchstärkste Themen); Fallback: neueste
const EMPFOHLEN = ["solarpark-pacht-pro-hektar", "agri-pv-wirtschaftlichkeit", "projektrechte-kaufen-due-diligence"];

export default function RatgeberPage() {
  const artikel = alleArtikel();
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
        name: "ÖkoInvest-Ratgeber",
        description: DESCRIPTION,
        inLanguage: "de",
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

  // Zitierfähige Kennzahlen – alle aus src/lib/invest/markt.js.
  const fakten = [
    {
      wert: `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €`,
      text: "Pacht je Hektar und Jahr für Freiflächen-PV – ein Vielfaches der üblichen Ackerpacht",
      href: ratgeberOder("solarpark-pacht-pro-hektar", pfad("/flaeche-verpachten")),
    },
    {
      wert: `${fmt(AGRI.gapFoerderfaehig * 100)} %`,
      text: "der Fläche einer Agri-PV-Anlage bleiben in Deutschland für GAP-Direktzahlungen förderfähig",
      anteil: AGRI.gapFoerderfaehig,
      href: ratgeberOder("agri-pv-foerderung-gap", pfad("/agri-pv")),
    },
    {
      wert: `${fmt(KOMMUNE.beteiligungCt, 1)} ct`,
      text: "je kWh dürfen Betreiber nach § 6 EEG freiwillig an die Standortgemeinden zahlen",
      href: ratgeberOder("solarpark-genehmigung-bebauungsplan", pfad("/kommunen")),
    },
    {
      wert: `${fmt(PROVISION.verkaeufer.min * 100, 1)}–${fmt(PROVISION.verkaeufer.max * 100)} %`,
      text: "Verkäuferprovision in der Projektbörse – nur bei Abschluss, für Investoren kostenfrei",
      href: ratgeberOder("projektrechte-kaufen-due-diligence", "/projektboerse"),
    },
  ];

  return (
    <>
      <JsonLd daten={jsonLd} />

      <RatgeberHero
        empfohlen={buehne}
        themen={themen.map((t) => ({ name: t.name, anzahl: t.artikel.length }))}
        stand={STAND}
        aktualisiert={zuletzt}
        kennzahlen={[
          { wert: artikel.length, label: "Fachartikel" },
          { wert: BEGRIFFE.length, label: "Begriffe im Lexikon" },
          { wert: "DE · AT · CH", label: "drei Märkte" },
        ]}
      />

      <ThemenRaster themen={themen} gesamt={artikel.length} />

      <Lesepfade artikel={artikel} />

      <FaktenBand fakten={fakten} stand={STAND} />

      <Section tone="sand" space="lg" id="alle-artikel" aria-labelledby="alle-titel" className="scroll-mt-16">
        <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="max-w-2xl">
            <Eyebrow className="mb-3">Alle Ratgeber</Eyebrow>
            <h2 id="alle-titel" className="ov-h2 text-balance text-ink-900">Alle Artikel durchsuchen.</h2>
          </div>
          <p className="max-w-sm text-[15.5px] leading-relaxed text-ink-600">Nach Thema filtern oder nach Stichwort suchen – Titel, Kurzfassung und Schlagwörter werden durchsucht.</p>
        </div>
        <RatgeberListe
          kategorien={KATEGORIEN}
          artikel={artikel.map(({ slug, title, excerpt, kategorie, bild, bildAlt, lesezeit, keywords }) => ({ slug, title, excerpt, kategorie, bild, bildAlt, lesezeit, keywords: keywords || [] }))}
        />
      </Section>

      <WeiterWissen begriffe={BEGRIFFE.length} />

      <CtaBand
        eyebrow="Vom Lesen zum Projekt"
        title="Genug gelesen? Wir prüfen Ihre Fläche oder Ihr Projekt konkret."
        text="Aus Richtwerten wird eine Einschätzung: Netzanschluss, Planungsrecht, Flächenkulisse und Wirtschaftlichkeit – kostenfrei für Flächeneigentümer und Investoren."
      />
    </>
  );
}
