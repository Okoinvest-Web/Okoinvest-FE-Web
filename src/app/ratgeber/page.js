// src/app/ratgeber/page.js

import Link from "next/link";
import { ArrowUpRight, BookOpen, Calculator, Coins, HelpCircle, Map as KarteIcon, Scale, Sprout, Zap } from "lucide-react";

import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import FeatureGrid from "@/components/ui/FeatureGrid";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import { ArtikelKarte } from "@/components/Ratgeber/Bausteine";
import RatgeberListe from "@/components/Ratgeber/RatgeberListe";
import { KATEGORIEN, alleArtikel, artikelPfad } from "@/lib/ratgeber";
import { BEGRIFFE } from "@/data/lexikon";
import { AGRI, KOMMUNE, PACHT, PROVISION, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { SITE, abs } from "@/data/site";

const KATEGORIE_ICONS = {
  "Fläche & Pacht": KarteIcon,
  "Agri-PV & Landwirtschaft": Sprout,
  "Investieren & Projektbörse": Coins,
  "Recht & Genehmigung": Scale,
  "Strom, Markt & Gemeinschaft": Zap,
};

const PAGE_URL = abs("/ratgeber");

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
  const [top, ...rest] = empfohlen.length === EMPFOHLEN.length ? empfohlen : artikel;
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
      href: ratgeberOder("solarpark-pacht-pro-hektar", "/flaeche-verpachten"),
    },
    {
      wert: `${fmt(AGRI.gapFoerderfaehig * 100)} %`,
      text: "der Fläche einer Agri-PV-Anlage bleiben in Deutschland für GAP-Direktzahlungen förderfähig",
      href: ratgeberOder("agri-pv-foerderung-gap", "/agri-pv"),
    },
    {
      wert: `${fmt(KOMMUNE.beteiligungCt, 1)} ct`,
      text: "je kWh dürfen Betreiber nach § 6 EEG freiwillig an die Standortgemeinden zahlen",
      href: ratgeberOder("solarpark-genehmigung-bebauungsplan", "/kommunen"),
    },
    {
      wert: `${fmt(PROVISION.verkaeufer.min * 100, 1)}–${fmt(PROVISION.verkaeufer.max * 100)} %`,
      text: "Verkäuferprovision in der Projektbörse – nur bei Abschluss, für Investoren kostenfrei",
      href: ratgeberOder("projektrechte-kaufen-due-diligence", "/projektboerse"),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <PageHero
        variant="dark"
        breadcrumbs={[{ name: "Ratgeber" }]}
        eyebrow={`Wissen aus der Projektentwicklung · Stand ${STAND}`}
        title={
          <>
            Ratgeber für <span className="ov-text-gradient-light">Fläche, Projekt und Kapital</span>
          </>
        }
        lead="Was bringt eine Fläche an Pacht, wie läuft ein Bebauungsplan, was ist ein Projekt in welcher Phase wert und wie funktionieren PPA und Energiegemeinschaften? Fachartikel für Deutschland, Österreich und die Schweiz – mit Quellen, Rechenbeispielen und ehrlichen Grenzen."
        stats={[
          { value: artikel.length, label: "Fachartikel" },
          { value: BEGRIFFE.length, label: "Begriffe im Lexikon" },
          { value: 3, label: "Märkte: DE, AT, CH" },
        ]}
      />

      <Section tone="sand" space="lg">
        <SectionHeading eyebrow="Themenbereiche" title="Wählen Sie Ihr Thema" className="mb-10" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {KATEGORIEN.map((k, i) => {
            const liste = artikel.filter((a) => a.kategorie === k);
            const Icon = KATEGORIE_ICONS[k] || BookOpen;
            return (
              <Reveal as="li" key={k} delay={i * 60} className="flex">
                <div className="flex w-full flex-col rounded-3xl bg-white p-6 ring-1 ring-ink-200/60">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-50 text-ov-600">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 font-display text-[17px] font-bold leading-snug text-ink-900">{k}</h3>
                  <p className="mt-1 text-[13.5px] text-ink-500">{liste.length} Artikel</p>
                  <ul className="mt-4 space-y-2 text-[14px]">
                    {liste.slice(0, 4).map((a) => (
                      <li key={a.slug}>
                        <Link href={artikelPfad(a.slug)} className="text-ink-700 underline-offset-2 hover:text-ov-700 hover:underline">
                          {a.kurzTitel || a.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </ul>

        {top && (
          <div className="mt-14">
            <SectionHeading eyebrow="Empfohlen" title="Hier fangen die meisten an" className="mb-8" />
            <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
              <ArtikelKarte artikel={top} gross />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                {rest.slice(0, 2).map((a, i) => (
                  <ArtikelKarte key={a.slug} artikel={a} delay={(i + 1) * 90} />
                ))}
              </div>
            </div>
          </div>
        )}
      </Section>

      <Section tone="white" space="lg" id="alle-artikel">
        <SectionHeading eyebrow="Alle Ratgeber" title="Alle Artikel durchsuchen" className="mb-10" />
        <RatgeberListe
          kategorien={KATEGORIEN}
          artikel={artikel.map(({ slug, title, excerpt, kategorie, bild, bildAlt, lesezeit, keywords }) => ({ slug, title, excerpt, kategorie, bild, bildAlt, lesezeit, keywords: keywords || [] }))}
        />
      </Section>

      <Section tone="navy" space="lg" className="overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -right-32 top-0 h-[420px] w-[420px] rounded-full bg-ov-500/20 blur-[130px]" />
        <div className="relative">
          <SectionHeading dark eyebrow="Mehr Wissen" title="Kurz nachschlagen oder selbst rechnen" className="mb-12" />
          <FeatureGrid
            tone="dark"
            cols={3}
            items={[
              { icon: BookOpen, title: "Lexikon", text: `${BEGRIFFE.length} Fachbegriffe von Aufstellungsbeschluss bis Zuschlagswert – jeweils mit Definition in einem Satz.`, href: "/wissen/lexikon" },
              { icon: Calculator, title: "Rechner", text: "Pacht, Agri-PV, Solarpark, Projektbewertung und Reststrom – mit denselben Marktannahmen wie in den Artikeln.", href: "/rechner" },
              { icon: HelpCircle, title: "Häufige Fragen", text: "Kurze Antworten zu Flächencheck, Projektbörse, Portal, Provision und Ablauf.", href: "/faq" },
            ]}
          />
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading
            eyebrow="Auf einen Blick"
            title="Zahlen, die Sie kennen sollten"
            lead={`Richtwerte aus unseren Ratgebern und Rechnern, Stand ${STAND} – mit der ausführlichen Erklärung verlinkt.`}
          />
          <ul className="grid gap-4 sm:grid-cols-2">
            {fakten.map((f, i) => (
              <Reveal as="li" key={f.text} delay={i * 70} className="flex">
                <Link href={f.href} className="group ov-card-hover relative flex w-full flex-col rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 hover:bg-white hover:ring-ov-200 md:p-7">
                  <ArrowUpRight aria-hidden="true" className="absolute right-5 top-5 h-5 w-5 text-ink-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ov-600" />
                  <span className="ov-num pr-6 font-display text-[clamp(1.7rem,1.4rem+1vw,2.4rem)] font-extrabold leading-none tracking-tight text-ink-900">{f.wert}</span>
                  <span className="mt-3 text-[15px] leading-relaxed text-ink-600">{f.text}</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      <CtaBand
        eyebrow="Vom Lesen zum Projekt"
        title="Genug gelesen? Wir prüfen Ihre Fläche oder Ihr Projekt konkret."
        text="Aus Richtwerten wird eine Einschätzung: Netzanschluss, Planungsrecht, Flächenkulisse und Wirtschaftlichkeit – kostenfrei für Flächeneigentümer und Investoren."
      />
    </>
  );
}
