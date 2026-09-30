// GET /api/admin/compliance/einstellungen – Freigabe-Sperren je Schritt, Geltung, Vier-Augen, Schwelle, Hochrisikoländer
// PUT /api/admin/compliance/einstellungen – ändern (nur Compliance); { pilotKonto: { id, an } } nimmt Konten in den Pilotbetrieb auf
import { route } from "@/lib/plattform/server/route";
import { kycBackend } from "@/lib/plattform/backend/kyc";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, einstellungen: await kycBackend().kycEinstellungen(nutzer) }));
export const PUT = route({ admin: true }, async ({ nutzer, body }) => kycBackend().kycEinstellungenSpeichern(nutzer, body));
