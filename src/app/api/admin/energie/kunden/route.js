// Kundenliste der Energiebeschaffung mit Wechselanalyse (Empfehlung, Frist)
import { route } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, kunden: await energieBackend().energieKunden(nutzer) }));
