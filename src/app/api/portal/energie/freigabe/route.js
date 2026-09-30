// Kundenfreigabe des Zuschlagsvorschlags: POST {ausschreibungId, entscheidung: "freigegeben" | "abgelehnt", kommentar?}
import { route } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";

export const POST = route({ rollen: ["unternehmen"] }, async ({ nutzer, body, ip }) => ({ ok: true, ...(await energieBackend().energieFreigabe(nutzer, body.ausschreibungId, { entscheidung: body.entscheidung, kommentar: body.kommentar, ip })) }));
