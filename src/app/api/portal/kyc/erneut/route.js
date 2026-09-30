// POST /api/portal/kyc/erneut – erneute Prüfung starten (nach Verifizierung, z. B. neuer Ausweis oder neue Bankverbindung)
import { route } from "@/lib/plattform/server/route";
import { kycBackend } from "@/lib/plattform/backend/kyc";

export const POST = route({}, async ({ nutzer }) => ({ ok: true, ...(await kycBackend().kycErneut(nutzer)) }));
