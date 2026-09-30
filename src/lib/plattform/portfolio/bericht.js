// src/lib/plattform/portfolio/bericht.js
//
// Quartals- und Jahresbericht einer Portfolio-Position als Dokumentstruktur für dokumentePdf (dienste/pdf.js).
// Rein (ohne Node-Importe): Eingabe sind die rechtegeprüften Berichtsdaten aus pfBerichtDaten (Demo bzw. Frappe).

import { ABRUF_STATUS, AUSSCHUETTUNG_ARTEN, BERICHT_ARTEN, PF_ARTEN, PF_STATUS, STEUER_HINWEIS_TEXT, cashflowKennzahlen, covenantAuswertung, ertragAuswertung, inPeriode, periodeMonate, quellensteuerHinweis, steuerHinweise } from "./kern.js";

const waehrung = (land) => (land === "CH" ? "CHF" : "€");
const betrag = (x, land) => (x === null || x === undefined ? "–" : `${Math.round(Number(x)).toLocaleString("de-DE")} ${waehrung(land)}`);
const kwh = (x) => (x === null || x === undefined ? "–" : `${Math.round(Number(x) / 1000).toLocaleString("de-DE")} MWh`);
const pct = (x, st = 1) => (x === null || x === undefined ? "–" : `${(Number(x) * 100).toLocaleString("de-DE", { minimumFractionDigits: st, maximumFractionDigits: st })} %`);
const datum = (s) => (s ? new Date(`${String(s).slice(0, 10)}T12:00:00Z`).toLocaleDateString("de-DE", { timeZone: "UTC" }) : "–");
const monatText = (m) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("de-DE", { month: "short", year: "numeric", timeZone: "UTC" });
const AMPEL = { gruen: "grün", gelb: "gelb", rot: "rot", grau: "keine Bewertung" };

export const BERICHT_HINWEIS = "Dieser Bericht fasst die im Portal erfassten Werte zusammen. Er ersetzt weder den Jahresabschluss der Projektgesellschaft noch die Steuerbescheinigungen und ist keine Anlage- oder Steuerberatung. Ist-Erträge stammen aus Zählerwerten bzw. Meldungen der Betriebsführung.";

/** Berichtsdaten aus Position + Sammlungen berechnen (von Demo- und Frappe-Adapter gemeinsam genutzt) */
export function berichtRechnen(pos, { ertraege = [], abrufe = [], ausschuettungen = [] } = {}, { art, periode, heute }) {
  const monate = periodeMonate(art, periode);
  const bis = monate[monate.length - 1];
  const ertrag = pos.p50KwhJahr ? ertragAuswertung(pos, ertraege, { bis, monate: monate.length }) : null;
  const covenant = covenantAuswertung(pos, ertraege, { bis });
  const aPer = ausschuettungen.filter((a) => a.status !== "storniert" && inPeriode(a.datum, monate));
  const kPer = abrufe.filter((a) => a.status !== "storniert" && (inPeriode(a.angekuendigtAm, monate) || inPeriode(a.bezahltAm, monate)));
  const stichtag = `${bis}-28` < heute ? `${bis}-28` : heute;
  const kennzahlen = cashflowKennzahlen(pos, { abrufe: abrufe.filter((a) => !a.angekuendigtAm || a.angekuendigtAm.slice(0, 7) <= bis), ausschuettungen: ausschuettungen.filter((a) => a.datum.slice(0, 7) <= bis) }, { heute: stichtag });
  return { art, periode, monate, bis, ertrag, covenant, ausschuettungen: aPer, abrufe: kPer, kennzahlen, summeAusschuettung: aPer.reduce((s, a) => s + a.betrag, 0) };
}

/** Dokumentstruktur (eine Seite je Bericht, Folgeseiten automatisch) */
export function berichtDokumente(pos, b, { empfaenger = "", erzeugtAm = "" } = {}) {
  const land = pos.land;
  const titel = `${BERICHT_ARTEN[b.art]} ${b.art === "quartal" ? b.periode.replace("-", " ") : b.periode}`;
  const abschnitte = [
    {
      titel: "Eckdaten",
      tabelle: {
        kopf: ["Angabe", "Wert"],
        zeilen: [
          ["Position", `${pos.titel} (${PF_ARTEN[pos.art]?.label || pos.art})`],
          ["Status", PF_STATUS[pos.status]?.label || pos.status],
          ["Leistung", pos.mwp ? `${Number(pos.mwp).toLocaleString("de-DE")} MWp` : "–"],
          ["Projektgesellschaft", pos.spvName || "–"],
          ["Ihr Anteil", `${Number(pos.anteilProzent || 100).toLocaleString("de-DE")} %`],
          pos.art === "codev" ? ["Kapitalzusage", betrag(pos.zusage, land)] : ["Kaufpreis (Ihr Anteil)", betrag(b.kennzahlen.kaufpreisAnteil, land)],
          ["Erworben / beteiligt seit", datum(pos.kaufdatum)],
          ["Inbetriebnahme", pos.inbetriebnahme ? String(pos.inbetriebnahme).slice(0, 7) : "–"],
        ],
      },
    },
  ];
  if (b.ertrag) {
    abschnitte.push({
      titel: "Ertrag Soll/Ist",
      tabelle: {
        kopf: ["Monat", "Soll (P50)", "Ist", "Abweichung", "Erlös"],
        zeilen: [
          ...b.ertrag.monate.map((z) => [monatText(z.monat), kwh(z.soll), kwh(z.ist), z.abw === null ? "–" : pct(z.abw), betrag(z.erloes, land)]),
          ["Summe (Monate mit Ist-Wert)", kwh(b.ertrag.summe12?.soll), kwh(b.ertrag.summe12?.ist), b.ertrag.summe12 ? pct(b.ertrag.summe12.abw) : "–", betrag(b.ertrag.summe12?.erloes, land)],
        ],
      },
    });
    abschnitte.push({ text: `Ampel Ertrag: ${AMPEL[b.ertrag.ampel]} (grün ab −5 %, gelb bis −10 % gegenüber P50). Soll = P50 × typische Monatsverteilung × Degradation.` });
  }
  if (b.covenant?.aktiv) {
    abschnitte.push({
      titel: "Finanzierung und Covenants",
      tabelle: {
        kopf: ["Kennzahl", "Wert"],
        zeilen: [
          ["DSCR (12 Monate bis Periodenende)", b.covenant.dscr === null ? "–" : b.covenant.dscr.toLocaleString("de-DE", { minimumFractionDigits: 2 })],
          ["Lock-up / Default", `${b.covenant.grenzen.lockup.toLocaleString("de-DE")} / ${b.covenant.grenzen.default.toLocaleString("de-DE")}`],
          ["CFADS p. a.", betrag(b.covenant.cfads, land)],
          ["Schuldendienst p. a.", betrag(b.covenant.schuldendienstJahr, land)],
          ["Ampel", AMPEL[b.covenant.ampel]],
        ],
      },
    });
    abschnitte.push({ text: b.covenant.grund + (b.covenant.hochgerechnet ? " Hochgerechnet aus weniger als 12 Monatswerten (saisonbereinigt)." : "") });
  }
  abschnitte.push({
    titel: "Ausschüttungen in der Periode",
    tabelle: b.ausschuettungen.length
      ? { kopf: ["Datum", "Art", "Periode", "Betrag"], zeilen: [...b.ausschuettungen.map((a) => [datum(a.datum), AUSSCHUETTUNG_ARTEN[a.art]?.label || a.art, a.periode, betrag(a.betrag, land)]), ["Summe", "", "", betrag(b.summeAusschuettung, land)]] }
      : undefined,
    text: b.ausschuettungen.length ? undefined : "In dieser Periode wurden keine Ausschüttungen gebucht.",
  });
  const qs = b.ausschuettungen.map((a) => quellensteuerHinweis(land, a.art)).find(Boolean);
  if (qs) abschnitte.push({ text: qs.text });
  if (pos.art === "codev" || b.abrufe.length) {
    abschnitte.push({
      titel: "Kapitalabrufe",
      tabelle: b.abrufe.length
        ? { kopf: ["Nr.", "Zweck", "Fällig", "Status", "Betrag"], zeilen: b.abrufe.map((a) => [String(a.nummer), a.zweck, datum(a.faelligAm), ABRUF_STATUS[a.status]?.label || a.status, betrag(a.betrag, land)]) }
        : undefined,
      text: b.abrufe.length ? undefined : "In dieser Periode gab es keine Kapitalabrufe.",
    });
  }
  const k = b.kennzahlen;
  abschnitte.push({
    titel: "Kapitalfluss seit Beginn (bis Periodenende)",
    tabelle: {
      kopf: ["Kennzahl", "Wert"],
      zeilen: [
        ["Eingesetztes Kapital (Kaufpreisanteil + bezahlte Abrufe)", betrag(k.paidIn, land)],
        ["Ausschüttungen gesamt", betrag(k.ausgeschuettet, land)],
        ["Kapitalrückfluss (DPI)", k.dpi === null ? "–" : k.dpi.toLocaleString("de-DE", { minimumFractionDigits: 2 })],
        ["Ausschüttungsrendite 12 Monate", pct(k.cashRendite12)],
        ...(k.zusage.zusage ? [["Zusage / abgerufen / offen", `${betrag(k.zusage.zusage, land)} / ${betrag(k.zusage.abgerufen, land)} / ${betrag(k.zusage.offen, land)}`]] : []),
      ],
    },
  });
  if (b.art === "jahr") {
    const st = steuerHinweise(land);
    abschnitte.push({ titel: "Steuerunterlagen – Hinweise", liste: st.punkte });
    abschnitte.push({ titel: "Diese Unterlagen benötigen Sie in der Regel", liste: st.unterlagen });
    abschnitte.push({ text: STEUER_HINWEIS_TEXT });
  }
  abschnitte.push({ text: BERICHT_HINWEIS });
  return [{ titel: `${titel} – ${pos.titel}`, untertitel: [empfaenger && `Erstellt für ${empfaenger}`, erzeugtAm && `am ${datum(erzeugtAm)}`, `Zeitraum ${monatText(b.monate[0])} bis ${monatText(b.bis)}`].filter(Boolean).join(" · "), abschnitte }];
}
