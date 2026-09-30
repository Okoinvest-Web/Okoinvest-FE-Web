// Lieferantenstamm: GET Liste (Teilnahme, Bewertung, KYB) · POST {daten} neuer Versorger
import { route } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, lieferanten: await energieBackend().energieLieferanten(nutzer) }));
export const POST = route({ admin: true }, async ({ nutzer, body }) => ({ ok: true, lieferant: await energieBackend().energieLieferantSpeichern(nutzer, { daten: body.daten && typeof body.daten === "object" ? body.daten : {} }) }));
