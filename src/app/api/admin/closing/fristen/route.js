// GET /api/admin/closing/fristen – überfällige Closing Conditions aller offenen Deals (Frappe: täglicher Scheduler mit Erinnerung)
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await closingBackend().clFristenLauf(nutzer)) }));
