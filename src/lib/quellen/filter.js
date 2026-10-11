// src/lib/quellen/filter.js – reine Such- und Themen-Helfer der Fakten-Suche (Welle 4, Paket FAKTEN)
//
// Bewusst OHNE Import des Faktenregisters: Der Client-Baustein (src/components/Quellen/
// FaktenSuche.js) lädt nur diese Datei – die Fakten selbst kommen als Eigenschaft von der
// Server-Seite (quellenEintraege() in ./fakten.js), nicht noch einmal ins Browser-Bündel.

/** Themen = erster Teil der Fakt-id (vor dem Punkt) mit Anzeigenamen (de/en). */
export const THEMEN = Object.freeze({
  freiflaeche: { de: "Freiflächen-PV", en: "Ground-mounted PV" },
  dach: { de: "Dach-PV", en: "Rooftop PV" },
  pacht: { de: "Pacht", en: "Lease" },
  erloese: { de: "Erlöse", en: "Revenues" },
  zuschlag: { de: "Ausschreibungen", en: "Tenders" },
  recht: { de: "Recht", en: "Law" },
  steuer: { de: "Steuern", en: "Taxes" },
  kav: { de: "Konzessionsabgabe", en: "Concession levy" },
  kommune: { de: "Kommunen", en: "Municipalities" },
  region: { de: "Regionen", en: "Regions" },
  termin: { de: "Fristen und Termine", en: "Deadlines" },
  umlage: { de: "Umlagen", en: "Levies" },
  netzentgelt: { de: "Netzentgelte", en: "Network charges" },
  boerse: { de: "Strommarkt", en: "Power market" },
  gewerbestrom: { de: "Gewerbestrom", en: "Commercial power" },
  gebaeudestrom: { de: "Gebäudestrom", en: "Building power" },
  prozess: { de: "Projektprozess", en: "Project process" },
});

/** Thema (erster id-Teil) eines Fakts. */
export const themaVon = (id) => String(id || "").split(".")[0];

/** Anzeigename eines Themas; unbekannte Themen erscheinen unter ihrem Schlüssel. */
export const themaName = (thema, sprache = "de") => THEMEN[thema]?.[sprache === "en" ? "en" : "de"] || thema;

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss");

/** Trifft der Suchtext (Wörter UND-verknüpft) auf einen Eintrag? */
export function trifft(eintrag, text) {
  const woerter = norm(text).split(/\s+/).filter(Boolean);
  if (!woerter.length) return true;
  const heuhaufen = norm([eintrag.id, eintrag.land, eintrag.wertText, eintrag.einheit, eintrag.quelleTitel, eintrag.notiz, themaName(eintrag.thema, "de"), themaName(eintrag.thema, "en")].join(" \n "));
  return woerter.every((w) => heuhaufen.includes(w));
}

/**
 * Filter der Fakten-Suche (Seite, Client-Baustein und Tests nutzen dieselbe Funktion).
 * @param {object[]} eintraege  quellenEintraege()
 * @param {{ text?: string, land?: string, thema?: string, klasse?: string, status?: string }} filter
 *   status: "geprueft" | "zu_pruefen" | "abgelaufen" (anzeigeStatus); land "DACH" steht für sich.
 */
export function filtere(eintraege, { text = "", land = "", thema = "", klasse = "", status = "" } = {}) {
  return eintraege.filter(
    (e) =>
      (!land || e.land === land) &&
      (!thema || e.thema === thema) &&
      (!klasse || e.klasse === klasse) &&
      (!status || e.status === status) &&
      trifft(e, text)
  );
}
