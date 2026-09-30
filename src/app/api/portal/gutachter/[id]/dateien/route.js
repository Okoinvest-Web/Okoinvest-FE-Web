// POST /api/portal/gutachter/[id]/dateien – multipart: datei (PDF/JPG/PNG ≤ 10 MB), zweck = lieferung | rechnung,
//      bei Lieferung art = entwurf | endfassung, kommentar; bei Rechnung rechnung = JSON { art, nummer, datum, leistungVon,
//      leistungBis, netto, ustPct, ustHinweis, iban }. Kopfzeile X-Plattform-Upload: 1. Nur der beauftragte Gutachter.
import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { formularDatei } from "@/lib/plattform/server/formularDatei";
import { gutachterBackend } from "@/lib/plattform/backend/gutachter";

export const POST = route({ rollen: ["gutachter"], upload: true }, async ({ nutzer, params, request }) => {
  const { fd, daten, mime, name } = await formularDatei(request, nutzer);
  let rechnung = null;
  if (fd.get("zweck") === "rechnung") {
    try {
      rechnung = JSON.parse(String(fd.get("rechnung") || "{}").slice(0, 4000));
    } catch {
      throw new PlattformFehler(400, "Die Rechnungsdaten sind ungültig.");
    }
  }
  const r = await gutachterBackend().gaDateiSpeichern(nutzer, params.id, {
    zweck: String(fd.get("zweck") || ""), art: String(fd.get("art") || "endfassung"), kommentar: String(fd.get("kommentar") || "").slice(0, 500), rechnung, name, mime, daten,
  });
  return Response.json(r, { status: 201, headers: { "Cache-Control": "no-store" } });
});
