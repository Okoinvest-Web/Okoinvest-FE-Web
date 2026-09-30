// src/lib/plattform/gemeinde-screening.js
//
// Gemeinde-Screening der Flächenakquise (Ausbaustufe A1b) – reine Funktionen für Client und Server.
// Je Gemeinde: Potenzial (Kandidaten-ha/MWp, beste Flächen, UW-Kapazität), Stand Bauleitplanung/Kriterienkatalog
// (aus kommunalen Anliegen bzw. manuell), Konkurrenzhinweise (manuell), Kampagnen-Stand → Ranking für die Strategie.
// Python-Gegenstück: plattform/akquise_kampagne_kern.py (gemeinde_ranking).

import { BAULEITPLANUNG_STAND, KRITERIENKATALOG } from "./kommune";

export { BAULEITPLANUNG_STAND, KRITERIENKATALOG };

export const KONKURRENZ_STATUS = { geruecht: "Hinweis/Gerücht", flaeche: "Flächen gesichert", verfahren: "B-Plan-Verfahren läuft", genehmigt: "Genehmigt/Baurecht", gebaut: "In Bau/Betrieb" };

/** Punkte je Stand der Bauleitplanung (Offenheit der Gemeinde) */
const PLANUNG_PUNKTE = { fnp: 15, laufend: 11, aufstellung: 11, kriterien: 9, keine: 5, "": 6 };
const KONKURRENZ_GEWICHT = { geruecht: 1, flaeche: 3, verfahren: 4, genehmigt: 5, gebaut: 5 };

export const RANKING_GEWICHTE = { flaeche: 35, qualitaet: 15, netz: 15, planung: 15, kulisse: 10, konkurrenz: 10 };

export function gemeindeSchluessel(land, bundesland, name) {
  const n = String(name || "")
    .toLowerCase()
    .replace(/\((demo|fiktiv)\)/g, "")
    .replace(/^(gemeinde|stadt|markt|marktgemeinde|stadtgemeinde|ortsgemeinde|große kreisstadt|kreisstadt)\s+/, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${land || "XX"}:${String(bundesland || "").slice(0, 3).toLowerCase()}:${n}`;
}

/**
 * Kennzahlen je Gemeinde aus Kandidaten (Geodaten-Adapter). Kapazitäten: { knotenId: { kapazitaet, freiMw } }.
 * Liefert Map schluessel → { schluessel, land, bundesland, bezirk, name, kandidaten, ha, mwp, haGeeignet, haKulisse, beste[], netz{…} }
 */
export function potenzialJeGemeinde(kandidaten = [], kapazitaeten = {}) {
  const m = new Map();
  for (const k of kandidaten) {
    if (!k.gemeinde) continue;
    const s = gemeindeSchluessel(k.land, k.bundesland, k.gemeinde);
    if (!m.has(s)) m.set(s, { schluessel: s, land: k.land, bundesland: k.bundesland, bezirk: k.bezirk, name: k.gemeinde, kandidaten: 0, ha: 0, mwp: 0, haGeeignet: 0, haKulisse: 0, gewichteteHa: 0, beste: [], knoten: new Map() });
    const g = m.get(s);
    g.kandidaten++;
    g.ha += Number(k.ha) || 0;
    g.mwp += Number(k.mwp) || 0;
    if (k.score >= 45) g.haGeeignet += Number(k.ha) || 0;
    g.gewichteteHa += (Number(k.ha) || 0) * ((Number(k.score) || 0) / 100) * (k.score >= 45 ? 1 : 0.3);
    const ku = k.merkmale?.kulisse;
    const inKulisse = k.land === "DE" ? Math.max(ku?.randstreifenAnteil || 0, ku?.benachteiligtAnteil || 0, ku?.moorAnteil || 0, ku?.konversionAnteil || 0) : k.land === "CH" ? ku?.eignungAnteil || 0 : k.widmung?.status === "zone" ? 1 : k.widmung?.status === "angrenzend" ? 0.5 : 0;
    g.haKulisse += (Number(k.ha) || 0) * inKulisse;
    g.beste.push({ id: k.id, ha: k.ha, mwp: k.mwp, score: k.score, ampel: k.ampel });
    const kn = k.netz?.knoten;
    if (kn?.id) {
      const kap = kapazitaeten[kn.id] || {};
      const alt = g.knoten.get(kn.id);
      g.knoten.set(kn.id, { id: kn.id, name: kn.name, art: kn.art, kapazitaet: kap.kapazitaet || kn.kapazitaet || "unbekannt", freiMw: kap.freiMw ?? null, flaechen: (alt?.flaechen || 0) + 1, mwp: (alt?.mwp || 0) + (Number(k.mwp) || 0) });
    }
  }
  for (const g of m.values()) {
    g.beste = g.beste.sort((a, b) => b.score - a.score || b.ha - a.ha).slice(0, 3);
    const kn = [...g.knoten.values()];
    const frei = kn.filter((x) => x.kapazitaet === "frei");
    g.netz = {
      knoten: kn.sort((a, b) => b.mwp - a.mwp).slice(0, 4),
      status: frei.length ? "frei" : kn.some((x) => x.kapazitaet === "unbekannt") ? "unbekannt" : kn.length ? "knapp" : "keiner",
      freiMw: frei.reduce((s, x) => s + (Number(x.freiMw) || 0), 0) || null,
    };
    delete g.knoten;
    for (const f of ["ha", "mwp", "haGeeignet", "haKulisse", "gewichteteHa"]) g[f] = Math.round(g[f] * 10) / 10;
  }
  return m;
}

/**
 * Ranking-Punkte (0–100) einer Gemeinde mit Begründung.
 * g: Potenzial (potenzialJeGemeinde), info: { bauleitplanung, kriterienkatalog, konkurrenz[] }
 */
export function gemeindeRanking(g, info = {}) {
  const G = RANKING_GEWICHTE;
  const teile = [];
  const pf = Math.min(1, (g.gewichteteHa || 0) / 60) * G.flaeche;
  teile.push({ id: "flaeche", label: "Flächenpotenzial", punkte: pf, max: G.flaeche, text: `${g.haGeeignet} ha geeignet (Score ≥ 45) von ${g.ha} ha, ${g.mwp} MWp` });
  const top = g.beste?.length ? g.beste.reduce((s, x) => s + x.score, 0) / g.beste.length : 0;
  teile.push({ id: "qualitaet", label: "Qualität der besten Flächen", punkte: (top / 100) * G.qualitaet, max: G.qualitaet, text: `Ø Score der besten ${g.beste?.length || 0}: ${Math.round(top)}` });
  const pn = { frei: 15, unbekannt: 8, knapp: 2, keiner: 0 }[g.netz?.status || "keiner"];
  teile.push({ id: "netz", label: "Netz/UW-Kapazität", punkte: pn, max: G.netz, text: { frei: `Kapazität frei${g.netz?.freiMw ? ` (${g.netz.freiMw} MW)` : ""}`, unbekannt: "Kapazität unbekannt – beim Netzbetreiber anfragen", knapp: "Kapazität knapp", keiner: "kein Netzknoten im Umkreis" }[g.netz?.status || "keiner"] });
  const bp = info.bauleitplanung || "";
  let pp = PLANUNG_PUNKTE[bp] ?? 6;
  if (info.kriterienkatalog === "ja") pp = Math.min(15, pp + 3);
  teile.push({ id: "planung", label: "Bauleitplanung / Offenheit", punkte: pp, max: G.planung, text: `${BAULEITPLANUNG_STAND[bp] || "Stand unbekannt"}${info.kriterienkatalog ? ` · Kriterienkatalog: ${KRITERIENKATALOG[info.kriterienkatalog]}` : ""}` });
  const anteil = g.ha > 0 ? Math.min(1, (g.haKulisse || 0) / g.ha) : 0;
  teile.push({ id: "kulisse", label: g.land === "DE" ? "EEG-Kulisse" : g.land === "CH" ? "Eignungsgebiete" : "Widmungslage", punkte: anteil * G.kulisse, max: G.kulisse, text: `${Math.round(anteil * 100)} % der Kandidatenfläche` });
  const konk = (info.konkurrenz || []).filter((x) => x.aktiv !== false);
  const druck = konk.reduce((s, x) => s + (KONKURRENZ_GEWICHT[x.status] || 1), 0);
  const pk = Math.max(0, G.konkurrenz - druck * 2);
  teile.push({ id: "konkurrenz", label: "Wettbewerb", punkte: pk, max: G.konkurrenz, text: konk.length ? `${konk.length} bekannte Projekte anderer Entwickler${konk.some((x) => x.mw) ? ` (${konk.reduce((s, x) => s + (Number(x.mw) || 0), 0)} MW)` : ""}` : "keine Hinweise erfasst" });
  const punkte = Math.round(teile.reduce((s, x) => s + x.punkte, 0));
  for (const t of teile) t.punkte = Math.round(t.punkte * 10) / 10;
  const stufe = punkte >= 65 ? "A" : punkte >= 45 ? "B" : "C";
  return { punkte, stufe, teile };
}
