import GoogleAnalytics from "@/components/Statistik/GoogleAnalytics";
import "./globals.css";
import { Inter, Manrope } from "next/font/google";
import LayoutWrapper from "@/components/Reusable/LayoutWrapper";
import { GESELLSCHAFT, INDEXIERBAR, SITE } from "@/data/site";
import HtmlSprache from "@/components/Seo/HtmlSprache";
import JsonLd from "@/components/JsonLd";

// Zwei Schriften wie auf oekovolt.de: Inter für Fließtext, Manrope für
// Überschriften. next/font hostet beide selbst (keine Verbindung zu Google).
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-manrope",
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
});

const BASE_URL = SITE.url;

const siteSchema = {
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
      parentOrganization: { "@type": "Organization", name: "ÖKOVOLT Gruppe", url: SITE.gruppeUrl },
      areaServed: [
        { "@type": "Country", name: "Deutschland" },
        { "@type": "Country", name: "Österreich" },
        { "@type": "Country", name: "Schweiz" },
      ],
      knowsAbout: [
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
      inLanguage: "de",
      publisher: { "@id": `${BASE_URL}/#organization` },
    },
  ],
};

export const viewport = {
  themeColor: "#669933",
  width: "device-width",
  initialScale: 1,
};

const TITEL = "ÖkoInvest – Solarparks, Agri-PV & Projektbörse für DACH";
const BESCHREIBUNG =
  "Fläche verpachten, Agri-PV umsetzen, PV-Projekte kaufen oder verkaufen, Strom im Pool günstiger beziehen: ÖkoInvest entwickelt Solarkraftwerke in Deutschland, Österreich und der Schweiz.";

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: { default: TITEL, template: "%s" },
  description: BESCHREIBUNG,
  applicationName: "ÖkoInvest",
  authors: [{ name: GESELLSCHAFT.name, url: BASE_URL }],
  creator: GESELLSCHAFT.name,
  publisher: GESELLSCHAFT.name,
  category: "Erneuerbare Energien",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icon.svg",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Bestätigungscodes für Google Search Console / Bing Webmaster Tools – erst
  // nach Festlegung der Produktivdomain über Umgebungsvariablen setzen.
  ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION || process.env.NEXT_PUBLIC_BING_VERIFICATION
    ? {
        verification: {
          ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } : {}),
          ...(process.env.NEXT_PUBLIC_BING_VERIFICATION ? { other: { "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION } } : {}),
        },
      }
    : {}),
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: BASE_URL,
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: `${BASE_URL}/img/solarpark-himmel.jpg`, width: 1280, height: 852, alt: "Solarpark unter blauem Himmel" }],
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

export default function RootLayout({ children }) {
  return (
    <html lang="de" dir="ltr" className={`${inter.variable} ${manrope.variable}`}>
      <body className="bg-white text-ink-900">
        {/* Paket I: Außerhalb der Produktion zusätzlich ein festes noindex (React
            hebt <meta> in den <head>). Seiten mit eigenem robots-Eintrag
            (index: true) überschreiben das metadata-Feld oben; bei zwei
            robots-Angaben gilt für Suchmaschinen die strengere. */}
        {!INDEXIERBAR && <meta name="robots" content="noindex, nofollow" />}
        <HtmlSprache />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-ov-600 focus:text-white focus:rounded">Zum Hauptinhalt springen</a>
        <JsonLd daten={siteSchema} />
        <LayoutWrapper>{children}</LayoutWrapper>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
