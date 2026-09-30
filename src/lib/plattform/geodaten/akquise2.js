// src/lib/plattform/geodaten/akquise2.js
//
// Akquise Ausbaustufe 2 – serverseitige Orchestrierung zwischen Geodaten-Adapter (Kandidaten, Kapazitäten) und
// Plattform-Backend (Kampagnen, Sperrliste, Gemeinde-Screening). Kandidaten werden IMMER serverseitig geladen – der
// Browser schickt nur Kandidaten-IDs bzw. Filter. Nur serverseitig verwenden.

import * as geo from "./index";
import { akquise2Backend } from "../backend/akquise2";
import { geodatenBackend } from "../backend/geodaten";
import { PlattformFehler } from "../fehler";
import * as v from "../validierung";

const MAX_KAMPAGNE = 300;

/** Kandidat für Speicherung/Übertragung verschlanken (Geometrie nur, wenn gebraucht) */
export function kandidatSchlank(k, { geometrie = false } = {}) {
  return {
    id: k.id, demo: k.demo, land: k.land, bundesland: k.bundesland, bezirk: k.bezirk, gemeinde: k.gemeinde, ha: k.ha, mwp: k.mwp, score: k.score, ampel: k.ampel, prioritaet: k.prioritaet,
    parzellen: k.parzellen, netz: k.netz ? { knoten: { id: k.netz.knoten.id, name: k.netz.knoten.name, art: k.netz.knoten.art, kapazitaet: k.netz.knoten.kapazitaet }, trasseM: k.netz.trasseM, kosten: { min: k.netz.kosten.min, max: k.netz.kosten.max } } : null,
    merkmale: { kulisse: k.merkmale?.kulisse || null, hauptnutzung: k.merkmale?.hauptnutzung },
    widmung: k.widmung, schwerpunkt: k.schwerpunkt, ...(geometrie ? { geometrie: k.geometrie } : {}),
  };
}

/**
 * Kampagne aus Kandidatenmenge anlegen.
 * quelle: { kandidatIds[] } (Kartenauswahl) | { filter } (Filter der Karte) | { gemeinde, land } – rote Flächen (Score < 45)
 * werden bei Filter/Gemeinde ausgelassen, bei expliziter Auswahl übernommen.
 */
export async function kampagneAnlegen(n, daten = {}) {
  let liste = [];
  let art = "auswahl";
  if (Array.isArray(daten.kandidatIds) && daten.kandidatIds.length) {
    const ids = [...new Set(daten.kandidatIds.map((x) => v.text(x, 80)).filter(Boolean))].slice(0, MAX_KAMPAGNE);
    for (const id of ids) liste.push(await geo.kandidat(n, id));
  } else if (daten.gemeinde) {
    art = "gemeinde";
    const r = await geo.kandidaten(n, { gemeinde: v.text(daten.gemeinde, 80), land: ["AT", "DE", "CH"].includes(daten.land) ? daten.land : undefined, limit: 2000 });
    liste = r.kandidaten.filter((k) => k.score >= 45);
  } else if (daten.filter && typeof daten.filter === "object") {
    art = "filter";
    const f = daten.filter;
    const zahl = (x, max) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Math.min(Number(x), max) : undefined);
    const filter = { minHa: zahl(f.minHa, 1000), maxTrasseKm: zahl(f.maxTrasseKm, 50), minScore: zahl(f.minScore, 100) ?? 45, land: ["AT", "DE", "CH"].includes(f.land) ? f.land : undefined, bundesland: v.text(f.bundesland, 80) || undefined, bezirk: v.text(f.bezirk, 80) || undefined, gemeinde: v.text(f.gemeinde, 80) || undefined, ampel: ["gruen", "gelb"].includes(f.ampel) ? f.ampel : undefined, limit: 2000 };
    const r = await geo.kandidaten(n, filter);
    liste = r.kandidaten;
    daten = { ...daten, quelleFilter: filter };
  } else throw new PlattformFehler(422, "Bitte Flächen auswählen, einen Filter oder eine Gemeinde angeben.");
  if (liste.length > MAX_KAMPAGNE) throw new PlattformFehler(422, `Die Auswahl umfasst ${liste.length} Flächen – höchstens ${MAX_KAMPAGNE} je Kampagne. Bitte Filter einschränken.`);
  return akquise2Backend().kampagneAnlegen(n, liste.map((k) => kandidatSchlank(k, { geometrie: true })), {
    name: daten.name, beschreibung: daten.beschreibung, test: daten.test === true, nachfass: daten.nachfass,
    quelle: { art, gemeinde: daten.gemeinde || "", filter: daten.quelleFilter || null },
  });
}

/** Gemeinde-Screening: alle Kandidaten (optional Land/Bundesland) + gepflegte Kapazitäten → Ranking */
export async function gemeindenScreening(n, filter = {}) {
  const f = { land: ["AT", "DE", "CH"].includes(filter.land) ? filter.land : undefined, bundesland: v.text(filter.bundesland, 80) || undefined, bezirk: v.text(filter.bezirk, 80) || undefined, minPunkte: Number(filter.minPunkte) > 0 ? Math.min(100, Number(filter.minPunkte)) : undefined };
  const r = await geo.kandidaten(n, { land: f.land, bundesland: f.bundesland, bezirk: f.bezirk, limit: 2000 });
  const kap = await geodatenBackend().netzkapazitaeten(n);
  return akquise2Backend().gemeindenScreening(n, r.kandidaten.map((k) => kandidatSchlank(k)), kap, f);
}
