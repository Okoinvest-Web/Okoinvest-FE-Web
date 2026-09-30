// src/lib/plattform/backend/frappe/sicherheit.js
//
// Frappe-Adapter „Login, Sicherheit & Teams“. Methoden in oekoinvest_app.plattform.api.{sicherheit,organisation}
// – Vertrag: docs/API.md, Abschnitt 8. Signaturen identisch zu backend/demo/sicherheit.js und backend/demo/organisation.js.
// Der TOTP-Schlüssel liegt in Frappe verschlüsselt (Password-Feld) und verlässt Frappe nur einmal bei der Einrichtung.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  sitzungAnlegen: "sicherheit.sitzung_anlegen",
  sitzungen: "sicherheit.sitzungen",
  sitzungBeenden: "sicherheit.sitzung_beenden",
  anmeldungen: "sicherheit.anmeldungen",
  geraete: "sicherheit.geraete",
  geraetVergessen: "sicherheit.geraet_vergessen",
  geraetVertraut: "sicherheit.geraet_vertraut",
  zweiFaktorStatus: "sicherheit.zwei_faktor_status",
  zweiFaktorStarten: "sicherheit.zwei_faktor_starten",
  zweiFaktorBestaetigen: "sicherheit.zwei_faktor_bestaetigen",
  zweiFaktorDeaktivieren: "sicherheit.zwei_faktor_deaktivieren",
  wiederherstellungscodesNeu: "sicherheit.wiederherstellungscodes_neu",
  zweiFaktorPruefen: "sicherheit.zwei_faktor_pruefen",
  zweiFaktorPflicht: "sicherheit.pflicht_lesen",
  zweiFaktorPflichtSpeichern: "sicherheit.pflicht_speichern",
  magicLinkAnfordern: "sicherheit.magic_link_anfordern",
  magicLinkEinloesen: "sicherheit.magic_link_einloesen",
  komfortSpeichern: "sicherheit.komfort_speichern",
  emailAendernAnfordern: "sicherheit.email_aendern_anfordern",
  emailAendernBestaetigen: "sicherheit.email_aendern_bestaetigen",
  datenExport: "sicherheit.daten_export",
  kontoLoeschen: "sicherheit.konto_loeschen",
  organisationen: "organisation.liste",
  organisationAnlegen: "organisation.anlegen",
  organisation: "organisation.holen",
  organisationAendern: "organisation.aendern",
  organisationLoeschen: "organisation.loeschen",
  einladungAnlegen: "organisation.einladen",
  einladungWiderrufen: "organisation.einladung_widerrufen",
  einladungInfo: "organisation.einladung_info",
  einladungAnnehmen: "organisation.einladung_annehmen",
  mitgliedAendern: "organisation.mitglied_aendern",
  mitgliedEntfernen: "organisation.mitglied_entfernen",
  organisationWechseln: "organisation.wechseln",
  objektZuordnen: "organisation.zuordnen",
});

// ---------------------------------------------------------------- Sitzungen & Geräte
// sitzungAnlegen/sitzungBeenden brauchen die Sitzungskennung der aktuellen Sitzung (sitzungId)
export const sitzungAnlegen = (n, daten = {}) => aufruf("sitzungAnlegen", daten, n);
export const sitzungen = (n) => aufruf("sitzungen", { sitzungId: n?.sitzung?.id || null }, n);
export const sitzungBeenden = (n, { id, alleAnderen } = {}) => aufruf("sitzungBeenden", { id: id || null, alleAnderen: !!alleAnderen, sitzungId: n?.sitzung?.id || null }, n);
export const anmeldungen = (n, { limit } = {}) => aufruf("anmeldungen", { limit }, n);
export const geraete = (n, { geraetToken } = {}) => aufruf("geraete", { geraetToken: geraetToken || "" }, n);
export const geraetVergessen = (n, id) => aufruf("geraetVergessen", { id }, n);
export const geraetVertraut = async ({ nutzerId, geraetToken } = {}) => !!(await aufruf("geraetVertraut", { nutzerId, geraetToken }));

// ---------------------------------------------------------------- Zwei-Faktor
export const zweiFaktorStatus = (n) => aufruf("zweiFaktorStatus", {}, n);
export const zweiFaktorStarten = (n) => aufruf("zweiFaktorStarten", {}, n);
export const zweiFaktorBestaetigen = (n, { code } = {}) => aufruf("zweiFaktorBestaetigen", { code }, n);
export const zweiFaktorDeaktivieren = (n, { passwort, code } = {}) => aufruf("zweiFaktorDeaktivieren", { passwort, code }, n);
export const wiederherstellungscodesNeu = (n, { code } = {}) => aufruf("wiederherstellungscodesNeu", { code }, n);
export const zweiFaktorPruefen = (daten = {}) => aufruf("zweiFaktorPruefen", daten);
export const zweiFaktorPflicht = (n) => aufruf("zweiFaktorPflicht", {}, n);
export const zweiFaktorPflichtSpeichern = (n, { rollen } = {}) => aufruf("zweiFaktorPflichtSpeichern", { rollen }, n);

// ---------------------------------------------------------------- E-Mail-Link, Konto
export const magicLinkAnfordern = (daten = {}) => aufruf("magicLinkAnfordern", daten);
export const magicLinkEinloesen = ({ token } = {}) => aufruf("magicLinkEinloesen", { token });
export const komfortSpeichern = (n, komfort = {}) => aufruf("komfortSpeichern", { komfort }, n);
export const emailAendernAnfordern = (n, daten = {}) => aufruf("emailAendernAnfordern", daten, n);
export const emailAendernBestaetigen = ({ token } = {}) => aufruf("emailAendernBestaetigen", { token });
export const datenExport = (n) => aufruf("datenExport", {}, n);
export const kontoLoeschen = (n, daten = {}) => aufruf("kontoLoeschen", daten, n);

// ---------------------------------------------------------------- Organisationen & Teams
export const organisationen = (n) => aufruf("organisationen", {}, n);
export const organisationAnlegen = (n, daten = {}) => aufruf("organisationAnlegen", { daten }, n);
export const organisation = (n, id) => aufruf("organisation", { id }, n);
export const organisationAendern = (n, id, daten = {}) => aufruf("organisationAendern", { id, daten }, n);
export const organisationLoeschen = (n, id) => aufruf("organisationLoeschen", { id }, n);
export const einladungAnlegen = (n, id, daten = {}) => aufruf("einladungAnlegen", { id, ...daten }, n);
export const einladungWiderrufen = (n, id, einladungId) => aufruf("einladungWiderrufen", { id, einladungId }, n);
export const einladungInfo = (token) => aufruf("einladungInfo", { token });
export const einladungAnnehmen = (n, token) => aufruf("einladungAnnehmen", { token }, n);
export const mitgliedAendern = (n, id, mitgliedId, daten = {}) => aufruf("mitgliedAendern", { id, mitgliedId, ...daten }, n);
export const mitgliedEntfernen = (n, id, mitgliedId) => aufruf("mitgliedEntfernen", { id, mitgliedId }, n);
export const organisationWechseln = (n, organisationId) => aufruf("organisationWechseln", { organisationId: organisationId || null, sitzungId: n?.sitzung?.id || null }, n);
export const objektZuordnen = (n, daten = {}) => aufruf("objektZuordnen", daten, n);
