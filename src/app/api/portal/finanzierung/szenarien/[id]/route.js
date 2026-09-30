// DELETE /api/portal/finanzierung/szenarien/[id] – eigenes Szenario löschen (fremde → 403)
import { route } from "@/lib/plattform/server/route";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";

export const DELETE = route({ json: false }, async ({ nutzer, params }) => finanzierungBackend().fzSzenarioLoeschen(nutzer, params.id));
