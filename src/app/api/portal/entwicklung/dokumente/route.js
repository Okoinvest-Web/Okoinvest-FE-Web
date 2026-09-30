// POST /api/portal/entwicklung/dokumente – multipart: datei, projektId, meilensteinId?, pflicht? (Name der Dokumentenpflicht),
//      freigabeInvestor? / fuerGutachter? (nur Backoffice). Kopfzeile X-Plattform-Upload: 1, PDF/JPG/PNG ≤ 10 MB (Typ an den ersten Bytes).
//      Berechtigt: Backoffice (Projektentwicklung schreiben) und dem Meilenstein zugewiesene Gutachter.
import { route } from "@/lib/plattform/server/route";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { UPLOAD } from "@/lib/plattform/konstanten";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";

function mimeAusBytes(b) {
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "application/pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  return "";
}

export const POST = route({ upload: true }, async ({ nutzer, request }) => {
  rateLimit(`upload:${nutzer.id}`, ...grenze("upload"));
  const laenge = Number(request.headers.get("content-length") || 0);
  if (laenge > UPLOAD.maxBytes + 64 * 1024) throw new PlattformFehler(413, "Die Datei ist größer als 10 MB.");
  if (!(request.headers.get("content-type") || "").startsWith("multipart/form-data")) throw new PlattformFehler(415, "Erwartet wird ein Datei-Upload.");
  let fd; // kaputter multipart-Body → 400 statt 500
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
  const dokument = await entwicklungBackend().entwicklungDokumentSpeichern(nutzer, {
    projektId: String(fd.get("projektId") || ""),
    meilensteinId: String(fd.get("meilensteinId") || ""),
    pflicht: String(fd.get("pflicht") || "").slice(0, 120),
    freigabeInvestor: fd.get("freigabeInvestor") === "1",
    fuerGutachter: fd.get("fuerGutachter") === "1",
    name: datei.name || `dokument.${UPLOAD.typen[mime]}`,
    mime,
    daten,
  });
  return { ok: true, dokument };
});
