// GET  /api/portal/eg/[id]/abrechnung – Übersicht Abrechnung (Perioden, Kennzahlen, Kleinunternehmer-Monitor, Zahlungsläufe, Rechte)
// POST /api/portal/eg/[id]/abrechnung – { aktion: "anlegen", von, bis, art, probe } | { aktion: "einstellungen", daten }
// Rechte je Gemeinschaft prüft das Backend (WP4, eg/rechte.js); fremde Gemeinschaft → 404. Gilt auch für das Backoffice.
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, ...(await egBackend().abPerioden(nutzer, params.id)) }));

export const POST = route({ maxBytes: 128 * 1024 }, async ({ nutzer, params, body }) => {
  const b = egBackend();
  if (body?.aktion === "anlegen") return { ok: true, periode: await b.abPeriodeAnlegen(nutzer, params.id, { von: body.von, bis: body.bis, art: body.art, probe: !!body.probe }) };
  if (body?.aktion === "einstellungen") return { ok: true, ...(await b.abEinstellungenSpeichern(nutzer, params.id, { daten: body.daten || {} })) };
  throw new PlattformFehler(422, "Unbekannte Aktion.");
});
