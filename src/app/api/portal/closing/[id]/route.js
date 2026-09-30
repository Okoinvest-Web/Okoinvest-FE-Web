// GET  /api/portal/closing/[id] – Closing-Raum für Beteiligte (Gegenseite anonym bis zur Kontaktfreigabe) bzw. Backoffice; fremd → 403
// POST /api/portal/closing/[id] – { aktion: "cp_melden", schluessel, nachweis } – Bedingung in eigener Verantwortung als erfüllt melden
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, closing: await closingBackend().clAkte(nutzer, params.id) }));
export const POST = route({}, async ({ nutzer, params, body }) => ({ ok: true, closing: await closingBackend().clPortalAktion(nutzer, params.id, body) }));
