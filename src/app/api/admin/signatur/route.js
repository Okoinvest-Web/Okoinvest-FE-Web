// GET  /api/admin/signatur[?status=] – alle Signaturvorgänge (Bereich „signatur“ lesen)
// POST /api/admin/signatur – multipart (Kopfzeile X-Plattform-Upload: 1): datei (PDF ≤ 10 MB), daten (JSON:
//      { titel, art, unterzeichner:[{email|kontoId}], reihenfolge, fristTage, nachricht, bezugArt?, bezugId? }) – schreiben
import { route } from "@/lib/plattform/server/route";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";
import { serviceBackend } from "@/lib/plattform/backend/service";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { SIGNATUR_GRENZEN } from "@/lib/plattform/signatur";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({
  ok: true,
  vorgaenge: await serviceBackend().signaturen(nutzer, { alle: true, status: suche.get("status") || "" }),
}));

export const POST = route({ admin: true, upload: true }, async ({ nutzer, request, ip }) => {
  rateLimit(`upload:${nutzer.id}`, ...grenze("upload"));
  const laenge = Number(request.headers.get("content-length") || 0);
  if (laenge > SIGNATUR_GRENZEN.pdfMaxBytes + 128 * 1024) throw new PlattformFehler(413, "Die Datei ist größer als 10 MB.");
  if (!(request.headers.get("content-type") || "").startsWith("multipart/form-data")) throw new PlattformFehler(415, "Erwartet wird ein Datei-Upload.");
  const fd = await request.formData();
  const datei = fd.get("datei");
  if (!datei || typeof datei === "string") throw new PlattformFehler(422, "Bitte wählen Sie eine PDF-Datei.");
  if (datei.size > SIGNATUR_GRENZEN.pdfMaxBytes) throw new PlattformFehler(413, "Die Datei ist größer als 10 MB.");
  let daten;
  try {
    daten = JSON.parse(String(fd.get("daten") || "{}"));
  } catch {
    throw new PlattformFehler(400, "Ungültige Daten.");
  }
  if (!daten || typeof daten !== "object" || Array.isArray(daten)) throw new PlattformFehler(400, "Ungültige Daten.");
  const pdf = Buffer.from(await datei.arrayBuffer());
  const vorgang = await serviceBackend().signaturAnlegen(nutzer, { ...daten, pdf, dateiname: datei.name || "dokument.pdf" }, { ip });
  return Response.json({ ok: true, vorgang }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
