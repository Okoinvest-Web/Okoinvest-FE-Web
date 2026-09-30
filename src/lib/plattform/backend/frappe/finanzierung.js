// src/lib/plattform/backend/frappe/finanzierung.js
//
// Frappe-Adapter „Finanzierung“. Methoden in oekoinvest_app.plattform.api.finanzierung – Vertrag: docs/API.md, Abschnitt
// „Finanzierung“. Signaturen identisch zu backend/demo/finanzierung.js. Frappe prüft Rolle UND Eigentum selbst, speichert,
// versendet und rechnet die Covenants (Scheduler). Financial Model, Varianten, Term-Sheet-Vergleich, Vorbelegung und
// Geschäftsmodell rechnet dieser Adapter auf dem Website-Server mit denselben reinen Funktionen wie das Demo-Backend –
// immer NACH der Rechteprüfung durch Frappe (Frappe liefert nur Daten, die der Nutzer sehen darf).

import { METHODEN, frappeAufruf as aufruf } from "../frappe";
import { betriebsJahre, cockpitBereinigen, cockpitStandard, ergebnisKurz, rechneCockpit, TYPEN_FZ } from "../../finanzierung/kern";
import { termsheetKennzahlen, termsheetVergleich } from "../../finanzierung/bank";
import { geschaeftsmodellVergleich } from "../../finanzierung/geschaeftsmodell";
import { vorbelegungAusProjekt } from "../../finanzierung/vorbelegung";

Object.assign(METHODEN, {
  fzCockpitListe: "finanzierung.cockpit_liste",
  fzCockpitProjekt: "finanzierung.cockpit_projekt",
  fzSzenarioSpeichern: "finanzierung.szenario_speichern",
  fzSzenarioLoeschen: "finanzierung.szenario_loeschen",
  fzSzenario: "finanzierung.szenario",
  fzUebersicht: "finanzierung.uebersicht",
  fzFall: "finanzierung.fall",
  fzAuswahl: "finanzierung.auswahl",
  fzFallAnlegen: "finanzierung.fall_anlegen",
  fzFallAendern: "finanzierung.fall_aendern",
  fzBankSpeichern: "finanzierung.bank_speichern",
  fzAktion: "finanzierung.aktion",
  fzDokumentSpeichern: "finanzierung.dokument_speichern",
  fzDokumentLesen: "finanzierung.dokument_lesen",
  fzModellDaten: "finanzierung.modell_daten",
  fzReportingDaten: "finanzierung.reporting_daten",
  fzCovenantLauf: "finanzierung.covenant_lauf",
  fzGeschaeftsmodell: "finanzierung.geschaeftsmodell",
  fzBankEinladungInfo: "finanzierung.bank_einladung_info",
  fzBankEinladungAnnehmen: "finanzierung.bank_einladung_annehmen",
  fzBankMeine: "finanzierung.bank_meine",
  fzBankAnfrage: "finanzierung.bank_anfrage",
  fzBankAktion: "finanzierung.bank_aktion",
  fzBankZaehler: "finanzierung.bank_zaehler",
});

/** Fall-Antwort um Financial Model und Term-Sheet-Vergleich ergänzen */
function fallAnreichern(f) {
  if (!f?.eingaben) return f;
  const e = cockpitBereinigen(f.eingaben);
  const mitTs = (f.anfragen || []).filter((a) => a.termsheet);
  let vergleich = { zeilen: [], empfehlung: "" };
  try {
    if (mitTs.length) vergleich = termsheetVergleich(mitTs.map((a) => ({ anfrageId: a.id, bank: a.bank, termsheet: a.termsheet.daten })), e);
  } catch {
    /* unvollständiges Term Sheet – Vergleich bleibt leer */
  }
  const c = rechneCockpit(e, { varianten: ["ek", "annuitaet", "skulptiert", "foerder", "misch"] });
  return { ...f, eingaben: e, vergleich, modell: { projekt: c.projekt, varianten: c.varianten.map(({ reihen: _r, ...x }) => x) } };
}

// ---------------------------------------------------------------- Investor
export const fzCockpitListe = (n) => aufruf("fzCockpitListe", {}, n);
export async function fzCockpitProjekt(n, projektId) {
  const r = await aufruf("fzCockpitProjekt", { projektId }, n);
  const p = r.projekt || {};
  return { projekt: { id: p.id, titel: p.titel, mwp: p.mwp, land: p.land, typ: p.typ, phase: p.phase }, zugriff: r.zugriff, vorbelegung: vorbelegungAusProjekt(r), szenarien: r.szenarien || [] };
}
export async function fzSzenarioSpeichern(n, { projektId = "", name, eingaben = {}, fokus } = {}) {
  const r = rechneCockpit(cockpitBereinigen(eingaben || {}));
  return aufruf("fzSzenarioSpeichern", { projektId, name, fokus, eingaben: r.eingaben, ergebnis: ergebnisKurz(r) }, n);
}
export const fzSzenarioLoeschen = (n, id) => aufruf("fzSzenarioLoeschen", { id }, n);
export const fzSzenario = (n, id, { ip = "" } = {}) => aufruf("fzSzenario", { id, ip }, n);

// ---------------------------------------------------------------- Backoffice
export const fzUebersicht = (n) => aufruf("fzUebersicht", {}, n);
export const fzFall = async (n, id) => fallAnreichern(await aufruf("fzFall", { id }, n));
export const fzAuswahl = (n) => aufruf("fzAuswahl", {}, n);
export async function fzFallAnlegen(n, daten = {}) {
  // Vorbelegung aus dem Bezug (Leistung, Land, Typ) – die Auswahl liefert Frappe rechtegeprüft
  let basis = {};
  let titel = daten.titel || "";
  if (daten.bezugArt === "entwicklung" || daten.bezugArt === "anlage") {
    const a = await aufruf("fzAuswahl", {}, n);
    const x = (daten.bezugArt === "entwicklung" ? a.entwicklung : a.anlagen).find((y) => y.id === daten.bezugId);
    if (x) {
      basis = cockpitStandard({ land: x.land, typ: TYPEN_FZ[x.typ] ? x.typ : "freiflaeche", mwp: x.mwp || (x.kwp || 0) / 1000 || 10 });
      if (daten.bezugArt === "anlage") basis = { ...basis, modell: "contracting", lieferAnteil: 0.6 };
      // Entwicklungsprojekt mit übergebener Projektkostenkalkulation: Finanzierungsbedarf statt Standard-Capex (Quelle vermerkt Frappe)
      if (daten.bezugArt === "entwicklung" && x.kostenkalkulation?.finanzierungsbedarf > 0) basis = { ...basis, capex: x.kostenkalkulation.finanzierungsbedarf };
      titel ||= x.titel;
    }
  }
  const eingaben = cockpitBereinigen({ ...basis, ...(daten.eingaben || {}) });
  return aufruf("fzFallAnlegen", { daten: { ...daten, titel, eingaben } }, n);
}
export async function fzFallAendern(n, id, daten = {}) {
  let d = daten;
  if (d.eingaben) {
    const alt = cockpitBereinigen((await aufruf("fzFall", { id }, n)).eingaben || {});
    d = { ...d, eingaben: cockpitBereinigen({ ...alt, ...d.eingaben }, alt) };
  }
  return aufruf("fzFallAendern", { id, daten: d }, n);
}
export const fzBankSpeichern = (n, daten = {}) => aufruf("fzBankSpeichern", { daten }, n);
export async function fzAktion(n, fallId, daten = {}) {
  let zusatz = {};
  if (["kreditvertrag", "geschaeftsmodell", "entscheidung"].includes(daten.aktion)) {
    const f = fallAnreichern(await aufruf("fzFall", { id: fallId }, n));
    if (daten.aktion === "kreditvertrag") zusatz = { planCfads: betriebsJahre(f.eingaben).map((j) => Math.round(j.cfads90)) }; // für die LLCR im Scheduler
    if (daten.aktion === "geschaeftsmodell") {
      const v = geschaeftsmodellVergleich(f.eingaben, daten.annahmen || {});
      zusatz = { annahmen: v.annahmen, werte: v.zeilen.map((z) => ({ id: z.id, barwert: Math.round(z.barwert), kapitalbindung: Math.round(z.kapitalbindung), irr: z.irr })) };
    }
    if (daten.aktion === "entscheidung") {
      const ts = (f.anfragen || []).find((a) => a.id === daten.anfrageId)?.termsheet?.daten;
      if (ts) {
        const k = termsheetKennzahlen(ts, f.eingaben);
        zusatz = { kennzahlen: { ekIrr: k.ekIrr, dscrMinP90: k.dscrMinP90, zinsAllIn: k.zinsAllIn, kapitalbedarfEk: k.kapitalbedarfEk } };
      }
    }
  }
  const r = await aufruf("fzAktion", { fallId, daten: { ...daten, ...zusatz } }, n);
  return { ...r, fall: fallAnreichern(r.fall) };
}
/** Upload: Datei als Base64 (≤ 10 MB, Typ bereits an den ersten Bytes geprüft) – Frappe legt sie als private File ab */
export const fzDokumentSpeichern = (n, { daten, ...rest } = {}) => aufruf("fzDokumentSpeichern", { ...rest, inhalt: Buffer.from(daten).toString("base64") }, n);
export async function fzDokumentLesen(n, id, { anfrageId = "", ip = "" } = {}) {
  const r = await aufruf("fzDokumentLesen", { id, anfrageId, ip }, n);
  return { name: r.name, mime: r.mime, daten: Buffer.from(r.inhalt || "", "base64") };
}
export async function fzModellDaten(n, fallId, o = {}) {
  const r = await aufruf("fzModellDaten", { fallId, ...o }, n);
  const c = rechneCockpit(cockpitBereinigen(r.eingaben || {}), { varianten: ["skulptiert", "annuitaet"] });
  return { ...r, eingaben: c.eingaben, projekt: c.projekt, jahre: c.jahre, varianten: c.varianten };
}
export const fzReportingDaten = (n, fallId, o = {}) => aufruf("fzReportingDaten", { fallId, ...o }, n);
export const fzCovenantLauf = (n) => aufruf("fzCovenantLauf", {}, n);
export async function fzGeschaeftsmodell(n, { fallId = "", eingaben = {}, annahmen = {} } = {}) {
  const r = await aufruf("fzGeschaeftsmodell", { fallId }, n); // Rechteprüfung (lesen) + Eingaben des Falls
  return geschaeftsmodellVergleich(r.eingaben || eingaben, annahmen);
}

// ---------------------------------------------------------------- Bank
export const fzBankEinladungInfo = (token) => aufruf("fzBankEinladungInfo", { token });
export const fzBankEinladungAnnehmen = (n, token) => aufruf("fzBankEinladungAnnehmen", { token }, n);
export const fzBankMeine = (n) => aufruf("fzBankMeine", {}, n);
export const fzBankAnfrage = (n, anfrageId) => aufruf("fzBankAnfrage", { anfrageId }, n);
export const fzBankAktion = (n, anfrageId, daten = {}) => aufruf("fzBankAktion", { anfrageId, daten }, n);
export const fzBankZaehler = (n) => aufruf("fzBankZaehler", {}, n);
