// POST /api/portal/entwicklung/einladung – { token } Gutachter-Einladung annehmen (nur mit der eingeladenen E-Mail-Adresse);
//      das Konto erhält die Rolle „gutachter“ und die Meilensteine des Auftrags → { ok, projektId, auftraege }
import { route } from "@/lib/plattform/server/route";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";

export const POST = route({ limit: "einladung" }, async ({ nutzer, body }) => ({
  ok: true,
  ...(await entwicklungBackend().entwicklungEinladungAnnehmen(nutzer, typeof body.token === "string" ? body.token.slice(0, 200) : "")),
}));
