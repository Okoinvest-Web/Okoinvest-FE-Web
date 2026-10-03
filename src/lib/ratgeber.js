// src/lib/ratgeber.js
//
// Zentrales Register aller Ratgeber-Artikel. Übersicht, Sitemap, interne
// Verlinkung und die "Weitere Artikel"-Boxen ziehen sich alles hieraus.
//
// Artikel liegen als Inhaltsdateien unter src/content/ratgeber/<slug>.js und
// werden über src/content/ratgeber/index.js registriert
// (node scripts/ratgeber-index.mjs).

import { INHALTE } from "@/content/ratgeber";

export const RATGEBER_BASE = "/wissen/ratgeber";

// Feste Themenbereiche – für Filter auf der Übersicht und thematische Cluster.
export const KATEGORIEN = [
  "Fläche & Pacht",
  "Agri-PV & Landwirtschaft",
  "Investieren & Projektbörse",
  "Recht & Genehmigung",
  "Strom, Markt & Gemeinschaft",
];

// Handgebaute Artikel mit eigener Seite unter src/app/ratgeber/<slug>/page.js
// (derzeit keine – alle Artikel sind inhaltsgetrieben).
const STATISCHE_ARTIKEL = [];

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
