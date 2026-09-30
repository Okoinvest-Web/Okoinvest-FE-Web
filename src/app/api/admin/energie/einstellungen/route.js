// Einstellungen der Energiebeschaffung (Aufschlagsannahmen, Schwellen, Vergütungsparameter, Bestpreis-Regel, Demo-Kurve)
import { route } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await energieBackend().energieEinstellungen(nutzer)) }));
export const POST = route({ admin: true }, async ({ nutzer, body }) => ({ ok: true, ...(await energieBackend().energieEinstellungenSpeichern(nutzer, body)) }));
