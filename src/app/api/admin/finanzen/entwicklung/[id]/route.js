// GET /api/admin/finanzen/entwicklung/[id] – Ist-Kosten eines Entwicklungsprojekts (API für das Entwicklungsmodul):
//     { ist, jeArt, budget, abweichung, quote, ampel, jeMwp, positionen[], quelle: erpnext|plattform }
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const GET = route({ admin: true, recht: [{ bereich: "entwicklung", stufe: 1 }] }, async ({ nutzer, params }) => ({ ok: true, ist: await finanzenBackend().entwicklungIst(nutzer, params.id) }));
