// POST /api/admin/gesellschaften/fristen – Fristenlauf (Meldungen, Jahresabschluss, WiEReG) → Glocke für fällige Fristen ≤ 14 Tage
//      (Frappe: Scheduler täglich dienste.gesellschaft_fristen_taeglich)
import { route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const POST = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await diensteBackend().gesellschaftFristen(nutzer)) }));
