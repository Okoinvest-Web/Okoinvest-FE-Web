// GET /api/admin/gutachter/[id]/dateien/[did] – Lieferung bzw. Rechnung eines Auftrags (Bereich „entwicklung“ lesen); Abruf protokolliert
import { route } from "@/lib/plattform/server/route";
import { dateiAntwort } from "@/lib/plattform/server/formularDatei";
import { gutachterBackend } from "@/lib/plattform/backend/gutachter";

export const GET = route({ admin: true }, async ({ nutzer, params }) => dateiAntwort(await gutachterBackend().gaDateiLesen(nutzer, params.id, params.did)));
