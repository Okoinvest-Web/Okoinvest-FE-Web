// GET  /api/admin/finanzierung/bankakte/[anfrageId] – Bank-Akte einer Anfrage (Bereich „finanzierung“ lesen)
// POST /api/admin/finanzierung/bankakte/[anfrageId] – Aktionen von ÖkoInvest (Bereich „finanzierung“ schreiben):
//      { aktion: anforderung_liefern {anforderungId,text,dateiIds[],bausteinFreigeben} | antwort {frageId,text,dateiIds[]}
//      | auszahlung_beantragen {betrag,wunschDatum,zweck} | bericht_einreichen {berichtId?|art,periode,dateiId?,bemerkung} }
import { route } from "@/lib/plattform/server/route";
import { bankakteBackend } from "@/lib/plattform/backend/bankakte";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, akte: await bankakteBackend().baAkte(nutzer, params.anfrageId) }));

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => bankakteBackend().baAktion(nutzer, params.anfrageId, body));
