// GET  /api/admin/portfolio – alle Positionen, offene Kapitalabrufe, Wiederverkaufsanfragen, Kennzahlen (Bereich „portfolio“ lesen)
// POST /api/admin/portfolio – Position anlegen { art: bestand|projekt|codev, investorId, organisationId?, entwicklungId?, titel, … } (schreiben)
import { route } from "@/lib/plattform/server/route";
import { portfolioBackend } from "@/lib/plattform/backend/portfolio";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await portfolioBackend().pfUebersicht(nutzer)) }));
export const POST = route({ admin: true }, async ({ nutzer, body }) => ({ ok: true, position: await portfolioBackend().pfAnlegen(nutzer, body) }));
