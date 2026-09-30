// src/lib/plattform/planung/dxf.js
//
// Schlanker DXF-Leser (ASCII-DXF, AutoCAD R12 bis 2018+) ohne Fremdpakete – läuft im Browser (Vorschau) und in Node
// (Analyse beim Upload, Tests). Unterstützt:
//   HEADER   $INSUNITS (Einheiten), $EXTMIN/$EXTMAX, $ACADVER
//   TABLES   LAYER (Name, Farbe ACI/True Color, aus = negative Farbe, gefroren = Flag 1)
//   BLOCKS   BLOCK/ENDBLK mit Basispunkt
//   ENTITIES LINE, LWPOLYLINE (Bulges), POLYLINE/VERTEX/SEQEND (2D/3D, keine Netze), CIRCLE, ARC, ELLIPSE, TEXT, MTEXT
//            (Formatierung entfernt), INSERT (Skalierung, Drehung, Spiegelung, Reihen/Spalten, ATTRIB), DIMENSION (über den
//            anonymen Block), POINT, SPLINE (näherungsweise über Stütz-/Kontrollpunkte); HATCH/SOLID/3DFACE u. a. werden
//            gezählt, aber nicht gezeichnet. Papierbereich (Code 67 = 1) wird übersprungen.
//   OCS      Extrusion (0,0,−1) wird als Spiegelung an der Y-Achse berücksichtigt (häufigster Fall), sonst 2D-Projektion.
//
// Ablauf: lesen(text) → Dokument (Rohobjekte) → aufloesen(dokument) → Primitive in Weltkoordinaten (Polylinien, Texte)
// mit Layer/Farbe, exakter Länge und Fläche (geschlossene Objekte) → bbox, kennzahlen (Layer-Konvention PV_Module, Zaun,
// Kabel_MS …). Einheiten-Umrechnung nach Metern über EINHEITEN.

// ================================================================ Einheiten ($INSUNITS)

export const EINHEITEN = {
  0: { kurz: "", label: "ohne Einheit", m: 1 },
  1: { kurz: "in", label: "Zoll", m: 0.0254 },
  2: { kurz: "ft", label: "Fuß", m: 0.3048 },
  3: { kurz: "mi", label: "Meilen", m: 1609.344 },
  4: { kurz: "mm", label: "Millimeter", m: 0.001 },
  5: { kurz: "cm", label: "Zentimeter", m: 0.01 },
  6: { kurz: "m", label: "Meter", m: 1 },
  7: { kurz: "km", label: "Kilometer", m: 1000 },
  8: { kurz: "µin", label: "Mikrozoll", m: 0.0000000254 },
  9: { kurz: "mil", label: "Mil", m: 0.0000254 },
  10: { kurz: "yd", label: "Yard", m: 0.9144 },
  11: { kurz: "Å", label: "Ångström", m: 1e-10 },
  12: { kurz: "nm", label: "Nanometer", m: 1e-9 },
  13: { kurz: "µm", label: "Mikrometer", m: 1e-6 },
  14: { kurz: "dm", label: "Dezimeter", m: 0.1 },
  15: { kurz: "dam", label: "Dekameter", m: 10 },
  16: { kurz: "hm", label: "Hektometer", m: 100 },
  17: { kurz: "Gm", label: "Gigameter", m: 1e9 },
};

/** Einheit des Dokuments (unbekannt/0 → Meter angenommen, Kennzeichen `angenommen`) */
export function einheitVon(doc) {
  const code = Number(doc?.header?.$INSUNITS ?? 0);
  const e = EINHEITEN[code];
  if (!e || code === 0) return { code: 0, kurz: "m", label: "Meter (angenommen – Zeichnung ohne Einheit)", m: 1, angenommen: true };
  return { code, ...e, angenommen: false };
}

// ================================================================ Farben (AutoCAD Color Index)

const ACI_FEST = { 1: [255, 0, 0], 2: [255, 255, 0], 3: [0, 255, 0], 4: [0, 255, 255], 5: [0, 0, 255], 6: [255, 0, 255], 7: [255, 255, 255], 8: [128, 128, 128], 9: [192, 192, 192] };
const ACI_GRAU = { 250: 51, 251: 80, 252: 105, 253: 130, 254: 190, 255: 255 };

function hsvRgb(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return [f(5), f(3), f(1)];
}

/** ACI 1–255 → [r,g,b] (Näherung der Standardpalette für 10–249: Farbton in 15°-Schritten, Helligkeit/Sättigung je Stufe) */
export function aciRgb(i) {
  const n = Math.abs(Math.round(Number(i) || 7));
  if (ACI_FEST[n]) return ACI_FEST[n];
  if (ACI_GRAU[n] !== undefined) return [ACI_GRAU[n], ACI_GRAU[n], ACI_GRAU[n]];
  if (n >= 10 && n <= 249) {
    const h = Math.floor((n - 10) / 10) * 15;
    const r = (n - 10) % 10;
    const v = [1, 1, 0.8, 0.8, 0.6, 0.6, 0.5, 0.5, 0.3, 0.3][r];
    const s = r % 2 === 0 ? 1 : 0.5;
    return hsvRgb(h, s, v);
  }
  return [255, 255, 255];
}

/** Farbe für die Darstellung auf hellem Grund: Weiß/sehr helle Farben werden abgedunkelt (ACI 7 = Tinte) */
export function anzeigeFarbe({ aci = 7, rgb = null } = {}) {
  let [r, g, b] = rgb || aciRgb(aci);
  if (!rgb && Math.abs(aci) === 7) return "#151a24";
  const hell = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (hell > 0.72) {
    const f = 0.72 / hell;
    r = Math.round(r * f * 0.8);
    g = Math.round(g * f * 0.8);
    b = Math.round(b * f * 0.8);
  }
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

const rgbAus420 = (w) => {
  const n = Number(w);
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : null;
};

// ================================================================ Einlesen

/** Paare (Gruppencode, Wert) – tolerant gegenüber \r\n, Leerzeichen und fehlender Endzeile */
function paare(text) {
  const zeilen = String(text).split(/\r\n|\r|\n/);
  const codes = new Int32Array(Math.ceil(zeilen.length / 2));
  const werte = new Array(codes.length);
  let n = 0;
  for (let i = 0; i + 1 < zeilen.length; i += 2) {
    const c = parseInt(zeilen[i], 10);
    if (Number.isNaN(c)) {
      // aus dem Takt (z. B. Leerzeile) – eine Zeile weiter versuchen
      i -= 1;
      continue;
    }
    codes[n] = c;
    werte[n] = zeilen[i + 1];
    n++;
  }
  return { codes, werte, n };
}

const zahl = (w, std = 0) => {
  const n = parseFloat(w);
  return Number.isFinite(n) ? n : std;
};

/** Ist der Inhalt (Anfang) eine ASCII-DXF? Binär-DXF wird erkannt, aber nicht gelesen. */
export function dxfArt(anfang) {
  const s = typeof anfang === "string" ? anfang : new TextDecoder("latin1").decode(anfang.subarray ? anfang.subarray(0, 64) : anfang.slice(0, 64));
  if (s.startsWith("AutoCAD Binary DXF")) return "binaer";
  return /^\s*(?:999\s*[\r\n]+[^\r\n]*[\r\n]+\s*)*0\s*[\r\n]+\s*SECTION\b/.test(s.slice(0, 400)) ? "ascii" : "";
}

/**
 * DXF-Text lesen. Ergebnis: { version, header, layer: {name: {name, aci, rgb, aus, gefroren}}, bloecke: {name: {name, basis:[x,y], entitaeten}},
 * entitaeten: [...], zaehler: {TYP: n}, nichtUnterstuetzt: {TYP: n} }
 */
export function lesen(text, { maxEntitaeten = 2_000_000 } = {}) {
  const { codes, werte, n } = paare(text);
  const doc = { version: "", header: {}, layer: {}, bloecke: {}, entitaeten: [], zaehler: {}, nichtUnterstuetzt: {}, warnungen: [] };
  let i = 0;
  let abschnitt = "";
  let block = null; // aktueller Block (Abschnitt BLOCKS)
  let anzahl = 0;

  const naechsteEntitaet = () => {
    // Gruppen bis zum nächsten Code 0 lesen
    const felder = [];
    i++;
    while (i < n && codes[i] !== 0) {
      felder.push([codes[i], werte[i]]);
      i++;
    }
    return felder;
  };

  while (i < n) {
    const c = codes[i];
    const w = String(werte[i]).trim();
    if (c !== 0) {
      i++;
      continue;
    }
    if (w === "SECTION") {
      i++;
      abschnitt = codes[i] === 2 ? String(werte[i]).trim() : "";
      i++;
      if (abschnitt === "HEADER") i = headerLesen(codes, werte, n, i, doc);
      continue;
    }
    if (w === "ENDSEC") {
      abschnitt = "";
      block = null;
      i++;
      continue;
    }
    if (w === "EOF") break;
    if (abschnitt === "TABLES") {
      if (w === "LAYER") {
        const f = naechsteEntitaet();
        const l = layerAus(f);
        if (l && l.name) doc.layer[l.name] = l;
      } else {
        i++;
      }
      continue;
    }
    if (abschnitt === "BLOCKS") {
      if (w === "BLOCK") {
        const f = naechsteEntitaet();
        const name = wert(f, 2) || wert(f, 3) || "";
        block = { name, basis: [zahl(wert(f, 10)), zahl(wert(f, 20))], layer: wert(f, 8) || "0", entitaeten: [] };
        doc.bloecke[name] = block;
        continue;
      }
      if (w === "ENDBLK") {
        naechsteEntitaet();
        block = null;
        continue;
      }
      if (block) {
        const { ent, weiter } = entitaetLesen(codes, werte, n, i, doc);
        i = weiter;
        if (ent) block.entitaeten.push(ent);
        continue;
      }
      i++;
      continue;
    }
    if (abschnitt === "ENTITIES") {
      const { ent, weiter } = entitaetLesen(codes, werte, n, i, doc);
      i = weiter;
      if (ent && !ent.papier) {
        doc.entitaeten.push(ent);
        if (++anzahl > maxEntitaeten) {
          doc.warnungen.push(`Mehr als ${maxEntitaeten} Objekte – Rest nicht gelesen.`);
          break;
        }
      }
      continue;
    }
    i++;
  }
  doc.version = doc.header.$ACADVER || "";
  // Layer „0“ existiert immer
  if (!doc.layer["0"]) doc.layer["0"] = { name: "0", aci: 7, rgb: null, aus: false, gefroren: false };
  return doc;
}

function wert(felder, code) {
  for (const [c, w] of felder) if (c === code) return String(w).trim();
  return undefined;
}

function headerLesen(codes, werte, n, i, doc) {
  let variable = "";
  while (i < n) {
    const c = codes[i];
    const w = String(werte[i]).trim();
    if (c === 0 && w === "ENDSEC") return i;
    if (c === 9) variable = w;
    else if (variable === "$INSUNITS" && c === 70) doc.header.$INSUNITS = parseInt(w, 10) || 0;
    else if (variable === "$ACADVER" && c === 1) doc.header.$ACADVER = w;
    else if ((variable === "$EXTMIN" || variable === "$EXTMAX") && (c === 10 || c === 20)) {
      doc.header[variable] ||= [0, 0];
      doc.header[variable][c === 10 ? 0 : 1] = zahl(w);
    }
    i++;
  }
  return i;
}

function layerAus(f) {
  const name = wert(f, 2);
  if (!name) return null;
  const aci = parseInt(wert(f, 62) ?? "7", 10);
  const flags = parseInt(wert(f, 70) ?? "0", 10) || 0;
  const tc = wert(f, 420);
  return { name, aci: Math.abs(aci) || 7, rgb: tc !== undefined ? rgbAus420(tc) : null, aus: aci < 0, gefroren: (flags & 1) === 1 };
}

/** Allgemeine Eigenschaften aus den Gruppencodes */
function basisEigenschaften(e, c, w) {
  switch (c) {
    case 8: e.layer = String(w).trim(); return true;
    case 62: e.aci = parseInt(w, 10); return true;
    case 420: e.rgb = rgbAus420(w); return true;
    case 60: e.unsichtbar = parseInt(w, 10) === 1; return true;
    case 67: e.papier = parseInt(w, 10) === 1; return true;
    case 230: e.ez = zahl(w, 1); return true;
    default: return false;
  }
}

/** Liest die Entität ab Index i (Code 0) inkl. Folgeobjekten (VERTEX/SEQEND, ATTRIB). */
function entitaetLesen(codes, werte, n, i, doc) {
  const typ = String(werte[i]).trim();
  doc.zaehler[typ] = (doc.zaehler[typ] || 0) + 1;
  i++;
  const e = { typ, layer: "0", aci: 256 };
  const f = []; // typspezifische Paare
  while (i < n && codes[i] !== 0) {
    if (!basisEigenschaften(e, codes[i], werte[i])) f.push([codes[i], werte[i]]);
    i++;
  }
  switch (typ) {
    case "LINE":
      e.p1 = [zahl(wert(f, 10)), zahl(wert(f, 20))];
      e.p2 = [zahl(wert(f, 11)), zahl(wert(f, 21))];
      break;
    case "POINT":
      e.p = [zahl(wert(f, 10)), zahl(wert(f, 20))];
      break;
    case "CIRCLE":
      e.m = [zahl(wert(f, 10)), zahl(wert(f, 20))];
      e.r = zahl(wert(f, 40));
      break;
    case "ARC":
      e.m = [zahl(wert(f, 10)), zahl(wert(f, 20))];
      e.r = zahl(wert(f, 40));
      e.a1 = zahl(wert(f, 50));
      e.a2 = zahl(wert(f, 51));
      break;
    case "ELLIPSE":
      e.m = [zahl(wert(f, 10)), zahl(wert(f, 20))];
      e.achse = [zahl(wert(f, 11)), zahl(wert(f, 21))];
      e.verhaeltnis = zahl(wert(f, 40), 1);
      e.t1 = zahl(wert(f, 41), 0);
      e.t2 = zahl(wert(f, 42), Math.PI * 2);
      break;
    case "LWPOLYLINE": {
      e.geschlossen = ((parseInt(wert(f, 70) ?? "0", 10) || 0) & 1) === 1;
      e.punkte = [];
      let akt = null;
      for (const [c, w] of f) {
        if (c === 10) {
          akt = { x: zahl(w), y: 0, b: 0 };
          e.punkte.push(akt);
        } else if (c === 20 && akt) akt.y = zahl(w);
        else if (c === 42 && akt) akt.b = zahl(w);
      }
      break;
    }
    case "POLYLINE": {
      const flags = parseInt(wert(f, 70) ?? "0", 10) || 0;
      e.geschlossen = (flags & 1) === 1;
      e.netz = (flags & 16) === 16 || (flags & 64) === 64;
      e.punkte = [];
      // VERTEX … SEQEND
      while (i < n && codes[i] === 0 && String(werte[i]).trim() === "VERTEX") {
        i++;
        const v = { x: 0, y: 0, b: 0, flags: 0 };
        while (i < n && codes[i] !== 0) {
          const c = codes[i];
          if (c === 10) v.x = zahl(werte[i]);
          else if (c === 20) v.y = zahl(werte[i]);
          else if (c === 42) v.b = zahl(werte[i]);
          else if (c === 70) v.flags = parseInt(werte[i], 10) || 0;
          i++;
        }
        if (!(v.flags & 128) && !(v.flags & 16)) e.punkte.push(v); // keine Flächennetz-Datensätze/Spline-Rahmenpunkte
      }
      if (i < n && codes[i] === 0 && String(werte[i]).trim() === "SEQEND") {
        i++;
        while (i < n && codes[i] !== 0) i++;
      }
      break;
    }
    case "TEXT":
    case "ATTRIB":
    case "ATTDEF": {
      e.p = [zahl(wert(f, 10)), zahl(wert(f, 20))];
      const ha = parseInt(wert(f, 72) ?? "0", 10) || 0;
      const va = parseInt(wert(f, typ === "TEXT" ? 73 : 74) ?? "0", 10) || 0;
      if ((ha || va) && wert(f, 11) !== undefined) e.p = [zahl(wert(f, 11)), zahl(wert(f, 21))];
      e.h = zahl(wert(f, 40), 1);
      e.text = textBereinigen(wert(f, 1) || "");
      e.rot = (zahl(wert(f, 50)) * Math.PI) / 180;
      e.ha = [0, 1, 2, 1, 1, 1][ha] ?? 0; // 3 aligned, 4 middle, 5 fit → mittig
      e.va = ha === 4 ? 2 : va; // 0 Grundlinie, 1 unten, 2 Mitte, 3 oben
      if (typ !== "TEXT") e.unsichtbar = e.unsichtbar || ((parseInt(wert(f, 70) ?? "0", 10) || 0) & 1) === 1;
      if (typ === "ATTDEF") e.unsichtbar = true; // Attributdefinitionen im Block nicht zeichnen
      break;
    }
    case "MTEXT": {
      e.p = [zahl(wert(f, 10)), zahl(wert(f, 20))];
      e.h = zahl(wert(f, 40), 1);
      const teile = f.filter(([c]) => c === 3).map(([, w]) => w);
      e.text = mtextBereinigen(teile.join("") + (wert(f, 1) || ""));
      const dx = wert(f, 11);
      e.rot = dx !== undefined ? Math.atan2(zahl(wert(f, 21)), zahl(dx)) : (zahl(wert(f, 50)) * Math.PI) / 180;
      const anker = parseInt(wert(f, 71) ?? "1", 10) || 1; // 1 oben links … 9 unten rechts
      e.ha = (anker - 1) % 3;
      e.va = [3, 2, 1][Math.floor((anker - 1) / 3)] ?? 3;
      e.mehrzeilig = true;
      break;
    }
    case "INSERT": {
      e.block = wert(f, 2) || "";
      e.p = [zahl(wert(f, 10)), zahl(wert(f, 20))];
      e.sx = zahl(wert(f, 41), 1) || 1;
      e.sy = zahl(wert(f, 42), 1) || 1;
      e.rot = (zahl(wert(f, 50)) * Math.PI) / 180;
      e.spalten = Math.max(1, Math.min(1000, parseInt(wert(f, 70) ?? "1", 10) || 1));
      e.reihen = Math.max(1, Math.min(1000, parseInt(wert(f, 71) ?? "1", 10) || 1));
      e.dx = zahl(wert(f, 44));
      e.dy = zahl(wert(f, 45));
      e.attribute = [];
      if (parseInt(wert(f, 66) ?? "0", 10) === 1) {
        while (i < n && codes[i] === 0 && String(werte[i]).trim() === "ATTRIB") {
          const r = entitaetLesen(codes, werte, n, i, doc);
          i = r.weiter;
          if (r.ent) e.attribute.push(r.ent);
        }
        if (i < n && codes[i] === 0 && String(werte[i]).trim() === "SEQEND") {
          i++;
          while (i < n && codes[i] !== 0) i++;
        }
      }
      break;
    }
    case "DIMENSION":
      e.block = wert(f, 2) || "";
      break;
    case "SPLINE": {
      const fit = [];
      const ctrl = [];
      let akt = null;
      let liste = null;
      for (const [c, w] of f) {
        if (c === 10 || c === 11) {
          liste = c === 10 ? ctrl : fit;
          akt = { x: zahl(w), y: 0, b: 0 };
          liste.push(akt);
        } else if ((c === 20 || c === 21) && akt) akt.y = zahl(w);
      }
      e.punkte = fit.length >= 2 ? fit : ctrl;
      e.geschlossen = ((parseInt(wert(f, 70) ?? "0", 10) || 0) & 1) === 1;
      e.naeherung = true;
      break;
    }
    default:
      doc.nichtUnterstuetzt[typ] = (doc.nichtUnterstuetzt[typ] || 0) + 1;
      return { ent: null, weiter: i };
  }
  return { ent: e, weiter: i };
}

/** TEXT: Steuerzeichen %%c/%%d/%%p und Unterstreichungen */
function textBereinigen(s) {
  return String(s).replace(/%%[cC]/g, "Ø").replace(/%%[dD]/g, "°").replace(/%%[pP]/g, "±").replace(/%%[uUoOkK]/g, "").replace(/%%%/g, "%");
}

/** MTEXT: Formatcodes entfernen (\P Absatz, {\f…;} Schrift, \H…; Höhe, \S a^b; Stapel …) */
export function mtextBereinigen(s) {
  return textBereinigen(String(s))
    .replace(/\\P/g, "\n")
    .replace(/\\~/g, " ")
    .replace(/\\[ACFHQTWfhpqtaw][^;\\]*;/g, "")
    .replace(/\\S([^;^#/]*)[\^#/]([^;]*);/g, "$1/$2")
    .replace(/\\[LlOoKkNX]/g, "")
    .replace(/\\\\/g, "\\")
    .replace(/[{}]/g, "")
    .replace(/\\U\+([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// ================================================================ Geometrie

const IDENT = [1, 0, 0, 1, 0, 0];
/** Matrix-Produkt m1 · m2 (2D-affin, [a,b,c,d,e,f]) */
export function mult(m1, m2) {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [a1 * a2 + c1 * b2, b1 * a2 + d1 * b2, a1 * c2 + c1 * d2, b1 * c2 + d1 * d2, a1 * e2 + c1 * f2 + e1, b1 * e2 + d1 * f2 + f1];
}
const anwenden = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const verschiebung = (x, y) => [1, 0, 0, 1, x, y];
const drehung = (r) => [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
const skalierung = (sx, sy) => [sx, 0, 0, sy, 0, 0];
const SPIEGEL_X = [-1, 0, 0, 1, 0, 0];

/** Bogen tessellieren: Mittelpunkt, Radius, Start-/Endwinkel (rad, gegen den Uhrzeigersinn) */
function bogenPunkte(mx, my, r, w1, w2, ziel) {
  let sweep = w2 - w1;
  while (sweep <= 0) sweep += Math.PI * 2;
  if (sweep > Math.PI * 2) sweep = Math.PI * 2;
  const n = Math.max(4, Math.min(128, Math.ceil(sweep / (Math.PI / 36))));
  for (let k = 0; k <= n; k++) {
    const w = w1 + (sweep * k) / n;
    ziel.push(mx + r * Math.cos(w), my + r * Math.sin(w));
  }
}

/** Polylinie mit Bulges → Punkte (flach), exakte Länge und (bei geschlossen) Fläche mit Kreissegmenten */
export function polylinie(punkte, geschlossen) {
  const out = [];
  let laenge = 0;
  let flaeche2 = 0; // doppelte Shoelace-Fläche
  let segment = 0; // Kreissegmente (vorzeichenbehaftet)
  const n = punkte.length;
  if (!n) return { pts: out, laenge: 0, flaeche: 0 };
  const grenze = geschlossen ? n : n - 1;
  out.push(punkte[0].x, punkte[0].y);
  for (let k = 0; k < grenze; k++) {
    const a = punkte[k];
    const b = punkte[(k + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const s = Math.hypot(dx, dy);
    flaeche2 += a.x * b.y - b.x * a.y;
    if (a.b && s > 0) {
      const theta = 4 * Math.atan(a.b); // eingeschlossener Winkel (vorzeichenbehaftet)
      const r = s / (2 * Math.sin(Math.abs(theta) / 2));
      laenge += Math.abs(theta) * r;
      segment += ((r * r) / 2) * (Math.abs(theta) - Math.sin(Math.abs(theta))) * Math.sign(theta);
      // Mittelpunkt
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const h = (s / 2) / Math.tan(theta / 2); // Abstand Sehnenmitte → Mittelpunkt (vorzeichenbehaftet)
      const cx = mx - (dy / s) * h;
      const cy = my + (dx / s) * h;
      const w1 = Math.atan2(a.y - cy, a.x - cx);
      const schritte = Math.max(2, Math.min(64, Math.ceil(Math.abs(theta) / (Math.PI / 36))));
      for (let j = 1; j <= schritte; j++) {
        const w = w1 + (theta * j) / schritte;
        out.push(cx + Math.abs(r) * Math.cos(w), cy + Math.abs(r) * Math.sin(w));
      }
    } else {
      laenge += s;
      out.push(b.x, b.y);
    }
  }
  const flaeche = geschlossen ? Math.abs(flaeche2 / 2 + segment) : 0;
  return { pts: out, laenge, flaeche };
}

/** Länge einer flachen Punktliste */
export function punkteLaenge(pts) {
  let l = 0;
  for (let k = 2; k < pts.length; k += 2) l += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
  return l;
}

/** Fläche einer flachen Punktliste (geschlossen, Shoelace) */
export function punkteFlaeche(pts) {
  let s = 0;
  const n = pts.length / 2;
  for (let k = 0; k < n; k++) {
    const j = (k + 1) % n;
    s += pts[2 * k] * pts[2 * j + 1] - pts[2 * j] * pts[2 * k + 1];
  }
  return Math.abs(s / 2);
}

function transformiere(pts, m) {
  if (m === IDENT) return pts;
  const out = new Array(pts.length);
  for (let k = 0; k < pts.length; k += 2) {
    out[k] = m[0] * pts[k] + m[2] * pts[k + 1] + m[4];
    out[k + 1] = m[1] * pts[k] + m[3] * pts[k + 1] + m[5];
  }
  return out;
}

const det = (m) => m[0] * m[3] - m[1] * m[2];

// ================================================================ Auflösen (Blöcke, Transformationen) → Primitive

/**
 * Primitive: { t: "p", L (Layer), aci, rgb, pts: [x0,y0,…], zu (geschlossen), laenge, flaeche, g (Objektnummer der
 * obersten Ebene), q (Quelltyp) } bzw. { t: "t", L, aci, rgb, x, y, h, rot, text, ha, va, g }.
 */
export function aufloesen(doc, { maxPrimitive = 1_500_000, maxTiefe = 12 } = {}) {
  const prims = [];
  const zaehler = { primitive: 0, abgeschnitten: false };
  let g = 0;

  const push = (p) => {
    if (prims.length >= maxPrimitive) {
      zaehler.abgeschnitten = true;
      return;
    }
    prims.push(p);
  };

  const farbeVon = (e, erbe) => {
    if (e.rgb) return { aci: e.aci, rgb: e.rgb };
    if (e.aci === 0) return { aci: erbe.aci, rgb: erbe.rgb }; // BYBLOCK
    if (e.aci === 256 || e.aci === undefined || Number.isNaN(e.aci)) return null; // BYLAYER → später
    return { aci: Math.abs(e.aci), rgb: null };
  };

  const zeichne = (e, m, erbe, tiefe) => {
    if (e.unsichtbar) return;
    const layer = e.layer === "0" && erbe.layer ? erbe.layer : e.layer || "0";
    const f = farbeVon(e, erbe) || { aci: null, rgb: null }; // null = BYLAYER
    let mm = m;
    if (e.ez !== undefined && e.ez < 0) mm = mult(m, SPIEGEL_X);
    const basis = { L: layer, aci: f.aci, rgb: f.rgb, g: erbe.g, i: erbe.i, q: e.typ };
    switch (e.typ) {
      case "LINE": {
        const pts = transformiere([e.p1[0], e.p1[1], e.p2[0], e.p2[1]], mm);
        push({ t: "p", ...basis, pts, zu: false, laenge: punkteLaenge(pts), flaeche: 0 });
        break;
      }
      case "POINT": {
        const [x, y] = anwenden(mm, e.p[0], e.p[1]);
        push({ t: "p", ...basis, pts: [x, y, x, y], zu: false, laenge: 0, flaeche: 0, punkt: true });
        break;
      }
      case "CIRCLE": {
        const roh = [];
        bogenPunkte(e.m[0], e.m[1], e.r, 0, Math.PI * 2, roh);
        const pts = transformiere(roh, mm);
        const s = Math.abs(det(mm));
        push({ t: "p", ...basis, pts, zu: true, laenge: 2 * Math.PI * e.r * Math.sqrt(s), flaeche: Math.PI * e.r * e.r * s });
        break;
      }
      case "ARC": {
        const roh = [];
        bogenPunkte(e.m[0], e.m[1], e.r, (e.a1 * Math.PI) / 180, (e.a2 * Math.PI) / 180, roh);
        const pts = transformiere(roh, mm);
        push({ t: "p", ...basis, pts, zu: false, laenge: punkteLaenge(pts), flaeche: 0 });
        break;
      }
      case "ELLIPSE": {
        const a = Math.hypot(e.achse[0], e.achse[1]);
        const w = Math.atan2(e.achse[1], e.achse[0]);
        const b = a * e.verhaeltnis;
        let t1 = e.t1;
        let t2 = e.t2;
        while (t2 <= t1) t2 += Math.PI * 2;
        const voll = t2 - t1 >= Math.PI * 2 - 1e-9;
        const nS = Math.max(8, Math.min(128, Math.ceil((t2 - t1) / (Math.PI / 36))));
        const roh = [];
        for (let k = 0; k <= nS; k++) {
          const t = t1 + ((t2 - t1) * k) / nS;
          const x = a * Math.cos(t);
          const y = b * Math.sin(t);
          roh.push(e.m[0] + x * Math.cos(w) - y * Math.sin(w), e.m[1] + x * Math.sin(w) + y * Math.cos(w));
        }
        const pts = transformiere(roh, mm);
        push({ t: "p", ...basis, pts, zu: voll, laenge: punkteLaenge(pts), flaeche: voll ? Math.PI * a * b * Math.abs(det(mm)) : 0 });
        break;
      }
      case "LWPOLYLINE":
      case "POLYLINE":
      case "SPLINE": {
        if (e.netz || !e.punkte?.length) break;
        const r = polylinie(e.punkte, e.geschlossen);
        const pts = transformiere(r.pts, mm);
        const s = Math.abs(det(mm));
        const gleichmaessig = Math.abs(Math.hypot(mm[0], mm[1]) - Math.hypot(mm[2], mm[3])) < 1e-9 * Math.max(1, Math.hypot(mm[0], mm[1]));
        push({ t: "p", ...basis, pts, zu: e.geschlossen, laenge: gleichmaessig ? r.laenge * Math.sqrt(s) : punkteLaenge(pts), flaeche: r.flaeche * s, naeherung: !!e.naeherung });
        break;
      }
      case "TEXT":
      case "ATTRIB":
      case "MTEXT": {
        if (!e.text) break;
        const [x, y] = anwenden(mm, e.p[0], e.p[1]);
        const sk = Math.sqrt(Math.abs(det(mm))) || 1;
        push({ t: "t", ...basis, x, y, h: e.h * sk, rot: e.rot + Math.atan2(mm[1], mm[0]), text: e.text, ha: e.ha, va: e.va, mehrzeilig: !!e.mehrzeilig });
        break;
      }
      case "INSERT":
      case "DIMENSION": {
        const blk = doc.bloecke[e.block];
        if (!blk || tiefe >= maxTiefe) break;
        const erbeNeu = { layer, aci: f.aci ?? erbe.aci, rgb: f.rgb ?? erbe.rgb, g: erbe.g, i: erbe.i };
        if (e.typ === "DIMENSION") {
          for (const k of blk.entitaeten) zeichne(k, mm, erbeNeu, tiefe + 1);
          break;
        }
        for (let sp = 0; sp < e.spalten; sp++) {
          for (let rh = 0; rh < e.reihen; rh++) {
            // Reihen/Spalten im gedrehten Blocksystem versetzt
            const off = anwenden(drehung(e.rot), sp * e.dx, rh * e.dy);
            const lokal = mult(mult(mult(verschiebung(e.p[0] + off[0], e.p[1] + off[1]), drehung(e.rot)), skalierung(e.sx, e.sy)), verschiebung(-blk.basis[0], -blk.basis[1]));
            const mNeu = mult(mm, lokal);
            const zelle = tiefe === 0 ? { ...erbeNeu, i: `${erbe.g}:${sp}:${rh}` } : erbeNeu; // jede Blockinstanz der obersten Ebene zählt einzeln
            for (const k of blk.entitaeten) zeichne(k, mNeu, zelle, tiefe + 1);
          }
        }
        for (const a of e.attribute || []) zeichne(a, mm, erbeNeu, tiefe + 1); // ATTRIB stehen in Weltkoordinaten des INSERT
        break;
      }
      default:
        break;
    }
  };

  for (const e of doc.entitaeten) {
    zeichne(e, IDENT, { layer: "", aci: 7, rgb: null, g, i: String(g) }, 0);
    g++;
  }
  zaehler.primitive = prims.length;
  zaehler.objekte = g;
  return { prims, zaehler };
}

/** Bounding Box über Primitive: [minX, minY, maxX, maxY] (null bei leer). Optional nur sichtbare Layer. */
export function bbox(prims, { layerAus = null } = {}) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of prims) {
    if (layerAus && layerAus.has(p.L)) continue;
    if (p.t === "t") {
      if (p.x < x0) x0 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.x > x1) x1 = p.x;
      if (p.y > y1) y1 = p.y;
      continue;
    }
    const pts = p.pts;
    for (let k = 0; k < pts.length; k += 2) {
      const x = pts[k];
      const y = pts[k + 1];
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  return Number.isFinite(x0) ? [x0, y0, x1, y1] : null;
}

/** Bounding Box je Primitiv (für Sichtbarkeitsprüfung/Trefferprüfung) – wird am Primitiv als p.bb gespeichert */
export function bboxenSetzen(prims) {
  for (const p of prims) {
    if (p.t === "t") {
      const r = p.h * Math.max(1, (p.text?.length || 1) * 0.7);
      p.bb = [p.x - r, p.y - r, p.x + r, p.y + r];
      continue;
    }
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const pts = p.pts;
    for (let k = 0; k < pts.length; k += 2) {
      if (pts[k] < x0) x0 = pts[k];
      if (pts[k] > x1) x1 = pts[k];
      if (pts[k + 1] < y0) y0 = pts[k + 1];
      if (pts[k + 1] > y1) y1 = pts[k + 1];
    }
    p.bb = [x0, y0, x1, y1];
  }
  return prims;
}

/** Punkt in Polygon (flache Punktliste, gerade-ungerade-Regel) */
export function punktInPolygon(x, y, pts) {
  let innen = false;
  const n = pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[2 * i];
    const yi = pts[2 * i + 1];
    const xj = pts[2 * j];
    const yj = pts[2 * j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) innen = !innen;
  }
  return innen;
}

// ================================================================ Layer-Konvention → Kennzahlen

/** Layer-Name normalisieren: klein, Trennzeichen „_“, Umlaute vereinfacht */
export const layerSchluessel = (name) => String(name || "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[\s\-.]+/g, "_");

/**
 * Konvention (Präfix, groß/klein egal, „-“/Leerzeichen = „_“):
 *   PV_Module*          Tische (Objekte bzw. Blockinstanzen der obersten Ebene mit geschlossener Kontur) und Modulfläche
 *   Zaun*               Zaunlänge (m)            Kabel_MS*   Trassenlänge Mittelspannung (m)
 *   Kabel_DC* / Kabel_AC*  Kabellängen (m)       Wege*       Wegefläche (m², geschlossene Konturen)
 *   Trafo*              Anzahl Stationen          Baugrenze*, Umgriff*, Anlagenflaeche*  Anlagenfläche (m² → ha)
 */
export const LAYER_KONVENTION = [
  { id: "module", praefix: ["pv_modul", "pv_tisch", "module"], label: "PV_Module", art: "tische" },
  { id: "zaun", praefix: ["zaun"], label: "Zaun", art: "laenge" },
  { id: "kabelMs", praefix: ["kabel_ms", "ms_kabel", "ms_trasse", "kabeltrasse_ms"], label: "Kabel_MS", art: "laenge" },
  { id: "kabelDc", praefix: ["kabel_dc", "dc_kabel"], label: "Kabel_DC", art: "laenge" },
  { id: "kabelAc", praefix: ["kabel_ac", "ac_kabel", "kabel_ns"], label: "Kabel_AC", art: "laenge" },
  { id: "wege", praefix: ["wege", "weg_", "zufahrt"], label: "Wege", art: "flaeche" },
  { id: "trafo", praefix: ["trafo", "station", "uebergabe"], label: "Trafostation", art: "anzahl" },
  { id: "anlage", praefix: ["baugrenze", "umgriff", "anlagenflaeche", "baufeld"], label: "Baugrenze", art: "flaeche" },
];

export function konventionVon(layerName) {
  const s = layerSchluessel(layerName);
  return LAYER_KONVENTION.find((k) => k.praefix.some((p) => s.startsWith(p))) || null;
}

/** Nennleistung je m² Modulfläche (kWp/m²) für die Schätzung – ~225 Wp/m² wie CARPORT in markt.js */
export const KWP_PRO_M2 = 0.225;

/**
 * Kennzahlen aus aufgelösten Primitiven (Werte in Metern/m² über die Einheit). Nur Layer nach Konvention; unbekannte
 * Layer werden ignoriert. Ergebnis: { einheit, tische, modulflaecheM2, kwpGeschaetzt, zaunM, kabelMsM, kabelDcM, kabelAcM,
 * wegeM2, trafos, anlageM2, anlageHa, layerGefunden: [..], hinweise: [..] }
 */
export function kennzahlen(prims, einheit = { m: 1 }) {
  const f = einheit.m || 1;
  const k = { tische: 0, modulflaecheM2: 0, zaunM: 0, kabelMsM: 0, kabelDcM: 0, kabelAcM: 0, wegeM2: 0, trafos: 0, anlageM2: 0 };
  const tischGruppen = new Set();
  const trafoGruppen = new Set();
  const gefunden = new Set();
  for (const p of prims) {
    if (p.t !== "p") continue;
    const konv = konventionVon(p.L);
    if (!konv) continue;
    gefunden.add(konv.label);
    switch (konv.id) {
      case "module":
        if (p.zu && p.flaeche > 0) {
          if (!p.loch) tischGruppen.add(p.i);
          k.modulflaecheM2 += (p.loch ? -1 : 1) * p.flaeche * f * f; // GeoJSON/Shapefile: Löcher abziehen
        }
        break;
      case "zaun":
        k.zaunM += p.laenge * f;
        break;
      case "kabelMs":
        k.kabelMsM += p.laenge * f;
        break;
      case "kabelDc":
        k.kabelDcM += p.laenge * f;
        break;
      case "kabelAc":
        k.kabelAcM += p.laenge * f;
        break;
      case "wege":
        if (p.zu) k.wegeM2 += (p.loch ? -1 : 1) * p.flaeche * f * f;
        break;
      case "trafo":
        trafoGruppen.add(p.i);
        break;
      case "anlage":
        if (p.zu) k.anlageM2 += (p.loch ? -1 : 1) * p.flaeche * f * f;
        break;
      default:
        break;
    }
  }
  k.tische = tischGruppen.size;
  k.trafos = trafoGruppen.size;
  const r = (x, s = 1) => Math.round(x * s) / s;
  const erg = {
    tische: k.tische,
    modulflaecheM2: r(k.modulflaecheM2),
    kwpGeschaetzt: r(k.modulflaecheM2 * KWP_PRO_M2),
    zaunM: r(k.zaunM, 10),
    kabelMsM: r(k.kabelMsM, 10),
    kabelDcM: r(k.kabelDcM, 10),
    kabelAcM: r(k.kabelAcM, 10),
    wegeM2: r(k.wegeM2),
    trafos: k.trafos,
    anlageM2: r(k.anlageM2),
    anlageHa: r(k.anlageM2 / 10000, 100),
    layerGefunden: [...gefunden],
    hinweise: [],
  };
  if (!gefunden.size) erg.hinweise.push("Keine Layer nach Konvention gefunden (PV_Module, Zaun, Kabel_MS, Wege, Trafostation, Baugrenze) – Kennzahlen bitte manuell erfassen.");
  if (einheit.angenommen) erg.hinweise.push("Zeichnung ohne Einheit ($INSUNITS = 0): Meter angenommen – bitte prüfen.");
  return erg;
}

/** Bytes → Text: UTF-8 (ab AutoCAD 2007), bei Ersatzzeichen Windows-1252 (ältere DXF mit $DWGCODEPAGE ANSI_1252) */
export function dxfDekodieren(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const utf8 = new TextDecoder("utf-8").decode(u8);
  if (!utf8.includes("�")) return utf8;
  try {
    return new TextDecoder("windows-1252").decode(u8);
  } catch {
    return utf8;
  }
}

/** Komplette Analyse eines DXF-Texts (Upload-Prüfung, Test): Zähler, Einheit, bbox, Layer, Kennzahlen */
export function analysieren(text, optionen = {}) {
  const doc = lesen(text, optionen);
  const { prims, zaehler } = aufloesen(doc, optionen);
  const e = einheitVon(doc);
  const aus = new Set(Object.values(doc.layer).filter((l) => l.aus || l.gefroren).map((l) => l.name));
  const bb = bbox(prims, { layerAus: aus }); // sichtbare Ausdehnung (ausgeschaltete/gefrorene Layer zählen nicht)
  const layerGenutzt = {};
  for (const p of prims) layerGenutzt[p.L] = (layerGenutzt[p.L] || 0) + 1;
  return {
    version: doc.version,
    einheit: { code: e.code, kurz: e.kurz, label: e.label, m: e.m, angenommen: !!e.angenommen },
    entitaeten: doc.entitaeten.length,
    zaehler: doc.zaehler,
    nichtUnterstuetzt: doc.nichtUnterstuetzt,
    bloecke: Object.keys(doc.bloecke).filter((b) => !b.startsWith("*")).length,
    primitive: zaehler.primitive,
    abgeschnitten: !!zaehler.abgeschnitten,
    bbox: bb,
    groesse: bb ? { breite: bb[2] - bb[0], hoehe: bb[3] - bb[1], breiteM: (bb[2] - bb[0]) * e.m, hoeheM: (bb[3] - bb[1]) * e.m } : null,
    layer: Object.values(doc.layer).map((l) => ({ name: l.name, aci: l.aci, farbe: anzeigeFarbe(l), aus: l.aus || l.gefroren, objekte: layerGenutzt[l.name] || 0, konvention: konventionVon(l.name)?.label || null })),
    kennzahlen: kennzahlen(prims, e),
    warnungen: doc.warnungen,
  };
}
