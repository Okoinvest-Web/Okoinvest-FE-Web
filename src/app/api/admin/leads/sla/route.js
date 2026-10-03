// GET /api/admin/leads/sla?tage=90 – SLA-Auswertung (Median/P90 bis zum Erstkontakt je Land und Typ), nur intern.
// Welle 2, Paket B3. Backoffice mit Leserecht „Vorgänge“; reine Kennzahlen ohne Personendaten.

import { route } from "@/lib/plattform/server/route";
import { leadketteBackend } from "@/lib/plattform/backend/leadkette";

export const GET = route({ admin: true, recht: "vorgaenge" }, async ({ nutzer, suche }) => leadketteBackend().slaBericht(nutzer, { tage: suche.get("tage") || "90" }));
