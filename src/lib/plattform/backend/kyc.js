// src/lib/plattform/backend/kyc.js
//
// Backend-Teil „KYC/KYB – Identitäts- und Firmenprüfung“ (eigene Schnittstelle, backend/index.js bleibt unverändert).
// Gleiche Auswahl wie backend(): Frappe bei PLATTFORM_BACKEND=frappe, sonst Demo (503 im Produktions-Build ohne PLATTFORM_DEMO=1).
//
// Operationen (n = angemeldeter Nutzer), Vertrag: docs/API.md Abschnitt „KYC/KYB“:
//   Nutzer:      kycFall(n) · kycSpeichern(n,{abschnitt,daten}) · kycDokumentSpeichern(n,{art,flaecheId,personId,ausgestelltAm,name,mime,daten})
//                kycDokumentLesen(n,id,{ip}) → {meta,daten} · kycDokumentLoeschen(n,id) · kycEinreichen(n,{ip}) · kycErneut(n)
//   Querschnitt: kycStatus(n|null,{kontoId|organisationId}) · kycFreigabePruefen(n,{schritt,kontoId,organisationId,flaecheId})
//   Compliance:  kycWarteschlange(n,{status,q}) · kycFallDetail(n,id,{ip}) · kycAktion(n,id,{aktion,…}) · kycEinstellungen(n)
//                kycEinstellungenSpeichern(n,daten) · kycSanktionsliste(n) · kycSanktionPruefen(n,{name,geburtsdatum,art}) · kycFristen(n,{stichtag})
//
// FÜR ANDERE TEAMS (serverseitig):
//   import { kycStatus, kycFreigabe } from "@/lib/plattform/backend/kyc";
//   const s = await kycStatus(nutzer);                      // bzw. kycStatus({ organisationId }) / kycStatus("U-26-…")
//   const f = await kycFreigabe("auszahlung", { kontoId, flaecheId });   // { ok, aktiv, gruende, hinweis }
//   Im Demo-Backend innerhalb einer Schreib-Transaktion: kycSperre(db, schritt, {kontoId,…}) aus backend/demo/kycRegeln.js.
//   Frappe: oekoinvest_app.plattform.kyc_kern.kyc_status(konto) bzw. kyc_sperre(schritt, konto_id=…, …).
//   Externe Prüfergebnisse: kycErgebnisAnhaengen(fallId|{kontoId}, { quelle, art, ergebnis, zusammenfassung, rohdatenRef })
//   bzw. im Demo-Transaktionskontext kycErgebnisAnhaengenDb(db, …); Frappe kyc_kern.ergebnis_anhaengen(fall_id, eintrag).
//
// Nur serverseitig verwenden.

import * as demo from "./demo/kyc";
import * as frappe from "./frappe/kyc";
import { backendName, KONFIG_FEHLER } from "./index";
import { PlattformFehler } from "../fehler";

export const KYC_OPERATIONEN = [
  "kycFall", "kycSpeichern", "kycDokumentSpeichern", "kycDokumentLesen", "kycDokumentLoeschen", "kycEinreichen", "kycErneut", "kycStatus",
  "kycFreigabePruefen", "kycWarteschlange", "kycFallDetail", "kycAktion", "kycEinstellungen", "kycEinstellungenSpeichern", "kycSanktionsliste",
  "kycSanktionPruefen", "kycFristen", "kycFreigabeSystem", "kycErgebnisAnhaengen",
];

if (process.env.NODE_ENV !== "production") {
  for (const [name, impl] of [["demo", demo], ["frappe", frappe]]) {
    const fehlt = KYC_OPERATIONEN.filter((op) => typeof impl[op] !== "function");
    if (fehlt.length) console.warn(`[plattform] KYC ${name}: fehlende Operationen ${fehlt.join(", ")}`);
  }
}

export function kycBackend() {
  const n = backendName();
  if (n === "frappe") return frappe;
  if (n === "demo") return demo;
  throw new PlattformFehler(503, KONFIG_FEHLER);
}

/**
 * KYC-Status eines Kontos oder einer Organisation (Systemaufruf ohne Nutzerkontext, nur serverseitig).
 * ziel: Nutzer-Objekt ({ id }) · Organisation ({ id, art } oder { organisationId }) · Kennung "U-…"/"O-…"
 * Liefert { status, verifiziert, kontotyp, fallId, bank: { vorhanden, geprueft }, eigentum: [flaecheIds], naechstePruefung, … }
 */
export async function kycStatus(ziel) {
  let kontoId = null;
  let organisationId = null;
  if (typeof ziel === "string") (ziel.startsWith("O-") ? (organisationId = ziel) : (kontoId = ziel));
  else if (ziel?.organisationId) organisationId = ziel.organisationId;
  else if (ziel?.rollen || ziel?.email) {
    kontoId = ziel.id;
    organisationId = ziel.organisation?.id || null;
  } else if (ziel?.id?.startsWith?.("O-")) organisationId = ziel.id;
  else kontoId = ziel?.id || null;
  return kycBackend().kycStatus(null, { kontoId, organisationId });
}

/**
 * Externes Prüfergebnis an einen KYC-Fall anhängen (für das Team „Dienste“: Identitätsanbieter, MRZ, Register, Bonität).
 * fall: "KY-…" oder { kontoId } / { organisationId }; eintrag: { quelle, art, ergebnis: ok|auffaellig|fehler|hinweis|ausstehend,
 * zusammenfassung, rohdatenRef?, externeId?, daten? }. Entscheidet nie selbst – die Compliance sieht es im Fall.
 */
export async function kycErgebnisAnhaengen(fall, eintrag) {
  return kycBackend().kycErgebnisAnhaengen(fall, eintrag);
}

/** Freigabe eines Schritts (Gating) als Systemaufruf: { ok, aktiv, gruende, hinweis } */
export async function kycFreigabe(schritt, { kontoId = null, organisationId = null, flaecheId = null } = {}) {
  return kycBackend().kycFreigabeSystem(schritt, { kontoId, organisationId, flaecheId });
}
