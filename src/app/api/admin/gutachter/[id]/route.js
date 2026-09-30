// GET  /api/admin/gutachter/[id] – Auftrag inkl. Angebotsvergleich der Gruppe, interner Bewertung und Notiz
// POST /api/admin/gutachter/[id] – { aktion: beauftragen {liefertermin,bedingungen} | angebot_ablehnen {grund} | maengel {lieferungId,maengel[]}
//      | freigeben {lieferungId} | abnehmen {vorbehalt} | stornieren {grund} | liefertermin {liefertermin,grund} | termin | termin_status
//      | rueckfrage | rechnung_pruefen {rechnungId,ergebnis,kommentar} | bewerten {bewertung} | notiz {notiz} }
import { route } from "@/lib/plattform/server/route";
import { gutachterBackend } from "@/lib/plattform/backend/gutachter";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, auftrag: await gutachterBackend().gaAuftrag(nutzer, params.id) }));

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => gutachterBackend().gaAktion(nutzer, params.id, body));
