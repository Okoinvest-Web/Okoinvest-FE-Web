// GET  /api/portal/flaechen – eigene Flächen
// POST /api/portal/flaechen – Fläche anlegen { bezeichnung, land, bundesland, plz, ort, gemarkung, flurstuecke[], ha, nutzung, agri, eigentum, hinweise, einreichen? }
import { route } from "@/lib/plattform/server/route";

const ROLLEN = ["flaeche", "landwirt"];

export const GET = route({ rollen: ROLLEN }, async ({ backend, nutzer }) => ({ ok: true, flaechen: await backend.flaechen(nutzer) }));

export const POST = route({ rollen: ROLLEN }, async ({ backend, nutzer, body, ip }) => ({
  ok: true,
  flaeche: await backend.flaecheAnlegen(nutzer, body, { ip }),
}));
