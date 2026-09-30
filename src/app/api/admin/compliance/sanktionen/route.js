// GET  /api/admin/compliance/sanktionen – Stand der lokal gespeicherten Sanktionsliste (Quelle, Stand, Anzahl)
// POST /api/admin/compliance/sanktionen – Einzelabgleich { name, geburtsdatum?, art: person|organisation } → Treffer (nur Compliance)
import { route } from "@/lib/plattform/server/route";
import { kycBackend } from "@/lib/plattform/backend/kyc";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, liste: await kycBackend().kycSanktionsliste(nutzer) }));
export const POST = route({ admin: true }, async ({ nutzer, body }) => ({ ok: true, ...(await kycBackend().kycSanktionPruefen(nutzer, body)) }));
