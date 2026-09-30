// src/lib/plattform/finanzierung/kern.js
//
// Rechenkern „Finanzierungscockpit“ (Investor) und Financial Model der Bankfinanzierung (Backoffice) – reine Funktionen,
// client- und serverseitig nutzbar, keine Node-Importe. Alle Standardwerte aus src/lib/invest/markt.js.
//
// Methodik (offen gelegt, Jahreswerte, Jahr 0 = Investition):
//  - Betrieb wie rechner/solarpark.js: Erzeugung = kWp × spezifischer Ertrag (P50 bzw. P90) × Degradation; Erlös in der
//    Vertragsphase (EEG als Untergrenze zum Marktwert, PPA/Contracting fest bzw. indexiert), danach Marktwert mit Steigerung;
//    Kosten = Opex (Inflation) + Pacht (Indexierung) + Rückbau-Rücklage. CFADS = Cashflow vor Schuldendienst und Steuern.
//  - Finanzierungsvarianten: 100 % EK · Annuitätenkredit · Projektfinanzierung mit DSCR-skulptiertem Tilgungsprofil ·
//    Förderkredit (land-abhängig) · Leasing · Mietkauf · Mischform (Förderkredit + Bankkredit + EK).
//    Kredite werden wie in der Bankpraxis auf eine Mindest-DSCR (Basis P90 oder P50) begrenzt; DSRA wird aus
//    Eigenkapital befüllt und im letzten Kreditjahr freigegeben; Gebühren fallen in Jahr 0 an.
//  - Steuern als NÄHERUNG: linear/degressiv abgeschrieben, Zinsen bzw. Leasingraten abzugsfähig, unbegrenzter
//    Verlustvortrag, AT-Investitionsfreibetrag optional. Keine Gewerbesteuer-Hinzurechnungen, keine Mindestbesteuerung.
// Ergebnisse sind Orientierung – keine Anlage-, Finanzierungs- oder Steuerberatung.

import { ERLOESE, FINANZIERUNG, FREIFLAECHE, PACHT, npv, irr, annuitaet } from "../../invest/markt.js";

const P = FINANZIERUNG.projekt;
export const LAENDER_FZ = ["DE", "AT", "CH"];
const AFA_JAHRE_PV = 20; // AfA-Tabelle DE „Photovoltaikanlagen“ 20 Jahre; AT/CH übliche Nutzungsdauer (siehe finanzen/konstanten.js AFA)

export const VARIANTEN = {
  ek: { label: "100 % Eigenkapital", kurz: "Eigenkapital", text: "Keine Fremdfinanzierung – höchster Kapitaleinsatz, keine Covenants." },
  annuitaet: { label: "Annuitätenkredit", kurz: "Annuität", text: "Gleichbleibende Rate aus Zins und Tilgung, Bemessung auf die Mindest-DSCR." },
  skulptiert: { label: "Projektfinanzierung (DSCR-skulptiert)", kurz: "Projektfinanzierung", text: "Schuldendienst folgt dem Cashflow (CFADS ÷ Ziel-DSCR) – Non-/Limited-Recourse, DSRA." },
  foerder: { label: "Förderkredit", kurz: "Förderkredit", text: "Förderkredit über die Hausbank (DE: KfW 270) mit tilgungsfreien Anlaufjahren." },
  leasing: { label: "Leasing", kurz: "Leasing", text: "Leasinggeber ist Eigentümer, Raten aus dem Cashflow, Kaufoption zum Restwert am Ende." },
  mietkauf: { label: "Mietkauf", kurz: "Mietkauf", text: "Raten mit Eigentumsübergang – Abschreibung beim Mietkäufer, Anzahlung als Eigenkapital." },
  misch: { label: "Mischform (Förderkredit + Bank + EK)", kurz: "Mischform", text: "Förderkredit-Tranche, Bankdarlehen bis zur Gesamt-FK-Quote, Rest Eigenkapital." },
};
export const VARIANTEN_IDS = Object.keys(VARIANTEN);

export const ERLOES_MODELLE = {
  eeg: "EEG-Zuschlag / Marktprämie",
  ppa: "PPA (fester Preis)",
  merchant: "Merchant (Marktwert)",
  contracting: "Contracting / Direktlieferung",
};
export const TILGUNG_PROFILE = { annuitaet: "Annuität", linear: "Linear (gleiche Tilgungsraten)", skulptiert: "Skulptiert nach DSCR", endfaellig: "Endfällig" };

/**
 * Felder des Cockpits (Bereinigung Server + Formular). gruppe: projekt | finanzierung | steuer. prozent: Anzeige in %, Wert als Anteil.
 */
export const COCKPIT_FELDER = [
  { id: "mwp", label: "Leistung", einheit: "MWp", min: 0.01, max: 2000, schritt: 0.01, gruppe: "projekt" },
  { id: "capex", label: "Gesamtinvestition (Capex inkl. Netz, Entwicklung/Kaufpreis)", einheit: "€", min: 1000, max: 5e9, schritt: 1000, gruppe: "projekt" },
  { id: "p50", label: "Spezifischer Ertrag P50", einheit: "kWh/kWp", min: 300, max: 2500, schritt: 1, gruppe: "projekt" },
  { id: "p90", label: "Spezifischer Ertrag P90", einheit: "kWh/kWp", min: 250, max: 2500, schritt: 1, gruppe: "projekt" },
  { id: "modell", label: "Erlösmodell", typ: "auswahl", optionen: Object.entries(ERLOES_MODELLE), gruppe: "projekt" },
  { id: "preisCt", label: "Vertragspreis (Zuschlag/PPA/Lieferpreis)", einheit: "ct/kWh", min: 0, max: 60, schritt: 0.01, gruppe: "projekt" },
  { id: "vertragJahre", label: "Vertragslaufzeit", einheit: "Jahre", min: 0, max: 40, schritt: 1, gruppe: "projekt" },
  { id: "lieferAnteil", label: "Anteil Direktlieferung (Contracting)", einheit: "%", min: 0, max: 1, schritt: 0.01, prozent: true, gruppe: "projekt" },
  { id: "indexierung", label: "Preisindexierung p. a. (PPA/Contracting)", einheit: "%", min: 0, max: 0.05, schritt: 0.001, prozent: true, gruppe: "projekt" },
  { id: "merchantCt", label: "Marktwert Solar nach Vertragsende", einheit: "ct/kWh", min: 0, max: 30, schritt: 0.1, gruppe: "projekt" },
  { id: "opexKwp", label: "Betriebskosten ohne Pacht", einheit: "€/kWp·a", min: 0, max: 80, schritt: 0.5, gruppe: "projekt" },
  { id: "pachtJahr", label: "Pacht bzw. Dachmiete", einheit: "€/a", min: 0, max: 2e7, schritt: 100, gruppe: "projekt" },
  { id: "laufzeit", label: "Betrachtungsdauer", einheit: "Jahre", min: 5, max: 40, schritt: 1, gruppe: "projekt" },
  { id: "diskontEk", label: "Eigenkapitalrendite-Erwartung (Diskont)", einheit: "%", min: 0.01, max: 0.2, schritt: 0.0025, prozent: true, gruppe: "projekt" },
  { id: "zins", label: "Bankzins all-in (Referenz + Marge)", einheit: "%", min: 0, max: 0.15, schritt: 0.0005, prozent: true, gruppe: "finanzierung" },
  { id: "laufzeitKredit", label: "Kreditlaufzeit (Tenor)", einheit: "Jahre", min: 3, max: 30, schritt: 1, gruppe: "finanzierung" },
  { id: "fkQuote", label: "Gewünschte Fremdkapitalquote", einheit: "%", min: 0, max: 1, schritt: 0.01, prozent: true, gruppe: "finanzierung" },
  { id: "dscrZiel", label: "Mindest-DSCR (Sizing)", einheit: "x", min: 1, max: 2, schritt: 0.01, gruppe: "finanzierung" },
  { id: "dscrBasis", label: "Bemessung auf", typ: "auswahl", optionen: [["p90", "P90 (Bankpraxis)"], ["p50", "P50"]], gruppe: "finanzierung" },
  { id: "tilgungsfrei", label: "Tilgungsfreie Anlaufjahre (Bankkredit)", einheit: "Jahre", min: 0, max: 5, schritt: 1, gruppe: "finanzierung" },
  { id: "dsraMonate", label: "Schuldendienstreserve (DSRA)", einheit: "Monate", min: 0, max: 12, schritt: 1, gruppe: "finanzierung" },
  { id: "gebuehrPct", label: "Bearbeitungsgebühr einmalig", einheit: "%", min: 0, max: 0.05, schritt: 0.0005, prozent: true, gruppe: "finanzierung" },
  { id: "foerderZins", label: "Förderkredit Zins", einheit: "%", min: 0, max: 0.15, schritt: 0.0005, prozent: true, gruppe: "finanzierung" },
  { id: "foerderLaufzeit", label: "Förderkredit Laufzeit", einheit: "Jahre", min: 3, max: 30, schritt: 1, gruppe: "finanzierung" },
  { id: "foerderAnlauf", label: "Förderkredit tilgungsfreie Jahre", einheit: "Jahre", min: 0, max: 5, schritt: 1, gruppe: "finanzierung" },
  { id: "foerderAnteil", label: "Förderkredit-Anteil (Mischform)", einheit: "%", min: 0, max: 1, schritt: 0.01, prozent: true, gruppe: "finanzierung" },
  { id: "leasingZins", label: "Leasing Zins", einheit: "%", min: 0, max: 0.15, schritt: 0.0005, prozent: true, gruppe: "finanzierung" },
  { id: "leasingLaufzeit", label: "Leasing Laufzeit", einheit: "Jahre", min: 3, max: 25, schritt: 1, gruppe: "finanzierung" },
  { id: "leasingRestwert", label: "Leasing Restwert (Kaufoption)", einheit: "%", min: 0, max: 0.5, schritt: 0.01, prozent: true, gruppe: "finanzierung" },
  { id: "leasingSonderzahlung", label: "Leasing Sonderzahlung", einheit: "%", min: 0, max: 0.5, schritt: 0.01, prozent: true, gruppe: "finanzierung" },
  { id: "mietkaufZins", label: "Mietkauf Zins", einheit: "%", min: 0, max: 0.15, schritt: 0.0005, prozent: true, gruppe: "finanzierung" },
  { id: "mietkaufLaufzeit", label: "Mietkauf Laufzeit", einheit: "Jahre", min: 3, max: 25, schritt: 1, gruppe: "finanzierung" },
  { id: "mietkaufAnzahlung", label: "Mietkauf Anzahlung", einheit: "%", min: 0, max: 0.5, schritt: 0.01, prozent: true, gruppe: "finanzierung" },
  { id: "mitSteuern", label: "Steuereffekt (Näherung) einrechnen", typ: "schalter", gruppe: "steuer" },
  { id: "steuersatz", label: "Ertragsteuersatz", einheit: "%", min: 0, max: 0.5, schritt: 0.005, prozent: true, gruppe: "steuer" },
  { id: "afaJahre", label: "AfA-Dauer", einheit: "Jahre", min: 5, max: 40, schritt: 1, gruppe: "steuer" },
  { id: "afaDegressiv", label: "Degressive AfA (sofern zulässig)", typ: "schalter", gruppe: "steuer" },
  { id: "ifb", label: "Investitionsfreibetrag AT (§ 11 EStG)", typ: "schalter", gruppe: "steuer" },
];
export const COCKPIT_IDS = COCKPIT_FELDER.map((f) => f.id);
export const TYPEN_FZ = { freiflaeche: "Freifläche", agri: "Agri-PV", dach: "Dach", carport: "Carport", speicher: "Speicher (mit PV)" };

const r2 = (x) => Math.round(x * 100) / 100;
const zahl = (x, standard = 0) => (Number.isFinite(Number(x)) ? Number(x) : standard);

/** Standardwerte je Land/Typ (Beispielprojekt 10 MWp Freifläche) – alles aus markt.js */
export function cockpitStandard({ land = "DE", typ = "freiflaeche", mwp = 10 } = {}) {
  const l = LAENDER_FZ.includes(land) ? land : "DE";
  const fk = FINANZIERUNG.foerderkredit[l];
  const kwp = mwp * 1000;
  const capexKwp = FREIFLAECHE.capexProKwp.mittel;
  const capex = Math.round(kwp * capexKwp + mwp * FREIFLAECHE.netzanschlussFixProMwp + 1000 * FREIFLAECHE.kabelProMeter + kwp * FREIFLAECHE.entwicklungProKwp.min);
  const p50 = l === "AT" ? 1120 : l === "CH" ? 1050 : 1100;
  return {
    land: l, typ: TYPEN_FZ[typ] ? typ : "freiflaeche", mwp, capex, p50, p90: Math.round(p50 * 0.92),
    modell: "eeg", preisCt: ERLOESE.eegFreiflaecheCt, vertragJahre: 20, lieferAnteil: 1, indexierung: 0, merchantCt: ERLOESE.merchantCt,
    opexKwp: FREIFLAECHE.opexProKwp, pachtJahr: Math.round(mwp * 1.1 * PACHT.freiflaecheProHa.mittel), laufzeit: FREIFLAECHE.laufzeit, diskontEk: FINANZIERUNG.diskont,
    zins: r2((P.referenzzinsPct + P.margePct) * 100) / 10000, laufzeitKredit: P.laufzeitJahre, fkQuote: FINANZIERUNG.fremdkapitalQuote, dscrZiel: P.dscrP90, dscrBasis: "p90",
    tilgungsfrei: 0, dsraMonate: P.dsraMonate, gebuehrPct: P.bearbeitungPct / 100,
    foerderZins: fk.zins, foerderLaufzeit: fk.laufzeit, foerderAnlauf: fk.anlaufJahre, foerderAnteil: 0.5,
    leasingZins: r2((FINANZIERUNG.zins + FINANZIERUNG.leasing.zinsAufschlag) * 10000) / 10000, leasingLaufzeit: FINANZIERUNG.leasing.laufzeit,
    leasingRestwert: FINANZIERUNG.leasing.restwert, leasingSonderzahlung: FINANZIERUNG.leasing.sonderzahlung,
    mietkaufZins: r2((FINANZIERUNG.zins + FINANZIERUNG.mietkauf.zinsAufschlag) * 10000) / 10000, mietkaufLaufzeit: FINANZIERUNG.mietkauf.laufzeit, mietkaufAnzahlung: FINANZIERUNG.mietkauf.anzahlung,
    mitSteuern: true, steuersatz: FINANZIERUNG.steuerLand[l], afaJahre: AFA_JAHRE_PV, afaDegressiv: false, ifb: l === "AT",
  };
}

/** Eingaben begrenzen (Server: gespeicherte Szenarien; Client: Formular). Unbekanntes fällt weg. */
export function cockpitBereinigen(e = {}, basis = null) {
  const out = { ...(basis || cockpitStandard({ land: e.land, typ: e.typ, mwp: zahl(e.mwp, 10) || 10 })) };
  if (LAENDER_FZ.includes(e.land)) out.land = e.land;
  if (TYPEN_FZ[e.typ]) out.typ = e.typ;
  for (const f of COCKPIT_FELDER) {
    const v = e[f.id];
    if (v === undefined || v === null || v === "") continue;
    if (f.typ === "auswahl") {
      if (f.optionen.some(([id]) => id === v)) out[f.id] = v;
    } else if (f.typ === "schalter") {
      out[f.id] = v === true || v === "true" || v === 1 || v === "1";
    } else {
      const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
      if (Number.isFinite(n)) out[f.id] = Math.min(f.max, Math.max(f.min, n));
    }
  }
  if (out.p90 > out.p50) out.p90 = out.p50;
  out.laufzeitKredit = Math.min(out.laufzeitKredit, out.laufzeit);
  out.foerderLaufzeit = Math.min(out.foerderLaufzeit, out.laufzeit);
  out.leasingLaufzeit = Math.min(out.leasingLaufzeit, out.laufzeit);
  out.mietkaufLaufzeit = Math.min(out.mietkaufLaufzeit, out.laufzeit);
  out.tilgungsfrei = Math.min(out.tilgungsfrei, Math.max(0, out.laufzeitKredit - 1));
  out.foerderAnlauf = Math.min(out.foerderAnlauf, Math.max(0, out.foerderLaufzeit - 1));
  return out;
}

// ================================================================ Betrieb

/** Operative Jahreswerte P50 und P90 (Index 0 = Jahr 1) */
export function betriebsJahre(e) {
  const kwp = e.mwp * 1000;
  const jahre = [];
  const vertrag = e.modell === "merchant" ? 0 : Math.min(e.vertragJahre, e.laufzeit);
  for (let t = 1; t <= e.laufzeit; t++) {
    const deg = Math.pow(1 - FREIFLAECHE.degradation, t - 1);
    const marktCt = e.merchantCt * Math.pow(1 + ERLOESE.merchantSteigerung, t - 1);
    const imVertrag = t <= vertrag;
    let preisCt;
    if (!imVertrag) preisCt = marktCt;
    else if (e.modell === "eeg") preisCt = Math.max(e.preisCt, marktCt);
    else if (e.modell === "contracting") {
      const liefer = e.preisCt * Math.pow(1 + (e.indexierung || 0), t - 1);
      preisCt = (e.lieferAnteil ?? 1) * liefer + (1 - (e.lieferAnteil ?? 1)) * marktCt;
    } else preisCt = e.preisCt * Math.pow(1 + (e.indexierung || 0), t - 1);
    const e50 = kwp * e.p50 * deg;
    const e90 = kwp * e.p90 * deg;
    const opex = kwp * e.opexKwp * Math.pow(1 + FREIFLAECHE.inflation, t - 1);
    const pacht = e.pachtJahr * Math.pow(1 + PACHT.indexierung, t - 1);
    const rueckbau = (kwp * FREIFLAECHE.rueckbauProKwp) / e.laufzeit;
    const kosten = opex + pacht + rueckbau;
    const erloes50 = (e50 * preisCt) / 100;
    const erloes90 = (e90 * preisCt) / 100;
    jahre.push({ jahr: t, preisCt, imVertrag, erzeugung50: e50, erzeugung90: e90, erloes50, erloes90, opex, pacht, rueckbau, kosten, cfads50: erloes50 - kosten, cfads90: erloes90 - kosten });
  }
  return jahre;
}

// ================================================================ Tilgungspläne

/**
 * Tilgungsplan über T Jahre (Arrays Länge T, Index 0 = Jahr 1).
 * profil: annuitaet | linear | endfaellig | skulptiert (dienst = Schuldendienst je Jahr vorgegeben)
 */
export function tilgungsplan({ betrag, zins, jahre, profil = "annuitaet", anlauf = 0, dienst = null, T = jahre }) {
  const zinsen = new Array(T).fill(0);
  const tilgung = new Array(T).fill(0);
  const rest = new Array(T).fill(0);
  let r = Math.max(0, betrag);
  const n = Math.max(1, Math.min(jahre, T));
  const a = Math.min(anlauf, n - 1);
  const rate = profil === "annuitaet" ? annuitaet(r, zins, n - a) : 0;
  for (let t = 1; t <= T; t++) {
    const i = t - 1;
    if (r <= 0.005 || t > n) {
      rest[i] = Math.max(r, 0);
      continue;
    }
    zinsen[i] = r * zins;
    let tg = 0;
    if (t <= a) tg = 0;
    else if (profil === "annuitaet") tg = rate - zinsen[i];
    else if (profil === "linear") tg = betrag / (n - a);
    else if (profil === "endfaellig") tg = t === n ? r : 0;
    else if (profil === "skulptiert") tg = (dienst?.[i] || 0) - zinsen[i];
    if (t === n) tg = r; // Restschuld im letzten Jahr vollständig
    tg = Math.min(tg, r);
    tilgung[i] = tg;
    r -= tg;
    rest[i] = Math.max(r, 0);
  }
  return { zinsen, tilgung, rest, dienst: zinsen.map((z, i) => z + tilgung[i]) };
}

/**
 * DSCR-Skulptierung: Schuldendienst_t = CFADS_t ÷ Ziel-DSCR über den Tenor; Darlehen = Barwert dieses Schuldendienstes zum
 * Kreditzins (so ist die Restschuld am Laufzeitende genau null). Obergrenze fkMax × Investition (dann proportional gekürzt).
 */
export function skulptieren({ cfads, zins, jahre, dscrZiel, maxBetrag = Infinity }) {
  const n = Math.min(jahre, cfads.length);
  const ds = cfads.slice(0, n).map((c) => Math.max(0, c) / dscrZiel);
  const bw = ds.reduce((s, d, i) => s + d / Math.pow(1 + zins, i + 1), 0);
  const faktor = bw > maxBetrag ? maxBetrag / bw : 1;
  return { betrag: bw * faktor, dienst: ds.map((d) => d * faktor), begrenzt: faktor < 1, faktor };
}

// ================================================================ Steuern (Näherung)

/** AfA-Reihe (Länge T): linear bzw. degressiv mit Wechsel zur linearen AfA, ab Jahr `start` (1-basiert) */
export function afaReihe(basis, jahre, T, { degressivSatz = 0, start = 1 } = {}) {
  const out = new Array(T).fill(0);
  let rest = basis;
  for (let t = start; t <= T && rest > 0.5; t++) {
    const verbleibend = Math.max(1, jahre - (t - start));
    const linear = rest / verbleibend;
    const deg = degressivSatz > 0 ? rest * Math.min(degressivSatz, 3 / jahre) : 0;
    const a = Math.min(rest, Math.max(linear, deg));
    out[t - 1] = a;
    rest -= a;
  }
  return out;
}

function steuernRechnen({ e, jahre, zinsen, abzug, afa, ifbJahr1 = 0 }) {
  const T = jahre.length;
  const steuer = new Array(T).fill(0);
  if (!e.mitSteuern || !e.steuersatz) return steuer;
  let vortrag = ifbJahr1; // IFB wirkt als zusätzlicher Abzug im Anschaffungsjahr
  for (let i = 0; i < T; i++) {
    let gewinn = jahre[i].cfads50 - (zinsen?.[i] || 0) - (abzug?.[i] || 0) - (afa?.[i] || 0);
    if (i === 0) gewinn -= vortrag, (vortrag = 0);
    if (gewinn < 0) {
      vortrag += -gewinn;
      continue;
    }
    const verrechnet = Math.min(vortrag, gewinn);
    vortrag -= verrechnet;
    steuer[i] = (gewinn - verrechnet) * e.steuersatz;
  }
  return steuer;
}

// ================================================================ Varianten

const summe = (a) => a.reduce((s, x) => s + x, 0);
const nullen = (T) => new Array(T).fill(0);

/** Kredit auf Mindest-DSCR begrenzen (Schuldendienst ist linear im Betrag) */
function dscrFaktor(cf, dienst, ziel) {
  let min = Infinity;
  dienst.forEach((d, i) => {
    if (d > 0.5) min = Math.min(min, cf[i] / d);
  });
  if (!Number.isFinite(min)) return 1;
  return min >= ziel ? 1 : Math.max(0, min / ziel);
}

/** Aufbau einer Variante: { fk, tranchen:[{betrag,zins,plan}], dienst, zinsen, einmal0, leasing? } */
function varianteAufbauen(art, e, jahre) {
  const T = jahre.length;
  const C = e.capex;
  const cfBasis = jahre.map((j) => (e.dscrBasis === "p50" ? j.cfads50 : j.cfads90));
  const tranche = (betrag, zins, laufzeit, profil, anlauf = 0, dienst = null) => ({ betrag, zins, laufzeit, profil, anlauf, plan: tilgungsplan({ betrag, zins, jahre: laufzeit, profil, anlauf, dienst, T }) });
  const skaliert = (tranchen) => {
    const dienst = nullen(T);
    for (const tr of tranchen) tr.plan.dienst.forEach((d, i) => (dienst[i] += d));
    const f = dscrFaktor(cfBasis, dienst, e.dscrZiel);
    if (f >= 1) return { tranchen, begrenzt: false };
    return { tranchen: tranchen.map((tr) => tranche(tr.betrag * f, tr.zins, tr.laufzeit, tr.profil, tr.anlauf, tr.plan && tr.profil === "skulptiert" ? tr.plan.dienst.map((d) => d * f) : null)), begrenzt: true };
  };
  if (art === "ek") return { tranchen: [], begrenzt: false, ekAnteil: C };
  if (art === "annuitaet") return { ...skaliert([tranche(C * e.fkQuote, e.zins, e.laufzeitKredit, "annuitaet", e.tilgungsfrei)]), dsra: true, gebuehr: true };
  if (art === "skulptiert") {
    const s = skulptieren({ cfads: cfBasis, zins: e.zins, jahre: e.laufzeitKredit, dscrZiel: e.dscrZiel, maxBetrag: C * Math.max(e.fkQuote, 0) });
    return { tranchen: [tranche(s.betrag, e.zins, e.laufzeitKredit, "skulptiert", 0, s.dienst)], begrenzt: s.begrenzt, dsra: true, gebuehr: true, skulptur: s };
  }
  if (art === "foerder") {
    const fkL = FINANZIERUNG.foerderkredit[e.land] || FINANZIERUNG.foerderkredit.DE;
    const betrag = C * Math.min(e.fkQuote, fkL.anteilMax);
    return { ...skaliert([tranche(betrag, e.foerderZins, e.foerderLaufzeit, fkL.tilgung, e.foerderAnlauf)]), dsra: false, gebuehr: false };
  }
  if (art === "misch") {
    const fkL = FINANZIERUNG.foerderkredit[e.land] || FINANZIERUNG.foerderkredit.DE;
    const a = C * Math.min(e.foerderAnteil, fkL.anteilMax, e.fkQuote);
    const b = Math.max(0, C * e.fkQuote - a);
    const s = skaliert([tranche(a, e.foerderZins, e.foerderLaufzeit, fkL.tilgung, e.foerderAnlauf), tranche(b, e.zins, e.laufzeitKredit, "annuitaet", e.tilgungsfrei)]);
    return { ...s, dsra: true, gebuehr: true, gebuehrBasis: s.tranchen[1]?.betrag ?? b }; // Gebühr auf die (ggf. per DSCR gekürzte) Bank-Tranche
  }
  if (art === "mietkauf") return { tranchen: [tranche(C * (1 - e.mietkaufAnzahlung), e.mietkaufZins, e.mietkaufLaufzeit, "annuitaet")], begrenzt: false };
  if (art === "leasing") {
    const L = e.leasingLaufzeit;
    const rw = C * e.leasingRestwert;
    const bar = C * (1 - e.leasingSonderzahlung) - rw / Math.pow(1 + e.leasingZins, L);
    const rate = annuitaet(Math.max(0, bar), e.leasingZins, L);
    return { tranchen: [], begrenzt: false, leasing: { rate, L, rw, sonder: C * e.leasingSonderzahlung, barwert: bar } };
  }
  throw new Error(`Unbekannte Variante ${art}`);
}

function amortisation(cf) {
  let kum = cf[0];
  if (kum >= 0) return 0;
  for (let t = 1; t < cf.length; t++) {
    const vorher = kum;
    kum += cf[t];
    if (kum >= 0 && cf[t] > 0) return r2(t - 1 + -vorher / cf[t]);
  }
  return null;
}

/**
 * Eine Finanzierungsvariante vollständig rechnen.
 * @returns Kennzahlen + Reihen (Index 0 = Jahr 0 bei cfEk und liquiditaet, sonst Jahr 1)
 */
export function varianteRechnen(art, e, jahre = betriebsJahre(e)) {
  const T = jahre.length;
  const C = e.capex;
  const v = varianteAufbauen(art, e, jahre);
  const dienst = nullen(T);
  const zinsen = nullen(T);
  const tilgung = nullen(T);
  const rest = nullen(T);
  for (const tr of v.tranchen) {
    for (let i = 0; i < T; i++) {
      dienst[i] += tr.plan.dienst[i];
      zinsen[i] += tr.plan.zinsen[i];
      tilgung[i] += tr.plan.tilgung[i];
      rest[i] += tr.plan.rest[i];
    }
  }
  const fk = summe(v.tranchen.map((t) => t.betrag));
  const gebuehren = v.gebuehr ? (v.gebuehrBasis ?? fk) * e.gebuehrPct : 0;
  const erstDienst = dienst.find((d) => d > 0.5) || 0;
  const dsra = v.dsra && fk > 0 ? (erstDienst * e.dsraMonate) / 12 : 0;
  const kreditEnde = v.tranchen.length ? Math.max(...v.tranchen.map((t) => Math.min(t.laufzeit, T))) : 0;

  // Leasing: Raten statt Schuldendienst, Kaufoption am Ende (Restwert als Einmalzahlung)
  const einmal = nullen(T);
  const leasingRate = nullen(T);
  let ek0;
  if (v.leasing) {
    for (let t = 1; t <= v.leasing.L; t++) leasingRate[t - 1] = v.leasing.rate;
    einmal[v.leasing.L - 1] += v.leasing.rw;
    ek0 = v.leasing.sonder;
  } else {
    ek0 = C - fk + gebuehren + dsra;
  }
  if (dsra > 0 && kreditEnde > 0) einmal[kreditEnde - 1] -= dsra; // Freigabe der DSRA im letzten Kreditjahr
  const schuldendienst = dienst.map((d, i) => d + leasingRate[i]);

  // Steuern (Näherung): Eigentümer schreibt ab; beim Leasing sind die Raten abzugsfähig, AfA erst nach Ausübung der Kaufoption
  const degr = e.afaDegressiv ? FINANZIERUNG.afaDegressiv[e.land] || 0 : 0;
  const afa = v.leasing
    ? afaReihe(v.leasing.rw, Math.max(1, e.afaJahre - v.leasing.L), T, { start: v.leasing.L + 1 })
    : afaReihe(C, e.afaJahre, T, { degressivSatz: degr });
  const ifbJahr1 = !v.leasing && e.ifb && e.land === "AT" ? Math.min(C, FINANZIERUNG.ifbAt.maxBemessung) * FINANZIERUNG.ifbAt.satz : 0;
  const abzug = leasingRate.map((r, i) => r + (i === 0 ? gebuehren : 0));
  const steuer = steuernRechnen({ e, jahre, zinsen, abzug, afa, ifbJahr1 });

  const cfEk50 = [-ek0, ...jahre.map((j, i) => j.cfads50 - schuldendienst[i] - einmal[i])];
  const cfEk90 = [-ek0, ...jahre.map((j, i) => j.cfads90 - schuldendienst[i] - einmal[i])];
  const cfEkSt = cfEk50.map((c, t) => (t === 0 ? c : c - steuer[t - 1]));
  const liquiditaet = [];
  cfEkSt.reduce((s, c) => (liquiditaet.push(s + c), s + c), 0);

  const dscr = (cfKey) => {
    const w = [];
    jahre.forEach((j, i) => {
      if (schuldendienst[i] > 0.5) w.push(j[cfKey] / schuldendienst[i]);
    });
    return w.length ? { min: Math.min(...w), mittel: summe(w) / w.length, reihe: w } : { min: null, mittel: null, reihe: [] };
  };
  const d50 = dscr("cfads50");
  const d90 = dscr("cfads90");
  // LLCR zu Beginn: Barwert CFADS (Bemessungsbasis) über die Kreditlaufzeit zum gewichteten Kreditzins ÷ Darlehen
  let llcr = null;
  if (fk > 0) {
    const zinsMittel = summe(v.tranchen.map((t) => t.betrag * t.zins)) / fk;
    const cf = jahre.slice(0, kreditEnde).map((j) => (e.dscrBasis === "p50" ? j.cfads50 : j.cfads90));
    llcr = (npv(zinsMittel, [0, ...cf]) + dsra) / fk;
  }
  const gesamtkosten = v.leasing
    ? summe(leasingRate) + v.leasing.sonder + v.leasing.rw - C
    : summe(zinsen) + gebuehren;
  const ekEingesetzt = Math.max(ek0, 1);
  const ekIrr = ek0 > 0 ? irr(cfEk50) : null;
  return {
    art,
    label: VARIANTEN[art].label,
    kurz: VARIANTEN[art].kurz,
    kapitalbedarfEk: ek0,
    fremdkapital: fk,
    fkQuote: C > 0 ? fk / C : 0,
    fkBegrenzt: !!v.begrenzt,
    gebuehren,
    dsra,
    tranchen: v.tranchen.map((t) => ({ betrag: t.betrag, zins: t.zins, laufzeit: t.laufzeit, profil: t.profil, anlauf: t.anlauf })),
    leasing: v.leasing ? { rate: v.leasing.rate, laufzeit: v.leasing.L, restwert: v.leasing.rw, sonderzahlung: v.leasing.sonder } : null,
    rateJahr1: schuldendienst[0] || 0,
    schuldendienstMittel: kreditEnde || v.leasing ? summe(schuldendienst) / (v.leasing ? v.leasing.L : kreditEnde) : 0,
    dscrMin: d50.min, dscrMittel: d50.mittel, dscrMinP90: d90.min, dscrMittelP90: d90.mittel,
    llcr,
    ekIrr,
    ekIrrP90: ek0 > 0 ? irr(cfEk90) : null,
    ekIrrNachSteuer: e.mitSteuern && ek0 > 0 ? irr(cfEkSt) : null,
    npvEk: npv(e.diskontEk, e.mitSteuern ? cfEkSt : cfEk50),
    amortisationEk: amortisation(e.mitSteuern ? cfEkSt : cfEk50),
    roiEk: (summe((e.mitSteuern ? cfEkSt : cfEk50).slice(1)) - ek0) / ekEingesetzt,
    gesamtkostenFinanzierung: gesamtkosten,
    steuernSumme: summe(steuer),
    ifb: ifbJahr1,
    minLiquiditaet: Math.min(...liquiditaet),
    reihen: { schuldendienst, zinsen, tilgung, restschuld: rest, steuer, afa, cfEk: cfEk50, cfEkNachSteuer: cfEkSt, liquiditaet, dscr: jahre.map((j, i) => (schuldendienst[i] > 0.5 ? j.cfads50 / schuldendienst[i] : null)) },
  };
}

/** Projektkennzahlen (unverschuldet, P50): Projekt-IRR, NPV zum WACC, Amortisation, LCOE, ROI */
export function projektKennzahlen(e, jahre = betriebsJahre(e)) {
  const cf = [-e.capex, ...jahre.map((j) => j.cfads50)];
  const cf90 = [-e.capex, ...jahre.map((j) => j.cfads90)];
  const wacc = e.fkQuote * e.zins + (1 - e.fkQuote) * e.diskontEk;
  const bwKosten = e.capex + jahre.reduce((s, j) => s + j.kosten / Math.pow(1 + wacc, j.jahr), 0);
  const bwEnergie = jahre.reduce((s, j) => s + j.erzeugung50 / Math.pow(1 + wacc, j.jahr), 0);
  return {
    projektIrr: irr(cf),
    projektIrrP90: irr(cf90),
    npv: npv(wacc, cf),
    wacc,
    amortisation: amortisation(cf),
    lcoeCt: bwEnergie > 0 ? (bwKosten / bwEnergie) * 100 : null,
    roi: (summe(cf.slice(1)) - e.capex) / e.capex,
    ertragJahr1Mwh: (jahre[0]?.erzeugung50 || 0) / 1000,
    erloesJahr1: jahre[0]?.erloes50 || 0,
    cfadsJahr1: jahre[0]?.cfads50 || 0,
    capexProKwp: e.capex / (e.mwp * 1000),
  };
}

/** Stresstest der gewählten Variante: P90, Zins +1 Pp., Capex +10 %, Preis −10 % */
export function szenarienRechnen(e, art = "skulptiert") {
  const fall = (label, aend) => {
    const x = { ...e, ...aend };
    const r = varianteRechnen(art, x);
    return { label, ekIrr: r.ekIrr, dscrMin: r.dscrMin, kapitalbedarfEk: r.kapitalbedarfEk, npvEk: r.npvEk, fkBegrenzt: r.fkBegrenzt };
  };
  return [
    fall("Basis (P50)", {}),
    fall("Ertrag P90 dauerhaft", { p50: e.p90 }),
    fall("Zins +1 Prozentpunkt", { zins: e.zins + 0.01, foerderZins: e.foerderZins + 0.01, leasingZins: e.leasingZins + 0.01, mietkaufZins: e.mietkaufZins + 0.01 }),
    fall("Investition +10 %", { capex: e.capex * 1.1 }),
    fall("Erlöspreis −10 %", { preisCt: e.preisCt * 0.9, merchantCt: e.merchantCt * 0.9 }),
  ];
}

/** Alles für das Cockpit: bereinigte Eingaben, Projektkennzahlen, alle Varianten, Stresstest, Hinweise */
export function rechneCockpit(eingaben = {}, { varianten = VARIANTEN_IDS, stressVariante = "skulptiert" } = {}) {
  const e = cockpitBereinigen(eingaben, eingaben.__basis || null);
  const jahre = betriebsJahre(e);
  const hinweise = [];
  if (jahre[0].cfads90 <= 0) hinweise.push("Der Cashflow im P90-Fall ist im ersten Jahr nicht positiv – eine Fremdfinanzierung ist so kaum darstellbar.");
  if (e.modell === "merchant") hinweise.push("Reine Merchant-Erlöse: Banken verlangen in der Regel höhere DSCR (oft ≥ 1,4) und kürzere Laufzeiten.");
  if (e.laufzeitKredit > e.vertragJahre && e.modell !== "merchant") hinweise.push("Kreditlaufzeit länger als die Vertrags-/Förderdauer – Banken planen meist einen Abstand (Tail) von einigen Jahren.");
  if (e.ifb && e.land === "AT") hinweise.push("Investitionsfreibetrag AT: befristet erhöhter Satz (22 % ökologisch) nur für Anschaffungen bis 31.12.2026, Bemessung max. 1 Mio. € je Wirtschaftsjahr – Voraussetzungen mit der Steuerberatung prüfen.");
  if (e.afaDegressiv) hinweise.push(e.land === "DE" ? "Degressive AfA (30 %, max. 3 × linear) nur für bewegliche Wirtschaftsgüter mit Anschaffung 1.7.2025–31.12.2027 – Zuordnung der Anlagenteile prüfen." : e.land === "AT" ? "Degressive AfA AT (§ 7 Abs. 1a EStG, bis 30 %) – Voraussetzungen prüfen." : "Degressive AfA ist in der Schweiz kantonal geregelt – im Cockpit nicht angesetzt.");
  const ergebnisse = varianten.filter((v) => VARIANTEN[v]).map((v) => varianteRechnen(v, e, jahre));
  return { eingaben: e, jahre, projekt: projektKennzahlen(e, jahre), varianten: ergebnisse, szenarien: szenarienRechnen(e, VARIANTEN[stressVariante] ? stressVariante : "skulptiert"), hinweise };
}

/** Kompakte Zusammenfassung zum Speichern (ohne Reihen) */
export function ergebnisKurz(r) {
  return {
    projekt: { projektIrr: r.projekt.projektIrr, npv: Math.round(r.projekt.npv), lcoeCt: r.projekt.lcoeCt, amortisation: r.projekt.amortisation, roi: r.projekt.roi },
    varianten: r.varianten.map((v) => ({ art: v.art, kapitalbedarfEk: Math.round(v.kapitalbedarfEk), fremdkapital: Math.round(v.fremdkapital), ekIrr: v.ekIrr, ekIrrNachSteuer: v.ekIrrNachSteuer, dscrMin: v.dscrMin, dscrMittel: v.dscrMittel, npvEk: Math.round(v.npvEk), gesamtkostenFinanzierung: Math.round(v.gesamtkostenFinanzierung) })),
  };
}

/**
 * Vorbelegung aus dem Bewertungswerkzeug der Börse (fach/bewertung.js → bewertungVorbelegung) – andocken statt doppelt bauen.
 * inv = investition({mwp, capexKwp, entwicklungKwp, netzKm}) aus rechner/solarpark.js, haProMwp aus BAUART.
 */
export function cockpitAusBewertung(vb, { land = "DE", typ = "freiflaeche", inv = null, haProMwp = 1.1, jahr = new Date().getUTCFullYear() } = {}) {
  const b = vb?.eingaben || {};
  const s = cockpitStandard({ land, typ, mwp: Number(b.mwp) || 10 });
  const quellen = { ...(vb?.quellen || {}) };
  if (vb?.modus === "bestand") {
    const rest = Math.max(0, (b.ibnJahr || jahr) + 20 - jahr);
    return {
      eingaben: cockpitBereinigen({ ...s, capex: b.kaufpreis, p50: b.ertragKwhKwp, p90: Math.round((b.ertragKwhKwp || s.p50) * 0.95), modell: "eeg", preisCt: b.verguetungCt, vertragJahre: rest, merchantCt: b.merchantCt, opexKwp: b.opexKwp, pachtJahr: b.pachtJahr, laufzeit: Math.max(5, (b.ibnJahr || jahr) + 30 - jahr) }),
      quellen,
      modus: "bestand",
    };
  }
  const capex = inv?.summe ?? s.capex;
  return {
    eingaben: cockpitBereinigen({ ...s, capex: Math.round(capex), p50: b.p50, p90: b.p90, modell: b.modell, preisCt: b.modell === "merchant" ? b.merchantCt : b.preisCt, vertragJahre: b.vertragJahre, merchantCt: b.merchantCt, opexKwp: b.opexKwp, pachtJahr: Math.round((b.pachtHa || 0) * (Number(b.mwp) || 0) * haProMwp), fkQuote: (b.fkQuote ?? 75) / 100, zins: (b.zins ?? 4.5) / 100, laufzeitKredit: b.tilgungJahre, diskontEk: (b.zielRenditePct ?? 6.5) / 100 }),
    quellen: { ...quellen, capex: "Bewertung (Kaufpreis + Restentwicklung + Capex + Netz)" },
    modus: "entwicklung",
  };
}
