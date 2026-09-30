// src/lib/plattform/server/finanzierung-pdf.js
//
// PDFs und CSV der Finanzierung (gemeinsamer PDF-Erzeuger server/pdf.js, Markenfarben wie Exposé/Monatsbericht):
//   szenarioPdf      Finanzierungsvergleich eines gespeicherten Cockpit-Szenarios (Investor)
//   modellPdf        Financial Model bzw. Projektsteckbrief für das Bankenpaket (Backoffice/Bank)
//   modellCsv        Financial Model als CSV (Excel-DE)
//   reportingPdf     Quartalsbericht an die Bank (DSCR/LLCR, Ampel, Berichtspflichten)
// Jede Seite trägt den Hinweis „keine Anlage-/Steuerberatung“; vertrauliche Dokumente nennen den Empfänger.

import { PdfDokument } from "./pdf";
import { csvWert } from "../csv";
import { rechneCockpit, VARIANTEN, ERLOES_MODELLE, TYPEN_FZ } from "../finanzierung/kern";
import { foerderCheck, PASSUNG, FOERDER_HINWEIS } from "../finanzierung/foerder";
import { AMPEL_FZ } from "../finanzierung/bank";
import { fmt } from "@/lib/rechner/annahmen";

const F = {
  navy950: "#03122b", navy900: "#041d42", navy500: "#1f5aa1", ov300: "#aed083", ov500: "#669933", ov50: "#f2f7ea",
  ink900: "#151a24", ink700: "#394050", ink500: "#6b7486", ink200: "#dfe3ea", ink50: "#f7f8fa", sun400: "#ffc53d", rot: "#b42318", weiss: "#ffffff",
};
const RAND = 44;
const FUSS = 58;
const HINWEIS = "Orientierungsrechnung – keine Anlage-, Finanzierungs- oder Steuerberatung. Steuerwerte sind Näherungen (mit Steuerberatung prüfen).";

export const eur = (x) => (Number.isFinite(x) ? `${fmt(Math.round(x))} €` : "–");
export const teur = (x) => (Number.isFinite(x) ? `${fmt(Math.round(x / 1000))} T€` : "–");
export const pct = (x, s = 1) => (Number.isFinite(x) ? `${fmt(x * 100, s)} %` : "–");
export const faktor = (x) => (Number.isFinite(x) ? `${fmt(x, 2)}x` : "–");
const jahre = (x) => (Number.isFinite(x) ? `${fmt(x, 1)} J.` : "–");

/** Seitenrahmen: Kopf, Fuß, Tabellen, Absätze */
function rahmen({ titel, unter, kennung, empfaenger = null, vertraulich = false }) {
  const doc = new PdfDokument({ titel, thema: unter });
  const B = doc.breite - 2 * RAND;
  const st = { s: null, y: 0 };
  const fuss = () => {
    const y = doc.hoehe - 34;
    st.s.linie(RAND, y - 12, doc.breite - RAND, y - 12, { farbe: F.ink200 });
    st.s.text(RAND, y, HINWEIS, { groesse: 7, farbe: F.ink500 });
    if (empfaenger) st.s.text(RAND, y + 10, `${vertraulich ? "Vertraulich – " : ""}erstellt für ${empfaenger.name || ""}${empfaenger.email ? ` (${empfaenger.email})` : ""}${empfaenger.bank ? `, ${empfaenger.bank}` : ""} am ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`, { groesse: 7, farbe: F.ink500 });
    st.s.text(doc.breite - RAND, y, `Seite ${doc.seiten.length}`, { groesse: 7, farbe: F.ink500, ausrichtung: "rechts" });
  };
  const neueSeite = (erste = false) => {
    if (st.s) fuss();
    st.s = doc.seite();
    if (erste) {
      st.s.rechteck(0, 0, doc.breite, 112, F.navy950);
      st.s.text(RAND, 42, "ÖkoInvest", { groesse: 18, fett: true, farbe: F.weiss });
      st.s.text(doc.breite - RAND, 42, kennung, { groesse: 8.5, fett: true, farbe: F.ov300, ausrichtung: "rechts", zeichenabstand: 1 });
      st.s.text(RAND, 78, titel.slice(0, 70), { groesse: 20, fett: true, farbe: F.weiss });
      st.s.text(RAND, 98, unter.slice(0, 110), { groesse: 9, farbe: F.ov300 });
      st.y = 138;
    } else {
      st.s.rechteck(0, 0, doc.breite, 30, F.navy950);
      st.s.text(RAND, 20, "ÖkoInvest", { groesse: 10, fett: true, farbe: F.weiss });
      st.s.text(doc.breite - RAND, 20, titel.slice(0, 80), { groesse: 8, farbe: F.ov300, ausrichtung: "rechts" });
      st.y = 56;
    }
  };
  const platz = (h) => {
    if (st.y + h > doc.hoehe - FUSS - 8) neueSeite();
  };
  const ueberschrift = (t) => {
    platz(60);
    st.y += 10;
    st.s.text(RAND, st.y, t, { groesse: 12, fett: true, farbe: F.navy900 });
    st.s.rechteck(RAND, st.y + 5, 24, 2.2, F.ov500);
    st.y += 22;
  };
  const absatz = (t, { groesse = 9, farbe = F.ink700 } = {}) => {
    platz(24);
    st.y = st.s.absatz(RAND, st.y, t, { breite: B, groesse, farbe }) + groesse * 1.6;
  };
  const kacheln = (liste) => {
    platz(58);
    const n = liste.length;
    const b = (B - (n - 1) * 8) / n;
    liste.forEach(([label, wert], i) => {
      const x = RAND + i * (b + 8);
      st.s.rechteck(x, st.y - 10, b, 46, F.ink50);
      st.s.text(x + 8, st.y + 3, label, { groesse: 7.5, farbe: F.ink500 });
      st.s.text(x + 8, st.y + 24, wert, { groesse: 12.5, fett: true, farbe: F.ink900 });
    });
    st.y += 50;
  };
  const tabelle = (spalten, zeilen, { groesse = 8 } = {}) => {
    const summe = spalten.reduce((x, c) => x + c.b, 0);
    const br = spalten.map((c) => (c.b / summe) * B);
    const kopf = () => {
      st.s.rechteck(RAND, st.y - 10, B, 15, F.ink50);
      let x = RAND;
      spalten.forEach((c, i) => {
        st.s.text(c.rechts ? x + br[i] - 4 : x + 4, st.y, c.label, { groesse: 7.2, fett: true, farbe: F.ink500, ausrichtung: c.rechts ? "rechts" : "links" });
        x += br[i];
      });
      st.y += 15;
    };
    platz(30);
    kopf();
    for (const z of zeilen) {
      if (st.y + 14 > doc.hoehe - FUSS - 8) {
        neueSeite();
        kopf();
      }
      let x = RAND;
      z.forEach((w, i) => {
        const c = spalten[i];
        const farbe = typeof w === "object" && w ? w.farbe : F.ink900;
        const text = typeof w === "object" && w ? w.text : String(w ?? "");
        st.s.text(c.rechts ? x + br[i] - 4 : x + 4, st.y, text, { groesse, farbe, fett: i === 0, ausrichtung: c.rechts ? "rechts" : "links" });
        x += br[i];
      });
      st.s.linie(RAND, st.y + 4, RAND + B, st.y + 4, { farbe: F.ink200, breite: 0.4 });
      st.y += 13.5;
    }
    st.y += 8;
  };
  neueSeite(true);
  return { doc, st, ueberschrift, absatz, kacheln, tabelle, fertig: () => (fuss(), doc.alsBuffer()), B };
}

function variantenTabelle(t, varianten) {
  t.tabelle(
    [{ label: "Variante", b: 2.3 }, { label: "EK-Bedarf", b: 1.2, rechts: true }, { label: "Fremdkapital", b: 1.2, rechts: true }, { label: "Rate J. 1", b: 1.1, rechts: true }, { label: "DSCR min/Ø", b: 1.2, rechts: true }, { label: "EK-IRR", b: 0.9, rechts: true }, { label: "nach St.", b: 0.9, rechts: true }, { label: "Fin.-Kosten", b: 1.2, rechts: true }],
    varianten.map((v) => [v.kurz || VARIANTEN[v.art]?.kurz, teur(v.kapitalbedarfEk), teur(v.fremdkapital), teur(v.rateJahr1), v.dscrMin != null ? `${fmt(v.dscrMin, 2)} / ${fmt(v.dscrMittel, 2)}` : "–", pct(v.ekIrr), pct(v.ekIrrNachSteuer), teur(v.gesamtkostenFinanzierung)])
  );
}

/** Finanzierungsvergleich eines Szenarios (Investor) */
export function szenarioPdf(s) {
  const r = rechneCockpit(s.eingaben);
  const e = r.eingaben;
  const t = rahmen({ titel: `Finanzierungsvergleich: ${s.name}`, unter: `${s.projektTitel ? `${s.projektTitel} · ` : ""}${fmt(e.mwp, 2)} MWp · ${TYPEN_FZ[e.typ] || e.typ} · ${e.land} · Szenario vom ${new Date(s.am).toLocaleDateString("de-DE")}`, kennung: "FINANZIERUNGSCOCKPIT", empfaenger: s.empfaenger, vertraulich: !!s.projektId });
  t.ueberschrift("Projekt (unverschuldet, P50)");
  t.kacheln([["Investition", teur(e.capex)], ["Projekt-IRR", pct(r.projekt.projektIrr)], ["NPV (WACC)", teur(r.projekt.npv)], ["LCOE", `${fmt(r.projekt.lcoeCt, 2)} ct/kWh`], ["Amortisation", jahre(r.projekt.amortisation)]]);
  t.absatz(`Erlösmodell: ${ERLOES_MODELLE[e.modell]} mit ${fmt(e.preisCt, 2)} ct/kWh über ${e.vertragJahre} Jahre, danach Marktwert ab ${fmt(e.merchantCt, 1)} ct/kWh. Ertrag P50 ${fmt(e.p50)} kWh/kWp, P90 ${fmt(e.p90)} kWh/kWp. Betriebskosten ${fmt(e.opexKwp, 1)} €/kWp·a, Pacht ${eur(e.pachtJahr)} p. a. Betrachtung ${e.laufzeit} Jahre, EK-Diskont ${pct(e.diskontEk)}.`);
  t.ueberschrift("Finanzierungsvarianten im Vergleich");
  variantenTabelle(t, r.varianten);
  t.absatz(`Bankkredit: ${pct(e.zins, 2)} all-in, ${e.laufzeitKredit} Jahre, Wunsch-FK-Quote ${pct(e.fkQuote, 0)}, Mindest-DSCR ${fmt(e.dscrZiel, 2)} auf ${e.dscrBasis.toUpperCase()}, DSRA ${e.dsraMonate} Monate. Förderkredit ${pct(e.foerderZins, 2)} / ${e.foerderLaufzeit} J. / ${e.foerderAnlauf} tilgungsfreie J. Leasing ${pct(e.leasingZins, 2)} / ${e.leasingLaufzeit} J., Restwert ${pct(e.leasingRestwert, 0)}. Mietkauf ${pct(e.mietkaufZins, 2)} / ${e.mietkaufLaufzeit} J.`, { groesse: 8 });
  t.ueberschrift("Stresstest (Projektfinanzierung, skulptiert)");
  t.tabelle([{ label: "Fall", b: 2.4 }, { label: "EK-Bedarf", b: 1.2, rechts: true }, { label: "DSCR min", b: 1, rechts: true }, { label: "EK-IRR", b: 1, rechts: true }, { label: "NPV EK", b: 1.2, rechts: true }], r.szenarien.map((z) => [z.label, teur(z.kapitalbedarfEk), faktor(z.dscrMin), pct(z.ekIrr), teur(z.npvEk)]));
  t.ueberschrift(`Förder-Check ${e.land}`);
  t.tabelle([{ label: "Programm", b: 3 }, { label: "Einschätzung", b: 1.6 }, { label: "Quelle", b: 2.2 }], foerderCheck({ land: e.land, typ: e.typ, kwp: e.mwp * 1000 }).map((p) => [p.name.slice(0, 60), PASSUNG[p.passung].label, p.quelle.url.replace(/^https?:\/\//, "").slice(0, 44)]), { groesse: 7.5 });
  t.absatz(FOERDER_HINWEIS, { groesse: 7.5, farbe: F.ink500 });
  if (r.hinweise.length) {
    t.ueberschrift("Hinweise");
    for (const h of r.hinweise) t.absatz(`• ${h}`, { groesse: 8.5 });
  }
  return t.fertig();
}

/** Financial Model bzw. Projektsteckbrief (Bankenpaket) */
export function modellPdf(m, { art = "financial_model" } = {}) {
  const e = m.eingaben;
  const steck = art === "steckbrief";
  const t = rahmen({ titel: `${steck ? "Projektsteckbrief" : "Financial Model"}: ${m.fall.titel}`, unter: `${m.fall.spv || "Projektgesellschaft"} · ${fmt(e.mwp, 2)} MWp · ${TYPEN_FZ[e.typ] || e.typ} · ${e.land}`, kennung: steck ? "BANKENPAKET – STECKBRIEF" : "BANKENPAKET – FINANCIAL MODEL", empfaenger: m.empfaenger, vertraulich: true });
  t.ueberschrift("Eckdaten");
  t.kacheln([["Gesamtinvestition", teur(e.capex)], ["Finanzierungsbedarf", teur(m.fall.betragWunsch)], ["Ertrag J. 1 (P50)", `${fmt(m.projekt.ertragJahr1Mwh)} MWh`], ["CFADS J. 1", teur(m.projekt.cfadsJahr1)], ["Projekt-IRR", pct(m.projekt.projektIrr)]]);
  t.absatz(`Erlösmodell ${ERLOES_MODELLE[e.modell]}: ${fmt(e.preisCt, 2)} ct/kWh über ${e.vertragJahre} Jahre${e.modell === "contracting" ? `, Anteil Direktlieferung ${pct(e.lieferAnteil, 0)}, Indexierung ${pct(e.indexierung, 1)} p. a.` : ""}; danach Marktwert ${fmt(e.merchantCt, 1)} ct/kWh (+1 % p. a.). Spezifischer Ertrag P50 ${fmt(e.p50)} / P90 ${fmt(e.p90)} kWh/kWp, Degradation 0,4 % p. a. Opex ${fmt(e.opexKwp, 1)} €/kWp·a (+2 % p. a.), Pacht ${eur(e.pachtJahr)} p. a., Rückbaurücklage. LCOE ${fmt(m.projekt.lcoeCt, 2)} ct/kWh.${m.fall.bezug ? ` Bezug: ${m.fall.bezug}.` : ""}`);
  t.ueberschrift("Finanzierungsstruktur (Vorschlag)");
  variantenTabelle(t, m.varianten);
  if (!steck) {
    const sk = m.varianten.find((v) => v.art === "skulptiert") || m.varianten[0];
    t.ueberschrift("Jahreswerte (P50/P90, Projektfinanzierung skulptiert)");
    t.tabelle(
      [{ label: "Jahr", b: 0.6 }, { label: "Erzeugung MWh", b: 1.1, rechts: true }, { label: "Erlös P50", b: 1.1, rechts: true }, { label: "Kosten", b: 1, rechts: true }, { label: "CFADS P50", b: 1.1, rechts: true }, { label: "CFADS P90", b: 1.1, rechts: true }, { label: "Schuldendienst", b: 1.2, rechts: true }, { label: "DSCR P50", b: 0.9, rechts: true }, { label: "DSCR P90", b: 0.9, rechts: true }, { label: "Restschuld", b: 1.1, rechts: true }],
      m.jahre.map((j, i) => {
        const ds = sk.reihen.schuldendienst[i];
        return [String(j.jahr), fmt(j.erzeugung50 / 1000), teur(j.erloes50), teur(j.kosten), teur(j.cfads50), teur(j.cfads90), teur(ds), ds > 0.5 ? fmt(j.cfads50 / ds, 2) : "–", ds > 0.5 ? fmt(j.cfads90 / ds, 2) : "–", teur(sk.reihen.restschuld[i])];
      }),
      { groesse: 7.2 }
    );
    t.absatz(`LLCR zu Beginn: ${faktor(sk.llcr)} · DSRA ${teur(sk.dsra)} · Gebühren ${teur(sk.gebuehren)}. Methodik: Jahreswerte, CFADS = Erlöse − Betriebskosten − Pacht − Rückbaurücklage (vor Steuern); Schuldendienst = CFADS(P90) ÷ Ziel-DSCR.`, { groesse: 8 });
  }
  return t.fertig();
}

/** Financial Model als CSV (Semikolon, BOM) */
export function modellCsv(m) {
  const sk = m.varianten.find((v) => v.art === "skulptiert") || m.varianten[0];
  const kopf = ["Jahr", "Erzeugung P50 kWh", "Erzeugung P90 kWh", "Preis ct/kWh", "Erlös P50 €", "Erlös P90 €", "Opex €", "Pacht €", "Rückbau €", "CFADS P50 €", "CFADS P90 €", "Schuldendienst €", "Zinsen €", "Tilgung €", "Restschuld €", "DSCR P50", "DSCR P90"];
  const z = (x, s = 0) => (Number.isFinite(x) ? x.toFixed(s).replace(".", ",") : "");
  const zeilen = m.jahre.map((j, i) => {
    const ds = sk.reihen.schuldendienst[i];
    return [j.jahr, z(j.erzeugung50), z(j.erzeugung90), z(j.preisCt, 3), z(j.erloes50, 2), z(j.erloes90, 2), z(j.opex, 2), z(j.pacht, 2), z(j.rueckbau, 2), z(j.cfads50, 2), z(j.cfads90, 2), z(ds, 2), z(sk.reihen.zinsen[i], 2), z(sk.reihen.tilgung[i], 2), z(sk.reihen.restschuld[i], 2), ds > 0.5 ? z(j.cfads50 / ds, 3) : "", ds > 0.5 ? z(j.cfads90 / ds, 3) : ""];
  });
  return "﻿" + [kopf, ...zeilen].map((r) => r.map((w) => csvWert(w)).join(";")).join("\r\n") + "\r\n";
}

/** Quartalsbericht an die Bank */
export function reportingPdf(d) {
  const kv = d.kreditvertrag;
  const c = d.covenant;
  const t = rahmen({ titel: `Bank-Reporting: ${d.fall.titel}`, unter: `${kv.bank} · Kreditvertrag ${kv.nummer} · Stand ${new Date().toLocaleDateString("de-DE")}`, kennung: "COVENANT-REPORTING", empfaenger: { name: d.ersteller }, vertraulich: true });
  const ampel = c?.ampel || { id: "grau", grund: "Noch keine Prüfung." };
  t.ueberschrift("Covenant-Status");
  t.kacheln([["Ampel", AMPEL_FZ[ampel.id]?.label || ampel.id], ["DSCR (12 Monate)", faktor(c?.letzte?.dscr)], ["Lock-up / Covenant", `${fmt(kv.dscrLockup, 2)} / ${fmt(kv.dscrCovenant, 2)}`], ["LLCR", faktor(c?.llcr)], ["Restschuld", teur(c?.restschuld)]]);
  t.absatz(ampel.grund);
  t.ueberschrift("DSCR je Prüftermin (rollierend 12 Monate)");
  t.tabelle([{ label: "Periode", b: 1 }, { label: "CFADS", b: 1.2, rechts: true }, { label: "Schuldendienst", b: 1.2, rechts: true }, { label: "DSCR", b: 0.8, rechts: true }, { label: "Ampel", b: 1.6 }], (c?.pruefungen || []).slice(-8).map((p) => [p.periode, teur(p.cfads), teur(p.schuldendienst), faktor(p.dscr), { text: AMPEL_FZ[p.ampel.id]?.label || p.ampel.id, farbe: p.ampel.id === "rot" ? F.rot : F.ink900 }]));
  if (c?.monate?.length) {
    t.ueberschrift("Monatswerte aus der Zählererfassung");
    t.tabelle([{ label: "Monat", b: 0.8 }, { label: "Erzeugung kWh", b: 1.2, rechts: true }, { label: "Einspeisung kWh", b: 1.2, rechts: true }, { label: "Erlöse", b: 1, rechts: true }, { label: "Kosten", b: 1, rechts: true }, { label: "CFADS", b: 1, rechts: true }, { label: "Schuldendienst", b: 1.1, rechts: true }], c.monate.slice(-12).map((m) => [m.monat, fmt(m.erzeugung), fmt(m.einspeisung), eur(m.erloes), eur(m.kosten), eur(m.cfads), eur(m.schuldendienst)]), { groesse: 7.5 });
  }
  t.ueberschrift("Kreditvertrag und Berichtspflichten");
  t.absatz(`${kv.bank}, Vertrag ${kv.nummer} vom ${String(kv.unterzeichnetAm).split("-").reverse().join(".")}: ${eur(kv.betrag)}, ${fmt(kv.zinsPct, 2)} % p. a., ${kv.laufzeitJahre} Jahre, Tilgung ${kv.tilgungsprofil}, DSRA ${kv.dsraMonate} Monate.`);
  for (const b of kv.berichtspflichten || []) t.absatz(`• ${b}`, { groesse: 8.5 });
  t.absatz("Die Werte beruhen auf den abrechnungsrelevanten Zählerständen der Anlage und den vertraglichen Preisen; Betriebskosten und Pacht sind planmäßig angesetzt. Geprüfte Jahresabschlüsse gehen vor.", { groesse: 8, farbe: F.ink500 });
  return t.fertig();
}
