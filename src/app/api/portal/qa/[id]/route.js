// POST /api/portal/qa/[id] – { aktion, … }
//   Anbieter/Backoffice: antworten { antwort, oeffentlich? }
//   Backoffice: freigeben { text?, fristTage? } · ablehnen { grund } · antwortFreigeben { antwort?, oeffentlich } ·
//               zurueckgeben { kommentar, fristTage? } · frist { fristTage }
import { route } from "@/lib/plattform/server/route";
import { grenze, rateLimit } from "@/lib/plattform/server/rateLimit";
import { dealroom } from "@/lib/plattform/backend/dealroom";

export const POST = route({}, async ({ nutzer, params, body }) => {
  rateLimit(`qa:${nutzer.id}`, ...grenze("nachricht"));
  return { ok: true, frage: await dealroom().qaAktion(nutzer, params.id, body) };
});
