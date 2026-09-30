// GET  /api/portal/qa?projekt=P-… – Fragen & Antworten zum Projekt (je Rolle gefiltert, anonymisiert)
// POST /api/portal/qa – { projektId, kategorie (technisch|rechtlich|kaufmaennisch|netz), text } Investor mit Datenraum
import { route } from "@/lib/plattform/server/route";
import { grenze, rateLimit } from "@/lib/plattform/server/rateLimit";
import { dealroom } from "@/lib/plattform/backend/dealroom";

export const GET = route({}, async ({ nutzer, suche }) => ({ ok: true, ...(await dealroom().qaListe(nutzer, suche.get("projekt") || "")) }));

export const POST = route({ rollen: ["investor"] }, async ({ nutzer, body }) => {
  rateLimit(`qa:${nutzer.id}`, ...grenze("nachricht"));
  return { ok: true, frage: await dealroom().qaFrageStellen(nutzer, { projektId: body.projektId, kategorie: body.kategorie, text: body.text }) };
});
