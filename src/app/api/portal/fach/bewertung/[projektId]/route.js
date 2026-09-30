// GET  /api/portal/fach/bewertung/[projektId] – Vorbelegung, Ergebnis, eigene Szenarien (nur mit Datenraum-Zugriff)
// POST /api/portal/fach/bewertung/[projektId] – Szenario speichern { name, eingaben }
import { route } from "@/lib/plattform/server/route";
import { fachBackend } from "@/lib/plattform/backend/fach";

export const GET = route({ rollen: ["investor", "anbieter"] }, async ({ nutzer, params }) => ({ ok: true, ...(await fachBackend().bewertung(nutzer, params.projektId)) }));
export const POST = route({ rollen: ["investor", "anbieter"] }, async ({ nutzer, params, body }) => ({ ok: true, szenario: await fachBackend().szenarioSpeichern(nutzer, params.projektId, { name: body.name, eingaben: body.eingaben }) }));
