// POST /api/admin/vorlagen/senden – { vorlageId, kontaktId?, bezugArt?, bezugId? } → E-Mail (Postausgang) bzw. Portal-Nachricht
import { route } from "@/lib/plattform/server/route";

export const POST = route({ admin: true, recht: [{ bereich: "vorlagen", stufe: 1 }, { bereich: "crm", stufe: 2 }] }, async ({ backend, nutzer, body }) => backend.vorlageSenden(nutzer, body));
