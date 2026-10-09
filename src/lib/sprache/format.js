// src/lib/sprache/format.js – Zahlen und Daten je Sprache
//   fmtZahl(1234.5, 1, "de") → "1.234,5"     fmtZahl(1234.5, 1, "en") → "1,234.5"
// Einheiten bleiben gleich (€, ct/kWh, MWp).

const LOCALE = { de: "de-DE", en: "en-GB" };

export function fmtZahl(n, stellen = 0, sprache = "de") {
  const x = Number(n);
  if (!Number.isFinite(x)) return "–";
  return x.toLocaleString(LOCALE[sprache] || LOCALE.de, { minimumFractionDigits: stellen, maximumFractionDigits: stellen });
}

const MONATE_EN = {
  Januar: "January", Februar: "February", März: "March", April: "April", Mai: "May", Juni: "June",
  Juli: "July", August: "August", September: "September", Oktober: "October", November: "November", Dezember: "December",
};

/** Deutsche Datumsangaben ins Englische übertragen ("3. Oktober 2026" → "3 October 2026"). */
export function datumText(text = "", sprache = "de") {
  if (sprache !== "en") return String(text);
  return String(text)
    .replace(/(\d{1,2})\.\s(?=[A-ZÄÖÜ])/g, "$1 ")
    .replace(/Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember/g, (m) => MONATE_EN[m]);
}

/** Eurobetrag (gerundet) je Sprache: "1.234 €" · "€1,234". */
export function fmtEuro(n, sprache = "de") {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) return "–";
  return sprache === "en" ? `€${fmtZahl(x, 0, "en")}` : `${fmtZahl(x, 0, "de")} €`;
}
