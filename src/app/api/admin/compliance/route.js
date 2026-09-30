// GET /api/admin/compliance?status=offen|eingereicht|…|treffer|faellig&q= – Warteschlange + Kennzahlen (Bereich compliance ≥ lesen)
import { route } from "@/lib/plattform/server/route";
import { kycBackend } from "@/lib/plattform/backend/kyc";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ...(await kycBackend().kycWarteschlange(nutzer, { status: suche.get("status") || "offen", q: suche.get("q") || "" })) }));
