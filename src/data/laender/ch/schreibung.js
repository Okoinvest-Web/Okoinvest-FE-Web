// Schweizer Schreibweise für Länderinhalte CH (Ländermodell, Inhalte CH – Gruppe 1).
// Nur für Texte, die auf einer Seite mit Land "CH" ausgegeben werden – nie für gemeinsame Seiten.

/** ß → ss (Schweizer Rechtschreibung); andere Werte unverändert. */
export const chText = (s) => (typeof s === "string" ? s.replace(/ß/g, "ss") : s);

/** Zahlenformat der Schweiz (Tausendertrennzeichen ’). */
const FORMAT = new Map();
export function chZahl(n, stellen = 0) {
  if (!FORMAT.has(stellen)) FORMAT.set(stellen, new Intl.NumberFormat("de-CH", { minimumFractionDigits: stellen, maximumFractionDigits: stellen }));
  return FORMAT.get(stellen).format(n);
}

/** Wendet chText rekursiv auf Zeichenketten in Objekten und Listen an (React-Elemente und Funktionen bleiben unberührt). */
export function chTexte(wert, land) {
  if (land !== "CH") return wert;
  if (typeof wert === "string") return chText(wert);
  if (Array.isArray(wert)) return wert.map((x) => chTexte(x, land));
  if (wert && typeof wert === "object" && !wert.$$typeof) {
    return Object.fromEntries(Object.entries(wert).map(([k, v]) => [k, typeof v === "function" ? v : chTexte(v, land)]));
  }
  return wert;
}
