// GET /api/admin/finanzen/vpi – Index-Reihen und Werte (VPI AT/DE, LIK CH)
// PUT /api/admin/finanzen/vpi – { reihe, jahr, wert, quelle? } Wert pflegen (schreiben)
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await finanzenBackend().vpiWerte(nutzer)) }));

export const PUT = route({ admin: true }, async ({ nutzer, body }) => ({ ok: true, wert: await finanzenBackend().vpiSpeichern(nutzer, body) }));
