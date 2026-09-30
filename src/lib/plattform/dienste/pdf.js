// src/lib/plattform/dienste/pdf.js
//
// PDF-Satz für strukturierte Dokumente der Dienste (Gründungspaket, Registerauskunft) mit dem gemeinsamen
// PDF-Erzeuger server/pdf.js (nur serverseitig). Eingabe: [{ id, titel, untertitel, abschnitte: [{ titel?, text?,
// liste?, tabelle?: { kopf[], zeilen[][] } }] }] – jedes Dokument beginnt auf einer neuen Seite.

import { PdfDokument, umbrechen } from "../server/pdf";

const F = { navy950: "#03122b", ov300: "#aed083", ov600: "#558227", ink900: "#151a24", ink700: "#394050", ink500: "#6b7486", ink200: "#dfe3ea", ink50: "#f7f8fa", sun400: "#ffc53d", weiss: "#ffffff" };
const RAND = 48;

export function dokumentePdf(dokumente, { titel = "Dokumente", kennzeichen = "", fusszeile = "", muster = false, demo = false } = {}) {
  const doc = new PdfDokument({ titel, thema: kennzeichen });
  const B = doc.breite - 2 * RAND;
  let s = null;
  let y = 0;
  let seiteNr = 0;
  let aktTitel = titel;

  const fuss = () => {
    s.linie(RAND, doc.hoehe - 50, doc.breite - RAND, doc.hoehe - 50, { farbe: F.ink200 });
    s.text(RAND, doc.hoehe - 36, umbrechen(fusszeile || "ÖkoInvest GmbH · Gewerbegebiet 10 · 5121 Ostermiething · FN 541505g · LG Ried im Innkreis", B - 70, 7.5)[0], { groesse: 7.5, farbe: F.ink500 });
    s.text(doc.breite - RAND, doc.hoehe - 36, `Seite ${seiteNr}`, { groesse: 7.5, farbe: F.ink500, ausrichtung: "rechts" });
    if (muster) s.text(RAND, doc.hoehe - 24, "MUSTER – zur Prüfung durch das Notariat, keine Rechtsberatung.", { groesse: 7.5, fett: true, farbe: F.ov600 });
    if (demo) s.text(doc.breite - RAND, doc.hoehe - 24, "Demo – fiktive Daten", { groesse: 7.5, fett: true, farbe: F.ov600, ausrichtung: "rechts" });
  };
  const neueSeite = (d) => {
    if (s) fuss();
    s = doc.seite();
    seiteNr += 1;
    if (d) {
      aktTitel = d.titel;
      s.rechteck(0, 0, doc.breite, 104, F.navy950);
      s.text(RAND, 40, "ÖkoInvest", { groesse: 17, fett: true, farbe: F.weiss });
      if (kennzeichen) s.text(doc.breite - RAND, 40, kennzeichen, { groesse: 8.5, fett: true, farbe: F.ov300, ausrichtung: "rechts", zeichenabstand: 1 });
      const tz = umbrechen(d.titel, B, 14, true).slice(0, 2);
      tz.forEach((z, i) => s.text(RAND, 68 + i * 17, z, { groesse: 14, fett: true, farbe: F.weiss }));
      y = 128;
      if (d.untertitel) {
        y = s.absatz(RAND, y, d.untertitel, { breite: B, groesse: 9.5, farbe: F.ink500 }) + 20;
      }
    } else {
      s.rechteck(0, 0, doc.breite, 30, F.navy950);
      s.text(RAND, 20, "ÖkoInvest", { groesse: 10, fett: true, farbe: F.weiss });
      s.text(doc.breite - RAND, 20, umbrechen(aktTitel, B - 90, 8.5)[0], { groesse: 8.5, farbe: F.ov300, ausrichtung: "rechts" });
      y = 58;
    }
  };
  const platz = (h) => {
    if (y + h > doc.hoehe - 70) neueSeite(null);
  };
  const absatz = (text, { groesse = 10, fett = false, farbe = F.ink900, einzug = 0 } = {}) => {
    const zeilen = umbrechen(text, B - einzug, groesse, fett);
    const zh = groesse * 1.45;
    for (const z of zeilen) {
      platz(zh);
      s.text(RAND + einzug, y, z, { groesse, fett, farbe });
      y += zh;
    }
  };
  const tabelle = ({ kopf = [], zeilen = [] }) => {
    const n = Math.max(kopf.length, ...zeilen.map((z) => z.length), 1);
    // Spaltenbreiten: erste Spalte schmal, wenn sie nur Nummern enthält
    const nurNummern = zeilen.every((z) => /^\d{1,3}$/.test(String(z[0] ?? "")));
    const breiten = Array.from({ length: n }, (_, i) => (nurNummern && n > 2 ? (i === 0 ? 40 : (B - 40) / (n - 1)) : B / n));
    const zeile = (werte, { fett = false, grund = null } = {}) => {
      const teile = werte.map((w, i) => umbrechen(String(w ?? ""), breiten[i] - 10, 9, fett));
      const h = Math.max(...teile.map((t) => t.length), 1) * 12.5 + 8;
      platz(h);
      if (grund) s.rechteck(RAND, y - 11, B, h, grund);
      let x = RAND;
      teile.forEach((t, i) => {
        t.forEach((z, j) => s.text(x + 5, y + j * 12.5, z, { groesse: 9, fett, farbe: fett ? F.ink700 : F.ink900 }));
        x += breiten[i];
      });
      y += h;
      s.linie(RAND, y - 11, RAND + B, y - 11, { farbe: F.ink200, breite: 0.5 });
    };
    if (kopf.length) zeile(kopf, { fett: true, grund: F.ink50 });
    for (const z of zeilen) zeile(z);
    y += 6;
  };

  for (const d of dokumente) {
    neueSeite(d);
    for (const a of d.abschnitte || []) {
      if (a.titel) {
        platz(34);
        y += 6;
        absatz(a.titel, { groesse: 11, fett: true });
        y += 2;
      }
      if (a.text) {
        absatz(a.text);
        y += 6;
      }
      if (a.liste) {
        for (const p of a.liste) {
          platz(14);
          s.text(RAND + 2, y, "•", { groesse: 10, farbe: F.ov600 });
          absatz(p, { einzug: 14 });
        }
        y += 6;
      }
      if (a.tabelle) tabelle(a.tabelle);
    }
  }
  if (s) fuss();
  return doc.alsBuffer();
}
