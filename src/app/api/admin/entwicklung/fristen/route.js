// POST /api/admin/entwicklung/fristen – Fristen-Erinnerungen jetzt ausführen (≤ 7 Tage bzw. überfällig, je Stufe einmal).
//      Im Betrieb täglich per Frappe-Scheduler (oekoinvest_app.plattform.api.entwicklung.fristen_taeglich).
import { route } from "@/lib/plattform/server/route";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";

export const POST = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await entwicklungBackend().entwicklungFristen(nutzer)) }));
