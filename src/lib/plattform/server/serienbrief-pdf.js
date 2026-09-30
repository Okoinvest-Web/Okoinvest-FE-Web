// src/lib/plattform/server/serienbrief-pdf.js
//
// Druck-PDF der Akquise-Kampagnen: je Empfänger ein Brief (Seite 1: Anschreiben nach DIN 5008 Form B mit Faltmarken,
// Flächendaten, Link + QR-Code zur Angebotsseite, Widerspruchshinweis; Seite 2: Datenschutzinformation).
// Nutzt den vorhandenen PDF-Erzeuger (server/pdf.js) und den QR-Erzeuger (lib/plattform/qr.js). Nur serverseitig.

import { PdfDokument } from "./pdf";
import { qrMatrix } from "../qr";

const MM = 72 / 25.4;
const NAVY = "#003473";
const GRUEN = "#669933";
const TEXT = "#1f2933";
const GRAU = "#52606d";

function qrZeichnen(s, x, y, groesse, text) {
  const m = qrMatrix(text);
  const n = m.length;
  const rand = 2;
  const zelle = groesse / (n + rand * 2);
  s.rechteck(x, y, groesse, groesse, "#ffffff");
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!m[r][c]) continue;
      // benachbarte dunkle Zellen einer Zeile zusammenfassen (kleinere Datei)
      let l = 1;
      while (c + l < n && m[r][c + l]) l++;
      s.rechteck(x + (rand + c) * zelle, y + (rand + r) * zelle, zelle * l + 0.05, zelle + 0.05, "#000000");
      c += l - 1;
    }
  }
}

function briefSeiten(doc, b, { demo = false } = {}) {
  const s = doc.seite();
  const links = 25 * MM;
  const breite = doc.breite - links - 20 * MM;
  // Kopf
  s.text(links, 18 * MM, "ÖkoInvest", { groesse: 17, fett: true, farbe: NAVY });
  s.text(links + 88, 18 * MM, "GmbH", { groesse: 9, farbe: GRUEN, fett: true });
  s.text(doc.breite - 20 * MM, 16 * MM, "Ein Unternehmen der ÖKOVOLT Gruppe", { groesse: 7.5, farbe: GRAU, ausrichtung: "rechts" });
  if (demo) s.text(doc.breite - 20 * MM, 21 * MM, "DEMO – fiktive Daten, nicht versenden", { groesse: 7.5, fett: true, farbe: "#b42318", ausrichtung: "rechts" });
  // Faltmarken (105 mm, 210 mm) und Lochmarke (148,5 mm)
  for (const [y, l] of [[105, 5], [148.5, 7], [210, 5]]) s.linie(3 * MM, y * MM, (3 + l) * MM, y * MM, { farbe: "#97a0b0", breite: 0.5 });
  // Anschriftfeld Form B: 45 mm von oben, 20 mm von links, 85 × 45 mm – nur Rücksendeangabe + Anschrift
  const fx = 20 * MM + 5 * MM;
  s.text(fx, 50 * MM, b.absenderZeile, { groesse: 6.5, farbe: GRAU });
  s.linie(fx, 51 * MM, fx + 80 * MM, 51 * MM, { farbe: "#c5ccd6", breite: 0.4 });
  let y = 58 * MM;
  for (const z of b.anschrift.slice(0, 6)) {
    s.text(fx, y, z, { groesse: 10.5, farbe: TEXT });
    y += 13;
  }
  // Informationsblock rechts
  const ix = 125 * MM;
  s.text(ix, 58 * MM, "Unser Zeichen", { groesse: 7, farbe: GRAU });
  s.text(ix, 58 * MM + 11, b.zeichen, { groesse: 8, farbe: TEXT });
  s.text(ix, 58 * MM + 30, "Ihr persönlicher Code", { groesse: 7, farbe: GRAU });
  s.text(ix, 58 * MM + 42, b.code, { groesse: 11, fett: true, farbe: NAVY, zeichenabstand: 0.6 });
  s.text(ix, 58 * MM + 62, b.datum, { groesse: 8.5, farbe: TEXT });
  // Betreff und Text
  y = 100 * MM;
  y = s.absatz(links, y, b.betreff, { breite, groesse: 11.5, fett: true, farbe: NAVY, zeilenhoehe: 15 }) + 22;
  for (const absatz of `${b.text}\n\n${b.keinInteresse}`.split(/\n/)) {
    if (!absatz.trim()) {
      y += 6;
      continue;
    }
    y = s.absatz(links, y, absatz, { breite, groesse: 9.6, farbe: TEXT, zeilenhoehe: 12.9 }) + 12.9;
  }
  // Flächendaten + QR-Box
  y += 4;
  const boxH = 92;
  const qr = 82;
  s.rechteck(links, y, breite, boxH, "#f3f6ef", { rand: "#d9e2d0", randBreite: 0.6 });
  let yy = y + 16;
  for (const [k, v] of b.flaechenDaten) {
    s.text(links + 10, yy, k, { groesse: 8, farbe: GRAU });
    s.absatz(links + 105, yy, String(v || "–"), { breite: breite - qr - 130, groesse: 8.6, farbe: TEXT, zeilenhoehe: 10.5 });
    yy += 15;
  }
  qrZeichnen(s, links + breite - qr - 7, y + 7, qr, b.link);
  y += boxH + 14;
  s.text(links, y, "Ihr persönlicher Steckbrief und Pachtrechner:", { groesse: 8.5, fett: true, farbe: NAVY });
  s.text(links, y + 12, b.link, { groesse: 8.5, farbe: TEXT });
  y += 30;
  // Gruß
  for (const g of b.gruss) {
    s.text(links, y, g, { groesse: 9.8, farbe: TEXT });
    y += g ? 13 : 8;
  }
  // Widerspruch (hervorgehoben, unten auf Seite 1; reicht der Platz nicht, Verweis – vollständig auf Seite 2)
  const wy = Math.max(y + 6, doc.hoehe - 36 * MM);
  if (wy + 44 <= doc.hoehe - 16 * MM) {
    s.rechteck(links, wy, breite, 44, "#fff6e5", { rand: "#c98a00", randBreite: 0.6 });
    s.absatz(links + 8, wy + 13, b.widerspruch, { breite: breite - 16, groesse: 7.6, farbe: "#5c3d00", zeilenhoehe: 9.6 });
  } else {
    s.text(links, Math.min(y + 4, doc.hoehe - 17 * MM), "Widerspruchsrecht (Art. 21 DSGVO) und Datenschutzinformation: siehe Rückseite.", { groesse: 7.8, fett: true, farbe: "#5c3d00" });
  }
  s.text(links, doc.hoehe - 12 * MM, `${b.absenderZeile} · Datenschutzinformation auf der Rückseite`, { groesse: 6.5, farbe: GRAU });

  // Seite 2: Datenschutzinformation
  const d = doc.seite();
  let dy = 25 * MM;
  d.text(links, dy, "Datenschutzinformation zu diesem Schreiben", { groesse: 12.5, fett: true, farbe: NAVY });
  dy += 8;
  d.text(links, dy + 10, b.land === "CH" ? "nach Art. 14 DSGVO und Art. 19 DSG" : "nach Art. 14 der Datenschutz-Grundverordnung (DSGVO)", { groesse: 8.5, farbe: GRAU });
  dy += 32;
  for (const z of b.datenschutz) {
    dy = d.absatz(links, dy, z, { breite, groesse: 9, farbe: TEXT, zeilenhoehe: 12.2 }) + 18;
  }
  dy += 4;
  d.rechteck(links, dy, breite, 52, "#fff6e5", { rand: "#c98a00", randBreite: 0.6 });
  d.absatz(links + 8, dy + 14, b.widerspruch, { breite: breite - 16, groesse: 8.4, farbe: "#5c3d00", zeilenhoehe: 10.8 });
  d.text(links, doc.hoehe - 12 * MM, `${b.zeichen} · Code ${b.code}`, { groesse: 6.5, farbe: GRAU });
}

/** PDF mit allen Briefen (je Empfänger zwei Seiten, für Duplexdruck) */
export function serienbriefPdf(briefe, { titel = "Serienbrief", demo = false } = {}) {
  const doc = new PdfDokument({ titel, thema: "Akquise-Kampagne – Serienbrief" });
  for (const b of briefe) briefSeiten(doc, b, { demo });
  if (!briefe.length) {
    const s = doc.seite();
    s.text(25 * MM, 30 * MM, "Keine versandbereiten Empfänger in dieser Auswahl.", { groesse: 12, farbe: TEXT });
  }
  return doc.alsBuffer();
}
