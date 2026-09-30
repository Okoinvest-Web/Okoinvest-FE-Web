// Kunde (Backoffice): GET Detail · POST {vertragId?, daten} Stromvertrag anlegen/ändern
import { route } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, kunde: await energieBackend().energieKunde(nutzer, params.id) }));
export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({
  ok: true,
  vertrag: await energieBackend().energieVertragSpeichern(nutzer, { id: body.vertragId || null, kundeId: params.id, daten: body.daten && typeof body.daten === "object" ? body.daten : {} }),
}));
