// src/lib/plattform/server/formularDatei.js
//
// Datei-Upload aus multipart/form-data lesen (Gutachteraufträge, Bank-Akte): Größe ≤ 10 MB, Typ an den ersten Bytes
// (PDF/JPG/PNG – die Dateiendung zählt nicht), Rate-Limit je Konto. Die Route selbst setzt route({ upload: true }).

import { rateLimit, grenze } from "./rateLimit";
import { PlattformFehler } from "../fehler";
import { UPLOAD } from "../konstanten";

export function mimeAusBytes(b) {
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "application/pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  return "";
}

/** → { fd, daten (Buffer), mime, name } oder PlattformFehler (400/413/415/422/429) */
export async function formularDatei(request, nutzer) {
  rateLimit(`upload:${nutzer.id}`, ...grenze("upload"));
  const laenge = Number(request.headers.get("content-length") || 0);
  if (laenge > UPLOAD.maxBytes + 64 * 1024) throw new PlattformFehler(413, "Die Datei ist größer als 10 MB.");
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
  return { fd, daten, mime, name: datei.name || `datei.${UPLOAD.typen[mime]}` };
}

/** Download-Antwort (privat, kein Caching, Sandbox) */
export function dateiAntwort(d) {
  return new Response(d.daten, { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox", "Content-Type": d.mime, "Content-Disposition": `attachment; filename="${String(d.name).replace(/[^A-Za-z0-9._-]/g, "_")}"` } });
}
export function pdfAntwort(buf, name) {
  return new Response(buf, { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${String(name).replace(/[^A-Za-z0-9._-]/g, "_")}"` } });
}
