// src/lib/plattform/server/vermittlungsauftrag-pdf.js
//
// PDF des Vermittlungsauftrags (Anbieter / Verkäufer) – mehrseitig, ohne Fremdpakete (server/pdf.js).
// Eingabe = vermittlungsauftragDaten() des Anbieter-Backends. Kennzeichnung MUSTER/ENTWURF, Erklärung mit Prüfsumme.

import { PdfDokument } from "./pdf";

const F = { navy950: "#03122b", ov300: "#aed083", ov600: "#4d7a26", ink900: "#151a24", ink700: "#394050", ink500: "#6b7486", ink200: "#dfe3ea", sand: "#f6f3ec", weiss: "#ffffff" };
const RAND = 48;
const zeit = (iso) => (iso ? new Date(iso).toLocaleString("de-AT", { timeZone: "Europe/Vienna", dateStyle: "medium", timeStyle: "short" }) : "–");
const tag = (d) => (d ? String(d).slice(0, 10).split("-").reverse().join(".") : "");

export function vermittlungsauftragPdf(d) {
  const doc = new PdfDokument({ titel: d.titel, thema: "Vermittlungsauftrag Projektbörse (Muster)" });
  const B = doc.breite - 2 * RAND;
  let s;
  let y;
  let nr = 0;
  const kopf = () => {
    s = doc.seite();
    nr++;
    s.rechteck(0, 0, doc.breite, 64, F.navy950);
    s.text(RAND, 39, "ÖkoInvest", { groesse: 17, fett: true, farbe: F.weiss });
    s.text(doc.breite - RAND, 39, d.entwurf ? "ENTWURF · MUSTER" : "MUSTER · ZUR ANWALTLICHEN PRÜFUNG", { groesse: 8, fett: true, farbe: F.ov300, ausrichtung: "rechts", zeichenabstand: 0.8 });
    s.linie(RAND, doc.hoehe - 44, doc.breite - RAND, doc.hoehe - 44, { farbe: F.ink200 });
    s.text(RAND, doc.hoehe - 30, "ÖkoInvest GmbH · Gewerbegebiet 10 · 5121 Ostermiething (AT) · FN 541505g", { groesse: 7.5, farbe: F.ink500 });
    s.text(doc.breite - RAND, doc.hoehe - 30, `Seite ${nr}`, { groesse: 7.5, farbe: F.ink500, ausrichtung: "rechts" });
    y = 104;
  };
  const platz = (h) => {
    if (y + h > doc.hoehe - 70) kopf();
  };
  kopf();
  y = s.absatz(RAND, y, d.titel, { breite: B, groesse: 19, fett: true, farbe: F.ink900, zeilenhoehe: 24 }) + 20;
  y = s.absatz(RAND, y, d.untertitel, { breite: B, groesse: 10, farbe: F.ink500 }) + 26;
  (d.absaetze || []).forEach((a, i) => {
    const zeilen = Math.ceil(String(a).length / 95) + 1;
    platz(zeilen * 15.5 + 14);
    y = s.absatz(RAND, y, `${i + 1}. ${a}`, { breite: B, groesse: 10.5, farbe: F.ink700, zeilenhoehe: 15.5 }) + 16;
  });
  platz(110);
  y += 6;
  s.rechteck(RAND, y - 14, B, 88, F.sand);
  if (d.erklaerung) {
    s.text(RAND + 14, y + 4, "Erklärung (einfache elektronische Signatur)", { groesse: 10, fett: true, farbe: F.ink900 });
    s.text(RAND + 14, y + 22, `Name: ${d.erklaerung.name}  ·  erteilt am ${zeit(d.erklaerung.am)}`, { groesse: 9.5, farbe: F.ink700 });
    s.text(RAND + 14, y + 38, `SHA-256 des Wortlauts: ${d.erklaerung.sha256}`, { groesse: 7.5, farbe: F.ink500 });
    const zusatz = [
      d.erklaerung.bestaetigtAm ? `Exklusivität gegenbestätigt am ${zeit(d.erklaerung.bestaetigtAm)}` : "",
      d.erklaerung.gekuendigtAm ? `gekündigt am ${zeit(d.erklaerung.gekuendigtAm)}${d.erklaerung.endetAm ? `, wirksam ${tag(d.erklaerung.endetAm)}` : ""}` : "",
      d.erklaerung.exklusivEndetAm ? `Exklusivität endet ${tag(d.erklaerung.exklusivEndetAm)}` : "",
      d.erklaerung.satz != null ? `Provisionssatz bei Freigabe festgelegt: ${(d.erklaerung.satz * 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %` : "",
    ].filter(Boolean).join(" · ");
    if (zusatz) s.absatz(RAND + 14, y + 54, zusatz, { breite: B - 28, groesse: 9, farbe: F.ov600, zeilenhoehe: 12 });
  } else {
    s.text(RAND + 14, y + 4, "Noch nicht erteilt", { groesse: 10, fett: true, farbe: F.ink900 });
    s.absatz(RAND + 14, y + 22, "Der Auftrag wird im Portal unter „Mein Projekt“ → „Vermittlungsauftrag“ erteilt (Name eingeben, Zustimmung bestätigen).", { breite: B - 28, groesse: 9.5, farbe: F.ink700 });
  }
  y += 96;
  platz(40);
  s.absatz(RAND, y, d.hinweis || "", { breite: B, groesse: 8, farbe: F.ink500, zeilenhoehe: 11.5 });
  return doc.alsBuffer();
}
