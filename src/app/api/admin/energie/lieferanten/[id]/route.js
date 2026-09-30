// Versorger: GET Detail (Historie, Bewertungen) · POST {aktion: speichern {daten} | bewerten {sterne, text} | einladen {email, ausschreibungId?}}
import { route, basisUrl } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, lieferant: await energieBackend().energieLieferant(nutzer, params.id) }));
export const POST = route({ admin: true }, async ({ nutzer, params, body, request }) => {
  const b = energieBackend();
  if (body.aktion === "speichern") return { ok: true, lieferant: await b.energieLieferantSpeichern(nutzer, { id: params.id, daten: body.daten && typeof body.daten === "object" ? body.daten : {} }) };
  if (body.aktion === "bewerten") return { ok: true, lieferant: await b.energieLieferantBewerten(nutzer, params.id, { sterne: body.sterne, text: body.text }) };
  if (body.aktion === "einladen") return { ok: true, ...(await b.energieLieferantEinladen(nutzer, params.id, { email: body.email, basisUrl: basisUrl(request), ausschreibungId: body.ausschreibungId || null })) };
  throw new PlattformFehler(422, "Unbekannte Aktion.");
});
