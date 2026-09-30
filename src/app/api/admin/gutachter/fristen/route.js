// POST /api/admin/gutachter/fristen – Fristen-Lauf der Gutachteraufträge von Hand (sonst täglich; Frappe: Scheduler)
import { route } from "@/lib/plattform/server/route";
import { gutachterBackend } from "@/lib/plattform/backend/gutachter";

export const POST = route({ admin: true, recht: [{ bereich: "entwicklung", stufe: 1 }] }, async ({ nutzer }) => ({ ok: true, ...(await gutachterBackend().gaFristen(nutzer)) }));
