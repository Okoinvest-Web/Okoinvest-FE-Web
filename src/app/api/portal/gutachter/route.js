// GET /api/portal/gutachter – eigene Anfragen und Aufträge des Gutachters (alle Projekte), Fristen, Kennzahlen (Rolle „gutachter“)
import { route } from "@/lib/plattform/server/route";
import { gutachterBackend } from "@/lib/plattform/backend/gutachter";

export const GET = route({ rollen: ["gutachter"] }, async ({ nutzer }) => ({ ok: true, ...(await gutachterBackend().gaMeine(nutzer)) }));
