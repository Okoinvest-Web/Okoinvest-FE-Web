// src/lib/plattform/finanzen/basis.js
//
// Kleine, reine Helfer für Geld und Datum der Finanz-Logik (keine Node-/React-Importe, auch im Browser nutzbar).
// Datumswerte immer als ISO-Tag „JJJJ-MM-TT“ (Kalendertag, keine Uhrzeit), gerechnet in UTC – so gibt es keine
// Sommerzeit-Sprünge. „Heute“ gilt in Europe/Vienna (Sitz der ÖkoInvest GmbH).

/** Kaufmännisch auf Cent runden (EPSILON gegen 1,005 → 1,00) */
export const rund2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;
export const rund = (x, stellen = 2) => {
  const f = 10 ** stellen;
  return Math.round((Number(x) + Number.EPSILON) * f) / f;
};
export const summe = (liste, feld) => rund2(liste.reduce((s, x) => s + (Number(feld ? x[feld] : x) || 0), 0));

const TAG = /^(\d{4})-(\d{2})-(\d{2})$/;

export function istDatum(s) {
  const m = TAG.exec(String(s || ""));
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export const datumOderLeer = (s) => (istDatum(s) ? String(s) : "");

function alsDate(s) {
  const m = TAG.exec(String(s));
  if (!m) throw new Error(`Ungültiges Datum: ${s}`);
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}
const alsIso = (d) => d.toISOString().slice(0, 10);

export function plusTage(s, n) {
  const d = alsDate(s);
  d.setUTCDate(d.getUTCDate() + Number(n || 0));
  return alsIso(d);
}

/** Tage von a bis b (b − a), ganze Tage */
export const tageZwischen = (a, b) => Math.round((alsDate(b) - alsDate(a)) / 86400000);

/** Erster Tag des Monats + n Monate */
export function monatsAnfang(jahr, monat) {
  return alsIso(new Date(Date.UTC(jahr, monat - 1, 1)));
}

/** Letzter Tag des Monats (monat 1–12, darf über-/unterlaufen) */
export function monatsEnde(jahr, monat) {
  return alsIso(new Date(Date.UTC(jahr, monat, 0)));
}

export const jahrVon = (s) => Number(String(s).slice(0, 4));
export const monatVon = (s) => Number(String(s).slice(5, 7));
export const tageImJahr = (jahr) => (new Date(Date.UTC(jahr, 1, 29)).getUTCMonth() === 1 ? 366 : 365);

/** „JJJJ-MM“ → erster und letzter Tag */
export function monatsZeitraum(monat) {
  const [j, m] = String(monat).split("-").map(Number);
  return { von: monatsAnfang(j, m), bis: monatsEnde(j, m) };
}

/** Vormonat von „JJJJ-MM“ */
export function vormonat(monat) {
  const [j, m] = String(monat).split("-").map(Number);
  return m === 1 ? `${j - 1}-12` : `${j}-${String(m - 1).padStart(2, "0")}`;
}

/** Heute (Europe/Vienna) als JJJJ-MM-TT */
export function heute(jetzt = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit" }).format(jetzt);
}

/** TT.MM.JJJJ für Texte und Belege */
export function datumDe(s) {
  if (!istDatum(s)) return "";
  const [j, m, t] = String(s).split("-");
  return `${t}.${m}.${j}`;
}

/** Betrag deutsch mit zwei Nachkommastellen, z. B. 12.345,67 € */
export function euro(x) {
  if (!Number.isFinite(Number(x))) return "–";
  return `${Number(x).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function zahlDe(x, stellen = 0) {
  if (!Number.isFinite(Number(x))) return "–";
  return Number(x).toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });
}
