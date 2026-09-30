// „Meine Energiebeschaffung“ (Rolle unternehmen): GET Übersicht · POST {vertragId?, daten} eigenen Stromvertrag pflegen
import { route } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";

export const GET = route({ rollen: ["unternehmen"] }, async ({ nutzer }) => ({ ok: true, ...(await energieBackend().energieMeine(nutzer)) }));
export const POST = route({ rollen: ["unternehmen"] }, async ({ nutzer, body }) => ({ ok: true, vertrag: await energieBackend().energieVertragSpeichern(nutzer, { id: body.vertragId || null, daten: body.daten && typeof body.daten === "object" ? body.daten : {} }) }));
