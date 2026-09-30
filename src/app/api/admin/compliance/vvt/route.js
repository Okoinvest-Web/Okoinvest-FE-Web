// GET /api/admin/compliance/vvt?format=csv|json – Verzeichnis der Verarbeitungstätigkeiten (Entwurf, Art. 30 DSGVO)
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";
const datei = (text, name, typ, latin1 = false) => new Response(latin1 ? Buffer.from(text, "latin1") : text, { headers: { "Content-Type": typ, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });

export const GET = route({ admin: true }, async ({ nutzer, suche }) => {
  const r = await werkzeugeBackend().vvtExport(nutzer, { format: suche.get("format") === "json" ? "json" : "csv" });
  return datei(r.text, r.dateiname, r.typ);
});
