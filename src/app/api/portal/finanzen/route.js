// GET /api/portal/finanzen?jahr= – eigene Abrechnungen (Pacht-Gutschriften, Contracting-, Provisionsrechnungen) mit
// Jahresübersicht, Pachtverträgen (Indexierung erklärt) und nächster Zahlung. Nur eigene Belege (Backend prüft).
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const GET = route({}, async ({ nutzer, suche }) => ({ ok: true, ...(await finanzenBackend().meineAbrechnungen(nutzer, { jahr: suche.get("jahr") })) }));
