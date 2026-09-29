// POST /api/admin/zuweisen – { art, id, zustaendigId|null } (nur admin; Zuständige müssen Admin-Konten sein)
import { route } from "@/lib/plattform/server/route";

export const POST = route({ admin: true }, async ({ backend, nutzer, body }) => ({
  ok: true,
  ergebnis: await backend.zuweisen(nutzer, { art: String(body.art || ""), id: String(body.id || ""), zustaendigId: body.zustaendigId ? String(body.zustaendigId) : null }),
}));
