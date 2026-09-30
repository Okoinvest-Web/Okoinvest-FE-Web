// src/lib/plattform/backend/demo/pdf.js
//
// Demo-Dokumente (Datenraum, Pachtangebot …) als echte PDFs – auf Basis des gemeinsamen
// PDF-Erzeugers (server/pdf.js), damit Vorführung und Downloads im Markenstil erscheinen.

import { PdfDokument } from "../../server/pdf";

export function demoPdf(titel, zeilen = []) {
  const doc = new PdfDokument({ titel, thema: "Demo-Dokument (fiktiv)" });
  const s = doc.seite();
  s.rechteck(0, 0, doc.breite, 70, "#03122b");
  s.text(48, 42, "ÖkoInvest", { groesse: 18, fett: true, farbe: "#ffffff" });
  s.text(doc.breite - 48, 42, "DEMO-DOKUMENT", { groesse: 8.5, fett: true, farbe: "#aed083", ausrichtung: "rechts", zeichenabstand: 1 });
  let y = s.absatz(48, 118, titel, { breite: doc.breite - 96, groesse: 20, fett: true, farbe: "#151a24", zeilenhoehe: 25 });
  s.text(48, y + 22, "Fiktive Angaben – kein echtes Projekt, keine echten Personen.", { groesse: 9.5, farbe: "#6b7486" });
  y += 56;
  for (const z of zeilen) {
    y = s.absatz(48, y, z, { breite: doc.breite - 96, groesse: 11.5, farbe: "#394050" }) + 20;
  }
  s.linie(48, doc.hoehe - 48, doc.breite - 48, doc.hoehe - 48);
  s.text(48, doc.hoehe - 34, "ÖkoInvest GmbH · Demo-Datenraum", { groesse: 8, farbe: "#6b7486" });
  return doc.alsBuffer();
}
