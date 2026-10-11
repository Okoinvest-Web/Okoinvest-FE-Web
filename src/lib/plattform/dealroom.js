// src/lib/plattform/dealroom.js
//
// Stammlisten und reine Regeln des Deal-Rooms (Q&A, Bieterverfahren, Datenraum 2.0,
// Investor-Pipeline, Anbieter-Cockpit). Client- und serverseitig nutzbar – keine Node-Importe.
// Frappe spiegelt die Tabellen in `plattform/dealroom_regeln.py` (identisch halten).
//
// Grundsatz Umgehungsschutz: Anbieter und Investoren sehen sich gegenseitig NICHT, bis das
// Backoffice die Kontakte je Interesse freigibt („Kontaktfreigabe“). Bis dahin erscheinen
// Investoren beim Anbieter nur als Pseudonym („Investor A“), der Anbieter beim Investor nur
// als „Anbieter“. Freitexte (Fragen, Antworten, Gebotsbedingungen) werden zusätzlich von
// E-Mail-Adressen, Telefonnummern und Links bereinigt.

import { DATENRAUM_STATUS } from "./prozesse";

// ---------------------------------------------------------------- Q&A

export const QA_KATEGORIEN = {
  technisch: "Technisch",
  rechtlich: "Rechtlich",
  kaufmaennisch: "Kaufmännisch",
  netz: "Netz",
};
export const QA_KATEGORIE_IDS = Object.keys(QA_KATEGORIEN);

/**
 * Status einer Frage (intern). Für Investoren zählt nur offen/beantwortet (`qaOeffentlicherStatus`).
 *   eingereicht     – Investor hat gefragt, Moderation durch ÖkoInvest ausstehend
 *   freigegeben     – anonymisiert an den Anbieter weitergegeben, Antwortfrist läuft
 *   beantwortet     – Anbieter hat geantwortet, Freigabe der Antwort durch ÖkoInvest ausstehend
 *   veroeffentlicht – Antwort freigegeben (für den Fragenden, optional für alle NDA-Investoren)
 *   abgelehnt       – nicht zugelassen (z. B. Umgehungsversuch, Dublette)
 */
export const FRAGE_STATUS = {
  eingereicht: { label: "In Moderation", ton: "warn" },
  freigegeben: { label: "Offen beim Anbieter", ton: "info" },
  beantwortet: { label: "Antwort in Prüfung", ton: "warn" },
  veroeffentlicht: { label: "Beantwortet", ton: "ok" },
  abgelehnt: { label: "Nicht zugelassen", ton: "neutral" },
};
export const qaOeffentlicherStatus = (s) => (s === "veroeffentlicht" ? "beantwortet" : s === "abgelehnt" ? "abgelehnt" : "offen");
export const QA_FRIST_TAGE = { standard: 5, min: 1, max: 30 };

// ---------------------------------------------------------------- Datenraum 2.0

/** Standard-Index des Datenraums (Reihenfolge = Nummerierung) */
export const DATENRAUM_ORDNER = [
  { id: "flaeche", nr: "01", label: "Fläche & Sicherung", text: "Lageplan, Grundbuch, Pacht- und Nutzungsverträge" },
  { id: "planung", nr: "02", label: "Planung & Genehmigung", text: "Aufstellungs-/Satzungsbeschluss, Widmung, Baugenehmigung, Gutachten" },
  { id: "netz", nr: "03", label: "Netz", text: "Netzanfrage, Netzanschlusszusage, Reservierung, Trassenplanung" },
  { id: "technik", nr: "04", label: "Technik", text: "Anlagenlayout, Komponenten, Betriebsdaten, Wartung" },
  { id: "ertrag", nr: "05", label: "Ertrag", text: "Ertragsgutachten (P50/P90), Verschattung, Messdaten" },
  { id: "vertraege", nr: "06", label: "Verträge", text: "EEG-/EAG-Zuschlag, PPA, Direktvermarktung, Dienstleister" },
  { id: "finanzen", nr: "07", label: "Finanzen", text: "Finanzmodell, Kostenschätzung, Steuern, Förderungen" },
  { id: "allgemein", nr: "00", label: "Allgemein", text: "Exposé, Steckbrief, Sonstiges" },
];
export const DATENRAUM_ORDNER_IDS = DATENRAUM_ORDNER.map((o) => o.id);
export const ordnerLabel = (id) => DATENRAUM_ORDNER.find((o) => o.id === id)?.label || "Allgemein";

/** Ordner aus dem Checklisten-Schlüssel eines Dokuments (Vorbelegung) */
export const ORDNER_FUER_CHECKLISTE = {
  pacht: "flaeche",
  lageplan: "flaeche",
  netzzusage: "netz",
  aufstellung: "planung",
  gutachten: "planung",
  satzung: "planung",
  baugenehmigung: "planung",
  ertrag: "ertrag",
  eeg: "vertraege",
  betrieb: "technik",
};

export function ordnerVorschlag(dokument) {
  if (ORDNER_FUER_CHECKLISTE[dokument?.checkliste]) return ORDNER_FUER_CHECKLISTE[dokument.checkliste];
  const n = String(dokument?.name || "").toLowerCase();
  if (/netz|einspeis|umspann/.test(n)) return "netz";
  if (/ertrag|p50|p90|yield/.test(n)) return "ertrag";
  if (/finanz|kosten|capex|modell|steuer/.test(n)) return "finanzen";
  if (/vertrag|ppa|eeg|eag|zuschlag|direktvermarkt/.test(n)) return "vertraege";
  if (/beschluss|satzung|genehmig|bewilligung|widmung|gutacht|b-plan|bebauungsplan/.test(n)) return "planung";
  if (/lageplan|grundbuch|flur|pacht|nutzungsvertr/.test(n)) return "flaeche";
  if (/layout|modul|wechselricht|technik|betrieb|wartung/.test(n)) return "technik";
  return "allgemein";
}

/**
 * Freigabestufen. Stufe 1: nach NDA-Freigabe (Datenraum frei). Stufe 2: nach LOI bzw. als
 * zugelassener Teilnehmer der verbindlichen Runde eines Bieterverfahrens.
 */
export const DATENRAUM_STUFEN = {
  1: { label: "Stufe 1", text: "nach NDA-Freigabe" },
  2: { label: "Stufe 2", text: "nach LOI bzw. Zulassung zur verbindlichen Runde" },
};
export const STUFE2_STATUS = ["loi_abgegeben", "loi_angenommen", "abgeschlossen"];

/** Höchste Stufe eines Investors (0 = kein Datenraum) */
export function investorStufe(interesse, { verbindlichZugelassen = false } = {}) {
  if (!interesse || !DATENRAUM_STATUS.includes(interesse.status)) return 0;
  if (STUFE2_STATUS.includes(interesse.status) || verbindlichZugelassen) return 2;
  return 1;
}

/** Download-Dateiname mit „Wasserzeichen“ (Empfänger + Datum) – ASCII-sicher, Endung bleibt */
export function wasserzeichenName(name, empfaenger, am = new Date()) {
  const s = String(name || "dokument.pdf");
  const punkt = s.lastIndexOf(".");
  const basis = (punkt > 0 ? s.slice(0, punkt) : s).trim();
  const endung = punkt > 0 ? s.slice(punkt) : "";
  const wer = [empfaenger?.vorname, empfaenger?.nachname].filter(Boolean).join(" ").replace(/\s*\(demo\)\s*/i, " Demo").trim() || "Empfaenger";
  const tag = new Date(am).toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });
  const sauber = (x) => x.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").trim();
  return `${sauber(basis)} - vertraulich fuer ${sauber(wer)} ${tag}${endung}`.slice(0, 180);
}

// ---------------------------------------------------------------- Umgehungsschutz

const MUSTER = [
  /[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,120}\.[A-Z]{2,24}/gi, // E-Mail
  /\b(?:https?:\/\/|www\.)\S+/gi, // Links
  /(?:\+|00)\d[\d ()/.-]{6,20}\d/g, // internationale Rufnummer
  /\b0\d{2,5}(?:[ /.-]?\d){4,14}\b/g, // nationale Rufnummer
];

/** Kontaktdaten aus Freitext entfernen. Liefert { text, bereinigt } */
export function anonymisieren(text) {
  let t = String(text ?? "");
  let bereinigt = false;
  for (const m of MUSTER) {
    t = t.replace(m, () => {
      bereinigt = true;
      return "[Kontaktangabe entfernt]";
    });
  }
  return { text: t, bereinigt };
}

/** Pseudonym je Reihenfolge: 0 → „A“, 25 → „Z“, 26 → „AA“ */
export function pseudonymBuchstabe(i) {
  let n = Math.max(0, i | 0);
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

// ---------------------------------------------------------------- Bieterverfahren

export const RUNDEN_ARTEN = {
  indikativ: { label: "Indikative Angebote", kurz: "Indikativ", text: "Unverbindliche Preisindikation mit Bedingungen – Grundlage für die Auswahl der Shortlist." },
  verbindlich: { label: "Verbindliche Angebote", kurz: "Verbindlich", text: "Bindende Angebote der zugelassenen Bieter mit Finanzierungsnachweis und Zeitplan." },
};

export const VERFAHREN_STATUS = {
  laufend: { label: "Runde läuft", ton: "ok" },
  auswertung: { label: "Auswertung", ton: "warn" },
  zuschlag: { label: "Zuschlag erteilt", ton: "ok" },
  abgeschlossen: { label: "Abgeschlossen", ton: "neutral" },
  abgebrochen: { label: "Abgebrochen", ton: "neutral" },
};

export const GEBOT_STATUS = {
  abgegeben: { label: "Abgegeben", ton: "info" },
  zurueckgezogen: { label: "Zurückgezogen", ton: "neutral" },
  zuschlag: { label: "Zuschlag", ton: "ok" },
  unterlegen: { label: "Nicht berücksichtigt", ton: "neutral" },
};

/** Pflichtangaben eines Gebots (Admin wählt je Verfahren; Preis ist immer Pflicht) */
export const GEBOT_PFLICHT = {
  bedingungen: "Bedingungen / Vorbehalte",
  finanzierung: "Finanzierungsnachweis",
  zeitplan: "Zeitplan bis Signing/Closing",
};

export const ERINNERUNG_STUNDEN = 48;

/** Gesamtpreis eines Gebots (für Vergleich und Provision) */
export function gebotGesamt(g, mwp) {
  if (!g) return null;
  if (g.preisModus === "proKwp") return g.preisProKwp && mwp ? Math.round(g.preisProKwp * mwp * 1000) : null;
  return g.preis || null;
}
/** Bindefrist eines Gebots abgelaufen? Kein Zuschlag auf ein nicht mehr bindendes Angebot (rechtlich angreifbar). */
export function gebotBindefristAbgelaufen(g, heute = new Date().toISOString().slice(0, 10)) {
  return !!(g?.gueltigBis && String(g.gueltigBis).slice(0, 10) < heute);
}

export function gebotProKwp(g, mwp) {
  if (!g) return null;
  if (g.preisModus === "proKwp") return g.preisProKwp || null;
  return g.preis && mwp ? Math.round(g.preis / (mwp * 1000)) : null;
}

/** Restzeit bis zur Frist als Text („2 Tg. 4 Std.“) */
export function restzeit(frist, jetzt = Date.now()) {
  const ms = new Date(frist).getTime() - jetzt;
  if (!Number.isFinite(ms)) return "–";
  if (ms <= 0) return "abgelaufen";
  const min = Math.floor(ms / 60000);
  const t = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (t > 0) return `${t} Tg. ${h} Std.`;
  if (h > 0) return `${h} Std. ${m} Min.`;
  return `${m} Min.`;
}

// ---------------------------------------------------------------- Investor-Pipeline

export const PIPELINE_SPALTEN = [
  { id: "beobachten", label: "Beobachten", text: "Gemerkt, noch keine NDA" },
  { id: "nda", label: "NDA", text: "NDA akzeptiert, Freigabe ausstehend" },
  { id: "datenraum", label: "Datenraum", text: "Datenraum frei – Prüfung läuft" },
  { id: "angebot", label: "Angebot", text: "LOI oder Gebot abgegeben" },
  { id: "verhandlung", label: "Verhandlung", text: "LOI angenommen bzw. Zuschlag – Exklusivität" },
  { id: "gewonnen", label: "Gewonnen", text: "Kauf abgeschlossen" },
  { id: "verloren", label: "Verloren", text: "Abgelehnt oder anderweitig verkauft" },
];
export const PIPELINE_SPALTEN_IDS = PIPELINE_SPALTEN.map((s) => s.id);
export const AKTIVE_SPALTEN = ["beobachten", "nda", "datenraum", "angebot", "verhandlung"];

/** Spalte aus Interesse-Status und eigenen Geboten (ohne manuelle Einordnung) */
export function pipelineSpalte(interesse, { gebotAbgegeben = false, zuschlag = false } = {}) {
  const s = interesse?.status;
  if (s === "abgeschlossen") return "gewonnen";
  if (s === "abgelehnt") return "verloren";
  if (s === "loi_angenommen" || zuschlag) return "verhandlung";
  if (s === "loi_abgegeben" || gebotAbgegeben) return "angebot";
  if (s === "nda_freigegeben") return "datenraum";
  if (s === "nda_angefragt") return "nda";
  return "beobachten";
}

export const NOTIZ_TAGS_MAX = 8;
export const SUCHPROFILE_MAX = 8;
