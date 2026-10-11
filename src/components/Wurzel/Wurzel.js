// Gemeinsamer Rahmen der Root-Layouts (Welle 2, Länderrouting).
//
// Die Website hat drei Root-Layouts, damit <html lang> serverseitig stimmt:
//   src/app/(stamm)/layout.js          lang="de"     – gemeinsame Seiten, Portal, Login, Token-Strecken
//   src/app/(laender)/[land]/layout.js lang="de-DE" | "de-AT" | "de-CH" – Länderfassungen derselben Seiten
//   src/app/(en)/layout.js             lang="en"     – englische Fassungen derselben Seiten (/en, /en/at …)
// Land (Ländermodell) und Sprache (Sprachmodell) gehen als Kontext an alle Client-Komponenten
// (LandProvider, SpracheProvider).
// plus src/app/global-not-found.js für Pfade außerhalb aller Layouts.
// Ein Wechsel zwischen Root-Layouts lädt die Seite vollständig neu (Next.js) – gewollt.
//
// Alles, was vorher im einzigen Root-Layout stand (Schriften, Metadaten, JSON-LD,
// noindex außerhalb der Produktion, Sprunglink, LayoutWrapper, GA), steht jetzt hier.

import GoogleAnalytics from "@/components/Statistik/GoogleAnalytics";
import { Inter, Manrope } from "next/font/google";
import LayoutWrapper from "@/components/Reusable/LayoutWrapper";
import { GESELLSCHAFT, INDEXIERBAR, KONTAKT, SITE } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { LandProvider } from "@/components/Land/LandKontext";
import { SpracheProvider } from "@/components/Sprache/SpracheKontext";
import { LAND_AUS_PFAD } from "@/lib/land/laender";
import { verifizierungMetadaten } from "@/lib/verifizierung";

export { LAND_AUS_PFAD };

// Zwei Schriften wie auf oekovolt.de: Inter für Fließtext, Manrope für
// Überschriften. next/font hostet beide selbst (keine Verbindung zu Google).
// SEO-Finale (TEMPO): keine eigene `fallback`-Liste mehr – mit ihr erzeugte next/font
// KEINE metrisch angepasste Ersatzschrift (kein size-adjust/ascent-override im CSS),
// und beim Eintreffen von Inter/Manrope brachen Zeilen neu um (gemessen: CLS 0,11 auf
// /dachflaeche-verpachten). `adjustFontFallback` (Standard) legt jetzt "Inter Fallback"/
// "Manrope Fallback" auf Arial-Basis an – gleiche Zeilenumbrüche vor und nach dem Laden.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-manrope",
});

const BASE_URL = SITE.url;

const siteSchema = (inLanguage) => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "ÖkoInvest",
      legalName: GESELLSCHAFT.name,
      alternateName: ["Oekoinvest", "ÖkoInvest GmbH", "ÖKOINVEST"],
      url: BASE_URL,
      logo: { "@type": "ImageObject", "@id": `${BASE_URL}/#logo`, url: `${BASE_URL}/icon-512.png`, width: 512, height: 512, caption: "ÖkoInvest" },
      image: { "@id": `${BASE_URL}/#logo` },
      description: SITE.kurz,
      slogan: SITE.claim,
      foundingDate: "2020-09-10",
      address: {
        "@type": "PostalAddress",
        streetAddress: GESELLSCHAFT.sitz,
        addressLocality: GESELLSCHAFT.ort,
        postalCode: GESELLSCHAFT.plz,
        addressCountry: "AT",
      },
      identifier: { "@type": "PropertyValue", propertyID: "Firmenbuchnummer", value: GESELLSCHAFT.register },
      vatID: GESELLSCHAFT.uid,
      telephone: KONTAKT.telefon,
      email: KONTAKT.email,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: KONTAKT.telefon,
        email: KONTAKT.email,
        availableLanguage: ["de", "en"],
        areaServed: ["DE", "AT", "CH"],
      },
      parentOrganization: { "@type": "Organization", name: "ÖKOVOLT Gruppe", url: SITE.gruppeUrl },
      areaServed: [
        { "@type": "Country", name: "Deutschland" },
        { "@type": "Country", name: "Österreich" },
        { "@type": "Country", name: "Schweiz" },
      ],
      knowsAbout:
        inLanguage === "en"
          ? ["Ground-mounted photovoltaics", "Agrivoltaics", "Solar carports", "Solar park project development", "Land lease for photovoltaics", "Photovoltaic project rights", "Power purchase agreement", "Virtual power plant", "Energy communities", "Energy cooperative", "Utility-scale battery storage"]
          : [
              "Freiflächen-Photovoltaik",
              "Agri-Photovoltaik",
              "Solarcarports",
              "Projektentwicklung Solarpark",
              "Flächenpacht Photovoltaik",
              "Projektrechte Photovoltaik",
              "Power Purchase Agreement",
              "Virtuelles Kraftwerk",
              "Energiegemeinschaften",
              "Energiegenossenschaft",
              "Batteriegroßspeicher",
            ],
    },
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      url: BASE_URL,
      name: "ÖkoInvest",
      inLanguage,
      publisher: { "@id": `${BASE_URL}/#organization` },
      // Sitelinks-Suche: /quellen (Faktenregister) liest ?q= clientseitig
      // (src/components/Quellen/FaktenSuche.js) und filtert damit die Fakten.
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/quellen?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
});

export const viewport = {
  themeColor: "#669933",
  width: "device-width",
  initialScale: 1,
};

const TEXTE = {
  de: {
    titel: "ÖkoInvest – Solarparks, Agri-PV & Projektbörse für DACH",
    beschreibung:
      "Fläche verpachten, Agri-PV umsetzen, PV-Projekte kaufen oder verkaufen, Strom im Pool günstiger beziehen: ÖkoInvest entwickelt Solarkraftwerke in Deutschland, Österreich und der Schweiz.",
    kategorie: "Erneuerbare Energien",
    bildAlt: "Solarpark unter blauem Himmel",
    sprung: "Zum Hauptinhalt springen",
  },
  en: {
    titel: "ÖkoInvest – solar parks, agrivoltaics & project exchange for the DACH region",
    beschreibung:
      "Lease your land, implement agrivoltaics, buy or sell PV projects, source power more cheaply in a pool: ÖkoInvest develops solar power plants in Germany, Austria and Switzerland.",
    kategorie: "Renewable energy",
    bildAlt: "Solar park under a blue sky",
    sprung: "Skip to main content",
  },
};

/** Basis-Metadaten aller Root-Layouts; ogLocale je Zone („de_DE“, „de_AT“, „de_CH“, „en_GB“). */
export function basisMetadata({ ogLocale = "de_DE", sprache = "de" } = {}) {
  const t = sprache === "en" ? TEXTE.en : TEXTE.de;
  const TITEL = t.titel;
  const BESCHREIBUNG = t.beschreibung;
  return {
    metadataBase: new URL(BASE_URL),
    title: { default: TITEL, template: "%s" },
    description: BESCHREIBUNG,
    applicationName: "ÖkoInvest",
    authors: [{ name: GESELLSCHAFT.name, url: BASE_URL }],
    creator: GESELLSCHAFT.name,
    publisher: GESELLSCHAFT.name,
    category: t.kategorie,
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      shortcut: "/icon.svg",
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    // Bestätigungscodes für Google Search Console / Bing Webmaster Tools – erst
    // nach Festlegung der Produktivdomain über Umgebungsvariablen setzen (nur gültige Codes, src/lib/verifizierung.js).
    ...verifizierungMetadaten({ google: process.env.NEXT_PUBLIC_GSC_VERIFICATION, bing: process.env.NEXT_PUBLIC_BING_VERIFICATION }),
    openGraph: {
      type: "website",
      locale: ogLocale,
      url: BASE_URL,
      siteName: "ÖkoInvest",
      title: TITEL,
      description: BESCHREIBUNG,
      images: [{ url: `${BASE_URL}/img/solarpark-himmel.jpg`, width: 1280, height: 852, alt: t.bildAlt }],
    },
    twitter: { card: "summary_large_image", title: TITEL, description: BESCHREIBUNG, images: [`${BASE_URL}/img/solarpark-himmel.jpg`] },
    // Paket I: Indexierung nur in der echten Produktion (INDEXIERBAR, src/data/site.js).
    robots: INDEXIERBAR
      ? {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
        }
      : { index: false, follow: false, nocache: true },
    referrer: "origin-when-cross-origin",
    formatDetection: { email: false, address: false, telephone: false },
  };
}

/**
 * <html>/<body> mit allem, was jede Seite braucht.
 * @param {{ lang: string, sprache?: "de"|"en", land?: "DE"|"AT"|"CH"|null|"pfad", children: any }} p
 *   land = LAND_AUS_PFAD: Land im Browser aus dem Pfad (englische Seiten, ein Root-Layout für /en/**)
 */
export default function Wurzel({ lang, sprache = "de", land = null, children }) {
  return (
    <html lang={lang} dir="ltr" className={`${inter.variable} ${manrope.variable}`}>
      <body className="bg-white text-ink-900">
        {/* Paket I: Außerhalb der Produktion zusätzlich ein festes noindex (React
            hebt <meta> in den <head>). Seiten mit eigenem robots-Eintrag
            (index: true) überschreiben das metadata-Feld; bei zwei
            robots-Angaben gilt für Suchmaschinen die strengere. */}
        {!INDEXIERBAR && <meta name="robots" content="noindex, nofollow" />}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-ov-600 focus:text-white focus:rounded">
          {(sprache === "en" ? TEXTE.en : TEXTE.de).sprung}
        </a>
        {/* Land aus dem Root-Layout: de-CH → strukturierte Daten ohne „ß“ (das Layout rendert vor der Seite) */}
        <JsonLd daten={siteSchema(lang)} land={lang === "de-CH" ? "CH" : null} />
        <SpracheProvider sprache={sprache}>
          <LandProvider land={land}>
            <LayoutWrapper>{children}</LayoutWrapper>
          </LandProvider>
        </SpracheProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
