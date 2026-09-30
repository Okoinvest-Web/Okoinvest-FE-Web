// src/lib/plattform/backend/frappe/portfolio.js
//
// Frappe-Adapter „Portfolio“. Methoden in oekoinvest_app.plattform.api.portfolio – Vertrag: docs/API.md, Abschnitt
// „Portfolio“. Signaturen identisch zu backend/demo/portfolio.js. Frappe prüft Rolle UND Eigentum (Investor, Teamrolle,
// Backoffice-Bereich „portfolio“), rechnet Soll/Ist, DSCR und Kennzahlen mit portfolio_kern.py (1:1 wie portfolio/kern.js),
// speichert Dateien privat und führt den Fristenlauf täglich per Scheduler aus.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";
import { berichtRechnen } from "../../portfolio/bericht";

Object.assign(METHODEN, {
  pfMeine: "portfolio.meine",
  pfPosition: "portfolio.position",
  pfPortalAktion: "portfolio.portal_aktion",
  pfBerichtDaten: "portfolio.bericht_daten",
  pfDokumentLesen: "portfolio.dokument_lesen",
  pfUebersicht: "portfolio.uebersicht",
  pfAuswahl: "portfolio.auswahl",
  pfAnlegen: "portfolio.anlegen",
  pfAendern: "portfolio.aendern",
  pfAktion: "portfolio.aktion",
  pfDokumentSpeichern: "portfolio.dokument_speichern",
  pfFristenLauf: "portfolio.fristen_lauf",
});

export const pfMeine = (n) => aufruf("pfMeine", {}, n);
export const pfPosition = (n, id) => aufruf("pfPosition", { id }, n);
export const pfPortalAktion = (n, id, daten = {}) => aufruf("pfPortalAktion", { id, daten }, n);
/** Frappe prüft Rechte und liefert die Rohdaten – den Bericht rechnet die Website mit denselben Regeln wie das Demo-Backend */
export async function pfBerichtDaten(n, id, { art = "quartal", periode = "", ip = "" } = {}) {
  const r = await aufruf("pfBerichtDaten", { id, art, periode, ip }, n);
  const bericht = berichtRechnen(r.stammdaten, { ertraege: r.ertraege || [], abrufe: r.abrufe || [], ausschuettungen: r.ausschuettungen || [] }, { art: r.art, periode: r.periode, heute: r.heute });
  return { position: r.position, stammdaten: r.stammdaten, bericht, empfaenger: r.empfaenger || "" };
}
export async function pfDokumentLesen(n, dokId, { ip = "" } = {}) {
  const r = await aufruf("pfDokumentLesen", { dokId, ip }, n);
  return { name: r.name, mime: r.mime, daten: Buffer.from(r.inhalt || "", "base64") };
}
export const pfUebersicht = (n) => aufruf("pfUebersicht", {}, n);
export const pfAuswahl = (n) => aufruf("pfAuswahl", {}, n);
export const pfAnlegen = (n, daten = {}) => aufruf("pfAnlegen", { daten }, n);
export const pfAendern = (n, id, daten = {}) => aufruf("pfAendern", { id, daten }, n);
export const pfAktion = (n, id, daten = {}) => aufruf("pfAktion", { id, daten }, n);
export const pfDokumentSpeichern = (n, { daten, ...rest } = {}) => aufruf("pfDokumentSpeichern", { ...rest, inhalt: Buffer.from(daten || []).toString("base64") }, n);
export const pfFristenLauf = (n) => aufruf("pfFristenLauf", {}, n);
