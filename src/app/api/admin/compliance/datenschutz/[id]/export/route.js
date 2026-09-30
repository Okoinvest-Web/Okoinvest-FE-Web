// GET /api/admin/compliance/datenschutz/[id]/export – Datenauskunft (Art. 15/20) des verknüpften Kontos als JSON (Compliance)
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";
const datei = (text, name, typ, latin1 = false) => new Response(latin1 ? Buffer.from(text, "latin1") : text, { headers: { "Content-Type": typ, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });

export const GET = route({ admin: true }, async ({ nutzer, params, ip }) => {
  const r = await werkzeugeBackend().dsExport(nutzer, params.id, { ip });
  return datei(r.text, r.dateiname, "application/json; charset=utf-8");
});
