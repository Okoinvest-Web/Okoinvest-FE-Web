// POST /api/portal/anlagen/stoerungen/[id] – { aktion, … }
//   kommentar { text, intern? }  – Kunde (Konto bzw. Team ab „Mitglied“) und Betrieb; intern nur Betrieb
//   quittieren · status { status: offen|in_arbeit|behoben, text? } · zuweisen { zustaendigId } · schwere { schwere } – nur Betrieb
// Rechte (Rolle + Eigentum) prüft das Backend; fremde Anlage → 403, Kunde quittiert → 403.
import { route } from "@/lib/plattform/server/route";
import { grenze, rateLimit } from "@/lib/plattform/server/rateLimit";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";

export const POST = route({}, async ({ nutzer, params, body }) => {
  rateLimit(`anl-stoerung:${nutzer.id}`, ...grenze("nachricht"));
  return { ok: true, stoerung: await anlagenBackend().stoerungAktion(nutzer, params.id, body) };
});
