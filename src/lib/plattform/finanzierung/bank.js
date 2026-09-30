// src/lib/plattform/finanzierung/bank.js
//
// Bankfinanzierung Eigenbetrieb – reine Logik (client- und serverseitig): Bankenpaket, Term-Sheet (Bereinigung und
// Vergleich), Auszahlungsvoraussetzungen (Conditions Precedent), Covenant-Prüfung (DSCR/LLCR, Ampel, Frühwarnung).

import { FINANZIERUNG, npv, irr } from "../../invest/markt.js";
import { betriebsJahre, tilgungsplan, skulptieren, TILGUNG_PROFILE } from "./kern.js";

const P = FINANZIERUNG.projekt;

export const FALL_STATUS = {
  vorbereitung: { label: "Vorbereitung", ton: "neutral" },
  angefragt: { label: "Banken angefragt", ton: "info" },
  termsheets: { label: "Term Sheets liegen vor", ton: "info" },
  entschieden: { label: "Bank ausgewählt", ton: "ok" },
  vertrag: { label: "Kreditvertrag unterzeichnet", ton: "ok" },
  auszahlung: { label: "Ausgezahlt / Betrieb", ton: "ok" },
  abgebrochen: { label: "Abgebrochen", ton: "neutral" },
};
export const ANFRAGE_STATUS = {
  offen: { label: "Angefragt", ton: "info" },
  in_pruefung: { label: "In Prüfung bei der Bank", ton: "info" },
  termsheet: { label: "Term Sheet erhalten", ton: "ok" },
  abgesagt: { label: "Abgesagt", ton: "neutral" },
  ausgewaehlt: { label: "Ausgewählt", ton: "ok" },
  nicht_ausgewaehlt: { label: "Nicht ausgewählt", ton: "neutral" },
  zurueckgezogen: { label: "Zurückgezogen", ton: "neutral" },
};

/** Bausteine des Bankenpakets. quelle: auto = von der Plattform erzeugt, dokument = Upload, kyb = aus dem KYC-Modul */
export const BANKENPAKET = [
  { id: "steckbrief", label: "Projektsteckbrief", quelle: "auto", pflicht: true, text: "Eckdaten, Standort (Region), Leistung, Erlösmodell, Zeitplan, Gesellschaft." },
  { id: "financial_model", label: "Financial Model (PDF + CSV)", quelle: "auto", pflicht: true, text: "Cashflows P50/P90, Schuldendienst, DSCR/LLCR je Jahr." },
  { id: "ertragsgutachten", label: "Ertragsgutachten (P50/P90)", quelle: "dokument", pflicht: true, text: "Unabhängiges Gutachten, bei großen Parks meist zwei." },
  { id: "pacht", label: "Pacht-/Nutzungsverträge und Dienstbarkeiten", quelle: "dokument", pflicht: true, text: "Laufzeit ≥ Kreditlaufzeit, Eintrittsrecht der Bank, Grundbuch/Rang." },
  { id: "netz", label: "Netzanschlusszusage / -vertrag", quelle: "dokument", pflicht: true, text: "Zusage des Netzbetreibers, Kosten, Termin." },
  { id: "epc", label: "EPC-Vertrag (Generalunternehmer)", quelle: "dokument", pflicht: true, text: "Festpreis, Termin, Gewährleistung, Performance-Garantie." },
  { id: "om", label: "O&M-Vertrag (Betriebsführung)", quelle: "dokument", pflicht: true, text: "Verfügbarkeitsgarantie, Reaktionszeiten, Laufzeit." },
  { id: "erloes", label: "Erlösvertrag (EEG-Zuschlag / EAG / PPA / Contracting)", quelle: "dokument", pflicht: true, text: "Zuschlag bzw. Vertrag mit Abnehmer, Laufzeit, Preis." },
  { id: "genehmigung", label: "Genehmigungen (B-Plan/Baugenehmigung, Widmung)", quelle: "dokument", pflicht: true, text: "Rechtskräftig, Auflagen, Fristen." },
  { id: "versicherung", label: "Versicherungskonzept", quelle: "dokument", pflicht: false, text: "Bauleistung, Betriebsunterbrechung, Haftpflicht." },
  { id: "gesellschaft", label: "Gesellschaftsunterlagen der SPV", quelle: "dokument", pflicht: true, text: "Gesellschaftsvertrag, Register-/Firmenbuchauszug, Organigramm." },
  { id: "kyb", label: "KYB der SPV (Identifizierung, wirtschaftlich Berechtigte)", quelle: "kyb", pflicht: true, text: "Status aus dem KYC-Modul – Unterlagen nur nach Freigabe durch Compliance." },
];
export const BANKENPAKET_IDS = BANKENPAKET.map((b) => b.id);

/** Auszahlungsvoraussetzungen (Conditions Precedent) – Standardliste, je Fall ergänzbar */
export const CP_STANDARD = [
  { id: "kreditvertrag", label: "Kreditvertrag und Sicherheitenverträge unterzeichnet" },
  { id: "gesellschaft", label: "Gesellschaftsdokumente, Beschlüsse und KYB der SPV" },
  { id: "genehmigung", label: "Genehmigungen rechtskräftig (Baurecht / Widmung)" },
  { id: "netz", label: "Netzanschlusszusage bzw. Netzanschlussvertrag" },
  { id: "pacht", label: "Pachtverträge unterzeichnet, Dienstbarkeiten beantragt (Rang)" },
  { id: "epc", label: "EPC- und O&M-Vertrag unterzeichnet" },
  { id: "erloes", label: "Erlösvertrag (EEG-Zuschlag, EAG, PPA bzw. Contracting)" },
  { id: "gutachten", label: "Unabhängiges Ertragsgutachten, technische und rechtliche Due Diligence" },
  { id: "versicherung", label: "Versicherungsnachweise (Bauleistung, Betriebsunterbrechung)" },
  { id: "eigenkapital", label: "Eigenkapital eingezahlt (bzw. Equity-Garantie)" },
  { id: "dsra", label: "Schuldendienstreservekonto (DSRA) befüllt bzw. Garantie" },
  { id: "direct", label: "Direktvereinbarungen (Direct Agreements) mit EPC/O&M/Abnehmer" },
  { id: "gebuehren", label: "Gebühren bezahlt" },
];

export const SICHERHEITEN = {
  uebereignung: "Sicherungsübereignung der Anlage",
  abtretung: "Abtretung Erlöse und Vertragsansprüche",
  verpfaendung: "Verpfändung der Gesellschaftsanteile",
  konten: "Verpfändung der Projektkonten inkl. DSRA",
  dienstbarkeit: "Eintrittsrechte / Dienstbarkeiten zugunsten der Bank",
  direct: "Direct Agreements (Eintrittsrechte in Verträge)",
  patronat: "Patronatserklärung / Garantie der Muttergesellschaft",
};
export const REFERENZZINSEN = { fix: "Festzins", euribor3: "EURIBOR 3M", euribor6: "EURIBOR 6M", saron: "SARON (CHF)" };

class BankFehler extends Error {
  constructor(m) {
    super(m);
    this.status = 422;
  }
}
const pflicht = (b, m) => {
  if (!b) throw new BankFehler(m);
};
const z = (v, min, max, stellen = 4) => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const f = Math.pow(10, stellen);
  return Math.round(Math.min(max, Math.max(min, n)) * f) / f;
};
const txt = (v, max = 500) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);

/** Term Sheet bereinigen und prüfen (Werte in Prozent als Prozentzahl, z. B. 1,8 = 1,8 %) */
export function termsheetBereinigen(d = {}) {
  const t = {
    betrag: z(d.betrag, 0, 5e9, 0),
    laufzeitJahre: z(d.laufzeitJahre, 1, 35, 0),
    zinsArt: REFERENZZINSEN[d.zinsArt] ? d.zinsArt : "fix",
    zinsPct: z(d.zinsPct, 0, 20),
    referenzAnnahmePct: z(d.referenzAnnahmePct, -1, 15) ?? P.referenzzinsPct,
    margePct: z(d.margePct, 0, 10),
    tilgungsprofil: TILGUNG_PROFILE[d.tilgungsprofil] ? d.tilgungsprofil : "annuitaet",
    tilgungsfreiJahre: z(d.tilgungsfreiJahre, 0, 5, 0) ?? 0,
    dscrSizing: z(d.dscrSizing, 1, 3, 3),
    dscrCovenant: z(d.dscrCovenant, 1, 3, 3) ?? P.dscrDefault,
    dscrLockup: z(d.dscrLockup, 1, 3, 3) ?? P.dscrLockup,
    llcrCovenant: z(d.llcrCovenant, 1, 3, 3),
    dsraMonate: z(d.dsraMonate, 0, 24, 0) ?? P.dsraMonate,
    bearbeitungPct: z(d.bearbeitungPct, 0, 10) ?? 0,
    bereitstellungPct: z(d.bereitstellungPct, 0, 5) ?? 0,
    sicherheiten: (Array.isArray(d.sicherheiten) ? d.sicherheiten : []).filter((s) => SICHERHEITEN[s]).slice(0, 10),
    cps: (Array.isArray(d.cps) ? d.cps : []).filter((c) => CP_STANDARD.some((x) => x.id === c)).slice(0, 20),
    gueltigBis: /^\d{4}-\d{2}-\d{2}$/.test(String(d.gueltigBis || "")) ? d.gueltigBis : "",
    bemerkung: txt(d.bemerkung, 1500),
  };
  pflicht(t.betrag > 0, "Bitte den Kreditbetrag angeben.");
  pflicht(t.laufzeitJahre, "Bitte die Laufzeit angeben.");
  if (t.zinsArt === "fix") pflicht(t.zinsPct !== null, "Bitte den Festzins angeben.");
  else pflicht(t.margePct !== null, "Bitte die Marge über dem Referenzzins angeben.");
  pflicht(t.dscrLockup >= t.dscrCovenant, "Der Lock-up-DSCR muss mindestens so hoch sein wie der Covenant-DSCR.");
  return t;
}

/** All-in-Zins (Anteil) eines Term Sheets: Festzins bzw. angenommener Referenzzins + Marge */
export const allInZins = (t) => (t.zinsArt === "fix" ? t.zinsPct : (t.referenzAnnahmePct || 0) + (t.margePct || 0)) / 100;

/**
 * Kennzahlen eines Term Sheets gegen das Financial Model (Cockpit-Eingaben e): Schuldendienst nach Tilgungsprofil,
 * DSCR P50/P90, LLCR, EK-Bedarf, EK-IRR, Finanzierungskosten, Effektivkosten p. a. (IRR der Bank-Zahlungsreihe), Covenant-Puffer.
 */
export function termsheetKennzahlen(t, e) {
  const jahre = betriebsJahre(e);
  const T = jahre.length;
  const zins = allInZins(t);
  const betrag = Math.min(t.betrag, e.capex);
  let dienstVorgabe = null;
  if (t.tilgungsprofil === "skulptiert") {
    const s = skulptieren({ cfads: jahre.map((j) => j.cfads90), zins, jahre: t.laufzeitJahre, dscrZiel: t.dscrSizing || P.dscrP90 });
    dienstVorgabe = s.dienst.map((d) => (d * betrag) / Math.max(s.betrag, 1));
  }
  const plan = tilgungsplan({ betrag, zins, jahre: t.laufzeitJahre, profil: t.tilgungsprofil, anlauf: t.tilgungsfreiJahre, dienst: dienstVorgabe, T });
  const gebuehr = (betrag * (t.bearbeitungPct || 0)) / 100;
  const erst = plan.dienst.find((d) => d > 0.5) || 0;
  const dsra = (erst * (t.dsraMonate || 0)) / 12;
  const ende = Math.min(t.laufzeitJahre, T);
  const ek0 = e.capex - betrag + gebuehr + dsra;
  const cfEk = [-ek0, ...jahre.map((j, i) => j.cfads50 - plan.dienst[i] + (i === ende - 1 ? dsra : 0))];
  const d50 = [];
  const d90 = [];
  jahre.forEach((j, i) => {
    if (plan.dienst[i] > 0.5) {
      d50.push(j.cfads50 / plan.dienst[i]);
      d90.push(j.cfads90 / plan.dienst[i]);
    }
  });
  const bank = [-(betrag - gebuehr), ...plan.dienst.slice(0, ende)];
  const llcr = betrag > 0 ? (npv(zins, [0, ...jahre.slice(0, ende).map((j) => j.cfads90)]) + dsra) / betrag : null;
  const dscrMinP90 = d90.length ? Math.min(...d90) : null;
  return {
    zinsAllIn: zins,
    betrag,
    fkQuote: betrag / e.capex,
    kapitalbedarfEk: ek0,
    gebuehr,
    dsra,
    rateJahr1: plan.dienst[0],
    dscrMin: d50.length ? Math.min(...d50) : null,
    dscrMittel: d50.length ? d50.reduce((s, x) => s + x, 0) / d50.length : null,
    dscrMinP90,
    llcr,
    ekIrr: ek0 > 0 ? irr(cfEk) : null,
    zinsenSumme: plan.zinsen.reduce((s, x) => s + x, 0),
    kostenSumme: plan.zinsen.reduce((s, x) => s + x, 0) + gebuehr,
    effektivPa: irr(bank),
    covenantPuffer: dscrMinP90 !== null ? dscrMinP90 - t.dscrCovenant : null,
    covenantHaltbar: dscrMinP90 === null ? true : dscrMinP90 >= t.dscrCovenant,
    plan,
  };
}

/** Vergleich mehrerer Term Sheets: Kennzahlen + Rangfolge (EK-IRR, bei Covenant-Risiko abgewertet) + Empfehlungstext */
export function termsheetVergleich(liste = [], e) {
  const zeilen = liste.map((x) => ({ ...x, k: termsheetKennzahlen(x.termsheet, e) }));
  const wert = (r) => (r.k.ekIrr ?? -1) - (r.k.covenantHaltbar ? 0 : 1);
  const sortiert = [...zeilen].sort((a, b) => wert(b) - wert(a));
  sortiert.forEach((r, i) => (r.rang = i + 1));
  const beste = sortiert[0];
  const empfehlung = beste
    ? `${beste.bank || "Angebot 1"}: höchste Eigenkapitalrendite${beste.k.covenantHaltbar ? " bei eingehaltenem DSCR-Covenant im P90-Fall" : " – Achtung: DSCR-Covenant im P90-Fall nicht eingehalten"}. Entscheidung trifft die Leitung nach Prüfung der Sicherheiten und Auszahlungsvoraussetzungen.`
    : "";
  return { zeilen: sortiert.map(({ k: { plan: _p, ...k }, ...r }) => ({ ...r, k })), empfehlung };
}

// ================================================================ Covenants

export const AMPEL_FZ = {
  gruen: { label: "Covenant eingehalten", ton: "ok" },
  gelb: { label: "Frühwarnung", ton: "warn" },
  rot: { label: "Lock-up / Covenant verletzt", ton: "rot" },
  grau: { label: "Keine Daten", ton: "neutral" },
};
export const FRUEHWARN_PUFFER = 0.05; // Frühwarnung, wenn der DSCR weniger als 0,05 über dem Lock-up liegt

/**
 * Ampel eines Prüftermins. dscr: gemessener DSCR (rollierende 12 Monate); vorher: DSCR des Vortermins (Trend).
 * rot  < Lock-up (Ausschüttungssperre) – „verletzt“ zusätzlich, wenn < Covenant (Default)
 * gelb < Lock-up + Puffer oder deutlich fallender Trend (> 0,1 gegenüber Vortermin)
 */
export function covenantAmpel({ dscr, lockup = P.dscrLockup, covenant = P.dscrDefault, vorher = null }) {
  if (dscr === null || dscr === undefined || !Number.isFinite(dscr)) return { id: "grau", verletzt: false, lockup: false, grund: "Keine Messdaten bzw. kein Schuldendienst im Zeitraum." };
  if (dscr < covenant) return { id: "rot", verletzt: true, lockup: true, grund: `DSCR ${dscr.toFixed(2)} unter dem Covenant ${covenant.toFixed(2)} – Kündigungsrecht der Bank (Event of Default), sofort mit der Bank sprechen.` };
  if (dscr < lockup) return { id: "rot", verletzt: false, lockup: true, grund: `DSCR ${dscr.toFixed(2)} unter dem Lock-up ${lockup.toFixed(2)} – Ausschüttungssperre.` };
  if (dscr < lockup + FRUEHWARN_PUFFER) return { id: "gelb", verletzt: false, lockup: false, grund: `DSCR ${dscr.toFixed(2)} nur knapp über dem Lock-up ${lockup.toFixed(2)}.` };
  if (vorher !== null && Number.isFinite(vorher) && vorher - dscr > 0.1) return { id: "gelb", verletzt: false, lockup: false, grund: `DSCR fällt deutlich (${vorher.toFixed(2)} → ${dscr.toFixed(2)}).` };
  return { id: "gruen", verletzt: false, lockup: false, grund: `DSCR ${dscr.toFixed(2)} – ausreichend Abstand zum Lock-up.` };
}

/**
 * Covenant-Prüfung aus Monatswerten: je Quartalsende DSCR der letzten 12 Monate (LTM) = CFADS ÷ Schuldendienst.
 * monate: [{ monat: "JJJJ-MM", cfads, schuldendienst, quelle }] (aufsteigend). LLCR zum Stichtag: Barwert der
 * geplanten CFADS über die Restlaufzeit (planCfads je Folgejahr) ÷ Restschuld.
 */
export function covenantPruefung({ monate = [], lockup, covenant, llcrCovenant = null, restschuld = 0, planCfads = [], zins = 0.045 } = {}) {
  const sortiert = [...monate].sort((a, b) => a.monat.localeCompare(b.monat));
  const pruefungen = [];
  for (let i = 11; i < sortiert.length; i++) {
    const m = sortiert[i].monat;
    const quartalsende = ["03", "06", "09", "12"].includes(m.slice(5, 7));
    if (!quartalsende && i !== sortiert.length - 1) continue; // Prüftermine: Quartalsenden + laufender Stand (letzter vollständiger Monat)
    const fenster = sortiert.slice(i - 11, i + 1);
    const cfads = fenster.reduce((s, x) => s + (x.cfads || 0), 0);
    const ds = fenster.reduce((s, x) => s + (x.schuldendienst || 0), 0);
    const dscr = ds > 0.5 ? cfads / ds : null;
    const vorher = pruefungen.length ? pruefungen[pruefungen.length - 1].dscr : null;
    const quartal = quartalsende ? `Q${Math.ceil(Number(m.slice(5, 7)) / 3)}/${m.slice(0, 4)}` : `LTM bis ${m.slice(5, 7)}/${m.slice(0, 4)}`;
    pruefungen.push({ periode: quartal, bis: m, laufend: !quartalsende, cfads, schuldendienst: ds, dscr, prognoseAnteil: fenster.filter((x) => x.quelle === "prognose").length / 12, ampel: covenantAmpel({ dscr, lockup, covenant, vorher }) });
  }
  const llcr = restschuld > 0.5 && planCfads.length ? npv(zins, [0, ...planCfads]) / restschuld : null;
  const letzte = pruefungen[pruefungen.length - 1] || null;
  let ampel = letzte ? letzte.ampel : covenantAmpel({ dscr: null });
  if (llcr !== null && llcrCovenant && llcr < llcrCovenant && ampel.id !== "rot") ampel = { id: "rot", verletzt: true, lockup: true, grund: `LLCR ${llcr.toFixed(2)} unter dem Covenant ${llcrCovenant.toFixed(2)}.` };
  return { pruefungen, llcr, ampel, letzte };
}

export { BankFehler };
