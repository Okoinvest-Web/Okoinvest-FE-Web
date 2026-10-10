// src/lib/newsletter/versand.js – Darf der Newsletter Anmeldungen annehmen und Mails erzeugen? (Welle 3, Paket NL)
//
//   newsletterAktiv() === true NUR, wenn das Demo-Backend läuft UND NEXT_PUBLIC_SITE_ENV nicht "production" ist.
//   Im Demo-Modus landen alle Mails im Demo-Postausgang (db.postausgang) – es geht nichts raus.
//   In jedem anderen Fall (Frappe, Produktion) nimmt der Server KEINE Adressen an; der Baustein zeigt ehrlich
//   „Der Newsletter startet mit dem Livegang.“ (keine Datenerhebung ohne Zweck).
//
// TODO Inhaber/B0 + Betrieb: Versanddienst mit AVV (EU), Absendername/-adresse und Versanddomain (SPF, DKIM, DMARC),
//   Frappe-Spiegel (Abo-DocType, DOI, Abmeldung) – erst danach einen echten Produktionsschalter ergänzen.

import { backendName } from "@/lib/plattform/backend";

function aktivesBackend() {
  try {
    return backendName();
  } catch {
    return null;
  }
}

/**
 * @param {{ backend?: string|null, env?: Record<string,string|undefined> }} [o] für Tests injizierbar
 */
export function newsletterAktiv({ backend, env = process.env } = {}) {
  const b = backend === undefined ? aktivesBackend() : backend;
  if (String(env.NEXT_PUBLIC_SITE_ENV || "").trim().toLowerCase() === "production") return false;
  return b === "demo";
}

/** Für GET /api/newsletter: { aktiv, modus } – ohne Interna */
export function newsletterStatus(o = {}) {
  const aktiv = newsletterAktiv(o);
  return { aktiv, modus: aktiv ? "demo" : "aus" };
}
