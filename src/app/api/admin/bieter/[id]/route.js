// POST /api/admin/bieter/[id] – { aktion, … }: frist { frist } · beenden · naechsteRunde { teilnehmer[], frist, art? } ·
//      anbieterFreigabe { an } · erinnern · zuschlag { gebotId, kommentar? } · abbrechen { grund }
import { route } from "@/lib/plattform/server/route";
import { dealroom } from "@/lib/plattform/backend/dealroom";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, verfahren: await dealroom().bieterAktion(nutzer, params.id, body) }));
