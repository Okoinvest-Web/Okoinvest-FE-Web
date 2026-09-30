// PATCH /api/admin/rechte/[nutzerId] – { backofficeRollen: ["leitung"|"akquise"|"transaktion"|"buchhaltung"|"lesen"] } (nur Leitung)
import { route } from "@/lib/plattform/server/route";

export const PATCH = route({ admin: true }, async ({ backend, nutzer, params, body }) => ({ ok: true, konto: await backend.backofficeRollenSetzen(nutzer, params.id, body.backofficeRollen) }));
