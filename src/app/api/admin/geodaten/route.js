// GET /api/admin/geodaten – Übersicht Akquise-Karte: Modus (demo|dienst), Quellen/Lizenzen, Kennzahlen, Gebiete für Filter,
//     übernommene Akquise-Ziele. Bereich „geodaten“ lesen (Leitung, Akquise).
import { route } from "@/lib/plattform/server/route";
import * as geo from "@/lib/plattform/geodaten";

export const GET = route({ admin: true }, async ({ nutzer }) => {
  const [u, z] = await Promise.all([geo.uebersicht(nutzer), geo.ziele(nutzer)]);
  return { ok: true, ...u, ziele: z.ziele };
});
