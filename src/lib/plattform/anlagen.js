// src/lib/plattform/anlagen.js
//
// Anlagen & Monitoring – Stammlisten, MQTT-Vertrag und reine Rechenregeln (Ampel, Prognose, Kosten).
// Client- und serverseitig nutzbar (keine Node-Importe). Frappe: plattform/anlagen_kern.py (gleiche Werte),
// Ingest-Dienst: services/anlagen-daten/src/schema.js (gleicher MQTT-Vertrag).
//
// Grundsatz: MQTT-Werte sind MONITORING. Abrechnungsrelevant sind nur Messpunkte an einer geeichten
// Messstelle bzw. am Smart-Meter-Gateway (Monatswerte des Messstellenbetreibers).

import { ALLGEMEIN, BAUART, STROM, regionById } from "@/lib/invest/markt";

export const ANLAGE_TYPEN = {
  freiflaeche: { label: "Freiflächen-PV", kurz: "Freifläche", bauart: "sued" },
  dach: { label: "Gewerbedach-PV", kurz: "Gewerbedach", bauart: "ostWest" },
  carport: { label: "Solarcarport", kurz: "Carport", bauart: "ostWest" },
  agri: { label: "Agri-PV", kurz: "Agri-PV", bauart: "agriHoch" },
  speicher: { label: "Batteriespeicher", kurz: "Speicher", bauart: null },
};
export const ANLAGE_TYP_IDS = Object.keys(ANLAGE_TYPEN);

export const ANLAGE_STATUS = {
  planung: { label: "In Planung", ton: "neutral" },
  bau: { label: "Im Bau", ton: "info" },
  betrieb: { label: "In Betrieb", ton: "ok" },
  ruhend: { label: "Außer Betrieb", ton: "warn" },
  rueckbau: { label: "Rückgebaut", ton: "neutral" },
};
export const ANLAGE_STATUS_IDS = Object.keys(ANLAGE_STATUS);

/** Lastprofil der Verbraucher am Standort (Simulator, Plausibilisierung) */
export const LASTPROFILE = {
  gewerbe: "Gewerbe (Werktage tagsüber)",
  industrie: "Industrie (Mehrschicht)",
  landwirtschaft: "Landwirtschaft (Morgen- und Abendspitze)",
  keins: "Kein Verbrauch vor Ort (Volleinspeisung)",
};

export const KOMPONENTEN_ARTEN = {
  wechselrichter: "Wechselrichter",
  speicher: "Batteriespeicher",
  zaehler: "Zähler",
  datenlogger: "Datenlogger / Gateway",
  modul: "PV-Module",
  sonstiges: "Sonstiges",
};

export const MESSPUNKT_ARTEN = {
  erzeugung: { label: "Erzeugungszähler", register: [{ id: "2.8.0", label: "Erzeugung" }] },
  zweirichtung: { label: "Zweirichtungszähler (Netzverknüpfungspunkt)", register: [{ id: "1.8.0", label: "Bezug" }, { id: "2.8.0", label: "Einspeisung" }] },
  verbrauch: { label: "Verbrauchszähler", register: [{ id: "1.8.0", label: "Verbrauch" }] },
  speicher: { label: "Speicherzähler", register: [{ id: "1.8.0", label: "Laden" }, { id: "2.8.0", label: "Entladen" }] },
};

/** Messstelle: nur „geeicht“ (geeichte Messstelle / Smart-Meter-Gateway) darf abrechnungsrelevant sein */
export const MESSSTELLEN = {
  geeicht: "Geeichte Messstelle / Smart-Meter-Gateway",
  monitoring: "Monitoring (MQTT, nicht eichrechtskonform)",
};

export const STOERUNG_SCHWERE = {
  info: { label: "Info", stufe: 0, ton: "neutral" },
  niedrig: { label: "Niedrig", stufe: 1, ton: "info" },
  mittel: { label: "Mittel", stufe: 2, ton: "warn" },
  hoch: { label: "Hoch", stufe: 3, ton: "stoerung" },
  kritisch: { label: "Kritisch", stufe: 4, ton: "stoerung" },
};
export const STOERUNG_SCHWERE_IDS = Object.keys(STOERUNG_SCHWERE);

export const STOERUNG_STATUS = {
  offen: { label: "Offen", ton: "warn" },
  in_arbeit: { label: "In Arbeit", ton: "info" },
  behoben: { label: "Behoben", ton: "ok" },
};
export const STOERUNG_OFFEN = ["offen", "in_arbeit"];

/** Störungsregeln (Ingest-Dienst bzw. manuell) */
export const STOERUNG_REGELN = {
  offline: { label: "Keine Daten (offline)", schwere: "hoch" },
  minderleistung: { label: "Leistung deutlich unter Erwartung", schwere: "mittel" },
  fehlercode: { label: "Fehlercode am Wechselrichter", schwere: "hoch" },
  zaehler_rueckwaerts: { label: "Zählerstand rückwärts", schwere: "mittel" },
  zaehler_sprung: { label: "Unplausibler Zählersprung", schwere: "mittel" },
  manuell: { label: "Manuell erfasst", schwere: "mittel" },
};
export const STOERUNG_REGEL_IDS = Object.keys(STOERUNG_REGELN);

export const WARTUNG_ARTEN = {
  inspektion: "Inspektion",
  reinigung: "Modulreinigung",
  pruefung: "Wiederkehrende Prüfung (z. B. DGUV V3 / E-Check)",
  thermografie: "Thermografie",
  reparatur: "Reparatur / Tausch",
  software: "Firmware-Update",
};
export const WARTUNG_STATUS = { geplant: "Geplant", erledigt: "Erledigt", abgesagt: "Abgesagt" };

export const GERAET_STATUS = {
  wartet: { label: "Warte auf erste Nachricht", ton: "warn" },
  verbunden: { label: "Verbunden", ton: "ok" },
  gesperrt: { label: "Gesperrt", ton: "neutral" },
};

export const AMPEL = {
  laeuft: { label: "Läuft", ton: "ok", text: "Daten aktuell, keine offene Störung." },
  warnung: { label: "Warnung", ton: "warn", text: "Minderleistung oder Störung geringer Schwere." },
  stoerung: { label: "Störung", ton: "stoerung", text: "Offene Störung hoher Schwere oder Fehlercode." },
  offline: { label: "Offline", ton: "neutral", text: "Seit längerem keine Messwerte." },
};
export const AMPEL_IDS = Object.keys(AMPEL);

/** Schwellen (Ingest-Dienst: Umgebungsvariablen mit gleichen Standardwerten) */
export const GRENZWERTE = {
  offlineMinuten: 15, // keine Nachricht seit … → offline
  veraltetSekunden: 90, // Live-Anzeige markiert Werte als veraltet
  heartbeatSekunden: 60, // Gerät sendet mindestens so oft einen Heartbeat
  minderleistungQuote: 0.6, // Ist < 60 % der Erwartung …
  sonneMinAnteil: 0.2, // … bei Erwartung ≥ 20 % der Nennleistung (d. h. es scheint die Sonne)
  sprungFaktor: 1.5, // Zählerzuwachs > 1,5 × Nennleistung × Zeit → unplausibel
};

// ================================================================ MQTT-Vertrag

export const MQTT = {
  version: "v1",
  praefix: "oekoinvest",
  /** Kanäle unter oekoinvest/v1/<anlagenId>/<geraetId>/… */
  kanaele: {
    messwerte: "Messwerte (JSON, QoS 1), typ. alle 10–60 s",
    heartbeat: "Lebenszeichen (JSON {ts}), mindestens alle 60 s",
    status: "online/offline (retained, Last Will „offline“)",
  },
  standardPort: 8883,
};

export const mqttTopicBasis = (anlageId, geraetId) => `${MQTT.praefix}/${MQTT.version}/${anlageId}/${geraetId}`;
export const mqttBenutzer = (anlageId, geraetId) => `anl-${String(anlageId).toLowerCase()}-${String(geraetId).toLowerCase()}`;

/** Messgrößen im Payload (Einheit im Namen, SI-nah). `zaehler` = monoton steigender Zählerstand. */
export const MESSGROESSEN = {
  pv_leistung_kw: { label: "PV-Leistung", einheit: "kW", min: 0 },
  erzeugung_kwh: { label: "Erzeugung (Zählerstand)", einheit: "kWh", min: 0, zaehler: true },
  netzbezug_kwh: { label: "Netzbezug (Zählerstand)", einheit: "kWh", min: 0, zaehler: true },
  einspeisung_kwh: { label: "Einspeisung (Zählerstand)", einheit: "kWh", min: 0, zaehler: true },
  verbrauch_kw: { label: "Verbrauch vor Ort", einheit: "kW", min: 0 },
  speicher_soc_pct: { label: "Speicher-Ladestand", einheit: "%", min: 0, max: 100 },
  speicher_leistung_kw: { label: "Speicherleistung (+ Laden / − Entladen)", einheit: "kW" },
  wechselrichter_status: { label: "Wechselrichter-Status", werte: ["ok", "warnung", "stoerung", "aus"] },
  fehlercode: { label: "Fehlercode (Hersteller)", text: true },
};

/** Beispiel-Payload für den Assistenten „Gerät verbinden“ */
export function beispielPayload({ kwp = 100, speicher = false } = {}) {
  const p = Math.round(kwp * 0.62 * 10) / 10;
  return {
    v: 1,
    ts: "2026-09-30T10:15:00Z",
    pv_leistung_kw: p,
    erzeugung_kwh: 1284512.4,
    netzbezug_kwh: 20411.9,
    einspeisung_kwh: 402118.6,
    verbrauch_kw: Math.round(p * 0.7 * 10) / 10,
    ...(speicher ? { speicher_soc_pct: 64.5, speicher_leistung_kw: 12.4 } : {}),
    wechselrichter_status: "ok",
    fehlercode: null,
  };
}

// ================================================================ Region & Prognose

const DE_REGION = {
  "Schleswig-Holstein": "de-nord", Hamburg: "de-nord", Niedersachsen: "de-nord", Bremen: "de-nord", "Mecklenburg-Vorpommern": "de-nord",
  Brandenburg: "de-ost", Berlin: "de-ost", Sachsen: "de-ost", "Sachsen-Anhalt": "de-ost", Thüringen: "de-ost",
  "Nordrhein-Westfalen": "de-west", Hessen: "de-west", "Rheinland-Pfalz": "de-west", Saarland: "de-west",
  Bayern: "de-sued", "Baden-Württemberg": "de-sued",
};

/** Ertragsregion (markt.js REGIONEN) aus Land + Bundesland/Kanton */
export function regionFuer(land, bundesland) {
  if (land === "AT") return "at";
  if (land === "CH") return "ch";
  return DE_REGION[bundesland] || "de-sued";
}

/** Bauartfaktor je Anlagentyp (markt.js BAUART), Speicher ohne PV = 0 */
export function bauartFaktor(typ) {
  const b = ANLAGE_TYPEN[typ]?.bauart;
  return b ? BAUART[b]?.faktor ?? 1 : 0;
}

/** Erwartete Jahreserzeugung in kWh (Region × kWp × Bauart × Alterung) */
export function prognoseJahrKwh(a, jahr = new Date().getFullYear()) {
  const kwp = Number(a?.kwp) || 0;
  if (!kwp) return 0;
  const region = regionById(a.regionId || regionFuer(a.land, a.bundesland));
  const ibnJahr = Number(String(a.inbetriebnahme || "").slice(0, 4)) || jahr;
  const alter = Math.max(0, jahr - ibnJahr);
  return kwp * region.ertrag * bauartFaktor(a.typ) * (1 - 0.005) ** alter;
}

/** Erwartete Erzeugung je Monat (0–11) in kWh */
export function prognoseMonatKwh(a, monat, jahr) {
  return prognoseJahrKwh(a, jahr) * (ALLGEMEIN.pvMonatsanteile?.[monat] ?? 1 / 12);
}

/** Netzstrompreis Gewerbe (Vergleich „Ersparnis ggü. Netzstrom“), ct/kWh netto */
export const NETZSTROM_CT = Math.round(STROM.bestandteile.reduce((s, b) => s + b.ct, 0) * 100) / 100;
export const CO2_KG_PRO_KWH = ALLGEMEIN.co2KgProKwh;

/**
 * Kosten des Kunden aus dem Contracting-Vertrag für einen Zeitraum:
 * PV-Strom vor Ort (Eigenverbrauch) × Arbeitspreis + Grundgebühr je Monat.
 * Ersparnis = Eigenverbrauch × (Netzstrompreis − Arbeitspreis) − Grundgebühr.
 */
export function vertragKosten(vertrag, { eigenverbrauchKwh = 0, monate = 1 } = {}) {
  if (!vertrag) return null;
  const arbeit = (eigenverbrauchKwh * (Number(vertrag.strompreisCt) || 0)) / 100;
  const grund = (Number(vertrag.grundgebuehrMonat) || 0) * monate;
  const netz = (eigenverbrauchKwh * NETZSTROM_CT) / 100;
  return { arbeitEur: arbeit, grundEur: grund, gesamtEur: arbeit + grund, netzEur: netz, ersparnisEur: netz - arbeit - grund };
}

// ================================================================ Ampel

/**
 * Ampel einer Anlage aus Live-Wert und offenen Störungen.
 * live: { ts, pvKw, wechselrichterStatus, fehlercode } | null, erwartetKw: Erwartung jetzt (kW)
 */
export function ampelBerechnen({ anlage, live, stoerungen = [], erwartetKw = null, jetzt = Date.now() }) {
  if (anlage && anlage.status !== "betrieb") return { id: "offline", grund: ANLAGE_STATUS[anlage.status]?.label || "Nicht in Betrieb" };
  const offen = stoerungen.filter((s) => STOERUNG_OFFEN.includes(s.status));
  const maxStufe = offen.reduce((m, s) => Math.max(m, STOERUNG_SCHWERE[s.schwere]?.stufe ?? 0), -1);
  const alterMin = live?.ts ? (jetzt - new Date(live.ts).getTime()) / 60000 : Infinity;
  if (!Number.isFinite(alterMin) || alterMin > GRENZWERTE.offlineMinuten) return { id: "offline", grund: live?.ts ? "Keine Messwerte seit über 15 Minuten" : "Noch keine Messwerte" };
  if (maxStufe >= 3 || live?.wechselrichterStatus === "stoerung" || live?.fehlercode) return { id: "stoerung", grund: live?.fehlercode ? `Fehlercode ${live.fehlercode}` : offen[0]?.titel || "Offene Störung" };
  const kwp = Number(anlage?.kwp) || 0;
  const sonne = erwartetKw != null && kwp > 0 && erwartetKw >= kwp * GRENZWERTE.sonneMinAnteil;
  if (sonne && Number(live?.pvKw) < erwartetKw * GRENZWERTE.minderleistungQuote) return { id: "warnung", grund: "Leistung deutlich unter Erwartung" };
  if (maxStufe >= 1 || live?.wechselrichterStatus === "warnung") return { id: "warnung", grund: offen[0]?.titel || "Warnung am Wechselrichter" };
  return { id: "laeuft", grund: "Alles in Ordnung" };
}

/** Kennzahlen aus Energiesummen */
export function quoten({ erzeugungKwh = 0, verbrauchKwh = 0, eigenverbrauchKwh = 0 } = {}) {
  return {
    eigenverbrauchsquote: erzeugungKwh > 0 ? Math.min(1, eigenverbrauchKwh / erzeugungKwh) : null,
    autarkie: verbrauchKwh > 0 ? Math.min(1, eigenverbrauchKwh / verbrauchKwh) : null,
  };
}

// ================================================================ Anzeige

export const kw = (v, stellen) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "–";
  const abs = Math.abs(n);
  if (abs >= 1000) return `${(n / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2, minimumFractionDigits: abs >= 10000 ? 1 : 2 })} MW`;
  return `${n.toLocaleString("de-DE", { maximumFractionDigits: stellen ?? (abs < 10 ? 1 : 0) })} kW`;
};

export const kwh = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "–";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toLocaleString("de-DE", { maximumFractionDigits: 2 })} GWh`;
  if (abs >= 1e4) return `${(n / 1e3).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MWh`;
  return `${n.toLocaleString("de-DE", { maximumFractionDigits: abs < 100 ? 1 : 0 })} kWh`;
};

export const tonnen = (kg) => {
  const n = Number(kg);
  if (!Number.isFinite(n)) return "–";
  return n >= 1000 ? `${(n / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} t` : `${Math.round(n).toLocaleString("de-DE")} kg`;
};

export const kwpText = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "–";
  return n >= 1000 ? `${(n / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} MWp` : `${n.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kWp`;
};
