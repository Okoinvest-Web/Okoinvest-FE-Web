// GET /api/admin/geodaten/kandidaten/[id] – Steckbrief einer Kandidatenfläche (Score-Begründung, Parzellen, Netz, Kosten)
import { route } from "@/lib/plattform/server/route";
import * as geo from "@/lib/plattform/geodaten";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, kandidat: await geo.kandidat(nutzer, String(params.id || "").slice(0, 80)) }));
