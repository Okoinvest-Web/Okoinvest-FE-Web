// GET /api/admin/finanzierung/bankakte/[anfrageId]/dateien/[did] – Datei der Bank-Akte (Bereich „finanzierung“ lesen)
import { route } from "@/lib/plattform/server/route";
import { dateiAntwort } from "@/lib/plattform/server/formularDatei";
import { bankakteBackend } from "@/lib/plattform/backend/bankakte";

export const GET = route({ admin: true }, async ({ nutzer, params, ip }) => dateiAntwort(await bankakteBackend().baDateiLesen(nutzer, params.anfrageId, params.did, { ip })));
