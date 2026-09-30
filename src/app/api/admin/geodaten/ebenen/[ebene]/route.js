// GET /api/admin/geodaten/ebenen/[schutzgebiete|zonen]?bbox= – Kartenebenen als GeoJSON
import { route } from "@/lib/plattform/server/route";
import * as geo from "@/lib/plattform/geodaten";
import { bboxLesen } from "@/lib/plattform/geodaten/geo";

export const GET = route({ admin: true }, async ({ nutzer, params, suche }) => ({
  ok: true,
  ...(await geo.ebene(nutzer, String(params.ebene || ""), { bbox: bboxLesen(suche.get("bbox"), { maxGrad: 6 }) || undefined })),
}));
