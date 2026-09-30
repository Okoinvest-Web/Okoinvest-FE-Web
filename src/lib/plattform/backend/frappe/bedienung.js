// src/lib/plattform/backend/frappe/bedienung.js
//
// Frappe-Adapter „Bedienung & Onboarding“ (Methoden in oekoinvest_app.plattform.api.bedienung).
// Die Frappe-App prüft Rolle UND Eigentum selbst (als_benutzer) – siehe bedienung.py.

import { aufruf } from "../frappe";
import { istPortalPfad } from "../../suche";

export async function suchen(n, { q, limit } = {}) {
  const r = (await aufruf("suchen", { q, limit }, n)) || {};
  // Zweite Verteidigungslinie: nur interne Portal-Pfade an den Browser
  return { q: r.q || "", treffer: (Array.isArray(r.treffer) ? r.treffer : []).filter((t) => istPortalPfad(t?.href)) };
}

export const onboarding = (n) => aufruf("onboarding", {}, n);
export const onboardingSpeichern = (n, aenderung) => aufruf("onboardingSpeichern", { daten: aenderung }, n);
