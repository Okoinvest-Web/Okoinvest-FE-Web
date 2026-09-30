// src/lib/plattform/geodaten/demo.js
//
// Demo-Implementierung des Geodaten-Adapters: liest die lokalen GeoJSON-Dateien SYNCHRON (readFileSync – keine
// awaited Dateizugriffe beim Rendern) und rechnet mit derselben Scoring-Logik wie der Dienst (kandidaten.js).
//   public/geo/netzknoten-ooe-sbg.geojson        OSM power=substation/transformer (ODbL), Stand Overpass 30.09.2026
//   public/geo/schutzgebiete-innviertel.geojson  OSM Schutzgebiete (ODbL) – nicht amtlich
//   public/geo/orte-innviertel.geojson           OSM Siedlungspunkte (ODbL)
//   src/data/geo/parzellen-demo.geojson          SYNTHETISCHE Parzellen (DEMO, keine echten Grundstücke/Eigentümer)
// Erzeugt mit Backend-Import/dienste/geodaten/demo/demo_bauen.py. Nur serverseitig verwenden.

import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { bbox as bboxVon, bboxSchneidet, kreis } from "./geo.js";
import { filtern, imUmkreis, kandidatenBauen, knotenFlach } from "./kandidaten.js";
import { KNOTEN_ARTEN, SCORING_VERSION } from "./scoring.js";

const DATEIEN = {
  parzellen: "src/data/geo/parzellen-demo.geojson",
  knoten: "public/geo/netzknoten-ooe-sbg.geojson",
  schutz: "public/geo/schutzgebiete-innviertel.geojson",
  orte: "public/geo/orte-innviertel.geojson",
};

let roh = null;
let cache = null;

function lesen() {
  const pfade = Object.fromEntries(Object.entries(DATEIEN).map(([k, p]) => [k, path.join(process.cwd(), p)]));
  const stempel = Object.values(pfade).map((p) => statSync(p).mtimeMs).join("|");
  if (!roh || roh.stempel !== stempel) {
    const j = (p) => JSON.parse(readFileSync(p, "utf8"));
    const d = Object.fromEntries(Object.entries(pfade).map(([k, p]) => [k, j(p)]));
    roh = { stempel, ...d };
    cache = null;
  }
  return roh;
}

/** Netzknoten mit gepflegten Kapazitäten überlagern */
function knotenMitKapazitaet(features, kap = {}) {
  return features.map((f) => {
    const k = kap[f.properties.id];
    return k ? { ...f, properties: { ...f.properties, kapazitaet: k.kapazitaet, freiMw: k.freiMw ?? null, kapazitaetQuelle: k.quelle, kapazitaetStand: k.stand } } : f;
  });
}

function daten(kapazitaeten = {}) {
  const r = lesen();
  const schluessel = `${r.stempel}#${JSON.stringify(kapazitaeten)}`;
  if (!cache || cache.schluessel !== schluessel) {
    const knoten = knotenMitKapazitaet(r.knoten.features, kapazitaeten);
    const kandidaten = kandidatenBauen({ parzellen: r.parzellen.features, knoten, schutz: r.schutz.features, orte: r.orte.features });
    cache = { schluessel, knoten, kandidaten };
  }
  return cache;
}

const QUELLEN = () => {
  const r = lesen();
  return [
    { id: "osm_netz", titel: "Umspannwerke/Trafostationen (OpenStreetMap)", lizenz: "ODbL-1.0", attribution: "© OpenStreetMap-Mitwirkende (ODbL)", url: "https://www.openstreetmap.org/copyright", stand: r.knoten.metadata?.stand || null },
    { id: "osm_schutz", titel: "Schutzgebiete (OpenStreetMap, nicht amtlich)", lizenz: "ODbL-1.0", attribution: "© OpenStreetMap-Mitwirkende (ODbL)", url: "https://www.openstreetmap.org/copyright", stand: r.schutz.metadata?.stand || null },
    { id: "demo", titel: "Parzellen (SYNTHETISCH – DEMO)", lizenz: "intern", attribution: "DEMO-Parzellen, keine echten Grundstücke", url: "", stand: r.parzellen.metadata?.stand || null },
    { id: "basemap", titel: "basemap.at", lizenz: "CC-BY-4.0", attribution: "Grundkarte: basemap.at", url: "https://basemap.at", stand: null },
  ];
};

const zaehle = (liste, feld) => [...liste.reduce((m, k) => m.set(k[feld], (m.get(k[feld]) || 0) + 1), new Map()).entries()].filter(([x]) => x).sort((a, b) => a[0].localeCompare(b[0], "de")).map(([name, anzahl]) => ({ name, anzahl }));

export function uebersicht({ kapazitaeten } = {}) {
  const { kandidaten } = daten(kapazitaeten);
  const summe = (f) => Math.round(kandidaten.reduce((s, k) => s + (Number(f(k)) || 0), 0) * 10) / 10;
  return {
    modus: "demo",
    version: SCORING_VERSION,
    quellen: QUELLEN(),
    kennzahlen: {
      kandidaten: kandidaten.length,
      ha: summe((k) => k.ha),
      mwp: summe((k) => k.mwp),
      gruen: kandidaten.filter((k) => k.ampel === "gruen").length,
      prioA: kandidaten.filter((k) => k.prioritaet === "A").length,
    },
    gebiete: { bundeslaender: zaehle(kandidaten, "bundesland"), bezirke: zaehle(kandidaten, "bezirk"), gemeinden: zaehle(kandidaten, "gemeinde") },
    start: { mitte: [13.19, 48.17], zoom: 10 },
  };
}

export function kandidaten(filter = {}, { kapazitaeten } = {}) {
  const liste = filtern(daten(kapazitaeten).kandidaten, filter);
  return { kandidaten: liste.slice(0, Math.min(2000, filter.limit || 500)), anzahl: liste.length, version: SCORING_VERSION };
}

export function kandidat(id, { kapazitaeten } = {}) {
  return daten(kapazitaeten).kandidaten.find((k) => k.id === id) || null;
}

export function umkreis(knotenId, km, { kapazitaeten } = {}) {
  const d = daten(kapazitaeten);
  const f = d.knoten.find((x) => x.properties.id === knotenId);
  if (!f) return null;
  const liste = imUmkreis(d.kandidaten, knotenFlach(f), km);
  return { knoten: knotenFlach(f), km, kandidaten: liste, anzahl: liste.length };
}

export function netzknoten({ bbox, arten = ["uew", "uw110", "ms", "trafo"] } = {}, { kapazitaeten } = {}) {
  const d = daten(kapazitaeten);
  const features = d.knoten.filter((f) => arten.includes(f.properties.art) && (!bbox || bboxSchneidet(bboxVon(f.geometry), bbox)));
  return { type: "FeatureCollection", features };
}

/** Ebenen: schutzgebiete (OSM) | zonen (OÖ-Prioritätsradien um Umspannwerke, abgeleitet aus dem Kriterienkatalog) */
export function ebene(name, { bbox } = {}) {
  const r = lesen();
  if (name === "schutzgebiete") {
    return { type: "FeatureCollection", features: r.schutz.features.filter((f) => !bbox || bboxSchneidet(bboxVon(f.geometry), bbox)) };
  }
  if (name === "zonen") {
    // Näherung für die Demo: Knoten nördlich 48,0° und östlich 12,75° liegen im Demogebiet in Oberösterreich
    const uws = r.knoten.features.filter((f) => ["uw110", "uew"].includes(f.properties.art)).filter((f) => f.geometry.coordinates[1] >= 48.0 && f.geometry.coordinates[0] >= 12.75 && f.geometry.coordinates[0] <= 14.2);
    const features = [];
    for (const u of uws) {
      if (bbox && !bboxSchneidet([u.geometry.coordinates[0] - 0.12, u.geometry.coordinates[1] - 0.08, u.geometry.coordinates[0] + 0.12, u.geometry.coordinates[1] + 0.08], bbox)) continue;
      features.push({ type: "Feature", geometry: kreis(u.geometry.coordinates, 7500), properties: { id: `p2-${u.properties.id}`, name: `Priorität 2 – ${u.properties.name || "Umspannwerk"}`, art: "ooe_prioritaet_2", bundesland: "Oberösterreich" } });
      features.push({ type: "Feature", geometry: kreis(u.geometry.coordinates, 5000), properties: { id: `p1-${u.properties.id}`, name: `Priorität 1 – ${u.properties.name || "Umspannwerk"}`, art: "ooe_prioritaet_1", bundesland: "Oberösterreich" } });
    }
    return { type: "FeatureCollection", features, hinweis: "Abgeleitet: OÖ Kriterienkatalog PV-FFA – energiewirtschaftliche Priorität 1 (≤ 5 km) und 2 (≤ 7,5 km) um Umspannwerke. Keine amtliche Zonenkarte." };
  }
  return null;
}

/** Suche: Gemeinde/Ort, KG, Grundstücksnummer (KG-Nr Gst-Nr), Umspannwerk, Kandidaten-ID */
export function suche(q, { kapazitaeten } = {}) {
  const s = String(q || "").trim().toLowerCase();
  if (s.length < 2) return { treffer: [] };
  const r = lesen();
  const d = daten(kapazitaeten);
  const treffer = [];
  for (const k of d.kandidaten) {
    if (treffer.length >= 6) break;
    if (k.id.toLowerCase().includes(s) || k.gemeinde.toLowerCase().includes(s) || k.kg.some((x) => x.toLowerCase().includes(s))) {
      treffer.push({ typ: "kandidat", label: `${k.gemeinde} · ${String(k.ha).replace(".", ",")} ha · Score ${k.score}`, kandidatId: k.id, lon: k.schwerpunkt[0], lat: k.schwerpunkt[1] });
    }
  }
  const gst = s.match(/^(\d{5})\s*[-/ ]\s*([\d/.]+)$/);
  for (const p of r.parzellen.features) {
    if (treffer.length >= 10) break;
    const pr = p.properties;
    if ((gst && pr.kgNr === gst[1] && pr.gstNr === gst[2]) || (!gst && `${pr.kgNr} ${pr.gstNr}`.includes(s) && /\d/.test(s))) {
      const c = bboxVon(p.geometry);
      treffer.push({ typ: "grundstueck", label: `${pr.kg} (${pr.kgNr}), Gst. ${pr.gstNr}`, parzelleId: pr.id, lon: (c[0] + c[2]) / 2, lat: (c[1] + c[3]) / 2 });
    }
  }
  for (const f of d.knoten) {
    if (treffer.length >= 14) break;
    if (f.properties.art !== "trafo" && f.properties.name && f.properties.name.toLowerCase().includes(s)) {
      treffer.push({ typ: "netzknoten", label: `${f.properties.name} (${KNOTEN_ARTEN[f.properties.art].kurz})`, knotenId: f.properties.id, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] });
    }
  }
  for (const o of r.orte.features) {
    if (treffer.length >= 20) break;
    if (["town", "village", "city"].includes(o.properties.typ) && o.properties.name.toLowerCase().startsWith(s)) {
      treffer.push({ typ: "ort", label: o.properties.name, lon: o.geometry.coordinates[0], lat: o.geometry.coordinates[1] });
    }
  }
  return { treffer };
}
