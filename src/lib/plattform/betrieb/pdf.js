// src/lib/plattform/betrieb/pdf.js
//
// PDF-Dokumente der Betriebsführung (nur serverseitig): Monats-/Jahresbericht je Anlage, Prüfprotokoll,
// Serviceauftrag an den Dienstleister. Gemeinsamer PDF-Erzeuger server/pdf.js (Helvetica/WinAnsi, Markenfarben).
// Die PDFs erzeugt die Website auch im Frappe-Betrieb (Daten über plattform/api/betrieb.py); eigene Desk-Druckformate sind offen.

import { PdfDokument } from "../server/pdf";
import { AUFTRAG_ARTEN, PRUEF_ARTEN, PRUEF_ERGEBNIS, URSACHEN, VERSICHERUNG_STATUS } from "./kern";

const NAVY = "#03122b";
const GRUEN = "#aed083";
const TINTE = "#151a24";
const GRAU = "#6b7486";
const LINIE = "#dfe3ea";
const ROT = "#b42318";

const zahl = (x, s = 0) => (x === null || x === undefined || !Number.isFinite(Number(x)) ? "–" : Number(x).toLocaleString("de-DE", { maximumFractionDigits: s, minimumFractionDigits: s }));
const kwh = (x) => (x === null || x === undefined ? "–" : Math.abs(x) >= 10000 ? `${zahl(x / 1000, 1)} MWh` : `${zahl(x)} kWh`);
const eur = (x) => (x === null || x === undefined || !Number.isFinite(Number(x)) ? "–" : `${zahl(x)} €`);
const pct = (x, s = 1) => (x === null || x === undefined || !Number.isFinite(Number(x)) ? "–" : `${zahl(Number(x) * 100, s)} %`);
const datum = (iso) => (iso ? new Date(String(iso).length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleString("de-DE", { timeZone: "Europe/Vienna", dateStyle: "medium", timeStyle: String(iso).length > 10 ? "short" : undefined }) : "–");
/** Zeichen außerhalb von CP1252 (Ω, Δ) für die Standardschrift ersetzen */
const q = (x) => String(x ?? "").replace(/Ω/g, "Ohm").replace(/Δ/g, "Delta ");
const HINWEIS_SCHAETZUNG = "Monitoring-Werte (MQTT) dienen der Überwachung; abrechnungsrelevant sind ausschließlich die geeichten Zähler bzw. Monatswerte des Messstellenbetreibers. Soll-Werte sind Prognosen aus Region, Bauart und Alterung (ohne Wetterbereinigung). Die Performance Ratio (IEC 61724-1) wird nur ausgewiesen, wenn die Einstrahlung in Modulebene mit Quelle erfasst ist.";

function rahmen(titel, untertitel, kopf = "BETRIEBSFÜHRUNG") {
  const doc = new PdfDokument({ titel, thema: "Betriebsführung Anlagen (vertraulich)" });
  const seiten = [];
  let s = null;
  let y = 0;
  const neueSeite = () => {
    s = doc.seite();
    const text0 = s.text.bind(s);
    const absatz0 = s.absatz.bind(s);
    s.text = (x, yy, t, o) => text0(x, yy, q(t), o);
    s.absatz = (x, yy, t, o) => absatz0(x, yy, q(t), o);
    seiten.push(s);
    s.rechteck(0, 0, doc.breite, 64, NAVY);
    s.text(48, 40, "ÖkoInvest", { groesse: 17, fett: true, farbe: "#ffffff" });
    s.text(doc.breite - 48, 40, kopf, { groesse: 8.5, fett: true, farbe: GRUEN, ausrichtung: "rechts", zeichenabstand: 1 });
    s.linie(48, doc.hoehe - 44, doc.breite - 48, doc.hoehe - 44, { farbe: LINIE });
    s.text(48, doc.hoehe - 30, `ÖkoInvest GmbH · ${titel}`.slice(0, 110), { groesse: 7.5, farbe: GRAU });
    s.text(doc.breite - 48, doc.hoehe - 30, `Seite ${seiten.length}`, { groesse: 7.5, farbe: GRAU, ausrichtung: "rechts" });
    y = 100;
  };
  neueSeite();
  y = s.absatz(48, y, titel, { breite: doc.breite - 96, groesse: 18, fett: true, farbe: TINTE, zeilenhoehe: 23 }) + 16;
  if (untertitel) y = s.absatz(48, y, untertitel, { breite: doc.breite - 96, groesse: 10, farbe: GRAU }) + 18;
  const platz = (h) => {
    if (y + h > doc.hoehe - 70) neueSeite();
  };
  return {
    absatz(text, { groesse = 10, fett = false, farbe = "#394050", abstand = 10 } = {}) {
      platz(groesse * 3);
      y = s.absatz(48, y, String(text || ""), { breite: doc.breite - 96, groesse, fett, farbe }) + groesse + abstand;
    },
    ueberschrift(text) {
      platz(44);
      y += 6;
      s.text(48, y, text, { groesse: 12, fett: true, farbe: TINTE });
      y += 18;
    },
    angaben(liste) {
      for (const [k, w] of liste) {
        platz(16);
        s.text(48, y, k, { groesse: 9, farbe: GRAU });
        const yNeu = s.absatz(210, y, String(w ?? "–"), { breite: doc.breite - 258, groesse: 9.5, farbe: TINTE });
        y = Math.max(y + 15, yNeu + 4);
      }
      y += 6;
    },
    kennzahlen(liste) {
      platz(58);
      const b = (doc.breite - 96 - (liste.length - 1) * 8) / liste.length;
      liste.forEach(([label, wert], i) => {
        const x = 48 + i * (b + 8);
        s.rechteck(x, y - 12, b, 46, "#f5f3ea");
        s.text(x + 8, y + 2, label, { groesse: 7.5, farbe: GRAU });
        s.text(x + 8, y + 22, String(wert), { groesse: 12.5, fett: true, farbe: TINTE });
      });
      y += 50;
    },
    tabelle(kopf, zeilen, breiten, { leer = "Keine Einträge." } = {}) {
      const x0 = 48;
      const zeile = (werte, { fett = false, hinter = null } = {}) => {
        platz(18);
        if (hinter) s.rechteck(x0, y - 11, doc.breite - 96, 16, hinter);
        let x = x0 + 4;
        werte.forEach((w, i) => {
          const txt = String(w ?? "–");
          const rechts = i > 0 && /^[-\d.,\s%€+–]+(kWh|MWh|kWh\/kWp|ct|€|%)?$/.test(txt);
          const max = Math.max(6, Math.floor(breiten[i] / 4.6));
          s.text(rechts ? x + breiten[i] - 8 : x, y, txt.length > max ? `${txt.slice(0, max - 1)}…` : txt, { groesse: 8.3, fett, farbe: TINTE, ausrichtung: rechts ? "rechts" : "links" });
          x += breiten[i];
        });
        y += 16;
      };
      zeile(kopf, { fett: true, hinter: "#eef1f5" });
      if (!zeilen.length) zeile([leer]);
      zeilen.forEach((z, i) => zeile(z, { hinter: i % 2 ? "#f8f9fb" : null }));
      y += 8;
    },
    unterschrift(links, rechts) {
      platz(70);
      y += 34;
      s.linie(48, y, 250, y, { farbe: TINTE });
      s.linie(doc.breite - 250, y, doc.breite - 48, y, { farbe: TINTE });
      s.text(48, y + 12, links, { groesse: 8, farbe: GRAU });
      s.text(doc.breite - 250, y + 12, rechts, { groesse: 8, farbe: GRAU });
      y += 28;
    },
    fertig() {
      return doc.alsBuffer();
    },
  };
}

// ================================================================ Monats-/Jahresbericht je Anlage

export function betriebsberichtPdf(d) {
  const a = d.anlage;
  const z = d.zeitraum;
  const k = d.kennzahlen;
  const p = rahmen(`${z.art === "jahr" ? "Jahresbericht" : "Monatsbericht"} ${a.name}`, `${z.label}${z.laufend ? " (laufend, Stand " + datum(d.stand) + ")" : ""} · ${a.id} · ${zahl(a.kwp, 1)} kWp · vertraulich`);
  p.angaben([
    ["Eigentümer", a.eigentuemer || "–"],
    ["Betriebsführer", a.betriebsfuehrer || "–"],
    ["Stromabnehmer", a.organisation || "–"],
    ["Standort (grob)", [a.ort, a.bundesland, a.land].filter(Boolean).join(", ")],
    ["Inbetriebnahme", datum(a.inbetriebnahme)],
  ]);
  const g = k.gesamt;
  p.kennzahlen([
    ["Erzeugung (Ist)", kwh(g.istKwh)],
    ["Soll (Prognose)", kwh(g.sollKwh)],
    ["Ist / Soll", pct(g.performanceIndex, 0)],
    ["Verfügbarkeit (energ.)", pct(g.verfuegbarkeit, 1)],
  ]);
  p.kennzahlen([
    ["Spez. Ertrag", g.spezErtragKwhKwp !== null ? `${zahl(g.spezErtragKwhKwp)} kWh/kWp` : "–"],
    ["Performance Ratio", g.pr !== null ? `${pct(g.pr, 1)} (${g.prMonate} Mon.)` : "ohne Einstrahlung"],
    ["Ertragsausfall", kwh(d.ausfall.kwh)],
    ["Ausfall bewertet", eur(d.ausfall.eur)],
  ]);
  if (d.quoten) p.absatz(`Eigenverbrauchsquote ${pct(d.quoten.eigenverbrauchsquote, 0)} · Autarkiegrad ${pct(d.quoten.autarkie, 0)} · Einspeisung ${kwh(d.summen?.einspeisungKwh)} · Netzbezug ${kwh(d.summen?.netzbezugKwh)} (Monitoring).`, { groesse: 9 });
  p.ueberschrift("Erzeugung je Monat");
  p.tabelle(
    ["Monat", "Ist", "Quelle", "Soll", "Ist/Soll", "PR", "Verfügb."],
    k.zeilen.map((r) => [r.monat.split("-").reverse().join("/"), kwh(r.istKwh), { zaehler_geprueft: "Zähler (geprüft)", zaehler: "Zähler", monitoring: "Monitoring" }[r.istQuelle] || "–", r.laufend ? "läuft" : kwh(r.sollKwh), pct(r.performanceIndex, 0), r.pr !== null ? pct(r.pr, 1) : "–", pct(r.verfuegbarkeit, 1)]),
    [58, 72, 92, 72, 58, 58, 89]
  );
  p.ueberschrift("Störungen im Zeitraum");
  p.tabelle(
    ["Erkannt", "Störung", "Schwere", "Status", "Ursache", "Ausfall"],
    d.tickets.map((t) => [datum(t.erkanntAm).split(",")[0], t.titel, t.schwere, t.status === "behoben" ? `behoben ${datum(t.behobenAm).split(",")[0]}` : t.status, URSACHEN[t.ursacheKategorie]?.label || "–", t.ertragsausfall ? kwh(t.ertragsausfall.ausfallKwh) : "–"]),
    [62, 150, 45, 82, 100, 60],
    { leer: "Keine Störungen im Zeitraum." }
  );
  const slaVerletzt = d.tickets.filter((t) => t.sla?.reaktion?.verletzt || t.sla?.loesung?.verletzt).length;
  if (d.tickets.length) p.absatz(`SLA: ${d.tickets.length - slaVerletzt} von ${d.tickets.length} Störungen innerhalb der Reaktions- und Lösungszeiten.`, { groesse: 9 });
  p.ueberschrift("Wartung und Prüfungen");
  p.tabelle(
    ["Datum", "Art", "Status", "Dienstleister", "Bericht"],
    [...d.wartungen.map((w) => [datum(w.datum), w.art, w.status, w.dienstleister || "–", w.bericht || "–"]), ...d.protokolle.map((x) => [datum(x.datum), PRUEF_ARTEN[x.art] || x.art, PRUEF_ERGEBNIS[x.ergebnis]?.split(" – ")[0] || x.ergebnis, x.firma || x.pruefer, `${x.befunde.length} Befund(e) · ${x.id}`])],
    [62, 110, 70, 100, 157],
    { leer: "Keine Wartungen oder Prüfungen im Zeitraum." }
  );
  if (d.versicherungen.length) {
    p.ueberschrift("Versicherungsfälle");
    p.tabelle(["Schadentag", "Versicherer", "Status", "Schaden", "Erstattet"], d.versicherungen.map((f) => [datum(f.schadentag), f.versicherer || "–", VERSICHERUNG_STATUS[f.status] || f.status, eur(f.schadenEur), eur(f.erstattetEur)]), [70, 170, 90, 84, 85]);
  }
  if (d.fristen.length) {
    p.ueberschrift("Anstehende Fristen");
    p.tabelle(["Frist", "Datum", "Stand"], d.fristen.slice(0, 20).map((f) => [f.titel, f.datum ? datum(f.datum) : "fehlt", f.stufe]), [330, 90, 79]);
  }
  p.absatz(HINWEIS_SCHAETZUNG, { groesse: 7.8 });
  p.absatz(`Erstellt am ${datum(d.stand)} von ${d.ersteller || "ÖkoInvest Betrieb"}.`, { groesse: 7.8 });
  return p.fertig();
}

// ================================================================ Prüfprotokoll

export function pruefprotokollPdf({ protokoll: x, anlage: a, punkteLabels = {} }) {
  const p = rahmen(`Prüfprotokoll ${PRUEF_ARTEN[x.art] || x.art}`, `${a.name} · ${a.id} · Protokoll ${x.id}`, "PRÜFPROTOKOLL");
  p.angaben([
    ["Anlage", `${a.name} (${zahl(a.kwp, 1)} kWp)`],
    ["Standort (grob)", [a.ort, a.bundesland, a.land].filter(Boolean).join(", ")],
    ["Anlagenbetreiber", a.eigentuemer || "–"],
    ["Prüfdatum", datum(x.datum)],
    ["Prüfer (Elektrofachkraft)", `${x.pruefer}${x.firma ? `, ${x.firma}` : ""}`],
    ["Grundlage", x.norm || "–"],
    ...(x.einstrahlungWm2 ? [["Einstrahlung bei Messung", `${zahl(x.einstrahlungWm2)} W/m²`]] : []),
  ]);
  p.kennzahlen([["Ergebnis", PRUEF_ERGEBNIS[x.ergebnis]?.split(" – ")[0] || x.ergebnis], ["Befunde", String(x.befunde.length)], ["Strings gemessen", String(x.strings.length)]]);
  if (x.strings.length) {
    p.ueberschrift("Messwerte je String (IEC 62446-1)");
    p.tabelle(["String", "Uoc [V]", "Uoc Soll [V]", "Isc [A]", "Riso [MΩ]"], x.strings.map((s) => [s.bezeichnung, zahl(s.uocV, 1), zahl(s.uocSollV, 1), zahl(s.iscA, 2), zahl(s.rIsoMOhm, 2)]), [130, 90, 90, 90, 99]);
  }
  const punkte = Object.entries(x.punkte || {});
  if (punkte.length) {
    p.ueberschrift("Prüfpunkte");
    p.tabelle(["Prüfpunkt", "Ergebnis"], punkte.map(([id, ok]) => [punkteLabels[id] || id, ok ? "in Ordnung" : "nicht in Ordnung"]), [400, 99]);
  }
  if (x.thermografie.length) {
    p.ueberschrift("Thermografie (IEC TS 62446-3)");
    p.tabelle(["Ort", "ΔT [K]", "Beschreibung"], x.thermografie.map((t) => [t.ort, zahl(t.deltaK, 1), t.text || "–"]), [150, 60, 289]);
  }
  p.ueberschrift("Befunde und Mängel");
  p.tabelle(["Stufe", "Befund"], x.befunde.map((b) => [b.stufe, b.text]), [60, 439], { leer: "Keine Befunde." });
  if (x.stoerungId) p.absatz(`Folgeaktion: Störung ${x.stoerungId} im Leitstand angelegt.`, { groesse: 9, farbe: ROT });
  if (x.bemerkung) p.absatz(`Bemerkung: ${x.bemerkung}`, { groesse: 9 });
  p.absatz("Die Bewertung der Messwerte folgt den Mindestwerten der IEC 62446-1 (Isolationswiderstand ≥ 1 MΩ bei Uoc > 120 V) und ist eine Orientierung. Verantwortlich für das Prüfergebnis ist die prüfende Elektrofachkraft.", { groesse: 7.8 });
  p.unterschrift("Ort, Datum, Unterschrift Prüfer", "Kenntnisnahme Anlagenbetreiber");
  return p.fertig();
}

// ================================================================ Serviceauftrag

export function serviceauftragPdf({ auftrag: x, anlage: a, stoerung: s, komponenten = [], ersteller = "" }) {
  const p = rahmen(`Serviceauftrag ${x.id}`, `${a.name} · ${a.id}`, "SERVICEAUFTRAG");
  p.absatz(`An: ${x.dienstleister || "Auftragnehmer"}${x.kontakt ? ` (${x.kontakt})` : ""}`, { fett: true });
  p.angaben([
    ["Art", AUFTRAG_ARTEN[x.art] || x.art],
    ["Anlage", `${a.name} (${zahl(a.kwp, 1)} kWp)`],
    ["Standort (grob)", [a.ort, a.bundesland, a.land].filter(Boolean).join(", ") + " – genaue Anschrift und Zugang nach Terminabstimmung"],
    ["Termin", x.termin ? datum(x.termin.length > 10 ? `${x.termin}:00` : x.termin) : "nach Abstimmung"],
    ["Bestellnummer", x.bestellnummer || x.id],
    ["Kostenrahmen (netto)", x.kostenEur ? eur(x.kostenEur) : "nach Angebot"],
    ...(s ? [["Bezug Störung", `${s.id} – ${s.titel} (Schwere ${s.schwere}, erkannt ${datum(s.erkanntAm)})`], ["Lösungszeit (SLA)", s.sla?.loesung ? `bis ${datum(s.sla.loesung.bis)}` : "–"]] : []),
  ]);
  p.ueberschrift("Leistungsbeschreibung");
  p.absatz(x.beschreibung || "–");
  if (komponenten.length) {
    p.ueberschrift("Anlagenkomponenten");
    p.tabelle(["Art", "Hersteller", "Modell", "Anzahl", "Garantie bis"], komponenten.map((k) => [k.art, k.hersteller || "–", k.modell || "–", zahl(k.anzahl), k.garantieBis ? datum(k.garantieBis) : "–"]), [90, 130, 150, 50, 79]);
  }
  p.ueberschrift("Bedingungen");
  p.absatz("Arbeiten an elektrischen Anlagen nur durch Elektrofachkräfte bzw. unter deren Leitung (DE: DGUV Vorschrift 3, AT: ESV 2012, CH: NIV). Freischalten und Sichern nach den fünf Sicherheitsregeln; DC-Seite bei Tageslicht beachten. Arbeiten auf Dächern nur mit Absturzsicherung. Garantierelevante Arbeiten nach Herstellervorgaben dokumentieren (Seriennummern getauschter Teile, Fotos). Bitte den Einsatzbericht mit Befund, Maßnahme und Materialeinsatz an ÖkoInvest senden.", { groesse: 9 });
  p.absatz(`Mit freundlichen Grüßen\nÖkoInvest GmbH, Betriebsführung${ersteller ? ` (${ersteller})` : ""}`, { abstand: 4 });
  return p.fertig();
}
