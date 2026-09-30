// POST /api/admin/leitung/digest – { erzwingen? } Tages-Digest jetzt versenden (nur Leitung; im Betrieb läuft er täglich per Scheduler)
import { route } from "@/lib/plattform/server/route";
import { querschnittBackend } from "@/lib/plattform/backend/querschnitt";
import { leitungNoetig } from "@/lib/plattform/server/leitung";

export const POST = route({ admin: true }, async ({ nutzer, body }) => {
  leitungNoetig(nutzer);
  return { ok: true, ...(await querschnittBackend().digestLauf(nutzer, { erzwingen: body?.erzwingen === true })) };
});
