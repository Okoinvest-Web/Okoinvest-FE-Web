// GET /api/admin/grundbuch/fristen – überfällige Schritte aller offenen Akten (Frappe: täglicher Scheduler mit Erinnerung)
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await closingBackend().gbFristenLauf(nutzer)) }));
