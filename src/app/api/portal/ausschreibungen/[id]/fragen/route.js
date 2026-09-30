// Lieferant: POST {text} – Frage zur Angebotsanfrage (Antworten gehen anonymisiert an alle eingeladenen Versorger)
import { route } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";

export const POST = route({ rollen: ["lieferant"] }, async ({ nutzer, params, body }) => ({ ok: true, frage: await energieBackend().energieFrageStellen(nutzer, params.id, { text: body.text }) }));
