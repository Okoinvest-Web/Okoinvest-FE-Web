// PATCH /api/admin/nutzer/[id] – { rollen?: [..], aktiv?: boolean } (Sperren beendet alle Sitzungen sofort)
import { route } from "@/lib/plattform/server/route";

export const PATCH = route({ admin: true }, async ({ backend, nutzer, params, body }) => {
  const u = await backend.nutzerAendern(nutzer, params.id, {
    rollen: Array.isArray(body.rollen) ? body.rollen : undefined,
    aktiv: typeof body.aktiv === "boolean" ? body.aktiv : undefined,
  });
  return { ok: true, nutzer: { id: u.id, rollen: u.rollen, aktiv: u.aktiv } };
});
