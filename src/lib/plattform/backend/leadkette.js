// src/lib/plattform/backend/leadkette.js
//
// Backend-Teil „Lead-Kette“ (Welle 2, Paket B3) – eigene Schnittstelle, backend/index.js bleibt unverändert.
// Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo. Nur serverseitig verwenden.
//
// ── VERTRAG FÜR B4 (Bericht/DOI) und alle Versandstellen ─────────────────────────────────────────────────────
//
//   import { protokollAnhaengen, werbekanalErlaubt, werbekanalSicherstellen } from "@/lib/plattform/backend/leadkette";
//
//   await protokollAnhaengen({
//     email,                 // ODER pseudonym (64 Hex) – das Pseudonym berechnet der Server (HMAC-SHA-256 + Pepper)
//     art: "einwilligung" | "doi" | "widerruf" | "hinweis",
//     zweck: "bericht" | "newsletter" | "werbeanruf" | "weitergabe_partner"   (hinweis: nur "anfrage"),
//     textId: "bericht_doi",           // /^[a-z][a-z0-9_.-]{0,59}$/
//     textVersion: "ENTWURF-2026-10-03",// /^[A-Za-z][A-Za-z0-9_.:-]{0,39}$/
//     textHash: "<sha256 hex>",        // Hash des gezeigten Wortlauts; nur bei "widerruf" darf er "" sein
//     kanal: "web_formular" | "portal" | "doi_link" | "abmeldelink" | "backoffice" | "telefon" | "email",
//     land: "DE" | "AT" | "CH" | "unbekannt",
//     zeit?: ISO,                      // Standard: jetzt
//   })  → { id, zeit, hash }
//
//   await werbekanalErlaubt({ email | pseudonym, zweck })   → true | false
//   await werbekanalSicherstellen({ email | pseudonym, zweck }) → true, sonst PlattformFehler 403 „einwilligung_fehlt“
//
//   Regeln der Kanal-Ampel: true NUR nach ausdrücklicher Einwilligung; "newsletter" und "bericht" erst nach einem
//   folgenden Eintrag art "doi"; jeder spätere "widerruf" sperrt wieder. Keine mutmaßliche Einwilligung (auch nicht B2B).
//   Einträge enthalten nie Namen, E-Mail, Telefon oder IP (Muster je Feld, sonst 422).
//
// ── Backoffice (n = angemeldeter Nutzer, Bereich „Vorgänge“) ───────────────────────────────────────────────────
//   leadDesk(n,{land,tage}) · slaBericht(n,{tage}) · leadKetteStatus(n) · widerrufen(n,{vorgangId,zweck,kanal})
//   absageSetzen(n,vorgangId,{code,begruendung}) · personLoeschen(n,{vorgangId,grund}) · kanalStand({email|pseudonym})
//   ipAufraeumen() (Demo: zusätzlich bei jedem Zugriff; Frappe: täglicher Scheduler)

import * as demo from "./demo/leadkette";
import * as frappe from "./frappe/leadkette";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const LEADKETTE_OPERATIONEN = [
  "protokollAnhaengen", "werbekanalErlaubt", "werbekanalSicherstellen", "kanalStand", "ipAufraeumen",
  "leadDesk", "slaBericht", "leadKetteStatus", "widerrufen", "absageSetzen", "personLoeschen",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = LEADKETTE_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] Lead-Kette ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function leadketteBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}

/** Kurzformen (Vertrag oben) */
export const protokollAnhaengen = (eintrag) => leadketteBackend().protokollAnhaengen(eintrag);
export const werbekanalErlaubt = (args) => leadketteBackend().werbekanalErlaubt(args);
export const werbekanalSicherstellen = (args) => leadketteBackend().werbekanalSicherstellen(args);
