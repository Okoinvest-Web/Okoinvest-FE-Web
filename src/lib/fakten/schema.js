// src/lib/fakten/schema.js
//
// VERTRAG des Faktenregisters (Welle 2, Paket B1). Jeder Markt- und Rechtswert der
// Website ist ein „Fakt“ mit Quelle, Stand, Gültigkeit, Status, Prüfer und Klasse.
// Dieser Vertrag gilt für alle Datenmodule unter src/lib/fakten/daten/ – auch für die
// Dateien anderer Pakete (FRI: termine-*, umlagen-*, netzentgelte-*; B4 liest nur).
// Änderungen am Vertrag nur abgestimmt mit FRI und B4.
//
// Fakt = {
//   id          string    Punkt-getrennt, klein beginnend, z. B. "pacht.freiflaecheProHa"
//                         (id + land ist eindeutig; dieselbe id kann es je Land geben)
//   wert        number | string | boolean | object | array | null
//                         Spannen als { min, mittel?, max }, Tabellen als Array.
//                         null nur für dokumentierte Lücken (status ≠ geprueft).
//   einheit     string    z. B. "€/ha·a", "ct/kWh", "Rp./kWh", "kWh/kWp", "Anteil", "Jahre", "Text"
//   land        "DE" | "AT" | "CH" | "DACH" (DACH = gilt unverändert in allen drei Ländern)
//   quelle      { titel, url, art? }  url = Primärquelle (https) oder null bei eigener Einschätzung;
//                         art: "primaer" | "sekundaer" | "eigen" (optional, Standard "primaer")
//   abruf       ISO-Datum  wann die Quelle zuletzt eingesehen bzw. die Einschätzung getroffen wurde
//   gueltigAb   ISO-Datum | null
//   gueltigBis  ISO-Datum | null   (null = unbefristet bzw. bis zur nächsten Änderung)
//   status      "geprueft" | "zu_pruefen" | "entwurf" | "abgelaufen"
//                         geprueft   = Wert am Original (quelle.url) nachgeprüft
//                         zu_pruefen = Quelle genannt oder eigene Einschätzung, noch nicht am Original geprüft
//                         entwurf    = vorgeschlagen, nicht freigegeben (wird nie in Rechnern verwendet)
//                         abgelaufen = bewusst als veraltet markiert
//   pruefer     string    Rolle/Kürzel; solange die zweite Prüfperson (E6) fehlt: "… · Zweitprüfung TODO-E6"
//   klasse      "A" | "B" | "C"   siehe KLASSEN
//   notiz       string (optional)  Herleitung, Einschränkungen
// }

export const LAENDER = ["DE", "AT", "CH", "DACH"];
export const STATUS = ["geprueft", "zu_pruefen", "entwurf", "abgelaufen"];
export const QUELLEN_ARTEN = ["primaer", "sekundaer", "eigen"];

/**
 * Klassen (Masterplan H7, Abschnitt 12 „Klasse-A-Änderungen brauchen die zweite Person (E6)“):
 *  A  Recht, Förderung, Abgaben/Umlagen, Fristen – ein abgelaufener A-Wert wird nie als aktuell gezeigt,
 *     qa/fakten-check.mjs setzt das Gate dann auf ROT.
 *  B  Markt- und Statistikwerte mit externer Quelle (Ausschreibungsergebnisse, Destatis, PVGIS, Studien).
 *  C  Eigene Annahmen und Einschätzungen (Spannen, Rechenwerte) – immer als Orientierung kennzeichnen.
 */
export const KLASSEN = {
  A: "Recht, Förderung, Abgaben und Fristen",
  B: "Markt- und Statistikwert mit externer Quelle",
  C: "Eigene Annahme oder Einschätzung",
};

export const STATUS_TEXT = {
  geprueft: "am Original geprüft",
  zu_pruefen: "Prüfung ausstehend",
  entwurf: "Entwurf",
  abgelaufen: "Stand abgelaufen, wird geprüft",
};

/** Text, der für einen abgelaufenen Wert IMMER statt „aktuell“ erscheint (Masterplan H7) */
export const HINWEIS_ABGELAUFEN = "Stand abgelaufen, wird geprüft";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9][A-Za-z0-9_.-]*$/;

/** true für ein gültiges ISO-Datum JJJJ-MM-TT */
export function istIsoDatum(s) {
  if (typeof s !== "string" || !ISO.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Heute (oder ein übergebenes Datum) als ISO-Datum JJJJ-MM-TT */
export function isoHeute(heute = new Date()) {
  if (typeof heute === "string") return heute.slice(0, 10);
  return heute.toISOString().slice(0, 10);
}

/**
 * Prüft einen Fakt gegen den Vertrag.
 * @returns {{ ok: boolean, fehler: string[], warnungen: string[] }}
 */
export function faktValidieren(f) {
  const fehler = [];
  const warnungen = [];
  if (!f || typeof f !== "object") return { ok: false, fehler: ["kein Objekt"], warnungen };
  const wo = typeof f.id === "string" ? `${f.id} (${f.land ?? "?"})` : "(ohne id)";
  const F = (t) => fehler.push(`${wo}: ${t}`);
  const W = (t) => warnungen.push(`${wo}: ${t}`);

  if (typeof f.id !== "string" || !ID.test(f.id)) F("id fehlt oder ungültig");
  if (f.wert === undefined) F("wert fehlt");
  if (f.wert === null && f.status === "geprueft") F("wert null, aber status geprueft");
  if (typeof f.einheit !== "string" || !f.einheit.trim()) F("einheit fehlt");
  if (!LAENDER.includes(f.land)) F(`land muss ${LAENDER.join("|")} sein`);

  const q = f.quelle;
  if (!q || typeof q !== "object" || typeof q.titel !== "string" || !q.titel.trim()) F("quelle.titel fehlt");
  else {
    if (q.art !== undefined && !QUELLEN_ARTEN.includes(q.art)) F(`quelle.art muss ${QUELLEN_ARTEN.join("|")} sein`);
    if (q.url !== null && q.url !== undefined && (typeof q.url !== "string" || !/^https:\/\//.test(q.url))) F("quelle.url muss mit https:// beginnen oder null sein");
    if (!q.url && f.status === "geprueft") F("status geprueft verlangt quelle.url (Primärquelle)");
    if (!q.url && q.art !== "eigen") W("Quelle ohne URL – Fundstelle nachtragen");
  }

  if (!istIsoDatum(f.abruf)) F("abruf fehlt oder ist kein ISO-Datum");
  if (f.gueltigAb != null && !istIsoDatum(f.gueltigAb)) F("gueltigAb ist kein ISO-Datum");
  if (f.gueltigBis != null && !istIsoDatum(f.gueltigBis)) F("gueltigBis ist kein ISO-Datum");
  if (istIsoDatum(f.gueltigAb) && istIsoDatum(f.gueltigBis) && f.gueltigAb > f.gueltigBis) F("gueltigAb liegt nach gueltigBis");
  if (!STATUS.includes(f.status)) F(`status muss ${STATUS.join("|")} sein`);
  if (typeof f.pruefer !== "string" || !f.pruefer.trim()) F("pruefer fehlt (Rolle/Kürzel oder TODO-E6)");
  if (!(f.klasse in KLASSEN)) F("klasse muss A, B oder C sein");
  if (f.notiz !== undefined && typeof f.notiz !== "string") F("notiz muss Text sein");
  return { ok: fehler.length === 0, fehler, warnungen };
}

/**
 * Ist der Fakt am Stichtag abgelaufen? (status "abgelaufen" oder gueltigBis vor `heute`)
 * @param {object} fakt
 * @param {Date|string} [heute] Date oder ISO-Datum; Standard: jetzt
 */
export function istAbgelaufen(fakt, heute = new Date()) {
  if (!fakt) return false;
  if (fakt.status === "abgelaufen") return true;
  return istIsoDatum(fakt.gueltigBis) && fakt.gueltigBis < isoHeute(heute);
}

/** Gilt der Fakt am Stichtag schon? (gueltigAb erreicht oder nicht gesetzt) */
export function istInKraft(fakt, heute = new Date()) {
  return !fakt?.gueltigAb || fakt.gueltigAb <= isoHeute(heute);
}

/**
 * Anzeige-Status eines Fakts für Komponenten und Berichte:
 * "abgelaufen" (nie als aktuell zeigen) · "entwurf" · "zu_pruefen" · "geprueft"
 */
export function anzeigeStatus(fakt, heute = new Date()) {
  if (istAbgelaufen(fakt, heute)) return "abgelaufen";
  return fakt?.status || "zu_pruefen";
}

/** ISO-Datum als deutsches Datum „17.07.2026“ */
export function datumDe(iso) {
  if (!istIsoDatum(iso)) return "";
  const [j, m, t] = iso.split("-");
  return `${t}.${m}.${j}`;
}

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/** ISO-Datum als „1. März 2025“ */
export function datumLang(iso) {
  if (!istIsoDatum(iso)) return "";
  const [j, m, t] = iso.split("-").map(Number);
  return `${t}. ${MONATE[m - 1]} ${j}`;
}

/** ISO-Datum als „September 2026“ */
export function monatJahr(iso) {
  if (!istIsoDatum(iso)) return "";
  const [j, m] = iso.split("-").map(Number);
  return `${MONATE[m - 1]} ${j}`;
}
