// src/lib/plattform/backend/frappe/onboarding.js
//
// Frappe-Adapter „Onboarding-Assistenten“ (Methoden in oekoinvest_app.plattform.api.onboarding). Frappe prüft selbst:
// nur das eigene Konto, Pfad passt zu den Rollen, Schritt existiert und ist bestätigbar, Untertyp erlaubt (Backoffice:
// nur eigene Unterrollen), Team-Sicht nur Leitung. Die Auswertung aus echten Daten liefert der Website-Server mit.

import { METHODEN, frappeAufruf as aufruf } from "../frappe";
import { pfadZustandBereinigen } from "../../onboarding/motor";

Object.assign(METHODEN, {
  onbZustand: "onboarding.zustand",
  onbSpeichern: "onboarding.speichern",
  onbMail: "onboarding.mail",
  onbTeam: "onboarding.team",
  onbMailLauf: "onboarding.mail_lauf",
});

export const onbZustand = async (n) => pfadZustandBereinigen(await aufruf("onbZustand", {}, n));
export const onbSpeichern = async (n, zustand, { aktion = null, auswertung = null, protokollText = "" } = {}) =>
  pfadZustandBereinigen(await aufruf("onbSpeichern", { zustand, aktion, auswertung, protokollText }, n));
export const onbMail = (n, art, { pfadTitel = "", offen = 0 } = {}) => aufruf("onbMail", { art, pfadTitel, offen }, n);
export const onbTeam = async (n) => ((await aufruf("onbTeam", {}, n)) || []);
export const onbMailLauf = (n) => aufruf("onbMailLauf", {}, n);
