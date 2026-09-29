// GET /api/admin/uebersicht – Kennzahlen, Trichter, Pipeline (nur admin)
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer }) => ({ ok: true, uebersicht: await backend.adminUebersicht(nutzer) }));
