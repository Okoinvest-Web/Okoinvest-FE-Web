// GET  /api/admin/gutachter?projektId=&status= – Gutachteraufträge (Bereich „entwicklung“ lesen), Kennzahlen, Gutachter mit Bewertung, Fristen
// POST /api/admin/gutachter – Leistungsanfrage { projektId, meilensteinId?, gutachterIds[], titel, fachgebiet, leistung, angebotsfrist,
//      wunschtermin?, hinweise? } → ein Auftrag je Gutachter (gemeinsame Gruppe für den Angebotsvergleich); Bereich „entwicklung“ schreiben
import { route } from "@/lib/plattform/server/route";
import { gutachterBackend } from "@/lib/plattform/backend/gutachter";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ...(await gutachterBackend().gaUebersicht(nutzer, { projektId: suche.get("projektId") || "", status: suche.get("status") || "" })) }));

export const POST = route({ admin: true }, async ({ nutzer, body }) => {
  const r = await gutachterBackend().gaAnfrageAnlegen(nutzer, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
