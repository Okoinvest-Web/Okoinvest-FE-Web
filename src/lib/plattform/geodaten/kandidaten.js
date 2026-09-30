// src/lib/plattform/geodaten/kandidaten.js
//
// Kandidatenflächen aus Parzellen/Schlägen bilden und bewerten (reine Funktionen, ohne Datei- oder Netzzugriff).
// Genutzt vom Demo-Adapter (lokale GeoJSON-Dateien); im Betrieb liefert der Geodaten-Dienst dieselbe Struktur
// (PostGIS: ST_ClusterDBSCAN(eps = 0) über geeignete Parzellen, Kennzahlen in EPSG:31287).
//
// Kandidat = zusammenhängender Verbund geeigneter Parzellen (Acker/Grünland; Wald/Gewässer trennen). Mehrere
// Eigentümer sind möglich – die Akquise sichert dann mehrere Parzellen (Steckbrief listet sie einzeln).

import { abstandPolygonPolygonM, abstandPunktPolygonM, bbox, bboxSchneidet, distanzM, flaecheM2, kompaktheit, schwerpunkt, ueberdeckung } from "./geo.js";
import { besterKnoten, bewerte, kennzahlen, mwpFuer, naechsterKnoten, netzkosten, prioritaet, widmungslage } from "./scoring.js";

const GEEIGNET = ["acker", "gruenland"];
const NACHBAR_M = 3; // Parzellen mit weniger als 3 m Abstand gelten als zusammenhängend (Feldweg-Grenzen ausgenommen)

function erweitert(b, m) {
  const dLat = m / 111320;
  const dLon = m / (111320 * Math.cos(((b[1] + b[3]) / 2) * (Math.PI / 180)));
  return [b[0] - dLon, b[1] - dLat, b[2] + dLon, b[3] + dLat];
}

const mehrheit = (werte) => {
  const z = new Map();
  for (const [w, g] of werte) z.set(w, (z.get(w) || 0) + g);
  return [...z.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
};

/** Zusammenhängende Verbünde (Union-Find über Nachbarschaft) */
export function verbuende(parzellen) {
  const n = parzellen.length;
  const eltern = parzellen.map((_, i) => i);
  const wurzel = (i) => (eltern[i] === i ? i : (eltern[i] = wurzel(eltern[i])));
  const boxen = parzellen.map((p) => erweitert(bbox(p.geometry), NACHBAR_M));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!bboxSchneidet(boxen[i], boxen[j])) continue;
      if (abstandPolygonPolygonM(parzellen[i].geometry, parzellen[j].geometry) <= NACHBAR_M) eltern[wurzel(i)] = wurzel(j);
    }
  }
  const gruppen = new Map();
  parzellen.forEach((p, i) => {
    const w = wurzel(i);
    if (!gruppen.has(w)) gruppen.set(w, []);
    gruppen.get(w).push(p);
  });
  return [...gruppen.values()];
}

/** Knoten-Feature → flaches Objekt */
export const knotenFlach = (f) => ({ ...f.properties, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] });

/**
 * Kandidaten bauen und bewerten.
 * daten = { parzellen: Feature[], knoten: Feature[], schutz: Feature[], orte: Feature[], zonen?: Feature[] }
 */
export function kandidatenBauen({ parzellen = [], knoten = [], schutz = [], orte = [], zonen = [] }) {
  const geeignet = parzellen.filter((p) => GEEIGNET.includes(p.properties?.nutzung));
  const kn = knoten.map(knotenFlach);
  const schutzBoxen = schutz.map((s) => bbox(s.geometry));
  const zonenBoxen = zonen.map((z) => bbox(z.geometry));
  const ergebnis = [];

  for (const gruppe of verbuende(geeignet)) {
    gruppe.sort((a, b) => String(a.properties.id).localeCompare(String(b.properties.id)));
    const flaechen = gruppe.map((p) => p.properties.flaecheM2 || flaecheM2(p.geometry));
    const m2 = flaechen.reduce((s, x) => s + x, 0);
    const ha = Math.round((m2 / 10000) * 100) / 100;
    const geometrie = { type: "MultiPolygon", coordinates: gruppe.map((p) => (p.geometry.type === "Polygon" ? p.geometry.coordinates : p.geometry.coordinates[0])) };
    const box = bbox(geometrie);
    const sp = gruppe.map((p) => schwerpunkt(p.geometry));
    const mitte = [sp.reduce((s, q, i) => s + q[0] * flaechen[i], 0) / m2, sp.reduce((s, q, i) => s + q[1] * flaechen[i], 0) / m2];
    const gewicht = (f) => gruppe.map((p, i) => [f(p.properties), flaechen[i]]);
    const neigung = gruppe.reduce((s, p, i) => s + (Number(p.properties.neigungGrad) || 0) * flaechen[i], 0) / m2;
    const nutzung = { acker: 0, gruenland: 0, sonstige: 0 };
    gruppe.forEach((p, i) => (nutzung[p.properties.nutzung === "acker" ? "acker" : p.properties.nutzung === "gruenland" ? "gruenland" : "sonstige"] += flaechen[i] / 10000));
    const bundesland = mehrheit(gewicht((p) => p.bundesland || ""));
    const land = mehrheit(gewicht((p) => p.land || "AT"));

    // Schutzgebiete: Überdeckung (flächengewichtet) und Abstand
    const nahBox = erweitert(box, 300);
    const schutzListe = [];
    schutz.forEach((s, i) => {
      if (!bboxSchneidet(nahBox, schutzBoxen[i])) return;
      let anteil = 0;
      let abstand = Infinity;
      gruppe.forEach((p, j) => {
        anteil += ueberdeckung(p.geometry, s.geometry) * flaechen[j];
        abstand = Math.min(abstand, abstandPolygonPolygonM(p.geometry, s.geometry));
      });
      anteil /= m2;
      if (abstand <= 300 || anteil > 0) schutzListe.push({ id: s.properties.id, name: s.properties.name, art: s.properties.art, anteil: Math.round(anteil * 100) / 100, abstandM: Math.round(abstand) });
    });

    // Siedlungsabstand: Siedlungspunkt minus Näherungsradius
    let siedlung = null;
    for (const o of orte) {
      const pt = o.geometry.coordinates;
      if (distanzM(pt, mitte) > 4000) continue;
      const d = Math.min(...gruppe.map((p) => abstandPunktPolygonM(pt, p.geometry))) - (o.properties.radiusM || 0);
      if (!siedlung || d < siedlung.abstandM) siedlung = { name: o.properties.name, typ: o.properties.typ, abstandM: Math.max(0, Math.round(d)) };
    }

    // Netz
    const mwp = mwpFuer(ha);
    const netz = besterKnoten(mitte, mwp, kn, { land: land === "AT" ? "at" : land.toLowerCase() });
    const uw = naechsterKnoten(mitte, kn, ["uw110", "uew"]);

    // Widmung (Zonen, wenn als Geodaten vorhanden)
    let zoneAbstandM = zonen.length ? Infinity : null;
    zonen.forEach((z, i) => {
      if (!bboxSchneidet(erweitert(box, 1000), zonenBoxen[i])) return;
      for (const p of gruppe) zoneAbstandM = Math.min(zoneAbstandM, ueberdeckung(p.geometry, z.geometry) > 0.5 ? 0 : abstandPolygonPolygonM(p.geometry, z.geometry));
    });
    if (zoneAbstandM === Infinity) zoneAbstandM = 1e9;
    const widmung = widmungslage({ bundesland, uwAbstandKm: uw ? uw.luftlinieM / 1000 : null, zoneAbstandM });

    const m = {
      ha,
      kompaktheit: kompaktheit(gruppe.map((p) => p.geometry), m2),
      neigungGrad: Math.round(neigung * 10) / 10,
      exposition: mehrheit(gewicht((p) => p.exposition || "eben")),
      nutzung,
      schutz: schutzListe,
      siedlungAbstandM: siedlung?.abstandM ?? null,
      netz,
      widmung,
      bundesland,
      land,
    };
    const b = bewerte(m);
    const agri = nutzung.acker >= nutzung.gruenland;
    ergebnis.push({
      id: `K-${gruppe[0].properties.id}`,
      demo: gruppe.some((p) => p.properties.demo),
      ha,
      mwp,
      score: b.score,
      ampel: b.ampel,
      prioritaet: prioritaet(b.score, ha),
      ko: b.ko,
      kriterien: b.kriterien,
      schwerpunkt: [Math.round(mitte[0] * 1e6) / 1e6, Math.round(mitte[1] * 1e6) / 1e6],
      bbox: box.map((x) => Math.round(x * 1e6) / 1e6),
      geometrie,
      land,
      bundesland,
      bezirk: mehrheit(gewicht((p) => p.bezirk || "")),
      gemeinde: mehrheit(gewicht((p) => p.gemeinde || "")),
      kg: [...new Set(gruppe.map((p) => p.properties.kg))],
      parzellen: gruppe.map((p, i) => ({ id: p.properties.id, kg: p.properties.kg, kgNr: p.properties.kgNr, gstNr: p.properties.gstNr, ha: Math.round(flaechen[i] / 100) / 100, nutzung: p.properties.nutzung, kultur: p.properties.kultur || "" })),
      merkmale: {
        kompaktheit: m.kompaktheit,
        neigungGrad: m.neigungGrad,
        exposition: m.exposition,
        nutzung: { acker: Math.round(nutzung.acker * 100) / 100, gruenland: Math.round(nutzung.gruenland * 100) / 100 },
        hauptnutzung: agri ? "acker" : "gruenland",
        siedlung,
        schutz: schutzListe,
      },
      netz: netz
        ? {
            knoten: { id: netz.knoten.id, name: netz.knoten.name, art: netz.knoten.art, spannungKv: netz.knoten.spannungKv, betreiber: netz.knoten.betreiber || "", kapazitaet: netz.knoten.kapazitaet || "unbekannt", lon: netz.knoten.lon, lat: netz.knoten.lat },
            luftlinieM: netz.luftlinieM,
            trasseM: netz.trasseM,
            ebene: netz.ebene,
            kosten: netz.kosten,
            kapazitaetAmpel: netz.knoten.kapazitaet === "frei" ? "gruen" : netz.knoten.kapazitaet === "knapp" ? "rot" : "gelb",
          }
        : null,
      umspannwerk: uw ? { id: uw.knoten.id, name: uw.knoten.name, art: uw.knoten.art, spannungKv: uw.knoten.spannungKv, luftlinieM: uw.luftlinieM, lon: uw.knoten.lon, lat: uw.knoten.lat, kosten: netzkosten(mwp, (uw.luftlinieM * 1.25) / 1000, { kapazitaet: uw.knoten.kapazitaet }) } : null,
      widmung: { status: widmung.status, text: widmung.text },
      kennzahlen: kennzahlen(ha, { ertragKwhProKwp: b.ertragKwhProKwp, agri: false }),
      kennzahlenAgri: kennzahlen(ha, { ertragKwhProKwp: b.ertragKwhProKwp, agri: true }),
    });
  }
  ergebnis.sort((a, b) => b.score - a.score || b.ha - a.ha);
  return ergebnis;
}

/** Filter auf Kandidatenliste (gleiche Parameter wie die Dienst-API) */
export function filtern(liste, { bbox: box, minHa, maxTrasseKm, minScore, bundesland, bezirk, gemeinde, ampel, q } = {}) {
  let l = liste;
  if (box) l = l.filter((k) => bboxSchneidet(k.bbox, box));
  if (minHa) l = l.filter((k) => k.ha >= minHa);
  if (maxTrasseKm) l = l.filter((k) => k.netz && k.netz.trasseM <= maxTrasseKm * 1000);
  if (minScore) l = l.filter((k) => k.score >= minScore);
  if (bundesland) l = l.filter((k) => k.bundesland === bundesland);
  if (bezirk) l = l.filter((k) => k.bezirk === bezirk);
  if (gemeinde) l = l.filter((k) => k.gemeinde === gemeinde);
  if (ampel) l = l.filter((k) => k.ampel === ampel);
  if (q) {
    const s = String(q).toLowerCase();
    l = l.filter((k) => [k.id, k.gemeinde, k.bezirk, ...k.kg, ...k.parzellen.map((p) => `${p.kgNr} ${p.gstNr}`)].join(" ").toLowerCase().includes(s));
  }
  return l;
}

/** Beste Flächen im Umkreis X km um einen Netzknoten */
export function imUmkreis(liste, knoten, km) {
  const mitte = [knoten.lon, knoten.lat];
  return liste
    .map((k) => ({ ...k, abstandZumKnotenM: Math.round(distanzM(k.schwerpunkt, mitte)) }))
    .filter((k) => k.abstandZumKnotenM <= km * 1000)
    .sort((a, b) => b.score - a.score || a.abstandZumKnotenM - b.abstandZumKnotenM);
}
