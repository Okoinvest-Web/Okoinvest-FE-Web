// GET /api/admin/finanzen – Finanz-Cockpit (Kennzahlen, offene Posten, Mahnvorschläge, Läufe, Zahlungsläufe, Hinweise).
// Bereich „finanzen“ lesen (Rechte-Matrix, server/route.js); das Backend prüft erneut.
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await finanzenBackend().finanzCockpit(nutzer)) }));
