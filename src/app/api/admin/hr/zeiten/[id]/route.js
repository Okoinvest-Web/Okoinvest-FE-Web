// DELETE /api/admin/hr/zeiten/[id] – eigenen Zeiteintrag löschen (Leitung: alle), nicht nach Übernahme ins Timesheet
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const DELETE = route({ admin: true, json: false, recht: [{ bereich: "team", stufe: 1 }] }, async ({ nutzer, params }) => serviceBackend().zeitLoeschen(nutzer, params.id));
