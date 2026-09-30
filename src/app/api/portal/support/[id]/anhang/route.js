// POST /api/portal/support/[id]/anhang – multipart: datei (PDF/JPG/PNG ≤ 10 MB, Typ an den ersten Bytes), Kopfzeile X-Plattform-Upload: 1
import { route } from "@/lib/plattform/server/route";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";
import { serviceBackend } from "@/lib/plattform/backend/service";
import { PlattformFehler } from "@/lib/plattform/fehler";

function mimeAusBytes(b) {
  if (b.length >= 5 && b.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  return "";
}

export const POST = route({ upload: true }, async ({ nutzer, params, request }) => {
  rateLimit(`upload:${nutzer.id}`, ...grenze("upload"));
  if (Number(request.headers.get("content-length") || 0) > 10 * 1024 * 1024 + 64 * 1024) throw new PlattformFehler(413, "Die Datei ist größer als 10 MB.");
  if (!(request.headers.get("content-type") || "").startsWith("multipart/form-data")) throw new PlattformFehler(415, "Erwartet wird ein Datei-Upload.");
  const fd = await request.formData();
  const datei = fd.get("datei");
  if (!datei || typeof datei === "string") throw new PlattformFehler(422, "Bitte wählen Sie eine Datei.");
  const daten = Buffer.from(await datei.arrayBuffer());
  const mime = mimeAusBytes(daten);
  if (!mime) throw new PlattformFehler(415, "Erlaubt sind PDF, JPG und PNG.");
  const anhang = await serviceBackend().ticketAnhangSpeichern(nutzer, params.id, { name: datei.name || "anhang", mime, daten });
  return { ok: true, anhang };
});
