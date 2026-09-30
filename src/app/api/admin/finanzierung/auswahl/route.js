// GET /api/admin/finanzierung/auswahl – Entwicklungsprojekte und Anlagen für „Fall anlegen“ – lesen
import { route } from "@/lib/plattform/server/route";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await finanzierungBackend().fzAuswahl(nutzer)) }));
