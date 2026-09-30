// src/lib/plattform/buchhaltung/dokument-pdf.js
//
// PDF für Mahnung (Zahlungserinnerung/Mahnstufe) und Stornobeleg im Markenstil – nur serverseitig (server/pdf.js),
// nicht im Barrel index.js. Daten: Operation bhBelegDokument (Rechte bereits geprüft).
// Stornobeleg: eigene fortlaufende Nummer, Verweis auf Nummer und Datum des Ursprungsbelegs, Beträge mit umgekehrtem
// Vorzeichen, Grund; Aussteller/Empfänger wie im Ursprung.

import { PdfDokument, umbrechen } from "../server/pdf";
import { datumDe, euro } from "../finanzen/basis.js";

const F = { navy950: "#03122b", navy900: "#041d42", ov300: "#aed083", ov600: "#558227", ink900: "#151a24", ink700: "#394050", ink500: "#6b7486", ink200: "#dfe3ea", ink100: "#eef0f4", ink50: "#f7f8fa", weiss: "#ffffff" };
const RAND = 48;

export function dokumentPdf(d, { demo = false } = {}) {
  const b = d.beleg;
  const storno = d.art === "storno";
  const kopfTitel = storno ? d.storno.titel : d.mahnung.label;
  const nummer = storno ? d.storno.nummer : d.mahnung.nr;
  const doc = new PdfDokument({ titel: `${kopfTitel} ${nummer}`, thema: b.titel });
  const B = doc.breite - 2 * RAND;
  const s = doc.seite();
  s.rechteck(0, 0, doc.breite, 96, F.navy950);
  s.text(RAND, 44, "ÖkoInvest", { groesse: 19, fett: true, farbe: F.weiss });
  s.text(doc.breite - RAND, 44, storno ? "STORNO" : "ZAHLUNGSERINNERUNG", { groesse: 9, fett: true, farbe: F.ov300, ausrichtung: "rechts", zeichenabstand: 1.2 });
  s.text(RAND, 74, kopfTitel, { groesse: 13, fett: true, farbe: F.weiss });
  s.text(doc.breite - RAND, 74, nummer, { groesse: 12, fett: true, farbe: F.weiss, ausrichtung: "rechts" });
  let y = 128;
  const p = b.partei || {};
  const a = b.aussteller || {};
  const halb = (B - 24) / 2;
  const block = (x, titel, zeilen) => {
    let yy = y;
    s.text(x, yy, titel, { groesse: 7.5, fett: true, farbe: F.ink500, zeichenabstand: 0.6 });
    yy += 14;
    for (const z of zeilen.filter(Boolean)) for (const t of umbrechen(z, halb, 9.5)) {
      s.text(x, yy, t, { groesse: 9.5, farbe: F.ink900 });
      yy += 13;
    }
    return yy;
  };
  const y1 = block(RAND, "EMPFÄNGER", [p.name, p.zuHaenden ? `z. H. ${p.zuHaenden}` : "", p.anschrift, p.uid ? `UID ${p.uid}` : ""]);
  const y2 = block(RAND + halb + 24, "AUSSTELLER", [a.name, a.anschrift, a.uid ? `UID ${a.uid}` : "", a.firmenbuch]);
  y = Math.max(y1, y2) + 10;
  const meta = storno
    ? [["Storno-Nr.", d.storno.nummer], ["Datum", datumDe(d.storno.datum)], ["Storniert wird", `${b.beleg === "gutschrift" ? "Gutschrift" : "Rechnung"} ${d.storno.ursprungNummer} vom ${datumDe(d.storno.ursprungDatum)}`], ["Leistungszeitraum", `${datumDe(b.zeitraum?.von)} – ${datumDe(b.zeitraum?.bis)}`]]
    : [["Mahnung-Nr.", d.mahnung.nr], ["Datum", datumDe(d.mahnung.datum || String(d.mahnung.am).slice(0, 10))], ["Rechnung", `${b.nummer} vom ${datumDe(b.rechnungsdatum)}`], ["Ursprünglich fällig", datumDe(b.faelligAm)], ["Neue Zahlungsfrist", datumDe(d.mahnung.frist)]];
  s.rechteck(RAND, y, B, 18 * meta.length + 10, F.ink50);
  let ym = y + 17;
  for (const [k, w] of meta) {
    s.text(RAND + 12, ym, k, { groesse: 8.5, farbe: F.ink500 });
    s.text(RAND + 140, ym, umbrechen(w, B - 160, 9)[0] || "", { groesse: 9, fett: k.endsWith("Nr."), farbe: F.ink900 });
    ym += 18;
  }
  y += 18 * meta.length + 30;

  const zeile = (label, wert, fett = false) => {
    s.text(RAND, y, label, { groesse: fett ? 10 : 9.5, fett, farbe: F.ink700 });
    s.text(RAND + B, y, wert, { groesse: fett ? 11 : 9.5, fett, farbe: F.ink900, ausrichtung: "rechts" });
    y += fett ? 20 : 16;
  };
  if (storno) {
    for (const pos of d.storno.positionen || []) {
      const t = umbrechen(pos.text || "", B - 120, 9);
      t.forEach((z, i) => s.text(RAND, y + i * 12, z, { groesse: 9, farbe: F.ink900 }));
      s.text(RAND + B, y, euro(pos.betrag), { groesse: 9, fett: true, farbe: F.ink900, ausrichtung: "rechts" });
      y += t.length * 12 + 8;
    }
    s.linie(RAND, y - 4, RAND + B, y - 4, { farbe: F.ink200 });
    y += 10;
    zeile("Summe netto", euro(d.storno.netto));
    zeile(d.storno.steuer?.satz ? `Umsatzsteuer ${Math.round(d.storno.steuer.satz * 1000) / 10} %` : "Umsatzsteuer", euro(d.storno.steuer?.betrag || 0));
    zeile("Stornobetrag", euro(d.storno.brutto), true);
    y += 6;
    y = s.absatz(RAND, y, `Grund: ${d.storno.grund}`, { breite: B, groesse: 9, farbe: F.ink700 }) + 18;
    if (d.storno.steuer?.text) y = s.absatz(RAND, y, `Steuerlicher Hinweis (wie Ursprungsbeleg): ${d.storno.steuer.text}`, { breite: B, groesse: 8.5, farbe: F.ink700 }) + 18;
    const hinweis = d.storno.bereitsGezahlt > 0
      ? b.beleg === "gutschrift"
        ? `Der Betrag von ${euro(d.storno.bereitsGezahlt)} wurde bereits ausgezahlt. Die Rückforderung bzw. Verrechnung stimmen wir gesondert mit Ihnen ab.`
        : `Ihre Zahlung von ${euro(d.storno.bereitsGezahlt)} erstatten wir bzw. verrechnen sie mit einer korrigierten Rechnung.`
      : `Die ${b.beleg === "gutschrift" ? "Gutschrift" : "Rechnung"} ${d.storno.ursprungNummer} ist damit gegenstandslos. Soweit erforderlich, erhalten Sie einen korrigierten Beleg.`;
    y = s.absatz(RAND, y, hinweis, { breite: B, groesse: 9.5, farbe: F.ink900 }) + 18;
  } else {
    s.text(RAND, y, "Sehr geehrte Damen und Herren,", { groesse: 10, farbe: F.ink900 });
    y += 20;
    for (const t of d.text || []) y = s.absatz(RAND, y, t, { breite: B, groesse: 10, farbe: F.ink900 }) + 18;
    y += 4;
    zeile("Offener Rechnungsbetrag", euro(d.mahnung.offen));
    if (d.mahnung.gebuehr) zeile("Mahngebühr", euro(d.mahnung.gebuehr));
    if (d.mahnung.zinsen) zeile(`Verzugszinsen ${String(d.mahnung.zinssatz).replace(".", ",")} % p. a. (${d.mahnung.zinsNorm})`, euro(d.mahnung.zinsen));
    if (d.mahnung.pauschale) zeile(`Pauschale (${d.mahnung.pauschaleNorm})`, euro(d.mahnung.pauschale));
    const frueher = Math.round((d.mahnung.kostenGesamt - (d.mahnung.gebuehr || 0) - (d.mahnung.zinsen || 0) - (d.mahnung.pauschale || 0)) * 100) / 100;
    if (frueher > 0) zeile("Kosten früherer Mahnungen", euro(frueher));
    s.linie(RAND, y - 9, RAND + B, y - 9, { farbe: F.ink200 });
    zeile("Zu zahlen", euro(d.mahnung.gesamt), true);
    const bank = b.bankverbindung;
    if (bank?.iban) {
      y += 6;
      y = s.absatz(RAND, y, `Bankverbindung: ${bank.name}, IBAN ${bank.iban}${bank.bic ? `, BIC ${bank.bic}` : ""} · Verwendungszweck: ${b.nummer}`, { breite: B, groesse: 9.5, farbe: F.ink900 }) + 18;
    }
    y += 6;
    s.text(RAND, y, "Mit freundlichen Grüßen", { groesse: 10, farbe: F.ink900 });
    y += 16;
    s.text(RAND, y, `${a.name || "ÖkoInvest GmbH"} – Buchhaltung`, { groesse: 10, farbe: F.ink900 });
  }
  s.linie(RAND, doc.hoehe - 50, doc.breite - RAND, doc.hoehe - 50, { farbe: F.ink200 });
  s.text(RAND, doc.hoehe - 36, umbrechen([a.name, a.anschrift, a.firmenbuch, a.uid ? `UID ${a.uid}` : ""].filter(Boolean).join(" · "), B - 60, 7.5)[0] || "", { groesse: 7.5, farbe: F.ink500 });
  if (demo) s.text(RAND, doc.hoehe - 24, "Demo – fiktive Daten, kein steuerlicher Beleg.", { groesse: 7.5, fett: true, farbe: F.ov600 });
  return doc.alsBuffer();
}
