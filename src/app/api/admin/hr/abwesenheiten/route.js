// GET  /api/admin/hr/abwesenheiten?von=&bis=&konto= – Abwesenheiten (alle mit „team“ lesen, sonst eigene)
// POST /api/admin/hr/abwesenheiten – { mitarbeiterId?, von, bis, art, vertretungId?, bemerkung? } → automatische Vertretung
//      (eigene Abwesenheit: jedes Backoffice-Konto; fremde: Leitung – prüft das Backend)
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

const RECHT = [{ bereich: "team", stufe: 1 }];

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({
  ok: true,
  abwesenheiten: await serviceBackend().abwesenheiten(nutzer, { von: suche.get("von") || "", bis: suche.get("bis") || "", kontoId: suche.get("konto") || "" }),
}));

export const POST = route({ admin: true, recht: RECHT }, async ({ nutzer, body }) => {
  const r = await serviceBackend().abwesenheitAnlegen(nutzer, body);
  return Response.json({ ok: true, ...r }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
