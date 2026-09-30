// GET /api/portal/anbieter/cockpit – „Was ist zu tun?“ über alle eigenen Projekte (Anbieter) bzw. Punkte für das Backoffice
import { route } from "@/lib/plattform/server/route";
import { anbieterBackend } from "@/lib/plattform/backend/anbieter";

export const GET = route({ rollen: ["anbieter"] }, async ({ nutzer }) => ({ ok: true, ...(await anbieterBackend().anbieterCockpit(nutzer)) }));
