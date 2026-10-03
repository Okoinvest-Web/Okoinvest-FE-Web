// POST /api/admin/leads/widerruf { vorgangId, zweck: werbeanruf|newsletter|weitergabe_partner|bericht, kanal?: backoffice|telefon|email }
// Widerruf als eigener Eintrag im Einwilligungsprotokoll (z. B. am Telefon erklärt). Welle 2, Paket B3.
// Schreibrecht „Vorgänge“. Antwort ohne Personendaten.

import { route } from "@/lib/plattform/server/route";
import { leadketteBackend } from "@/lib/plattform/backend/leadkette";

export const POST = route({ admin: true, recht: "vorgaenge", maxBytes: 2048 }, async ({ nutzer, body }) =>
  leadketteBackend().widerrufen(nutzer, { vorgangId: String(body.vorgangId || ""), zweck: String(body.zweck || ""), kanal: String(body.kanal || "backoffice") })
);
