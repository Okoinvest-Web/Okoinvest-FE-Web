// src/lib/plattform/server/pdf.js
//
// Kleiner PDF-Erzeuger ohne Fremdpakete: mehrere Seiten (A4), Standardschriften Helvetica und
// Helvetica-Bold (WinAnsi/CP1252, also mit Umlauten, ß, €, „“ – –), Flächen, Linien, Farben,
// Textbreiten nach den Adobe-Metriken (für sauberen Zeilenumbruch). Koordinaten: Punkte, Ursprung
// OBEN links (wird intern umgerechnet), y beim Text = Grundlinie.
//
// Nur serverseitig (Buffer). Genutzt für Exposé-PDFs und die Demo-Dokumente.

export const A4 = { breite: 595.28, hoehe: 841.89 };

// Zeichenbreiten (1/1000 em) für die Zeichen 32–126
const W_REG = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const W_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];
// Sonderzeichen: [Breite normal, Breite fett, CP1252-Code]
const SONDER = {
  "€": [556, 556, 0x80], "‚": [222, 278, 0x82], "„": [333, 500, 0x84], "…": [1000, 1000, 0x85], "‰": [1000, 1000, 0x89],
  "‘": [222, 278, 0x91], "’": [222, 278, 0x92], "“": [333, 500, 0x93], "”": [333, 500, 0x94], "•": [350, 350, 0x95],
  "–": [556, 556, 0x96], "—": [1000, 1000, 0x97], "™": [1000, 1000, 0x99], "ß": [611, 611, 0xdf], "·": [278, 278, 0xb7],
  "°": [400, 400, 0xb0], "²": [333, 333, 0xb2], "³": [333, 333, 0xb3], "×": [584, 584, 0xd7], "«": [556, 556, 0xab],
  "»": [556, 556, 0xbb], "§": [556, 556, 0xa7], "©": [737, 737, 0xa9], "®": [737, 737, 0xae], "±": [584, 584, 0xb1],
};
const ERSATZ = [
  [/[    ]/g, " "], [/≥/g, ">="], [/≤/g, "<="], [/→/g, "->"], [/≈/g, "ca. "], [/[‐‑]/g, "-"],
  [/[​-‍﻿]/g, ""], [/\t/g, " "],
];

/** Text für die Ausgabe vereinheitlichen (Zeichen außerhalb von CP1252 ersetzen) */
export function normalisieren(s) {
  let t = String(s ?? "");
  for (const [re, x] of ERSATZ) t = t.replace(re, x);
  return t;
}

function zeichen(c) {
  const code = c.charCodeAt(0);
  if (code >= 32 && code <= 126) return { code, basis: c };
  if (SONDER[c]) return { code: SONDER[c][2], sonder: SONDER[c] };
  if (code >= 0xa0 && code <= 0xff) {
    const basis = c.normalize("NFD")[0];
    return { code, basis: basis.charCodeAt(0) >= 32 && basis.charCodeAt(0) <= 126 ? basis : "o" };
  }
  return { code: 63, basis: "?" };
}

/** Breite eines Texts in Punkten */
export function textBreite(text, groesse = 10, fett = false) {
  let summe = 0;
  for (const c of normalisieren(text)) {
    const z = zeichen(c);
    if (z.sonder) summe += z.sonder[fett ? 1 : 0];
    else summe += (fett ? W_BOLD : W_REG)[z.basis.charCodeAt(0) - 32] ?? 556;
  }
  return (summe * groesse) / 1000;
}

/** Zeilenumbruch nach Breite (Wörter; überlange Wörter werden hart getrennt) */
export function umbrechen(text, maxBreite, groesse = 10, fett = false) {
  const zeilen = [];
  for (const absatz of normalisieren(text).split(/\n/)) {
    const woerter = absatz.split(/ +/).filter((w, i, a) => w || a.length === 1);
    let zeile = "";
    for (let wort of woerter) {
      while (textBreite(wort, groesse, fett) > maxBreite && wort.length > 1) {
        // überlanges Wort (z. B. URL) zerlegen
        let n = wort.length - 1;
        while (n > 1 && textBreite(wort.slice(0, n), groesse, fett) > maxBreite) n--;
        if (zeile) {
          zeilen.push(zeile);
          zeile = "";
        }
        zeilen.push(wort.slice(0, n));
        wort = wort.slice(n);
      }
      const versuch = zeile ? `${zeile} ${wort}` : wort;
      if (textBreite(versuch, groesse, fett) <= maxBreite) zeile = versuch;
      else {
        if (zeile) zeilen.push(zeile);
        zeile = wort;
      }
    }
    zeilen.push(zeile);
  }
  return zeilen;
}

/** PDF-Stringliteral (Bytes in CP1252, maskiert) */
function literal(text) {
  let s = "";
  for (const c of normalisieren(text)) {
    const { code } = zeichen(c);
    if (code === 0x28 || code === 0x29 || code === 0x5c) s += "\\" + String.fromCharCode(code);
    else if (code < 32) s += " ";
    else s += String.fromCharCode(code);
  }
  return `(${s})`;
}

function farbe(hex, fuellen = true) {
  const h = String(hex || "#000000").replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3));
  return `${r} ${g} ${b} ${fuellen ? "rg" : "RG"}`;
}

const zahl = (n) => (Math.round(n * 100) / 100).toString();

class Seite {
  constructor(dok) {
    this.dok = dok;
    this.ops = [];
  }

  y(oben) {
    return zahl(this.dok.hoehe - oben);
  }

  rechteck(x, y, b, h, fuellung, { rand, randBreite = 0.75 } = {}) {
    const pfad = `${zahl(x)} ${this.y(y + h)} ${zahl(b)} ${zahl(h)} re`;
    if (fuellung && rand) this.ops.push(`${farbe(fuellung)} ${farbe(rand, false)} ${zahl(randBreite)} w ${pfad} B`);
    else if (fuellung) this.ops.push(`${farbe(fuellung)} ${pfad} f`);
    else if (rand) this.ops.push(`${farbe(rand, false)} ${zahl(randBreite)} w ${pfad} S`);
    return this;
  }

  linie(x1, y1, x2, y2, { farbe: f = "#dfe3ea", breite = 0.75 } = {}) {
    this.ops.push(`${farbe(f, false)} ${zahl(breite)} w ${zahl(x1)} ${this.y(y1)} m ${zahl(x2)} ${this.y(y2)} l S`);
    return this;
  }

  /** Text an Grundlinie y; `ausrichtung` links | rechts | mitte (bezogen auf x) */
  text(x, y, text, { groesse = 10, fett = false, farbe: f = "#151a24", ausrichtung = "links", zeichenabstand = 0 } = {}) {
    const t = normalisieren(text);
    if (!t) return this;
    const breite = textBreite(t, groesse, fett) + zeichenabstand * Math.max(0, t.length - 1);
    const xs = ausrichtung === "rechts" ? x - breite : ausrichtung === "mitte" ? x - breite / 2 : x;
    const tc = `${zahl(zeichenabstand)} Tc `; // Zeichenabstand gilt über BT/ET hinaus – immer explizit setzen
    this.ops.push(`BT ${farbe(f)} /${fett ? "F2" : "F1"} ${zahl(groesse)} Tf ${tc}${zahl(xs)} ${this.y(y)} Td ${literal(t)} Tj ET`);
    return this;
  }

  /** Mehrzeiliger Text ab Grundlinie y, liefert die y-Position nach der letzten Zeile */
  absatz(x, y, text, { breite, groesse = 10, fett = false, farbe: f, zeilenhoehe } = {}) {
    const zh = zeilenhoehe || groesse * 1.45;
    let yy = y;
    for (const z of umbrechen(text, breite, groesse, fett)) {
      this.text(x, yy, z, { groesse, fett, farbe: f });
      yy += zh;
    }
    return yy - zh;
  }

  /**
   * Bild (aus server/png.js → pngLesen) in das Rechteck x/y (oben links), Breite b, Höhe h zeichnen.
   * Elektronische Unterschrift: gezeichnete Signatur auf der Prüfseite.
   */
  bild(x, y, b, h, bild) {
    if (!bild?.daten) return this;
    const name = this.dok.bildName(bild);
    this.ops.push(`q ${zahl(b)} 0 0 ${zahl(h)} ${zahl(x)} ${this.y(y + h)} cm /${name} Do Q`);
    return this;
  }

  inhalt() {
    return this.ops.join("\n");
  }
}

export class PdfDokument {
  constructor({ titel = "Dokument", autor = "ÖkoInvest GmbH", thema = "" } = {}) {
    this.breite = A4.breite;
    this.hoehe = A4.hoehe;
    this.titel = titel;
    this.autor = autor;
    this.thema = thema;
    this.seiten = [];
    this.bilder = []; // Bilder (Image-XObjects) für Seite.bild()
  }

  /** Ressourcenname eines Bildes (jedes Bild wird einmal eingebettet) */
  bildName(bild) {
    let i = this.bilder.indexOf(bild);
    if (i < 0) i = this.bilder.push(bild) - 1;
    return `Im${i + 1}`;
  }

  seite() {
    const s = new Seite(this);
    this.seiten.push(s);
    return s;
  }

  /** Fertiges PDF als Buffer */
  alsBuffer() {
    if (!this.seiten.length) this.seite();
    const objekte = [];
    const neu = (inhalt) => objekte.push(inhalt) && objekte.length;
    const katalog = neu(null);
    const seitenbaum = neu(null);
    const f1 = neu("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    const f2 = neu("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    // Bilder (Seite.bild) als Image-XObjects: FlateDecode, Alphakanal als weiche Maske (SMask)
    const bildRefs = (this.bilder || []).map((b, i) => {
      const maske = b.alpha
        ? neu(`<< /Type /XObject /Subtype /Image /Width ${b.breite} /Height ${b.hoehe} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${b.alpha.length} >>\nstream\n${b.alpha.toString("latin1")}\nendstream`)
        : null;
      const nr = neu(
        `<< /Type /XObject /Subtype /Image /Width ${b.breite} /Height ${b.hoehe} /ColorSpace /${b.farben === 1 ? "DeviceGray" : "DeviceRGB"} /BitsPerComponent 8 /Filter /FlateDecode${maske ? ` /SMask ${maske} 0 R` : ""} /Length ${b.daten.length} >>\nstream\n${b.daten.toString("latin1")}\nendstream`
      );
      return `/Im${i + 1} ${nr} 0 R`;
    });
    const xobjekte = bildRefs.length ? ` /XObject << ${bildRefs.join(" ")} >>` : "";
    const kinder = [];
    for (const s of this.seiten) {
      const inhalt = s.inhalt();
      const strom = neu(`<< /Length ${Buffer.byteLength(inhalt, "latin1")} >>\nstream\n${inhalt}\nendstream`);
      kinder.push(
        neu(`<< /Type /Page /Parent ${seitenbaum} 0 R /MediaBox [0 0 ${zahl(this.breite)} ${zahl(this.hoehe)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >>${xobjekte} >> /Contents ${strom} 0 R >>`)
      );
    }
    objekte[katalog - 1] = `<< /Type /Catalog /Pages ${seitenbaum} 0 R >>`;
    objekte[seitenbaum - 1] = `<< /Type /Pages /Kids [${kinder.map((k) => `${k} 0 R`).join(" ")}] /Count ${kinder.length} >>`;
    const d = new Date();
    const pdfDatum = `D:${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}${String(d.getUTCSeconds()).padStart(2, "0")}Z`;
    const info = neu(`<< /Title ${literal(this.titel)} /Author ${literal(this.autor)} /Subject ${literal(this.thema)} /Producer (OekoInvest Plattform) /CreationDate (${pdfDatum}) >>`);

    let pdf = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
    const offsets = [];
    objekte.forEach((o, i) => {
      offsets.push(Buffer.byteLength(pdf, "latin1"));
      pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
    });
    const xref = Buffer.byteLength(pdf, "latin1");
    pdf += `xref\n0 ${objekte.length + 1}\n0000000000 65535 f \n`;
    pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
    pdf += `trailer\n<< /Size ${objekte.length + 1} /Root ${katalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(pdf, "latin1");
  }
}
