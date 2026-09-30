// POST /api/portal/kyc/dokumente – multipart: datei, art, flaecheId?, personId?, ausgestelltAm?
//      Kopfzeile X-Plattform-Upload: 1 (CSRF), nur PDF/JPG/PNG ≤ 10 MB, Typ an den ersten Bytes (Magic Bytes) geprüft.
//      Ablage verschlüsselt (Demo: AES-256-GCM, Frappe: privates File + AES-256-GCM).
import { route } from "@/lib/plattform/server/route";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { KYC_UPLOAD } from "@/lib/plattform/kyc";
import { kycBackend } from "@/lib/plattform/backend/kyc";
import { mimeAusBytes } from "@/lib/plattform/server/kycDatei";

export const POST = route({ upload: true }, async ({ nutzer, request }) => {
  rateLimit(`kyc-upload:${nutzer.id}`, ...grenze("upload"));
  const laenge = Number(request.headers.get("content-length") || 0);
  if (laenge > KYC_UPLOAD.maxBytes + 64 * 1024) throw new PlattformFehler(413, "Die Datei ist größer als 10 MB.");
  if (!(request.headers.get("content-type") || "").startsWith("multipart/form-data")) throw new PlattformFehler(415, "Erwartet wird ein Datei-Upload.");
  let fd;
  try {
    fd = await request.formData();
  } catch {
    // Übertragung abgebrochen bzw. Body-Grenze des Servers überschritten (Uploads ohne Content-Length)
    throw new PlattformFehler(413, "Die Datei ist größer als 10 MB oder die Übertragung ist fehlgeschlagen.");
  }
  const datei = fd.get("datei");
  if (!datei || typeof datei === "string") throw new PlattformFehler(422, "Bitte wählen Sie eine Datei.");
  if (datei.size > KYC_UPLOAD.maxBytes) throw new PlattformFehler(413, "Die Datei ist größer als 10 MB.");
  const daten = Buffer.from(await datei.arrayBuffer());
  const mime = mimeAusBytes(daten);
  if (!mime) throw new PlattformFehler(415, "Erlaubt sind PDF, JPG und PNG.");
  const dokument = await kycBackend().kycDokumentSpeichern(nutzer, {
    art: String(fd.get("art") || ""),
    flaecheId: String(fd.get("flaecheId") || "") || null,
    personId: String(fd.get("personId") || "").slice(0, 20) || null,
    ausgestelltAm: String(fd.get("ausgestelltAm") || "").slice(0, 10) || null,
    name: datei.name || `unterlage.${KYC_UPLOAD.typen[mime]}`,
    mime,
    daten,
  });
  return { ok: true, dokument };
});
