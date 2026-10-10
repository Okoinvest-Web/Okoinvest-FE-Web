// src/lib/bericht/zaehler.js
//
// Server-Zähler für den Bericht-Baustein OHNE Kennung (Welle 2, Paket B4) – wie src/lib/anfrage/zaehler.js,
// aber in einem eigenen Schlüsselraum. Gezählt wird nur Tag × Ereignis × Rechner × Land.
// KEINE IP, KEINE E-Mail, KEIN Token, keine Prüf-ID, kein Zeitstempel feiner als der Tag.
// Ausgabe: Summen im Arbeitsspeicher (berichtZaehlerStand) und je Ereignis eine Logzeile „[bericht-zaehler] {…}“.

import { landNormal } from "@/lib/anfrage/laender";
import { tagHeute } from "@/lib/anfrage/zaehler";

export const BERICHT_EREIGNISSE = Object.freeze(["angefordert", "bestaetigt", "abgelehnt"]);
const RECHNER = new Set(["pacht", "pachtangebot", "flaechencheck", "kommune", "ratsvorlage" /* Paket B8 */]);

const summen = (globalThis.__oiBerichtZaehler ||= new Map());

export function berichtZaehlerSchluessel({ ereignis, rechner, land, tag = tagHeute() }) {
  return {
    tag,
    ereignis: BERICHT_EREIGNISSE.includes(ereignis) ? ereignis : "?",
    rechner: typeof rechner === "string" && RECHNER.has(rechner) ? rechner : "?",
    land: landNormal(land) || "?",
  };
}

/** Zählt ein Ereignis. Wirft nie (Messung stört keine Anfrage). */
export function berichtZaehlen(merkmale, { log = true } = {}) {
  try {
    const s = berichtZaehlerSchluessel(merkmale || {});
    const k = `bericht|${s.tag}|${s.ereignis}|${s.rechner}|${s.land}`;
    summen.set(k, (summen.get(k) || 0) + 1);
    if (log) console.info(`[bericht-zaehler] ${JSON.stringify(s)}`);
    return s;
  } catch {
    return null;
  }
}

export const berichtZaehlerStand = () => Object.fromEntries(summen);
export const _berichtZaehlerLeeren = () => summen.clear();
