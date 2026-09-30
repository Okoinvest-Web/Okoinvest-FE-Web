// src/lib/plattform/server/pachtakte-pdf.js
//
// Jahresbescheinigung über Pachtzahlungen im Markenstil (gemeinsamer PDF-Erzeuger server/pdf.js, nur serverseitig).
// Daten: jahresbescheinigungDaten() des Pachtakte-Backends (Rechte bereits geprüft). Die Bescheinigung fasst die
// Gutschriften eines Kalenderjahres zusammen (Leistungszeitraum-Beginn im Jahr) – sie ist KEIN steuerlicher Beleg
// im Sinne einer Rechnung; maßgeblich bleiben die einzelnen Gutschriften.

import { PdfDokument, umbrechen } from "./pdf";
import { datumDe, euro } from "../finanzen/basis.js";

const F = { navy950: "#03122b", navy900: "#041d42", ov300: "#aed083", ov600: "#558227", ink900: "#151a24", ink700: "#394050", ink500: "#6b7486", ink200: "#dfe3ea", ink100: "#eef0f4", ink50: "#f7f8fa", sand100: "#f5f3ea", weiss: "#ffffff" };
const RAND = 48;

export function jahresbescheinigungPdf(d, { demo = false } = {}) {
  const doc = new PdfDokument({ titel: `Jahresbescheinigung Pacht ${d.jahr}`, thema: "Pachtzahlungen" });
  const B = doc.breite - 2 * RAND;
  let s;
  let y;
  let nr = 0;
  const fuss = () => {
    s.linie(RAND, doc.hoehe - 50, doc.breite - RAND, doc.hoehe - 50, { farbe: F.ink200 });
    s.text(RAND, doc.hoehe - 36, `${d.aussteller} · erstellt am ${datumDe(d.erstelltAm)} über das Portal`, { groesse: 7.5, farbe: F.ink500 });
    s.text(doc.breite - RAND, doc.hoehe - 36, `Seite ${nr}`, { groesse: 7.5, farbe: F.ink500, ausrichtung: "rechts" });
    if (demo) s.text(RAND, doc.hoehe - 24, "Demo – fiktive Daten, keine Bescheinigung.", { groesse: 7.5, fett: true, farbe: F.ov600 });
  };
  const neueSeite = (erste = false) => {
    if (s) fuss();
    s = doc.seite();
    nr += 1;
    if (erste) {
      s.rechteck(0, 0, doc.breite, 96, F.navy950);
      s.text(RAND, 44, "ÖkoInvest", { groesse: 19, fett: true, farbe: F.weiss });
      s.text(doc.breite - RAND, 44, "JAHRESBESCHEINIGUNG", { groesse: 9, fett: true, farbe: F.ov300, ausrichtung: "rechts", zeichenabstand: 1.2 });
      s.text(RAND, 74, `Pachtzahlungen ${d.jahr}`, { groesse: 13, fett: true, farbe: F.weiss });
      y = 128;
    } else {
      s.rechteck(0, 0, doc.breite, 30, F.navy950);
      s.text(RAND, 20, "ÖkoInvest", { groesse: 10, fett: true, farbe: F.weiss });
      s.text(doc.breite - RAND, 20, `Jahresbescheinigung ${d.jahr}`, { groesse: 8.5, farbe: F.ov300, ausrichtung: "rechts" });
      y = 58;
    }
  };
  const platz = (h) => {
    if (y + h > doc.hoehe - 70) neueSeite();
  };

  neueSeite(true);
  s.text(RAND, y, "EMPFÄNGER", { groesse: 7.5, fett: true, farbe: F.ink500, zeichenabstand: 0.6 });
  y += 14;
  for (const z of [d.empfaenger?.name, d.empfaenger?.anschrift].filter(Boolean)) {
    for (const t of umbrechen(z, B / 2, 9.5)) {
      s.text(RAND, y, t, { groesse: 9.5, farbe: F.ink900 });
      y += 13;
    }
  }
  y += 10;
  y = s.absatz(RAND, y, `Wir bescheinigen Ihnen die Pachtabrechnungen (Gutschriften) für Leistungszeiträume im Kalenderjahr ${d.jahr}. Beträge je Vertrag; „ausgezahlt“ sind überwiesene Gutschriften, „offen“ noch nicht ausgezahlte.`, { breite: B, groesse: 9, farbe: F.ink700 }) + 18;

  // ------------------------------------------------ Tabelle je Vertrag
  const sp = [{ l: "Vertrag", b: B - 5 * 72 }, { l: "Netto", b: 72, r: true }, { l: "USt/MWST", b: 72, r: true }, { l: "Brutto", b: 72, r: true }, { l: "Ausgezahlt", b: 72, r: true }, { l: "Offen", b: 72, r: true }];
  const kopf = () => {
    s.rechteck(RAND, y - 12, B, 18, F.navy900);
    let x = RAND;
    for (const c of sp) {
      s.text(c.r ? x + c.b - 6 : x + 6, y + 1, c.l, { groesse: 8, fett: true, farbe: F.weiss, ausrichtung: c.r ? "rechts" : "links" });
      x += c.b;
    }
    y += 20;
  };
  kopf();
  const zeile = (werte, fett = false) => {
    const namen = umbrechen(werte[0], sp[0].b - 12, 9, fett);
    platz(namen.length * 12 + 10);
    let x = RAND;
    sp.forEach((c, k) => {
      if (k === 0) namen.forEach((t, i) => s.text(x + 6, y + i * 12, t, { groesse: 9, fett, farbe: F.ink900 }));
      else s.text(x + c.b - 6, y, werte[k], { groesse: 9, fett, farbe: F.ink900, ausrichtung: "rechts" });
      x += c.b;
    });
    y += namen.length * 12 + 4;
    s.linie(RAND, y - 2, RAND + B, y - 2, { farbe: F.ink100 });
    y += 8;
  };
  for (const z of d.zeilen || []) zeile([`${z.bezeichnung} (${z.anzahl} Gutschrift${z.anzahl === 1 ? "" : "en"})`, euro(z.netto), euro(z.steuer), euro(z.brutto), euro(z.bezahlt), euro(z.offen)]);
  zeile(["Summe", euro(d.summe.netto), euro(d.summe.steuer), euro(d.summe.brutto), euro(d.summe.bezahlt), euro(d.summe.offen)], true);

  // ------------------------------------------------ Einzelbelege
  const alle = (d.zeilen || []).flatMap((z) => z.belege.map((b) => ({ ...b, vertrag: z.bezeichnung })));
  if (alle.length) {
    platz(40);
    y += 6;
    s.text(RAND, y, "Enthaltene Gutschriften", { groesse: 10, fett: true, farbe: F.navy900 });
    y += 16;
    for (const b of alle) {
      platz(14);
      s.text(RAND, y, `${b.nummer} · ${datumDe(b.von)} – ${datumDe(b.bis)}`, { groesse: 8.5, farbe: F.ink700 });
      s.text(RAND + B - 150, y, b.status === "bezahlt" ? `ausgezahlt${b.bezahltAm ? ` ${datumDe(String(b.bezahltAm).slice(0, 10))}` : ""}` : "offen", { groesse: 8.5, farbe: F.ink500 });
      s.text(RAND + B, y, euro(b.brutto), { groesse: 8.5, farbe: F.ink900, ausrichtung: "rechts" });
      y += 13;
    }
  }

  // ------------------------------------------------ Steuerhinweise
  for (const h of d.steuerhinweise || []) {
    platz(60);
    y += 10;
    s.text(RAND, y, `Steuerliche Hinweise (${h.landText})`, { groesse: 10, fett: true, farbe: F.navy900 });
    y += 16;
    for (const t of h.hinweise) {
      platz(26);
      y = s.absatz(RAND, y, `• ${t}`, { breite: B, groesse: 8.6, farbe: F.ink700 }) + 12;
    }
  }
  platz(50);
  y += 8;
  s.rechteck(RAND, y, B, 40, F.sand100);
  s.absatz(RAND + 12, y + 16, "Diese Übersicht ersetzt keine Steuerberatung. Maßgeblich für Umsatzsteuer und Buchhaltung sind die einzelnen Gutschriften, die Sie im Portal unter „Abrechnungen“ als PDF abrufen können.", { breite: B - 24, groesse: 8.6, farbe: F.ink900 });
  y += 52;
  fuss();
  return doc.alsBuffer();
}
