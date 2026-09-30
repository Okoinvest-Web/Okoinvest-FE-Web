// GET /api/admin/energie/wechsel – alle Lieferantenwechsel nach Zuschlag mit Fortschritt und überfälligen Schritten (Bereich „energie“ lesen)
import { route } from "@/lib/plattform/server/route";
import { kundenenergieBackend } from "@/lib/plattform/backend/kundenenergie";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, wechsel: await kundenenergieBackend().lieferantenwechsel(nutzer, { ausschreibungId: suche.get("ausschreibung") || "" }) }));
