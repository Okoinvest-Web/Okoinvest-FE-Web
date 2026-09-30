// GET /api/admin/postausgang?limit= – E-Mails, die Frappe versenden würde (nur Demo-Backend, nur admin)
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer, suche }) => ({
  ok: true,
  mails: await backend.postausgang(nutzer, { limit: Math.min(500, Number(suche.get("limit")) || 100) }),
}));
