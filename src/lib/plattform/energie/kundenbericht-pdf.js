// src/lib/plattform/energie/kundenbericht-pdf.js
//
// Beschaffungsbericht je Kunde (PDF, nur serverseitig): laufende und neue Stromverträge (Lieferantenwechsel: Kundenseite Energie),
// Kündigungsstichtag, Wechselanalyse mit Empfehlung, Ersparnis gegenüber dem Vorvertrag, Ausschreibungen, Analyseverlauf.
// Daten: energieDokumentDaten(n, { art: "kundenbericht", id: kundeId }) – Backoffice für jeden Kunden, Kunde nur für sich.
// Keine Daten anderer Pool-Kunden, keine Angebote anderer Versorger.

import { PdfDokument } from "../server/pdf";

const NAVY = "#03122b";
const GRUEN = "#aed083";
const TINTE = "#151a24";
const GRAU = "#6b7486";
const LINIE = "#dfe3ea";

const fmt = (x, s = 0) => (x === null || x === undefined || !Number.isFinite(Number(x)) ? "–" : Number(x).toLocaleString("de-DE", { minimumFractionDigits: s, maximumFractionDigits: s }));
const ct = (x) => (x === null || x === undefined ? "–" : `${fmt(x, 3)} ct/kWh`);
const eur = (x) => (x === null || x === undefined ? "–" : `${fmt(x)} €`);
const datum = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "–");
const STATUS = { aktiv: "laufend", gekuendigt: "gekündigt", beendet: "beendet", neu: "neu (Lieferbeginn folgt)" };

export function kundenberichtPdf(d) {
  const doc = new PdfDokument({ titel: `Beschaffungsbericht ${d.kunde?.firma || d.kunde?.name || ""}`, thema: "Energiebeschaffung" });
  let s = null;
  let y = 0;
  let nr = 0;
  const neueSeite = () => {
    s = doc.seite();
    nr++;
    s.rechteck(0, 0, doc.breite, 64, NAVY);
    s.text(48, 40, "ÖkoInvest", { groesse: 17, fett: true, farbe: "#ffffff" });
    s.text(doc.breite - 48, 40, "BESCHAFFUNGSBERICHT", { groesse: 8.5, fett: true, farbe: GRUEN, ausrichtung: "rechts", zeichenabstand: 1 });
    s.linie(48, doc.hoehe - 44, doc.breite - 48, doc.hoehe - 44, { farbe: LINIE });
    s.text(48, doc.hoehe - 30, "ÖkoInvest GmbH · Beschaffungsbericht · vertraulich", { groesse: 7.5, farbe: GRAU });
    s.text(doc.breite - 48, doc.hoehe - 30, `Seite ${nr}`, { groesse: 7.5, farbe: GRAU, ausrichtung: "rechts" });
    y = 100;
  };
  const platz = (h) => y + h > doc.hoehe - 70 && neueSeite();
  const absatz = (t, { groesse = 10, fett = false, farbe = "#394050" } = {}) => {
    platz(groesse * 3);
    y = s.absatz(48, y, String(t || ""), { breite: doc.breite - 96, groesse, fett, farbe }) + groesse + 8;
  };
  const kopf = (t) => {
    platz(44);
    y += 6;
    s.text(48, y, t, { groesse: 12, fett: true, farbe: TINTE });
    y += 18;
  };
  const tabelle = (spalten, zeilen, breiten, leer = "Keine Einträge.") => {
    const zeile = (werte, fett = false, hinter = null) => {
      platz(18);
      if (hinter) s.rechteck(48, y - 11, doc.breite - 96, 16, hinter);
      let x = 52;
      werte.forEach((w, i) => {
        const t = String(w ?? "–");
        const max = Math.max(6, Math.floor(breiten[i] / 4.6));
        s.text(x, y, t.length > max ? `${t.slice(0, max - 1)}…` : t, { groesse: 8.3, fett, farbe: TINTE });
        x += breiten[i];
      });
      y += 16;
    };
    zeile(spalten, true, "#eef1f5");
    if (!zeilen.length) zeile([leer]);
    zeilen.forEach((z, i) => zeile(z, false, i % 2 ? "#f8f9fb" : null));
    y += 8;
  };

  neueSeite();
  y = s.absatz(48, y, `Beschaffungsbericht ${d.kunde?.firma || d.kunde?.name || ""}`, { breite: doc.breite - 96, groesse: 18, fett: true, farbe: TINTE, zeilenhoehe: 23 }) + 14;
  y = s.absatz(48, y, `Stand ${datum(d.stand)} · Beschaffungsvollmacht: ${d.vollmacht === "erteilt" ? "erteilt" : d.vollmacht === "widerrufen" ? "widerrufen" : "nicht erteilt"}`, { breite: doc.breite - 96, groesse: 10, farbe: GRAU }) + 16;

  kopf("Stromverträge");
  tabelle(
    ["Lieferant", "Struktur", "Energiepreis", "Laufzeit", "Kündigung bis", "Status"],
    d.vertraege.map((x) => [x.lieferantName || x.lieferant, `${x.strukturLabel}${x.pool ? " · Pool" : ""}`, x.energiepreisCt !== null && x.energiepreisCt !== undefined ? ct(x.energiepreisCt) : x.aufschlagCt !== null && x.aufschlagCt !== undefined ? `Index + ${fmt(x.aufschlagCt, 3)} ct` : "–", `${datum(x.beginn)} – ${datum(x.vertragEnde)}`, datum(x.kuendigungsStichtag), STATUS[x.status] || x.status]),
    [110, 80, 85, 110, 64, 50],
    "Noch kein Vertrag erfasst."
  );
  if (d.ersparnis?.length) {
    kopf("Ergebnis der Ausschreibung (rechnerisch)");
    tabelle(["Neuer Versorger", "Bisher", "Neu", "Menge", "Ersparnis/Jahr"], d.ersparnis.map((e) => [e.lieferant, ct(e.altCt), `${ct(e.neuCt)}${e.erwartet ? " (erwartet)" : ""}`, e.jahresKwh ? `${fmt(e.jahresKwh / 1000)} MWh` : "–", eur(e.eurJahr)]), [120, 90, 120, 70, 99]);
    absatz("Energiepreis ohne Netzentgelte, Umlagen, Abgaben und Steuern. Bei Spot- und Tranchenmodellen ist der neue Preis eine Erwartung aus der aktuellen Terminkurve.", { groesse: 8 });
  }
  const w = d.analyse;
  if (w) {
    kopf(`Wechselanalyse: ${w.label}`);
    tabelle(["Kennzahl", "Wert"], [["Vertrag (Energie)", ct(w.vertragCt)], ["Markt inkl. Aufschlag", ct(w.marktCt)], ["Differenz pro Jahr", eur(w.deltaEurJahr)], ["Kündigung spätestens", `${datum(w.stichtag)}${w.tageBisStichtag !== null ? ` (${w.tageBisStichtag} Tage)` : ""}`], ["Folgezeitraum", `${w.folgezeitraum?.von || "–"} bis ${w.folgezeitraum?.bis || "–"}`]], [250, 249]);
    for (const t of w.begruendung || []) absatz(`• ${t}`, { groesse: 9 });
  }
  if (d.ausschreibungen?.length) {
    kopf("Ausschreibungen");
    tabelle(["Ausschreibung", "Lieferbeginn", "Status"], d.ausschreibungen.map((a) => [`${a.titel}${a.pool ? " (Pool)" : ""}`, a.lieferbeginn ? a.lieferbeginn.split("-").reverse().join("/") : "–", a.status]), [300, 100, 99]);
  }
  if (d.analyseVerlauf?.length) {
    kopf("Verlauf der Empfehlungen");
    tabelle(["Datum", "Empfehlung", "Vertrag", "Markt"], d.analyseVerlauf.slice(-10).map((x) => [datum(x.am), x.empfehlung, ct(x.vertragCt), ct(x.marktCt)]), [100, 140, 130, 129]);
  }
  if (d.kurveDemo) absatz("Achtung: Die Terminkurve enthält Demo-Werte – Empfehlungen sind nur zur Vorführung.", { groesse: 8.5, farbe: TINTE });
  absatz("Die Wechselanalyse ist eine rechnerische Einschätzung auf Basis der eingespielten Terminkurve (Quelle und Handelstag im Handelsdesk) und der Vertragsdaten; sie ist keine Rechts- oder Anlageberatung. Maßgeblich sind die Verträge mit den Versorgern und deren Kündigungsregeln.", { groesse: 7.8 });
  return doc.alsBuffer();
}
