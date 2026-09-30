// GET  /api/admin/vorlagen – E-Mail-/Nachrichtenvorlagen mit Versionen
// POST /api/admin/vorlagen – anlegen { name, kanal: email|nachricht, betreff, text, kommentar? }
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer }) => ({ ok: true, vorlagen: await backend.vorlagen(nutzer) }));
export const POST = route({ admin: true }, async ({ backend, nutzer, body }) => ({ ok: true, vorlage: await backend.vorlageSpeichern(nutzer, null, body) }));
