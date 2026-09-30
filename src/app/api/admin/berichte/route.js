// GET /api/admin/berichte?von=JJJJ-MM-TT&bis=JJJJ-MM-TT – Berichte & Analysen (Trichter, Quellen, Pipeline, Provision, Durchlauf, Team)
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer, suche }) => ({ ok: true, bericht: await backend.bericht(nutzer, { von: suche.get("von") || undefined, bis: suche.get("bis") || undefined }) }));
