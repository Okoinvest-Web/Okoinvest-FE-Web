// POST /api/portal/eg/[id]/import/ausfuehren – Import übernehmen { importId, ohneFehlerzeilen?, tarifUebernehmen? } (WP5 → WP1 egCsvImport,
//   egMassenaktion, egTarifSpeichern; danach Ereignis eg.import.uebernommen an WP2 für den EC_PODLIST-Abgleich)
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const POST = route({}, async ({ nutzer, body }) => ({ ok: true, ...(await egBackend().grImportAusfuehren(nutzer, String(body?.importId || ""), { ohneFehlerzeilen: body?.ohneFehlerzeilen !== false, tarifUebernehmen: body?.tarifUebernehmen !== false })) }));
