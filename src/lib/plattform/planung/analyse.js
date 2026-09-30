// src/lib/plattform/planung/analyse.js
//
// NUR SERVERSEITIG: Analyse einer hochgeladenen Planversion (Demo-Backend und Frappe-Adapter gleich): DXF → Einheit,
// Objektzähler, Ausdehnung, Layer, Kennzahlen nach Layer-Konvention; GeoJSON/KML → dieselben Kennzahlen; KMZ und
// Shapefile-ZIP → zusätzlich abgeleitete Vorschau-Datei (GeoJSON), weil der Browser nicht entpackt.
// Fehler in der Analyse verhindern den Upload nicht (Datei bleibt Nachweis), sie landen in `analyse.fehler`.

import { analysieren, bbox, dxfDekodieren, kennzahlen } from "./dxf.js";
import { geojsonPrimitive, kmlZuGeojson } from "./geo.js";
import { kmzZuGeojson, shapeZuGeojson } from "./zip.js";

function geoAnalyse(gj) {
  const { prims, einheit, projiziert, ursprung } = geojsonPrimitive(gj);
  const bb = bbox(prims);
  const layer = {};
  for (const p of prims) layer[p.L] = (layer[p.L] || 0) + 1;
  return {
    einheit, projiziert, ursprung, primitive: prims.length, entitaeten: (gj.features || []).length || 1, bbox: bb,
    groesse: bb ? { breiteM: bb[2] - bb[0], hoeheM: bb[3] - bb[1] } : null,
    layer: Object.entries(layer).map(([name, objekte]) => ({ name, objekte })),
    kennzahlen: kennzahlen(prims, einheit),
  };
}

/** → { analyse, abgeleitet: { name, mime, daten, art } | null } */
export function analyseDatei(format, daten, info = {}) {
  try {
    switch (format) {
      case "dxf": {
        const a = analysieren(dxfDekodieren(daten));
        return { analyse: { ...a, layer: a.layer.slice(0, 500) }, abgeleitet: null };
      }
      case "geojson":
        return { analyse: geoAnalyse(JSON.parse(Buffer.from(daten).toString("utf8"))), abgeleitet: null };
      case "kml":
        return { analyse: geoAnalyse(kmlZuGeojson(Buffer.from(daten).toString("utf8"))), abgeleitet: null };
      case "kmz":
      case "shape": {
        const gj = format === "kmz" ? kmzZuGeojson(daten) : shapeZuGeojson(daten);
        const text = JSON.stringify(gj);
        return { analyse: { ...geoAnalyse(gj), prj: info.prj ?? null }, abgeleitet: { name: "vorschau.geojson", mime: "application/geo+json", daten: Buffer.from(text), art: "geojson" } };
      }
      case "dwg":
        return { analyse: { dwgVersion: info.dwgVersion, dwgRelease: info.dwgRelease }, abgeleitet: null };
      default:
        return { analyse: {}, abgeleitet: null };
    }
  } catch (e) {
    return { analyse: { fehler: String(e?.message || "Datei konnte nicht ausgewertet werden.").slice(0, 200) }, abgeleitet: null };
  }
}
