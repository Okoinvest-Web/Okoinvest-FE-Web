// src/lib/sprache/seiten.js – Register der übersetzten Seiten (Sprachmodell)
//
// Jede öffentliche Seite aus dem Register src/lib/land/seiten.js gibt es auch auf Englisch unter
// /en/<pfad> und /en/<land>/<pfad> – mit DERSELBEN Seitenkomponente (Routen erzeugt mit
// scripts/landfassungen.mjs). Solange eine Seite nicht übersetzt ist, zeigt sie den deutschen
// Text mit dem dezenten Hinweis „not yet available in English“ und trägt noindex.
//
// UEBERSETZT: Seiten, deren Inhalt vollständig englisch rendert (Wörterbuch der Seite fertig,
//   Rahmen ohnehin englisch). Nur diese englischen Fassungen werden indexiert, bekommen ein
//   eigenes canonical, stehen im hreflang-Cluster ("en") und in der Sitemap.
//   Eintragen erst, wenn die Seite unter /en/<pfad> bei 1440 und 390 geprüft ist.
//
// EN_LAENDERINHALT: englische LÄNDERfassungen (/en/at/…) mit eigenem, übersetztem Länderinhalt.
//   Eintrag nur, wenn die Seite in LAENDERINHALT steht UND übersetzt ist (Gruppe 2: alle
//   Länderinhalte übersetzt). Ohne Eintrag zeigt die englische Länderfassung den deutschen
//   Länderinhalt (Rückfall in inhaltFuerSprache) und trägt noindex.
//
// Relative Importe mit Dateiendung (next.config.mjs, Middleware und node:test laden das Modul).

import { LAND_CODES } from "../land/laender.js";
import { LAENDERINHALT, seiteFuer } from "../land/seiten.js";

const VERMERK_EN = Object.freeze({
  stand: "2026-10-08",
  grundlage: "Seite und alle Bausteine über Wörterbücher übersetzt (src/lib/sprache/woerterbuch.js)",
  pruefer: "TODO-E6",
});

/** Übersetzer-Gruppe 1 (Börse, Investoren, Unternehmen, Recht) – je Seite bei 1440 und 390 geprüft. */
const VERMERK_EN_G1 = Object.freeze({
  stand: "2026-10-08",
  grundlage: "Seite und Bausteine über Wörterbücher übersetzt (Gruppe 1: Börse, Investoren, Unternehmen)",
  pruefer: "TODO-E6",
});

/**
 * Englische Rechtstexte (Gruppe 1): Übersetzung zur Information, maßgeblich ist die deutsche Fassung
 * (Hinweis oben im Text, LegalShell). index: false → kein hreflang-Cluster, keine Sitemap, noindex,
 * bis die Rechtsabteilung die englischen Fassungen freigibt; der Hinweis „not yet available in
 * English“ entfällt trotzdem, weil der Inhalt englisch ist.
 */
const VERMERK_EN_RECHT = Object.freeze({
  stand: "2026-10-08",
  grundlage: "Rechtstext übersetzt (Gruppe 1) – Übersetzung zur Information, Prüfung Rechtsabteilung offen",
  pruefer: "TODO-E6 + Rechtsabteilung",
  index: false,
});

/** Übersetzer-Gruppe 3 (Rechner, Marktdaten, Wissen) – je Seite bei 1440 und 390 geprüft. */
const VERMERK_EN_G3 = Object.freeze({
  stand: "2026-10-08",
  grundlage: "Seite und Bausteine über Wörterbücher übersetzt (Gruppe 3: Rechner, Marktdaten, Wissen); Rechenlogik unverändert",
  pruefer: "TODO-E6",
});

/** Übersetzer-Gruppe 2 (Leistungen, Zielgruppen, Regionen, Energie, Gemeinschaften) – je Seite bei 1440 und 390 geprüft. */
const VERMERK_EN_G2 = Object.freeze({
  stand: "2026-10-09",
  grundlage: "Seite und Bausteine über Wörterbücher übersetzt (Gruppe 2: Leistungen, Zielgruppen, Regionen, Energie, Gemeinschaften); Landesrecht mit erklärten Originalbegriffen, Rechenlogik unverändert",
  pruefer: "TODO-E6",
});

/** Englisch übersetzte Seiten (Muster-Schlüssel → Vermerk). */
export const UEBERSETZT = Object.freeze({
  "/": VERMERK_EN,
  // Gruppe 1 – Börse, Investoren, Unternehmen
  "/investoren": VERMERK_EN_G1,
  "/projektboerse": VERMERK_EN_G1,
  "/projektboerse/anbieten": VERMERK_EN_G1,
  "/projektboerse/karte": VERMERK_EN_G1,
  "/projektboerse/[slug]": VERMERK_EN_G1,
  "/bestandsanlagen": VERMERK_EN_G1,
  "/kontakt": VERMERK_EN_G1,
  "/termin": VERMERK_EN_G1,
  "/unternehmen": VERMERK_EN_G1,
  "/referenzen": VERMERK_EN_G1,
  "/warum-oekoinvest": VERMERK_EN_G1,
  "/prozess": VERMERK_EN_G1,
  // Gruppe 1 – Recht (noindex bis Freigabe Rechtsabteilung)
  "/impressum": VERMERK_EN_RECHT,
  "/barrierefreiheit": VERMERK_EN_RECHT,
  "/datenschutz": VERMERK_EN_RECHT,
  "/nutzungsbedingungen": VERMERK_EN_RECHT,
  "/bedingungen/projektboerse": VERMERK_EN_RECHT,
  "/bedingungen/energiebeschaffung": VERMERK_EN_RECHT,
  "/bedingungen/lieferanten": VERMERK_EN_RECHT,
  "/bedingungen/banken": VERMERK_EN_RECHT,
  // Gruppe 2 – Leistungen, Zielgruppen, Regionen, Energie, Gemeinschaften
  "/freiflaeche": VERMERK_EN_G2,
  "/agri-pv": VERMERK_EN_G2,
  "/solarcarport": VERMERK_EN_G2,
  "/grossspeicher": VERMERK_EN_G2,
  "/flaeche-verpachten": VERMERK_EN_G2,
  "/dachflaeche-verpachten": VERMERK_EN_G2,
  "/landwirte": VERMERK_EN_G2,
  "/kommunen": VERMERK_EN_G2,
  "/flaechencheck": VERMERK_EN_G2,
  "/regionen": VERMERK_EN_G2,
  "/regionen/[slug]": VERMERK_EN_G2,
  "/virtuelles-kraftwerk": VERMERK_EN_G2,
  "/reststrom": VERMERK_EN_G2,
  "/energie-live": VERMERK_EN_G2,
  "/energiegemeinschaften": VERMERK_EN_G2,
  "/energiegemeinschaften/software": VERMERK_EN_G2,
  "/energiegemeinschaften/rechner": VERMERK_EN_G2,
  "/genossenschaft": VERMERK_EN_G2,
  // Gruppe 3 – Rechner und Marktdaten
  "/rechner": VERMERK_EN_G3,
  "/rechner/pacht": VERMERK_EN_G3,
  "/rechner/agri-pv": VERMERK_EN_G3,
  "/rechner/beteiligung": VERMERK_EN_G3,
  "/rechner/dachpacht": VERMERK_EN_G3,
  "/rechner/energy-sharing": VERMERK_EN_G3,
  "/rechner/grossspeicher": VERMERK_EN_G3,
  "/rechner/kommune": VERMERK_EN_G3,
  "/rechner/netzanschluss": VERMERK_EN_G3,
  "/rechner/pachtangebot-check": VERMERK_EN_G3,
  "/rechner/ppa": VERMERK_EN_G3,
  "/rechner/projektbewertung": VERMERK_EN_G3,
  "/rechner/solarpark": VERMERK_EN_G3,
  "/rechner/bestandsanlage": VERMERK_EN_G3,
  "/rechner/reststrom": VERMERK_EN_G3,
  "/rechner/solarcarport": VERMERK_EN_G3,
  "/marktdaten": VERMERK_EN_G3,
  // Gruppe 3 – Wissen
  "/faq": VERMERK_EN_G3,
  "/wissen/lexikon": VERMERK_EN_G3,
  "/ratgeber": VERMERK_EN_G3,
  // Entwurf, Prüfung Rechtsabteilung offen: Inhalt englisch, aber nicht indexieren (wie die deutsche Fassung)
  "/marktdaten/fristen": Object.freeze({ ...VERMERK_EN_G3, index: false }),
});

/**
 * Einzelne englische Fassungen dynamischer Seiten (konkreter Pfad → Vermerk), z. B. Ratgeber-Artikel
 * mit englischem Volltext (src/content/ratgeber/en). Eintrag erst nach Sichtprüfung bei 1440 und 390.
 */
export const UEBERSETZT_EINZELN = Object.freeze({
  "/ratgeber/solarpark-pacht-pro-hektar": VERMERK_EN_G3,
});

const eingetragen = (s) => Object.hasOwn(UEBERSETZT, s.muster) || Object.hasOwn(UEBERSETZT_EINZELN, s.schluessel);
const vermerk = (s) => (Object.hasOwn(UEBERSETZT, s.muster) ? UEBERSETZT[s.muster] : UEBERSETZT_EINZELN[s.schluessel]);

/** Englische Länderfassungen mit übersetztem Länderinhalt (je Land Muster → Vermerk). */
export const EN_LAENDERINHALT = Object.freeze({
  DE: Object.freeze({ "/regionen": VERMERK_EN_G2 }),
  AT: Object.freeze({ "/flaechencheck": VERMERK_EN_G2, "/energiegemeinschaften": VERMERK_EN_G2, "/regionen": VERMERK_EN_G2 }),
  CH: Object.freeze({ "/freiflaeche": VERMERK_EN_G2, "/energiegemeinschaften": VERMERK_EN_G2, "/agri-pv": VERMERK_EN_G2 }),
});

/** Gibt es diese Seite (präfixloser Schlüssel) auf Englisch? = jede Seite aus dem Register. */
export const hatSprachfassung = (schluessel) => !!seiteFuer(schluessel);

/** Ist die Seite fertig übersetzt? (Deutsch: jede Seite aus dem Register) */
export function uebersetzt(schluessel, sprache = "en") {
  const s = seiteFuer(schluessel);
  if (!s) return false;
  return sprache === "de" ? true : eingetragen(s);
}

/**
 * Darf die englische Fassung indexiert werden (canonical-Cluster, hreflang "en", Sitemap)?
 * Übersetzt UND nicht ausdrücklich zurückgehalten (Vermerk index: false, z. B. Rechtstexte).
 */
export function uebersetztIndexierbar(schluessel) {
  const s = seiteFuer(schluessel);
  return !!s && eingetragen(s) && vermerk(s).index !== false;
}

/** Hat die englische Länderfassung eigenen, übersetzten Länderinhalt? */
export function enLandInhalt(schluessel, land) {
  const s = seiteFuer(schluessel);
  if (!s || !LAND_CODES.includes(land)) return false;
  return Object.hasOwn(EN_LAENDERINHALT[land], s.muster) && Object.hasOwn(LAENDERINHALT[land], s.muster) && Object.hasOwn(UEBERSETZT, s.muster);
}
