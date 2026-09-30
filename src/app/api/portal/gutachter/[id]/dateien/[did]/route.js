// GET /api/portal/gutachter/[id]/dateien/[did] – Datei des eigenen Auftrags (Lieferung, Rechnung); Abruf protokolliert
import { route } from "@/lib/plattform/server/route";
import { dateiAntwort } from "@/lib/plattform/server/formularDatei";
import { gutachterBackend } from "@/lib/plattform/backend/gutachter";

export const GET = route({ rollen: ["gutachter"] }, async ({ nutzer, params }) => dateiAntwort(await gutachterBackend().gaDateiLesen(nutzer, params.id, params.did)));
