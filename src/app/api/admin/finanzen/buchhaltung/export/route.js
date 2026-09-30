// GET /api/admin/finanzen/buchhaltung/export?format=datev|bmd|op&von=JJJJ-MM-TT&bis=JJJJ-MM-TT – Datei (DATEV: ISO-8859-1)
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";
const datei = (text, name, typ, latin1 = false) => new Response(latin1 ? Buffer.from(text, "latin1") : text, { headers: { "Content-Type": typ, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });

export const GET = route({ admin: true }, async ({ nutzer, suche }) => {
  const r = await werkzeugeBackend().bhExport(nutzer, { format: suche.get("format") || "datev", von: suche.get("von") || "", bis: suche.get("bis") || "" });
  return datei(r.text, r.dateiname, r.zeichensatz === "latin1" ? "text/csv; charset=iso-8859-1" : "text/csv; charset=utf-8", r.zeichensatz === "latin1");
});
