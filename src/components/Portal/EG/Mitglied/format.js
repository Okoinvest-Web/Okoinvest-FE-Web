// Formatierung für das Mitgliederportal Energiegemeinschaft (WP6) – client- und serverseitig.

const zahl = (x, stellen = 0) => (x === null || x === undefined || !Number.isFinite(Number(x)) ? "–" : Number(x).toLocaleString("de-AT", { minimumFractionDigits: stellen, maximumFractionDigits: stellen }));

export const kwh = (x) => {
  const n = Number(x);
  if (!Number.isFinite(n)) return "–";
  if (Math.abs(n) >= 10000) return `${zahl(n / 1000, 1)} MWh`;
  return `${zahl(n, Math.abs(n) < 10 ? 1 : 0)} kWh`;
};
export const eur = (x) => (x === null || x === undefined ? "–" : `${zahl(x, 2)} €`);
export const eur0 = (x) => (x === null || x === undefined ? "–" : `${zahl(Math.round(Number(x)), 0)} €`);
export const ct = (x) => (x === null || x === undefined ? "–" : `${zahl(x, Number(x) % 1 ? 2 : 0)} ct`);
export const pct = (x, stellen = 0) => (x === null || x === undefined ? "–" : `${zahl(x, stellen)} %`);
export const kg = (x) => (x === null || x === undefined ? "–" : `${zahl(x, 0)} kg`);
export const datumDe = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "–");
export const zpKurz = (zp) => (zp ? `…${String(zp).slice(-6)}` : "–");
/** Zählpunktnummer lesbar gruppiert: AT 003000 04910 000… */
export const zpLang = (zp) => {
  const s = String(zp || "");
  return s.length === 33 ? `${s.slice(0, 2)} ${s.slice(2, 8)} ${s.slice(8, 13)} ${s.slice(13, 23)} ${s.slice(23)}` : s;
};
export const tageText = (t) => (t === 0 ? "heute" : t === 1 ? "morgen" : t < 0 ? `seit ${-t} ${-t === 1 ? "Tag" : "Tagen"} abgelaufen` : `noch ${t} Tage`);
export { zahl };
