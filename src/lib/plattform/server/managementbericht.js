// src/lib/plattform/server/managementbericht.js
//
// Management-Bericht der Leitung als PDF (Querschnitt, Team 10): Kennzahlen aller Bereiche (server/leitung.js)
// plus Monatswerte aus der Operation `bericht` (Anfragen, neue Flächen, Provision im Monat). Gemeinsamer
// PDF-Erzeuger server/pdf.js, Markenfarben wie Monatsbericht und Exposé. Vertraulich, nur intern.

import { PdfDokument, umbrechen } from "./pdf";
import { monatName } from "./monatsbericht";
import { fmt } from "@/lib/rechner/annahmen";

const F = { navy950: "#03122b", navy900: "#041d42", navy500: "#1f5aa1", ov300: "#aed083", ov500: "#669933", ink900: "#151a24", ink700: "#394050", ink500: "#6b7486", ink100: "#eef0f4", ink50: "#f7f8fa", sun400: "#ffc53d", weiss: "#ffffff" };
const RAND = 44;
const FUSS = 58;

const z = (x, st = 0) => (Number.isFinite(Number(x)) && x !== null ? fmt(Number(x), st) : "–");
const eur = (x) => (Number.isFinite(Number(x)) ? `${fmt(Math.round(Number(x)))} €` : "–");
const pct = (x) => (Number.isFinite(Number(x)) && x !== null ? `${fmt(Number(x) * 100, 0)} %` : "–");
const nv = (blk) => (blk?.ok ? null : `nicht verfügbar (${blk?.fehler || "Modul"})`);

export function managementberichtPdf({ kennzahlen: k, monat, monatsbericht: mb = null, ersteller = "" }) {
  const doc = new PdfDokument({ titel: `Management-Bericht ${monatName(monat)}`, thema: "Management-Bericht der Leitung (vertraulich)" });
  const B = doc.breite - 2 * RAND;
  let s = null;
  let y = 0;

  const neueSeite = (erste = false) => {
    s = doc.seite();
    if (erste) {
      s.rechteck(0, 0, doc.breite, 118, F.navy950);
      s.text(RAND, 44, "ÖkoInvest", { groesse: 19, fett: true, farbe: F.weiss });
      s.text(doc.breite - RAND, 44, "MANAGEMENT-BERICHT", { groesse: 8.5, fett: true, farbe: F.ov300, ausrichtung: "rechts", zeichenabstand: 1 });
      s.text(RAND, 84, monatName(monat), { groesse: 24, fett: true, farbe: F.weiss });
      s.text(RAND, 104, `Stand der Kennzahlen ${new Date(k.stand).toLocaleString("de-AT", { timeZone: "Europe/Vienna" })} · Vertraulich, nur für die Geschäftsleitung`, { groesse: 9, farbe: F.ov300 });
      y = 146;
    } else {
      s.rechteck(0, 0, doc.breite, 32, F.navy950);
      s.text(RAND, 21, "ÖkoInvest", { groesse: 10, fett: true, farbe: F.weiss });
      s.text(doc.breite - RAND, 21, `Management-Bericht ${monatName(monat)}`, { groesse: 8.5, farbe: F.ov300, ausrichtung: "rechts" });
      y = 60;
    }
  };
  const platz = (h) => {
    if (y + h > doc.hoehe - FUSS - 6) neueSeite();
  };
  const ueberschrift = (t) => {
    platz(60);
    y += 10;
    s.text(RAND, y, t, { groesse: 12.5, fett: true, farbe: F.navy900 });
    s.rechteck(RAND, y + 5, 24, 2.2, F.ov500);
    y += 22;
  };
  const zeilen = (paare) => {
    for (const [l, w] of paare) {
      platz(17);
      s.text(RAND + 6, y, umbrechen(l, B * 0.55, 9.5)[0] || "", { groesse: 9.5, farbe: F.ink700 });
      s.text(RAND + B - 6, y, umbrechen(String(w ?? "–"), B * 0.42, 9.5, true)[0] || "", { groesse: 9.5, fett: true, farbe: F.ink900, ausrichtung: "rechts" });
      s.linie(RAND, y + 6, RAND + B, y + 6, { farbe: F.ink100 });
      y += 17;
    }
    y += 4;
  };
  const balken = (eintraege, format) => {
    const max = Math.max(1, ...eintraege.map((e) => e.wert || 0));
    const labelB = 140;
    const bahn = B - labelB - 80;
    for (const e of eintraege) {
      platz(18);
      s.text(RAND, y + 3, umbrechen(e.label, labelB - 8, 9)[0] || "", { groesse: 9, farbe: F.ink700 });
      s.rechteck(RAND + labelB, y - 6, bahn, 11, F.ink50);
      const bw = ((e.wert || 0) / max) * bahn;
      if (bw > 0) s.rechteck(RAND + labelB, y - 6, bw, 11, e.farbe || F.ov500);
      s.text(RAND + B, y + 3, format(e.wert), { groesse: 9, fett: true, farbe: F.ink900, ausrichtung: "rechts" });
      y += 18;
    }
    y += 4;
  };
  const hinweis = (t) => {
    platz(16);
    s.text(RAND + 6, y, t, { groesse: 9, farbe: F.ink500 });
    y += 16;
  };

  neueSeite(true);

  // Kacheln
  const kacheln = [
    ["Entwicklungs-Pipeline", k.pipeline.ok ? `${z(k.pipeline.mwp, 1)} MWp` : "–"],
    ["Gesicherte Fläche", k.flaechen.ok ? `${z(k.flaechen.gesichertHa, 1)} ha` : "–"],
    ["Provisionen offen", k.deals.ok ? eur(k.deals.offen + k.deals.inRechnung) : "–"],
    ["Offene Posten", k.finanzen.ok ? eur(k.finanzen.forderungenOffen) : "–"],
  ];
  const kb = (B - 3 * 10) / 4;
  kacheln.forEach(([l, w], i) => {
    const x = RAND + i * (kb + 10);
    s.rechteck(x, y - 14, kb, 54, i === 3 ? F.navy950 : F.ink50);
    s.text(x + 10, y + 2, l, { groesse: 8, fett: true, farbe: i === 3 ? F.ov300 : F.ink500 });
    s.text(x + 10, y + 26, umbrechen(w, kb - 20, 14, true)[0] || w, { groesse: 14, fett: true, farbe: i === 3 ? F.weiss : F.ink900 });
  });
  y += 58;

  if (k.hinweise?.length) {
    ueberschrift("Hinweise");
    for (const h of k.hinweise) {
      for (const zeile of umbrechen(`• ${h.text}`, B - 12, 9.5)) {
        platz(15);
        s.text(RAND + 6, y, zeile, { groesse: 9.5, farbe: h.ton === "warn" ? F.ink900 : F.ink700, fett: h.ton === "warn" });
        y += 14;
      }
    }
    y += 4;
  }

  if (mb?.kennzahlen) {
    const m = mb.kennzahlen;
    ueberschrift(`Im ${monatName(monat)}`);
    zeilen([
      ["Anfragen (davon qualifiziert)", `${z(m.anfragen)} (${pct(m.qualifiziertQuote)})`],
      ["Neue Flächen", `${z(m.flaechenNeu)} · ${z(m.flaechenHa)} ha`],
      ["Projekte veröffentlicht / verkauft", `${z(m.projekteVeroeffentlicht)} / ${z(m.verkaeufe)}`],
      ["Provision realisiert", eur(m.provisionRealisiert)],
    ]);
  }

  ueberschrift("Pipeline je Phase (MWp)");
  if (k.pipeline.ok) {
    balken(k.pipeline.jePhase.map((p) => ({ label: `${p.label} (${p.anzahl})`, wert: p.mwp })), (x) => `${z(x, 1)} MWp`);
    zeilen([
      ["Pipeline gewichtet", `${z(k.pipeline.mwpGewichtet, 1)} MWp · ${eur(k.pipeline.wert)}`],
      [`COD-Prognose ${k.pipeline.naechstesJahr}`, `${z(k.pipeline.naechstesJahrMwp, 1)} MWp${k.pipeline.zielJahr ? ` (Ziel rund ${z(k.pipeline.zielJahr)} MWp/Jahr)` : ""}`],
      ["Meilensteine im Verzug / Fristen 30 Tage", `${z(k.pipeline.verzug)} / ${z(k.pipeline.fristen30)}`],
      ["Börse sichtbar / in Prüfung", k.boerse.ok ? `${z(k.boerse.mwp, 1)} MWp / ${z(k.boerse.inPruefung)}` : "–"],
    ]);
  } else hinweis(nv(k.pipeline));

  ueberschrift("Flächen & Deals");
  zeilen([
    ["Gesicherte Fläche (Vertrag bis Betrieb)", k.flaechen.ok ? `${z(k.flaechen.gesichertHa, 1)} ha · ${z(k.flaechen.gesichertAnzahl)} Flächen` : nv(k.flaechen)],
    ["davon Agri-PV", k.flaechen.ok ? `${z(k.flaechen.agriHa, 1)} ha` : "–"],
    ["Flächen in Prüfung", k.flaechen.ok ? `${z(k.flaechen.pipelineHa, 1)} ha · ${z(k.flaechen.pipelineAnzahl)}` : "–"],
    ["NDA offen / LOIs offen", k.boerse.ok ? `${z(k.boerse.ndaOffen)} / ${z(k.boerse.loiOffen)}` : "–"],
    ["Provision offen / in Rechnung", k.deals.ok ? `${eur(k.deals.offen)} / ${eur(k.deals.inRechnung)}` : nv(k.deals)],
    [`Provision bezahlt ${new Date().getFullYear()}`, k.deals.ok ? eur(k.deals.bezahltJahr) : "–"],
    ["Closings offen / vollzogen", k.deals.ok && k.deals.closing ? `${z(k.deals.closing.offen)} / ${z(k.deals.closing.vollzogen)} (${eur(k.deals.closing.volumen)})` : "–"],
  ]);

  ueberschrift("Anlagen & Energie");
  zeilen([
    ["Anlagen / Leistung", k.anlagen.ok ? `${z(k.anlagen.anzahl)} · ${z(k.anlagen.kwp / 1000, 2)} MWp` : nv(k.anlagen)],
    ["Erzeugung seit 1.1. / spez. Ertrag", k.anlagen.ok ? `${z(k.anlagen.erzeugungJahrMwh, 1)} MWh / ${z(k.anlagen.spezErtrag)} kWh/kWp` : "–"],
    ["Verfügbarkeit (Ampel grün/gelb)", k.anlagen.ok ? pct(k.anlagen.verfuegbarkeit) : "–"],
    ["Kritische Störungen offen", k.anlagen.ok ? z(k.anlagen.kritisch) : "–"],
    ["Energie-Pool: Kunden / Jahresbedarf", k.energie.ok ? `${z(k.energie.kunden)} / ${z(k.energie.jahresGwh, 2)} GWh` : nv(k.energie)],
    ["Absicherung (Hedge-Quote)", k.energie.ok ? pct(k.energie.hedgeQuote) : "–"],
  ]);
  if (k.anlagen.ok && k.anlagen.quelle === "simulator") hinweis("Messwerte aus dem Simulator (Demo-Betrieb).");

  ueberschrift("Compliance, Finanzen & Finanzierung");
  zeilen([
    ["KYC-Warteschlange / Vier-Augen / nachgefordert", k.kyc.ok ? `${z(k.kyc.warteschlange)} / ${z(k.kyc.zweitpruefung)} / ${z(k.kyc.nachgefordert)}` : nv(k.kyc)],
    ["Mögliche Sanktions-/PEP-Treffer", k.kyc.ok ? z(k.kyc.treffer) : "–"],
    ["Forderungen offen / überfällig", k.finanzen.ok ? `${eur(k.finanzen.forderungenOffen)} / ${eur(k.finanzen.ueberfaellig)}` : nv(k.finanzen)],
    ["Gutschriften offen / Klärfälle", k.finanzen.ok ? `${eur(k.finanzen.gutschriftenOffen)} / ${z(k.finanzen.klaerfaelleOffen)}` : "–"],
    ["Kreditvolumen / Fälle aktiv", k.finanzierung.ok ? `${eur(k.finanzierung.kreditvolumen)} / ${z(k.finanzierung.faelleAktiv)}` : nv(k.finanzierung)],
    ["Covenant-Ampel rot / gelb", k.finanzierung.ok ? `${z(k.finanzierung.ampelRot)} / ${z(k.finanzierung.ampelGelb)}` : "–"],
  ]);

  ueberschrift("Betrieb");
  zeilen([
    ["Offene Vorgänge (neu in 7 Tagen)", k.betrieb.ok ? `${z(k.betrieb.vorgaengeOffen)} (${z(k.betrieb.neu7)})` : nv(k.betrieb)],
    ["Ohne Zuständigen", k.betrieb.ok ? z(k.betrieb.ohneZustaendig) : "–"],
    ["Überfällige Wiedervorlagen", k.betrieb.ok ? z(k.betrieb.aufgabenUeberfaellig) : "–"],
  ]);
  hinweis("Kennzahlen = aktueller Stand zum Erstellungszeitpunkt; Monatswerte aus Statusverläufen des gewählten Monats.");

  doc.seiten.forEach((seite, i) => {
    seite.linie(RAND, doc.hoehe - 40, doc.breite - RAND, doc.hoehe - 40, { farbe: F.ink100 });
    seite.text(RAND, doc.hoehe - 26, `Vertraulich · erstellt${ersteller ? ` von ${ersteller}` : ""} am ${new Date().toLocaleDateString("de-AT", { timeZone: "Europe/Vienna" })}`, { groesse: 7.5, farbe: F.ink500 });
    seite.text(doc.breite - RAND, doc.hoehe - 26, `Seite ${i + 1} von ${doc.seiten.length}`, { groesse: 7.5, farbe: F.ink500, ausrichtung: "rechts" });
  });
  return doc.alsBuffer();
}
