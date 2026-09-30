// POST /api/admin/gesellschaften/[id]/erp – Company in ERPNext anlegen (nur Frappe mit installiertem ERPNext + Schalter;
//      Demo: 501 mit Hinweis)
import { route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const POST = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, ...(await diensteBackend().gesellschaftErp(nutzer, params.id)) }));
