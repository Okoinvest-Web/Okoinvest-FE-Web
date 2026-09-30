// GET  /api/portal/dienste/eid/einstellungen – Compliance: eID-Regel und Verfahrensstatus
// POST /api/portal/dienste/eid/einstellungen – Compliance: { hochBestaetigt: bool } („eID mit hohem Vertrauensniveau = Identität bestätigt“)
import { route } from "@/lib/plattform/server/route";
import { eidBackend } from "@/lib/plattform/backend/eid";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await eidBackend().eidEinstellungen(nutzer)) }));

export const POST = route({ admin: true }, async ({ nutzer, body }) => eidBackend().eidEinstellungenSpeichern(nutzer, { hochBestaetigt: body.hochBestaetigt }));
