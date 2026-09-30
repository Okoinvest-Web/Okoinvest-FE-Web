// GET /api/admin/gesellschaften/[id]/dokumente[?dok=vertrag|gf|anmeldung|kapital|eigentuemer|gesellschafterliste|…] –
//     Dokumentenpaket (MUSTER zur notariellen Prüfung) als PDF; Abruf wird protokolliert
import { route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const GET = route({ admin: true }, async ({ nutzer, params, suche }) => {
  const dok = /^[a-z_]{2,30}$/.test(suche.get("dok") || "") ? suche.get("dok") : "";
  const { pdf, name } = await diensteBackend().gesellschaftDokumente(nutzer, params.id, { dok });
  return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
});
