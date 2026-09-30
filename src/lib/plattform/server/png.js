// src/lib/plattform/server/png.js
//
// PNG lesen (ohne Fremdpakete) für den PDF-Erzeuger: 8 Bit je Kanal, nicht verschachtelt,
// Graustufen / RGB / Graustufen+Alpha / RGBA (so liefert Canvas.toDataURL("image/png")).
// Ergebnis: Farbdaten und Alphakanal getrennt und FlateDecode-komprimiert – direkt als
// PDF-Bild (XObject) mit weicher Maske (SMask) verwendbar.
//
// Nur serverseitig (node:zlib). Genutzt von der elektronischen Unterschrift (Prüfseite).

import { deflateSync, inflateSync } from "node:zlib";

const SIGNATUR = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const KANAELE = { 0: 1, 2: 3, 4: 2, 6: 4 };
const MAX_PIXEL = 4_000_000;

export class PngFehler extends Error {}

/** Ist das eine PNG-Datei (Magic Bytes)? */
export const istPng = (b) => Buffer.isBuffer(b) && b.length > 8 && b.subarray(0, 8).equals(SIGNATUR);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/**
 * PNG dekodieren. Liefert { breite, hoehe, farben (1|3), daten (Deflate), alpha (Deflate | null), leer (nur transparent/weiß) }.
 * Wirft PngFehler bei nicht unterstützten Formaten.
 */
export function pngLesen(buf) {
  if (!istPng(buf)) throw new PngFehler("Keine PNG-Datei.");
  let pos = 8;
  let kopf = null;
  const idat = [];
  while (pos + 8 <= buf.length) {
    const laenge = buf.readUInt32BE(pos);
    const typ = buf.toString("latin1", pos + 4, pos + 8);
    const inhalt = buf.subarray(pos + 8, pos + 8 + laenge);
    if (inhalt.length !== laenge) throw new PngFehler("PNG ist unvollständig.");
    if (typ === "IHDR") {
      kopf = { breite: inhalt.readUInt32BE(0), hoehe: inhalt.readUInt32BE(4), tiefe: inhalt[8], farbtyp: inhalt[9], interlace: inhalt[12] };
    } else if (typ === "IDAT") idat.push(inhalt);
    else if (typ === "IEND") break;
    pos += 12 + laenge;
  }
  if (!kopf || !idat.length) throw new PngFehler("PNG ohne Bilddaten.");
  const { breite: w, hoehe: h, tiefe, farbtyp, interlace } = kopf;
  const kanaele = KANAELE[farbtyp];
  if (tiefe !== 8 || !kanaele || interlace !== 0) throw new PngFehler("Nur PNG mit 8 Bit je Kanal (Graustufen, RGB, RGBA), nicht verschachtelt.");
  if (!w || !h || w * h > MAX_PIXEL) throw new PngFehler("Bild zu groß.");

  let roh;
  try {
    roh = inflateSync(Buffer.concat(idat));
  } catch {
    throw new PngFehler("PNG-Daten beschädigt.");
  }
  const zeile = w * kanaele;
  if (roh.length < h * (zeile + 1)) throw new PngFehler("PNG-Daten unvollständig.");

  const pixel = Buffer.alloc(h * zeile);
  for (let y = 0; y < h; y++) {
    const filter = roh[y * (zeile + 1)];
    const quelle = y * (zeile + 1) + 1;
    const ziel = y * zeile;
    for (let x = 0; x < zeile; x++) {
      const r = roh[quelle + x];
      const a = x >= kanaele ? pixel[ziel + x - kanaele] : 0;
      const b = y > 0 ? pixel[ziel - zeile + x] : 0;
      const c = y > 0 && x >= kanaele ? pixel[ziel - zeile + x - kanaele] : 0;
      let wert;
      if (filter === 0) wert = r;
      else if (filter === 1) wert = r + a;
      else if (filter === 2) wert = r + b;
      else if (filter === 3) wert = r + ((a + b) >> 1);
      else if (filter === 4) wert = r + paeth(a, b, c);
      else throw new PngFehler("Unbekannter PNG-Filter.");
      pixel[ziel + x] = wert & 0xff;
    }
  }

  const farben = kanaele >= 3 ? 3 : 1;
  const mitAlpha = kanaele === 2 || kanaele === 4;
  const farbe = Buffer.alloc(w * h * farben);
  const alpha = mitAlpha ? Buffer.alloc(w * h) : null;
  let sichtbar = 0;
  for (let i = 0; i < w * h; i++) {
    for (let k = 0; k < farben; k++) farbe[i * farben + k] = pixel[i * kanaele + k];
    if (alpha) alpha[i] = pixel[i * kanaele + kanaele - 1];
    const deckend = alpha ? alpha[i] > 16 : true;
    const hell = pixel[i * kanaele] > 235 && (farben === 1 || (pixel[i * kanaele + 1] > 235 && pixel[i * kanaele + 2] > 235));
    if (deckend && !hell) sichtbar++;
  }
  return { breite: w, hoehe: h, farben, daten: deflateSync(farbe), alpha: alpha ? deflateSync(alpha) : null, sichtbarePixel: sichtbar };
}
