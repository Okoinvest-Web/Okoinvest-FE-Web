// GET  /api/portal/eg/[id]/abrechnung/mahnlauf – Mahnvorschläge (faire Stufen, schutzbedürftige Haushalte gebührenfrei);
//      ?mandate=1 – SEPA-Mandate mit Prüfung (Referenz, Datum, Verfall nach 36 Monaten)
// POST … – { belegIds? } Mahnungen erstellen
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const GET = route({}, async ({ nutzer, params, suche }) => {
  const b = egBackend();
  if (suche.get("mandate") === "1") return { ok: true, ...(await b.abMandate(nutzer, params.id)) };
  return { ok: true, ...(await b.abMahnlauf(nutzer, params.id, {})) };
});

export const POST = route({}, async ({ nutzer, params, body }) => ({ ok: true, ...(await egBackend().abMahnlauf(nutzer, params.id, { ausfuehren: true, belegIds: Array.isArray(body?.belegIds) ? body.belegIds.map(String) : [] })) }));
