// src/lib/plattform/mitglied/basis.js
//
// Kleine, abhängigkeitsfreie Helfer für die reinen Module Genossenschaft, Versammlung, Energiegemeinschaft und
// Gemeinde-Cockpit (client-, server- und Node-seitig nutzbar, ohne Pfad-Aliase). Frappe: plattform/mitglied_kern.py.

const STEUER = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Fachfehler (422) bzw. Konflikt (409) der reinen Module – die Backends übersetzen in PlattformFehler */
export class MitgliedFehler extends Error {
  constructor(msg, status = 422, feld = "") {
    super(msg);
    this.status = status;
    this.feld = feld;
  }
}
export const fehler = (msg, feld = "") => new MitgliedFehler(msg, 422, feld);
export const konfliktFehler = (msg) => new MitgliedFehler(msg, 409);

export const text = (v, max = 200) => (v === undefined || v === null || typeof v === "object" ? "" : String(v).replace(STEUER, "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, max));
export const mehrzeilig = (v, max = 5000) => (v === undefined || v === null || typeof v === "object" ? "" : String(v).replace(STEUER, "").replace(/\r\n?/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim().slice(0, max));
export const auswahl = (v, erlaubt, std = "") => (Object.prototype.hasOwnProperty.call(erlaubt, v) ? v : std);
export const wahr = (v) => v === true || v === "true" || v === "ja" || v === 1;

/** Zahl in Grenzen oder null (Komma als Dezimaltrenner erlaubt) */
export function zahl(v, min = -Infinity, max = Infinity, stellen) {
  if (v === undefined || v === null || v === "" || typeof v === "object") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return stellen === undefined ? n : Math.round(n * 10 ** stellen) / 10 ** stellen;
}
export const ganz = (v, min, max) => {
  const n = zahl(v, min, max);
  return n === null ? null : Math.round(n);
};
/** Cent-genau runden (kaufmännisch) */
export const rund2 = (x) => Math.round((Number(x) || 0) * 100 + (x >= 0 ? 1e-9 : -1e-9)) / 100;

const DATUM = /^(20\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const datum = (v) => {
  const s = String(v || "").slice(0, 10);
  if (!DATUM.test(s)) return "";
  const d = new Date(`${s}T12:00:00Z`);
  return d.toISOString().slice(0, 10) === s ? s : "";
};
/** Datum mit Uhrzeit „JJJJ-MM-TTTHH:MM“ (Ortszeit, ohne Zone) */
export const datumZeit = (v) => {
  const s = String(v || "").slice(0, 16);
  return /^20\d\d-\d\d-\d\dT([01]\d|2[0-3]):[0-5]\d$/.test(s) && datum(s) ? s : "";
};
export const monat = (v) => (/^20\d\d-(0[1-9]|1[0-2])$/.test(String(v || "")) ? String(v) : "");
export const iban = (v) => {
  const s = String(v || "").toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return "";
  const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const z of r) rest = (rest * 10 + Number(z)) % 97;
  return rest === 1 ? s : "";
};
export const ibanMaskiert = (s) => (s ? `${s.slice(0, 4)} •••• •••• ${s.slice(-4)}` : "");

/** Tage zwischen zwei ISO-Daten (b − a) */
export const tageZwischen = (a, b) => Math.round((Date.parse(`${String(b).slice(0, 10)}T12:00:00Z`) - Date.parse(`${String(a).slice(0, 10)}T12:00:00Z`)) / 864e5);
export function plusTage(iso, tage) {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}
/** Monate addieren (Monatsende bleibt Monatsende) */
export function plusMonate(iso, monate) {
  const [j, m, t] = String(iso).slice(0, 10).split("-").map(Number);
  const ziel = new Date(Date.UTC(j, m - 1 + monate, 1, 12));
  const letzter = new Date(Date.UTC(ziel.getUTCFullYear(), ziel.getUTCMonth() + 1, 0, 12)).getUTCDate();
  ziel.setUTCDate(Math.min(t, letzter));
  return ziel.toISOString().slice(0, 10);
}
export const datumDe = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "–");
export const eurDe = (x) => `${(Math.round((Number(x) || 0) * 100) / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
