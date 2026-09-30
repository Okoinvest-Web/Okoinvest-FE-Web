// GET /api/portal/pachtakte – eigene Pachtakten: Vertrag, Fristen, Anliegen, Rückbau/Sicherheit, Agri-PV-Nachweise,
// Jahre mit Jahresbescheinigung. Nur eigene Pachtverträge (Backend prüft Eigentum).
import { route } from "@/lib/plattform/server/route";
import { pachtakteBackend } from "@/lib/plattform/backend/pachtakte";

export const GET = route({ rollen: ["flaeche", "landwirt"] }, async ({ nutzer }) => ({ ok: true, ...(await pachtakteBackend().meinePachtakte(nutzer)) }));
