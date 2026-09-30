// GET /api/admin/finanzen/klaerfaelle?status=offen|erledigt|verworfen|alle – Klärfälle aus den Abrechnungsläufen
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, klaerfaelle: await finanzenBackend().klaerfaelle(nutzer, { status: suche.get("status") || "offen" }) }));
