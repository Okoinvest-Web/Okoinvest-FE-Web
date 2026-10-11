// /api/admin/newsletter – Newsletter-Backoffice (Plattform-Armee, Paket MARKETING)
//
//   GET                    Übersicht: Kennzahlen, aktive Abos je Land/Thema, Empfängerliste mit Einwilligungs-
//                          verlauf, Abmeldungen (Grabsteine ohne Personendaten). Recht: „CRM“ lesen.
//   GET ?export=<aboId>    Datenexport EINES Empfängers (Art. 15/20): Abo, E-Mail, Einwilligungen.
//                          Recht: zusätzlich „CSV-Export“ lesen (wie /api/admin/export).
//   POST { aktion:"loeschen", aboId }  Löschung eines Empfängers (Art. 17): Widerruf im Protokoll,
//                          Personenzeile weg, Grabstein. Recht: „CRM“ schreiben.
//
// Läuft NUR gegen das Demo-Backend; außerhalb antwortet newsletterBackend() mit 503 („newsletter_aus“).
// Keine Klartext-Tokens in der Antwort; Grabsteine enthalten keine Personendaten.

import { route } from "@/lib/plattform/server/route";
import { newsletterBackend } from "@/lib/plattform/backend/newsletter";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { stufe } from "@/lib/plattform/rechte";

export const GET = route({ admin: true, recht: "crm" }, async ({ nutzer, suche }) => {
  const nb = newsletterBackend();
  const aboId = suche.get("export");
  if (aboId) {
    if (stufe(nutzer, "export") < 1) {
      throw new PlattformFehler(403, "Der Datenexport je Empfänger braucht zusätzlich das Recht „CSV-Export“.", "recht");
    }
    return { ok: true, export: await nb.newsletterExport({ aboId }) };
  }
  return { ok: true, ...(await nb.newsletterUebersicht()) };
});

export const POST = route({ admin: true, recht: "crm" }, async ({ body }) => {
  if (body?.aktion !== "loeschen" || typeof body?.aboId !== "string" || !body.aboId) {
    throw new PlattformFehler(400, "Erwartet wird { aktion: \"loeschen\", aboId }.", "eingabe");
  }
  return { ok: true, ...(await newsletterBackend().newsletterLoeschen({ aboId: body.aboId })) };
});
