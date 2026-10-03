// src/lib/land/stufen.js – Seiten der Länderzonen und gestufter Start (Masterplan Abschnitt 4)
//
// SEITEN: jede Seite der Länderzonen mit ihrem Schlüssel (= Pfad ohne Länderpräfix) und den
//   Ländern, für die es fachlich eigenen Inhalt gibt (`laender`). Kein Klonen: Eine Seite steht
//   nur für die Länder drin, deren Recht, Zahlen und Begriffe sie wirklich abbildet.
// STUFEN: welche dieser Seiten je Land freigegeben sind.
//   - DE: vollständig (jede Seite mit DE-Inhalt).
//   - AT, CH: Positivliste. Jeder Eintrag trägt einen Fachfreigabe-Vermerk; die zweite
//     Prüfperson ist noch nicht benannt (Entscheidung E6) → Prüfer „TODO-E6“.
//   - `inVorbereitung: true`: Die Seite ist für das Land vorgesehen, der Inhalt fehlt noch.
//     Die Route zeigt dann „in Vorbereitung“ (noindex, nicht in der Sitemap).
// Was nicht freigegeben ist, liefert 404 (notFound()).
//
// Relative Importe mit Dateiendung (next.config.mjs lädt das Modul über umzug.js).

import { META as REGIONEN_META } from "../../data/regionen/meta.js";
import { LAND_CODES } from "./laender.js";

/** Schlüssel der Einstiegsseite je Land (/de, /at, /ch). */
export const EINSTIEG = "";

/**
 * Seiten der Länderzonen. prio/freq = Sitemap (übernommen aus der bisherigen Sitemap).
 * titel = Anzeige auf der Einstiegsseite, im Länderwechsler und im Hinweis „gilt für …“.
 * gruppe = Abschnitt auf der Einstiegsseite.
 * index: false = noindex (nie in der Sitemap), z. B. bis zur Freigabe durch die Rechtsabteilung.
 * neu: true = gab es vor dem Umzug nicht (keine Weiterleitung in umzug.js).
 */
export const SEITEN = Object.freeze({
  [EINSTIEG]: { titel: "Übersicht", laender: ["DE", "AT", "CH"], prio: 0.9, freq: "monthly", gruppe: null, neu: true },
  // Leistungen
  "/freiflaeche": { titel: "Freiflächen-PV", laender: ["DE"], prio: 0.9, freq: "monthly", gruppe: "leistungen" },
  "/agri-pv": { titel: "Agri-PV", laender: ["DE"], prio: 0.9, freq: "monthly", gruppe: "leistungen" },
  "/solarcarport": { titel: "Solarcarports", laender: ["DE"], prio: 0.8, freq: "monthly", gruppe: "leistungen" },
  "/grossspeicher": { titel: "Großspeicher", laender: ["DE"], prio: 0.8, freq: "monthly", gruppe: "leistungen" },
  "/prozess": { titel: "Projektprozess", laender: ["DE"], prio: 0.7, freq: "monthly", gruppe: "leistungen" },
  "/warum-oekoinvest": { titel: "Warum ÖkoInvest", laender: ["DE"], prio: 0.6, freq: "monthly", gruppe: "leistungen" },
  // Zielgruppen
  "/flaeche-verpachten": { titel: "Fläche verpachten", laender: ["DE"], prio: 0.9, freq: "monthly", gruppe: "zielgruppen" },
  "/dachflaeche-verpachten": { titel: "Dachfläche verpachten", laender: ["DE"], prio: 0.9, freq: "monthly", gruppe: "zielgruppen" },
  "/landwirte": { titel: "Landwirte", laender: ["DE"], prio: 0.8, freq: "monthly", gruppe: "zielgruppen" },
  "/kommunen": { titel: "Kommunen", laender: ["DE"], prio: 0.8, freq: "monthly", gruppe: "zielgruppen" },
  "/bestandsanlagen": { titel: "Bestandsanlagen", laender: ["DE"], prio: 0.8, freq: "monthly", gruppe: "zielgruppen" },
  "/regionen": { titel: "Regionen", laender: ["DE", "AT"], prio: 0.8, freq: "monthly", gruppe: "zielgruppen" },
  "/regionen/[slug]": { titel: "Region", laender: ["DE", "AT", "CH"], prio: 0.8, freq: "monthly", gruppe: null, dynamisch: true },
  // Strom & Gemeinschaft
  "/virtuelles-kraftwerk": { titel: "Virtuelles Kraftwerk", laender: ["DE"], prio: 0.8, freq: "monthly", gruppe: "strom" },
  "/reststrom": { titel: "Reststrom-Pool", laender: ["DE"], prio: 0.8, freq: "monthly", gruppe: "strom" },
  "/energie-live": { titel: "Strommarkt live", laender: ["DE"], prio: 0.7, freq: "hourly", gruppe: "strom" },
  "/energiegemeinschaften": { titel: "Energiegemeinschaften", laender: ["DE", "AT"], prio: 0.8, freq: "monthly", gruppe: "strom" },
  // Österreichische Inhalte (EAG, ElWG): nur in /at
  "/energiegemeinschaften/rechner": { titel: "Energiegemeinschaft-Rechner", laender: ["AT"], prio: 0.7, freq: "monthly", gruppe: "strom" },
  "/energiegemeinschaften/software": { titel: "Software für Energiegemeinschaften", laender: ["AT"], prio: 0.8, freq: "monthly", gruppe: "strom" },
  "/genossenschaft": { titel: "Genossenschaft", laender: ["DE"], prio: 0.7, freq: "monthly", gruppe: "strom" },
  // Rechner & Werkzeuge
  "/flaechencheck": { titel: "Flächencheck", laender: ["DE", "AT"], prio: 0.9, freq: "monthly", gruppe: "werkzeuge" },
  "/rechner": { titel: "Alle Rechner", laender: ["DE"], prio: 0.8, freq: "monthly", gruppe: "werkzeuge" },
  "/rechner/pacht": { titel: "Pachtrechner", laender: ["DE"], prio: 0.8, freq: "monthly", gruppe: "werkzeuge" },
  "/rechner/agri-pv": { titel: "Agri-PV-Rechner", laender: ["DE"], prio: 0.8, freq: "monthly", gruppe: "werkzeuge" },
  "/rechner/solarpark": { titel: "Solarpark-Renditerechner", laender: ["DE"], prio: 0.8, freq: "monthly", gruppe: "werkzeuge" },
  "/rechner/projektbewertung": { titel: "Projektbewertung", laender: ["DE"], prio: 0.8, freq: "monthly", gruppe: "werkzeuge" },
  "/rechner/reststrom": { titel: "Reststrom-Rechner", laender: ["DE"], prio: 0.7, freq: "monthly", gruppe: "werkzeuge" },
  "/rechner/solarcarport": { titel: "Carport-Rechner", laender: ["DE"], prio: 0.7, freq: "monthly", gruppe: "werkzeuge" },
  "/rechner/kommune": { titel: "Kommunal-Rechner", laender: ["DE"], prio: 0.7, freq: "monthly", gruppe: "werkzeuge" },
  "/rechner/pachtangebot-check": { titel: "Pachtangebot prüfen", laender: ["DE"], prio: 0.8, freq: "monthly", gruppe: "werkzeuge" },
  "/rechner/netzanschluss": { titel: "Netzanschluss-Check", laender: ["DE"], prio: 0.7, freq: "monthly", gruppe: "werkzeuge" },
  "/rechner/ppa": { titel: "PPA-Rechner", laender: ["DE"], prio: 0.7, freq: "monthly", gruppe: "werkzeuge" },
  "/rechner/grossspeicher": { titel: "Großspeicher-Rechner", laender: ["DE"], prio: 0.7, freq: "monthly", gruppe: "werkzeuge" },
  "/rechner/beteiligung": { titel: "Beteiligungsrechner", laender: ["DE"], prio: 0.6, freq: "monthly", gruppe: "werkzeuge" },
  "/rechner/energy-sharing": { titel: "Energy-Sharing-Rechner", laender: ["DE"], prio: 0.6, freq: "monthly", gruppe: "werkzeuge" },
  "/rechner/dachpacht": { titel: "Dachpacht-Rechner", laender: ["DE"], prio: 0.8, freq: "monthly", gruppe: "werkzeuge" },
  "/rechner/bestandsanlage": { titel: "Bestandsanlage bewerten", laender: ["DE"], prio: 0.8, freq: "monthly", gruppe: "werkzeuge" },
  // Schweiz (Start-Positivliste, Inhalte folgen)
  "/marktzugang-check": { titel: "Marktzugang-Check", laender: ["CH"], prio: 0.7, freq: "monthly", gruppe: "werkzeuge", neu: true },
  "/parzellen-vorpruefung": { titel: "Parzellen-Vorprüfung", laender: ["CH"], prio: 0.7, freq: "monthly", gruppe: "werkzeuge", neu: true },
  // Markt & Wissen je Land
  "/marktdaten": { titel: "Marktdaten Solar", laender: ["DE"], prio: 0.8, freq: "weekly", gruppe: "wissen" },
  "/marktdaten/fristen": { titel: "Fristen und Termine", laender: ["DE"], prio: 0.6, freq: "weekly", gruppe: "wissen", index: false },
  "/faq": { titel: "FAQ", laender: ["DE"], prio: 0.6, freq: "monthly", gruppe: "wissen" },
});

/** Wegweiser auf AT/CH-Einstiegsseiten: wichtige Seiten, die bisher nur für Deutschland gelten. */
export const WEGWEISER_DE = Object.freeze(["/flaeche-verpachten", "/rechner/pacht", "/agri-pv", "/kommunen", "/reststrom", "/rechner"]);

/** Gruppen der Einstiegsseite in Anzeigereihenfolge. */
export const GRUPPEN = Object.freeze([
  { id: "werkzeuge", titel: "Prüfen und rechnen" },
  { id: "zielgruppen", titel: "Für Eigentümer, Landwirte und Gemeinden" },
  { id: "leistungen", titel: "Kraftwerke entwickeln" },
  { id: "strom", titel: "Strom und Gemeinschaft" },
  { id: "wissen", titel: "Markt und Wissen" },
]);

const VERMERK_AT = Object.freeze({
  stand: "2026-10-03",
  grundlage: "Masterplan Abschnitt 4, gestufter Start: Seite in Welle 1 fachlich überarbeitet (Recht AT, Länder-Sperre der Rechner)",
  pruefer: "TODO-E6",
});
const VERMERK_CH = Object.freeze({
  stand: "2026-10-03",
  grundlage: "Masterplan Abschnitt 4, gestufter Start CH",
  pruefer: "TODO-E6",
});

/**
 * Gestufter Start. DE vollständig; AT und CH nur mit Positivliste und Fachfreigabe-Vermerk.
 * Erweitern: Seite in SEITEN um das Land ergänzen (eigener Inhalt!) und hier mit Vermerk eintragen.
 */
export const STUFEN = Object.freeze({
  DE: { modus: "vollstaendig" },
  AT: {
    modus: "positivliste",
    seiten: {
      [EINSTIEG]: VERMERK_AT,
      "/regionen": VERMERK_AT,
      "/regionen/[slug]": VERMERK_AT,
      "/energiegemeinschaften": VERMERK_AT,
      "/energiegemeinschaften/rechner": VERMERK_AT,
      "/energiegemeinschaften/software": VERMERK_AT,
      "/flaechencheck": VERMERK_AT,
    },
  },
  CH: {
    modus: "positivliste",
    seiten: {
      [EINSTIEG]: VERMERK_CH,
      "/marktzugang-check": { ...VERMERK_CH, inVorbereitung: true },
      "/parzellen-vorpruefung": { ...VERMERK_CH, inVorbereitung: true },
    },
  },
});

/** Regionsseiten: Land je Slug kommt aus den Stammdaten der Regionen. */
export const REGION_LAND = Object.freeze(Object.fromEntries(REGIONEN_META.map((r) => [r.slug, r.land])));

const REGION_MUSTER = /^\/regionen\/([a-z0-9-]+)$/;

/** Schlüssel einer Regionsseite ("tirol" → "/regionen/tirol"). */
export const regionSchluessel = (slug) => "/regionen/" + slug;

/**
 * Pfad ohne Präfix → Registereintrag. Konkrete Regionsseiten werden auf "/regionen/[slug]"
 * abgebildet und tragen dann nur das Land ihrer Region.
 * @returns {{ schluessel: string, muster: string, eintrag: object, laender: string[] } | null}
 */
export function seiteFuer(schluessel) {
  if (typeof schluessel !== "string") return null;
  if (Object.hasOwn(SEITEN, schluessel) && !SEITEN[schluessel].dynamisch) {
    return { schluessel, muster: schluessel, eintrag: SEITEN[schluessel], laender: SEITEN[schluessel].laender };
  }
  const r = REGION_MUSTER.exec(schluessel);
  if (r && Object.hasOwn(REGION_LAND, r[1])) {
    return { schluessel, muster: "/regionen/[slug]", eintrag: SEITEN["/regionen/[slug]"], laender: [REGION_LAND[r[1]]] };
  }
  return null;
}

/** Stufe eines Landes für eine Seite: "frei" | "vorbereitung" | null (nicht freigegeben) */
export function stufe(schluessel, land) {
  const s = seiteFuer(schluessel);
  if (!s || !LAND_CODES.includes(land) || !s.laender.includes(land)) return null;
  const st = STUFEN[land];
  if (st.modus === "vollstaendig") return "frei";
  const vermerk = Object.hasOwn(st.seiten, s.muster) ? st.seiten[s.muster] : null;
  if (!vermerk) return null;
  return vermerk.inVorbereitung ? "vorbereitung" : "frei";
}

/** Gibt es die Seite im Land (freigegeben oder „in Vorbereitung“)? */
export const vorhanden = (schluessel, land) => stufe(schluessel, land) !== null;

/** Freigegeben mit Inhalt? */
export const freigegeben = (schluessel, land) => stufe(schluessel, land) === "frei";

/** Indexierbar = freigegeben, mit Inhalt und nicht als noindex markiert. */
export function indexierbar(schluessel, land) {
  const s = seiteFuer(schluessel);
  return !!s && freigegeben(schluessel, land) && s.eintrag.index !== false;
}

/** Länder, in denen die Seite existiert (freigegeben oder in Vorbereitung), in LAND_CODES-Reihenfolge. */
export const laenderMitSeite = (schluessel) => LAND_CODES.filter((l) => vorhanden(schluessel, l));

/** Länder, in denen die Seite mit Inhalt freigegeben ist. */
export const laenderFrei = (schluessel) => LAND_CODES.filter((l) => freigegeben(schluessel, l));

/** Alle konkreten Schlüssel (Regionen aufgelöst). */
export function alleSchluessel() {
  const liste = [];
  for (const k of Object.keys(SEITEN)) {
    if (SEITEN[k].dynamisch) liste.push(...Object.keys(REGION_LAND).map((slug) => `/regionen/${slug}`));
    else liste.push(k);
  }
  return liste;
}

/** Alle Seiten eines Landes (konkrete Schlüssel) mit ihrer Stufe. */
export function seitenDesLandes(land) {
  return alleSchluessel()
    .map((schluessel) => ({ schluessel, stufe: stufe(schluessel, land) }))
    .filter((x) => x.stufe);
}

/** Regionen-Slugs eines Landes, die dort freigegeben sind (für generateStaticParams). */
export const regionenSlugs = (land) => Object.keys(REGION_LAND).filter((slug) => freigegeben(`/regionen/${slug}`, land));
