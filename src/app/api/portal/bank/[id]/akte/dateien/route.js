// POST /api/portal/bank/[id]/akte/dateien – multipart: datei (PDF/JPG/PNG ≤ 10 MB) als Anlage zur Bank-Akte (z. B. Checkliste der
//      Bank); Kopfzeile X-Plattform-Upload: 1; Teamrolle mindestens Sachbearbeitung → { datei: { id, name, link } }
import { route } from "@/lib/plattform/server/route";
import { formularDatei } from "@/lib/plattform/server/formularDatei";
import { bankakteBackend } from "@/lib/plattform/backend/bankakte";

export const POST = route({ rollen: ["bank"], upload: true }, async ({ nutzer, params, request }) => {
  const { daten, mime, name } = await formularDatei(request, nutzer);
  return Response.json(await bankakteBackend().baDateiSpeichern(nutzer, params.id, { name, mime, daten }), { status: 201, headers: { "Cache-Control": "no-store" } });
});
