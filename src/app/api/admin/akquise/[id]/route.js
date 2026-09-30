// PATCH /api/admin/akquise/[flaecheId] – { prioritaet?: "A"|"B"|"C"|"" (leer = automatisch), besonderheiten?: [], netz? }
import { route } from "@/lib/plattform/server/route";

export const PATCH = route({ admin: true }, async ({ backend, nutzer, params, body }) => ({ ok: true, flaeche: await backend.akquiseSetzen(nutzer, params.id, body) }));
