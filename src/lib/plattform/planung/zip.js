// src/lib/plattform/planung/zip.js
//
// NUR SERVERSEITIG (node:zlib): KMZ bzw. Shapefile-ZIP entpacken und in GeoJSON überführen, damit der Browser eine
// Vorschau zeigen kann (abgeleitete Datei „vorschau.geojson“ an der Planversion). Schutz gegen ZIP-Bomben: höchstens
// 50 MB entpackt je Datei und 200 Einträge; nur Deflate/Stored; keine Pfade mit „..“.
//   Shapefile: Punkt, Multipunkt, Linie, Polygon (auch Z/M-Varianten); Attribute (.dbf) werden nicht gelesen, der Layer
//   heißt wie die .shp-Datei. Mit .prj ohne PROJCS (reines GEOGCS) gelten Koordinaten als WGS84-Länge/Breite.

import { inflateRawSync } from "node:zlib";
import { kmlZuGeojson } from "./geo.js";

const MAX_ENTPACKT = 50 * 1024 * 1024;

/** Einträge einer ZIP-Datei: [{ name, methode, groesse, gepackt, offset }] */
export function zipEintraege(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) {
    if (b.readUInt32LE(i) !== 0x06054b50) continue;
    const anzahl = b.readUInt16LE(i + 10);
    if (anzahl > 200) throw new Error("Zu viele Dateien im ZIP-Archiv.");
    let p = b.readUInt32LE(i + 16);
    const liste = [];
    for (let k = 0; k < anzahl; k++) {
      if (b.readUInt32LE(p) !== 0x02014b50) break;
      const ln = b.readUInt16LE(p + 28);
      const lx = b.readUInt16LE(p + 30);
      const lk = b.readUInt16LE(p + 32);
      liste.push({ name: b.subarray(p + 46, p + 46 + ln).toString("utf8"), methode: b.readUInt16LE(p + 10), gepackt: b.readUInt32LE(p + 20), groesse: b.readUInt32LE(p + 24), offset: b.readUInt32LE(p + 42) });
      p += 46 + ln + lx + lk;
    }
    return liste;
  }
  return [];
}

/** Einen Eintrag entpacken */
export function zipLesen(buf, eintrag) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  if (eintrag.groesse > MAX_ENTPACKT) throw new Error("Datei im ZIP-Archiv ist zu groß.");
  const o = eintrag.offset;
  if (b.readUInt32LE(o) !== 0x04034b50) throw new Error("ZIP-Archiv beschädigt.");
  const start = o + 30 + b.readUInt16LE(o + 26) + b.readUInt16LE(o + 28);
  const roh = b.subarray(start, start + eintrag.gepackt);
  if (eintrag.methode === 0) return Buffer.from(roh);
  if (eintrag.methode === 8) return inflateRawSync(roh, { maxOutputLength: MAX_ENTPACKT });
  throw new Error("Nicht unterstützte ZIP-Kompression.");
}

/** KMZ → GeoJSON (erste .kml-Datei, bevorzugt doc.kml) */
export function kmzZuGeojson(buf) {
  const liste = zipEintraege(buf);
  const kml = liste.find((e) => /(^|\/)doc\.kml$/i.test(e.name)) || liste.find((e) => /\.kml$/i.test(e.name));
  if (!kml) throw new Error("Keine KML-Datei im KMZ-Archiv.");
  return kmlZuGeojson(zipLesen(buf, kml).toString("utf8"));
}

/** .shp-Inhalt → GeoJSON-Geometrien */
export function shpGeometrien(shp) {
  const b = Buffer.isBuffer(shp) ? shp : Buffer.from(shp);
  if (b.length < 100 || b.readInt32BE(0) !== 9994) throw new Error("Keine gültige .shp-Datei.");
  const geos = [];
  let p = 100;
  while (p + 12 <= b.length && geos.length < 200000) {
    const laenge = b.readInt32BE(p + 4) * 2;
    const c = p + 8;
    if (c + laenge > b.length) break;
    const typ = b.readInt32LE(c);
    const basis = typ % 10; // 1 Punkt, 3 Linie, 5 Polygon, 8 Multipunkt (Z = +10, M = +20)
    if (basis === 1) geos.push({ type: "Point", coordinates: [b.readDoubleLE(c + 4), b.readDoubleLE(c + 12)] });
    else if (basis === 3 || basis === 5) {
      const teile = b.readInt32LE(c + 36);
      const punkte = b.readInt32LE(c + 40);
      const idx = [];
      for (let k = 0; k < teile; k++) idx.push(b.readInt32LE(c + 44 + 4 * k));
      const pp = c + 44 + 4 * teile;
      const linien = idx.map((von, k) => {
        const bis = k + 1 < teile ? idx[k + 1] : punkte;
        const l = [];
        for (let j = von; j < bis; j++) l.push([b.readDoubleLE(pp + 16 * j), b.readDoubleLE(pp + 16 * j + 8)]);
        return l;
      });
      geos.push(basis === 5 ? { type: "Polygon", coordinates: linien } : { type: "MultiLineString", coordinates: linien });
    } else if (basis === 8) {
      const punkte = b.readInt32LE(c + 36);
      const l = [];
      for (let j = 0; j < punkte; j++) l.push([b.readDoubleLE(c + 40 + 16 * j), b.readDoubleLE(c + 48 + 16 * j)]);
      geos.push({ type: "MultiPoint", coordinates: l });
    }
    p = c + laenge;
  }
  return geos;
}

/** Shapefile-ZIP → GeoJSON (alle .shp-Dateien; Layer = Dateiname) */
export function shapeZuGeojson(buf) {
  const liste = zipEintraege(buf);
  const features = [];
  let projiziert = true;
  for (const e of liste.filter((x) => /\.shp$/i.test(x.name) && !x.name.includes(".."))) {
    const layer = e.name.split("/").pop().replace(/\.shp$/i, "");
    const prj = liste.find((x) => x.name.toLowerCase() === e.name.toLowerCase().replace(/\.shp$/, ".prj"));
    if (prj) {
      const wkt = zipLesen(buf, prj).toString("utf8");
      if (/^\s*GEOGCS/i.test(wkt)) projiziert = false;
    }
    for (const geometry of shpGeometrien(zipLesen(buf, e))) features.push({ type: "Feature", properties: { layer }, geometry });
  }
  if (!features.length) throw new Error("Keine Geometrien im Shapefile gefunden.");
  return { type: "FeatureCollection", features, oekoinvestProjiziert: projiziert };
}
