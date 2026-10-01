// src/lib/plattform/eg/beleg-pdf.js
//
// Selbsterklärender Beleg der Energiegemeinschaft (Rechnung, Gutschrift, Stornobeleg) als PDF – „Transparenz-Rechnung“
// (Marktanalyse P3 Punkt 20; Schmerzpunkt „Wie viel habe ich bekommen? Warum ist die Rechnung so?“):
//   1. Auf einen Blick: Betrag, Fälligkeit, Zahlweg (Lastschrift mit Vorabankündigung bzw. Überweisung)
//   2. So ist Ihr Gemeinschaftsstrom entstanden: Verbrauch, davon aus der Gemeinschaft (Balken), Rest vom Lieferanten
//   3. So setzt sich der Betrag zusammen: Positionen mit Zählpunkt, Zeitfenster, Menge, Preis, Betrag
//   4. Steuer: Sätze, Hinweise (Kleinunternehmer, § 22, Reverse Charge, Gutschriftverfahren)
//   5. Ihr Vorteil (Schätzung): Netzentgelt-Reduktion, Abgaben, Energiepreis – getrennt vom Rechnungsbetrag
//   6. Energieherkunft, Pflichtangaben (UStG § 11, ElWG § 69), Erläuterung auf Verlangen kostenlos, Prüfsumme
// Nur serverseitig (Buffer). Aussteller ist die Gemeinschaft, nicht ÖkoInvest.

import { PdfDokument, umbrechen } from "../server/pdf.js";

const F = {
  navy950: "#03122b", navy900: "#041d42", navy700: "#0b3a7a", ov300: "#aed083", ov500: "#669933", ov600: "#558227", ov50: "#f2f8ea",
  ink900: "#151a24", ink700: "#394050", ink500: "#6b7486", ink200: "#dfe3ea", ink100: "#eef0f4", ink50: "#f7f8fa", sand100: "#f5f3ea", sun400: "#ffc53d", weiss: "#ffffff",
};
const RAND = 46;
const eur = (x) => `${(Math.round((Number(x) || 0) * 100) / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const kwh = (x) => `${(Math.round((Number(x) || 0) * 1000) / 1000).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} kWh`;
const ct = (x) => `${(Math.round((Number(x) || 0) * 10000) / 10000).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ct/kWh`;
const datum = (s) => (s ? String(s).slice(0, 10).split("-").reverse().join(".") : "–");
const zpKurz = (z) => (z ? `…${String(z).slice(-12)}` : "");
const TITEL = { rechnung: "RECHNUNG", gutschrift: "GUTSCHRIFT", storno: "STORNOBELEG", schlussrechnung: "SCHLUSSRECHNUNG" };

/**
 * @param {object} b Beleg (Ausgabe abBelegPdf: inkl. aussteller, empfaenger, positionen, summen, energie, ersparnis, herkunft, zahlweg, hash)
 * @param {{demo?:boolean}} o
 * @returns {Buffer}
 */
export function egBelegPdf(b, { demo = false } = {}) {
  const typ = b.typ || "rechnung";
  const gutschrift = typ === "gutschrift" || (typ === "storno" && b.ursprungTyp === "gutschrift");
  const a = b.aussteller || {};
  const e = b.empfaenger || {};
  const doc = new PdfDokument({ titel: `${TITEL[typ] || "Beleg"} ${b.nummer || "Entwurf"}`, autor: a.name || "Energiegemeinschaft", thema: `Abrechnung ${datum(b.von)} bis ${datum(b.bis)}` });
  const B = doc.breite - 2 * RAND;
  let s;
  let y;
  let seiteNr = 0;
  const fuss = () => {
    s.linie(RAND, doc.hoehe - 54, doc.breite - RAND, doc.hoehe - 54, { farbe: F.ink200 });
    const zeile = [a.name, [a.strasse, `${a.plz} ${a.ort}`].filter((x) => x && x.trim()).join(", "), a.zvr ? `ZVR ${a.zvr}` : a.fn ? `FN ${a.fn}` : "", a.uid ? `UID ${a.uid}` : "", a.iban ? `IBAN ${a.iban}` : "", a.creditorId ? `Gläubiger-ID ${a.creditorId}` : ""].filter(Boolean).join(" · ");
    umbrechen(zeile, B - 50, 7).slice(0, 2).forEach((t, i) => s.text(RAND, doc.hoehe - 42 + i * 9, t, { groesse: 7, farbe: F.ink500 }));
    s.text(doc.breite - RAND, doc.hoehe - 42, `Seite ${seiteNr}`, { groesse: 7, farbe: F.ink500, ausrichtung: "rechts" });
    s.text(RAND, doc.hoehe - 22, demo ? "Demo – fiktive Daten, kein steuerlicher Beleg." : "Erstellt über die Plattform der ÖkoInvest GmbH im Auftrag der Gemeinschaft.", { groesse: 7, fett: demo, farbe: demo ? F.ov600 : F.ink500 });
  };
  const neueSeite = (erste = false) => {
    if (s) fuss();
    s = doc.seite();
    seiteNr += 1;
    if (erste) {
      s.rechteck(0, 0, doc.breite, 92, F.navy950);
      s.text(RAND, 40, umbrechen(a.name || "Energiegemeinschaft", B - 170, 16, true)[0], { groesse: 16, fett: true, farbe: F.weiss });
      s.text(RAND, 60, "Energiegemeinschaft · gemeinsame Nutzung erneuerbarer Energie", { groesse: 8.5, farbe: F.ov300 });
      s.text(doc.breite - RAND, 40, TITEL[typ] || "BELEG", { groesse: 9, fett: true, farbe: F.ov300, ausrichtung: "rechts", zeichenabstand: 1.2 });
      s.text(doc.breite - RAND, 60, b.nummer || "Entwurf", { groesse: 12, fett: true, farbe: F.weiss, ausrichtung: "rechts" });
      s.text(doc.breite - RAND, 76, `vom ${datum(b.datum)}`, { groesse: 8.5, farbe: F.ov300, ausrichtung: "rechts" });
      y = 122;
    } else {
      s.rechteck(0, 0, doc.breite, 30, F.navy950);
      s.text(RAND, 20, a.name || "", { groesse: 9, fett: true, farbe: F.weiss });
      s.text(doc.breite - RAND, 20, `${TITEL[typ] || "Beleg"} ${b.nummer || ""}`, { groesse: 8.5, farbe: F.ov300, ausrichtung: "rechts" });
      y = 58;
    }
  };
  const platz = (h) => {
    if (y + h > doc.hoehe - 74) neueSeite();
  };
  const ueberschrift = (t) => {
    platz(34);
    y += 8;
    s.text(RAND, y, t.toUpperCase(), { groesse: 8, fett: true, farbe: F.ov600, zeichenabstand: 0.7 });
    y += 14;
  };
  const absatz = (t, { groesse = 8.5, farbe = F.ink700, fett = false, breite = B, x = RAND } = {}) => {
    for (const z of umbrechen(t, breite, groesse, fett)) {
      platz(groesse * 1.5);
      s.text(x, y, z, { groesse, farbe, fett });
      y += groesse * 1.45;
    }
  };

  neueSeite(true);
  // ------------------------------------------------ Parteien
  const halb = (B - 24) / 2;
  const block = (x, titel, zeilen) => {
    let yy = y;
    s.text(x, yy, titel, { groesse: 7.5, fett: true, farbe: F.ink500, zeichenabstand: 0.6 });
    yy += 13;
    for (const z of zeilen.filter(Boolean)) for (const t of umbrechen(z, halb, 9.5)) {
      s.text(x, yy, t, { groesse: 9.5, farbe: F.ink900 });
      yy += 12.5;
    }
    return yy;
  };
  const y1 = block(RAND, gutschrift ? "ERZEUGER / GUTSCHRIFTSEMPFÄNGER" : "MITGLIED / RECHNUNGSEMPFÄNGER", [e.name, e.strasse, `${e.plz || ""} ${e.ort || ""}`.trim(), e.uid ? `UID ${e.uid}` : "", b.mitgliedsnummer ? `Mitgliedsnummer ${b.mitgliedsnummer}` : ""]);
  const y2 = block(RAND + halb + 24, gutschrift ? "AUSSTELLER (LEISTUNGSEMPFÄNGER)" : "RECHNUNGSSTELLER", [a.name, a.strasse, `${a.plz || ""} ${a.ort || ""}`.trim(), a.uid ? `UID ${a.uid}` : a.ustStatus === "kleinunternehmer" ? "Kleinunternehmer" : "", a.email ? `Kontakt: ${a.email}` : ""]);
  y = Math.max(y1, y2) + 8;
  s.text(RAND, y, `Leistungszeitraum ${datum(b.von)} bis ${datum(b.bis)}`, { groesse: 9, fett: true, farbe: F.ink900 });
  const zps = (b.zaehlpunkte || []).map((z) => z.nummer).filter(Boolean);
  if (zps.length) {
    y += 12;
    absatz(`Zählpunkt${zps.length > 1 ? "e" : ""}: ${zps.join(", ")}`, { groesse: 8 });
  } else y += 14;
  if (typ === "storno") absatz(b.text || `Storno zu ${b.stornoVonNummer}`, { groesse: 9, fett: true, farbe: F.ink900 });

  // ------------------------------------------------ Auf einen Blick
  platz(84);
  y += 6;
  s.rechteck(RAND, y, B, 70, F.ov50, { rand: F.ov300 });
  const brutto = Number(b.summen?.brutto) || 0;
  s.text(RAND + 16, y + 20, gutschrift ? "Wir überweisen Ihnen" : typ === "storno" ? "Korrekturbetrag" : "Rechnungsbetrag", { groesse: 8.5, farbe: F.ink700 });
  s.text(RAND + 16, y + 46, eur(Math.abs(brutto)), { groesse: 22, fett: true, farbe: F.ink900 });
  const zw = b.zahlweg || {};
  const zahlText = gutschrift
    ? `Auszahlung auf Ihr Konto ${zw.ibanMaskiert || ""} bis ${datum(b.faelligAm)}.`
    : zw.art === "lastschrift"
      ? `Wir ziehen den Betrag am ${datum(b.faelligAm)} per SEPA-Lastschrift von Ihrem Konto ${zw.ibanMaskiert || ""} ein. Mandatsreferenz ${zw.mandatRef || "–"}, Gläubiger-ID ${zw.creditorId || "–"} (Vorabankündigung).`
      : `Bitte überweisen Sie den Betrag bis ${datum(b.faelligAm)} auf ${a.iban || "das Konto der Gemeinschaft"} – Verwendungszweck ${b.nummer || ""}.`;
  let yy = y + 18;
  for (const t of umbrechen(typ === "storno" ? "Der Betrag wird mit dem ursprünglichen Beleg verrechnet bzw. erstattet." : zahlText, B / 2 - 10, 8.5)) {
    s.text(RAND + B / 2, yy, t, { groesse: 8.5, farbe: F.ink700 });
    yy += 11.5;
  }
  y += 84;

  // ------------------------------------------------ Energie (Erklärung)
  const en = b.energie || {};
  if (!gutschrift && en.verbrauchGemessen > 0) {
    ueberschrift("So ist Ihr Gemeinschaftsstrom entstanden");
    const quote = Math.max(0, Math.min(1, (en.eigendeckung || 0) / en.verbrauchGemessen));
    platz(46);
    s.rechteck(RAND, y, B, 14, F.ink100);
    s.rechteck(RAND, y, Math.max(2, B * quote), 14, F.ov500);
    y += 28;
    absatz(`Ihr gemessener Verbrauch: ${kwh(en.verbrauchGemessen)}. Davon kamen ${kwh(en.eigendeckung)} (${String(Math.round(quote * 1000) / 10).replace(".", ",")} %) aus Anlagen der Gemeinschaft – diese Menge verrechnen wir hier. Den Rest (${kwh(en.verbrauchGemessen - en.eigendeckung)}) liefert und verrechnet wie bisher Ihr Stromlieferant. Grundlage sind die Viertelstundenwerte Ihres Netzbetreibers (ElWG § 71).`);
  } else if (gutschrift && (en.erzeugungTf > 0 || en.eingebracht > 0)) {
    ueberschrift("So wurde Ihr Strom in der Gemeinschaft genutzt");
    const quote = en.erzeugungTf > 0 ? Math.max(0, Math.min(1, (en.eingebracht || 0) / en.erzeugungTf)) : 0;
    platz(46);
    s.rechteck(RAND, y, B, 14, F.ink100);
    s.rechteck(RAND, y, Math.max(2, B * quote), 14, F.ov500);
    y += 28;
    absatz(`Ihre der Gemeinschaft zugeordnete Erzeugung: ${kwh(en.erzeugungTf)}. Davon haben Mitglieder ${kwh(en.eingebracht)} (${String(Math.round(quote * 1000) / 10).replace(".", ",")} %) zeitgleich verbraucht – diese Menge vergüten wir hier. Der Restüberschuss (${kwh(en.restueberschuss)}) geht wie bisher an Ihren Stromabnehmer (ElWG § 71 Abs. 3).`);
  }

  // ------------------------------------------------ Positionen
  ueberschrift("So setzt sich der Betrag zusammen");
  const sp = [RAND, RAND + B * 0.46, RAND + B * 0.64, RAND + B * 0.82, RAND + B];
  platz(20);
  s.text(sp[0], y, "Leistung", { groesse: 7.5, fett: true, farbe: F.ink500 });
  s.text(sp[2] - 6, y, "Menge", { groesse: 7.5, fett: true, farbe: F.ink500, ausrichtung: "rechts" });
  s.text(sp[3] - 6, y, "Preis (netto)", { groesse: 7.5, fett: true, farbe: F.ink500, ausrichtung: "rechts" });
  s.text(sp[4], y, "Betrag (netto)", { groesse: 7.5, fett: true, farbe: F.ink500, ausrichtung: "rechts" });
  y += 6;
  s.linie(RAND, y, RAND + B, y, { farbe: F.ink200 });
  y += 12;
  for (const p of b.positionen || []) {
    const zeilen = umbrechen(`${p.text}${p.zaehlpunkt ? ` · ZP ${zpKurz(p.zaehlpunkt)}` : ""}${p.von && p.von !== b.von ? ` · ab ${datum(p.von)}` : ""}`, sp[1] - sp[0] + 40, 8.5);
    platz(zeilen.length * 11 + 8);
    zeilen.forEach((t, i) => s.text(sp[0], y + i * 11, t, { groesse: 8.5, farbe: F.ink900 }));
    const menge = p.einheit === "kWh" ? kwh(p.menge) : `${String(p.menge).replace(".", ",")} ${p.einheit === "Stk" ? "×" : p.einheit}`;
    s.text(sp[2] - 6, y, menge, { groesse: 8.5, farbe: F.ink700, ausrichtung: "rechts" });
    s.text(sp[3] - 6, y, p.preisEinheit === "ct/kWh" ? ct(p.preis) : eur(p.preis), { groesse: 8.5, farbe: F.ink700, ausrichtung: "rechts" });
    s.text(sp[4], y, eur(p.netto), { groesse: 8.5, fett: true, farbe: F.ink900, ausrichtung: "rechts" });
    y += zeilen.length * 11;
    if (p.preisHerkunft && p.einheit === "kWh") {
      s.text(sp[0], y, `Preis: ${p.preisHerkunft}`, { groesse: 7, farbe: F.ink500 });
      y += 10;
    }
    y += 4;
  }
  s.linie(RAND, y, RAND + B, y, { farbe: F.ink200 });
  y += 14;
  const summe = (label, wert, fett = false) => {
    platz(14);
    s.text(sp[3] - 6, y, label, { groesse: 9, fett, farbe: F.ink700, ausrichtung: "rechts" });
    s.text(sp[4], y, eur(wert), { groesse: 9, fett, farbe: F.ink900, ausrichtung: "rechts" });
    y += 13;
  };
  summe("Summe netto", b.summen?.netto);
  for (const z of b.summen?.zeilen || []) {
    if (z.art === "ust") summe(`USt ${z.satz} % auf ${eur(z.basis)}`, z.betrag);
    else if (z.art === "rc") summe(`USt 0 % (Steuerschuld geht über) auf ${eur(z.basis)}`, 0);
    else if (z.art === "befreit") summe(`USt 0 % (befreit) auf ${eur(z.basis)}`, 0);
  }
  summe(gutschrift ? "Gutschrift gesamt" : "Gesamtbetrag", b.summen?.brutto, true);

  // ------------------------------------------------ Steuer
  const hinweise = b.summen?.hinweise || [];
  if (hinweise.length || gutschrift) {
    ueberschrift("Steuerhinweise");
    for (const h of hinweise) absatz(h);
    if (gutschrift) absatz("Diese Gutschrift gilt als Rechnung des Erzeugers (Gutschriftverfahren gem. § 11 Abs. 7 UStG). Bitte widersprechen Sie, falls Angaben nicht stimmen.");
    if ((b.summen?.zeilen || []).some((z) => z.art === "rc")) absatz(`UID des Erzeugers: ${e.uid || "fehlt"} · UID der Gemeinschaft: ${a.uid || "fehlt"}. Die Gemeinschaft schuldet die Umsatzsteuer (${eur(b.summen?.rcSteuer)}).`);
  }

  // ------------------------------------------------ Vorteil (Schätzung)
  const es = b.ersparnis;
  if (es && !gutschrift) {
    ueberschrift("Ihr Vorteil durch die Energiegemeinschaft (Schätzung)");
    const zeilen = [
      es.netzEur !== null && es.netzEur !== undefined ? `Reduziertes Netzentgelt (−${es.reduktionPct} % Netznutzungs-Arbeitspreis): ca. ${eur(es.netzEur)}` : "Reduziertes Netzentgelt: Arbeitspreis Ihres Netzbetreibers noch nicht hinterlegt.",
      es.abgabeEur > 0 ? `Befreiung von der Elektrizitätsabgabe für Gemeinschaftsstrom: ca. ${eur(es.abgabeEur)}` : "",
      es.efbEur > 0 ? `Erneuerbaren-Förderbeitrag (arbeitsbezogen): ca. ${eur(es.efbEur)}` : "",
      es.energieEur !== null && es.energieEur !== undefined ? `Günstigerer Energiepreis gegenüber Ihrem Lieferanten: ca. ${eur(es.energieEur)}` : "",
    ].filter(Boolean);
    for (const z of zeilen) absatz(`• ${z}`, { groesse: 8.5, farbe: F.ink900 });
    absatz(`Summe ca. ${eur(es.summeEur)}. Netzentgelt und Abgaben zieht Ihr Netzbetreiber direkt auf Ihrer Netzrechnung ab – die Beträge sind hier nur zur Information ausgewiesen und nicht Teil des Rechnungsbetrags.${es.platzhalter ? " Die Netzentgelt-Regel ab 2027 ist noch nicht verordnet (Schätzwert)." : ""}`, { groesse: 7.5, farbe: F.ink500 });
  }
  if (gutschrift && b.erzeugervorteilEur !== null && b.erzeugervorteilEur !== undefined) {
    ueberschrift("Ihr Vorteil als Erzeuger (Schätzung)");
    absatz(`Mehrerlös gegenüber dem Marktpreis für Überschussstrom: ca. ${eur(b.erzeugervorteilEur)}.`);
  }

  // ------------------------------------------------ Herkunft, Pflichtangaben, Erläuterung
  ueberschrift("Herkunft und Hinweise");
  if (b.herkunft?.text) absatz(`Energieherkunft: ${b.herkunft.text}`);
  if (b.lieferantenpflichten) absatz("Auf Verlangen erläutern wir diese Rechnung kostenlos (ElWG § 69 Abs. 1 Z 5). Sie können zwischen Monats- und Jahresrechnung wählen (§ 69 Abs. 3).");
  else absatz("Fragen zu diesem Beleg? Wir erklären jede Zahl – bis zur Viertelstunde und zur Nachricht des Netzbetreibers. Melden Sie sich im Mitgliederportal.");
  if (b.hash) absatz(`Prüfsumme (SHA-256): ${b.hash}`, { groesse: 6.5, farbe: F.ink500 });
  fuss();
  return doc.alsBuffer();
}
