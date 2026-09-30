// DELETE /api/portal/bieter/gebote/[id] – eigenes Gebot zurückziehen (nur solange die Runde offen ist)
import { route } from "@/lib/plattform/server/route";
import { dealroom } from "@/lib/plattform/backend/dealroom";

export const DELETE = route({ rollen: ["investor"], json: false }, async ({ nutzer, params }) => dealroom().gebotZurueckziehen(nutzer, params.id));
