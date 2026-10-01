// POST /api/admin/fristen/erinnerungen – Fristerinnerungen jetzt senden (Pachtakte, Genossenschaft, Gemeinde);
// Frappe: täglicher Scheduler frist_erinnerung.erinnerungen_taeglich. Jede Erinnerungsstufe wird genau einmal gemeldet.
import { route } from "@/lib/plattform/server/route";
import { fristErinnerungBackend } from "@/lib/plattform/backend/fristErinnerung";

export const POST = route({ admin: true }, async ({ nutzer }) => fristErinnerungBackend().fristErinnerungLauf(nutzer));
