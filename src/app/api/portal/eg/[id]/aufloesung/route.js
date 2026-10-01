// /api/portal/eg/[id]/aufloesung – Auflösungs-Checkliste (WP5, Fachkonzept 2.7)
//   GET  Checkliste · POST { aktion: starten {grund} | punkt {punkt, erledigt, notiz} | abschliessen {grund} } (Status über WP1)
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, aufloesung: await egBackend().grAufloesung(nutzer, params.id, { aktion: "lesen" }) }));

export const POST = route({}, async ({ nutzer, params, body }) => ({ ok: true, aufloesung: await egBackend().grAufloesung(nutzer, params.id, body || {}) }));
