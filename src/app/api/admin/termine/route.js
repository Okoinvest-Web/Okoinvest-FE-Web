// GET  /api/admin/termine?von=&bis=&mitarbeiter=&status= – alle Termine (Bereich „kalender“ lesen; löst fällige Erinnerungen aus)
// POST /api/admin/termine – für ein Konto oder einen Kontakt buchen { art, start, fuerKontoId? | kontakt, mitarbeiterId?, notiz?, ort? }
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({
  ok: true,
  termine: await serviceBackend().termine(nutzer, { alle: true, von: suche.get("von") || "", bis: suche.get("bis") || "", mitarbeiterId: suche.get("mitarbeiter") || "", status: suche.get("status") || "" }),
}));

export const POST = route({ admin: true }, async ({ nutzer, body, ip }) => {
  const r = await serviceBackend().terminBuchen(nutzer, body, { ip });
  return Response.json({ ok: true, termin: r.termin }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
