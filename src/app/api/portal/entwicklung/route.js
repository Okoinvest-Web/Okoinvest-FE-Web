// GET /api/portal/entwicklung – Entwicklungsprojekte, an denen das Konto extern beteiligt ist (Flächeneigentümer: vereinfacht;
//     Co-Investor: Fortschritt, freigegebene Risiken/Dokumente; Gutachter: nur zugewiesene Meilensteine)
import { route } from "@/lib/plattform/server/route";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";

export const GET = route({}, async ({ nutzer }) => ({ ok: true, projekte: await entwicklungBackend().entwicklungMeine(nutzer) }));
