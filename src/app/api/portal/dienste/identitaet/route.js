// GET  /api/portal/dienste/identitaet – Konfiguration (Anbieter, Verfahren), eigene Sitzungen, letzte MRZ-Vorprüfung
// POST /api/portal/dienste/identitaet – Online-Identifizierung beim Anbieter starten → { sitzung, url } (Redirect/Embed)
import { basisUrl, route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const GET = route({}, async ({ nutzer }) => ({ ok: true, ...(await diensteBackend().identStatus(nutzer)) }));

export const POST = route({}, async ({ nutzer, request }) => ({ ok: true, ...(await diensteBackend().identStarten(nutzer, { basisUrl: basisUrl(request) })) }));
