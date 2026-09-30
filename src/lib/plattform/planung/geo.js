// src/lib/plattform/planung/geo.js
//
// Georeferenzierte Pläne für die Vorschau: GeoJSON und KML → Primitive im selben Format wie dxf.js (aufloesen), damit
// Viewer, Messwerkzeug und Kennzahlen (Layer-Konvention über properties.layer bzw. Name) identisch funktionieren.
// WGS84-Koordinaten werden lokal in Meter projiziert (gleichabständig um den Schwerpunkt – für Planmaßstäbe bis einige
// Kilometer genau genug); als „projiziert“ gekennzeichnete Daten (Shapefile ohne Umrechnung) bleiben in ihren Einheiten.

import { punkteFlaeche, punkteLaenge } from "./dxf.js";

const M_PRO_GRAD_LAT = 110574;
const M_PRO_GRAD_LON = 111320;

/** KML-Text → GeoJSON-FeatureCollection (Point, LineString, Polygon äußere Ringe; Name aus Placemark) */
export function kmlZuGeojson(kml) {
  const features = [];
  const s = String(kml);
  const placemarks = s.match(/<Placemark[\s\S]*?<\/Placemark>/gi) || [];
  const koords = (t) =>
    t.trim().split(/\s+/).map((p) => p.split(",").map(Number)).filter((p) => p.length >= 2 && p.every((x) => Number.isFinite(x))).map((p) => [p[0], p[1]]);
  for (const pm of placemarks) {
    const name = (pm.match(/<name>([\s\S]*?)<\/name>/i)?.[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    for (const m of pm.matchAll(/<(Point|LineString|Polygon)[\s>][\s\S]*?<\/\1>/gi)) {
      const typ = m[1].toLowerCase();
      if (typ === "polygon") {
        const ring = m[0].match(/<outerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i)?.[1];
        if (ring) features.push({ type: "Feature", properties: { name }, geometry: { type: "Polygon", coordinates: [koords(ring)] } });
      } else {
        const c = m[0].match(/<coordinates>([\s\S]*?)<\/coordinates>/i)?.[1];
        if (!c) continue;
        const k = koords(c);
        features.push({ type: "Feature", properties: { name }, geometry: typ === "point" ? { type: "Point", coordinates: k[0] } : { type: "LineString", coordinates: k } });
      }
    }
  }
  return { type: "FeatureCollection", features };
}

function features(gj) {
  if (!gj) return [];
  if (gj.type === "FeatureCollection") return gj.features || [];
  if (gj.type === "Feature") return [gj];
  return [{ type: "Feature", properties: {}, geometry: gj }];
}

function geometrien(g, out = []) {
  if (!g) return out;
  if (g.type === "GeometryCollection") for (const x of g.geometries || []) geometrien(x, out);
  else out.push(g);
  return out;
}

/**
 * GeoJSON → { prims, einheit, projiziert, ursprung } – Layer aus properties.layer, sonst name, sonst Geometrietyp.
 * `projiziert: true` (Shapefile) → Koordinaten unverändert in Metern.
 */
export function geojsonPrimitive(gj, { projiziert = !!gj?.oekoinvestProjiziert } = {}) {
  const liste = features(gj);
  // Bezugspunkt: Mittel aller Koordinaten
  let sx = 0;
  let sy = 0;
  let n = 0;
  const alle = (c, f) => (typeof c[0] === "number" ? f(c) : c.forEach((x) => alle(x, f)));
  for (const ft of liste) for (const g of geometrien(ft.geometry)) alle(g.coordinates || [], (p) => ((sx += p[0]), (sy += p[1]), n++));
  const lon0 = n ? sx / n : 0;
  const lat0 = n ? sy / n : 0;
  const kx = projiziert ? 1 : M_PRO_GRAD_LON * Math.cos((lat0 * Math.PI) / 180);
  const ky = projiziert ? 1 : M_PRO_GRAD_LAT;
  const proj = (p) => (projiziert ? [p[0], p[1]] : [(p[0] - lon0) * kx, (p[1] - lat0) * ky]);
  const prims = [];
  let g = 0;
  for (const ft of liste) {
    const pr = ft.properties || {};
    const L = String(pr.layer || pr.Layer || pr.LAYER || pr.name || pr.Name || ft.geometry?.type || "Geometrie").slice(0, 80);
    for (const geo of geometrien(ft.geometry)) {
      const basis = { L, aci: null, rgb: null, g, i: String(g), q: geo.type };
      const linie = (koord, zu) => {
        const pts = [];
        for (const p of koord) pts.push(...proj(p));
        if (zu && pts.length >= 4 && (pts[0] !== pts[pts.length - 2] || pts[1] !== pts[pts.length - 1])) pts.push(pts[0], pts[1]);
        prims.push({ t: "p", ...basis, pts, zu, laenge: punkteLaenge(pts), flaeche: zu ? punkteFlaeche(pts.slice(0, -2)) : 0 });
      };
      switch (geo.type) {
        case "Point": {
          const [x, y] = proj(geo.coordinates);
          prims.push({ t: "p", ...basis, pts: [x, y, x, y], zu: false, laenge: 0, flaeche: 0, punkt: true });
          if (pr.name) prims.push({ t: "t", ...basis, x, y, h: 0, text: String(pr.name).slice(0, 80), rot: 0, ha: 0, va: 1, pixel: 11 });
          break;
        }
        case "MultiPoint":
          for (const c of geo.coordinates) {
            const [x, y] = proj(c);
            prims.push({ t: "p", ...basis, pts: [x, y, x, y], zu: false, laenge: 0, flaeche: 0, punkt: true });
          }
          break;
        case "LineString":
          linie(geo.coordinates, false);
          break;
        case "MultiLineString":
          for (const c of geo.coordinates) linie(c, false);
          break;
        case "Polygon":
          (geo.coordinates || []).forEach((ring) => linie(ring, true)); // Löcher als eigene Kontur (Fläche dann getrennt)
          break;
        case "MultiPolygon":
          for (const poly of geo.coordinates) for (const ring of poly) linie(ring, true);
          break;
        default:
          break;
      }
    }
    g++;
  }
  return { prims, einheit: { code: 6, kurz: "m", label: projiziert ? "Meter (Koordinatensystem der Datei)" : "Meter (aus WGS84 lokal projiziert)", m: 1, angenommen: false }, projiziert, ursprung: projiziert ? null : [lon0, lat0] };
}
