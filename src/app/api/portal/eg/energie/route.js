// GET /api/portal/eg/energie?zaehlpunkt=…&von=JJJJ-MM-TT&bis=… – Energiedaten des eigenen Zählpunkts (WP6 liest über WP3).
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const GET = route({}, async ({ nutzer, suche }) => ({ ok: true, ...(await egBackend().ptEnergie(nutzer, { zaehlpunktId: suche.get("zaehlpunkt") || "", von: suche.get("von") || "", bis: suche.get("bis") || "" })) }));
