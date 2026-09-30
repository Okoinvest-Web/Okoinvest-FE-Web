// src/lib/plattform/backend/frappe/kommune.js
//
// Frappe-Adapter „Fachprüfung Kommunen“ (Methode oekoinvest_app.plattform.api.kommune.uebersicht).
// Frappe prüft Rolle und Eigentum selbst (als_benutzer) – siehe api/kommune.py.

import { aufruf } from "../frappe";

export async function kommuneUebersicht(n, { vorgangId } = {}) {
  const r = (await aufruf("kommuneUebersicht", { vorgangId: vorgangId || null }, n)) || {};
  return { admin: !!r.admin, anliegen: Array.isArray(r.anliegen) ? r.anliegen : [], gemeinden: Array.isArray(r.gemeinden) ? r.gemeinden : [], geprueft: !!r.geprueft };
}

/** Nur Demo: Demo-Daten ergänzen – in Frappe nichts zu tun */
export async function fachDemoBereit() {}
