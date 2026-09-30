// GET /api/admin/register/[id] – eine Registerauskunft (Firmendaten, Abrufdatum, Quelle)
import { route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, auskunft: await diensteBackend().registerAuskunft(nutzer, params.id) }));
