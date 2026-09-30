// GET /api/portal/termine/slots?art=…&von=YYYY-MM-DD&bis=YYYY-MM-DD – freie Zeitfenster (öffentliche Terminarten ohne Anmeldung;
// Datenraum-Session nur für Investoren). Mitarbeiter werden nur dem Backoffice genannt.
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const GET = route({ auth: "optional", limit: "nachricht" }, async ({ nutzer, suche }) => ({
  ok: true,
  ...(await serviceBackend().terminSlots(nutzer, { art: suche.get("art") || "", von: suche.get("von") || "", bis: suche.get("bis") || "", mitarbeiterId: suche.get("mitarbeiter") || "" })),
}));
