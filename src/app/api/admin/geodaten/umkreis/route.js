// GET /api/admin/geodaten/umkreis?knoten=<id>&km=<0,5–30> – beste Flächen im Umkreis um ein Umspannwerk/einen Netzknoten
import { route } from "@/lib/plattform/server/route";
import * as geo from "@/lib/plattform/geodaten";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => {
  const knoten = String(suche.get("knoten") || "").slice(0, 80);
  if (!/^[\w.:-]{3,80}$/.test(knoten)) throw new PlattformFehler(400, "Bitte einen Netzknoten wählen.");
  return { ok: true, ...(await geo.umkreis(nutzer, knoten, suche.get("km"))) };
});
