// src/lib/fakten/pruefen.js
//
// Gate-Logik des Faktenregisters (Welle 2, Paket B1) – genutzt von qa/fakten-check.mjs
// (Schritt in npm run verify) und den Tests. Reine Funktion, keine Ein-/Ausgabe.
//
// ROT (Gate)   – Vertragsfehler (schema.js), Dubletten, Fakten ohne quelle oder abruf,
//                abgelaufene Fakten der Klasse A (Masterplan H7: nie als aktuell zeigen).
// WARNUNG      – abgelaufene Fakten der Klassen B/C, status "zu_pruefen", Quelle ohne URL.

import { faktValidieren, istAbgelaufen, isoHeute } from "./schema.js";

const kurz = (f) => ({ id: f.id, land: f.land, klasse: f.klasse, status: f.status, gueltigBis: f.gueltigBis ?? null, herkunft: f.herkunft ?? null });

/**
 * @param {object[]} liste Fakten (z. B. alleFakten())
 * @param {{ heute?: Date|string }} [optionen]
 */
export function pruefeFakten(liste, { heute = new Date() } = {}) {
  const stichtag = isoHeute(heute);
  const vertragsfehler = [];
  const hinweise = [];
  const gesehen = new Map();
  for (const f of liste) {
    const v = faktValidieren(f);
    vertragsfehler.push(...v.fehler);
    hinweise.push(...v.warnungen);
    const k = `${f?.id}|${f?.land}|${f?.gueltigAb || ""}`;
    if (gesehen.has(k)) vertragsfehler.push(`Dublette ${f?.id} (${f?.land}, gueltigAb ${f?.gueltigAb || "–"})`);
    gesehen.set(k, true);
  }
  const ohneQuelle = liste.filter((f) => !f?.quelle || typeof f.quelle.titel !== "string" || !f.quelle.titel.trim()).map(kurz);
  const ohneAbruf = liste.filter((f) => !f?.abruf).map(kurz);
  const abgelaufen = liste.filter((f) => istAbgelaufen(f, stichtag));
  const abgelaufenA = abgelaufen.filter((f) => f.klasse === "A").map(kurz);
  const abgelaufenBC = abgelaufen.filter((f) => f.klasse !== "A").map(kurz);
  const zuPruefen = liste.filter((f) => f?.status === "zu_pruefen").map(kurz);
  const ohneUrl = liste.filter((f) => f?.quelle && !f.quelle.url && f.quelle.art !== "eigen").map(kurz);

  const rot = vertragsfehler.length > 0 || ohneQuelle.length > 0 || ohneAbruf.length > 0 || abgelaufenA.length > 0;
  const zaehle = (schluessel) => liste.reduce((m, f) => ((m[f?.[schluessel]] = (m[f?.[schluessel]] || 0) + 1), m), {});
  return {
    stichtag,
    urteil: rot ? "ROT" : "GRÜN",
    ok: !rot,
    zusammenfassung: {
      fakten: liste.length,
      vertragsfehler: vertragsfehler.length,
      ohneQuelle: ohneQuelle.length,
      ohneAbruf: ohneAbruf.length,
      abgelaufenKlasseA: abgelaufenA.length,
      abgelaufenKlasseBC: abgelaufenBC.length,
      zuPruefen: zuPruefen.length,
      ohneUrl: ohneUrl.length,
      jeLand: zaehle("land"),
      jeKlasse: zaehle("klasse"),
      jeStatus: zaehle("status"),
    },
    vertragsfehler,
    ohneQuelle,
    ohneAbruf,
    abgelaufenA,
    warnungen: { abgelaufenBC, zuPruefen, ohneUrl, hinweise },
  };
}
