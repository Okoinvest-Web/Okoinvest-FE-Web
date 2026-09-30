// GET  /api/admin/anlagen/geraete/[gid] – Status des Gerätezugangs („Warte auf erste Nachricht …“ → verbunden), ohne Passwort/Hash
// POST /api/admin/anlagen/geraete/[gid] – { aktion: sperren | entsperren | neu (neues Passwort, einmalig) | testnachricht (nur Demo), mitFehlercode? }
import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { istDemo } from "@/lib/plattform/backend";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, ...(await anlagenBackend().geraetZugang(nutzer, params.gid)) }));

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => {
  if (body.aktion === "testnachricht" && !istDemo()) {
    throw new PlattformFehler(409, "Testnachrichten gibt es nur im Demo-Betrieb – bitte senden Sie mit mosquitto_pub (siehe Assistent).");
  }
  const r = await anlagenBackend().geraetZugangAktion(nutzer, params.gid, { aktion: body.aktion, mitFehlercode: body.mitFehlercode === true });
  return Response.json({ ok: true, ...r }, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
});
