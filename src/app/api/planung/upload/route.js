// POST /api/planung/upload – multipart (bewusst außerhalb von /api/portal: die Middleware puffert Anfragen höchstens 10 MB,
//      CAD-Dateien dürfen bis 30 MB groß sein; Anmeldung, Rolle, CSRF prüft route() wie überall): datei, projektId, planId? (neuer Planstand) oder Plankopf (plannummer, titel,
//      planart, massstab, blattformat, planer, meilensteinId) sowie planstand (JJJJ-MM-TT), aenderung. Kopfzeile
//      X-Plattform-Upload: 1. DWG/DXF ≤ 30 MB, PDF ≤ 25 MB, Shapefile-ZIP ≤ 20 MB, KML/KMZ/GeoJSON ≤ 10 MB – Typ an den ersten
//      Bytes erkannt. Berechtigt: Backoffice (Projektentwicklung schreiben), Gutachter/Planer am zugewiesenen Meilenstein.
import { route } from "@/lib/plattform/server/route";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { MAX_UPLOAD_BYTES } from "@/lib/plattform/planung/regeln";
import { planungBackend } from "@/lib/plattform/backend/planung";

const feld = (fd, k, max = 160) => String(fd.get(k) || "").slice(0, max);

export const POST = route({ upload: true }, async ({ nutzer, request }) => {
  rateLimit(`upload:${nutzer.id}`, ...grenze("upload"));
  const laenge = Number(request.headers.get("content-length") || 0);
  if (laenge > MAX_UPLOAD_BYTES + 64 * 1024) throw new PlattformFehler(413, "Die Datei ist zu groß (höchstens 30 MB).");
  if (!(request.headers.get("content-type") || "").startsWith("multipart/form-data")) throw new PlattformFehler(415, "Erwartet wird ein Datei-Upload.");
  let fd; // kaputter multipart-Body → 400 statt 500
  try {
    fd = await request.formData();
  } catch {
    throw new PlattformFehler(400, "Die Datei konnte nicht gelesen werden. Bitte versuchen Sie es erneut.");
  }
  const datei = fd.get("datei");
  if (!datei || typeof datei === "string") throw new PlattformFehler(422, "Bitte wählen Sie eine Datei.");
  if (datei.size > MAX_UPLOAD_BYTES) throw new PlattformFehler(413, "Die Datei ist zu groß (höchstens 30 MB).");
  const daten = Buffer.from(await datei.arrayBuffer());
  const r = await planungBackend().planungHochladen(nutzer, {
    projektId: feld(fd, "projektId", 60),
    planId: feld(fd, "planId", 60),
    plan: { plannummer: feld(fd, "plannummer", 40), titel: feld(fd, "titel"), planart: feld(fd, "planart", 30), massstab: feld(fd, "massstab", 20), blattformat: feld(fd, "blattformat", 20), planer: feld(fd, "planer", 120), meilensteinId: feld(fd, "meilensteinId", 60) },
    version: { planstand: feld(fd, "planstand", 10), planer: feld(fd, "planer", 120), aenderung: feld(fd, "aenderung", 300) },
    name: datei.name || "plan",
    daten,
  });
  return Response.json({ ok: true, ...r }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
