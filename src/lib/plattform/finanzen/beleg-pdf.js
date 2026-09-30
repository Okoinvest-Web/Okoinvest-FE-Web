// src/lib/plattform/finanzen/beleg-pdf.js
//
// PDF einer Abrechnung im Markenstil (gemeinsamer PDF-Erzeuger server/pdf.js – nur serverseitig, nicht im Barrel
// index.js): Pachtabrechnung/Gutschrift, Contracting-Rechnung (mit Zählerständen) und Provisionsrechnung.
// Pflichtangaben (§ 14 Abs. 4 UStG DE / § 11 Abs. 1 UStG 1994 AT): Aussteller und Empfänger mit Anschrift, UID,
// fortlaufende Nummer, Ausstellungsdatum, Leistungszeitraum, Menge und Art, Entgelt, Steuersatz/-betrag bzw.
// Hinweis auf Steuerbefreiung/Reverse Charge, bei Gutschriften die Bezeichnung „Gutschrift“.
// Daten: Operation abrechnung()/abrechnungPdfDaten() des Backends (Rechte bereits geprüft).

import { PdfDokument, umbrechen } from "../server/pdf";
import { datumDe, euro, zahlDe } from "./basis.js";

const F = {
  navy950: "#03122b", navy900: "#041d42", ov300: "#aed083", ov500: "#669933", ov600: "#558227", ink900: "#151a24", ink700: "#394050",
  ink500: "#6b7486", ink200: "#dfe3ea", ink100: "#eef0f4", ink50: "#f7f8fa", sand100: "#f5f3ea", sun400: "#ffc53d", weiss: "#ffffff",
};
const RAND = 48;

export function belegPdf(b, { demo = false } = {}) {
  const bank = b.bankverbindung || null;
  const gutschrift = b.beleg === "gutschrift";
  const doc = new PdfDokument({ titel: `${gutschrift ? "Gutschrift" : "Rechnung"} ${b.nummer}`, thema: b.titel });
  const B = doc.breite - 2 * RAND;
  let s;
  let y;
  let seiteNr = 0;
  const fuss = () => {
    const a = b.aussteller || {};
    s.linie(RAND, doc.hoehe - 50, doc.breite - RAND, doc.hoehe - 50, { farbe: F.ink200 });
    const zeile = [a.name, a.anschrift, a.firmenbuch, a.uid ? `UID ${a.uid}` : ""].filter(Boolean).join(" · ");
    s.text(RAND, doc.hoehe - 36, umbrechen(zeile, B - 60, 7.5)[0], { groesse: 7.5, farbe: F.ink500 });
    s.text(doc.breite - RAND, doc.hoehe - 36, `Seite ${seiteNr}`, { groesse: 7.5, farbe: F.ink500, ausrichtung: "rechts" });
    if (demo) s.text(RAND, doc.hoehe - 24, "Demo – fiktive Daten, kein steuerlicher Beleg.", { groesse: 7.5, fett: true, farbe: F.ov600 });
  };
  const neueSeite = (erste = false) => {
    if (s) fuss();
    s = doc.seite();
    seiteNr += 1;
    if (erste) {
      s.rechteck(0, 0, doc.breite, 96, F.navy950);
      s.text(RAND, 44, "ÖkoInvest", { groesse: 19, fett: true, farbe: F.weiss });
      s.text(doc.breite - RAND, 44, (gutschrift ? "GUTSCHRIFT" : "RECHNUNG"), { groesse: 9, fett: true, farbe: F.ov300, ausrichtung: "rechts", zeichenabstand: 1.2 });
      s.text(RAND, 74, b.titel, { groesse: 13, fett: true, farbe: F.weiss });
      s.text(doc.breite - RAND, 74, b.nummer, { groesse: 12, fett: true, farbe: F.weiss, ausrichtung: "rechts" });
      y = 128;
    } else {
      s.rechteck(0, 0, doc.breite, 30, F.navy950);
      s.text(RAND, 20, "ÖkoInvest", { groesse: 10, fett: true, farbe: F.weiss });
      s.text(doc.breite - RAND, 20, `${gutschrift ? "Gutschrift" : "Rechnung"} ${b.nummer}`, { groesse: 8.5, farbe: F.ov300, ausrichtung: "rechts" });
      y = 58;
    }
  };
  const platz = (h) => {
    if (y + h > doc.hoehe - 70) neueSeite();
  };
  const block = (x, titel, zeilen, breite) => {
    let yy = y;
    s.text(x, yy, titel, { groesse: 7.5, fett: true, farbe: F.ink500, zeichenabstand: 0.6 });
    yy += 14;
    for (const z of zeilen.filter(Boolean)) {
      for (const t of umbrechen(z, breite, 9.5)) {
        s.text(x, yy, t, { groesse: 9.5, farbe: F.ink900 });
        yy += 13;
      }
    }
    return yy;
  };

  neueSeite(true);
  // ------------------------------------------------ Parteien
  const p = b.partei || {};
  const a = b.aussteller || {};
  const halb = (B - 24) / 2;
  const empfZeilen = [p.name, p.zuHaenden ? `z. H. ${p.zuHaenden}` : "", p.anschrift, p.uid ? `UID ${p.uid}` : ""];
  const ausZeilen = [a.name, a.anschrift, a.uid ? `UID ${a.uid}` : "", a.firmenbuch];
  const y1 = block(RAND, gutschrift ? "LEISTENDER / GUTSCHRIFTSEMPFÄNGER" : "RECHNUNGSEMPFÄNGER", empfZeilen, halb);
  const y2 = block(RAND + halb + 24, gutschrift ? "AUSSTELLER (LEISTUNGSEMPFÄNGER)" : "RECHNUNGSSTELLER", ausZeilen, halb);
  y = Math.max(y1, y2) + 10;

  // ------------------------------------------------ Kopfdaten
  const meta = [
    [gutschrift ? "Gutschrift-Nr." : "Rechnungs-Nr.", b.nummer],
    ["Ausgestellt am", datumDe(b.rechnungsdatum)],
    ["Leistungszeitraum", `${datumDe(b.zeitraum?.von)} – ${datumDe(b.zeitraum?.bis)}`],
    [gutschrift ? "Auszahlung bis" : "Zahlbar bis", datumDe(b.faelligAm)],
    ["Bezug", b.bezugText || ""],
  ];
  s.rechteck(RAND, y, B, 18 * meta.length + 10, F.ink50);
  let ym = y + 17;
  for (const [k, w] of meta) {
    s.text(RAND + 12, ym, k, { groesse: 8.5, farbe: F.ink500 });
    s.text(RAND + 140, ym, umbrechen(w, B - 160, 9)[0] || "", { groesse: 9, fett: k.endsWith("Nr."), farbe: F.ink900 });
    ym += 18;
  }
  y += 18 * meta.length + 26;

  // ------------------------------------------------ Positionen
  const sp = [{ l: "Pos.", b: 30 }, { l: "Beschreibung", b: B - 30 - 70 - 45 - 80 - 80 }, { l: "Menge", b: 70, r: true }, { l: "Einheit", b: 45 }, { l: "Einzelpreis", b: 80, r: true }, { l: "Betrag", b: 80, r: true }];
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
  (b.positionen || []).forEach((pos, i) => {
    const zeilen = umbrechen(pos.text, sp[1].b - 12, 9);
    platz(zeilen.length * 12 + 10);
    let x = RAND;
    const mengeText = pos.einheit === "kWh" ? zahlDe(pos.menge) : zahlDe(pos.menge, pos.menge % 1 ? 4 : 0);
    const preisText = pos.einheit === "kWh" ? `${zahlDe(pos.preis * 100, 3)} ct` : euro(pos.preis);
    const werte = [String(i + 1), null, mengeText, pos.einheit || "", preisText, euro(pos.betrag)];
    sp.forEach((c, k) => {
      if (k === 1) zeilen.forEach((z, zi) => s.text(x + 6, y + zi * 12, z, { groesse: 9, farbe: F.ink900 }));
      else s.text(c.r ? x + c.b - 6 : x + 6, y, werte[k], { groesse: 9, farbe: F.ink900, ausrichtung: c.r ? "rechts" : "links", fett: k === 5 });
      x += c.b;
    });
    y += zeilen.length * 12 + 4;
    s.linie(RAND, y - 2, RAND + B, y - 2, { farbe: F.ink100 });
    y += 8;
  });

  // ------------------------------------------------ Summen
  platz(90);
  const sx = RAND + B - 230;
  const summe = (label, wert, fett = false) => {
    s.text(sx, y, label, { groesse: fett ? 10 : 9, fett, farbe: F.ink700 });
    s.text(RAND + B, y, wert, { groesse: fett ? 11 : 9, fett, farbe: F.ink900, ausrichtung: "rechts" });
    y += fett ? 18 : 15;
  };
  summe("Summe netto", euro(b.netto));
  summe(b.steuer?.satz ? `Umsatzsteuer ${zahlDe(b.steuer.satz * 100, b.steuer.satz * 100 % 1 ? 1 : 0)} %` : "Umsatzsteuer", euro(b.steuer?.betrag || 0));
  s.linie(sx, y - 9, RAND + B, y - 9, { farbe: F.ink200 });
  summe(gutschrift ? "Auszahlungsbetrag" : "Rechnungsbetrag", euro(b.brutto), true);
  if (b.steuer?.text) {
    platz(30);
    y = s.absatz(RAND, y + 4, `Steuerlicher Hinweis: ${b.steuer.text}`, { breite: B, groesse: 8.5, farbe: F.ink700 }) + 16;
  }

  // ------------------------------------------------ Zählerstände (Contracting)
  if ((b.zaehlerstaende || []).length) {
    platz(60);
    s.text(RAND, y + 6, "Zählerstände (geeichte Messstellen, Monatswerte des Messstellenbetreibers)", { groesse: 10, fett: true, farbe: F.navy900 });
    y += 24;
    const zs = [{ l: "Zähler", b: 110 }, { l: "Register", b: 60 }, { l: "Anfangsstand", b: (B - 170) / 3, r: true }, { l: "Endstand", b: (B - 170) / 3, r: true }, { l: "Menge (kWh)", b: (B - 170) / 3, r: true }];
    s.rechteck(RAND, y - 12, B, 18, F.ink50);
    let x = RAND;
    for (const c of zs) {
      s.text(c.r ? x + c.b - 6 : x + 6, y + 1, c.l, { groesse: 8, fett: true, farbe: F.ink500, ausrichtung: c.r ? "rechts" : "links" });
      x += c.b;
    }
    y += 20;
    for (const z of b.zaehlerstaende) {
      platz(16);
      x = RAND;
      const werte = [z.zaehlernummer, z.register === "2.8.0" ? "2.8.0 (Lieferung)" : "1.8.0 (Bezug)", zahlDe(z.anfang, 1), zahlDe(z.ende, 1), zahlDe(z.menge, 1)];
      zs.forEach((c, k) => {
        s.text(c.r ? x + c.b - 6 : x + 6, y, werte[k], { groesse: 9, farbe: F.ink900, ausrichtung: c.r ? "rechts" : "links" });
        x += c.b;
      });
      y += 15;
    }
    if (b.kennzahlen?.gelieferteKwh !== undefined && b.kennzahlen?.gelieferteKwh !== null) {
      y += 2;
      s.text(RAND, y, `Gelieferter PV-Strom: ${zahlDe(b.kennzahlen.gelieferteKwh)} kWh (Erzeugung abzüglich Einspeisung)`, { groesse: 9, fett: true, farbe: F.ink900 });
      y += 16;
    }
  }

  // ------------------------------------------------ Erläuterung (Indexierung, Umsatzbeteiligung)
  if ((b.erklaerung || []).length) {
    platz(50);
    y += 6;
    s.text(RAND, y, "Erläuterung", { groesse: 10, fett: true, farbe: F.navy900 });
    y += 16;
    for (const z of b.erklaerung) {
      platz(24);
      y = s.absatz(RAND, y, `• ${z}`, { breite: B, groesse: 8.8, farbe: F.ink700 }) + 13;
    }
  }

  // ------------------------------------------------ Zahlung
  platz(60);
  y += 8;
  s.rechteck(RAND, y, B, 44, F.sand100);
  const zahlText = gutschrift
    ? `Wir überweisen den Auszahlungsbetrag bis ${datumDe(b.faelligAm)}${b.auszahlung?.ibanMaskiert ? ` auf Ihr Konto ${b.auszahlung.ibanMaskiert}` : ""}.${b.auszahlung && !b.auszahlung.ok ? " Voraussetzung ist die abgeschlossene Verifizierung mit geprüfter Bankverbindung." : ""} Diese Gutschrift gilt als Abrechnung über Ihre Leistung (Pacht).`
    : `Bitte überweisen Sie den Rechnungsbetrag bis ${datumDe(b.faelligAm)} unter Angabe der Rechnungsnummer ${b.nummer}${bank?.iban ? ` auf das Konto ${bank.name}, IBAN ${bank.iban}${bank.beispiel ? " (Beispiel-IBAN, Demo)" : ""}` : ""}.`;
  s.absatz(RAND + 12, y + 17, zahlText, { breite: B - 24, groesse: 8.8, farbe: F.ink900 });
  y += 58;
  fuss();
  return doc.alsBuffer();
}
