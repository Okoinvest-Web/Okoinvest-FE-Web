// GET  /api/portal/bank/team?bankId= – Team der eigenen Bank (Mitglieder, Rollen, offene Einladungen für die Leitung)
// POST /api/portal/bank/team – { aktion: einladen {email,rolle} | rolle {nutzerId,rolle} | entfernen {nutzerId} | widerrufen {einladungId} }
//      nur Teamrolle Leitung; Einladungen nur an Adressen derselben E-Mail-Domain; mindestens eine Leitung bleibt
import { route, basisUrl } from "@/lib/plattform/server/route";
import { bankakteBackend } from "@/lib/plattform/backend/bankakte";

export const GET = route({ rollen: ["bank"] }, async ({ nutzer, suche }) => ({ ok: true, team: await bankakteBackend().baTeam(nutzer, { bankId: suche.get("bankId") || "" }) }));

export const POST = route({ rollen: ["bank"], limit: "einladung" }, async ({ nutzer, body, request }) => bankakteBackend().baTeamAktion(nutzer, { ...body, basisUrl: basisUrl(request) }));
