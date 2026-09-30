// GET  /api/portal/gutachter/[id] – eigener Auftrag (fremd → 403): Leistung, Angebot, Termine, Lieferungen, Rückfragen, Rechnungen
// POST /api/portal/gutachter/[id] – { aktion: angebot_abgeben {angebot} | anfrage_ablehnen {grund} | auftrag_bestaetigen {zustimmung}
//      | termin {termin} | termin_status {terminId,status,protokoll} | bericht {text,fortschritt} | rueckfrage {text,antwortAuf} }
//      Zustandsautomat und Prüfungen serverseitig (gutachter/kern.js); falscher Status → 409, Aktion der anderen Seite → 403
import { route } from "@/lib/plattform/server/route";
import { gutachterBackend } from "@/lib/plattform/backend/gutachter";

export const GET = route({ rollen: ["gutachter"] }, async ({ nutzer, params }) => ({ ok: true, auftrag: await gutachterBackend().gaAuftrag(nutzer, params.id) }));

export const POST = route({ rollen: ["gutachter"] }, async ({ nutzer, params, body, ip }) => gutachterBackend().gaAktion(nutzer, params.id, { ...body, ip }));
