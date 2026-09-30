// GET  /api/portal/dokumente[?bezug=art:id] – Dokumente (nur berechtigte)
// POST /api/portal/dokumente – multipart: datei, bezugArt, bezugId, kategorie, checkliste? (Schlüssel eines Checklisten-Punkts)
//      Kopfzeile X-Plattform-Upload: 1 (CSRF), PDF/JPG/PNG ≤ 10 MB, Typ an den ersten Bytes geprüft
import { route } from "@/lib/plattform/server/route";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { UPLOAD } from "@/lib/plattform/konstanten";

export const GET = route({}, async ({ backend, nutzer, suche }) => {
  const bezug = suche.get("bezug");
  const [bezugArt, bezugId] = bezug ? bezug.split(":") : [];
  return { ok: true, dokumente: await backend.dokumente(nutzer, bezugArt ? { bezugArt, bezugId } : {}) };
});

/** Dateityp an den ersten Bytes erkennen (nie dem Browser-MIME trauen) */
function mimeAusBytes(b) {
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "application/pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  return "";
}

export const POST = route({ upload: true }, async ({ backend, nutzer, request }) => {
  rateLimit(`upload:${nutzer.id}`, ...grenze("upload"));
  const laenge = Number(request.headers.get("content-length") || 0);
  if (laenge > UPLOAD.maxBytes + 64 * 1024) throw new PlattformFehler(413, "Die Datei ist größer als 10 MB.");
  if (!(request.headers.get("content-type") || "").startsWith("multipart/form-data")) throw new PlattformFehler(415, "Erwartet wird ein Datei-Upload.");
  const fd = await request.formData();
  const datei = fd.get("datei");
  if (!datei || typeof datei === "string") throw new PlattformFehler(422, "Bitte wählen Sie eine Datei.");
  if (datei.size > UPLOAD.maxBytes) throw new PlattformFehler(413, "Die Datei ist größer als 10 MB.");
  const daten = Buffer.from(await datei.arrayBuffer());
  const mime = mimeAusBytes(daten);
  if (!mime) throw new PlattformFehler(415, "Erlaubt sind PDF, JPG und PNG.");
  const dokument = await backend.dokumentSpeichern(nutzer, {
    bezugArt: String(fd.get("bezugArt") || ""),
    bezugId: String(fd.get("bezugId") || ""),
    kategorie: String(fd.get("kategorie") || "allgemein"),
    checkliste: String(fd.get("checkliste") || "").slice(0, 40),
    name: datei.name || `dokument.${UPLOAD.typen[mime]}`,
    mime,
    daten,
  });
  return { ok: true, dokument };
});
