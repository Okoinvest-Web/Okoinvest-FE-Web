// POST /api/portal/querschnitt/dokumente/[id]/version – multipart: datei · neue Version eines Dokuments
//      Kopfzeile X-Plattform-Upload: 1 (CSRF), PDF/JPG/PNG ≤ 10 MB, Typ an den ersten Bytes geprüft
import { route } from "@/lib/plattform/server/route";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { UPLOAD } from "@/lib/plattform/konstanten";
import { querschnittBackend } from "@/lib/plattform/backend/querschnitt";

function mimeAusBytes(b) {
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "application/pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  return "";
}

export const POST = route({ upload: true }, async ({ nutzer, request, params }) => {
  rateLimit(`upload:${nutzer.id}`, ...grenze("upload"));
  if (Number(request.headers.get("content-length") || 0) > UPLOAD.maxBytes + 64 * 1024) throw new PlattformFehler(413, "Die Datei ist größer als 10 MB.");
  if (!(request.headers.get("content-type") || "").startsWith("multipart/form-data")) throw new PlattformFehler(415, "Erwartet wird ein Datei-Upload.");
  let fd;
  try {
    fd = await request.formData();
  } catch {
    throw new PlattformFehler(400, "Die Datei konnte nicht gelesen werden. Bitte versuchen Sie es erneut.");
  }
  const datei = fd.get("datei");
  if (!datei || typeof datei === "string") throw new PlattformFehler(422, "Bitte wählen Sie eine Datei.");
  if (datei.size > UPLOAD.maxBytes) throw new PlattformFehler(413, "Die Datei ist größer als 10 MB.");
  const daten = Buffer.from(await datei.arrayBuffer());
  const mime = mimeAusBytes(daten);
  if (!mime) throw new PlattformFehler(415, "Erlaubt sind PDF, JPG und PNG.");
  const dokument = await querschnittBackend().dokumentNeueVersion(nutzer, String(params.id || ""), { name: datei.name || "", mime, daten });
  return { ok: true, dokument };
});
