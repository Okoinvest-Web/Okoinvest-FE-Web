// src/lib/fakten/waehrung.js
//
// Währung je Land (Welle 2, Paket B1): DE/AT in Euro (€, ct), CH in Franken (CHF, Rp.).
// Formatierung ist DETERMINISTISCH (gleiche Ausgabe in Node und jedem Browser, keine
// Hydration-Abweichung): Euro wie bisher de-DE („1.234 €“, „4,8 ct/kWh“), Franken nach
// Schweizer Schreibweise mit Hochkomma als Tausendertrenner und Punkt als Dezimalzeichen
// („CHF 1’234“, „4.8 Rp./kWh“). Keine Umrechnung zwischen den Währungen.

export const WAEHRUNGEN = {
  EUR: { code: "EUR", symbol: "€", klein: "ct", kleinLang: "Cent", vorangestellt: false },
  CHF: { code: "CHF", symbol: "CHF", klein: "Rp.", kleinLang: "Rappen", vorangestellt: true },
};

const LAND_WAEHRUNG = { DE: "EUR", AT: "EUR", CH: "CHF" };

/** Währungscode eines Landes ("EUR" | "CHF"); unbekannt → EUR. Akzeptiert auch "EUR"/"CHF" selbst. */
export function waehrungFuer(landOderWaehrung = "DE") {
  const s = String(landOderWaehrung || "DE").toUpperCase();
  if (WAEHRUNGEN[s]) return s;
  return LAND_WAEHRUNG[s] || "EUR";
}

/** Währungsinfo { code, symbol, klein, kleinLang, vorangestellt } */
export const waehrungInfo = (landOderWaehrung) => WAEHRUNGEN[waehrungFuer(landOderWaehrung)];

/** Zahl nach Landesschreibweise (ohne Einheit); nicht endliche Zahlen → „–“ */
export function fmtZahl(n, landOderWaehrung = "DE", stellen = 0) {
  if (!Number.isFinite(n)) return "–";
  const opt = { minimumFractionDigits: stellen, maximumFractionDigits: stellen };
  if (waehrungFuer(landOderWaehrung) === "CHF") return n.toLocaleString("en-US", opt).replace(/,/g, "’");
  return n.toLocaleString("de-DE", opt);
}

/** Geldbetrag: „1.234 €“ bzw. „CHF 1’234“ */
export function fmtGeld(betrag, landOderWaehrung = "DE", { stellen = 0 } = {}) {
  if (!Number.isFinite(betrag)) return "–";
  const w = waehrungInfo(landOderWaehrung);
  const zahl = fmtZahl(stellen === 0 ? Math.round(betrag) : betrag, w.code, stellen);
  return w.vorangestellt ? `${w.symbol} ${zahl}` : `${zahl} ${w.symbol}`;
}

/** Kleinbetrag je kWh: „4,8 ct/kWh“ bzw. „4.8 Rp./kWh“ */
export function fmtKleinbetrag(wert, landOderWaehrung = "DE", { stellen = 1, proKwh = true } = {}) {
  if (!Number.isFinite(wert)) return "–";
  const w = waehrungInfo(landOderWaehrung);
  return `${fmtZahl(wert, w.code, stellen)} ${w.klein}${proKwh ? "/kWh" : ""}`;
}

/**
 * Einheit eines Fakts für die Anzeige im Land: „€/ha·a“ → „CHF/ha·a“, „ct/kWh“ → „Rp./kWh“.
 * Nur Darstellung – der Wert selbst muss im Register schon in Landeswährung stehen.
 */
export function einheitFuer(einheit, landOderWaehrung = "DE") {
  if (typeof einheit !== "string") return "";
  if (waehrungFuer(landOderWaehrung) !== "CHF") return einheit;
  return einheit.replace(/€/g, "CHF").replace(/\bct\b/g, "Rp.");
}

/** Nachkommastellen für eine Anzeige: ganze Zahl 0, sonst so viele wie nötig (höchstens 3) */
function stellenFuer(n) {
  if (Number.isInteger(n)) return 0;
  const t = String(Number(n.toFixed(3)));
  return Math.min(3, (t.split(".")[1] || "").length);
}

/**
 * Wert eines Fakts als Anzeigetext in der Schreibweise des Landes, mit Einheit:
 *   Zahl „2.800 €/ha·a“, Spanne „1.500–4.500 €/ha·a“, Anteil „23,4 %“, Text unverändert,
 *   Liste von Texten „MV, BB, NI“; Tabellen → „Tabelle“. Fehlender Fakt → „–“.
 * Einheiten mit € / ct werden für CH als CHF / Rp. gezeigt (einheitFuer).
 */
export function fmtFaktWert(fakt, land = fakt?.land) {
  if (!fakt || fakt.wert === null || fakt.wert === undefined) return "–";
  const l = land === "DACH" || !land ? "DE" : land;
  const roh = String(fakt.einheit || "");
  const anteil = /^Anteil/.test(roh);
  const rest = anteil ? roh.replace(/^Anteil\s*/, "").trim() : "";
  const einheit = anteil ? "" : einheitFuer(roh, l);
  const zahl = (n) => (anteil ? `${fmtZahl(n * 100, l, stellenFuer(n * 100))} %` : fmtZahl(n, l, stellenFuer(n)));
  const mitEinheit = (t) => [t, einheit, rest].filter(Boolean).join(" ").replace(" /", "/");
  const w = fakt.wert;
  if (typeof w === "number") return mitEinheit(zahl(w));
  if (typeof w === "string") return w;
  if (typeof w === "boolean") return w ? "ja" : "nein";
  if (Array.isArray(w)) return w.every((x) => typeof x === "string") ? w.join(", ") : "Tabelle";
  if (typeof w === "object" && Number.isFinite(w.min) && Number.isFinite(w.max)) return mitEinheit(`${zahl(w.min)}–${zahl(w.max)}`);
  return "Tabelle";
}
