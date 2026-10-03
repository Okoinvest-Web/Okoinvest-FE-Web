// src/lib/plattform/eg/anreize.js
//
// WP6 „Portale“ – Anreize und Lastverschiebung (Fachkonzept 6.2 Nr. 5; Marktanalyse P1 Nr. 10): Zeitfenster aus dem Tarif
// der Gemeinschaft (TOU, z. B. „Mittagsstrom“), Meilensteine (Gamification ohne Vergleich mit anderen Mitgliedern) sowie
// Speicher- und Wallbox-Hinweise. Nur Empfehlungen – keine Steuerung in Phase 1.
// Reine Funktionen. Python-Spiegel: plattform/eg_portal_kern.py (Testvektoren eg/testdaten/portal/*.json).

import { fensterText } from "./empfehlung.js";
import { pfad } from "../../land/index.js";

const WT = ["so", "mo", "di", "mi", "do", "fr", "sa"];
const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
/** Zahl mit Dezimalkomma (ohne Tausenderpunkt; Python-Spiegel _de) */
const de = (x) => String(x).replace(".", ",");

/** Wochentag-Kürzel (mo…so) eines ISO-Datums */
export const wochentag = (datum) => WT[new Date(`${String(datum).slice(0, 10)}T12:00:00Z`).getUTCDay()] || "mo";

/** TOU-Zeitfenster des Tarifs, die an einem Tag gelten (leere Listen = immer) */
export function tarifZeitfensterAm(tarif, datum) {
  if (!tarif) return [];
  const m = Number(String(datum).slice(5, 7));
  const w = wochentag(datum);
  return (tarif.zeitfenster || [])
    .filter((z) => (!z.monate?.length || z.monate.includes(m)) && (!z.tage?.length || z.tage.includes(w)))
    .map((z) => ({ label: z.label || "Zeitfenster", von: z.von, bis: z.bis, bezugspreisCt: z.bezugspreisCt ?? null, vorteilCt: z.bezugspreisCt !== null && z.bezugspreisCt !== undefined ? r2((Number(tarif.bezugspreisCt) || 0) - Number(z.bezugspreisCt)) : 0 }));
}

export const MEILENSTEINE = [
  { id: "kwh100", art: "kwh", wert: 100, label: "100 kWh Gemeinschaftsstrom" },
  { id: "kwh500", art: "kwh", wert: 500, label: "500 kWh Gemeinschaftsstrom" },
  { id: "kwh1000", art: "kwh", wert: 1000, label: "1 MWh Gemeinschaftsstrom" },
  { id: "anteil25", art: "anteil", wert: 25, label: "Ein Viertel aus der Gemeinschaft" },
  { id: "anteil40", art: "anteil", wert: 40, label: "40 % aus der Gemeinschaft" },
];

/** Meilensteine eines Jahres (eigene Werte; keine Ranglisten ohne Einwilligung) */
export function meilensteine({ kwh = 0, anteilPct = 0 } = {}) {
  return MEILENSTEINE.map((m) => {
    const ist = m.art === "kwh" ? Number(kwh) || 0 : Number(anteilPct) || 0;
    return { id: m.id, label: m.label, erreicht: ist >= m.wert, fortschrittPct: Math.min(100, Math.round((ist / m.wert) * 100)) };
  });
}

/**
 * Empfehlungen für ein Mitglied – sortiert nach Priorität (1 = wichtig).
 * @param {{tarif?:object, heute:string, stunden?:{quelle:string, tage:object[]}, kennzahlen?:object, zaehlpunkte?:object[], anlagen?:object[], mehrfach?:object[]}} k
 */
export function anreizeFuer({ tarif = null, heute = "", stunden = null, kennzahlen = null, zaehlpunkte = [], anlagen = [], mehrfach = [] } = {}) {
  const aus = [];
  const tou = tarifZeitfensterAm(tarif, heute).filter((z) => z.vorteilCt > 0);
  const f = stunden?.tage?.[0]?.fenster?.[0] || null;
  if (f) aus.push({ id: "zeit", art: "zeit", prio: 1, titel: stunden.quelle === "prognose" ? `Viel Gemeinschaftsstrom: ${fensterText(f)}` : `Typisch sonnenreich: ${fensterText(f)}`, text: stunden.quelle === "prognose" ? "Laut Prognose deckt die Gemeinschaft in diesem Fenster am meisten. Waschmaschine, Geschirrspüler und Boiler jetzt einplanen." : "Für Ihre Gemeinschaft liegt noch keine Prognose vor. In diesem Fenster erzeugen Photovoltaikanlagen in der Regel am meisten." });
  for (const z of tou) aus.push({ id: `tou-${z.label}`, art: "tarif", prio: 1, titel: `${z.label}: ${z.von}–${z.bis} Uhr um ${de(z.vorteilCt)} ct günstiger`, text: "Laut Preisblatt Ihrer Gemeinschaft kostet Gemeinschaftsstrom in diesem Zeitfenster weniger." });
  const erzeugt = zaehlpunkte.some((z) => z.richtung === "erzeugung");
  const verbraucht = zaehlpunkte.some((z) => z.richtung !== "erzeugung");
  const speicher = anlagen.some((a) => a.art === "speicher" || Number(a.speicherKwh) > 0);
  const nutzung = kennzahlen?.nutzungPct;
  if (erzeugt && !speicher) aus.push({ id: "speicher", art: "speicher", prio: nutzung !== null && nutzung !== undefined && nutzung < 60 ? 2 : 3, titel: "Speicher prüfen", text: nutzung !== null && nutzung !== undefined && nutzung < 60 ? `Nur ${de(nutzung)} % Ihrer Erzeugung werden in der Gemeinschaft genutzt. Ein Speicher verschiebt Mittagsstrom in den Abend – fürs eigene Haus und für Ihre Nachbarn.` : "Ein Batteriespeicher erhöht Ihren Eigenverbrauch. Für Gemeinschaftsspeicher sind die Messregeln (§ 111 ElWG) noch offen.", link: pfad("/rechner") });
  if (verbraucht) aus.push({ id: "wallbox", art: "wallbox", prio: kennzahlen?.anteilPct !== null && kennzahlen?.anteilPct !== undefined && kennzahlen.anteilPct < 25 ? 2 : 3, titel: "E-Auto und Wärmepumpe mittags laufen lassen", text: "Ein Ladeplan für die Wallbox oder eine Zeitschaltung für Wärmepumpe und Boiler verschiebt Verbrauch in die Sonnenstunden – das erhöht Ihren Gemeinschaftsanteil ohne Komfortverlust." });
  for (const m of mehrfach) if (m.richtung === "erzeugung" && m.freiTf > 0 && m.anzahl > 0) aus.push({ id: `frei-${m.zaehlpunktId}`, art: "tf", prio: 2, titel: `${m.freiTf} % Ihrer Erzeugung sind frei`, text: "Sie können diesen Anteil einer weiteren Gemeinschaft zur Verfügung stellen (bis zu fünf Gemeinschaften je Zählpunkt).", link: "/portal/eg/mehrfach" });
  return aus.sort((a, b) => a.prio - b.prio);
}
