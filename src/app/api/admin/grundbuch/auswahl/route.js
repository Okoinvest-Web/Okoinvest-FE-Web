// GET /api/admin/grundbuch/auswahl – Flächen (ab Pachtangebot) und Anlagen mit Dienstbarkeit für „Akte anlegen“
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await closingBackend().gbAuswahl(nutzer)) }));
