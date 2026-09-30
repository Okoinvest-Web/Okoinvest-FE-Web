// GET  /api/portal/benachrichtigungen?ungelesen=1&limit=  – eigene Benachrichtigungen (Glocke) + Einstellungen
// POST /api/portal/benachrichtigungen                     – { ids: [..] } bzw. { alle: true } als gelesen markieren
// PUT  /api/portal/benachrichtigungen                     – { einstellungen: { status, nachricht, nda, suchprofil, anfrage, aufgabe } } (E-Mail je Ereignis)
import { route } from "@/lib/plattform/server/route";

export const GET = route({}, async ({ backend, nutzer, suche }) => ({
  ok: true,
  ...(await backend.benachrichtigungen(nutzer, { nurUngelesen: suche.get("ungelesen") === "1", limit: Math.min(200, Number(suche.get("limit")) || 50) })),
}));

export const POST = route({}, async ({ backend, nutzer, body }) => ({
  ok: true,
  ...(await backend.benachrichtigungenGelesen(nutzer, { ids: Array.isArray(body.ids) ? body.ids.map(String) : undefined, alle: body.alle === true })),
}));

export const PUT = route({}, async ({ backend, nutzer, body }) => ({
  ok: true,
  einstellungen: await backend.mailEinstellungenSpeichern(nutzer, body.einstellungen && typeof body.einstellungen === "object" ? body.einstellungen : {}),
}));
