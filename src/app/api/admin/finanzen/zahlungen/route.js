// GET /api/admin/finanzen/zahlungen?bis= – Zahlungsvorschlag: offene Pacht-Gutschriften je Eigentümer mit KYC-Freigabe
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ...(await finanzenBackend().zahlungsvorschlag(nutzer, { bis: suche.get("bis") })) }));
