// GET /api/portal/ki – Status des Assistenten für das angemeldete Konto:
//   { ok, aktiv (KI-Modus verfügbar), faelle (erlaubte Anwendungsfälle), kontingent: { limit, rest } }
// Der API-Schlüssel wird nie ausgeliefert; ohne Schlüssel arbeitet der Assistent regelbasiert.
import { route } from "@/lib/plattform/server/route";
import { status } from "@/lib/plattform/ki";

export const GET = route({}, async ({ nutzer }) => status(nutzer));
