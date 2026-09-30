// GET /api/admin/entwicklung/auswahl – Auswahllisten (Projektleitung, Flächen, CRM-Kontakte, Investoren, Organisationen, Gutachter)
import { route } from "@/lib/plattform/server/route";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await entwicklungBackend().entwicklungAuswahl(nutzer)) }));
