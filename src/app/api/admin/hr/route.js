// GET /api/admin/hr – Team-Übersicht (Mitarbeiter ↔ Konto/Employee, Gebiete, Abwesenheiten, Auslastung; Bereich „team“ lesen)
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await serviceBackend().team(nutzer)) }));
