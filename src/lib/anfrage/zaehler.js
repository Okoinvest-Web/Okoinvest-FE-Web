// src/lib/anfrage/zaehler.js
//
// Server-Zähler für Anfragen OHNE Kennung (Paket C, Welle 1; Masterplan Abschnitt 5 Punkt 6).
// Zählt unabhängig von Cookie-Einwilligung und Google Analytics, weil nichts Personenbezogenes entsteht:
// gezählt wird nur je Tag × Ereignis × Anfragetyp × Land × Kanal. KEINE IP, KEINE E-Mail, KEINE Vorgangs-ID,
// keine Seiten-URL, kein Zeitstempel feiner als der Tag.
//
// Ausgabe: (1) Summen im Arbeitsspeicher des Prozesses (zaehlerStand) und (2) je Ereignis eine
// strukturierte Logzeile „[anfrage-zaehler] {…}“, die das Hosting-Log aufbewahrt und auswertbar macht.
// Dauerhaft gezählt wird zusätzlich im Backend (Demo: db.anfrageZaehler; Frappe: Logger „oekoinvest_anfrage_zaehler“).

import { landNormal } from "./laender.js";

export const ZAEHLER_EREIGNISSE = Object.freeze(["versuch", "angelegt", "abgelehnt", "honeypot"]);
// Kanäle wie in src/lib/herkunft.js (kanal()); Welle 2: „Gruppe“ und „Partner“ (src/lib/gruppe/kanal.js, Paket GRP)
const KANAELE = new Set(["Direkt", "Suchmaschine", "KI-Assistent", "Gruppe", "Partner", "Anzeige", "Social Media", "E-Mail", "Offline/QR", "Kampagne", "Verweis"]);
const TYP_MUSTER = /^[a-z_]{2,30}$/;

const summen = new Map();

/** Tag in Europe/Vienna (gleiche Zeitzone wie das Backoffice), Format JJJJ-MM-TT */
export const tagHeute = (d = new Date()) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Vienna" });

/** Nur grobe, feste Merkmale – alles Unbekannte wird zu "?" */
export function zaehlerSchluessel({ ereignis, typ, land, kanal, tag = tagHeute() }) {
  return {
    tag,
    ereignis: ZAEHLER_EREIGNISSE.includes(ereignis) ? ereignis : "?",
    typ: typeof typ === "string" && TYP_MUSTER.test(typ) ? typ : "?",
    land: landNormal(land) || "?",
    kanal: typeof kanal === "string" && KANAELE.has(kanal) ? kanal : "?",
  };
}

/** Zählt ein Ereignis. Darf nie werfen (Messung stört keine Anfrage). */
export function anfrageZaehlen(merkmale, { log = true } = {}) {
  try {
    const s = zaehlerSchluessel(merkmale || {});
    const k = `${s.tag}|${s.ereignis}|${s.typ}|${s.land}|${s.kanal}`;
    summen.set(k, (summen.get(k) || 0) + 1);
    if (log) console.info(`[anfrage-zaehler] ${JSON.stringify(s)}`);
    return s;
  } catch {
    return null;
  }
}

/** Aktuelle Summen dieses Prozesses (für Tests und eine spätere Auswertungsroute) */
export function zaehlerStand() {
  return Object.fromEntries(summen);
}

export function _zaehlerLeeren() {
  summen.clear();
}
