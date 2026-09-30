// POST   /api/admin/geodaten/gemeinden/konkurrenz { schluessel, name, land, bundesland, entwickler, projekt, mw, ha, status, quelle }
// DELETE /api/admin/geodaten/gemeinden/konkurrenz { schluessel, id }
import { route } from "@/lib/plattform/server/route";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";

const RECHT = [{ bereich: "geodaten", stufe: 2 }, { bereich: "akquise", stufe: 2 }];

export const POST = route({ admin: true, recht: RECHT }, async ({ nutzer, body }) => {
  const r = await akquise2Backend().konkurrenzAnlegen(nutzer, body.schluessel, body);
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
export const DELETE = route({ admin: true, recht: RECHT }, async ({ nutzer, body }) => akquise2Backend().konkurrenzEntfernen(nutzer, body?.schluessel, body?.id));

