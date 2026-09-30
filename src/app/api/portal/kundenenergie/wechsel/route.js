// GET /api/portal/kundenenergie/wechsel[?ausschreibung=EA-…] – Lieferantenwechsel nach Zuschlag
// Kunde: eigene Wechsel · Versorger: nur Wechsel des eigenen Zuschlags · Backoffice (Energie): alle
import { route } from "@/lib/plattform/server/route";
import { kundenenergieBackend } from "@/lib/plattform/backend/kundenenergie";

export const GET = route({ rollen: ["unternehmen", "lieferant"] }, async ({ nutzer, suche }) => ({ ok: true, wechsel: await kundenenergieBackend().lieferantenwechsel(nutzer, { ausschreibungId: suche.get("ausschreibung") || "" }) }));
