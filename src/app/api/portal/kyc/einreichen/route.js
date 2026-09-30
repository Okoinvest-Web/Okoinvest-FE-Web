// POST /api/portal/kyc/einreichen – Verifizierung zur Prüfung einreichen (alle Pflichtangaben/-unterlagen vorhanden)
import { route } from "@/lib/plattform/server/route";
import { kycBackend } from "@/lib/plattform/backend/kyc";

export const POST = route({}, async ({ nutzer, ip }) => ({ ok: true, ...(await kycBackend().kycEinreichen(nutzer, { ip })) }));
