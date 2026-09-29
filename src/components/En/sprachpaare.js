// Sprachpaare DE ↔ EN und Metadaten-Helfer für die englischen Seiten.
// Wird von Server- (metadata) und Client-Komponenten (Sprachwahl) genutzt –
// deshalb bewusst ohne "use client" und ohne Serverabhängigkeiten.

import { SITE } from "@/data/site";

const BASE = SITE.url;
const absolut = (pfad) => `${BASE}${pfad === "/" ? "" : pfad}`;

/** Jede englische Seite mit ihrem deutschen Gegenstück. */
export const SPRACHPAARE = [
  { de: "/", en: "/en", name: "Home" },
  { de: "/investoren", en: "/en/investors", name: "Investors" },
  { de: "/projektboerse", en: "/en/project-exchange", name: "Project exchange" },
  { de: "/projektboerse/anbieten", en: "/en/sell-your-project", name: "Sell your project" },
  { de: "/kontakt", en: "/en/contact", name: "Contact" },
];

const ohneSlash = (p = "/") => (p.length > 1 ? p.replace(/\/$/, "") : p);

/** Deutsches Gegenstück zu einem EN-Pfad (Fallback: Startseite). */
export function deZu(enPfad) {
  const p = ohneSlash(enPfad);
  return SPRACHPAARE.find((x) => x.en === p)?.de || "/";
}

/** Englisches Gegenstück zu einem DE-Pfad (Fallback: /en). */
export function enZu(dePfad) {
  const p = ohneSlash(dePfad);
  return SPRACHPAARE.find((x) => x.de === p)?.en || "/en";
}

export const istEnglisch = (pfad = "") => pfad === "/en" || pfad.startsWith("/en/");

/**
 * Metadaten einer EN-Seite: canonical auf sich selbst, hreflang de/en und
 * x-default (deutsche Fassung ist die Hauptsprache der Website).
 */
export function enMetadata({ pfad, title, description, keywords = [], bild = { src: "/img/solarpark-himmel.jpg", alt: "Solar park under a blue sky" } }) {
  const de = deZu(pfad);
  const url = absolut(pfad);
  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
      languages: { de: absolut(de), en: url, "x-default": absolut(de) },
    },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "en_GB",
      alternateLocale: ["de_DE", "de_AT"],
      url,
      siteName: "ÖkoInvest",
      title,
      description,
      images: [{ url: absolut(bild.src), width: 1280, height: 852, alt: bild.alt }],
    },
    twitter: { card: "summary_large_image", title, description, images: [absolut(bild.src)] },
  };
}

/** Zahlen im englischen Format (1,234.5). */
export const fmtEn = (n, stellen = 0) =>
  Number(n).toLocaleString("en-GB", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

export const fmtEurEn = (n) => `€${fmtEn(Math.round(n))}`;

const MONATE_EN = { Januar: "January", Februar: "February", März: "March", Mai: "May", Juni: "June", Juli: "July", Oktober: "October", Dezember: "December" };

/** Deutsche Monatsnamen in Datumsangaben (z. B. STAND) ins Englische übertragen. */
export const datumEn = (text = "") => String(text).replace(/Januar|Februar|März|Mai|Juni|Juli|Oktober|Dezember/g, (m) => MONATE_EN[m]);
