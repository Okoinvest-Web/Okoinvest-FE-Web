// src/lib/bericht/versand.js
//
// Bericht-Baustein (Welle 2, Paket B4): Darf eine Bestätigungs-Mail rausgehen?
//
//   versandErlaubt() === true NUR, wenn
//     (a) das Demo-Backend aktiv ist – die Mail landet dann im Demo-Postausgang (db.postausgang), es geht nichts raus,
//     oder
//     (b) ausdrücklich BERICHT_TESTVERSAND=1 gesetzt ist UND NEXT_PUBLIC_SITE_ENV nicht "production" ist
//         (Frappe-Testsystem; Frappe prüft zusätzlich site_config bericht_testversand, siehe api/bericht.py).
//   In jedem anderen Fall – insbesondere immer bei NEXT_PUBLIC_SITE_ENV=production – wird nichts versendet. Die
//   Oberfläche blendet das Formular dann aus und sagt ehrlich: „Berichtsversand startet mit dem Livegang.“
//   Es werden dann auch keine Namen oder E-Mail-Adressen angenommen (keine Datenerhebung ohne Zweck).
//
// Kein Versand unter dem Namen ÖkoInvest vor dem Livegang (Inhaber-Entscheidung).
// TODO Inhaber/B0: Absendername, Absenderadresse und Versanddomain (SPF/DKIM/DMARC) festlegen – erst danach
//                  darf (b) durch einen echten Produktionsschalter ersetzt werden.

import { backendName } from "@/lib/plattform/backend";

export const VERSAND_AUS_TEXT = "Berichtsversand startet mit dem Livegang.";

/** Absender – bewusst leer bis zur Entscheidung (TODO Inhaber/B0). Nie einen echten Namen eintragen, bevor live. */
export const ABSENDER = Object.freeze({ name: null, adresse: null, domain: null, hinweis: "offen: Absender und Versanddomain legt der Inhaber fest (B0)" }); // TODO Inhaber/B0

function aktivesBackend() {
  try {
    return backendName();
  } catch {
    return null;
  }
}

/**
 * @param {{ backend?: "demo"|"frappe"|null, env?: Record<string,string|undefined> }} [o] für Tests injizierbar
 * @returns {boolean}
 */
export function versandErlaubt({ backend, env = process.env } = {}) {
  const b = backend === undefined ? aktivesBackend() : backend;
  if (String(env.NEXT_PUBLIC_SITE_ENV || "").trim().toLowerCase() === "production") return false; // nie in Produktion
  if (b === "demo") return true;
  if (b === "frappe" && env.BERICHT_TESTVERSAND === "1") return true;
  return false;
}

/** Für GET /api/rechner/bericht und die Oberfläche: { versand, modus, text } – ohne Interna */
export function versandStatus(o = {}) {
  const b = o.backend === undefined ? aktivesBackend() : o.backend;
  const versand = versandErlaubt({ ...o, backend: b });
  return {
    versand,
    modus: !versand ? "aus" : b === "demo" ? "demo" : "testversand",
    text: versand ? "" : VERSAND_AUS_TEXT,
  };
}

/** Text der Bestätigungs-Mail (ohne Ergebnis, ohne Personendaten außer der Anrede-freien Ansprache) */
export function bestaetigungsMail({ rechnerTitel, link, stunden }) {
  return {
    betreff: `Bitte bestätigen: Ihr Bericht „${rechnerTitel}“`,
    text: `Sie haben auf unserer Website einen Bericht zum ${rechnerTitel} angefordert. Bitte öffnen Sie den Link und bestätigen Sie dort Ihre E-Mail-Adresse. Erst danach erstellen wir den Bericht. Der Link ist ${stunden} Stunden gültig. Haben Sie nichts angefordert, ignorieren Sie diese E-Mail bitte – dann verfallen Ihre Angaben automatisch.`,
    link,
    linkText: "Bericht bestätigen",
  };
}
