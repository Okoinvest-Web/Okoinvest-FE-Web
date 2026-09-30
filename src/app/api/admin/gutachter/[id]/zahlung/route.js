// POST /api/admin/gutachter/[id]/zahlung – { rechnungId, datum?, betrag? } Zahlung einer sachlich geprüften Rechnung buchen
//      (Bereich „finanzen“ schreiben – Buchhaltung/Leitung); bucht Ist-Kosten am Entwicklungsprojekt (Planung & Gutachten)
import { route } from "@/lib/plattform/server/route";
import { gutachterBackend } from "@/lib/plattform/backend/gutachter";

export const POST = route({ admin: true, recht: [{ bereich: "finanzen", stufe: 2 }] }, async ({ nutzer, params, body }) => gutachterBackend().gaZahlung(nutzer, params.id, body));
