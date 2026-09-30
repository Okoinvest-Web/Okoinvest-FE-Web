// src/lib/plattform/backend/frappe/entwicklung.js
//
// Frappe-Adapter „Projektentwicklung“. Methoden in oekoinvest_app.plattform.api.entwicklung – Vertrag: docs/API.md,
// Abschnitt 11. Signaturen identisch zu backend/demo/entwicklung.js. Frappe prüft Rolle UND Eigentum selbst.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  entwicklungPortfolio: "entwicklung.portfolio",
  entwicklungProjekt: "entwicklung.holen",
  entwicklungAuswahl: "entwicklung.auswahl",
  entwicklungAnlegen: "entwicklung.anlegen",
  entwicklungAendern: "entwicklung.aendern",
  entwicklungEintragSpeichern: "entwicklung.eintrag_speichern",
  entwicklungEintragLoeschen: "entwicklung.eintrag_loeschen",
  entwicklungAktion: "entwicklung.aktion",
  entwicklungAssistent: "entwicklung.assistent",
  entwicklungGutachterEinladen: "entwicklung.gutachter_einladen",
  entwicklungFristen: "entwicklung.fristen",
  entwicklungMeine: "entwicklung.meine",
  entwicklungExtern: "entwicklung.extern",
  entwicklungMeilensteinMelden: "entwicklung.meilenstein_melden",
  entwicklungRueckfrage: "entwicklung.rueckfrage",
  entwicklungDokumentSpeichern: "entwicklung.dokument_speichern",
  entwicklungDokumentLesen: "entwicklung.dokument_lesen",
  entwicklungEinladungInfo: "entwicklung.einladung_info",
  entwicklungEinladungAnnehmen: "entwicklung.einladung_annehmen",
  entwicklungZaehler: "entwicklung.zaehler",
});

export const entwicklungPortfolio = (n, filter = {}) => aufruf("entwicklungPortfolio", filter, n);
export const entwicklungProjekt = (n, id) => aufruf("entwicklungProjekt", { id }, n);
export const entwicklungAuswahl = (n) => aufruf("entwicklungAuswahl", {}, n);
export const entwicklungAnlegen = (n, daten = {}) => aufruf("entwicklungAnlegen", { daten }, n);
export const entwicklungAendern = (n, id, daten = {}) => aufruf("entwicklungAendern", { id, daten }, n);
export const entwicklungEintragSpeichern = (n, projektId, { art, id = null, daten = {} } = {}) => aufruf("entwicklungEintragSpeichern", { projektId, art, id, daten }, n);
export const entwicklungEintragLoeschen = (n, projektId, { art, id } = {}) => aufruf("entwicklungEintragLoeschen", { projektId, art, id }, n);
export const entwicklungAktion = (n, projektId, daten = {}) => aufruf("entwicklungAktion", { projektId, ...daten }, n);
export const entwicklungAssistent = (n, filter = {}) => aufruf("entwicklungAssistent", filter, n);
export const entwicklungGutachterEinladen = (n, projektId, daten = {}) => aufruf("entwicklungGutachterEinladen", { projektId, ...daten }, n);
export const entwicklungFristen = (n) => aufruf("entwicklungFristen", {}, n);
export const entwicklungMeine = (n) => aufruf("entwicklungMeine", {}, n);
export const entwicklungExtern = (n, id) => aufruf("entwicklungExtern", { id }, n);
export const entwicklungMeilensteinMelden = (n, projektId, meilensteinId, daten = {}) => aufruf("entwicklungMeilensteinMelden", { projektId, meilensteinId, ...daten }, n);
export const entwicklungRueckfrage = (n, projektId, daten = {}) => aufruf("entwicklungRueckfrage", { projektId, ...daten }, n);
/** Upload: Datei als Base64 (≤ 10 MB, Typ bereits an den ersten Bytes geprüft) – Frappe legt sie als private File ab */
export const entwicklungDokumentSpeichern = (n, { daten, ...rest } = {}) => aufruf("entwicklungDokumentSpeichern", { ...rest, inhalt: Buffer.from(daten).toString("base64") }, n);
export async function entwicklungDokumentLesen(n, id) {
  const r = await aufruf("entwicklungDokumentLesen", { id }, n);
  return { name: r.name, mime: r.mime, daten: Buffer.from(r.inhalt || "", "base64") };
}
export const entwicklungEinladungInfo = (token) => aufruf("entwicklungEinladungInfo", { token });
export const entwicklungEinladungAnnehmen = (n, token) => aufruf("entwicklungEinladungAnnehmen", { token }, n);
export const entwicklungZaehler = (n) => aufruf("entwicklungZaehler", {}, n);
