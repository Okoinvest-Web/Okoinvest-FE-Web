// POST /api/admin/geodaten/kampagnen/nachfassen – fällige Nachfassstufen aller aktiven Kampagnen jetzt auslösen
// (läuft sonst automatisch beim Öffnen der Kampagnen bzw. täglich im Frappe-Scheduler)
import { route } from "@/lib/plattform/server/route";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";

const RECHT = [{ bereich: "geodaten", stufe: 2 }, { bereich: "akquise", stufe: 2 }];

export const POST = route({ admin: true, recht: RECHT }, async ({ nutzer }) => akquise2Backend().kampagnenNachfassen(nutzer));

