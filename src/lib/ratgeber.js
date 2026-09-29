// src/lib/ratgeber.js
//
// Zentrales Register aller Ratgeber-Artikel. Eine neue Seite wird HIER
// eingetragen - Uebersichtsseite, Sitemap, interne Verlinkung und die
// "Weitere Artikel"-Boxen ziehen sich alles aus diesem Array.
//
// WICHTIG: Nur Artikel eintragen, die es auch wirklich gibt
// (src/app/ratgeber/<slug>/page.js), sonst landen 404er in der Sitemap.
//
// Ratgeber-Inhalte sind deutschlandspezifisch und existieren NICHT auf
// oekovolt.com -> sie bekommen bewusst kein hreflang (siehe @/lib/hreflang).

import { INHALTE } from "@/content/ratgeber";

export const RATGEBER_BASE = "/ratgeber";

// Feste Themenbereiche – für Filter auf der Übersicht und thematische Cluster.
export const KATEGORIEN = [
  "Kosten & Wirtschaftlichkeit",
  "Technik & Planung",
  "Speicher & Eigenverbrauch",
  "Wärmepumpe & E-Mobilität",
  "Förderung, Steuern & Recht",
];

// Handgebaute Artikel mit eigener Seite unter src/app/ratgeber/<slug>/page.js
const STATISCHE_ARTIKEL = [
  {
    slug: "wallbox-installation",
    title: "Wallbox Installation: Kosten, Voraussetzungen & Ablauf",
    kurzTitel: "Wallbox Installation",
    description:
      "Wallbox installieren lassen: Kosten ab 1.000 €, 11 oder 22 kW, technische Voraussetzungen, Meldepflicht und Förderung 2026 – vom Elektrofachbetrieb erklärt.",
    excerpt:
      "Eine 11-kW-Wallbox kostet mit Installation 1.000–2.700 €. Warum die Montage meist mehr ausmacht als das Gerät, wann 22 kW sinnvoll sind und was Sie melden müssen.",
    veroeffentlicht: "2026-09-12",
    aktualisiert: "2026-09-13",
    lesezeit: 10,
    kategorie: "Wärmepumpe & E-Mobilität",
    bild: "/Images/Dienstleistungen/Smartphone/wallbox-scaled.jpg",
    bildAlt: "Wallbox an der Außenwand eines modernen Einfamilienhauses",
    keywords: [
      "Wallbox Installation",
      "Wallbox Installation Kosten",
      "Wallbox installieren lassen",
      "Wallbox Voraussetzungen",
      "Wallbox anmelden",
      "11 kW oder 22 kW Wallbox",
    ],
  },
  {
    slug: "solaranlage-kosten",
    title: "Was kostet eine Solaranlage 2026?",
    kurzTitel: "Solaranlage Kosten",
    description:
      "Was eine PV-Anlage 2026 kostet: Preise nach Anlagengröße, was im Komplettpreis steckt, Speicherkosten und laufende Ausgaben – transparent erklärt.",
    excerpt:
      "Rund 980 bis 1.450 Euro je kWp – aber woraus setzt sich der Preis zusammen, und was kommt an laufenden Kosten dazu? Mit Preistabelle nach Anlagengröße.",
    veroeffentlicht: "2026-09-12",
    aktualisiert: "2026-09-13",
    lesezeit: 9,
    kategorie: "Kosten & Wirtschaftlichkeit",
    bild: "/Images/Dienstleistungen/Service/solar-panel-7518786_1280.jpg",
    bildAlt: "Monteur befestigt ein Solarmodul an der Unterkonstruktion",
    keywords: [
      "Solaranlage Kosten",
      "Photovoltaik Kosten",
      "PV-Anlage Preis",
      "Solaranlage mit Speicher Kosten",
      "Photovoltaik Komplettpaket Preis",
      "Kosten pro kWp",
    ],
  },
  {
    slug: "einspeiseverguetung-2026",
    title: "Einspeisevergütung 2026: aktuelle Sätze in ct/kWh",
    // Kurzform fuer Karten und Breadcrumbs
    kurzTitel: "Einspeisevergütung 2026",
    description:
      "Einspeisevergütung 2026: 7,70 ct/kWh bis 10 kWp. Alle Sätze für Teil- und Volleinspeisung, Solarspitzengesetz und was die EEG-Novelle 2027 plant.",
    excerpt:
      "Seit dem 1. August 2026 gelten neue Sätze. Was Sie pro eingespeister Kilowattstunde bekommen, wie lange die Vergütung garantiert ist und warum 2027 alles anders werden könnte.",
    veroeffentlicht: "2026-09-11",
    aktualisiert: "2026-09-13",
    lesezeit: 9,
    kategorie: "Förderung, Steuern & Recht",
    // Bild aus /public
    bild: "/Images/Dienstleistungen/Photovoltaik/fuschl-am-see-scaled-1.jpg",
    bildAlt: "Photovoltaikanlage auf mehreren Dachflächen – Luftaufnahme",
    keywords: [
      "Einspeisevergütung 2026",
      "Einspeisevergütung",
      "EEG Vergütung 2026",
      "Einspeisevergütung Photovoltaik",
      "Volleinspeisung",
      "Überschusseinspeisung",
      "ct pro kWh Einspeisung",
    ],
  },
];

// Inhaltsgetriebene Artikel (src/content/ratgeber/*.js) – gerendert über
// src/app/ratgeber/[slug]/page.js. Lesezeit wird aus der Wortzahl berechnet.
function zaehleWoerter(x) {
  if (typeof x === "string") return x.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").split(/\s+/).filter(Boolean).length;
  if (Array.isArray(x)) return x.reduce((s, y) => s + zaehleWoerter(y), 0);
  if (x && typeof x === "object") {
    return Object.entries(x).reduce((s, [k, v]) => (["id", "typ", "variant", "href", "url"].includes(k) ? s : s + zaehleWoerter(v)), 0);
  }
  return 0;
}

export const INHALTS_ARTIKEL = INHALTE.map((a) => ({
  ...a,
  inhaltsgetrieben: true,
  woerter: zaehleWoerter([a.kurzFazit, a.abschnitte, a.faq]),
  lesezeit: Math.max(3, Math.round(zaehleWoerter([a.kurzFazit, a.abschnitte, a.faq]) / 200)),
}));

export const ARTIKEL = [...STATISCHE_ARTIKEL, ...INHALTS_ARTIKEL];

/** Alle Artikel, neueste zuerst */
export function alleArtikel() {
  return [...ARTIKEL].sort(
    (a, b) => new Date(b.veroeffentlicht) - new Date(a.veroeffentlicht)
  );
}

export function artikelNachSlug(slug) {
  return ARTIKEL.find((a) => a.slug === slug) ?? null;
}

/** Andere Artikel fuer die "Das könnte Sie auch interessieren"-Box */
export function weitereArtikel(slug, limit = 3) {
  // Zuerst Artikel aus demselben Themenbereich (thematisches Cluster), dann die neuesten.
  const eigener = artikelNachSlug(slug);
  const andere = alleArtikel().filter((a) => a.slug !== slug);
  const gleich = eigener ? andere.filter((a) => a.kategorie === eigener.kategorie) : [];
  const rest = andere.filter((a) => !gleich.includes(a));
  return [...gleich, ...rest].slice(0, limit);
}

/** Artikel eines Themenbereichs (für Cluster-Seiten und Übersicht). */
export function artikelNachKategorie(kategorie) {
  return alleArtikel().filter((a) => a.kategorie === kategorie);
}

export function artikelPfad(slug) {
  return `${RATGEBER_BASE}/${slug}`;
}

/** Deutsches Datum: "2026-09-11" -> "11. September 2026" */
export function datumLang(iso) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
