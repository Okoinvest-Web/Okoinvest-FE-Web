// GET /api/admin/geodaten/netz?bbox=&arten=uew,uw110,ms,trafo – Netzknoten (Umspannwerke/Trafostationen) als GeoJSON
import { route } from "@/lib/plattform/server/route";
import * as geo from "@/lib/plattform/geodaten";
import { bboxLesen } from "@/lib/plattform/geodaten/geo";

const ARTEN = ["uew", "uw110", "ms", "trafo"];

export const GET = route({ admin: true }, async ({ nutzer, suche }) => {
  const arten = String(suche.get("arten") || ARTEN.join(",")).split(",").filter((a) => ARTEN.includes(a));
  return { ok: true, ...(await geo.netzknoten(nutzer, { bbox: bboxLesen(suche.get("bbox"), { maxGrad: 6 }) || undefined, arten })) };
});
