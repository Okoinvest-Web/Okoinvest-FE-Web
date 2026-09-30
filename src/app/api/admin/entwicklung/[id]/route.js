// GET   /api/admin/entwicklung/[id] – Entwicklungsprojekt (Stammdaten, Flächen, Meilensteine mit kritischem Pfad, Risiken,
//       Kontakte, Entscheidungen, Budget, Freigaben, Dokumente, Rückfragen) – lesen
// PATCH /api/admin/entwicklung/[id] – Stammdaten { titel, typ, land, bundesland, gemeinde, landkreis, mwp, mwh, nvp, netzbetreiber,
//       zielCod, vermarktung, status (aktiv|pausiert|abgebrochen) + begruendung, projektleiterId, wahrscheinlichkeit, beschreibung } – schreiben
import { route } from "@/lib/plattform/server/route";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, projekt: await entwicklungBackend().entwicklungProjekt(nutzer, params.id) }));

export const PATCH = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, projekt: await entwicklungBackend().entwicklungAendern(nutzer, params.id, body) }));
