// src/lib/ratgeber.js
//
// Zentrales Register aller Ratgeber-Artikel. Übersicht, Sitemap, interne
// Verlinkung und die "Weitere Artikel"-Boxen ziehen sich alles hieraus.
//
// Artikel liegen als Inhaltsdateien unter src/content/ratgeber/<slug>.js und
// werden über src/content/ratgeber/index.js registriert
// (node scripts/ratgeber-index.mjs).

import { INHALTE } from "@/content/ratgeber";
import { META_EN, KATEGORIEN_EN } from "@/content/ratgeber/en/meta";
import { VOLLTEXT_EN } from "@/content/ratgeber/en";
import { zusammenfuehren } from "@/lib/sprache/woerterbuch";

export const RATGEBER_BASE = "/ratgeber";

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

/* ------------------------------------------------------------------ */
/* Sprachmodell: englische Fassung der Artikel                          */
/* ------------------------------------------------------------------ */
// Metadaten (Titel, Kurzfassung, Kennzahl) gibt es für alle Artikel englisch (content/ratgeber/en/meta.js),
// den Volltext nur für die Artikel im Register content/ratgeber/en/index.js. Kategorie bleibt der
// deutsche Schlüssel (Filter, Anker); angezeigt wird kategorieLabel.

/** Gibt es den Artikeltext auf Englisch? */
export const artikelVolltextEn = (slug) => Object.hasOwn(VOLLTEXT_EN, slug);

/** Slugs mit englischem Volltext */
export const ARTIKEL_EN = Object.freeze(Object.keys(VOLLTEXT_EN));

/** Anzeigename eines Themenbereichs */
export const kategorieName = (kategorie, sprache = "de") => (sprache === "en" && KATEGORIEN_EN[kategorie]) || kategorie;

/**
 * Deutsch formatierten Kennzahlwert ins Englische übertragen (eine Quelle für die Zahl):
 * "1.500–4.500 €" → "€1,500–4,500", "5,2–11,9 ct" → "5.2–11.9 ct", "bis 60 %" → "up to 60%".
 */
export function wertEn(s) {
  if (typeof s !== "string") return s;
  let t = s
    .replace(/(\d)\.(\d{3})/g, "$1\u0000$2")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\u0000/g, ",")
    .replace(/\s%/g, "%")
    .replace(/\s‰/g, "‰")
    .replace(/^ab /, "from ")
    .replace(/^bis /, "up to ")
    .replace(/^ca\. /, "approx. ")
    .replace(/ Mio\. t$/, " million t")
    .replace(/ Monate$/, " months")
    .replace(/ Jahre$/, " years")
    .replace(/(\d) von (\d)/, "$1 of $2");
  t = t.replace(/^((?:approx\.|from|up to) )?(.*?)\s?T€$/, (m, p, z) => `${p || ""}€${z}k`);
  t = t.replace(/^((?:approx\.|from|up to) )?([^€]*?)\s€(\/\S+)?$/, (m, p, z, e) => `${p || ""}€${z}${e || ""}`);
  return t;
}

/** Artikel in der Sprache der Seite (Deutsch: unverändert) */
export function artikelInSprache(a, sprache = "de") {
  if (!a || sprache !== "en") return a ? { ...a, kategorieLabel: a.kategorie } : a;
  const meta = META_EN[a.slug];
  const voll = VOLLTEXT_EN[a.slug];
  let x = { ...a, kategorieLabel: kategorieName(a.kategorie, "en"), englisch: !!voll };
  if (meta) {
    const { badge, keywords, ...texte } = meta;
    x = {
      ...x,
      ...texte,
      keywords: [...(keywords || []), ...(a.keywords || [])],
      ...(a.badge ? { badge: { wert: badge?.wert || wertEn(a.badge.wert), text: badge?.text || a.badge.text } } : {}),
    };
  }
  return voll ? zusammenfuehren(x, voll) : x;
}

/** Alle Artikel in der Sprache, neueste zuerst */
export const alleArtikelIn = (sprache = "de") => alleArtikel().map((a) => artikelInSprache(a, sprache));

/** Datum lang: "2026-09-11" → "11. September 2026" (de) bzw. "11 September 2026" (en) */
export function datumLang(iso, sprache = "de") {
  return new Date(iso).toLocaleDateString(sprache === "en" ? "en-GB" : "de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
