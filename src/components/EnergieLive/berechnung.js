// Reine Rechen- und Formatierhilfen für das Strommarkt-Dashboard.
// Ohne "use client": wird von Server- und Client-Komponenten genutzt.

export const TZ = "Europe/Berlin";
export const STUNDE = 3600000;

const datumFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ });
const uhrFmt = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const tagFmt = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
const kurzTagFmt = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: TZ });

/** YYYY-MM-DD in deutscher Zeit */
export const berlinTag = (t) => datumFmt.format(new Date(t));
/** hh:mm in deutscher Zeit */
export const uhr = (t) => uhrFmt.format(new Date(t));
/** „Sonntag, 13. September" */
export const tagLang = (t) => tagFmt.format(new Date(t));
/** „So., 13.09." */
export const tagKurz = (t) => kurzTagFmt.format(new Date(t));

/** Zahl deutsch formatiert, echtes Minuszeichen */
export const zahl = (n, stellen = 1) =>
  n == null || Number.isNaN(n)
    ? "–"
    : n.toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen }).replace("-", "−");

/** €/MWh -> „12,3" (ct/kWh) */
export const ct = (eurMwh, stellen = 1) => (eurMwh == null ? "–" : zahl(eurMwh / 10, stellen));
/** MW -> „12,3" (GW) */
export const gw = (mw, stellen = 1) => (mw == null ? "–" : zahl(mw / 1000, stellen));

/** Uhrzeit-Spanne „13:00–16:00 Uhr" */
export const spanne = (von, bis) => `${uhr(von)}–${uhr(bis)} Uhr`;

/** Kennzahlen eines Tages */
function tagesStat(punkte, schrittMs) {
  if (!punkte.length) return null;
  let min = punkte[0];
  let max = punkte[0];
  let summe = 0;
  let negativ = 0;
  for (const p of punkte) {
    if (p.eurMwh < min.eurMwh) min = p;
    if (p.eurMwh > max.eurMwh) max = p;
    if (p.eurMwh < 0) negativ++;
    summe += p.eurMwh;
  }
  return {
    punkte,
    datum: berlinTag(punkte[0].t),
    start: punkte[0].t,
    ende: punkte[punkte.length - 1].t + schrittMs,
    avg: summe / punkte.length,
    min,
    max,
    negativStunden: (negativ * schrittMs) / STUNDE,
    vollstaendig: punkte.length * schrittMs >= 23 * STUNDE,
  };
}

/**
 * Preise nach Tagen gruppieren.
 * Rückgabe: { schrittMs, aufloesungMin, aktuell, heute, morgen, zukunft }
 */
export function preisTage(preis, jetzt) {
  const punkte = (preis?.punkte || []).filter((p) => typeof p.eurMwh === "number").sort((a, b) => a.t - b.t);
  const aufloesungMin = preis?.aufloesungMin || 60;
  const schrittMs = aufloesungMin * 60000;
  const heuteStr = berlinTag(jetzt);

  const gruppen = new Map();
  for (const p of punkte) {
    const k = berlinTag(p.t);
    if (!gruppen.has(k)) gruppen.set(k, []);
    gruppen.get(k).push(p);
  }
  const heute = gruppen.has(heuteStr) ? tagesStat(gruppen.get(heuteStr), schrittMs) : null;
  const spaeterKey = [...gruppen.keys()].filter((k) => k > heuteStr).sort()[0];
  const morgen = spaeterKey ? tagesStat(gruppen.get(spaeterKey), schrittMs) : null;
  const aktuell = punkte.find((p) => p.t <= jetzt && jetzt < p.t + schrittMs) || null;
  // Ab der laufenden Viertelstunde bis zum Ende der veröffentlichten Preise
  const zukunft = punkte.filter((p) => p.t + schrittMs > jetzt);

  return { schrittMs, aufloesungMin, aktuell, heute, morgen, zukunft, quelle: preis?.quelle || null };
}

/**
 * Günstigstes und teuerstes zusammenhängendes Zeitfenster.
 * dauerMin: Fensterlänge; Rückgabe { guenstig, teuer } mit { start, ende, avg } oder null.
 */
export function zeitfenster(punkte, dauerMin, schrittMs) {
  const n = Math.max(1, Math.round((dauerMin * 60000) / schrittMs));
  if (!punkte || punkte.length < n) return { guenstig: null, teuer: null };
  let guenstig = null;
  let teuer = null;
  let summe = 0;
  for (let i = 0; i < punkte.length; i++) {
    summe += punkte[i].eurMwh;
    if (i >= n) summe -= punkte[i - n].eurMwh;
    if (i < n - 1) continue;
    const a = i - n + 1;
    // Nur lückenlose Fenster zählen
    if (punkte[i].t - punkte[a].t !== (n - 1) * schrittMs) continue;
    const avg = summe / n;
    const f = { start: punkte[a].t, ende: punkte[i].t + schrittMs, avg };
    if (!guenstig || avg < guenstig.avg) guenstig = f;
    if (!teuer || avg > teuer.avg) teuer = f;
  }
  return { guenstig, teuer };
}

/** Stundenmittel für Tabellen und Mini-Balken */
export function stundenmittel(punkte) {
  const map = new Map();
  for (const p of punkte) {
    const s = Math.floor(p.t / STUNDE) * STUNDE;
    if (!map.has(s)) map.set(s, []);
    map.get(s).push(p.eurMwh);
  }
  return [...map.entries()].map(([t, w]) => ({
    t,
    avg: w.reduce((a, b) => a + b, 0) / w.length,
    min: Math.min(...w),
    max: Math.max(...w),
  }));
}

/** „schöne" Achsenschritte */
export function achse(lo, hi, ziel = 5) {
  if (!(hi > lo)) hi = lo + 1;
  const roh = (hi - lo) / ziel;
  const mag = 10 ** Math.floor(Math.log10(roh));
  const schritt = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= roh) || 10 * mag;
  const von = Math.floor(lo / schritt) * schritt;
  const bis = Math.ceil(hi / schritt) * schritt;
  const ticks = [];
  for (let v = von; v <= bis + schritt / 2; v += schritt) ticks.push(Math.round(v * 1000) / 1000);
  return { von, bis, ticks, schritt };
}

/* ------------------------------------------------------------------ */
/* Stromerzeugung                                                      */
/* ------------------------------------------------------------------ */

// Farbpalette mit dem Validator des dataviz-Skills geprüft (Hell, Fläche #ffffff):
// Stapelnachbarn CVD ΔE ≥ 17,3, Normalsicht ΔE ≥ 22,8. Einige helle Töne liegen
// unter 3:1 Kontrast – deshalb immer Legende, Tooltip und Tabellenansicht.
// Reihenfolge = Stapel von unten nach oben.
export const QUELLEN = [
  { key: "braunkohle", name: "Braunkohle", farbe: "#a0561c", ee: false },
  { key: "steinkohle", name: "Steinkohle", farbe: "#4a3aa7", ee: false },
  { key: "gas", name: "Erdgas", farbe: "#f29a4a", ee: false },
  { key: "sonstige", name: "Sonstige", farbe: "#c4cad5", ee: false, text: "#151a24" },
  { key: "biomasse", name: "Biomasse", farbe: "#2d7a1f", ee: true },
  { key: "wasser", name: "Wasserkraft", farbe: "#1aa7c4", ee: true },
  { key: "windOffshore", name: "Wind auf See", farbe: "#1e4fa3", ee: true },
  { key: "windOnshore", name: "Wind an Land", farbe: "#5aa3ec", ee: true },
  { key: "solar", name: "Solar", farbe: "#eda100", ee: true },
];

/** Hell genug für dunklen Text? (relative Luminanz) */
export function textAuf(hex) {
  const n = parseInt(hex.slice(1), 16);
  const kanal = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * kanal((n >> 16) & 255) + 0.7152 * kanal((n >> 8) & 255) + 0.0722 * kanal(n & 255);
  return l > 0.3 ? "#151a24" : "#ffffff";
}

/**
 * Letzte `stunden` Stunden der Erzeugung als Zeilen.
 * Rückgabe null, wenn keine verwertbaren Daten vorliegen.
 */
export function erzeugungsVerlauf(erzeugung, stunden = 24) {
  const zeiten = erzeugung?.zeiten || [];
  const s = erzeugung?.serien || {};
  let ende = -1;
  for (let i = zeiten.length - 1; i >= 0; i--) {
    if (s.last?.[i] != null && s.solar?.[i] != null) {
      ende = i;
      break;
    }
  }
  if (ende < 0) return null;
  const grenze = zeiten[ende] - stunden * STUNDE;
  const zeilen = [];
  for (let i = 0; i <= ende; i++) {
    if (zeiten[i] < grenze) continue;
    const z = { t: zeiten[i], last: s.last?.[i] ?? null, eeAnteil: s.eeAnteil?.[i] ?? null };
    let summe = 0;
    for (const q of QUELLEN) {
      const v = Math.max(0, Number(s[q.key]?.[i]) || 0);
      z[q.key] = v;
      summe += v;
    }
    z.summe = summe;
    if (summe > 0) zeilen.push(z);
  }
  return zeilen.length >= 2 ? zeilen : null;
}
