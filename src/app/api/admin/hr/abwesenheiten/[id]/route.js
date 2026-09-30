// DELETE /api/admin/hr/abwesenheiten/[id] – eigene Abwesenheit bzw. (Leitung) fremde löschen; Vertretungen bleiben bestehen
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const DELETE = route({ admin: true, json: false, recht: [{ bereich: "team", stufe: 1 }] }, async ({ nutzer, params }) => serviceBackend().abwesenheitLoeschen(nutzer, params.id));
