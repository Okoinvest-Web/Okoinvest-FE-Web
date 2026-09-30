// src/lib/plattform/hashkette.js
//
// Revisionssicheres Aktivitätsprotokoll: Hash-Kette über alle Einträge.
//
//   hash_n = SHA-256( prevHash_n + "\n" + inhalt_n )      mit prevHash_n = hash_(n-1)
//
// `inhalt` ist eine kanonische JSON-Darstellung der fachlichen Felder in fester Reihenfolge
// (id, am, nutzerId, aktion, objektArt, objektId, text, ip). Wer einen Eintrag nachträglich ändert,
// löscht, einfügt oder umsortiert, bricht die Kette ab dieser Stelle – verifyChain() meldet die
// erste Abweichung. Identisches Verfahren in Frappe: plattform/hashkette.py (Feld prev_hash/entry_hash).
//
// Werden alte Einträge archiviert (Demo: > 5000 Einträge), bleibt ein Anker { hash, anzahl, bis }
// stehen: die Prüfung beginnt dann beim Anker-Hash statt beim Startwert.
//
// Nur serverseitig (node:crypto).

import { createHash } from "node:crypto";

export const KETTE_START = "0".repeat(64);
export const KETTE_FELDER = ["id", "am", "nutzerId", "aktion", "objektArt", "objektId", "text", "ip"];

const wert = (v) => (v === undefined || v === null ? "" : String(v));

/** Kanonischer Inhalt eines Eintrags (unabhängig von zusätzlichen Feldern wie `nutzer`) */
export function eintragInhalt(e) {
  return JSON.stringify(KETTE_FELDER.map((k) => [k, wert(e?.[k])]));
}

export function eintragHash(prevHash, e) {
  return createHash("sha256").update(`${prevHash}\n${eintragInhalt(e)}`, "utf8").digest("hex");
}

/** Eintrag an die Kette anhängen: setzt prevHash und hash (verändert das Objekt) */
export function verketten(e, prevHash = KETTE_START) {
  e.prevHash = prevHash || KETTE_START;
  e.hash = eintragHash(e.prevHash, e);
  return e;
}

/**
 * Kette prüfen. `eintraege` in Einfügereihenfolge (älteste zuerst).
 * Liefert { ok, geprueft, fehler: [{ index, id, grund }], letzterHash, start }.
 * Mit `alleFehler: false` (Standard) endet die Prüfung beim ersten Bruch.
 */
export function verifyChain(eintraege = [], { anker = null, alleFehler = false } = {}) {
  const start = anker?.hash || KETTE_START;
  let prev = start;
  const fehler = [];
  let geprueft = 0;
  for (let i = 0; i < eintraege.length; i++) {
    const e = eintraege[i];
    geprueft++;
    let grund = "";
    if (!e?.hash) grund = "Eintrag ohne Hash (ungesichert eingefügt)";
    else if (e.prevHash !== prev) grund = "Verweis auf den Vorgänger passt nicht (Eintrag gelöscht, eingefügt oder umsortiert)";
    else if (eintragHash(prev, e) !== e.hash) grund = "Inhalt wurde nachträglich verändert";
    if (grund) {
      fehler.push({ index: i, id: e?.id || null, am: e?.am || null, grund });
      if (!alleFehler) break;
    }
    prev = e?.hash || prev;
  }
  return { ok: fehler.length === 0, geprueft, anzahl: eintraege.length, fehler, letzterHash: prev, start };
}

/** Python-Name wie in Frappe (plattform/hashkette.py) */
export const verify_chain = verifyChain;
