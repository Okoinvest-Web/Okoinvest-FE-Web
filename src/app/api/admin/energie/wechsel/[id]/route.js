// POST /api/admin/energie/wechsel/[id] – Schritt für den Kunden bzw. Versorger bestätigen { schritt, bemerkung? } (Bereich „energie“ schreiben)
import { route } from "@/lib/plattform/server/route";
import { kundenenergieBackend } from "@/lib/plattform/backend/kundenenergie";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, wechsel: await kundenenergieBackend().lieferantenwechselAktion(nutzer, params.id, body) }));
