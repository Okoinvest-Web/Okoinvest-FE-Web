// POST /api/admin/anlagen/[id]/geraete – { bezeichnung } → neuer MQTT-Gerätezugang.
// Das Passwort steht NUR in dieser Antwort (no-store); gespeichert wird ausschließlich der scrypt-Hash.
import { route } from "@/lib/plattform/server/route";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => {
  const r = await anlagenBackend().geraetZugangAnlegen(nutzer, params.id, { bezeichnung: body.bezeichnung });
  return Response.json({ ok: true, ...r }, { status: 201, headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
});
