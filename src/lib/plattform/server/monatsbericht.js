// src/lib/plattform/server/monatsbericht.js
//
// Monatsbericht des Backoffice als PDF (gemeinsamer PDF-Erzeuger server/pdf.js, Markenfarben wie
// das Exposé) und Bericht als CSV (Excel-DE über csv.js). Daten: Operation `bericht` des Backends.

import { PdfDokument, umbrechen } from "./pdf";
import { csvWert } from "../csv";
import { LAENDER } from "../konstanten";
import { fmt } from "@/lib/rechner/annahmen";

const F = {
  navy950: "#03122b", navy900: "#041d42", navy700: "#003473", navy500: "#1f5aa1", ov300: "#aed083", ov500: "#669933", ov600: "#558227",
  ink900: "#151a24", ink700: "#394050", ink500: "#6b7486", ink400: "#97a0b0", ink200: "#dfe3ea", ink100: "#eef0f4", ink50: "#f7f8fa", sand100: "#f5f3ea", sun400: "#ffc53d", weiss: "#ffffff",
};
const LAND_FARBE = { DE: F.ov500, AT: F.navy500, CH: F.sun400 };
const RAND = 44;
const FUSS = 58;

const eur = (x) => (Number.isFinite(x) ? `${fmt(Math.round(x))} €` : "–");
const pct = (x) => (Number.isFinite(x) ? `${fmt(x * 100, 0)} %` : "–");
const zahl = (x, s = 0) => (Number.isFinite(Number(x)) && x !== null ? fmt(Number(x), s) : "–");
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
export const monatName = (m) => (/^\d{4}-\d{2}$/.test(m || "") ? `${MONATE[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}` : m);

function delta(jetzt, vorher, format = (x) => zahl(x)) {
  if (!Number.isFinite(jetzt) || !Number.isFinite(vorher)) return "";
  const d = jetzt - vorher;
  if (Math.abs(d) < 1e-9) return "± 0 ggü. Vormonat";
  return `${d > 0 ? "+" : "–"}${format(Math.abs(d))} ggü. Vormonat`;
}

export function monatsberichtPdf({ bericht: b, vormonat: vb = null, monat, ersteller = "" }) {
  const doc = new PdfDokument({ titel: `Monatsbericht Backoffice ${monatName(monat)}`, thema: "Interner Monatsbericht (vertraulich)" });
  const B = doc.breite - 2 * RAND;
  let s = null;
  let y = 0;

  const neueSeite = (erste = false) => {
    s = doc.seite();
    if (erste) {
      s.rechteck(0, 0, doc.breite, 118, F.navy950);
      s.text(RAND, 44, "ÖkoInvest", { groesse: 19, fett: true, farbe: F.weiss });
      s.text(doc.breite - RAND, 44, "MONATSBERICHT BACKOFFICE", { groesse: 8.5, fett: true, farbe: F.ov300, ausrichtung: "rechts", zeichenabstand: 1 });
      s.text(RAND, 84, monatName(monat), { groesse: 24, fett: true, farbe: F.weiss });
      s.text(RAND, 104, `Zeitraum ${b.zeitraum.von.split("-").reverse().join(".")} – ${b.zeitraum.bis.split("-").reverse().join(".")} · Vertraulich, nur für den internen Gebrauch`, { groesse: 9, farbe: F.ov300 });
      y = 146;
    } else {
      s.rechteck(0, 0, doc.breite, 32, F.navy950);
      s.text(RAND, 21, "ÖkoInvest", { groesse: 10, fett: true, farbe: F.weiss });
      s.text(doc.breite - RAND, 21, `Monatsbericht ${monatName(monat)}`, { groesse: 8.5, farbe: F.ov300, ausrichtung: "rechts" });
      y = 60;
    }
  };
  const platz = (h) => {
    if (y + h > doc.hoehe - FUSS - 6) neueSeite();
  };
  const ueberschrift = (t, sub = "") => {
    platz(64);
    y += 12;
    s.text(RAND, y, t, { groesse: 12.5, fett: true, farbe: F.navy900 });
    s.rechteck(RAND, y + 5, 24, 2.2, F.ov500);
    if (sub) s.text(doc.breite - RAND, y, sub, { groesse: 8.5, farbe: F.ink500, ausrichtung: "rechts" });
    y += 22;
  };
  const tabelle = (spalten, zeilen, { leer = "Keine Daten im Zeitraum." } = {}) => {
    const summe = spalten.reduce((x, c) => x + c.b, 0);
    const breiten = spalten.map((c) => (c.b / summe) * B);
    platz(22 + Math.min(zeilen.length, 3) * 17);
    s.rechteck(RAND, y - 11, B, 17, F.ink50);
    let x = RAND;
    spalten.forEach((c, i) => {
      s.text(c.rechts ? x + breiten[i] - 6 : x + 6, y + 1, c.label, { groesse: 8, fett: true, farbe: F.ink500, ausrichtung: c.rechts ? "rechts" : "links" });
      x += breiten[i];
    });
    y += 18;
    if (!zeilen.length) {
      s.text(RAND + 6, y, leer, { groesse: 9, farbe: F.ink500 });
      y += 16;
      return;
    }
    for (const z of zeilen) {
      platz(17);
      x = RAND;
      spalten.forEach((c, i) => {
        const t = umbrechen(String(z[i] ?? "–"), breiten[i] - 12, 9)[0] || "";
        s.text(c.rechts ? x + breiten[i] - 6 : x + 6, y, t, { groesse: 9, farbe: F.ink900, ausrichtung: c.rechts ? "rechts" : "links", fett: !!c.fett });
        x += breiten[i];
      });
      s.linie(RAND, y + 6, RAND + B, y + 6, { farbe: F.ink100 });
      y += 17;
    }
    y += 4;
  };
  /** Horizontale Balken (eine Reihe je Eintrag), optional gestapelt nach Land */
  const balken = (eintraege, { format = (x) => zahl(x), gestapelt = false } = {}) => {
    const max = Math.max(1, ...eintraege.map((e) => (gestapelt ? Object.values(e.werte).reduce((a, x) => a + (x || 0), 0) : e.wert)));
    const labelB = 150;
    const bahn = B - labelB - 70;
    for (const e of eintraege) {
      platz(18);
      s.text(RAND, y + 3, umbrechen(e.label, labelB - 8, 9)[0], { groesse: 9, farbe: F.ink700 });
      s.rechteck(RAND + labelB, y - 6, bahn, 11, F.ink50);
      let x = RAND + labelB;
      let summe = 0;
      if (gestapelt) {
        for (const [land, w] of Object.entries(e.werte)) {
          const bw = ((w || 0) / max) * bahn;
          if (bw > 0) s.rechteck(x, y - 6, bw, 11, LAND_FARBE[land] || F.ov500);
          x += bw;
          summe += w || 0;
        }
      } else {
        const bw = (e.wert / max) * bahn;
        if (bw > 0) s.rechteck(x, y - 6, bw, 11, e.farbe || F.ov500);
        summe = e.wert;
      }
      s.text(RAND + B, y + 3, format(summe), { groesse: 9, fett: true, farbe: F.ink900, ausrichtung: "rechts" });
      y += 18;
    }
    if (gestapelt) {
      platz(16);
      let x = RAND + labelB;
      for (const l of Object.keys(LAENDER)) {
        s.rechteck(x, y - 7, 8, 8, LAND_FARBE[l]);
        s.text(x + 12, y, LAENDER[l], { groesse: 8, farbe: F.ink500 });
        x += 90;
      }
      y += 14;
    }
    y += 4;
  };

  neueSeite(true);

  // ------------------------------------------------ Kennzahlen
  const k = b.kennzahlen;
  const vk = vb?.kennzahlen;
  const kacheln = [
    ["Anfragen", zahl(k.anfragen), vk ? delta(k.anfragen, vk.anfragen) : ""],
    ["Quote qualifiziert", pct(k.qualifiziertQuote), vk ? delta(k.qualifiziertQuote * 100, vk.qualifiziertQuote * 100, (x) => `${fmt(x, 0)} Pkt.`) : ""],
    ["Neue Flächen", `${zahl(k.flaechenNeu)} · ${zahl(k.flaechenHa, 1)} ha`, vk ? delta(k.flaechenHa, vk.flaechenHa, (x) => `${fmt(x, 1)} ha`) : ""],
    ["Pipeline Börse", `${zahl(k.pipelineMwp, 1)} MWp`, `Flächen-Potenzial ${zahl(k.flaechenMwp, 1)} MWp`],
    ["Projekte veröffentlicht", zahl(k.projekteVeroeffentlicht), vk ? delta(k.projekteVeroeffentlicht, vk.projekteVeroeffentlicht) : ""],
    ["Verkäufe", zahl(k.verkaeufe), vk ? delta(k.verkaeufe, vk.verkaeufe) : ""],
    ["Provision realisiert", eur(k.provisionRealisiert), vk ? delta(k.provisionRealisiert, vk.provisionRealisiert, eur) : ""],
    ["Provision erwartet (gewichtet)", eur(k.provisionErwartet), "Stand heute, alle offenen Projekte"],
  ];
  const kb = (B - 3 * 10) / 4;
  kacheln.forEach(([label, wert, hinweis], i) => {
    const x = RAND + (i % 4) * (kb + 10);
    const yy = y + Math.floor(i / 4) * 70;
    s.rechteck(x, yy, kb, 60, i === 7 ? F.navy950 : F.sand100);
    s.text(x + 10, yy + 16, umbrechen(label, kb - 20, 8)[0], { groesse: 8, farbe: i === 7 ? F.ov300 : F.ink500 });
    s.text(x + 10, yy + 36, umbrechen(wert, kb - 20, 13, true)[0], { groesse: 13, fett: true, farbe: i === 7 ? F.weiss : F.ink900 });
    if (hinweis) s.text(x + 10, yy + 51, umbrechen(hinweis, kb - 20, 7)[0], { groesse: 7, farbe: i === 7 ? F.ink200 : F.ink500 });
  });
  y += 150;

  // ------------------------------------------------ Trichter
  ueberschrift("Trichter Anfragen (Eingang im Zeitraum)", `${zahl(k.anfragen)} Anfragen`);
  balken(b.kohorteTrichter.map((t, i) => ({ label: t.label, wert: t.anzahl, farbe: i === 0 ? F.navy500 : F.ov500 })));
  ueberschrift("Trichter Flächen (Eingang im Zeitraum)", `${zahl(b.flaechenTrichter[0]?.anzahl)} Flächen`);
  balken(b.flaechenTrichter.map((t, i) => ({ label: t.label, wert: t.anzahl, farbe: i === 0 ? F.navy500 : F.ov500 })));

  // ------------------------------------------------ Quellen
  ueberschrift("Konversion je Quelle", "Herkunft/UTM der Anfragen");
  tabelle(
    [{ label: "Kanal", b: 3 }, { label: "Anfragen", b: 1.3, rechts: true }, { label: "Qualifiziert", b: 1.5, rechts: true }, { label: "Quote", b: 1.2, rechts: true, fett: true }, { label: "Abschluss", b: 1.3, rechts: true }, { label: "Top-Kampagne", b: 3 }],
    b.quellen.map((q) => [q.kanal, zahl(q.anfragen), zahl(q.qualifiziert), pct(q.quoteQualifiziert), zahl(q.abgeschlossen), q.kampagnen[0] ? `${q.kampagnen[0].name} (${q.kampagnen[0].anzahl})` : "–"])
  );

  // ------------------------------------------------ Pipeline
  ueberschrift("Pipeline-MWp nach Phase und Land", "Projekte in Prüfung, veröffentlicht, reserviert");
  balken(b.pipelinePhasen.map((p) => ({ label: p.label, werte: p.werte })), { gestapelt: true, format: (x) => `${fmt(x, 1)} MWp` });
  ueberschrift("Flächen-Potenzial nach Status und Land", "grob: ha ÷ ha je MWp");
  balken(b.flaechenPipeline.map((p) => ({ label: p.label, werte: p.werte })), { gestapelt: true, format: (x) => `${fmt(x, 1)} MWp` });

  // ------------------------------------------------ Provision
  ueberschrift("Provision: erwartet (gewichtet) vs. realisiert", `realisiert ${eur(b.provision.realisiert)} · bezahlt ${eur(b.provision.bezahlt)}`);
  tabelle(
    [{ label: "Projekt", b: 4 }, { label: "Stand", b: 2.4 }, { label: "Kaufpreis", b: 1.7, rechts: true }, { label: "Satz", b: 0.9, rechts: true }, { label: "Wahrsch.", b: 1.1, rechts: true }, { label: "Gewichtet", b: 1.6, rechts: true, fett: true }],
    (b.provision.projekte || []).slice(0, 10).map((p) => [p.titel, p.standLabel, `${eur(p.kaufpreis)}${p.geschaetzt ? "*" : ""}`, pct(p.satz), pct(p.p), eur(p.gewichtet)]),
    { leer: "Keine offenen Projekte bzw. keine Berechtigung für Provisionsdetails." }
  );
  platz(14);
  s.text(RAND, y, "* Kaufpreis geschätzt (Mitte der Phasenspanne). Wahrscheinlichkeiten sind interne Annahmen je Stand.", { groesse: 7.5, farbe: F.ink500 });
  y += 14;

  // ------------------------------------------------ Durchlaufzeiten
  ueberschrift("Durchlaufzeiten je Stufe (Tage)", "Median · Mittel · Anzahl");
  const dl = [...b.durchlauf.vorgang.map((d) => ["Anfrage", d]), ...b.durchlauf.flaeche.map((d) => ["Fläche", d]), ...b.durchlauf.projekt.map((d) => ["Projekt", d])].filter(([, d]) => d.anzahl);
  tabelle([{ label: "Prozess", b: 1.2 }, { label: "Stufe", b: 4 }, { label: "Median", b: 1, rechts: true, fett: true }, { label: "Mittel", b: 1, rechts: true }, { label: "Anzahl", b: 1, rechts: true }], dl.map(([p, d]) => [p, d.label, zahl(d.median, 1), zahl(d.mittel, 1), zahl(d.anzahl)]));

  // ------------------------------------------------ Team
  ueberschrift("Team-Leistung", "im Zeitraum");
  tabelle(
    [{ label: "Person", b: 3 }, { label: "Offen", b: 1, rechts: true }, { label: "Statuswechsel", b: 1.5, rechts: true }, { label: "Aufgaben erl.", b: 1.4, rechts: true }, { label: "Überfällig", b: 1.2, rechts: true }, { label: "CRM", b: 0.9, rechts: true }, { label: "SLA-Quote", b: 1.3, rechts: true, fett: true }],
    b.team.map((t) => [t.name, zahl(t.offen), zahl(t.statuswechsel), zahl(t.aufgabenErledigt), zahl(t.aufgabenUeberfaellig), zahl(t.crmAktivitaeten), t.slaQuote === null ? "–" : pct(t.slaQuote)])
  );

  // ------------------------------------------------ Fußzeilen
  const erstellt = new Date(b.erstelltAm).toLocaleString("de-DE", { timeZone: "Europe/Vienna", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  doc.seiten.forEach((seite, i) => {
    seite.linie(RAND, doc.hoehe - 40, doc.breite - RAND, doc.hoehe - 40);
    seite.text(RAND, doc.hoehe - 26, `Vertraulich – nur für den internen Gebrauch · erstellt ${erstellt}${ersteller ? ` von ${ersteller}` : ""}`, { groesse: 7.5, farbe: F.ink500 });
    seite.text(doc.breite - RAND, doc.hoehe - 26, `Seite ${i + 1} von ${doc.seiten.length}`, { groesse: 7.5, farbe: F.ink500, ausrichtung: "rechts" });
  });
  return doc.alsBuffer();
}

/** Bericht als CSV (Abschnitt; Kennzahl; Dimension; Wert) – Excel-DE */
export function berichtCsv(b) {
  const z = [];
  const add = (abschnitt, kennzahl, dimension, wert) => z.push([abschnitt, kennzahl, dimension, wert]);
  const k = b.kennzahlen;
  add("Zeitraum", "von", "", b.zeitraum.von);
  add("Zeitraum", "bis", "", b.zeitraum.bis);
  for (const [key, label] of [["anfragen", "Anfragen"], ["qualifiziertQuote", "Quote qualifiziert"], ["flaechenNeu", "Neue Flächen"], ["flaechenHa", "Neue Flächen (ha)"], ["pipelineMwp", "Pipeline Börse (MWp)"], ["flaechenMwp", "Flächen-Potenzial (MWp)"], ["projekteVeroeffentlicht", "Projekte veröffentlicht"], ["verkaeufe", "Verkäufe"], ["provisionRealisiert", "Provision realisiert (EUR)"], ["provisionErwartet", "Provision erwartet gewichtet (EUR)"]]) add("Kennzahlen", label, "", k[key]);
  for (const [art, t] of Object.entries(b.trichterZeit)) for (const st of t.stufen) b.zeitraum.monate.forEach((m, i) => add(`Trichter ${art === "vorgang" ? "Anfragen" : "Flächen"} je Monat`, st.label, m, t.reihen[st.id][i]));
  for (const q of b.quellen) {
    add("Quellen", "Anfragen", q.kanal, q.anfragen);
    add("Quellen", "Qualifiziert", q.kanal, q.qualifiziert);
    add("Quellen", "Quote qualifiziert", q.kanal, Math.round(q.quoteQualifiziert * 1000) / 1000);
    add("Quellen", "Abgeschlossen", q.kanal, q.abgeschlossen);
  }
  for (const p of b.pipelinePhasen) for (const [l, w] of Object.entries(p.werte)) add("Pipeline MWp", p.label, l, w);
  for (const p of b.flaechenPipeline) for (const [l, w] of Object.entries(p.werte)) add("Flächen-Potenzial MWp", p.label, l, w);
  b.zeitraum.monate.forEach((m, i) => add("Provision realisiert je Monat (EUR)", "realisiert", m, b.provision.realisiertMonat[i]));
  for (const p of b.provision.projekte || []) add("Provision erwartet (EUR)", p.titel, `${p.standLabel} · p=${p.p}`, p.gewichtet);
  for (const [art, liste] of Object.entries(b.durchlauf)) for (const d of liste) add(`Durchlaufzeit ${art} (Tage, Median)`, d.label, `n=${d.anzahl}`, d.median);
  for (const t of b.team) {
    add("Team", "Statuswechsel", t.name, t.statuswechsel);
    add("Team", "Aufgaben erledigt", t.name, t.aufgabenErledigt);
    add("Team", "Aufgaben überfällig", t.name, t.aufgabenUeberfaellig);
    add("Team", "CRM-Aktivitäten", t.name, t.crmAktivitaeten);
    add("Team", "SLA-Quote", t.name, t.slaQuote === null ? "" : Math.round(t.slaQuote * 1000) / 1000);
  }
  const kopf = ["Abschnitt", "Kennzahl", "Dimension", "Wert"].map(csvWert).join(";");
  return "﻿" + [kopf, ...z.map((r) => r.map(csvWert).join(";"))].join("\r\n") + "\r\n";
}
