// GET  /api/admin/anlagen – Störungs-Leitstand (offene Störungen nach Priorität + Kennzahlen); Bereich „anlagen“ lesen
// POST /api/admin/anlagen – Anlage anlegen { name, typ, status, land, bundesland, ort, kwp, speicherKwh, speicherKw,
//      inbetriebnahme, lastprofil, lastJahrKwh, wechselrichterAnzahl, beschreibung, kundeId?, organisationId? } – schreiben
import { route } from "@/lib/plattform/server/route";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await anlagenBackend().anlagenLeitstand(nutzer)) }));

export const POST = route({ admin: true }, async ({ nutzer, body }) => {
  const anlage = await anlagenBackend().anlageAnlegen(nutzer, body);
  return Response.json({ ok: true, anlage }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
