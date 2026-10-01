// src/lib/plattform/backend/frappe/fristErinnerung.js
//
// Frappe-Adapter „Fristerinnerungen“ – oekoinvest_app.plattform.api.frist_erinnerung (prüft Rolle selbst, als_benutzer).

import { METHODEN, frappeAufruf as aufruf } from "../frappe";

Object.assign(METHODEN, {
  fristErinnerungLauf: "frist_erinnerung.lauf",
});

export const fristErinnerungLauf = (n) => aufruf("fristErinnerungLauf", {}, n);
