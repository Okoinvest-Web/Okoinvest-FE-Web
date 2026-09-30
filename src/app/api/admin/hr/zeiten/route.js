// GET  /api/admin/hr/zeiten?monat=YYYY-MM&konto=&projekt= – Zeiteinträge (eigene; mit „team“ lesen auch andere)
// POST /api/admin/hr/zeiten – { datum, stunden, projektId | erpProjekt, taetigkeit, text?, kontoId? } Zeit erfassen
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({
  ok: true,
  ...(await serviceBackend().zeiten(nutzer, { monat: suche.get("monat") || "", kontoId: suche.get("konto") || "", projektId: suche.get("projekt") || "" })),
}));

export const POST = route({ admin: true, recht: [{ bereich: "team", stufe: 1 }] }, async ({ nutzer, body }) => {
  const zeit = await serviceBackend().zeitErfassen(nutzer, body);
  return Response.json({ ok: true, zeit }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
