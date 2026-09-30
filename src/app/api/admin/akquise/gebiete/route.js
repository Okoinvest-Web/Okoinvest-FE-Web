// GET /api/admin/akquise/gebiete – Gebietszuordnung (PLZ-Bereiche / Bundesland / Land → Mitarbeiter)
// PUT /api/admin/akquise/gebiete – { gebiete: [{ id?, name, land, bundeslaender[], plz[], mitarbeiterId, aktiv }] } (ersetzt die Liste)
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer }) => ({ ok: true, ...(await backend.gebiete(nutzer)) }));
export const PUT = route({ admin: true }, async ({ backend, nutzer, body }) => ({ ok: true, ...(await backend.gebieteSpeichern(nutzer, body.gebiete)) }));
