// src/lib/plattform/server/eg-gruendung-pdf.js
//
// WP5 – PDF der Dokumente aus dem Generator (eg/vertraege.js vorlageRendern): Musterstatuten, Verträge, Vollmachten,
// Anzeigen, Mitgliederinformationen, Angebot/Auftrag (für das Signatur-Modul) und Machbarkeits- bzw. Förderbericht.
// Gleicher PDF-Erzeuger wie das übrige Portal (server/pdf.js), Markenfarben, jede Seite mit MUSTER-Hinweis und Prüfsumme.
// Nur serverseitig.

import { PdfDokument, umbrechen } from "./pdf";

const F = { navy950: "#03122b", navy900: "#041d42", ov300: "#aed083", ov500: "#669933", ink900: "#151a24", ink700: "#394050", ink500: "#6b7486", ink200: "#dfe3ea", ink50: "#f7f8fa", weiss: "#ffffff", sun: "#b7791f" };
const RAND = 52;
const FUSS = 70;

export const pdfDateiname = (s) => `${String(s || "dokument").normalize("NFD").replace(/\p{M}/gu, "").replace(/ß/g, "ss").replace(/\W+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "dokument"}.pdf`;

class Bogen {
  constructor({ titel, untertitel = "", kopfzeile = "Energiegemeinschaften", fuss = "", demo = false }) {
    this.doc = new PdfDokument({ titel, thema: kopfzeile });
    this.B = this.doc.breite - 2 * RAND;
    Object.assign(this, { titel, untertitel, kopfzeile, fussText: fuss, demo });
    this.s = null;
    this.y = 0;
    this.neueSeite(true);
  }
  fuss() {
    const y = this.doc.hoehe - 38;
    this.s.linie(RAND, y - 14, this.doc.breite - RAND, y - 14, { farbe: F.ink200 });
    this.s.absatz(RAND, y - 2, `${this.demo ? "DEMO – fiktive Daten. " : ""}${this.fussText}`, { breite: this.B - 54, groesse: 6.6, farbe: F.ink500, zeilenhoehe: 8.4 });
    this.s.text(this.doc.breite - RAND, y - 2, `Seite ${this.doc.seiten.length}`, { groesse: 7, farbe: F.ink500, ausrichtung: "rechts" });
  }
  neueSeite(erste = false) {
    if (this.s) this.fuss();
    this.s = this.doc.seite();
    if (erste) {
      this.s.rechteck(0, 0, this.doc.breite, 112, F.navy950);
      this.s.text(RAND, 38, "ÖkoInvest", { groesse: 17, fett: true, farbe: F.weiss });
      this.s.text(this.doc.breite - RAND, 38, this.kopfzeile.toUpperCase().slice(0, 56), { groesse: 7.6, fett: true, farbe: F.ov300, ausrichtung: "rechts", zeichenabstand: 0.8 });
      let y = 72;
      for (const z of umbrechen(this.titel, this.B, 16, true).slice(0, 2)) {
        this.s.text(RAND, y, z, { groesse: 16, fett: true, farbe: F.weiss });
        y += 18;
      }
      if (this.untertitel) this.s.text(RAND, Math.min(104, y + 2), this.untertitel.slice(0, 120), { groesse: 8.6, farbe: F.ov300 });
      this.y = 140;
    } else {
      this.s.rechteck(0, 0, this.doc.breite, 30, F.navy950);
      this.s.text(RAND, 20, "ÖkoInvest", { groesse: 10, fett: true, farbe: F.weiss });
      this.s.text(this.doc.breite - RAND, 20, this.titel.slice(0, 80), { groesse: 7.6, farbe: F.ov300, ausrichtung: "rechts" });
      this.y = 58;
    }
  }
  platz(h) {
    if (this.y + h > this.doc.hoehe - FUSS) this.neueSeite();
  }
  hinweisBox(t) {
    const zeilen = Math.max(2, Math.ceil(String(t).length / 105));
    const h = zeilen * 11 + 14;
    this.platz(h + 8);
    this.s.rechteck(RAND, this.y - 10, this.B, h, "#fdf6e3", { rand: F.sun, randBreite: 0.6 });
    this.y = this.s.absatz(RAND + 10, this.y + 2, t, { breite: this.B - 20, groesse: 8, farbe: F.ink900, zeilenhoehe: 11 }) + 22;
  }
  ueberschrift(t) {
    if (!t) return;
    this.platz(44);
    this.y += 6;
    this.y = this.s.absatz(RAND, this.y, t, { breite: this.B, groesse: 11, fett: true, farbe: F.navy900 }) + 4;
    this.s.rechteck(RAND, this.y - 1, 22, 2.2, F.ov500);
    this.y += 16;
  }
  absatz(t, { einzug = 0, groesse = 9.2 } = {}) {
    for (const teil of String(t || "").split("\n")) {
      this.platz(18);
      this.y = this.s.absatz(RAND + einzug, this.y, teil || " ", { breite: this.B - einzug, groesse, farbe: F.ink700 }) + groesse * 1.6;
    }
  }
  angaben(liste) {
    for (const [k, v] of liste.filter((x) => x && x[1] !== undefined && x[1] !== null && x[1] !== "")) {
      this.platz(16);
      this.s.text(RAND, this.y, k, { groesse: 8.2, farbe: F.ink500 });
      this.y = this.s.absatz(RAND + 160, this.y, String(v), { breite: this.B - 160, groesse: 9, farbe: F.ink900 }) + 14;
    }
    this.y += 4;
  }
  unterschriften(labels) {
    const l = labels.filter(Boolean);
    for (let i = 0; i < l.length; i += 2) {
      this.platz(72);
      this.y += 36;
      const b = (this.B - 30) / 2;
      this.s.linie(RAND, this.y, RAND + b, this.y, { farbe: F.ink700 });
      this.s.text(RAND, this.y + 11, l[i], { groesse: 7.4, farbe: F.ink500 });
      if (l[i + 1]) {
        this.s.linie(RAND + b + 30, this.y, RAND + 2 * b + 30, this.y, { farbe: F.ink700 });
        this.s.text(RAND + b + 30, this.y + 11, l[i + 1], { groesse: 7.4, farbe: F.ink500 });
      }
      this.y += 24;
    }
  }
  fertig() {
    this.fuss();
    return this.doc.alsBuffer();
  }
}

/**
 * Dokument (Ergebnis von vorlageRendern) als PDF.
 * @param {object} dok { titel, untertitel, kennzeichnung, quelle, stand, abschnitte[{titel, absaetze[]}], unterschriften[], fehlend[] }
 * @param {{version?:number|string, sha256?:string, demo?:boolean, kopfzeile?:string}} o
 */
export function egDokumentPdf(dok, { version = "", sha256 = "", demo = false, kopfzeile = "Energiegemeinschaften · Muster" } = {}) {
  const fuss = `${dok.kennzeichnung || "MUSTER"}${version ? ` · Version ${version}` : ""}${sha256 ? ` · SHA-256 ${String(sha256).slice(0, 16)}…` : ""}`;
  const b = new Bogen({ titel: dok.titel, untertitel: dok.untertitel, kopfzeile, fuss, demo });
  b.hinweisBox(`MUSTER zur Prüfung. ${dok.quelle ? `Grundlage: ${dok.quelle}. ` : ""}Stand ${String(dok.stand || "").split("-").reverse().join(".")}.${dok.fehlend?.length ? ` Offene Angaben (……): ${dok.fehlend.length}.` : ""}`);
  for (const a of dok.abschnitte || []) {
    b.ueberschrift(a.titel);
    for (const p of a.absaetze || []) b.absatz(p, { einzug: p.startsWith("– ") ? 10 : 0 });
  }
  if (dok.unterschriften?.length) b.unterschriften(dok.unterschriften);
  return b.fertig();
}

/**
 * Bericht mit Kennzahlen und Abschnitten (Machbarkeits-, Förder-, Umstellungs- oder Kontrollbericht).
 * @param {{titel:string, untertitel?:string, angaben?:[string,string][], abschnitte?:{titel:string, absaetze:string[]}[], hinweis?:string}} r
 */
export function egBerichtPdf(r, { demo = false } = {}) {
  const b = new Bogen({ titel: r.titel, untertitel: r.untertitel || "", kopfzeile: r.kopfzeile || "Energiegemeinschaften · Bericht", fuss: r.hinweis || "Erstellt über die ÖkoInvest-Plattform. Keine Rechts-, Steuer- oder Förderberatung; Angaben (zu bestätigen) vor Verwendung prüfen.", demo });
  if (r.angaben?.length) b.angaben(r.angaben);
  for (const a of r.abschnitte || []) {
    b.ueberschrift(a.titel);
    for (const p of a.absaetze || []) b.absatz(p, { einzug: String(p).startsWith("– ") ? 10 : 0 });
  }
  return b.fertig();
}
