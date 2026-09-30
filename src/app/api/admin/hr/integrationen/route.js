// GET /api/admin/hr/integrationen – Status der optionalen Frappe-Apps (Drive, Helpdesk, HRMS, Event-Kalender)
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, integrationen: await serviceBackend().ablageStatus(nutzer) }));
