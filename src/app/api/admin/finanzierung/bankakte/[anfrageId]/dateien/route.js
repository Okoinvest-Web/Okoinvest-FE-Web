// POST /api/admin/finanzierung/bankakte/[anfrageId]/dateien – multipart: datei (PDF/JPG/PNG ≤ 10 MB) für Lieferung, Antwort oder Bericht
//      (Bereich „finanzierung“ schreiben) → { datei: { id, name, link } }; die Datei wird erst mit der Aktion der Bank sichtbar gemacht
import { route } from "@/lib/plattform/server/route";
import { formularDatei } from "@/lib/plattform/server/formularDatei";
import { bankakteBackend } from "@/lib/plattform/backend/bankakte";

export const POST = route({ admin: true, upload: true }, async ({ nutzer, params, request }) => {
  const { daten, mime, name } = await formularDatei(request, nutzer);
  return Response.json(await bankakteBackend().baDateiSpeichern(nutzer, params.anfrageId, { name, mime, daten }), { status: 201, headers: { "Cache-Control": "no-store" } });
});
