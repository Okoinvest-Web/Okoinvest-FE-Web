// POST /api/admin/leads/loeschung { vorgangId, grund?, bestaetigung: "LÖSCHEN" } – Löschung nach Art. 17 DSGVO.
// Welle 2, Paket B3. Schreibrecht „Vorgänge“. Entfernt die getrennte Personenzeile, schwärzt die Kontaktdaten der
// zugehörigen Vorgänge/CRM-Kontakte (ohne Portal-Konto) und trägt offene Einwilligungen als widerrufen ein.
// Die Einwilligungskette bleibt unverändert (Pseudonym als Minimaldatensatz bis zum Ende der Nachweisfrist –
// Frist: TODO Rechtsabteilung). Ein Portal-Konto löscht nur die Datenschutzanfrage im Bereich Compliance.

import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { leadketteBackend } from "@/lib/plattform/backend/leadkette";

export const POST = route({ admin: true, recht: "vorgaenge", maxBytes: 2048 }, async ({ nutzer, body }) => {
  if (body.bestaetigung !== "LÖSCHEN") throw new PlattformFehler(422, "Bitte bestätigen Sie die Löschung mit „LÖSCHEN“.");
  return leadketteBackend().personLoeschen(nutzer, { vorgangId: String(body.vorgangId || ""), grund: typeof body.grund === "string" ? body.grund.slice(0, 200) : "" });
});
