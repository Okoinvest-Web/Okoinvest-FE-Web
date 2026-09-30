// POST /api/portal/pachtakte/anliegen – Anliegen zum eigenen Pachtvertrag { vertragId, art, daten }
//   art: kuendigung | eigentuemerwechsel | erbfall | zahlungsaufteilung | verlaengerung (Positivliste: lib/plattform/pachtakte.js)
import { route } from "@/lib/plattform/server/route";
import { pachtakteBackend } from "@/lib/plattform/backend/pachtakte";

export const POST = route({ rollen: ["flaeche", "landwirt"], limit: "nachricht" }, async ({ nutzer, body, ip }) => ({
  ok: true,
  anliegen: await pachtakteBackend().anliegenAnlegen(nutzer, { vertragId: body.vertragId, art: body.art, daten: body.daten || {} }, { ip }),
}));
