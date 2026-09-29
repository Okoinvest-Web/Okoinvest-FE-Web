// GET /api/admin/demo-links – nur Demo-Backend: zuletzt erzeugte Bestätigungs-/Passwort-Links (statt E-Mail)
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer }) => ({ ok: true, links: await backend.demoLinks(nutzer) }));
