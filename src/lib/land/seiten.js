// src/lib/land/seiten.js – Register der öffentlichen Seiten und ihrer Länderinhalte
//
// SEITEN: jede öffentliche Seite mit ihrem Schlüssel (= Pfad ohne Länderpräfix, wie vor Welle 2).
//   Jede Seite existiert gemeinsam (/rechner/pacht) UND als Länderfassung (/de/rechner/pacht,
//   /at/…, /ch/…) mit DERSELBEN Seitenkomponente. Die Länderrouten unter
//   src/app/(laender)/[land]/… sind reine Weiterleitungen auf die gemeinsame Seite
//   (erzeugt mit scripts/landfassungen.mjs, geprüft in src/lib/land/routen.test.mjs).
//
// LAENDERINHALT: für welche Seite es in welchem Land ECHTEN eigenen Inhalt gibt (Recht, Zahlen,
//   Begriffe des Landes, fachlich geprüft). Nur diese Länderfassungen werden indexiert, bekommen
//   ein eigenes canonical, stehen im hreflang-Cluster und in der Sitemap. Alle anderen
//   Länderfassungen tragen noindex (die gemeinsame Seite bleibt die indexierte Fassung).
//   Eintragen erst nach Fachfreigabe; jeder Eintrag trägt einen Vermerk (Stand, Grundlage, Prüfer).
//   Die zweite Prüfperson ist noch nicht benannt (Entscheidung E6) → Prüfer „TODO-E6“.
//
// Relative Importe mit Dateiendung (next.config.mjs, Middleware und node:test laden das Modul).

import { META as REGIONEN_META } from "../../data/regionen/meta.js";
import { LAND_CODES } from "./laender.js";
import { nurPfad } from "./zonen.js";

const START = "2026-09-29"; // Relaunch ÖkoInvest
const RECHT = "2026-09-29"; // letzte Überarbeitung der Rechtstexte

/**
 * Öffentliche Seiten. prio/freq/datum = Sitemap (wie vor Welle 2).
 * index: false = noindex (nie in der Sitemap). dynamisch: Muster mit [slug].
 * sitemap: false = Einträge liefert eine eigene Quelle (Ratgeber-Artikel, Exposés).
 */
export const SEITEN = Object.freeze({
  "/": { titel: "Startseite", prio: 1.0, freq: "weekly" },
  // Leistungen
  "/freiflaeche": { titel: "Freiflächen-PV", prio: 0.9, freq: "monthly" },
  "/agri-pv": { titel: "Agri-PV", prio: 0.9, freq: "monthly" },
  "/solarcarport": { titel: "Solarcarports", prio: 0.8, freq: "monthly" },
  "/grossspeicher": { titel: "Großspeicher", prio: 0.8, freq: "monthly" },
  "/prozess": { titel: "Projektprozess", prio: 0.7, freq: "monthly" },
  "/warum-oekoinvest": { titel: "Warum ÖkoInvest", prio: 0.6, freq: "monthly" },
  // Zielgruppen
  "/flaeche-verpachten": { titel: "Fläche verpachten", prio: 0.9, freq: "monthly" },
  "/dachflaeche-verpachten": { titel: "Dachfläche verpachten", prio: 0.9, freq: "monthly" },
  "/landwirte": { titel: "Landwirte", prio: 0.8, freq: "monthly" },
  "/kommunen": { titel: "Kommunen", prio: 0.8, freq: "monthly" },
  "/investoren": { titel: "Investoren", prio: 0.9, freq: "monthly" },
  "/bestandsanlagen": { titel: "Bestandsanlagen", prio: 0.8, freq: "monthly" },
  "/regionen": { titel: "Regionen", prio: 0.8, freq: "monthly" },
  "/regionen/[slug]": { titel: "Region", prio: 0.8, freq: "monthly", dynamisch: true },
  // Projektbörse
  "/projektboerse": { titel: "Projektbörse", prio: 0.9, freq: "daily" },
  "/projektboerse/anbieten": { titel: "Projekt anbieten", prio: 0.7, freq: "monthly" },
  "/projektboerse/karte": { titel: "Börse auf der Karte", prio: 0.7, freq: "daily" },
  "/projektboerse/[slug]": { titel: "Exposé", dynamisch: true, sitemap: false },
  // Strom & Gemeinschaft
  "/virtuelles-kraftwerk": { titel: "Virtuelles Kraftwerk", prio: 0.8, freq: "monthly" },
  "/reststrom": { titel: "Reststrom-Pool", prio: 0.8, freq: "monthly" },
  "/energie-live": { titel: "Strommarkt live", prio: 0.7, freq: "hourly" },
  "/energiegemeinschaften": { titel: "Energiegemeinschaften", prio: 0.8, freq: "monthly" },
  "/energiegemeinschaften/rechner": { titel: "Energiegemeinschaft-Rechner", prio: 0.7, freq: "monthly" },
  "/energiegemeinschaften/software": { titel: "Software für Energiegemeinschaften", prio: 0.8, freq: "monthly" },
  "/genossenschaft": { titel: "Genossenschaft", prio: 0.7, freq: "monthly" },
  // Rechner & Werkzeuge
  "/flaechencheck": { titel: "Flächencheck", prio: 0.9, freq: "monthly" },
  "/rechner": { titel: "Alle Rechner", prio: 0.8, freq: "monthly" },
  "/rechner/pacht": { titel: "Pachtrechner", prio: 0.8, freq: "monthly" },
  "/rechner/agri-pv": { titel: "Agri-PV-Rechner", prio: 0.8, freq: "monthly" },
  "/rechner/solarpark": { titel: "Solarpark-Renditerechner", prio: 0.8, freq: "monthly" },
  "/rechner/projektbewertung": { titel: "Projektbewertung", prio: 0.8, freq: "monthly" },
  "/rechner/reststrom": { titel: "Reststrom-Rechner", prio: 0.7, freq: "monthly" },
  "/rechner/solarcarport": { titel: "Carport-Rechner", prio: 0.7, freq: "monthly" },
  "/rechner/kommune": { titel: "Kommunal-Rechner", prio: 0.7, freq: "monthly" },
  "/rechner/pachtangebot-check": { titel: "Pachtangebot prüfen", prio: 0.8, freq: "monthly" },
  "/rechner/netzanschluss": { titel: "Netzanschluss-Check", prio: 0.7, freq: "monthly" },
  "/rechner/ppa": { titel: "PPA-Rechner", prio: 0.7, freq: "monthly" },
  "/rechner/grossspeicher": { titel: "Großspeicher-Rechner", prio: 0.7, freq: "monthly" },
  "/rechner/beteiligung": { titel: "Beteiligungsrechner", prio: 0.6, freq: "monthly" },
  "/rechner/energy-sharing": { titel: "Energy-Sharing-Rechner", prio: 0.6, freq: "monthly" },
  "/rechner/dachpacht": { titel: "Dachpacht-Rechner", prio: 0.8, freq: "monthly" },
  "/rechner/bestandsanlage": { titel: "Bestandsanlage bewerten", prio: 0.8, freq: "monthly" },
  // Markt & Wissen
  "/marktdaten": { titel: "Marktdaten Solar", prio: 0.8, freq: "weekly" },
  "/marktdaten/fristen": { titel: "Fristen und Termine", prio: 0.6, freq: "weekly", index: false },
  "/ratgeber": { titel: "Ratgeber", prio: 0.8, freq: "weekly" },
  "/ratgeber/[slug]": { titel: "Ratgeber-Artikel", dynamisch: true, sitemap: false },
  "/wissen/lexikon": { titel: "Lexikon", prio: 0.7, freq: "monthly", lexikon: true },
  "/faq": { titel: "FAQ", prio: 0.6, freq: "monthly" },
  // Unternehmen & Kontakt
  "/unternehmen": { titel: "Über ÖkoInvest", prio: 0.6, freq: "monthly" },
  "/referenzen": { titel: "Referenzen", prio: 0.6, freq: "monthly" },
  "/kontakt": { titel: "Kontakt", prio: 0.6, freq: "yearly" },
  "/termin": { titel: "Termin", prio: 0.6, freq: "monthly" },
  // Rechtstexte (Entwürfe filtert die Sitemap über src/lib/indexsteuerung.js)
  "/impressum": { titel: "Impressum", prio: 0.2, freq: "yearly", datum: RECHT },
  "/datenschutz": { titel: "Datenschutz", prio: 0.2, freq: "yearly", datum: RECHT },
  "/nutzungsbedingungen": { titel: "Nutzungsbedingungen", prio: 0.3, freq: "yearly", datum: RECHT },
  "/barrierefreiheit": { titel: "Barrierefreiheit", prio: 0.2, freq: "yearly", datum: RECHT },
  "/bedingungen/banken": { titel: "Bedingungen Banken", index: false },
  "/bedingungen/energiebeschaffung": { titel: "Bedingungen Energiebeschaffung", index: false },
  "/bedingungen/lieferanten": { titel: "Bedingungen Lieferanten", index: false },
  "/bedingungen/projektboerse": { titel: "Bedingungen Projektbörse", index: false },
});

export const SITEMAP_START = START;

const VERMERK_DE = Object.freeze({
  stand: "2026-10-03",
  grundlage: "Seite rendert eine eigene Fassung für Deutschland (16 Bundesländer zuerst, Landesrecht DE); Inhalte aus Welle 1",
  pruefer: "TODO-E6",
});

const VERMERK_AT = Object.freeze({
  stand: "2026-10-03",
  grundlage: "Seite rendert eine eigene Fassung für Österreich (Recht AT, Begriffe, ohne ungeprüfte Pachtwerte); fachlich überarbeitet in Welle 1",
  pruefer: "TODO-E6",
});

const VERMERK_CH = Object.freeze({
  stand: "2026-10-04",
  grundlage: "Seite rendert eine eigene Fassung für die Schweiz (RPG Art. 24ter, Bewilligung Gemeinde/Kanton, HEIV, LEG/vZEV; ohne ungeprüfte Pacht- und Kostenwerte); Quellen in src/data/laender/ch/ und src/data/regionen/schweiz.js",
  pruefer: "TODO-E6",
});

/**
 * Echter Länderinhalt je Land (Muster-Schlüssel → Freigabe-Vermerk).
 * Nur eintragen, wenn die Seite für das Land WIRKLICH anderen, geprüften Inhalt rendert
 * (über inhaltFuer()/landDerAnfrage(), src/lib/land/inhalte.js) – nicht nur dieselbe Seite
 * mit anderem Präfix.
 */
export const LAENDERINHALT = Object.freeze({
  DE: Object.freeze({
    "/regionen": VERMERK_DE,
  }),
  AT: Object.freeze({
    "/flaechencheck": VERMERK_AT,
    "/energiegemeinschaften": VERMERK_AT,
    "/regionen": VERMERK_AT,
  }),
  CH: Object.freeze({
    "/freiflaeche": VERMERK_CH,
    "/energiegemeinschaften": VERMERK_CH,
    "/agri-pv": VERMERK_CH,
  }),
});

/** Regionsseiten: Land je Slug aus den Stammdaten der Regionen. */
export const REGION_LAND = Object.freeze(Object.fromEntries(REGIONEN_META.map((r) => [r.slug, r.land])));

/** Schlüssel einer Regionsseite ("tirol" → "/regionen/tirol"). */
export const regionSchluessel = (slug) => "/regionen/" + slug;

const MUSTER = Object.keys(SEITEN)
  .filter((k) => SEITEN[k].dynamisch)
  .map((k) => ({ k, basis: k.slice(0, k.indexOf("/[")) }));

/**
 * Pfad ohne Präfix → Registereintrag. Dynamische Seiten (/regionen/tirol) werden auf ihr Muster
 * ("/regionen/[slug]") abgebildet; Regionen nur mit bekanntem Slug.
 * @returns {{ schluessel: string, muster: string, eintrag: object } | null}
 */
export function seiteFuer(schluesselRoh) {
  if (typeof schluesselRoh !== "string") return null;
  const schluessel = nurPfad(schluesselRoh);
  if (Object.hasOwn(SEITEN, schluessel) && !SEITEN[schluessel].dynamisch) return { schluessel, muster: schluessel, eintrag: SEITEN[schluessel] };
  for (const { k, basis } of MUSTER) {
    if (!schluessel.startsWith(`${basis}/`)) continue;
    const slug = schluessel.slice(basis.length + 1);
    if (!/^[a-z0-9-]+$/.test(slug)) continue;
    if (k === "/regionen/[slug]" && !Object.hasOwn(REGION_LAND, slug)) continue;
    return { schluessel, muster: k, eintrag: SEITEN[k] };
  }
  return null;
}

/** Hat dieser präfixlose Pfad eine Länderfassung (/de…, /at…, /ch…)? */
export const hatLandfassung = (schluessel) => !!seiteFuer(schluessel);

/** Gibt es für die Seite im Land echten, freigegebenen Länderinhalt? */
export function eigenerInhalt(schluessel, land) {
  const s = seiteFuer(schluessel);
  if (!s || !LAND_CODES.includes(land)) return false;
  return Object.hasOwn(LAENDERINHALT[land], s.muster);
}

/** Länder mit eigenem Inhalt für eine Seite (LAND_CODES-Reihenfolge). */
export const laenderMitInhalt = (schluessel) => LAND_CODES.filter((l) => eigenerInhalt(schluessel, l));

/**
 * Indexierbar? land null = gemeinsame Seite (indexiert, außer index: false);
 * Länderfassung nur mit eigenem Inhalt (sonst noindex bis zur Freigabe).
 */
export function indexierbar(schluessel, land = null) {
  const s = seiteFuer(schluessel);
  if (!s || s.eintrag.index === false) return false;
  return land ? eigenerInhalt(schluessel, land) : true;
}

/** Alle konkreten Schlüssel (Regionen aufgelöst; Ratgeber und Exposés nicht). */
export function alleSchluessel() {
  const liste = [];
  for (const k of Object.keys(SEITEN)) {
    if (k === "/regionen/[slug]") liste.push(...Object.keys(REGION_LAND).map(regionSchluessel));
    else if (!SEITEN[k].dynamisch) liste.push(k);
  }
  return liste;
}
