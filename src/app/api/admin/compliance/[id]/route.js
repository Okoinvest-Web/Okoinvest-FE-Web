// GET  /api/admin/compliance/[id] – Fall mit Unterlagen, Prüfliste, Abgleich, Verlauf, Zugriffsprotokoll (nur Unterrolle Compliance)
// POST /api/admin/compliance/[id] – { aktion: uebernehmen|pruefliste|risiko|entscheiden|zweitfreigabe|treffer|abgleich|beziehungEnde|notiz, … }
import { route } from "@/lib/plattform/server/route";
import { kycBackend } from "@/lib/plattform/backend/kyc";

export const GET = route({ admin: true }, async ({ nutzer, params, ip }) => ({ ok: true, fall: await kycBackend().kycFallDetail(nutzer, params.id, { ip }) }));

export const POST = route({ admin: true, maxBytes: 16 * 1024 }, async ({ nutzer, params, body }) => kycBackend().kycAktion(nutzer, params.id, body));
