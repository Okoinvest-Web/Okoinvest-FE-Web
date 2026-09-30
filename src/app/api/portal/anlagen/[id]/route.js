// GET /api/portal/anlagen/[id] – Detail mit Stammdaten, Live-Wert, Summen, Ampel, Kosten (fremde Anlage → 403)
import { route } from "@/lib/plattform/server/route";
import { anlageMitStatus } from "@/lib/plattform/messdaten/auswertung";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, anlage: await anlageMitStatus(nutzer, params.id) }));
