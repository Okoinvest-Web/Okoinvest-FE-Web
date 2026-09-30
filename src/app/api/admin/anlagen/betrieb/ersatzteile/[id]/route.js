// POST /api/admin/anlagen/betrieb/ersatzteile/[id] – { bewegung: zugang|entnahme|korrektur, menge, anlageId?, stoerungId?, bemerkung? }
//      oder { aendern: true, … } (Stammdaten des Artikels)
import { route } from "@/lib/plattform/server/route";
import { betriebBackend } from "@/lib/plattform/backend/betrieb";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => {
  const b = betriebBackend();
  if (body.aendern) return { ok: true, teil: await b.betriebErsatzteilSpeichern(nutzer, { ...body, id: params.id }) };
  return { ok: true, ...(await b.betriebErsatzteilBewegung(nutzer, params.id, { ...body, art: body.bewegung })) };
});
