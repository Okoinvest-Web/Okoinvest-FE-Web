// GET /api/admin/pachtakte – Arbeitsliste Pachtakten (offene Anliegen, eingereichte Agri-PV-Nachweise, Verträge mit
// Rückbau/Sicherheit/Fristen); `?vertrag=PT-…` eine Akte mit Kontenauswahl. Bereich „pachtakte“ (lesen).
import { route } from "@/lib/plattform/server/route";
import { pachtakteBackend } from "@/lib/plattform/backend/pachtakte";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ...(await pachtakteBackend().pachtakteBackoffice(nutzer, { vertragId: suche.get("vertrag") || null })) }));
