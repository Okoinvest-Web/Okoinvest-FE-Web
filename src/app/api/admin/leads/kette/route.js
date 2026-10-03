// GET /api/admin/leads/kette – Prüfung der Einwilligungskette (verifyChain über alle Einträge). Welle 2, Paket B3.

import { route } from "@/lib/plattform/server/route";
import { leadketteBackend } from "@/lib/plattform/backend/leadkette";

export const GET = route({ admin: true, recht: "vorgaenge" }, async ({ nutzer }) => leadketteBackend().leadKetteStatus(nutzer));
