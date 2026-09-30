// GET  /api/admin/finanzen/pachtvertraege?status=&q= – Pachtverträge mit KYC-Auszahlungsstatus und nächster Zahlung
// POST /api/admin/finanzen/pachtvertraege – Vertrag anlegen { daten } (201)
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, vertraege: await finanzenBackend().pachtvertraege(nutzer, { status: suche.get("status") || "", q: suche.get("q") || "" }) }));

export const POST = route({ admin: true }, async ({ nutzer, body }) => {
  const vertrag = await finanzenBackend().pachtvertragSpeichern(nutzer, { daten: body.daten || body });
  return Response.json({ ok: true, vertrag }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
