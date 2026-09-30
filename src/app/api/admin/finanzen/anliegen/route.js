// GET /api/admin/finanzen/anliegen?status=offen|alle – Kundenanliegen (Einsprüche, Kündigungen, Verlängerungen, Übernahmen)
// Bereich „finanzen“ lesen (rechte.js, aus dem Pfad abgeleitet).
import { route } from "@/lib/plattform/server/route";
import { kundenenergieBackend } from "@/lib/plattform/backend/kundenenergie";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, anliegen: await kundenenergieBackend().kundenAnliegen(nutzer, { status: suche.get("status") === "alle" ? "alle" : "offen" }) }));
