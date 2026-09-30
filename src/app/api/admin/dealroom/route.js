// GET /api/admin/dealroom – Moderationsschlange (Fragen/Antworten), Fragen beim Anbieter, Bieterverfahren, Kennzahlen
import { route } from "@/lib/plattform/server/route";
import { dealroom } from "@/lib/plattform/backend/dealroom";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, uebersicht: await dealroom().dealroomUebersicht(nutzer) }));
