// GET /api/admin/leads?land=DE|AT|CH|unbekannt&tage=90 – Lead-Desk (Welle 2, Paket B3)
//
// Backoffice mit Leserecht „Vorgänge“. Liste je Land mit SLA-Ampel, Score, Zuständigkeit/„ohne Zuständigkeit“,
// Median/P90 bis zum Erstkontakt, Absagecodes, Status der Einwilligungskette. Personendaten nur als Kurzname
// („Vorname N.“) – keine E-Mail, kein Telefon, keine IP. Die SLA-Zielwerte sind intern (keine öffentliche Zeitzusage).

import { route } from "@/lib/plattform/server/route";
import { leadketteBackend } from "@/lib/plattform/backend/leadkette";

export const GET = route({ admin: true, recht: "vorgaenge" }, async ({ nutzer, suche }) => {
  const land = suche.get("land") || "";
  const tage = suche.get("tage") || "90";
  return leadketteBackend().leadDesk(nutzer, { land, tage });
});
