import GoogleAnalytics from "@/components/Statistik/GoogleAnalytics";
import "./globals.css";
import { Inter, Manrope } from "next/font/google";
import LayoutWrapper from "@/components/Reusable/LayoutWrapper";
import { GESELLSCHAFT, SITE } from "@/data/site";

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
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
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
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  referrer: "origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="de" dir="ltr" className={`${inter.variable} ${manrope.variable}`}>
      <body className="bg-white text-ink-900">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#669933] focus:text-white focus:rounded">Zum Hauptinhalt springen</a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }} />
        <LayoutWrapper>{children}</LayoutWrapper>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
