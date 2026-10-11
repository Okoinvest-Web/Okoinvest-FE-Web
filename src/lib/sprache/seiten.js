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
  // Welle 3, Paket B10: Inhalt englisch, aber noindex wie die deutsche Fassung (Prüfung Rechtsabteilung offen;
  // Muster-NDA als Übersetzung zur Information, maßgeblich ist die deutsche Fassung)
  "/projektboerse/neutralitaet": Object.freeze({ stand: "2026-10-09", grundlage: "Seite, Bühne und Badges mit englischen Texten (Paket B10); Rechtsrahmen je Land englisch in src/lib/boerse/neutralitaet.js", pruefer: "TODO-E6 + Rechtsabteilung", index: false }),
  "/projektboerse/muster-nda": Object.freeze({ stand: "2026-10-09", grundlage: "Muster-NDA übersetzt (Paket B10) – Übersetzung zur Information, Prüfung Rechtsabteilung offen", pruefer: "TODO-E6 + Rechtsabteilung", index: false }),
  "/bestandsanlagen": VERMERK_EN_G1,
  "/kontakt": VERMERK_EN_G1,
  "/termin": VERMERK_EN_G1,
  "/unternehmen": VERMERK_EN_G1,
  "/referenzen": VERMERK_EN_G1,
  // Welle 3, Paket NL: Inhalt englisch, aber noindex wie die deutschen Fassungen (Strang R / Freigabe Inhaber offen);
  // /newsroom/[slug] bleibt „nicht übersetzt“ (Meldungen deutsch)
  "/newsletter": Object.freeze({ stand: "2026-10-09", grundlage: "Seite und Newsletter-Baustein mit englischen Texten (Paket NL); Einwilligungswortlaut englisch mit eigenem Hash", pruefer: "TODO-E6 + Rechtsabteilung", index: false }),
  "/newsroom": Object.freeze({ stand: "2026-10-09", grundlage: "Seite mit englischen Texten (Paket NL); Kurzprofil aus src/data/site.js", pruefer: "TODO-E6", index: false }),
  // Welle 4, Paket WIDGETS: Inhalt englisch (Seite und Widget-Texte), noindex wie die deutsche Fassung (Prüfung E6/Rechtsabteilung offen)
  "/partner/widgets": Object.freeze({ stand: "2026-10-11", grundlage: "Seite und Widget-Texte englisch (Paket WIDGETS, src/lib/widgets); Rechenlogik unverändert", pruefer: "TODO-E6", index: false }),
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
  // Welle 3, Paket B8: Kommunal 2.0 – Inhalt englisch (Ratsvorlage selbst deutsch), noindex wie die deutsche Fassung (Fachprüfung offen)
  "/kommunen/ratsvorlage": Object.freeze({ stand: "2026-10-09", grundlage: "Seite und Werkzeug englisch (Paket B8); Landesregeln und Widmung mit englischen Texten bzw. Regionsdaten aus src/data/regionen/en; Rechenlogik gemeinsam mit DE", pruefer: "TODO-E6", index: false }),
  "/kommunen/widmungskit": Object.freeze({ stand: "2026-10-09", grundlage: "Seite und Checkliste englisch (Paket B8); Prüfpunkte aus src/data/regionen/en", pruefer: "TODO-E6", index: false }),
  "/flaechencheck": VERMERK_EN_G2,
  "/regionen": VERMERK_EN_G2,
  "/regionen/[slug]": VERMERK_EN_G2,
  "/virtuelles-kraftwerk": VERMERK_EN_G2,
  "/reststrom": VERMERK_EN_G2,
  "/energie-live": VERMERK_EN_G2,
  "/energiegemeinschaften": VERMERK_EN_G2,
  "/energiegemeinschaften/software": VERMERK_EN_G2,
  // Welle 3, Paket B7: Inhalt englisch, aber noindex wie die deutsche Fassung (Fachprüfung und Preisfreigabe offen)
  "/energiegemeinschaften/software/preise": Object.freeze({ stand: "2026-10-09", grundlage: "Seite und Bausteine mit englischen Texten (Paket B7); keine Beträge", pruefer: "TODO-E6", index: false }),
  "/energiegemeinschaften/software/wechsel-check": Object.freeze({ stand: "2026-10-09", grundlage: "Seite und Wechsel-Check mit englischen Texten (Paket B7); Fakten-Wortlaut englisch in src/lib/eg-angebot/fakten.js", pruefer: "TODO-E6", index: false }),
  "/energiegemeinschaften/software/white-label": Object.freeze({ stand: "2026-10-09", grundlage: "Seite mit englischen Texten (Paket B7)", pruefer: "TODO-E6", index: false }),
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
  // Welle 3, Paket B5: Inhalt englisch, aber noindex wie die deutsche Fassung (Fachprüfung offen)
  "/rechner/gewerbestrom-check": Object.freeze({ stand: "2026-10-09", grundlage: "Seite und Rechner über Wörterbücher übersetzt (Paket B5); Rechenlogik gemeinsam mit DE", pruefer: "TODO-E6", index: false }),
  // Welle 3, Paket B6: Flächenpass – Inhalt englisch, aber noindex wie die deutsche Fassung (Fachprüfung offen)
  "/rechner/flaechenpass": Object.freeze({ stand: "2026-10-09", grundlage: "Seite, Assistent und Texte englisch (Paket B6); Regionsdaten aus src/data/regionen/en; Bewertungslogik gemeinsam mit DE", pruefer: "TODO-E6", index: false }),
  // Welle 4, Paket GEBAEUDE: Gebäudestrom – Inhalt englisch, aber noindex wie die deutschen Fassungen (Fachprüfung E6 offen)
  "/gebaeudestrom": Object.freeze({ stand: "2026-10-11", grundlage: "Seite und Bausteine über Wörterbücher übersetzt (Paket GEBAEUDE); Rechtsbegriffe je Land mit erklärten Originalbegriffen", pruefer: "TODO-E6", index: false }),
  "/rechner/gebaeudestrom": Object.freeze({ stand: "2026-10-11", grundlage: "Seite und Rechner über Wörterbücher übersetzt (Paket GEBAEUDE); Rechenlogik gemeinsam, nur Energiemengen", pruefer: "TODO-E6", index: false }),
  // Welle 4, Parkplatz-Hub: Inhalt englisch, aber noindex wie die deutsche Fassung (Fachprüfung E6 offen)
  "/parkplatz": Object.freeze({ stand: "2026-10-11", grundlage: "Seite und Schnell-Check über Wörterbücher übersetzt (Paket PARKPLATZ); Pflicht-Daten und Logik gemeinsam mit DE", pruefer: "TODO-E6", index: false }),
  // Welle 4, Paket GLAESERN: Gläserner Solarpark – Inhalt englisch (Seite, Parkdaten, Demo-Ansicht),
  // aber noindex wie die deutsche Fassung (Beispieldaten; echte Parkdaten und Fachprüfung E6 offen)
  "/projekte/glaeserner-solarpark": Object.freeze({ stand: "2026-10-11", grundlage: "Seite, Parkdaten und Demo-Ansicht über Wörterbücher übersetzt (Paket GLAESERN); Zahlen aus dem Faktenregister, gekennzeichnete Beispielwerte", pruefer: "TODO-E6", index: false }),
  "/marktdaten": VERMERK_EN_G3,
  // Gruppe 3 – Wissen
  "/faq": VERMERK_EN_G3,
  "/wissen/lexikon": VERMERK_EN_G3,
  // Welle 4, Paket FAKTEN: Oberfläche englisch, Fakten selbst bleiben deutsch (Hinweis auf der Seite);
  // noindex wie die deutsche Fassung (Prüfung E6 und „alle Fakten geprüft“ offen)
  "/quellen": Object.freeze({ stand: "2026-10-11", grundlage: "Seite und Suche über Wörterbücher englisch (Paket FAKTEN); Fakten deutsch mit EN-Hinweis", pruefer: "TODO-E6", index: false }),
  "/ratgeber": VERMERK_EN_G3,
  // Entwurf, Prüfung Rechtsabteilung offen: Inhalt englisch, aber nicht indexieren (wie die deutsche Fassung)
  "/marktdaten/fristen": Object.freeze({ ...VERMERK_EN_G3, index: false }),
  // Welle 3, Paket B9: Ausschreibungs-Monitor – Inhalt englisch, aber noindex bis zur Fachprüfung (wie die deutsche Fassung)
  "/marktdaten/ausschreibungen": Object.freeze({ stand: "2026-10-09", grundlage: "Seite und Monitor-Baustein mit englischen Texten (Paket B9); Daten unverändert", pruefer: "TODO-E6", index: false }),
  // Welle 4, Paket CHATLAS: CH-Strompreis-Atlas – Inhalt englisch, aber noindex bis zur Fachprüfung (wie die deutsche Fassung)
  "/marktdaten/strompreise-schweiz": Object.freeze({ stand: "2026-10-11", grundlage: "Seite und Atlas-Baustein mit englischen Texten (Paket CHATLAS); amtliche ElCom-Daten unverändert", pruefer: "TODO-E6", index: false }),
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
