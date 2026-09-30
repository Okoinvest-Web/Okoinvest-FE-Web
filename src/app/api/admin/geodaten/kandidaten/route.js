// GET /api/admin/geodaten/kandidaten?bbox=&minHa=&maxTrasseKm=&minScore=&bundesland=&bezirk=&gemeinde=&ampel=&q=&limit=
//     Kandidatenflächen (Verbünde) mit Score, Geometrie (GeoJSON, WGS84), Netz, Widmung, Kennzahlen.
import { route } from "@/lib/plattform/server/route";
import * as geo from "@/lib/plattform/geodaten";
import { bboxLesen } from "@/lib/plattform/geodaten/geo";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ...(await geo.kandidaten(nutzer, geo.filterLesen(suche, bboxLesen))) }));
