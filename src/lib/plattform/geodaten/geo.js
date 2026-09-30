// src/lib/plattform/geodaten/geo.js
//
// Reine Geometrie-Helfer für das Akquise-Cockpit (Client + Server, ohne Fremdpakete). Koordinaten wie in
// GeoJSON: [lon, lat] in WGS84 (EPSG:4326). Flächen und Abstände werden in einer lokalen, flächentreuen
// Näherung (äquirektangulär um den Mittelpunkt) gerechnet – für Parzellen und Cluster bis einige Kilometer
// ist der Fehler < 0,5 %. Der Geodaten-Dienst rechnet im Betrieb exakt in EPSG:31287 (MGI / Austria Lambert).
// Gegenstück in Python: Backend-Import/dienste/geodaten/geodaten/geometrie.py (gleiche Formeln, gleiche Tests).

export const ERDRADIUS_M = 6371008.8;
const RAD = Math.PI / 180;

/** Großkreisentfernung in Metern zwischen [lon, lat] und [lon, lat] */
export function distanzM(a, b) {
  const dLat = (b[1] - a[1]) * RAD;
  const dLon = (b[0] - a[0]) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * ERDRADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Projektion [lon, lat] → [x, y] in Metern um einen Bezugspunkt (lokal äquirektangulär) */
export function projektor(bezug) {
  const kx = Math.cos(bezug[1] * RAD) * ERDRADIUS_M * RAD;
  const ky = ERDRADIUS_M * RAD;
  return (p) => [(p[0] - bezug[0]) * kx, (p[1] - bezug[1]) * ky];
}

/** Äußerer Ring eines GeoJSON-Polygons bzw. aller Teile eines MultiPolygons */
export function ringe(geometrie) {
  if (!geometrie) return [];
  if (geometrie.type === "Polygon") return [geometrie.coordinates];
  if (geometrie.type === "MultiPolygon") return geometrie.coordinates;
  return [];
}

function ringFlaeche(ring) {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return s / 2;
}

function ringUmfang(ring) {
  let s = 0;
  for (let i = 1; i < ring.length; i++) s += Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1]);
  return s;
}

/** Bounding Box [minLon, minLat, maxLon, maxLat] beliebiger GeoJSON-Geometrie */
export function bbox(geometrie) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  const lauf = (c) => {
    if (typeof c[0] === "number") {
      if (c[0] < b[0]) b[0] = c[0];
      if (c[1] < b[1]) b[1] = c[1];
      if (c[0] > b[2]) b[2] = c[0];
      if (c[1] > b[3]) b[3] = c[1];
    } else for (const x of c) lauf(x);
  };
  if (geometrie?.coordinates) lauf(geometrie.coordinates);
  return b;
}

export const bboxSchneidet = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];

/** Schwerpunkt (Flächenschwerpunkt des größten Teils; bei Punkten der Punkt) als [lon, lat] */
export function schwerpunkt(geometrie) {
  if (geometrie?.type === "Point") return geometrie.coordinates;
  const teile = ringe(geometrie);
  if (!teile.length) return null;
  let best = null;
  let bestA = -1;
  for (const poly of teile) {
    const ring = poly[0];
    const bb = bbox({ coordinates: ring });
    const bezug = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];
    const p = projektor(bezug);
    const xy = ring.map(p);
    const a = ringFlaeche(xy);
    if (Math.abs(a) <= bestA) continue;
    let cx = 0;
    let cy = 0;
    for (let i = 0, j = xy.length - 1; i < xy.length; j = i++) {
      const f = xy[j][0] * xy[i][1] - xy[i][0] * xy[j][1];
      cx += (xy[j][0] + xy[i][0]) * f;
      cy += (xy[j][1] + xy[i][1]) * f;
    }
    if (a === 0) continue;
    cx /= 6 * a;
    cy /= 6 * a;
    const kx = Math.cos(bezug[1] * RAD) * ERDRADIUS_M * RAD;
    const ky = ERDRADIUS_M * RAD;
    best = [bezug[0] + cx / kx, bezug[1] + cy / ky];
    bestA = Math.abs(a);
  }
  return best;
}

/** Fläche in m² (Außenringe minus Löcher) */
export function flaecheM2(geometrie) {
  const teile = ringe(geometrie);
  if (!teile.length) return 0;
  const bb = bbox(geometrie);
  const p = projektor([(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2]);
  let s = 0;
  for (const poly of teile) {
    poly.forEach((ring, i) => {
      const a = Math.abs(ringFlaeche(ring.map(p)));
      s += i === 0 ? a : -a;
    });
  }
  return Math.max(0, s);
}

/** Umfang in m (nur Außenringe) */
export function umfangM(geometrie) {
  const teile = ringe(geometrie);
  if (!teile.length) return 0;
  const bb = bbox(geometrie);
  const p = projektor([(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2]);
  return teile.reduce((s, poly) => s + ringUmfang(poly[0].map(p)), 0);
}

/** Konvexe Hülle (Andrew's Monotone Chain) von Punkten [x, y] */
export function konvexeHuelle(punkte) {
  const p = [...punkte].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const kreuz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const unten = [];
  for (const q of p) {
    while (unten.length >= 2 && kreuz(unten[unten.length - 2], unten[unten.length - 1], q) <= 0) unten.pop();
    unten.push(q);
  }
  const oben = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (oben.length >= 2 && kreuz(oben[oben.length - 2], oben[oben.length - 1], q) <= 0) oben.pop();
    oben.push(q);
  }
  return unten.slice(0, -1).concat(oben.slice(0, -1));
}

/**
 * Kompaktheit eines Flächenverbunds (0–1): Anteil der Fläche an ihrer konvexen Hülle („Solidity“),
 * kombiniert mit dem Seitenverhältnis des umschließenden Rechtecks (schmale Streifen sind schlecht belegbar).
 * `geometrien` = Liste von Polygonen (Parzellen eines Clusters), `flaeche` = Summe ihrer Flächen in m².
 */
export function kompaktheit(geometrien, flaeche) {
  const alle = geometrien.flatMap((g) => ringe(g).flatMap((poly) => poly[0]));
  if (alle.length < 3 || !flaeche) return 0;
  const bb = bbox({ coordinates: alle });
  const p = projektor([(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2]);
  const huelle = konvexeHuelle(alle.map(p));
  const hA = Math.abs(ringFlaeche([...huelle, huelle[0]]));
  const solidity = hA > 0 ? Math.min(1, flaeche / hA) : 0;
  // Seitenverhältnis über die Hauptachsen der Hülle (Kovarianz der Hüllpunkte)
  const n = huelle.length;
  const mx = huelle.reduce((s, q) => s + q[0], 0) / n;
  const my = huelle.reduce((s, q) => s + q[1], 0) / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const q of huelle) {
    sxx += (q[0] - mx) ** 2;
    syy += (q[1] - my) ** 2;
    sxy += (q[0] - mx) * (q[1] - my);
  }
  const spur = sxx + syy;
  const d = Math.sqrt(Math.max(0, ((sxx - syy) / 2) ** 2 + sxy ** 2));
  const l1 = spur / 2 + d;
  const l2 = Math.max(1e-9, spur / 2 - d);
  const verhaeltnis = Math.sqrt(l1 / l2); // 1 = rund/quadratisch
  const streckung = verhaeltnis <= 2.5 ? 1 : Math.max(0, 1 - (verhaeltnis - 2.5) / 5);
  return Math.round(solidity * streckung * 1000) / 1000;
}

/** Punkt in Polygon (Ray Casting, Löcher berücksichtigt) */
export function punktInPolygon(pt, geometrie) {
  for (const poly of ringe(geometrie)) {
    const drin = (ring) => {
      let ja = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi + 1e-300) + xi) ja = !ja;
      }
      return ja;
    };
    if (drin(poly[0]) && !poly.slice(1).some(drin)) return true;
  }
  return false;
}

function abstandPunktStrecke(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Kürzester Abstand in m zwischen Punkt [lon, lat] und Polygon (0, wenn innen) */
export function abstandPunktPolygonM(pt, geometrie) {
  if (punktInPolygon(pt, geometrie)) return 0;
  const p = projektor(pt);
  const q = p(pt);
  let min = Infinity;
  for (const poly of ringe(geometrie)) {
    for (const ring of poly) {
      const xy = ring.map(p);
      for (let i = 1; i < xy.length; i++) min = Math.min(min, abstandPunktStrecke(q, xy[i - 1], xy[i]));
    }
  }
  return min;
}

/** Kürzester Abstand in m zwischen zwei Polygonen (Näherung über Stützpunkte beider Seiten; 0 bei Überlappung) */
export function abstandPolygonPolygonM(g1, g2) {
  let min = Infinity;
  for (const poly of ringe(g1)) for (const pt of poly[0]) {
    min = Math.min(min, abstandPunktPolygonM(pt, g2));
    if (min === 0) return 0;
  }
  for (const poly of ringe(g2)) for (const pt of poly[0]) {
    min = Math.min(min, abstandPunktPolygonM(pt, g1));
    if (min === 0) return 0;
  }
  return min;
}

/** Anteil (0–1) der Stützpunkte von g1, die in g2 liegen – grobe Überdeckungsschätzung für die Demo */
export function ueberdeckung(g1, g2) {
  const pkt = ringe(g1).flatMap((poly) => poly[0].slice(0, -1));
  const s = schwerpunkt(g1);
  if (s) pkt.push(s);
  if (!pkt.length) return 0;
  return pkt.filter((q) => punktInPolygon(q, g2)).length / pkt.length;
}

/** Kreis als Polygon (für Radien/Zonen), `m` Radius in Metern */
export function kreis(mitte, m, schritte = 48) {
  const kx = Math.cos(mitte[1] * RAD) * ERDRADIUS_M * RAD;
  const ky = ERDRADIUS_M * RAD;
  const ring = [];
  for (let i = 0; i <= schritte; i++) {
    const w = (i / schritte) * 2 * Math.PI;
    ring.push([mitte[0] + (Math.cos(w) * m) / kx, mitte[1] + (Math.sin(w) * m) / ky]);
  }
  return { type: "Polygon", coordinates: [ring] };
}

/** BBox-Text "minLon,minLat,maxLon,maxLat" prüfen (Österreich/DACH-Grenzen, max. Ausdehnung) */
export function bboxLesen(text, { maxGrad = 3 } = {}) {
  if (!text) return null;
  const z = String(text).split(",").map(Number);
  if (z.length !== 4 || z.some((x) => !Number.isFinite(x))) return null;
  const [a, b, c, d] = z;
  if (a >= c || b >= d || a < 4 || c > 18 || b < 44 || d > 56) return null;
  if (c - a > maxGrad || d - b > maxGrad) return null;
  return z;
}

// ---------------------------------------------------------------- Linien (Ausbaustufe A1b: Autobahnen/Schienenwege)

/** Kürzester Abstand in m zwischen Punkt [lon, lat] und LineString/MultiLineString */
export function abstandPunktLinieM(pt, linie) {
  if (!linie?.coordinates) return Infinity;
  const teile = linie.type === "MultiLineString" ? linie.coordinates : [linie.coordinates];
  const p = projektor(pt);
  const q = p(pt);
  let min = Infinity;
  for (const t of teile) {
    const xy = t.map(p);
    for (let i = 1; i < xy.length; i++) min = Math.min(min, abstandPunktStrecke(q, xy[i - 1], xy[i]));
  }
  return min;
}

/** Stichprobenpunkte einer Fläche: Stützpunkte, Kantenmitten und Schwerpunkt (für Flächenanteile in Korridoren) */
export function stichproben(geometrie) {
  const pkt = [];
  for (const poly of ringe(geometrie)) {
    const r = poly[0] || [];
    for (let i = 1; i < r.length; i++) pkt.push(r[i - 1], [(r[i - 1][0] + r[i][0]) / 2, (r[i - 1][1] + r[i][1]) / 2]);
  }
  const s = schwerpunkt(geometrie);
  if (s) pkt.push(s, s); // Schwerpunkt doppelt gewichtet
  return pkt;
}
