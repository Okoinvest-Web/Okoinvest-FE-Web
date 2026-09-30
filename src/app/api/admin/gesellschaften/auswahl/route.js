// GET /api/admin/gesellschaften/auswahl – Entwicklungsprojekte (Team Projektentwicklung), Gruppengesellschaften, Rechtsformen
import { route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await diensteBackend().gesellschaftAuswahl(nutzer)) }));
