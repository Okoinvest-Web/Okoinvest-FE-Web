// src/lib/plattform/server/rateLimit.js
//
// Einfaches Rate-Limit im Arbeitsspeicher (gleitendes Fenster je Schlüssel).
// Reicht für einen einzelnen Node-Prozess; bei mehreren Instanzen zusätzlich
// am Reverse-Proxy (nginx limit_req) begrenzen – siehe docs/PLATTFORM.md.

import { PlattformFehler } from "../fehler";

const speicher = (globalThis.__oiRateLimit ||= new Map());

/** Wirft 429, wenn `schluessel` mehr als `max` Treffer im Fenster hat */
export function rateLimit(schluessel, max, fensterMs) {
  const jetzt = Date.now();
  const liste = (speicher.get(schluessel) || []).filter((t) => jetzt - t < fensterMs);
  if (liste.length >= max) {
    speicher.set(schluessel, liste);
    throw new PlattformFehler(429, "Zu viele Versuche in kurzer Zeit – bitte warten Sie einige Minuten.");
  }
  liste.push(jetzt);
  speicher.set(schluessel, liste);

  // gelegentlich aufräumen
  if (speicher.size > 5000) {
    for (const [k, v] of speicher) if (!v.length || jetzt - v[v.length - 1] > 3600e3) speicher.delete(k);
  }
}

/** Grenzen je Aktion: [max, Fenster in ms] */
export const GRENZEN = {
  login: [10, 15 * 60e3],
  loginEmail: [8, 15 * 60e3],
  registrieren: [5, 60 * 60e3],
  anfrage: [10, 60 * 60e3],
  passwort: [5, 60 * 60e3],
  upload: [60, 60 * 60e3],
  nachricht: [120, 60 * 60e3],
  // Login, Sicherheit & Teams
  magicLink: [5, 60 * 60e3],
  zweiFaktor: [10, 15 * 60e3],
  einladung: [30, 60 * 60e3],
  export: [10, 60 * 60e3],
};

/**
 * In der Entwicklung sind die Grenzen 10-fach gelockert (wiederholte Testläufe),
 * über PLATTFORM_RATE_FAKTOR einstellbar. In Produktion gilt immer Faktor 1.
 */
export function grenze(name) {
  const [max, fenster] = GRENZEN[name];
  const faktor = process.env.NODE_ENV !== "production" ? Number(process.env.PLATTFORM_RATE_FAKTOR) || 10 : 1;
  return [Math.max(1, Math.round(max * faktor)), fenster];
}
