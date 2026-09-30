// POST /api/admin/anlagen/betrieb/versicherungen/[id] – { status: gemeldet|in_pruefung|reguliert|abgelehnt|zurueckgezogen, gemeldetAm?, schadennummer?, erstattetEur?, grund? }
//      oder { aendern: true, … } (Angaben eines offenen Falls ändern)
import { route } from "@/lib/plattform/server/route";
import { betriebBackend } from "@/lib/plattform/backend/betrieb";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => {
  const b = betriebBackend();
  if (body.aendern) return { ok: true, fall: await b.betriebVersicherungSpeichern(nutzer, { ...body, id: params.id }) };
  return { ok: true, fall: await b.betriebVersicherungAktion(nutzer, params.id, body) };
});
