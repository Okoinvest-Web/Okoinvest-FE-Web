// GET /api/admin/compliance/sla – Bearbeitungsziel der KYC-Warteschlange (Werktage, Ampel je Fall)
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await werkzeugeBackend().kycSlaUebersicht(nutzer)) }));
