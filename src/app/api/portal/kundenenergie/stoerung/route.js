// POST /api/portal/kundenenergie/stoerung – Contracting-Kunde meldet eine Störung { anlageId, titel, text?, auswirkung: kein_ertrag|weniger_ertrag|sicherheit|sonstiges }
// Nur eigene Anlage (Konto bzw. Teamrolle mit Schreibrecht); der Betrieb wird benachrichtigt, Quittieren/Beheben bleibt beim Betrieb.
import { route } from "@/lib/plattform/server/route";
import { grenze, rateLimit } from "@/lib/plattform/server/rateLimit";
import { kundenenergieBackend } from "@/lib/plattform/backend/kundenenergie";

export const POST = route({ rollen: ["unternehmen"] }, async ({ nutzer, body }) => {
  rateLimit(`kundenstoerung:${nutzer.id}`, ...grenze("anfrage"));
  return Response.json({ ok: true, stoerung: await kundenenergieBackend().kundenStoerungMelden(nutzer, body) }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
