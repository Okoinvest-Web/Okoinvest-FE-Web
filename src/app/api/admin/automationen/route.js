// GET  /api/admin/automationen?regel=&limit= – Regeln, Ausführungsprotokoll, Vorlagen, Konten (prüft dabei fällige Fristen)
// POST /api/admin/automationen – Regel anlegen { name, aktiv, beschreibung, ausloeser {typ, art, nach, von, frist, status, tage}, bedingungen [{feld, op, wert}], aktionen [{typ, …}] }
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer, suche }) => ({ ok: true, ...(await backend.automationen(nutzer, { regelId: suche.get("regel") || undefined, protokollLimit: Number(suche.get("limit")) || 200 })) }));
export const POST = route({ admin: true }, async ({ backend, nutzer, body }) => ({ ok: true, regel: await backend.automationSpeichern(nutzer, null, body) }));
