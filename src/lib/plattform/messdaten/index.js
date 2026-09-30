// src/lib/plattform/messdaten/index.js
//
// Messdaten-Adapter (Zeitreihen der Anlagen). Nur serverseitig.
//   dienst.js     – Abfrage-API des Ingest-Dienstes Backend-Import/dienste/anlagen-daten (ANLAGEN_DATEN_URL + ANLAGEN_DATEN_TOKEN)
//   simulator.js  – deterministische, realistische Kurven im Demo-Betrieb (ohne MQTT/Datenbank)
//
// Auswahl: ANLAGEN_DATEN_URL gesetzt → Dienst. Sonst Simulator, wenn das Demo-Backend aktiv ist oder
// ANLAGEN_SIMULATOR=1 (Vorführung mit Frappe-Stammdaten). Sonst 503 – nie stille Fantasiewerte im Betrieb.
//
// WICHTIG: Aufrufer prüfen VORHER über das Backend (anlagen()/anlage()), ob der Nutzer die Anlage sehen darf,
// und übergeben das geprüfte Anlagen-Objekt. Diese Schicht kennt keine Nutzer.
//
// Operationen (a = Anlage aus dem Backend):
//   aktuell(a) → Messwert|null · summen(a,{von,bis}) · reihe(a,{von,bis,aufloesung: 15min|1h|1d|1mon})
//   zaehlerMonat(a,{monate}) · uebersicht(anlagen[]) → {[id]:{aktuell,heute,monat,jahr}} · live(a,{signal}) → ReadableStream (SSE)
//   erwartungKw(a, ms) → erwartete PV-Leistung (nur Simulator, sonst null)

import * as dienst from "./dienst";
import * as simulator from "./simulator";
import { backendName } from "../backend";
import { PlattformFehler } from "../fehler";

export function messdatenQuelle() {
  if (process.env.ANLAGEN_DATEN_URL) return "dienst";
  if (backendName() === "demo" || process.env.ANLAGEN_SIMULATOR === "1") return "simulator";
  return null;
}

export function messdaten() {
  const q = messdatenQuelle();
  if (q === "dienst") return dienst;
  if (q === "simulator") return simulator;
  throw new PlattformFehler(503, "Für Messdaten ist kein Dienst konfiguriert (ANLAGEN_DATEN_URL).");
}

export const AUFLOESUNGEN = {
  "15min": { label: "15 Minuten", maxTage: 7 },
  "1h": { label: "Stunde", maxTage: 62 },
  "1d": { label: "Tag", maxTage: 800 },
  "1mon": { label: "Monat", maxTage: 3700 },
};

/** Zeitraum und Auflösung aus Query-Parametern prüfen (422 bei Unsinn) */
export function zeitraumPruefen({ von, bis, aufloesung }) {
  const a = Object.hasOwn(AUFLOESUNGEN, aufloesung) ? aufloesung : "1h";
  const b = bis ? new Date(bis).getTime() : Date.now();
  const v = von ? new Date(von).getTime() : b - 86400e3;
  if (!Number.isFinite(v) || !Number.isFinite(b) || v >= b) throw new PlattformFehler(422, "Ungültiger Zeitraum.");
  if ((b - v) / 86400e3 > AUFLOESUNGEN[a].maxTage) throw new PlattformFehler(422, `Zeitraum zu lang für die Auflösung „${AUFLOESUNGEN[a].label}“.`);
  return { von: v, bis: b, aufloesung: a };
}
