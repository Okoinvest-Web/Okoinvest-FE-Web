// GET /api/portal/signatur[?status=laufend|abgeschlossen|…] – eigene Signaturvorgänge (als Unterzeichner bzw. Ersteller)
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const GET = route({}, async ({ nutzer, suche }) => ({
  ok: true,
  vorgaenge: await serviceBackend().signaturen(nutzer, { status: suche.get("status") || "" }),
}));
