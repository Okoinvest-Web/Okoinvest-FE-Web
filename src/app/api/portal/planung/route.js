// GET /api/portal/planung?projektId= – Pläne eines Entwicklungsprojekts (Backoffice alles; Gutachter/Planer nur Pläne an
//     zugewiesenen Meilensteinen bzw. eigene; Co-Investor nur freigegebene Versionen). Ohne projektId: alle eigenen Projekte.
import { route } from "@/lib/plattform/server/route";
import { planungBackend } from "@/lib/plattform/backend/planung";

export const GET = route({}, async ({ nutzer, suche }) => {
  const pid = suche.get("projektId");
  const b = planungBackend();
  return pid ? b.planungListe(nutzer, pid) : { projekte: await b.planungMeine(nutzer) };
});
