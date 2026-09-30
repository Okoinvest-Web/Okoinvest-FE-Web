// GET /api/portal/bank/[id]/akte/dateien/[did] – Datei der Bank-Akte (Lieferung, Antwort, Bericht) der eigenen Anfrage; Abruf protokolliert
import { route } from "@/lib/plattform/server/route";
import { dateiAntwort } from "@/lib/plattform/server/formularDatei";
import { bankakteBackend } from "@/lib/plattform/backend/bankakte";

export const GET = route({ rollen: ["bank"] }, async ({ nutzer, params, ip }) => dateiAntwort(await bankakteBackend().baDateiLesen(nutzer, params.id, params.did, { ip })));
