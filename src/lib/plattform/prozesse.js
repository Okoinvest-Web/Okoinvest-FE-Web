// src/lib/plattform/prozesse.js
//
// Prozesse der Plattform als Zustandsautomaten.
//
// Jede Objektart (Vorgang, Fläche, Projekt, Interesse, Provision) hat eine feste Liste
// erlaubter Übergänge. Ein Übergang nennt, WER ihn auslösen darf:
//   admin       – Backoffice (Rolle `admin`)
//   eigentuemer – Besitzer des Objekts (Anfragender, Flächeneigentümer, Anbieter, Investor)
//   system      – automatisch (z. B. Interesse → abgeschlossen, wenn das Projekt verkauft ist)
// und welche Angaben PFLICHT sind (z. B. `grund` bei Ablehnung).
//
// Die Prüfung läuft serverseitig in jedem Backend (Demo: backend/demo.js, Frappe: gleiche
// Tabelle in Python, siehe docs/API.md). Die Oberfläche nutzt dieselben Daten nur, um
// passende Knöpfe anzuzeigen – entscheidend ist immer der Server.
//
// Client- und serverseitig nutzbar (keine Node-Importe).

import { fachPflichtFehlt } from "./flaecheFach"; // Fachprüfung Flächen

const OFFEN_VORGANG = ["eingegangen", "in_pruefung", "qualifiziert", "angebot"];
const OFFEN_FLAECHE = ["eingegangen", "vorpruefung", "standortanalyse", "pachtangebot", "vertrag", "planung"];

export const PROZESSE = {
  vorgang: {
    label: "Anfrage",
    start: "eingegangen",
    pipeline: ["eingegangen", "in_pruefung", "qualifiziert", "angebot", "abgeschlossen"],
    status: {
      eingegangen: { label: "Eingegangen", ton: "info", text: "Ihre Anfrage ist bei uns eingegangen und wird in Kürze gesichtet." },
      in_pruefung: { label: "In Prüfung", ton: "info", text: "Ein Ansprechpartner prüft Ihre Angaben." },
      qualifiziert: { label: "Qualifiziert", ton: "ok", text: "Ihre Anfrage passt – wir bereiten die nächsten Schritte vor." },
      angebot: { label: "Angebot / Gespräch", ton: "ok", text: "Angebot oder Gesprächstermin liegt vor." },
      abgeschlossen: { label: "Abgeschlossen", ton: "ok", text: "Der Vorgang ist abgeschlossen." },
      abgelehnt: { label: "Abgelehnt", ton: "neutral", text: "Wir können die Anfrage leider nicht weiterverfolgen." },
      zurueckgezogen: { label: "Zurückgezogen", ton: "neutral", text: "Sie haben die Anfrage zurückgezogen." },
    },
    uebergaenge: [
      { von: ["eingegangen"], nach: "in_pruefung", wer: "admin", aktion: "Prüfung beginnen" },
      { von: ["in_pruefung"], nach: "qualifiziert", wer: "admin", aktion: "Als qualifiziert markieren" },
      { von: ["qualifiziert"], nach: "angebot", wer: "admin", aktion: "Angebot / Gespräch" },
      { von: ["angebot"], nach: "abgeschlossen", wer: "admin", aktion: "Abschließen" },
      { von: OFFEN_VORGANG, nach: "abgelehnt", wer: "admin", aktion: "Ablehnen", pflicht: ["grund"] },
      { von: ["abgelehnt", "zurueckgezogen"], nach: "in_pruefung", wer: "admin", aktion: "Wieder aufnehmen" },
      { von: OFFEN_VORGANG, nach: "zurueckgezogen", wer: "eigentuemer", aktion: "Anfrage zurückziehen" },
    ],
  },

  flaeche: {
    label: "Fläche",
    start: "eingegangen",
    pipeline: ["eingegangen", "vorpruefung", "standortanalyse", "pachtangebot", "vertrag", "planung", "bau", "betrieb"],
    status: {
      entwurf: { label: "Entwurf", ton: "neutral", text: "Angaben unvollständig – bitte ergänzen und einreichen." },
      eingegangen: { label: "Eingegangen", ton: "info", text: "Ihre Fläche ist eingegangen." },
      vorpruefung: { label: "Vorprüfung", ton: "info", text: "Wir prüfen Größe, Lage, Schutzgebiete und Planungsrecht grob vor." },
      standortanalyse: { label: "Standortanalyse", ton: "info", text: "Detailprüfung: Netzanschluss, Ertrag, Genehmigungsfähigkeit." },
      pachtangebot: { label: "Pachtangebot", ton: "warn", text: "Ihr Pachtangebot liegt vor – bitte prüfen." },
      vertrag: { label: "Vertrag", ton: "ok", text: "Der Pachtvertrag wird vorbereitet bzw. ist unterzeichnet." },
      planung: { label: "Planung & Genehmigung", ton: "ok", text: "Bauleitplanung bzw. Genehmigung und Netzanschluss laufen." },
      bau: { label: "Bau", ton: "ok", text: "Die Anlage wird errichtet." },
      betrieb: { label: "Betrieb", ton: "ok", text: "Die Anlage ist in Betrieb." },
      abgelehnt: { label: "Abgelehnt", ton: "neutral", text: "Die Fläche eignet sich leider nicht – Begründung siehe Verlauf." },
    },
    uebergaenge: [
      { von: ["entwurf"], nach: "eingegangen", wer: "eigentuemer", aktion: "Zur Prüfung einreichen", bedingung: "flaecheVollstaendig" },
      { von: ["entwurf"], nach: "eingegangen", wer: "admin", aktion: "Als eingegangen übernehmen" },
      { von: ["eingegangen"], nach: "vorpruefung", wer: "admin", aktion: "Vorprüfung starten" },
      { von: ["vorpruefung"], nach: "standortanalyse", wer: "admin", aktion: "Standortanalyse starten" },
      { von: ["standortanalyse"], nach: "pachtangebot", wer: "admin", aktion: "Pachtangebot senden", pflicht: ["pachtangebot"] },
      { von: ["pachtangebot"], nach: "vertrag", wer: "eigentuemer", aktion: "Pachtangebot annehmen" },
      { von: ["pachtangebot"], nach: "vertrag", wer: "admin", aktion: "Angebot angenommen (erfasst)" },
      { von: ["vertrag"], nach: "planung", wer: "admin", aktion: "Planung & Genehmigung starten" },
      { von: ["planung"], nach: "bau", wer: "admin", aktion: "Baubeginn" },
      { von: ["bau"], nach: "betrieb", wer: "admin", aktion: "Inbetriebnahme" },
      { von: ["entwurf", ...OFFEN_FLAECHE], nach: "abgelehnt", wer: "admin", aktion: "Ablehnen", pflicht: ["grund"] },
      { von: ["abgelehnt"], nach: "vorpruefung", wer: "admin", aktion: "Wieder aufnehmen" },
    ],
  },

  projekt: {
    label: "Projekt",
    start: "entwurf",
    pipeline: ["entwurf", "pruefung", "veroeffentlicht", "reserviert", "verkauft"],
    status: {
      entwurf: { label: "Entwurf", ton: "neutral", text: "Nur für Sie sichtbar. Vervollständigen und zur Prüfung einreichen." },
      pruefung: { label: "In Prüfung", ton: "warn", text: "Das Backoffice prüft Angaben und Unterlagen." },
      veroeffentlicht: { label: "Veröffentlicht", ton: "ok", text: "Das Projekt steht in der Börse (öffentlich nur als anonymer Teaser)." },
      reserviert: { label: "Reserviert", ton: "warn", text: "Ein Investor ist in fortgeschrittenen Gesprächen (LOI angenommen)." },
      verkauft: { label: "Verkauft", ton: "ok", text: "Abschluss erfolgt – die Provision wird fällig." },
      abgelehnt: { label: "Abgelehnt", ton: "neutral", text: "Das Projekt wurde nicht freigegeben – Begründung siehe Verlauf." },
    },
    uebergaenge: [
      { von: ["entwurf"], nach: "pruefung", wer: "eigentuemer", aktion: "Zur Prüfung einreichen", bedingung: "projektEinreichbar" },
      { von: ["pruefung"], nach: "entwurf", wer: "eigentuemer", aktion: "Einreichung zurückziehen" },
      { von: ["pruefung"], nach: "veroeffentlicht", wer: "admin", aktion: "Veröffentlichen", pflicht: ["provisionSatz"] },
      { von: ["pruefung"], nach: "entwurf", wer: "admin", aktion: "Zur Überarbeitung zurückgeben", pflicht: ["kommentar"] },
      { von: ["pruefung"], nach: "abgelehnt", wer: "admin", aktion: "Ablehnen", pflicht: ["grund"] },
      { von: ["abgelehnt"], nach: "entwurf", wer: "eigentuemer", aktion: "Überarbeiten" },
      { von: ["veroeffentlicht"], nach: "entwurf", wer: "eigentuemer", aktion: "Von der Börse nehmen" },
      { von: ["veroeffentlicht"], nach: "reserviert", wer: "admin", aktion: "Als reserviert markieren" },
      { von: ["reserviert"], nach: "veroeffentlicht", wer: "admin", aktion: "Reservierung aufheben" },
      { von: ["veroeffentlicht", "reserviert"], nach: "verkauft", wer: "admin", aktion: "Verkauf abschließen", pflicht: ["interesseId", "kaufpreis"] },
    ],
  },

  interesse: {
    label: "Projektinteresse",
    start: "gemerkt",
    pipeline: ["gemerkt", "nda_angefragt", "nda_freigegeben", "loi_abgegeben", "loi_angenommen", "abgeschlossen"],
    status: {
      gemerkt: { label: "Gemerkt", ton: "neutral", text: "Projekt auf der Merkliste." },
      nda_angefragt: { label: "NDA angefragt", ton: "warn", text: "NDA akzeptiert – Freigabe des Datenraums durch das Backoffice ausstehend." },
      nda_freigegeben: { label: "Datenraum frei", ton: "ok", text: "Vertrauliche Angaben und Datenraum sind freigeschaltet." },
      loi_abgegeben: { label: "LOI abgegeben", ton: "warn", text: "Ihre Absichtserklärung liegt dem Backoffice vor." },
      loi_angenommen: { label: "LOI angenommen", ton: "ok", text: "Exklusive Gespräche / Due Diligence." },
      abgeschlossen: { label: "Abgeschlossen", ton: "ok", text: "Kauf abgeschlossen." },
      abgelehnt: { label: "Abgelehnt", ton: "neutral", text: "Anfrage nicht weiterverfolgt – Begründung siehe Verlauf." },
    },
    uebergaenge: [
      { von: ["gemerkt"], nach: "nda_angefragt", wer: "eigentuemer", aktion: "NDA akzeptieren & Datenraum anfragen", pflicht: ["ndaAkzeptiert"] },
      { von: ["nda_angefragt"], nach: "nda_freigegeben", wer: "admin", aktion: "Datenraum freigeben" },
      { von: ["nda_angefragt"], nach: "abgelehnt", wer: "admin", aktion: "Ablehnen", pflicht: ["grund"] },
      { von: ["nda_freigegeben"], nach: "loi_abgegeben", wer: "eigentuemer", aktion: "LOI abgeben", pflicht: ["loi"] },
      { von: ["loi_abgegeben"], nach: "loi_angenommen", wer: "admin", aktion: "LOI annehmen" },
      { von: ["loi_abgegeben", "nda_freigegeben"], nach: "abgelehnt", wer: "admin", aktion: "Ablehnen", pflicht: ["grund"] },
      { von: ["loi_angenommen", "loi_abgegeben", "nda_freigegeben"], nach: "abgeschlossen", wer: "system", aktion: "Kauf abgeschlossen" },
      { von: ["nda_freigegeben", "loi_abgegeben"], nach: "loi_angenommen", wer: "system", aktion: "Zuschlag im Bieterverfahren" }, // Deal-Room (Bieterverfahren)
      { von: ["gemerkt", "nda_angefragt", "nda_freigegeben", "loi_abgegeben", "loi_angenommen"], nach: "abgelehnt", wer: "system", aktion: "Projekt anderweitig verkauft" },
    ],
  },

  provision: {
    label: "Provision",
    start: "offen",
    pipeline: ["offen", "in_rechnung", "bezahlt"],
    status: {
      offen: { label: "Offen", ton: "warn", text: "Provision berechnet, noch nicht in Rechnung gestellt." },
      in_rechnung: { label: "In Rechnung", ton: "info", text: "Rechnung an den Anbieter gestellt." },
      bezahlt: { label: "Bezahlt", ton: "ok", text: "Zahlung eingegangen." },
      storniert: { label: "Storniert", ton: "neutral", text: "Provision storniert (z. B. Rückabwicklung)." },
    },
    uebergaenge: [
      { von: ["offen"], nach: "in_rechnung", wer: "admin", aktion: "Rechnung gestellt" },
      { von: ["in_rechnung"], nach: "bezahlt", wer: "admin", aktion: "Zahlung erhalten" },
      { von: ["offen", "in_rechnung"], nach: "storniert", wer: "admin", aktion: "Stornieren", pflicht: ["grund"] },
    ],
  },
};

export const PROZESS_ARTEN = Object.keys(PROZESSE);

/** Anzeige-Infos zu einem Status */
export function statusInfo(art, status) {
  return PROZESSE[art]?.status?.[status] || { label: status || "–", ton: "neutral", text: "" };
}
export const statusLabel = (art, status) => statusInfo(art, status).label;

/** Alle Übergänge, die `wer` (admin | eigentuemer | system) aus `von` auslösen darf */
export function erlaubteUebergaenge(art, von, wer) {
  const p = PROZESSE[art];
  if (!p) return [];
  return p.uebergaenge.filter((u) => u.wer === wer && u.von.includes(von));
}

/**
 * Bedingungen, die über Pflichtangaben hinaus erfüllt sein müssen.
 * Liefert eine Liste fehlender Punkte (leer = erfüllt).
 */
export const BEDINGUNGEN = {
  projektEinreichbar(p) {
    const fehlt = [];
    if (!p?.titel) fehlt.push("Projekttitel");
    if (!p?.typ) fehlt.push("Projekttyp");
    if (!p?.land) fehlt.push("Land");
    if (!p?.bundesland) fehlt.push("Bundesland / Kanton");
    if (!p?.region) fehlt.push("Region (grob)");
    if (!(Number(p?.mwp) > 0)) fehlt.push("Leistung in MWp");
    if (!p?.phase) fehlt.push("Entwicklungsphase");
    if (!p?.beschreibung || String(p.beschreibung).length < 80) fehlt.push("Beschreibung (mind. 80 Zeichen)");
    if (!p?.provisionAkzeptiert?.am) fehlt.push("Provisionsvereinbarung akzeptieren");
    return fehlt;
  },
  flaecheVollstaendig(f) {
    const fehlt = [];
    if (!f?.bezeichnung) fehlt.push("Bezeichnung");
    if (!f?.land) fehlt.push("Land");
    if (!f?.plz) fehlt.push("PLZ");
    if (!f?.ort) fehlt.push("Ort / Gemeinde");
    if (!(Number(f?.ha) > 0)) fehlt.push("Größe in Hektar");
    fehlt.push(...fachPflichtFehlt(f)); // Fachprüfung Flächen: Pflichtangaben je Nutzung (Dach, Agri-PV, Eigentum, Pacht, Katasterfläche)
    return fehlt;
  },
};

/**
 * Prüft einen Übergang. Liefert { ok: true, uebergang } oder { ok: false, status, fehler }.
 * `extra` enthält die Pflichtangaben (grund, kommentar, pachtangebot, …).
 * `objekt` wird für Bedingungen gebraucht.
 */
export function pruefeUebergang(art, objekt, nach, wer, extra = {}) {
  const p = PROZESSE[art];
  if (!p) return { ok: false, status: 400, fehler: "Unbekannte Objektart" };
  const von = objekt?.status;
  if (!p.status[nach]) return { ok: false, status: 400, fehler: "Unbekannter Zielstatus" };
  const kandidaten = p.uebergaenge.filter((u) => u.nach === nach && u.von.includes(von));
  if (!kandidaten.length) {
    return { ok: false, status: 409, fehler: `Wechsel von „${statusLabel(art, von)}“ nach „${statusLabel(art, nach)}“ ist nicht vorgesehen` };
  }
  const u = kandidaten.find((k) => k.wer === wer);
  if (!u) return { ok: false, status: 403, fehler: "Diesen Schritt dürfen Sie nicht auslösen" };
  for (const feld of u.pflicht || []) {
    const v = extra?.[feld];
    if (v === undefined || v === null || v === "" || v === false) {
      return { ok: false, status: 422, fehler: `Pflichtangabe fehlt: ${PFLICHT_LABEL[feld] || feld}` };
    }
  }
  if (u.bedingung) {
    const fehlt = BEDINGUNGEN[u.bedingung]?.(objekt) || [];
    if (fehlt.length) return { ok: false, status: 422, fehler: `Bitte ergänzen: ${fehlt.join(", ")}` };
  }
  return { ok: true, uebergang: u };
}

export const PFLICHT_LABEL = {
  grund: "Begründung",
  kommentar: "Kommentar",
  pachtangebot: "Pachtangebot",
  provisionSatz: "Provisionssatz",
  interesseId: "Käufer (Interessent)",
  kaufpreis: "Kaufpreis",
  ndaAkzeptiert: "Zustimmung zur Vertraulichkeitsvereinbarung",
  loi: "Absichtserklärung (LOI)",
};

/** Status, in denen ein Investor den Datenraum sehen darf */
export const DATENRAUM_STATUS = ["nda_freigegeben", "loi_abgegeben", "loi_angenommen", "abgeschlossen"];

/** Status, in denen ein Projekt in der Börse sichtbar ist */
export const BOERSE_STATUS = ["veroeffentlicht", "reserviert"];

/** Offene (nicht finale) Status je Art – für Kennzahlen */
export const OFFENE_STATUS = {
  vorgang: OFFEN_VORGANG,
  flaeche: ["entwurf", ...OFFEN_FLAECHE],
  projekt: ["entwurf", "pruefung", "veroeffentlicht", "reserviert"],
  interesse: ["nda_angefragt", "nda_freigegeben", "loi_abgegeben", "loi_angenommen"],
};
