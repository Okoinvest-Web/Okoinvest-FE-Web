// src/lib/plattform/server/entwicklung-steuerung-pdf.js
//
// Projektentwicklung – Steuerung als PDF/CSV (gemeinsamer PDF-Erzeuger server/pdf.js, Markenfarben wie Kostenkalkulation):
//   vorlagePdf(vorlage)          Entscheidungsvorlage für die Geschäftsführung (Beschlussvorschlag, Sachverhalt, Kennzahlen-
//                                Momentaufnahme beim Einreichen, Ampel, Termine, Risiken, Geschäftsmodell-Vergleich, Entscheidung)
//   pipelineBerichtPdf(daten)    Pipeline-Bericht (MWp je Phase × Land, Ziel-Abgleich, Ampel, Kapazität, Top-Risiken)
//   pipelineBerichtCsv(daten)    Projektliste mit Ampel für Excel-DE (BOM, Semikolon, Formel-Schutz über csvWert)
// Intern/vertraulich. Eingaben sind die Ausgaben von steuerungUebersicht bzw. vorlageHolen (Demo und Frappe identisch).

import { PdfDokument } from "./pdf";
import { csvWert } from "../csv";
import { AMPEL, AMPEL_DIMENSIONEN, VERWERTUNG, VORLAGE_ARTEN, VORLAGE_STATUS } from "../entwicklung-steuerung";
import { fmt } from "@/lib/rechner/annahmen";

const F = { navy950: "#03122b", navy900: "#041d42", ov300: "#aed083", ov500: "#669933", ink900: "#151a24", ink700: "#394050", ink500: "#6b7486", ink200: "#dfe3ea", ink50: "#f7f8fa", rot: "#b42318", gelb: "#8a6100", gruen: "#3d6b1f", weiss: "#ffffff" };
const AMPEL_FARBE = { gruen: F.gruen, gelb: F.gelb, rot: F.rot, grau: F.ink500 };
const RAND = 40;
const FUSS = 58;
const teur = (x) => (Number.isFinite(Number(x)) ? `${fmt(Math.round(Number(x) / 1000))} T€` : "–");
const eur = (x) => (Number.isFinite(Number(x)) ? `${fmt(Math.round(Number(x)))} €` : "–");
const zahl = (x, s = 0) => (Number.isFinite(Number(x)) ? fmt(Number(x), s) : "–");
const datum = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "–");
const monat = (iso) => (iso ? String(iso).slice(0, 7).split("-").reverse().join("/") : "–");
const pct = (x) => (Number.isFinite(Number(x)) ? `${fmt(Math.round(Number(x) * 100))} %` : "–");

/** Seitenrahmen mit Kopf, Fuß, Überschriften, Absätzen, Kacheln, Tabellen (wie kosten-pdf.js) */
function rahmen({ titel, thema, kopfLinks, kopfRechts, unterzeile, fussText, ersteller }) {
  const doc = new PdfDokument({ titel, thema });
  const B = doc.breite - 2 * RAND;
  const st = { s: null, y: 0 };
  const fuss = () => {
    const y = doc.hoehe - 30;
    st.s.linie(RAND, y - 12, doc.breite - RAND, y - 12, { farbe: F.ink200 });
    st.s.text(RAND, y, fussText, { groesse: 7, farbe: F.ink500 });
    st.s.text(RAND, y + 10, `Erstellt ${ersteller ? `von ${[ersteller.vorname, ersteller.nachname].filter(Boolean).join(" ") || ersteller.email} ` : ""}am ${new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}`, { groesse: 7, farbe: F.ink500 });
    st.s.text(doc.breite - RAND, y, `Seite ${doc.seiten.length}`, { groesse: 7, farbe: F.ink500, ausrichtung: "rechts" });
  };
  const neueSeite = (erste = false) => {
    if (st.s) fuss();
    st.s = doc.seite();
    if (erste) {
      st.s.rechteck(0, 0, doc.breite, 108, F.navy950);
      st.s.text(RAND, 40, "ÖkoInvest", { groesse: 18, fett: true, farbe: F.weiss });
      st.s.text(doc.breite - RAND, 40, kopfRechts.toUpperCase(), { groesse: 8.5, fett: true, farbe: F.ov300, ausrichtung: "rechts", zeichenabstand: 1 });
      st.s.text(RAND, 74, kopfLinks.slice(0, 70), { groesse: 18, fett: true, farbe: F.weiss });
      st.s.text(RAND, 94, unterzeile.slice(0, 110), { groesse: 9, farbe: F.ov300 });
      st.y = 134;
    } else {
      st.s.rechteck(0, 0, doc.breite, 30, F.navy950);
      st.s.text(RAND, 20, "ÖkoInvest", { groesse: 10, fett: true, farbe: F.weiss });
      st.s.text(doc.breite - RAND, 20, kopfLinks.slice(0, 80), { groesse: 8, farbe: F.ov300, ausrichtung: "rechts" });
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
  const absatz = (t, { groesse = 8.8, farbe = F.ink700, fett = false } = {}) => {
    for (const teil of String(t || "").split(/\n+/).filter(Boolean)) {
      platz(22);
      st.y = st.s.absatz(RAND, st.y, teil, { breite: B, groesse, farbe, fett }) + groesse * 1.1;
    }
    st.y += groesse * 0.4;
  };
  const kacheln = (liste) => {
    platz(56);
    const b = (B - (liste.length - 1) * 8) / liste.length;
    liste.forEach(([label, wert, farbe], i) => {
      const x = RAND + i * (b + 8);
      st.s.rechteck(x, st.y - 10, b, 44, F.ink50);
      st.s.text(x + 8, st.y + 2, label, { groesse: 7.2, farbe: F.ink500 });
      st.s.text(x + 8, st.y + 22, String(wert), { groesse: 11.5, fett: true, farbe: farbe || F.ink900 });
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
      const werte = z.werte || z;
      if (z.hinterlegt) st.s.rechteck(RAND, st.y - 9, B, 13, F.ink50);
      let x = RAND;
      werte.forEach((w, i) => {
        const c = spalten[i];
        const farbe = typeof w === "object" && w ? w.farbe : F.ink900;
        const max = Math.max(4, Math.floor(br[i] / (groesse * 0.5)));
        let text = typeof w === "object" && w ? w.text : String(w ?? "");
        if (text.length > max) text = `${text.slice(0, max - 1)}…`;
        st.s.text(c.rechts ? x + br[i] - 4 : x + 4, st.y, text, { groesse, farbe, fett: !!z.fett || (typeof w === "object" && w?.fett), ausrichtung: c.rechts ? "rechts" : "links" });
        x += br[i];
      });
      st.s.linie(RAND, st.y + 4, RAND + B, st.y + 4, { farbe: F.ink200, breite: 0.4 });
      st.y += 13;
    }
    st.y += 8;
  };
  const ende = () => {
    fuss();
    return doc.alsBuffer();
  };
  return { st, neueSeite, ueberschrift, absatz, kacheln, tabelle, platz, ende };
}

const ampelZelle = (a) => ({ text: AMPEL[a?.farbe || "grau"]?.label || "–", farbe: AMPEL_FARBE[a?.farbe || "grau"], fett: true });

// ================================================================ Entscheidungsvorlage

export function vorlagePdf(x, { ersteller = null } = {}) {
  const s = x.snapshot || {};
  const p = s.projekt || { titel: x.projektTitel, id: x.projektId };
  const r = rahmen({
    titel: `Entscheidungsvorlage ${x.id}`, thema: `${x.artLabel} · ${x.projektTitel}`,
    kopfLinks: x.titel, kopfRechts: `Entscheidungsvorlage · ${VORLAGE_STATUS[x.status]?.label || x.status}`,
    unterzeile: `${x.id} · ${x.artLabel} · Projekt ${p.titel || x.projektTitel} (${x.projektId})`,
    fussText: "Vertraulich – nur für Geschäftsführung und Projektentwicklung. Kennzahlen: Momentaufnahme beim Einreichen; Planwerte, keine Zusagen.",
    ersteller,
  });
  r.neueSeite(true);
  r.kacheln([
    ["Status", VORLAGE_STATUS[x.status]?.label || x.status],
    ["Eingereicht", x.eingereichtAm ? `${datum(x.eingereichtAm)} · ${x.eingereichtVon?.name || ""}` : "noch nicht"],
    ["Entscheidung bis", datum(x.entscheidungBis)],
    [VORLAGE_ARTEN[x.art]?.budget ? "Beantragtes Budget" : "Empfohlene Verwertung", VORLAGE_ARTEN[x.art]?.budget ? eur(x.budgetEur) : (VERWERTUNG[x.empfehlung]?.label.split(" (")[0] || "–")],
  ]);
  r.ueberschrift("Beschlussvorschlag");
  r.absatz(x.beschlussvorschlag || "–", { fett: true, farbe: F.ink900, groesse: 9.5 });
  if (VORLAGE_ARTEN[x.art]?.verwertung && x.empfehlung) r.absatz(`Empfohlene Verwertung: ${VERWERTUNG[x.empfehlung]?.label}. Folge bei Genehmigung: ${VERWERTUNG[x.empfehlung]?.folge}`);
  r.ueberschrift("Sachverhalt");
  r.absatz(x.sachverhalt || "–");
  if (x.alternativen) {
    r.ueberschrift("Alternativen");
    r.absatz(x.alternativen);
  }

  if (x.snapshot) {
    r.ueberschrift(`Projekt auf einen Blick (Stand ${datum(s.stand)})`);
    r.kacheln([
      ["Leistung", `${zahl(p.mwp, 2)} ${p.typLabel === "Batteriegroßspeicher" ? "MW" : "MWp"}${p.mwh ? ` · ${zahl(p.mwh)} MWh` : ""}`],
      ["Phase", s.phaseLabel || "Akquise"],
      ["COD Prognose", `${monat(s.prognoseCod)}${s.codVerzugMonate ? ` (+${s.codVerzugMonate} M.)` : ""}`],
      ["Pipeline-Wert", teur(s.pipeline?.wert)],
    ]);
    r.kacheln([
      ["Fortschritt", `${zahl(s.fortschritt)} %`],
      ["Fläche gesichert", `${zahl(s.flaecheGesichertHa, 1)} / ${zahl(s.flaecheHa, 1)} ha`],
      ["Grundbuch gesichert", `${zahl(s.sicherung?.grundbuchHa, 1)} ha`],
      ["Budget Ist / Plan", `${teur(s.budgetIst)} / ${teur(s.budgetPlan)}`],
    ]);
    r.absatz(`${p.typLabel || ""} · ${[p.gemeinde, p.bundesland, p.land].filter(Boolean).join(", ")} · Vermarktung: ${p.vermarktungLabel || "–"} · Projektleitung: ${p.projektleiter || "–"}${p.netzbetreiber ? ` · Netzbetreiber: ${p.netzbetreiber}` : ""}${p.nvp ? ` · NVP: ${p.nvp}` : ""}`);

    r.ueberschrift("Projektampel");
    r.tabelle(
      [{ label: "Dimension", b: 1.6 }, { label: "Ampel", b: 1 }, { label: "Begründung", b: 4.4 }],
      [...Object.entries(AMPEL_DIMENSIONEN).map(([id, label]) => [label, ampelZelle(s.ampel?.[id]), s.ampel?.[id]?.grund || "–"]), { werte: ["Gesamt", ampelZelle(s.ampel?.gesamt), s.ampel?.gesamt?.grund || "–"], fett: true, hinterlegt: true }]
    );

    if (s.meilensteine?.length) {
      r.ueberschrift("Nächste Meilensteine");
      r.tabelle(
        [{ label: "Meilenstein", b: 4 }, { label: "Soll-Ende", b: 1, rechts: true }, { label: "Prognose", b: 1, rechts: true }, { label: "Status", b: 1.2 }],
        s.meilensteine.map((m) => [m.titel, datum(m.sollEnde), datum(m.prognoseEnde), { text: m.kritisch ? "kritisch" : m.status, farbe: m.kritisch ? F.rot : F.ink900 }])
      );
    }
    if (s.risiken?.length) {
      r.ueberschrift("Wesentliche Risiken");
      r.tabelle(
        [{ label: "Risiko", b: 3 }, { label: "Kategorie", b: 1.5 }, { label: "Score", b: 0.6, rechts: true }, { label: "Rest", b: 0.6, rechts: true }, { label: "Risikokosten", b: 1.1, rechts: true }, { label: "Maßnahme", b: 3 }],
        [...s.risiken.map((x2) => [x2.titel, x2.kategorieLabel, { text: String(x2.score), farbe: x2.score >= 15 ? F.rot : x2.score >= 8 ? F.gelb : F.gruen, fett: true }, x2.restScore ?? "–", x2.erwartet ? teur(x2.erwartet) : "–", x2.massnahme || "–"]),
          { werte: ["Summe erwartete Risikokosten (offene Risiken)", "", "", "", teur(s.risikokosten), ""], fett: true, hinterlegt: true }]
      );
    }
    if (x.risikenText) r.absatz(`Einschätzung der Projektleitung: ${x.risikenText}`);
    const gm = s.geschaeftsmodell;
    if (VORLAGE_ARTEN[x.art]?.verwertung && gm?.zeilen?.length) {
      r.ueberschrift("Geschäftsmodell-Vergleich (Barwert zum Eigenkapital-Diskontsatz)");
      r.tabelle(
        [{ label: "Modell", b: 3.4 }, { label: "Barwert", b: 1.2, rechts: true }, { label: "EK-Bindung", b: 1.2, rechts: true }, { label: "EK-Rendite", b: 1, rechts: true }],
        gm.zeilen.map((z) => [{ text: z.label, fett: z.id === gm.beste }, teur(z.barwert), z.kapitalbindung ? teur(z.kapitalbindung) : "–", z.irr !== null && z.irr !== undefined ? pct(z.irr) : "–"])
      );
      r.absatz(`${gm.empfehlung} Quelle: ${gm.quelle}. „Bau für einen Investor“ entspricht wirtschaftlich dem Verkauf mit zusätzlicher EPC-Marge der ÖKOVOLT-Gruppe (Konzernsicht). Orientierung, keine Anlage- oder Steuerberatung.`, { groesse: 8, farbe: F.ink500 });
    }
  } else {
    r.absatz("Die Kennzahlen-Momentaufnahme wird beim Einreichen erstellt.", { farbe: F.ink500 });
  }

  r.ueberschrift("Entscheidung der Geschäftsführung");
  if (x.entscheidung) {
    const e = x.entscheidung;
    r.kacheln([["Entscheidung", VORLAGE_STATUS[x.status]?.label || e.aktion, x.status === "genehmigt" ? F.gruen : F.rot], ["Datum", datum(e.am)], ["Durch", e.von || "–"], ["Verwertung", e.option ? VERWERTUNG[e.option]?.label.split(" (")[0] : "–"]]);
    if (e.begruendung) r.absatz(`Begründung: ${e.begruendung}`);
  } else {
    r.absatz("[ ] genehmigt     [ ] abgelehnt     [ ] zurückgestellt (Nacharbeit)", { groesse: 10, farbe: F.ink900 });
    r.absatz("Begründung / Auflagen: ______________________________________________________________", { groesse: 9 });
    r.absatz("Ort, Datum, Unterschrift Geschäftsführung: ___________________________________________", { groesse: 9 });
    r.absatz("Hinweis: Im Portal entscheidet die Leitung nach dem Vier-Augen-Prinzip; die Entscheidung wird unveränderlich im Entscheidungsprotokoll des Projekts festgehalten.", { groesse: 7.8, farbe: F.ink500 });
  }
  if (x.verlauf?.length) {
    r.ueberschrift("Verlauf");
    r.tabelle([{ label: "Zeitpunkt", b: 1.4 }, { label: "Von", b: 1.6 }, { label: "Ereignis", b: 5 }], x.verlauf.map((e) => [datum(e.am), e.von || "", e.text]));
  }
  return r.ende();
}

// ================================================================ Pipeline-Bericht

export function pipelineBerichtPdf(d, { ersteller = null } = {}) {
  const r = rahmen({
    titel: `Pipeline-Bericht Projektentwicklung ${d.stand}`, thema: "MWp je Phase und Land, Ziel-Abgleich, Projektampel, Kapazität",
    kopfLinks: "Pipeline-Bericht Projektentwicklung", kopfRechts: `Stand ${datum(d.stand)}`,
    unterzeile: `${d.summen.anzahl} Projekte in Entwicklung · ${zahl(d.summen.mwp, 1)} MWp · gewichtet ${zahl(d.summen.mwpGewichtet, 1)} MWp · Ziel rund ${d.zielMwpJahr} MWp/Jahr`,
    fussText: "Vertraulich – intern. Gewichtung mit der Wahrscheinlichkeit je Phase (markt.js), COD aus dem Terminplan (kritischer Pfad). Planwerte, keine Zusagen.",
    ersteller,
  });
  r.neueSeite(true);
  const v = d.verteilung || {};
  r.kacheln([["Projekte", String(d.summen.anzahl)], ["MWp gesamt", zahl(d.summen.mwp, 1)], ["MWp gewichtet", zahl(d.summen.mwpGewichtet, 1)], ["Pipeline-Wert", teur(d.summen.wert)]]);
  r.kacheln([["Ampel grün", String(v.gruen || 0), F.gruen], ["Ampel gelb", String(v.gelb || 0), F.gelb], ["Ampel rot", String(v.rot || 0), F.rot], ["Risikokosten (erwartet)", teur(d.risikoSumme?.erwartet)]]);

  r.ueberschrift("MWp je Phase und Land (offene Projekte)");
  const L = d.matrix.laender;
  r.tabelle(
    [{ label: "Phase", b: 1.8 }, ...L.map((l) => ({ label: l, b: 1, rechts: true })), { label: "Summe MWp", b: 1.1, rechts: true }, { label: "gewichtet", b: 1, rechts: true }, { label: "Anzahl", b: 0.7, rechts: true }],
    [
      ...d.matrix.zeilen.map((z) => [z.label, ...L.map((l) => (z.zellen[l].anzahl ? zahl(z.zellen[l].mwp, 1) : "–")), zahl(z.summe.mwp, 1), zahl(z.summe.mwpGewichtet, 1), String(z.summe.anzahl)]),
      { werte: ["Summe", ...L.map((l) => zahl(d.matrix.spalten[l].mwp, 1)), zahl(d.matrix.gesamt.mwp, 1), zahl(d.matrix.gesamt.mwpGewichtet, 1), String(d.matrix.gesamt.anzahl)], fett: true, hinterlegt: true },
    ]
  );

  r.ueberschrift(`Ziel-Abgleich: Inbetriebnahme je Jahr (Ziel rund ${d.zielMwpJahr} MWp)`);
  r.tabelle(
    [{ label: "Jahr", b: 0.8 }, { label: "Projekte", b: 0.8, rechts: true }, { label: "MWp", b: 1, rechts: true }, { label: "gewichtet", b: 1, rechts: true }, { label: "Deckung", b: 1, rechts: true }, { label: "Lücke MWp", b: 1, rechts: true }],
    d.ziel.map((j) => [String(j.jahr), String(j.anzahl), zahl(j.mwp, 1), zahl(j.mwpGewichtet, 1), { text: pct(j.deckung), farbe: AMPEL_FARBE[j.farbe], fett: true }, zahl(j.luecke, 1)])
  );
  r.absatz("Die gewichtete Leistung berücksichtigt, dass nicht jedes Projekt die Baureife erreicht. Eine Lücke im Folgejahr lässt sich in der Regel nur durch Zukäufe baureifer Projekte schließen – Neuakquise wirkt wegen der Verfahrensdauer meist erst nach zwei bis drei Jahren.", { groesse: 8, farbe: F.ink500 });

  r.ueberschrift("Projektampel");
  const offen = d.projekte.filter((p) => ["aktiv", "pausiert"].includes(p.status)).sort((a, b) => ({ rot: 0, gelb: 1, gruen: 2, grau: 3 }[a.ampel.gesamt.farbe] - { rot: 0, gelb: 1, gruen: 2, grau: 3 }[b.ampel.gesamt.farbe]));
  r.tabelle(
    [{ label: "Projekt", b: 2.6 }, { label: "Land", b: 0.5 }, { label: "Phase", b: 1.2 }, { label: "MWp", b: 0.6, rechts: true }, { label: "Termin", b: 0.8 }, { label: "Kosten", b: 0.8 }, { label: "Risiko", b: 0.8 }, { label: "Fläche", b: 0.8 }, { label: "Gesamt", b: 0.8 }],
    offen.map((p) => [p.titel, p.land, p.phaseLabel, zahl(p.mwp, 1), ampelZelle(p.ampel.termin), ampelZelle(p.ampel.kosten), ampelZelle(p.ampel.risiko), ampelZelle(p.ampel.flaeche), ampelZelle(p.ampel.gesamt)]),
    { groesse: 7 }
  );

  if (d.kapazitaet?.zeilen?.length) {
    r.ueberschrift("Kapazität der Projektleitungen (Stunden je Monat)");
    const M = d.kapazitaet.monate;
    r.tabelle(
      [{ label: "Projektleitung", b: 2 }, { label: "Kap.", b: 0.6, rechts: true }, { label: "Proj.", b: 0.5, rechts: true }, ...M.map((m) => ({ label: monat(m), b: 0.8, rechts: true }))],
      d.kapazitaet.zeilen.map((z) => [z.name, String(z.stundenMonat), String(z.projekte), ...z.je.map((j) => ({ text: pct(j.auslastung), farbe: AMPEL_FARBE[j.farbe] }))])
    );
    const pw = d.kapazitaet.planwerte;
    r.absatz(`Planwerte: ${pw.grundlastProjekt} h je aktivem Projekt und Monat, ${pw.jeMeilenstein} h je intern bearbeitetem und ${pw.jeGutachten} h je extern beauftragtem Meilenstein im laufenden Monat; Standardkapazität ${pw.stundenMonat} h/Monat (je Person anpassbar). Gelb ab ${pct(pw.gelbAb)}, rot über ${pct(pw.rotAb)}.`, { groesse: 8, farbe: F.ink500 });
  }

  if (d.risiken?.length) {
    r.ueberschrift("Größte Risiken über alle Projekte");
    r.tabelle(
      [{ label: "Projekt", b: 2 }, { label: "Risiko", b: 3 }, { label: "Score", b: 0.6, rechts: true }, { label: "Risikokosten", b: 1, rechts: true }, { label: "Prüfen bis", b: 0.9, rechts: true }],
      d.risiken.slice(0, 15).map((x) => [x.projektTitel, x.titel, { text: String(x.score), farbe: x.score >= 15 ? F.rot : x.score >= 8 ? F.gelb : F.gruen, fett: true }, x.erwartet ? teur(x.erwartet) : "–", { text: datum(x.pruefenAm), farbe: x.pruefungUeberfaellig ? F.rot : F.ink900 }])
    );
  }
  if (d.optionsfristen?.length) {
    r.ueberschrift("Optionsfristen der Flächensicherung (60 Tage)");
    r.tabelle([{ label: "Projekt", b: 2.5 }, { label: "Fläche", b: 2.5 }, { label: "ha", b: 0.6, rechts: true }, { label: "Option bis", b: 1, rechts: true }, { label: "Tage", b: 0.6, rechts: true }], d.optionsfristen.map((o) => [o.projektTitel, o.bezeichnung, zahl(o.ha, 1), datum(o.optionBis), { text: String(o.inTagen), farbe: o.inTagen < 14 ? F.rot : F.gelb, fett: true }]));
  }
  return r.ende();
}

export function pipelineBerichtCsv(d) {
  const z = (x, st = 2) => (Number.isFinite(Number(x)) && x !== null && x !== "" ? Number(x).toFixed(st).replace(".", ",") : "");
  const kopf = ["Projekt-ID", "Projekt", "Typ", "Land", "Bundesland/Kanton", "Status", "Phase", "MWp", "MWp gewichtet", "Pipeline-Wert €", "COD Prognose", "COD Ziel", "Verzug Monate", "Budget Plan €", "Budget Ist €", "Risiko max", "Fläche ha", "davon Vertrag ha", "davon Grundbuch ha", "Projektleitung", "Ampel Termin", "Ampel Kosten", "Ampel Risiko", "Ampel Fläche", "Ampel Dokumente", "Ampel gesamt", "Begründung", "Verwertung"];
  const a = (x) => AMPEL[x?.farbe || "grau"]?.label || "";
  const zeilen = d.projekte.map((p) => [
    p.id, p.titel, p.typLabel, p.land, p.bundesland, p.statusLabel, p.phaseLabel, z(p.mwp), z(p.pipeline?.gewichtetMwp), z(p.pipeline?.wert, 0), (p.prognoseCod || "").slice(0, 10), p.zielCod || "", String(p.codVerzugMonate || 0),
    z(p.budgetPlan, 0), z(p.budgetIst, 0), String(p.risikoMax || 0), z(p.sicherung?.ha, 1), z(p.sicherung?.vertragHa, 1), z(p.sicherung?.grundbuchHa, 1), p.projektleiter?.name || "",
    a(p.ampel?.termin), a(p.ampel?.kosten), a(p.ampel?.risiko), a(p.ampel?.flaeche), a(p.ampel?.dokumente), a(p.ampel?.gesamt), p.ampel?.gesamt?.grund || "", VERWERTUNG[p.verwertung]?.label || "",
  ]);
  zeilen.push([], ["Phase", ...d.matrix.laender.map((l) => `${l} MWp`), "Summe MWp", "gewichtet MWp", "Anzahl"]);
  for (const r of d.matrix.zeilen) zeilen.push([r.label, ...d.matrix.laender.map((l) => z(r.zellen[l].mwp)), z(r.summe.mwp), z(r.summe.mwpGewichtet), String(r.summe.anzahl)]);
  zeilen.push([], ["Jahr", "Projekte", "MWp", "MWp gewichtet", "Ziel MWp", "Deckung %", "Lücke MWp"]);
  for (const j of d.ziel) zeilen.push([String(j.jahr), String(j.anzahl), z(j.mwp), z(j.mwpGewichtet), String(j.ziel), z(j.deckung * 100, 0), z(j.luecke)]);
  return "﻿" + [kopf, ...zeilen].map((r) => r.map((w) => (w === "" || w === undefined || w === null ? "" : csvWert(w))).join(";")).join("\r\n") + "\r\n";
}
