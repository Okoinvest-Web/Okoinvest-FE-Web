// src/lib/plattform/backend/frappe/entwicklung-steuerung.js
//
// Frappe-Adapter „Projektentwicklung – Steuerung“. Methoden in oekoinvest_app.plattform.api.entwicklung_steuerung – Vertrag:
// docs/API.md, Abschnitt 11a. Signaturen identisch zu backend/demo/entwicklung-steuerung.js. Frappe prüft Rolle UND Eigentum.

// Der Geschäftsmodell-Vergleich wird wie bei der Finanzierung im Adapter gerechnet (finanzierung/geschaeftsmodell.js): Frappe
// liefert die Eingaben (Finanzierungsfall bzw. Standard), der Adapter rechnet und reicht das Ergebnis beim Einreichen einer
// Vorlage als Teil der Momentaufnahme an Frappe weiter (dort nur gespeichert, nicht gerechnet).

import { METHODEN, frappeAufruf as aufruf } from "../frappe";
import { geschaeftsmodellVergleich } from "../../finanzierung/geschaeftsmodell";
import { geschaeftsmodellKurz } from "../../entwicklung-steuerung";

Object.assign(METHODEN, {
  steuerungUebersicht: "entwicklung_steuerung.uebersicht",
  steuerungProjekt: "entwicklung_steuerung.projekt",
  steuerungKapazitaetSetzen: "entwicklung_steuerung.kapazitaet_setzen",
  steuerungSicherung: "entwicklung_steuerung.sicherung",
  steuerungAufgabenErzeugen: "entwicklung_steuerung.aufgaben_erzeugen",
  vorlageSpeichern: "entwicklung_steuerung.vorlage_speichern",
  vorlageHolen: "entwicklung_steuerung.vorlage_holen",
  vorlageAktion: "entwicklung_steuerung.vorlage_aktion",
});

export const steuerungUebersicht = (n) => aufruf("steuerungUebersicht", {}, n);
function gmRechnen(r) {
  const g = r?.geschaeftsmodellEingaben;
  if (!g?.eingaben) return null;
  try {
    return geschaeftsmodellKurz(geschaeftsmodellVergleich(g.eingaben, {}), { quelle: g.quelle, gewaehlt: g.gewaehlt || null });
  } catch {
    return null;
  }
}

export async function steuerungProjekt(n, projektId) {
  const r = await aufruf("steuerungProjekt", { projektId }, n);
  const { geschaeftsmodellEingaben: _g, ...rest } = r;
  return { ...rest, geschaeftsmodell: gmRechnen(r) };
}
export const steuerungKapazitaetSetzen = (n, nutzerId, { stundenMonat = null } = {}) => aufruf("steuerungKapazitaetSetzen", { nutzerId, stundenMonat }, n);
export const steuerungSicherung = (n, projektId, flaecheId, daten = {}) => aufruf("steuerungSicherung", { projektId, flaecheId, daten }, n);
export const steuerungAufgabenErzeugen = (n, { projektId = "" } = {}) => aufruf("steuerungAufgabenErzeugen", { projektId }, n);
export const vorlageSpeichern = (n, projektId, { id = null, daten = {} } = {}) => aufruf("vorlageSpeichern", { projektId, id, daten }, n);
export const vorlageHolen = (n, id) => aufruf("vorlageHolen", { id }, n);
export async function vorlageAktion(n, id, { aktion = "", begruendung = "", option = "" } = {}) {
  let geschaeftsmodell = null;
  if (aktion === "einreichen") {
    const x = await aufruf("vorlageHolen", { id }, n);
    geschaeftsmodell = gmRechnen(await aufruf("steuerungProjekt", { projektId: x.projektId }, n));
  }
  return aufruf("vorlageAktion", { id, aktion, begruendung, option, geschaeftsmodell }, n);
}
