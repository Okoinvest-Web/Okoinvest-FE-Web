// src/lib/plattform/server/gutachter-pdf.js
//
// PDFs der Gutachteraufträge (gemeinsamer PDF-Erzeuger server/pdf.js, Markenfarben wie Exposé/Finanzierung):
//   auftragPdf(d)   Auftragsbestätigung: Leistung, Honorar (netto, Nebenkosten, USt, brutto), Termine, Zahlungsbedingungen,
//                   Bestätigung durch den Gutachter (Zeitpunkt), Vertraulichkeit
//   abnahmePdf(d)   Abnahmeprotokoll: abgenommene Version, Vorbehalte, Mängelhistorie, Rechnungsstand
// Datenquelle: gaPdfDaten (Rechte geprüft). Beide Dokumente ersetzen keinen individuell verhandelten Vertrag.

import { PdfDokument } from "./pdf";
import { HONORAR_ARTEN, LIEFER_ARTEN, RECHNUNG_ARTEN, RECHNUNG_STATUS, TERMIN_ARTEN } from "../gutachter/kern";
import { fmt } from "@/lib/rechner/annahmen";

const F = { navy950: "#03122b", navy900: "#041d42", ov300: "#aed083", ov500: "#669933", ink900: "#151a24", ink700: "#394050", ink500: "#6b7486", ink200: "#dfe3ea", ink50: "#f7f8fa", weiss: "#ffffff" };
const RAND = 44;
const FUSS = 58;
const eur = (x) => (Number.isFinite(x) ? `${fmt(x, 2)} €` : "–");
const dat = (s) => (s ? String(s).slice(0, 10).split("-").reverse().join(".") : "–");

function rahmen({ titel, unter, kennung, fussText }) {
  const doc = new PdfDokument({ titel, thema: unter });
  const B = doc.breite - 2 * RAND;
  const st = { s: null, y: 0 };
  const fuss = () => {
    const y = doc.hoehe - 34;
    st.s.linie(RAND, y - 12, doc.breite - RAND, y - 12, { farbe: F.ink200 });
    st.s.text(RAND, y, fussText.slice(0, 150), { groesse: 7, farbe: F.ink500 });
    st.s.text(RAND, y + 10, `Erstellt am ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })} über das ÖkoInvest-Portal`, { groesse: 7, farbe: F.ink500 });
    st.s.text(doc.breite - RAND, y, `Seite ${doc.seiten.length}`, { groesse: 7, farbe: F.ink500, ausrichtung: "rechts" });
  };
  const neueSeite = (erste = false) => {
    if (st.s) fuss();
    st.s = doc.seite();
    if (erste) {
      st.s.rechteck(0, 0, doc.breite, 112, F.navy950);
      st.s.text(RAND, 42, "ÖkoInvest", { groesse: 18, fett: true, farbe: F.weiss });
      st.s.text(doc.breite - RAND, 42, kennung, { groesse: 8.5, fett: true, farbe: F.ov300, ausrichtung: "rechts", zeichenabstand: 1 });
      st.s.text(RAND, 78, titel.slice(0, 70), { groesse: 19, fett: true, farbe: F.weiss });
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
    st.y = st.s.absatz(RAND, st.y, String(t || "–"), { breite: B, groesse, farbe }) + groesse * 1.6;
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
        st.s.text(c.rechts ? x + br[i] - 4 : x + 4, st.y, String(w ?? "").slice(0, Math.max(8, Math.floor(br[i] / 4.2))), { groesse, farbe: F.ink900, fett: i === 0, ausrichtung: c.rechts ? "rechts" : "links" });
        x += br[i];
      });
      st.s.linie(RAND, st.y + 4, RAND + B, st.y + 4, { farbe: F.ink200, breite: 0.4 });
      st.y += 13.5;
    }
    st.y += 8;
  };
  neueSeite(true);
  return { ueberschrift, absatz, tabelle, fertig: () => (fuss(), doc.alsBuffer()) };
}

function kopfdaten(t, d) {
  const a = d.auftrag;
  t.tabelle([{ label: "Angabe", b: 1 }, { label: "Wert", b: 2.6 }], [
    ["Auftrag", `${a.beauftragung?.nummer || a.id} – ${a.titel}`],
    ["Projekt", `${a.projekt?.titel || ""}${a.projekt?.gemeinde ? `, ${a.projekt.gemeinde}` : ""} (${a.projekt?.land || ""})`],
    ["Meilenstein", a.projekt?.meilenstein?.titel || "–"],
    ["Auftragnehmer", `${d.gutachter.name}${d.gutachter.firma ? `, ${d.gutachter.firma}` : ""}`],
    ["Auftraggeber", "ÖkoInvest GmbH, Gewerbegebiet 10, 5121 Ostermiething (AT) bzw. die im Auftrag genannte Projektgesellschaft"],
  ]);
}

export function auftragPdf(d) {
  const a = d.auftrag;
  const g = a.angebot || {};
  const t = rahmen({ titel: "Auftragsbestätigung", unter: `${a.titel} · ${a.projekt?.titel || ""}`, kennung: "GUTACHTERAUFTRAG", fussText: "Auftragsbestätigung aus dem ÖkoInvest-Portal. Individuelle Vertragsbedingungen gehen vor; Vertraulichkeit nach Nutzungsbedingungen § 12." });
  kopfdaten(t, d);
  t.ueberschrift("Leistung");
  t.absatz(a.leistung);
  if (a.hinweise) t.absatz(`Hinweise: ${a.hinweise}`, { groesse: 8.5 });
  t.ueberschrift("Honorar und Zahlungsbedingungen");
  t.tabelle([{ label: "Position", b: 2.4 }, { label: "Betrag", b: 1, rechts: true }], [
    [`${HONORAR_ARTEN[g.honorarArt] || "Honorar"}${g.honorarArt === "stunden" ? ` (${fmt(g.stunden || 0, 1)} h × ${eur(g.stundensatz)})` : ""}`, eur(g.honorar)],
    [`Nebenkosten (${fmt(g.nebenkostenPct || 0, 1)} %)`, eur(g.nebenkosten)],
    ["Auftragssumme netto", eur(g.summeNetto)],
    [`Umsatzsteuer ${fmt(g.ustPct || 0, 1)} %${g.ustPct === 0 && g.ustHinweis ? ` (${g.ustHinweis})` : ""}`, eur(g.summeUst)],
    ["Auftragssumme brutto", eur(g.summeBrutto)],
  ]);
  t.absatz(`Zahlungsziel ${g.zahlungszielTage || 30} Tage nach Rechnungseingang. ${g.abschlagPct ? `Abschlagsrechnungen bis ${g.abschlagPct} % der Auftragssumme während der Bearbeitung, ` : ""}Schlussrechnung nach Abnahme. Rechnungen mit Rechnungsnummer, Datum, Leistungszeitraum und Umsatzsteuerangaben über das Portal einreichen.`, { groesse: 8.5 });
  t.ueberschrift("Termine");
  t.tabelle([{ label: "Termin", b: 1.6 }, { label: "Datum", b: 1 }], [
    ["Liefertermin (Endfassung)", dat(a.beauftragung?.liefertermin)],
    ...(a.termine || []).filter((x) => x.status !== "abgesagt").map((x) => [TERMIN_ARTEN[x.art] || "Termin", `${dat(x.datum)}${x.uhrzeit ? ` ${x.uhrzeit}` : ""}`]),
  ]);
  if (a.beauftragung?.bedingungen) {
    t.ueberschrift("Besondere Bedingungen");
    t.absatz(a.beauftragung.bedingungen);
  }
  t.ueberschrift("Beauftragung und Bestätigung");
  t.absatz(`Beauftragt am ${dat(a.beauftragung?.am)} durch ${a.beauftragung?.von || "ÖkoInvest"}. ${a.beauftragung?.bestaetigtAm ? `Vom Auftragnehmer im Portal bestätigt am ${new Date(a.beauftragung.bestaetigtAm).toLocaleString("de-DE", { timeZone: "Europe/Berlin" })} (${a.beauftragung.bestaetigtVon || ""}).` : "Bestätigung durch den Auftragnehmer steht noch aus."}`);
  t.absatz("Der Auftragnehmer behandelt alle Projekt- und Eigentümerdaten vertraulich, nutzt sie ausschließlich für diesen Auftrag, gibt sie nicht an Dritte weiter (außer an zur Verschwiegenheit verpflichtete Hilfspersonen) und löscht bzw. übergibt sie nach Weisung. Das Ergebnis darf für das Genehmigungsverfahren, die Finanzierung und den Verkauf des Projekts genutzt werden.", { groesse: 8.5 });
  return t.fertig();
}

export function abnahmePdf(d) {
  const a = d.auftrag;
  const t = rahmen({ titel: "Abnahmeprotokoll", unter: `${a.titel} · ${a.projekt?.titel || ""}`, kennung: "ABNAHME", fussText: "Abnahmeprotokoll aus dem ÖkoInvest-Portal. Die Abnahme bestätigt die vertragsgemäße Leistung vorbehaltlich der genannten Punkte." });
  kopfdaten(t, d);
  const l = (a.lieferungen || []).find((x) => x.id === a.abnahme?.lieferungId);
  t.ueberschrift("Abnahme");
  t.absatz(`Abgenommen am ${dat(a.abnahme?.am)} durch ${a.abnahme?.von || "ÖkoInvest"} – Version ${a.abnahme?.version || "?"} (${LIEFER_ARTEN[l?.art] || "Endfassung"})${l?.datei?.name ? `, Datei „${l.datei.name}“` : ""}.`);
  t.absatz(a.abnahme?.vorbehalt ? `Vorbehalte: ${a.abnahme.vorbehalt}` : "Ohne Vorbehalte.");
  t.ueberschrift("Lieferungen und Prüfungen");
  t.tabelle([{ label: "Version", b: 0.6 }, { label: "Art", b: 1.2 }, { label: "Eingang", b: 0.9 }, { label: "Ergebnis", b: 1 }, { label: "Mängel", b: 2 }], (a.lieferungen || []).slice().reverse().map((x) => [x.version, LIEFER_ARTEN[x.art] || x.art, dat(x.am), x.status === "freigegeben" ? "freigegeben" : x.status === "maengel" ? "Mängel" : x.status === "ersetzt" ? "ersetzt" : "in Prüfung", (x.maengel || []).map((m) => m.text).join("; ") || "–"]));
  t.ueberschrift("Rechnungsstand");
  const r = a.rechnungsstand || {};
  t.tabelle([{ label: "Rechnung", b: 1.4 }, { label: "Datum", b: 0.8 }, { label: "Netto", b: 1, rechts: true }, { label: "Brutto", b: 1, rechts: true }, { label: "Status", b: 1.4 }], (a.rechnungen || []).map((x) => [`${RECHNUNG_ARTEN[x.art]} ${x.nummer}`, dat(x.datum), eur(x.netto), eur(x.brutto), RECHNUNG_STATUS[x.status]?.label || x.status]));
  t.absatz(`Auftragssumme netto ${eur(r.auftragssumme)} · berechnet netto ${eur(r.berechnetNetto)} · noch nicht berechnet ${eur(r.restNetto)}.`, { groesse: 8.5 });
  return t.fertig();
}
