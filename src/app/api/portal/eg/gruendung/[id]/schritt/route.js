// POST /api/portal/eg/gruendung/[id]/schritt – { schritt, aktion: starten | warten | erledigen | entfaellt | wiedereroeffnen | frist | notiz,
//   datum?, wert?, notiz?, frist?, grund?, nachweis?: { titel, dokumentId } } (WP5). Wirkung auf die Gemeinschaft läuft über WP1.
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const POST = route({}, async ({ nutzer, params, body }) => ({ ok: true, auftrag: await egBackend().grSchrittAktion(nutzer, params.id, body || {}) }));
