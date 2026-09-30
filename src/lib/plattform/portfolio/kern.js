// src/lib/plattform/portfolio/kern.js
//
// Investor-Portfolio nach dem Kauf – reine Regeln (client- und serverseitig, ohne Node-Importe, Node-testbar).
// Gleiche Regeln in Frappe: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/portfolio_kern.py (1:1).
//
//   Positionen      bestand (erworbene Bestandsanlage) · projekt (Projektkauf vor COD) · codev (Co-Development-Beteiligung)
//                   Zustandsautomat PF_UEBERGAENGE; Position aus einem vollzogenen Closing: positionAusClosing()
//   Ertrag          Soll (P50 × Monatsanteil × Degradation) gegen Ist (Monatswerte), Abweichung, Ampel, spez. Ertrag
//   Covenants       DSCR aus Ist-Erlösen − Betriebskosten gegen Schuldendienst (saisonbereinigt hochgerechnet), Lock-up/Default
//   Cashflows       Paid-in (Kaufpreisanteil + bezahlte Kapitalabrufe), Ausschüttungen, DPI, Cash-Rendite 12 Monate
//   Kapitalabrufe   Zusage (Commitment), Abruf ≤ offene Zusage, Frist ≥ 10 Tage, Status angekündigt → gemeldet → bezahlt
//   Ausschüttungen  Arten, Quellensteuer-Hinweis je Land, Ausschüttungssperre bei DSCR unter Lock-up (nur mit Bankzustimmung)
//   Berichte        Quartal/Jahr (Perioden, Standardperiode), Steuerunterlagen-Hinweise je Land (keine Steuerberatung)
//   Wiederverkauf   Anfrage (Preisvorstellung, Zeitpunkt, Struktur) → Entwurf in der Projektbörse (Anbieter = Investor)
//
// Alle Zahlen aus src/lib/invest/markt.js. Fehler: PortfolioFehler { status 409 | 422 }.

import { ALLGEMEIN, FINANZIERUNG, FREIFLAECHE } from "../../invest/markt.js";

export class PortfolioFehler extends Error {
  constructor(status, text) {
    super(text);
    this.status = status;
  }
}
const ungueltig = (t) => new PortfolioFehler(422, t);
const konflikt = (t) => new PortfolioFehler(409, t);

export const PF_ARTEN = {
  bestand: { label: "Bestandsanlage (erworben)", kurz: "Bestand" },
  projekt: { label: "Projektkauf (vor Inbetriebnahme)", kurz: "Projekt" },
  codev: { label: "Co-Development-Beteiligung", kurz: "Co-Development" },
};

export const PF_STATUS = {
  uebernahme: { label: "Übernahme läuft", ton: "warn" },
  entwicklung: { label: "In Entwicklung", ton: "info" },
  bau: { label: "Im Bau", ton: "info" },
  betrieb: { label: "In Betrieb", ton: "ok" },
  verkauf_angefragt: { label: "Wiederverkauf angefragt", ton: "warn" },
  verkauf_boerse: { label: "Wiederverkauf in der Börse", ton: "info" },
  verkauft: { label: "Verkauft", ton: "neutral" },
  beendet: { label: "Beendet", ton: "neutral" },
};
export const PF_AKTIV = ["uebernahme", "entwicklung", "bau", "betrieb", "verkauf_angefragt", "verkauf_boerse"];

/** Erlaubte Statuswechsel (Backoffice; Wiederverkauf-Anfrage durch den Investor über wiederverkaufPruefen) */
export const PF_UEBERGAENGE = {
  uebernahme: ["betrieb", "bau", "beendet"],
  entwicklung: ["bau", "betrieb", "beendet"],
  bau: ["betrieb", "verkauf_angefragt", "beendet"],
  betrieb: ["verkauf_angefragt", "beendet"],
  verkauf_angefragt: ["verkauf_boerse", "betrieb", "bau"],
  verkauf_boerse: ["verkauft", "betrieb", "bau"],
  verkauft: [],
  beendet: [],
};

export function uebergangPruefen(von, nach) {
  if (!PF_STATUS[nach]) throw ungueltig("Unbekannter Status.");
  if (!(PF_UEBERGAENGE[von] || []).includes(nach)) throw konflikt(`Statuswechsel von „${PF_STATUS[von]?.label || von}“ nach „${PF_STATUS[nach].label}“ ist nicht möglich.`);
  return nach;
}

// ---------------------------------------------------------------- Datum/Hilfen

const ISO_TAG = /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const ISO_MONAT = /^20\d\d-(0[1-9]|1[0-2])$/;
export const istTag = (s) => ISO_TAG.test(String(s || ""));
export const istMonat = (s) => ISO_MONAT.test(String(s || ""));
const dz = (x) => Number(x).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const runden = (x, st = 0) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 10 ** st) / 10 ** st);

export function plusTage(tag, n) {
  const d = new Date(`${tag}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function tageZwischen(a, b) {
  return Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 864e5);
}
export function monatPlus(monat, n) {
  const [j, m] = monat.split("-").map(Number);
  const x = j * 12 + (m - 1) + n;
  return `${Math.floor(x / 12)}-${String((x % 12) + 1).padStart(2, "0")}`;
}
/** Die letzten n Monate bis einschließlich `bis` (aufsteigend) */
export function monateBis(bis, n) {
  return Array.from({ length: n }, (_, i) => monatPlus(bis, i - n + 1));
}

// ---------------------------------------------------------------- Ertrag Soll/Ist

/** Soll-Erzeugung (kWh) eines Monats: P50 × Monatsanteil × (1 − Degradation)^Betriebsjahre, nur ab Inbetriebnahme */
export function sollMonat(pos, monat) {
  const p50 = Number(pos?.p50KwhJahr) || 0;
  if (!p50 || !istMonat(monat)) return null;
  const start = String(pos.inbetriebnahme || pos.kaufdatum || "").slice(0, 7);
  if (istMonat(start) && monat < start) return null;
  const [j, m] = monat.split("-").map(Number);
  const betriebsJahre = istMonat(start) ? Math.max(0, Math.floor((j * 12 + m - (Number(start.slice(0, 4)) * 12 + Number(start.slice(5, 7)))) / 12)) : 0;
  const deg = Number.isFinite(Number(pos.degradation)) && pos.degradation !== null && pos.degradation !== "" ? Number(pos.degradation) : FREIFLAECHE.degradation;
  return p50 * ALLGEMEIN.pvMonatsanteile[m - 1] * (1 - deg) ** betriebsJahre;
}

export const ERTRAG_AMPEL = { gruen: -0.05, gelb: -0.1 }; // Abweichung Ist/Soll: ≥ −5 % grün, ≥ −10 % gelb, sonst rot

export function ampelErtrag(abw) {
  if (abw === null || abw === undefined) return "grau";
  return abw >= ERTRAG_AMPEL.gruen ? "gruen" : abw >= ERTRAG_AMPEL.gelb ? "gelb" : "rot";
}

/**
 * Soll/Ist je Monat und Summen (12 Monate rollierend, Kalenderjahr bis `bis`).
 * ertraege: [{ monat, kwh, quelle }] – je Monat höchstens ein Wert (der letzte zählt).
 */
export function ertragAuswertung(pos, ertraege = [], { bis, monate = 12 } = {}) {
  const ende = istMonat(bis) ? bis : [...ertraege].map((e) => e.monat).filter(istMonat).sort().pop() || null;
  if (!ende) return { bis: null, monate: [], summe12: null, jahr: null, ampel: "grau", spezifisch12: null };
  const ist = new Map();
  for (const e of ertraege) if (istMonat(e.monat) && Number.isFinite(Number(e.kwh))) ist.set(e.monat, { kwh: Number(e.kwh), quelle: e.quelle || "" });
  const verguetung = Number(pos.verguetungCt) || 0;
  const zeilen = monateBis(ende, monate).map((monat) => {
    const soll = sollMonat(pos, monat);
    const i = ist.get(monat);
    const kwh = i ? i.kwh : null;
    return { monat, soll: runden(soll), ist: kwh === null ? null : runden(kwh), abw: soll && kwh !== null ? runden(kwh / soll - 1, 4) : null, erloes: kwh !== null && verguetung ? runden((kwh * verguetung) / 100) : null, quelle: i?.quelle || "" };
  });
  const summe = (liste) => {
    const mit = liste.filter((z) => z.ist !== null && z.soll);
    if (!mit.length) return null;
    const s = mit.reduce((a, z) => a + z.soll, 0);
    const x = mit.reduce((a, z) => a + z.ist, 0);
    return { monate: mit.length, soll: runden(s), ist: runden(x), abw: s ? runden(x / s - 1, 4) : null, erloes: verguetung ? runden((x * verguetung) / 100) : null };
  };
  const s12 = summe(zeilen);
  const jahr = summe(zeilen.filter((z) => z.monat.slice(0, 4) === ende.slice(0, 4)));
  const kwp = (Number(pos.mwp) || 0) * 1000;
  return { bis: ende, monate: zeilen, summe12: s12, jahr, ampel: ampelErtrag(s12?.abw ?? null), spezifisch12: s12 && kwp && s12.monate === 12 ? runden(s12.ist / kwp) : null };
}

// ---------------------------------------------------------------- Covenants (DSCR)

/**
 * DSCR aus den Ist-Werten der letzten 12 Monate: CFADS = Erlöse − Betriebskosten (anteilig), Schuldendienst p. a.
 * Fehlen Monate (mind. 6 nötig), wird saisonbereinigt über die Monatsanteile hochgerechnet.
 * Ampel: rot < dscrDefault, gelb < dscrLockup (Ausschüttungssperre), sonst grün; grau ohne Fremdkapital/Daten.
 */
export function covenantAuswertung(pos, ertraege = [], { bis } = {}) {
  const sd = Number(pos?.schuldendienstJahr) || 0;
  const grenzen = { lockup: Number(pos?.dscrLockup) || FINANZIERUNG.projekt.dscrLockup, default: Number(pos?.dscrDefault) || FINANZIERUNG.projekt.dscrDefault };
  if (!sd) return { aktiv: false, ampel: "grau", dscr: null, grenzen, gesperrt: false, grund: "Kein Fremdkapital hinterlegt." };
  const e = ertragAuswertung(pos, ertraege, { bis });
  const mit = e.monate.filter((z) => z.ist !== null);
  if (mit.length < 6) return { aktiv: true, ampel: "grau", dscr: null, grenzen, gesperrt: false, grund: "Für den DSCR werden mindestens 6 Monatswerte benötigt.", bis: e.bis };
  const anteil = mit.reduce((a, z) => a + ALLGEMEIN.pvMonatsanteile[Number(z.monat.slice(5, 7)) - 1], 0);
  const erloese = mit.reduce((a, z) => a + (z.erloes || 0), 0) / (anteil || 1);
  const opex = Number(pos.opexJahr) || 0;
  const cfads = erloese - opex;
  const dscr = runden(cfads / sd, 2);
  const ampel = dscr < grenzen.default ? "rot" : dscr < grenzen.lockup ? "gelb" : "gruen";
  return {
    aktiv: true, ampel, dscr, grenzen, gesperrt: ampel !== "gruen", bis: e.bis, monate: mit.length, hochgerechnet: mit.length < 12,
    erloeseJahr: runden(erloese), opexJahr: runden(opex), cfads: runden(cfads), schuldendienstJahr: runden(sd),
    grund: ampel === "rot" ? `DSCR ${dz(dscr)} unter ${dz(grenzen.default)} – möglicher Kündigungsgrund (Event of Default), Bank informieren.` : ampel === "gelb" ? `DSCR ${dz(dscr)} unter ${dz(grenzen.lockup)} – Ausschüttungssperre (Lock-up).` : `DSCR ${dz(dscr)} über der Lock-up-Grenze ${dz(grenzen.lockup)}.`,
  };
}

// ---------------------------------------------------------------- Kapitalabrufe (Capital Calls)

export const ABRUF_STATUS = {
  angekuendigt: { label: "Offen", ton: "warn" },
  gemeldet: { label: "Zahlung gemeldet", ton: "info" },
  bezahlt: { label: "Bezahlt", ton: "ok" },
  storniert: { label: "Storniert", ton: "neutral" },
};
export const ABRUF_OFFEN = ["angekuendigt", "gemeldet"];
/** Mindestfrist zwischen Ankündigung und Fälligkeit (Plattformregel, übliche Größenordnung in Beteiligungsverträgen) */
export const ABRUF_MIN_FRIST_TAGE = 10;

export function zusageStand(pos, abrufe = []) {
  const zusage = Number(pos?.zusage) || 0;
  const gueltig = abrufe.filter((a) => a.status !== "storniert");
  const abgerufen = gueltig.reduce((s, a) => s + (Number(a.betrag) || 0), 0);
  const bezahlt = gueltig.filter((a) => a.status === "bezahlt").reduce((s, a) => s + (Number(a.betrag) || 0), 0);
  return { zusage, abgerufen, bezahlt, offen: Math.max(0, zusage - abgerufen), quote: zusage ? runden(abgerufen / zusage, 4) : null };
}

/** Neuer Abruf: { betrag, faelligAm, zweck, meilenstein? } → bereinigt (wirft 409/422) */
export function abrufPruefen(pos, abrufe, daten = {}, { heute }) {
  if (!["codev", "projekt"].includes(pos?.art) || !(Number(pos.zusage) > 0)) throw konflikt("Kapitalabrufe gibt es nur für Beteiligungen mit Kapitalzusage.");
  if (!PF_AKTIV.includes(pos.status)) throw konflikt("Die Position ist abgeschlossen.");
  const betrag = Number(daten.betrag);
  if (!Number.isFinite(betrag) || betrag < 1 || betrag > 1e10) throw ungueltig("Bitte einen Betrag angeben.");
  const stand = zusageStand(pos, abrufe);
  if (betrag > stand.offen + 0.005) throw ungueltig(`Der Abruf übersteigt die offene Zusage (${Math.round(stand.offen).toLocaleString("de-DE")} €).`);
  if (!istTag(daten.faelligAm)) throw ungueltig("Bitte ein Fälligkeitsdatum angeben.");
  if (tageZwischen(heute, daten.faelligAm) < ABRUF_MIN_FRIST_TAGE) throw ungueltig(`Die Frist muss mindestens ${ABRUF_MIN_FRIST_TAGE} Tage betragen (frühestens ${plusTage(heute, ABRUF_MIN_FRIST_TAGE)}).`);
  const zweck = String(daten.zweck || "").trim().slice(0, 200);
  if (zweck.length < 5) throw ungueltig("Bitte den Zweck des Abrufs angeben (mind. 5 Zeichen).");
  return { betrag: Math.round(betrag * 100) / 100, faelligAm: daten.faelligAm, zweck, meilenstein: String(daten.meilenstein || "").trim().slice(0, 160), angekuendigtAm: heute, nummer: abrufe.length + 1 };
}

/**
 * Statuswechsel eines Abrufs: melden (Investor: Zahlung angewiesen) · bestaetigen (Backoffice: Eingang) · stornieren (Backoffice)
 * Liefert die Änderungen { status, … }.
 */
export function abrufAktion(a, aktion, daten = {}, { heute, rolle }) {
  if (aktion === "melden") {
    if (rolle !== "investor") throw konflikt("Nur der Investor meldet die Zahlung.");
    if (a.status !== "angekuendigt") throw konflikt("Der Abruf ist nicht mehr offen.");
    return { status: "gemeldet", gemeldetAm: heute, referenz: String(daten.referenz || "").trim().slice(0, 80) };
  }
  if (aktion === "bestaetigen") {
    if (rolle !== "backoffice") throw konflikt("Nur das Backoffice bestätigt den Zahlungseingang.");
    if (!ABRUF_OFFEN.includes(a.status)) throw konflikt("Der Abruf ist nicht mehr offen.");
    const datum = istTag(daten.datum) ? daten.datum : heute;
    if (datum > heute) throw ungueltig("Das Eingangsdatum darf nicht in der Zukunft liegen.");
    return { status: "bezahlt", bezahltAm: datum };
  }
  if (aktion === "stornieren") {
    if (rolle !== "backoffice") throw konflikt("Nur das Backoffice storniert Abrufe.");
    if (!ABRUF_OFFEN.includes(a.status)) throw konflikt("Nur offene Abrufe können storniert werden.");
    const grund = String(daten.grund || "").trim().slice(0, 300);
    if (grund.length < 5) throw ungueltig("Bitte einen Grund angeben.");
    return { status: "storniert", storniertAm: heute, grund };
  }
  throw ungueltig("Unbekannte Aktion.");
}

export function abrufVerzug(a, heute) {
  if (a.status !== "angekuendigt" || !istTag(a.faelligAm)) return 0;
  return Math.max(0, tageZwischen(a.faelligAm, heute));
}

// ---------------------------------------------------------------- Ausschüttungen

export const AUSSCHUETTUNG_ARTEN = {
  gewinn: { label: "Gewinnausschüttung (Kapitalgesellschaft)", quellensteuer: true, sperre: true },
  entnahme: { label: "Entnahme / Gewinnanteil (Personengesellschaft)", quellensteuer: false, sperre: true },
  zinsen: { label: "Zinsen Gesellschafterdarlehen", quellensteuer: false, sperre: true },
  tilgung: { label: "Tilgung Gesellschafterdarlehen", quellensteuer: false, sperre: true },
  kapital: { label: "Kapitalrückzahlung (Einlagenrückgewähr)", quellensteuer: false, sperre: true },
  verkauf: { label: "Verkaufserlös (Exit)", quellensteuer: false, sperre: false },
};

/** Periode „2026“, „2026-Q2“ oder „2026-06“ */
export const istPeriode = (p) => /^20\d\d(-Q[1-4]|-(0[1-9]|1[0-2]))?$/.test(String(p || ""));

/** Neue Ausschüttung: { art, periode, betrag, datum, bankZustimmung?, notiz? } – covenant = covenantAuswertung() */
export function ausschuettungPruefen(pos, daten = {}, { heute, covenant = null } = {}) {
  if (!["bestand", "projekt", "codev"].includes(pos?.art)) throw ungueltig("Unbekannte Position.");
  if (["beendet"].includes(pos.status)) throw konflikt("Die Position ist beendet.");
  const art = AUSSCHUETTUNG_ARTEN[daten.art] ? daten.art : null;
  if (!art) throw ungueltig("Bitte die Art der Ausschüttung wählen.");
  const betrag = Number(daten.betrag);
  if (!Number.isFinite(betrag) || betrag < 1 || betrag > 1e10) throw ungueltig("Bitte einen Betrag angeben.");
  if (!istPeriode(daten.periode)) throw ungueltig("Bitte die Periode angeben (z. B. 2026, 2026-Q2 oder 2026-06).");
  if (!istTag(daten.datum)) throw ungueltig("Bitte das Zahlungsdatum angeben.");
  if (daten.datum > plusTage(heute, 60)) throw ungueltig("Das Zahlungsdatum liegt zu weit in der Zukunft (höchstens 60 Tage).");
  const bankZustimmung = daten.bankZustimmung === true || daten.bankZustimmung === "true";
  if (covenant?.gesperrt && AUSSCHUETTUNG_ARTEN[art].sperre && !bankZustimmung) {
    throw konflikt(`Ausschüttungssperre: ${covenant.grund} Buchung nur mit Zustimmung der finanzierenden Bank.`);
  }
  return { art, periode: daten.periode, betrag: Math.round(betrag * 100) / 100, datum: daten.datum, bankZustimmung, notiz: String(daten.notiz || "").trim().slice(0, 300), status: "gebucht" };
}

/** Quellensteuer-Hinweis (Orientierung) je Land und Art */
export function quellensteuerHinweis(land, art) {
  if (!AUSSCHUETTUNG_ARTEN[art]?.quellensteuer) return null;
  const satz = FINANZIERUNG.quellensteuerAusschuettung?.[land];
  if (!satz) return null;
  const name = { DE: "Kapitalertragsteuer inkl. Solidaritätszuschlag", AT: "Kapitalertragsteuer (KESt)", CH: "Verrechnungssteuer" }[land];
  return { satz, text: `${name} in der Regel ${(satz * 100).toLocaleString("de-DE", { maximumFractionDigits: 3 })} % – Einbehalt und Bescheinigung durch die ausschüttende Gesellschaft; für Kapitalgesellschaften als Gesellschafter gelten oft Befreiungen oder Erstattungen.` };
}

// ---------------------------------------------------------------- Cashflow-Kennzahlen

export function cashflowKennzahlen(pos, { abrufe = [], ausschuettungen = [] } = {}, { heute } = {}) {
  const anteil = Math.max(0, Math.min(100, Number(pos?.anteilProzent) || 100)) / 100;
  const kaufpreis = pos?.art === "codev" ? 0 : (Number(pos?.kaufpreis) || 0) * anteil;
  const z = zusageStand(pos, abrufe);
  const paidIn = kaufpreis + z.bezahlt;
  const gueltig = ausschuettungen.filter((a) => a.status !== "storniert");
  const summe = gueltig.reduce((s, a) => s + (Number(a.betrag) || 0), 0);
  const ab = heute ? plusTage(heute, -365) : "";
  const zwoelf = gueltig.filter((a) => !ab || (a.datum > ab && a.datum <= heute)).reduce((s, a) => s + (Number(a.betrag) || 0), 0);
  return {
    kaufpreisAnteil: runden(kaufpreis), paidIn: runden(paidIn), ausgeschuettet: runden(summe), ausgeschuettet12: runden(zwoelf),
    dpi: paidIn ? runden(summe / paidIn, 3) : null, cashRendite12: paidIn ? runden(zwoelf / paidIn, 4) : null, zusage: z,
  };
}

// ---------------------------------------------------------------- Berichte (Quartal / Jahr)

export const BERICHT_ARTEN = { quartal: "Quartalsbericht", jahr: "Jahresbericht" };

/** Monate einer Periode: quartal „2026-Q2“ → 04–06, jahr „2025“ → 01–12 */
export function periodeMonate(art, periode) {
  if (art === "quartal") {
    const m = /^(20\d\d)-Q([1-4])$/.exec(String(periode || ""));
    if (!m) throw ungueltig("Bitte ein Quartal im Format 2026-Q2 angeben.");
    const start = (Number(m[2]) - 1) * 3 + 1;
    return [0, 1, 2].map((i) => `${m[1]}-${String(start + i).padStart(2, "0")}`);
  }
  if (art === "jahr") {
    if (!/^20\d\d$/.test(String(periode || ""))) throw ungueltig("Bitte ein Jahr im Format 2025 angeben.");
    return Array.from({ length: 12 }, (_, i) => `${periode}-${String(i + 1).padStart(2, "0")}`);
  }
  throw ungueltig("Unbekannte Berichtsart.");
}

/** Zuletzt abgeschlossene Periode (heute „2026-09-30“ → Quartal 2026-Q2, Jahr 2025) */
export function periodeStandard(art, heute) {
  const j = Number(heute.slice(0, 4));
  const q = Math.floor((Number(heute.slice(5, 7)) - 1) / 3) + 1;
  if (art === "jahr") return String(j - 1);
  return q === 1 ? `${j - 1}-Q4` : `${j}-Q${q - 1}`;
}

/** Wählbare Perioden für die Berichtsauswahl (ab Kauf/Beteiligung, höchstens 12 Quartale bzw. 5 Jahre) */
export function periodenAuswahl(pos, heute) {
  const beginn = String(pos?.kaufdatum || pos?.inbetriebnahme || heute).slice(0, 7);
  const quartale = [];
  let p = periodeStandard("quartal", heute);
  for (let i = 0; i < 12; i++) {
    const letzter = periodeMonate("quartal", p)[2];
    if (letzter < beginn) break;
    quartale.push(p);
    const [j, q] = [Number(p.slice(0, 4)), Number(p.slice(6))];
    p = q === 1 ? `${j - 1}-Q4` : `${j}-Q${q - 1}`;
  }
  const jahre = [];
  for (let j = Number(heute.slice(0, 4)) - 1; j >= Number(beginn.slice(0, 4)) && jahre.length < 5; j--) jahre.push(String(j));
  return { quartal: quartale, jahr: jahre };
}

/** Ausschüttung einer Periode zuordnen (Zahlungsdatum im Zeitraum) */
export function inPeriode(datum, monate) {
  return monate.includes(String(datum || "").slice(0, 7));
}

// ---------------------------------------------------------------- Steuerunterlagen (Hinweise, keine Steuerberatung)

export const STEUER_HINWEISE = {
  DE: [
    "Gewinnausschüttungen einer GmbH unterliegen in der Regel der Kapitalertragsteuer (25 % zzgl. Solidaritätszuschlag); die Gesellschaft stellt eine Steuerbescheinigung aus. Für Kapitalgesellschaften als Gesellschafter sind Ausschüttungen nach § 8b KStG weitgehend steuerfrei (Gewerbesteuer abhängig von der Beteiligungshöhe).",
    "Bei einer GmbH & Co. KG werden die Einkünfte gesondert und einheitlich festgestellt – Sie erhalten eine Mitteilung über Ihren Anteil. Gewerbesteuer fällt auf Ebene der KG an; für Solaranlagen gilt ein besonderer Zerlegungsmaßstab zugunsten der Standortgemeinde (§ 29 GewStG).",
    "Die Anlage wird in der Regel über 20 Jahre abgeschrieben (AfA-Tabelle); für Anschaffungen vom 1.7.2025 bis 31.12.2027 ist die degressive AfA möglich.",
  ],
  AT: [
    "Gewinnausschüttungen einer GmbH unterliegen der KESt von 27,5 % (bei natürlichen Personen in der Regel Endbesteuerung); zwischen Kapitalgesellschaften sind Beteiligungserträge in der Regel steuerfrei (§ 10 KStG).",
    "Bei Personengesellschaften (z. B. GmbH & Co KG) werden die Einkünfte einheitlich und gesondert festgestellt; Einspeiseerlöse sind betriebliche Einkünfte.",
    "Investitionsfreibetrag und degressive AfA hängen vom Anschaffungszeitpunkt ab – Anschaffungsdatum und Kaufpreisaufteilung dokumentieren.",
  ],
  CH: [
    "Dividenden einer AG bzw. GmbH unterliegen der Verrechnungssteuer von 35 %; je nach Empfänger Rückerstattung oder Meldeverfahren (qualifizierte Beteiligungen).",
    "Kapitalgesellschaften als Empfänger können den Beteiligungsabzug geltend machen (in der Regel ab 10 % Beteiligung oder 1 Mio. CHF Verkehrswert).",
    "Vermögens- bzw. Kapitalsteuer und Bewertung der Beteiligung sind kantonal unterschiedlich.",
  ],
};
export const STEUER_UNTERLAGEN = [
  "Jahresabschluss der Projektgesellschaft (Bilanz, GuV, ggf. Lagebericht)",
  "Steuerbescheinigung bzw. Bescheinigung über einbehaltene Quellensteuer – stellt die ausschüttende Gesellschaft aus",
  "Bei Personengesellschaften: Mitteilung über den Gewinnanteil (einheitliche und gesonderte Feststellung)",
  "Jahresbericht aus dem Portfolio (Ertrag, Ausschüttungen, Kapitaleinzahlungen) als Übersicht",
  "Nachweise über Kaufpreis und Kapitaleinzahlungen (Anschaffungskosten der Beteiligung)",
];
export const STEUER_HINWEIS_TEXT = "Hinweise zur Orientierung – keine Steuerberatung. Maßgeblich sind die Bescheinigungen der Gesellschaft und die Beurteilung Ihrer Steuerberatung.";

export function steuerHinweise(land) {
  return { land, punkte: STEUER_HINWEISE[land] || STEUER_HINWEISE.DE, unterlagen: STEUER_UNTERLAGEN, hinweis: STEUER_HINWEIS_TEXT };
}

// ---------------------------------------------------------------- Wiederverkauf über die Börse

export const WV_STRUKTUREN = { share: "Anteilskauf (Share Deal)", asset: "Kauf der Anlage (Asset Deal)" };

/** Anfrage des Investors: { preisvorstellung?, zeitpunkt (JJJJ-MM), struktur, anteilProzent?, grund } */
export function wiederverkaufPruefen(pos, daten = {}, { heute }) {
  if (!["betrieb", "bau"].includes(pos?.status)) throw konflikt("Ein Wiederverkauf ist für Positionen im Bau oder in Betrieb möglich.");
  const preis = daten.preisvorstellung === "" || daten.preisvorstellung === null || daten.preisvorstellung === undefined ? null : Number(daten.preisvorstellung);
  if (preis !== null && (!Number.isFinite(preis) || preis < 1 || preis > 1e10)) throw ungueltig("Bitte eine gültige Preisvorstellung angeben (oder leer lassen).");
  if (!istMonat(daten.zeitpunkt) || daten.zeitpunkt < heute.slice(0, 7)) throw ungueltig("Bitte den gewünschten Zeitpunkt angeben (Monat, nicht in der Vergangenheit).");
  const struktur = WV_STRUKTUREN[daten.struktur] ? daten.struktur : "share";
  const max = Math.max(1, Math.min(100, Number(pos.anteilProzent) || 100));
  const anteil = daten.anteilProzent === undefined || daten.anteilProzent === "" ? max : Number(daten.anteilProzent);
  if (!Number.isFinite(anteil) || anteil < 1 || anteil > max) throw ungueltig(`Der Anteil muss zwischen 1 und ${max} % liegen.`);
  const grund = String(daten.grund || "").trim().slice(0, 600);
  if (grund.length < 10) throw ungueltig("Bitte kurz beschreiben, was verkauft werden soll und warum (mind. 10 Zeichen).");
  return { preisvorstellung: preis === null ? null : Math.round(preis), zeitpunkt: daten.zeitpunkt, struktur, anteilProzent: anteil, grund, angefragtAm: heute, vorherStatus: pos.status };
}

/** Projektdaten für den Börsen-Entwurf (Anbieter = Investor, vertrauliche Angaben bleiben beim Backoffice) */
export function boerseEntwurf(pos, wv = {}) {
  const betrieb = pos.status === "betrieb" || wv.vorherStatus === "betrieb";
  const anteil = Number(wv.anteilProzent) || 100;
  return {
    titel: `${String(pos.titel || "Anlage").replace(/\s*\(Demo\)\s*$/, "")} – ${anteil < 100 ? `${anteil} % ` : ""}Wiederverkauf`.slice(0, 120),
    typ: pos.typ || "freiflaeche",
    land: ["DE", "AT", "CH"].includes(pos.land) ? pos.land : "DE",
    bundesland: pos.bundesland || "",
    mwp: Number(pos.mwp) || null,
    phase: betrieb ? "cod" : "rtb",
    netzanschluss: betrieb ? "vorhanden" : "zusage",
    codGeplant: betrieb ? "" : String(pos.inbetriebnahme || "").slice(0, 7),
    preisModus: wv.preisvorstellung ? "gesamt" : "anfrage",
    preis: wv.preisvorstellung || null,
    beschreibung: [
      `${betrieb ? "Bestandsanlage in Betrieb" : "Projekt im Bau"}${pos.inbetriebnahme ? ` (Inbetriebnahme ${String(pos.inbetriebnahme).slice(0, 7)})` : ""}, ${Number(pos.mwp || 0).toLocaleString("de-DE")} MWp.`,
      `Angeboten wird ${anteil < 100 ? `ein Anteil von ${anteil} %` : "die gesamte Position"} als ${WV_STRUKTUREN[wv.struktur] || WV_STRUKTUREN.share}.`,
      "Ertragshistorie, Verträge und Finanzierung stehen nach NDA im Datenraum bereit.",
    ].join(" "),
    highlights: [betrieb ? "In Betrieb mit Ertragshistorie" : "Im Bau", WV_STRUKTUREN[wv.struktur] || WV_STRUKTUREN.share].slice(0, 6),
  };
}

// ---------------------------------------------------------------- Position aus einem Closing

/** Status nach der Übergabe: alle Übergabepunkte erledigt → Betrieb (Bestand) bzw. Bau (Projekt), sonst Übernahme */
export function statusNachUebergabe(art, uebergabe = [], punkte = []) {
  const alle = punkte.length ? punkte.every((p) => uebergabe.some((u) => u.schluessel === p.schluessel && u.erledigt)) : false;
  if (!alle) return "uebernahme";
  return art === "projekt" ? "bau" : "betrieb";
}

/** Neue Position aus einem vollzogenen Closing (closing: Rohdaten, projekt: Börsenprojekt) */
export function positionAusClosing(c, p = {}) {
  const art = p.phase === "cod" || p.netzanschluss === "vorhanden" ? "bestand" : "projekt";
  const ertrag = Number(p.vertraulich?.ertragKwhKwp) || null;
  const mwp = Number(p.mwp) || 0;
  const db = p.datenblatt || {};
  const verguetung = Number(db.eegZuschlagCt) || Number(db.ppaPreisCt) || null;
  return {
    art, status: "uebernahme", titel: p.titel || "Erworbenes Projekt", typ: p.typ || "freiflaeche", land: c.land || p.land || "DE", bundesland: p.bundesland || "",
    mwp, closingId: c.id, projektId: c.projektId, kaufpreis: Number(c.kaufpreis) || 0, kaufdatum: c.vollzogenAm || "", anteilProzent: Number(c.anteilProzent) || 100,
    spvName: c.spvName || "", struktur: c.struktur || "", inbetriebnahme: art === "bestand" ? "" : String(p.codGeplant || ""),
    p50KwhJahr: ertrag && mwp ? Math.round(ertrag * mwp * 1000) : null, verguetungCt: verguetung,
    opexJahr: mwp ? Math.round(mwp * 1000 * (Number(db.opexEurKwp) || FREIFLAECHE.opexProKwp)) : null,
    schuldendienstJahr: null, zusage: 0,
  };
}
