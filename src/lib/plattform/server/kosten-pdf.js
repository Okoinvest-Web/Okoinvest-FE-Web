// src/lib/plattform/server/kosten-pdf.js
//
// Kostenrahmen/Kostenkalkulation eines Entwicklungsprojekts als PDF (gemeinsamer PDF-Erzeuger server/pdf.js, Markenfarben
// wie Exposé/Finanzierung) und als CSV für Excel-DE (BOM, Semikolon, Formel-Schutz über csvWert). Intern/vertraulich.

import { PdfDokument } from "./pdf";
import { csvWert } from "../csv";
import { GEWERKE, GRUPPEN } from "../planung/kosten";
import { fmt } from "@/lib/rechner/annahmen";

const F = { navy950: "#03122b", navy900: "#041d42", ov300: "#aed083", ov500: "#669933", ink900: "#151a24", ink700: "#394050", ink500: "#6b7486", ink200: "#dfe3ea", ink50: "#f7f8fa", rot: "#b42318", gelb: "#8a6100", gruen: "#3d6b1f", weiss: "#ffffff" };
const RAND = 40;
const FUSS = 58;
const eur = (x) => (Number.isFinite(x) ? `${fmt(Math.round(x))} €` : "–");
const teur = (x) => (Number.isFinite(x) ? `${fmt(Math.round(x / 1000))} T€` : "–");
const zahl = (x, s = 0) => (Number.isFinite(x) ? fmt(x, s) : "–");
const AMPEL = { gruen: ["im Rahmen", F.gruen], gelb: ["prüfen", F.gelb], rot: ["auffällig", F.rot] };

function mengeText(x) {
  if (x.art === "prozent" || x.art === "zins") return `${fmt((Number(x.satz) || 0) * 100, 2)} %`;
  return `${zahl(Number(x.menge), Number(x.menge) % 1 ? 2 : 0)} ${x.einheit || ""}`.trim();
}

export function kostenPdf(k, { ersteller = null } = {}) {
  const doc = new PdfDokument({ titel: `Kostenkalkulation ${k.projekt.titel}`, thema: `${k.kostenstandLabel} · ${k.projekt.id}` });
  const B = doc.breite - 2 * RAND;
  const st = { s: null, y: 0 };
  const fuss = () => {
    const y = doc.hoehe - 30;
    st.s.linie(RAND, y - 12, doc.breite - RAND, y - 12, { farbe: F.ink200 });
    st.s.text(RAND, y, "Vertraulich – nur für den internen Gebrauch. Vorschlagswerte aus Marktspannen (markt.js), keine Angebotspreise.", { groesse: 7, farbe: F.ink500 });
    st.s.text(RAND, y + 10, `Erstellt ${ersteller ? `von ${[ersteller.vorname, ersteller.nachname].filter(Boolean).join(" ") || ersteller.email} ` : ""}am ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`, { groesse: 7, farbe: F.ink500 });
    st.s.text(doc.breite - RAND, y, `Seite ${doc.seiten.length}`, { groesse: 7, farbe: F.ink500, ausrichtung: "rechts" });
  };
  const neueSeite = (erste = false) => {
    if (st.s) fuss();
    st.s = doc.seite();
    if (erste) {
      st.s.rechteck(0, 0, doc.breite, 108, F.navy950);
      st.s.text(RAND, 40, "ÖkoInvest", { groesse: 18, fett: true, farbe: F.weiss });
      st.s.text(doc.breite - RAND, 40, `KOSTENRAHMEN · ${k.kostenstandLabel.toUpperCase()}`, { groesse: 8.5, fett: true, farbe: F.ov300, ausrichtung: "rechts", zeichenabstand: 1 });
      st.s.text(RAND, 74, k.projekt.titel.slice(0, 70), { groesse: 19, fett: true, farbe: F.weiss });
      st.s.text(RAND, 94, `${k.projekt.id} · ${fmt(k.projekt.mwp || 0, 2)} ${k.projekt.typ === "speicher" ? "MW" : "MWp"}${k.projekt.mwh ? ` · ${fmt(k.projekt.mwh)} MWh` : ""} · ${k.projekt.land}`, { groesse: 9, farbe: F.ov300 });
      st.y = 134;
    } else {
      st.s.rechteck(0, 0, doc.breite, 30, F.navy950);
      st.s.text(RAND, 20, "ÖkoInvest", { groesse: 10, fett: true, farbe: F.weiss });
      st.s.text(doc.breite - RAND, 20, `Kostenkalkulation ${k.projekt.titel}`.slice(0, 80), { groesse: 8, farbe: F.ov300, ausrichtung: "rechts" });
      st.y = 54;
    }
  };
  const platz = (h) => {
    if (st.y + h > doc.hoehe - FUSS) neueSeite();
  };
  const ueberschrift = (t) => {
    platz(50);
    st.y += 8;
    st.s.text(RAND, st.y, t, { groesse: 12, fett: true, farbe: F.navy900 });
    st.s.rechteck(RAND, st.y + 5, 24, 2.2, F.ov500);
    st.y += 20;
  };
  const absatz = (t, { groesse = 8.5, farbe = F.ink700 } = {}) => {
    platz(22);
    st.y = st.s.absatz(RAND, st.y, t, { breite: B, groesse, farbe }) + groesse * 1.5;
  };
  const kacheln = (liste) => {
    platz(56);
    const b = (B - (liste.length - 1) * 8) / liste.length;
    liste.forEach(([label, wert], i) => {
      const x = RAND + i * (b + 8);
      st.s.rechteck(x, st.y - 10, b, 44, F.ink50);
      st.s.text(x + 8, st.y + 2, label, { groesse: 7.2, farbe: F.ink500 });
      st.s.text(x + 8, st.y + 22, wert, { groesse: 12, fett: true, farbe: F.ink900 });
    });
    st.y += 48;
  };
  const tabelle = (spalten, zeilen, { groesse = 7.6 } = {}) => {
    const summe = spalten.reduce((x, c) => x + c.b, 0);
    const br = spalten.map((c) => (c.b / summe) * B);
    const kopf = () => {
      st.s.rechteck(RAND, st.y - 10, B, 15, F.ink50);
      let x = RAND;
      spalten.forEach((c, i) => {
        st.s.text(c.rechts ? x + br[i] - 4 : x + 4, st.y, c.label, { groesse: 7, fett: true, farbe: F.ink500, ausrichtung: c.rechts ? "rechts" : "links" });
        x += br[i];
      });
      st.y += 15;
    };
    platz(30);
    kopf();
    for (const z of zeilen) {
      if (st.y + 13 > doc.hoehe - FUSS) {
        neueSeite();
        kopf();
      }
      const fettZeile = z.fett;
      const werte = z.werte || z;
      if (z.hinterlegt) st.s.rechteck(RAND, st.y - 9, B, 13, F.ink50);
      let x = RAND;
      werte.forEach((w, i) => {
        const c = spalten[i];
        const farbe = typeof w === "object" && w ? w.farbe : F.ink900;
        const text = typeof w === "object" && w ? w.text : String(w ?? "");
        st.s.text(c.rechts ? x + br[i] - 4 : x + 4, st.y, text, { groesse, farbe, fett: !!fettZeile, ausrichtung: c.rechts ? "rechts" : "links" });
        x += br[i];
      });
      st.s.linie(RAND, st.y + 4, RAND + B, st.y + 4, { farbe: F.ink200, breite: 0.4 });
      st.y += 13;
    }
    st.y += 8;
  };

  neueSeite(true);
  const s = k.summen;
  kacheln([["Gesamtkosten", teur(s.gesamt)], ["€/kWp gesamt", s.eurProKwp ? `${zahl(s.eurProKwp)} €` : "–"], ["Capex (ohne Finanzierung)", teur(s.capex)], ["Finanzierungsbedarf", teur(s.finanzierungsbedarf)]]);
  const p = k.parameter;
  absatz(`Kostenstand: ${k.kostenstandLabel}. Fläche ${zahl(p.flaecheHa, 1)} ha, Zaun ${p.zaunM ? `${zahl(p.zaunM)} m` : "aus Fläche geschätzt"}, MS-Trasse ${zahl(p.trasseLaengeM)} m${p.trasse?.quelle ? ` (Quelle: ${p.trasse.quelle})` : ""}. Unvorhergesehenes ${zahl(p.contingency * 100, 1)} %, Fremdkapital ${zahl(p.fkQuote * 100)} %, Bauzeitzins ${zahl(p.zinsBau * 100, 2)} % über ${p.bauzeitMonate} Monate.`);

  ueberschrift("Übersicht nach Kostengruppen (angelehnt an DIN 276)");
  tabelle(
    [{ label: "Gruppe", b: 3 }, { label: "KG", b: 0.8 }, { label: "Soll", b: 1.4, rechts: true }, { label: "€/kWp", b: 1, rechts: true }, { label: "Anteil", b: 0.9, rechts: true }, { label: "Ist", b: 1.3, rechts: true }],
    [
      ...Object.entries(GRUPPEN).filter(([g]) => k.gruppen[g]?.soll).map(([g, gr]) => [gr.label, gr.kg, eur(k.gruppen[g].soll), zahl(k.gruppen[g].eurProKwp, 1), `${zahl((k.gruppen[g].soll / (s.gesamt || 1)) * 100, 1)} %`, k.gruppen[g].ist ? eur(k.gruppen[g].ist) : "–"]),
      { werte: ["Gesamtkosten (ohne Sicherheiten)", "", eur(s.gesamt), zahl(s.eurProKwp, 1), "100 %", s.ist ? eur(s.ist) : "–"], fett: true, hinterlegt: true },
    ]
  );

  if (k.benchmark?.eintraege?.length) {
    ueberschrift("Vergleich mit Marktspannen");
    tabelle(
      [{ label: "Kennzahl", b: 2.6 }, { label: "Wert", b: 1.1, rechts: true }, { label: "Spanne", b: 1.5, rechts: true }, { label: "Bewertung", b: 1.2 }, { label: "Hinweis", b: 3.2 }],
      k.benchmark.eintraege.map((b) => [b.label, `${zahl(b.wert, 1)}${b.einheit === "%" ? " %" : ""}`, b.min !== undefined ? `${zahl(b.min)}–${zahl(b.max)}` : "–", { text: AMPEL[b.ampel]?.[0] || "–", farbe: AMPEL[b.ampel]?.[1] || F.ink900 }, b.text.slice(0, 70)])
    );
  }

  ueberschrift("Positionen");
  const zeilen = [];
  for (const [g, gr] of Object.entries(GRUPPEN)) {
    const pos = k.positionen.filter((x) => x.gruppe === g && (x.betrag || x.istEur));
    if (!pos.length) continue;
    zeilen.push({ werte: [gr.label, "", "", "", eur(k.gruppen[g].soll), ""], fett: true, hinterlegt: true });
    for (const x of pos) {
      zeilen.push([`${x.bezeichnung}${x.manuell ? " *" : ""}`.slice(0, 64), GEWERKE[x.gewerk]?.kg || "", mengeText(x), x.art === "menge" ? zahl(x.ep, x.ep % 1 ? 2 : 0) : "", eur(x.betrag), x.eurProKwp !== null ? zahl(x.eurProKwp, 1) : ""]);
    }
  }
  tabelle([{ label: "Position", b: 4.4 }, { label: "KG", b: 0.6 }, { label: "Menge / Satz", b: 1.5, rechts: true }, { label: "EP €", b: 1, rechts: true }, { label: "Betrag", b: 1.4, rechts: true }, { label: "€/kWp", b: 0.8, rechts: true }], zeilen, { groesse: 7.2 });
  absatz("* überschrieben (Angebot/Vergabe bzw. manuelle Schätzung). Prozentpositionen: Bauleitung/EPC-Marge auf die Technik-Gewerke, Versicherung und Unvorhergesehenes auf Technik + Netz, Bauzeitzinsen = FK-Quote × Bausumme × Zins × Bauzeit/12 × 50 %, Finanzierungsgebühren auf die Investition.", { groesse: 7.5, farbe: F.ink500 });

  if (k.staende?.length) {
    ueberschrift("Kostenstände (Historie)");
    tabelle(
      [{ label: "Datum", b: 1 }, { label: "Kostenstand", b: 1.5 }, { label: "Gesamt", b: 1.2, rechts: true }, { label: "€/kWp", b: 0.8, rechts: true }, { label: "Diff. Vorstand", b: 1.2, rechts: true }, { label: "Kommentar", b: 3.3 }],
      k.staende.map((x) => [new Date(x.am).toLocaleDateString("de-DE"), x.standLabel, teur(x.summen.gesamt), zahl(x.summen.eurProKwp), x.vergleich ? `${x.vergleich.gesamt >= 0 ? "+" : ""}${teur(x.vergleich.gesamt)}` : "–", String(x.kommentar || "").slice(0, 60)])
    );
  }
  if (k.sollIst?.some((z) => z.ist)) {
    ueberschrift("Soll / Ist");
    tabelle([{ label: "Kostenart / Gruppe", b: 2.6 }, { label: "Soll", b: 1.2, rechts: true }, { label: "Ist", b: 1.2, rechts: true }, { label: "Quelle", b: 1 }], k.sollIst.filter((z) => z.soll || z.ist).map((z) => [z.kostenart || GRUPPEN[z.gruppe]?.label || z.schluessel, eur(z.soll), eur(z.ist), z.quelle]));
  }
  fuss();
  return doc.alsBuffer();
}

/** CSV (Excel-DE) – je Position eine Zeile */
export function kostenCsv(k) {
  const kopf = ["Gruppe", "KG (DIN 276 angelehnt)", "Gewerk", "Position", "Art", "Menge", "Einheit", "Einheitspreis €", "Satz %", "Betrag €", "€/kWp", "Vorschlag €", "Abweichung %", "überschrieben", "Ist €", "Angebot", "Notiz", "Quelle"];
  const z = (x, st = 2) => (Number.isFinite(Number(x)) && x !== null && x !== "" ? Number(x).toFixed(st).replace(".", ",") : "");
  const zeilen = k.positionen.map((x) => [
    GRUPPEN[x.gruppe]?.label || x.gruppe, GEWERKE[x.gewerk]?.kg || "", GEWERKE[x.gewerk]?.label || x.gewerk, x.bezeichnung, x.art, x.art === "menge" ? z(x.menge, 3) : "", x.einheit, x.art === "menge" ? z(x.ep, 2) : "",
    x.art !== "menge" ? z((Number(x.satz) || 0) * 100, 4) : "", z(x.betrag), z(x.eurProKwp), z(x.vorschlagBetrag), x.abweichung !== null && x.abweichung !== undefined ? z(x.abweichung * 100, 1) : "", x.manuell ? "ja" : "nein", z(x.istEur), x.angebot || "", x.notiz || "", x.quelle || "",
  ]);
  const s = k.summen;
  zeilen.push([], ["Summe", "", "", "Gesamtkosten (ohne Sicherheiten)", "", "", "", "", "", z(s.gesamt), z(s.eurProKwp)], ["Summe", "", "", "Capex (ohne Finanzierungskosten)", "", "", "", "", "", z(s.capex), z(s.capexProKwp)], ["Summe", "", "", "Finanzierungsbedarf (inkl. Sicherheiten)", "", "", "", "", "", z(s.finanzierungsbedarf)], ["Stand", "", "", k.kostenstandLabel]);
  return "﻿" + [kopf, ...zeilen].map((r) => r.map((w) => (w === "" ? "" : csvWert(w))).join(";")).join("\r\n") + "\r\n";
}
