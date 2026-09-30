// DELETE /api/portal/fach/szenarien/[id] – eigenes Bewertungsszenario löschen
import { route } from "@/lib/plattform/server/route";
import { fachBackend } from "@/lib/plattform/backend/fach";

export const DELETE = route({ json: false }, async ({ nutzer, params }) => fachBackend().szenarioLoeschen(nutzer, params.id));
