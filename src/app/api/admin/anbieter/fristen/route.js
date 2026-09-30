// POST /api/admin/anbieter/fristen – Erinnerung an überfällige Rückfragen (Frappe: täglicher Scheduler anbieter.frist_lauf)
import { route } from "@/lib/plattform/server/route";
import { anbieterBackend } from "@/lib/plattform/backend/anbieter";

export const POST = route({ admin: true, recht: "projekte" }, async ({ nutzer }) => ({ ok: true, ...(await anbieterBackend().anbieterFristLauf(nutzer)) }));
