// src/lib/plattform/messdaten/dienst.js
//
// Adapter zur Abfrage-API des Ingest-Dienstes `services/anlagen-daten` (TimescaleDB). Nur serverseitig.
//   ANLAGEN_DATEN_URL    Basis-URL des Dienstes, z. B. https://anlagen-daten.intern:8443 (TLS wird geprüft;
//                        eigene CA über NODE_EXTRA_CA_CERTS – eine Abschaltung der Zertifikatsprüfung gibt es nicht)
//   ANLAGEN_DATEN_TOKEN  Service-Token (Bearer), mindestens 32 Zeichen – nie im Browser, nie im Log
//
// Die Rechteprüfung (welche Anlagen darf der Nutzer sehen?) passiert VOR jedem Aufruf in messdaten/auswertung.js
// bzw. den API-Routen – der Dienst kennt keine Nutzer, nur das Service-Token.
// Schnittstelle identisch zu simulator.js.

import { PlattformFehler } from "../fehler";

export const name = "dienst";

const TIMEOUT_MS = 8000;

function konfig() {
  const url = String(process.env.ANLAGEN_DATEN_URL || "").replace(/\/$/, "");
  const token = process.env.ANLAGEN_DATEN_TOKEN || "";
  if (!url || token.length < 32) throw new PlattformFehler(503, "Der Messdaten-Dienst ist nicht konfiguriert (ANLAGEN_DATEN_URL, ANLAGEN_DATEN_TOKEN).");
  if (process.env.NODE_ENV === "production" && !url.startsWith("https://")) throw new PlattformFehler(503, "Der Messdaten-Dienst muss per HTTPS angebunden sein.");
  return { url, token };
}

const id = (a) => encodeURIComponent(String(a?.id || a || ""));
const iso = (t) => new Date(t).toISOString();

async function holen(pfad, { signal, roh = false } = {}) {
  const { url, token } = konfig();
  let res;
  try {
    res = await fetch(url + pfad, {
      headers: { Authorization: `Bearer ${token}`, Accept: roh ? "text/event-stream" : "application/json" },
      cache: "no-store",
      signal: signal || AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    console.error("[messdaten] Dienst nicht erreichbar:", e?.name || "Fehler");
    throw new PlattformFehler(502, "Der Messdaten-Dienst ist vorübergehend nicht erreichbar.");
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error(`[messdaten] Dienst antwortet HTTP ${res.status} für ${pfad.split("?")[0]}`);
    throw new PlattformFehler(502, "Der Messdaten-Dienst ist vorübergehend nicht erreichbar.");
  }
  return roh ? res : res.json();
}

export const aktuell = (a) => holen(`/v1/anlagen/${id(a)}/aktuell`);

export const summen = (a, { von, bis } = {}) => holen(`/v1/anlagen/${id(a)}/summen?von=${iso(von)}&bis=${iso(bis)}`);

export async function reihe(a, { von, bis, aufloesung = "1h" } = {}) {
  const r = await holen(`/v1/anlagen/${id(a)}/reihe?von=${iso(von)}&bis=${iso(bis)}&aufloesung=${encodeURIComponent(aufloesung)}`);
  return r || { aufloesung, punkte: [] };
}

export async function zaehlerMonat(a, { monate = 13 } = {}) {
  return (await holen(`/v1/anlagen/${id(a)}/zaehler?monate=${Number(monate) || 13}`)) || [];
}

/** Viele Anlagen in einem Aufruf: { [id]: { aktuell, heute, monat, jahr } } */
export async function uebersicht(anlagen) {
  if (!anlagen.length) return {};
  const ids = anlagen.map((a) => id(a)).join(",");
  return (await holen(`/v1/uebersicht?anlagen=${ids}&tz=Europe%2FVienna`)) || {};
}

/** Erwartung kommt nicht aus dem Dienst – die Website rechnet sie aus den Stammdaten (siehe auswertung.js) */
export const erwartungKw = () => null;

/** Live-Strom: Proxy auf die SSE-Route des Dienstes (Abbruch des Browsers bricht auch den Dienst-Aufruf ab) */
export async function live(a, { signal } = {}) {
  const res = await holen(`/v1/anlagen/${id(a)}/live`, { signal, roh: true });
  if (!res?.body) throw new PlattformFehler(404, "Keine Live-Daten für diese Anlage.");
  return res.body;
}
