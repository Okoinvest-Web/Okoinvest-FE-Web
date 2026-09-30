// GET /api/admin/rechte – Backoffice-Unterrollen, Rechte-Matrix, Konten (nur Leitung)
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer }) => ({ ok: true, ...(await backend.backofficeRechte(nutzer)) }));
