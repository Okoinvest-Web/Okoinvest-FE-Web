// src/lib/plattform/planung/regeln.js
//
// Planungsdateien – reine Regeln (Browser, Server, Tests): Dateiformate mit Größenlimits und Erkennung an den ersten
// Bytes, Planarten/Maßstäbe/Blattformate, Freigabestatus mit Übergängen, Änderungsindex, Sichtbarkeit je Rolle.
// Frappe-Gegenstück: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/planung_kern.py.

import { dxfArt } from "./dxf.js";

const MB = 1024 * 1024;

/** Zugelassene Formate (Erkennung am Inhalt, nicht am Dateinamen) */
export const FORMATE = {
  dwg: { label: "DWG (AutoCAD)", endung: "dwg", mime: "application/acad", maxBytes: 30 * MB, vorschau: "konvertierung" },
  dxf: { label: "DXF (AutoCAD, ASCII)", endung: "dxf", mime: "image/vnd.dxf", maxBytes: 30 * MB, vorschau: "dxf" },
  pdf: { label: "PDF-Plan", endung: "pdf", mime: "application/pdf", maxBytes: 25 * MB, vorschau: "pdf" },
  kml: { label: "KML (Google Earth)", endung: "kml", mime: "application/vnd.google-earth.kml+xml", maxBytes: 10 * MB, vorschau: "geo" },
  kmz: { label: "KMZ (KML gepackt)", endung: "kmz", mime: "application/vnd.google-earth.kmz", maxBytes: 10 * MB, vorschau: "geo" },
  geojson: { label: "GeoJSON", endung: "geojson", mime: "application/geo+json", maxBytes: 10 * MB, vorschau: "geo" },
  shape: { label: "Shapefile (ZIP)", endung: "zip", mime: "application/zip", maxBytes: 20 * MB, vorschau: "geo" },
};
export const FORMAT_IDS = Object.keys(FORMATE);
export const MAX_UPLOAD_BYTES = Math.max(...Object.values(FORMATE).map((f) => f.maxBytes));
export const ANNAHME_ENDUNGEN = ".dwg,.dxf,.pdf,.kml,.kmz,.geojson,.json,.zip";

/** DWG-Versionskennung (erste 6 Bytes) → AutoCAD-Release */
export const DWG_VERSIONEN = {
  AC1009: "R11/R12", AC1012: "R13", AC1014: "R14", AC1015: "AutoCAD 2000", AC1018: "AutoCAD 2004", AC1021: "AutoCAD 2007",
  AC1024: "AutoCAD 2010", AC1027: "AutoCAD 2013", AC1032: "AutoCAD 2018",
};

export const PLANARTEN = {
  lageplan: "Lageplan / Übersicht",
  belegungsplan: "Belegungsplan (Modulbelegung)",
  kabelplan: "Kabel- und Stringplan",
  trassenplan: "Trassenplan Mittelspannung",
  elektro: "Elektroplan / Einlinienschaltbild",
  bplan: "Bebauungsplan / Vorhabenplan",
  vermessung: "Vermessung / Bestand",
  gruen: "Grünordnung / Ausgleich",
  detail: "Detail / Schnitt",
  sonstiges: "Sonstiger Plan",
};
export const MASSSTAEBE = ["1:100", "1:200", "1:250", "1:500", "1:1000", "1:2000", "1:2500", "1:5000", "1:10000", "ohne"];
export const BLATTFORMATE = ["A0", "A1", "A2", "A3", "A4", "Sonderformat", "digital"];

export const PLAN_STATUS = {
  entwurf: { label: "Entwurf", ton: "grau" },
  pruefung: { label: "Zur Prüfung", ton: "gelb" },
  freigegeben: { label: "Freigegeben", ton: "gruen" },
  ersetzt: { label: "Ersetzt", ton: "grau" },
};

/** Übergänge: aktion → { von, nach, wer: bo|planer (Planer = hochladender Gutachter), kommentarPflicht } */
export const PLAN_AKTIONEN = {
  einreichen: { label: "Zur Prüfung geben", von: ["entwurf"], nach: "pruefung", wer: ["bo", "planer"] },
  freigeben: { label: "Freigeben", von: ["pruefung"], nach: "freigegeben", wer: ["bo"] },
  zurueckweisen: { label: "Zurückweisen", von: ["pruefung"], nach: "entwurf", wer: ["bo"], kommentarPflicht: true },
  zurueckziehen: { label: "Freigabe zurücknehmen", von: ["freigegeben"], nach: "pruefung", wer: ["bo"], kommentarPflicht: true },
};

/** Prüft eine Statusaktion; Ergebnis { ok, nach, fehler, status (HTTP) } */
export function aktionPruefen(aktion, { status, rolle, kommentar = "" }) {
  const a = PLAN_AKTIONEN[aktion];
  if (!a) return { ok: false, status: 422, fehler: "Unbekannte Aktion." };
  if (!a.wer.includes(rolle)) return { ok: false, status: 403, fehler: rolle === "planer" ? "Freigeben darf nur die Projektentwicklung." : "Dafür fehlt Ihnen das Recht." };
  if (!a.von.includes(status)) return { ok: false, status: 409, fehler: `Aus dem Status „${PLAN_STATUS[status]?.label || status}“ nicht möglich.` };
  if (a.kommentarPflicht && String(kommentar || "").trim().length < 5) return { ok: false, status: 422, fehler: "Bitte begründen Sie den Schritt (mindestens 5 Zeichen)." };
  return { ok: true, nach: a.nach };
}

/** Nächster Änderungsindex: – → A → B … Z → AA … */
export function naechsterIndex(vorhandene = []) {
  const zahlVon = (s) => [...String(s || "").toUpperCase()].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0);
  const max = vorhandene.reduce((m, s) => (/^[A-Z]{1,3}$/i.test(String(s || "")) ? Math.max(m, zahlVon(s)) : m), 0);
  let n = max + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// ---------------------------------------------------------------- Erkennung

const text = (b, von, bis) => {
  let s = "";
  for (let k = von; k < Math.min(bis, b.length); k++) s += String.fromCharCode(b[k]);
  return s;
};

/** Namen im zentralen Verzeichnis einer ZIP-Datei (ohne Entpacken). Leer, wenn keine gültige ZIP. */
export function zipNamen(b) {
  const n = b.length;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  for (let i = n - 22; i >= Math.max(0, n - 22 - 65535); i--) {
    if (dv.getUint32(i, true) !== 0x06054b50) continue;
    const anzahl = dv.getUint16(i + 10, true);
    let p = dv.getUint32(i + 16, true);
    const namen = [];
    for (let k = 0; k < anzahl && p + 46 <= n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const ln = dv.getUint16(p + 28, true);
      const lx = dv.getUint16(p + 30, true);
      const lk = dv.getUint16(p + 32, true);
      namen.push(new TextDecoder().decode(b.subarray(p + 46, p + 46 + ln)));
      p += 46 + ln + lx + lk;
    }
    return namen;
  }
  return [];
}

/**
 * Format am Inhalt erkennen. Ergebnis { ok, format, info } oder { ok:false, status, fehler }.
 * `name` dient nur für Hinweise (Endung passt nicht) – maßgeblich sind die Bytes.
 */
export function formatErkennen(bytes, name = "") {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!b.length) return { ok: false, status: 422, fehler: "Die Datei ist leer." };
  const kopf = text(b, 0, 8);
  let format = "";
  const info = {};
  if (kopf.startsWith("%PDF-")) format = "pdf";
  else if (/^AC10\d\d/.test(kopf)) {
    format = "dwg";
    info.dwgVersion = kopf.slice(0, 6);
    info.dwgRelease = DWG_VERSIONEN[info.dwgVersion] || "unbekannte Version";
  } else if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) {
    const namen = zipNamen(b).map((x) => x.toLowerCase());
    if (!namen.length) return { ok: false, status: 415, fehler: "Die ZIP-Datei ist beschädigt." };
    if (namen.some((x) => x.includes("..") || x.startsWith("/"))) return { ok: false, status: 415, fehler: "Die ZIP-Datei enthält unzulässige Pfade." };
    if (namen.some((x) => x.endsWith(".kml"))) format = "kmz";
    else if (["shp", "shx", "dbf"].every((e) => namen.some((x) => x.endsWith(`.${e}`)))) {
      format = "shape";
      info.prj = namen.some((x) => x.endsWith(".prj"));
    } else return { ok: false, status: 415, fehler: "ZIP-Dateien nur als Shapefile (.shp, .shx, .dbf, .prj) oder KMZ." };
    info.dateien = namen.length;
  } else {
    const anfang = text(b, 0, 400);
    const art = dxfArt(anfang);
    if (art === "binaer") return { ok: false, status: 415, fehler: "Binär-DXF wird nicht unterstützt – bitte als ASCII-DXF speichern (DXF R12–2018)." };
    if (art === "ascii") format = "dxf";
    else if (/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<kml[\s>]/i.test(anfang)) format = "kml";
    else if (/^\s*\{/.test(anfang)) {
      try {
        const j = JSON.parse(new TextDecoder().decode(b));
        if (["FeatureCollection", "Feature", "Polygon", "MultiPolygon", "LineString", "MultiLineString", "Point", "MultiPoint", "GeometryCollection"].includes(j?.type)) format = "geojson";
      } catch {
        /* kein JSON */
      }
    }
  }
  if (!format) return { ok: false, status: 415, fehler: "Erlaubt sind DWG, DXF (ASCII), PDF, KML/KMZ, GeoJSON und Shapefile (ZIP)." };
  if (b.length > FORMATE[format].maxBytes) return { ok: false, status: 413, fehler: `${FORMATE[format].label}: höchstens ${Math.round(FORMATE[format].maxBytes / MB)} MB.` };
  const endung = String(name).toLowerCase().split(".").pop();
  if (name && endung && ![FORMATE[format].endung, format === "geojson" ? "json" : ""].includes(endung)) info.hinweis = `Dateiendung „.${endung}“ passt nicht zum Inhalt (${FORMATE[format].label}).`;
  return { ok: true, format, info };
}

// ---------------------------------------------------------------- Sichtbarkeit

/**
 * Zugriff auf einen Plan: z = { backoffice, schreiben, nutzerId, gutachterMs: Set(Meilenstein-IDs), investor: Freigabe|null }.
 * Ergebnis { sehen, hochladen, planer, versionen: (v) => bool }.
 * Gutachter/Planer: Pläne an zugewiesenen Meilensteinen oder mit ihm als Planer; Co-Investor: nur freigegebene Versionen
 * (Freigabe mit Schalter „Dokumente“); Eigentümer und alle anderen: kein Zugriff.
 */
export function planZugriff(z, plan, versionen = []) {
  const planer = !!z.nutzerId && ((plan.meilensteinId && z.gutachterMs?.has(plan.meilensteinId)) || plan.planerId === z.nutzerId);
  const investor = !!z.investor && !!z.investor.dokumente;
  const sichtbar = (v) => z.backoffice || planer || (investor && v.status === "freigegeben");
  return {
    sehen: z.backoffice || planer || (investor && versionen.some((v) => v.status === "freigegeben")),
    hochladen: (z.backoffice && z.schreiben) || planer,
    planer,
    version: sichtbar,
  };
}
