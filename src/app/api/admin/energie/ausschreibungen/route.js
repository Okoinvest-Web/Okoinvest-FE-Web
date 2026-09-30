// Ausschreibungen (Backoffice): GET Liste · POST anlegen {titel, kundenIds[], zone, lieferbeginn, produkte[], lieferantIds[],
// bestpreis, kommune, starten, frist, mengen?} – jeder Kunde braucht eine aktive Beschaffungsvollmacht (sonst 409)
import { route, basisUrl } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ausschreibungen: await energieBackend().energieAusschreibungen(nutzer, { status: suche.get("status") || "" }) }));
export const POST = route({ admin: true }, async ({ nutzer, body, request }) => {
  const a = await energieBackend().energieAusschreibungAnlegen(nutzer, { ...body, basisUrl: basisUrl(request) });
  return Response.json({ ok: true, ausschreibung: a }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
