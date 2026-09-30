// POST /api/portal/organisation/zuordnen – { art (flaeche|projekt|interesse), id, organisationId | null }
// Eigenes Objekt einer Organisation übergeben (Teamrolle ≥ Mitglied) bzw. wieder persönlich machen.
import { route } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";

export const POST = route({}, async ({ nutzer, body }) => ({
  ok: true,
  objekt: await sicherheit().objektZuordnen(nutzer, { art: body.art, id: body.id, organisationId: body.organisationId || null }),
}));
