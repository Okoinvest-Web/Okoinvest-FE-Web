// POST /api/anfrage – öffentliches Anfrageformular aller Zielgruppen (Vertrag: docs/BRIEFING.md, docs/API.md)
// Erzeugt einen Vorgang; bei typ flaeche/agri zusätzlich einen Flächen-Entwurf.

import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";

const EINWILLIGUNG = "Ich bin einverstanden, dass ÖkoInvest meine Angaben zur Bearbeitung der Anfrage verarbeitet (Datenschutzerklärung).";

export const POST = route({ auth: "optional", limit: "anfrage", maxBytes: 48 * 1024 }, async ({ body, backend, ip, nutzer }) => {
  if (body.website) return { ok: true, id: "", vorgang: null }; // Honeypot: still verwerfen
  if (body.einwilligung !== true) throw new PlattformFehler(422, "Bitte bestätigen Sie die Einwilligung zur Datenverarbeitung.");
  const ergebnis = await backend.anfrageAnlegen({
    typ: body.typ,
    kontakt: body.kontakt || {},
    daten: body.daten || {},
    herkunft: body.herkunft || {},
    ip,
    einwilligungText: EINWILLIGUNG,
    nutzer,
  });
  return { ok: true, id: ergebnis.id, vorgang: ergebnis.vorgang };
});
