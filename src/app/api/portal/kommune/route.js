// GET /api/portal/kommune – Gemeinde-Sicht: eigene kommunale Anliegen; Projekte im Gemeindegebiet nur bei
// geprüftem Anliegen, nur ab Planungsphase, vereinfacht (ohne Eigentümer, Flurstücke, Pacht).
// Backoffice: ?vorgang=V-… zeigt die Sicht eines Anliegens, ohne Parameter die Liste aller kommunalen Anliegen.
import { route } from "@/lib/plattform/server/route";
import { fachBackend } from "@/lib/plattform/backend/kommune";

export const GET = route({}, async ({ nutzer, suche }) => ({ ok: true, ...(await fachBackend().kommuneUebersicht(nutzer, { vorgangId: suche.get("vorgang") || undefined })) }));
