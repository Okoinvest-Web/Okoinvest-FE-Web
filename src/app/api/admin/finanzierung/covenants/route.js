// POST /api/admin/finanzierung/covenants – Covenant-Prüfung aller Fälle mit Kreditvertrag jetzt ausführen (sonst täglich;
//      Frappe: Scheduler) – schreiben
import { route } from "@/lib/plattform/server/route";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";

export const POST = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await finanzierungBackend().fzCovenantLauf(nutzer)) }));
