// POST /api/portal/dienste/eid/demo – nur DEMO-Konfiguration: Simulator des eID-Ausstellers.
//      { state, nonce, codeChallenge, auswahl: hoch|substanziell|abweichend|abbrechen } → { url } (Rücksprung mit code/state)
import { route } from "@/lib/plattform/server/route";
import { eidBackend } from "@/lib/plattform/backend/eid";

export const POST = route({}, async ({ nutzer, body }) => ({ ok: true, ...(await eidBackend().eidDemoCode(nutzer, { state: body.state, nonce: body.nonce, codeChallenge: body.codeChallenge, auswahl: body.auswahl })) }));
