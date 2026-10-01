// src/lib/plattform/server/eg-aktion.js
//
// Gemeinsame Stammdaten-Aktionen des Moduls Energiegemeinschaften (WP1) für die Routen /api/admin/eg/[id] (Backoffice) und
// /api/portal/eg/[id]/verwaltung (Organe). Rechte je Kontext-Rolle prüft das Backend (eg/rechte.js) – hier nur Verteilung.
// CSV-Antwort: csvAntwort(r) mit BOM, Download-Kopfzeilen, nosniff.

import { egBackend } from "../backend/eg";
import { PlattformFehler } from "../fehler";

export const EG_AKTIONEN = ["speichern", "status", "organ", "organ_beenden", "mitglied", "mitglied_status", "zaehlpunkt", "teilnahme", "teilnahme_uebergang", "anlage", "tarif", "verteilschluessel", "massen", "csv_import"];

export async function egAktion(nutzer, gemeinschaftId, body = {}) {
  const b = egBackend();
  const { aktion, id = null, daten = {} } = body || {};
  const g = gemeinschaftId;
  switch (aktion) {
    case "speichern": return { ok: true, gemeinschaft: await b.egGemeinschaftSpeichern(nutzer, { id: g, daten }) };
    case "status": return { ok: true, gemeinschaft: await b.egGemeinschaftStatus(nutzer, g, { nach: body.nach, grund: body.grund, nachfolgerId: body.nachfolgerId }) };
    case "organ": return { ok: true, organ: await b.egOrganSpeichern(nutzer, { gemeinschaftId: g, id, daten }) };
    case "organ_beenden": return { ok: true, organ: await b.egOrganBeenden(nutzer, id, { bis: body.bis }) };
    case "mitglied": return { ok: true, mitglied: await b.egMitgliedSpeichern(nutzer, { gemeinschaftId: g, id, daten }) };
    case "mitglied_status": return { ok: true, mitglied: await b.egMitgliedStatus(nutzer, id, { nach: body.nach, grund: body.grund, zum: body.zum }) };
    case "zaehlpunkt": return { ok: true, ...(await b.egZaehlpunktSpeichern(nutzer, { gemeinschaftId: g, id, daten })) };
    case "teilnahme": return { ok: true, teilnahme: await b.egTeilnahmeSpeichern(nutzer, { gemeinschaftId: g, id, daten }) };
    case "teilnahme_uebergang": return { ok: true, teilnahme: await b.egTeilnahmeUebergang(nutzer, id, { ereignis: body.ereignis, datum: body.datum, consentId: body.consentId, teilnahmefaktor: body.teilnahmefaktor, grund: body.grund }) };
    case "anlage": return { ok: true, anlage: await b.egAnlageSpeichern(nutzer, { gemeinschaftId: g, id, daten }) };
    case "tarif": return { ok: true, tarif: await b.egTarifSpeichern(nutzer, { gemeinschaftId: g, id, daten }) };
    case "verteilschluessel": return { ok: true, verteilschluessel: await b.egVerteilschluesselSpeichern(nutzer, { gemeinschaftId: g, id, daten }) };
    case "massen": return { ok: true, ...(await b.egMassenaktion(nutzer, g, { aktion: body.massenaktion, ids: body.ids, werte: body.werte })) };
    case "csv_import": return { ok: true, ...(await b.egCsvImport(nutzer, g, { art: "mitglieder", csv: body.csv, ausfuehren: body.ausfuehren === true })) };
    default: throw new PlattformFehler(422, "Unbekannte Aktion.");
  }
}

export function csvAntwort(r) {
  return new Response(r.csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${String(r.dateiname).replace(/"/g, "")}"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
