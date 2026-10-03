// POST /api/admin/leads/absage { vorgangId, code, begruendung? } – Absagecode mit Begründung (Text an den Interessenten).
// Welle 2, Paket B3. Schreibrecht „Vorgänge“. Keine automatische Absage: Ein Mensch entscheidet (Art. 22 DSGVO).
// Der Statuswechsel „abgelehnt“ und die Nachricht laufen wie bisher über den Vorgang.

import { route } from "@/lib/plattform/server/route";
import { leadketteBackend } from "@/lib/plattform/backend/leadkette";

export const POST = route({ admin: true, recht: "vorgaenge", maxBytes: 4096 }, async ({ nutzer, body }) =>
  leadketteBackend().absageSetzen(nutzer, String(body.vorgangId || ""), { code: String(body.code || ""), begruendung: typeof body.begruendung === "string" ? body.begruendung : "" })
);
