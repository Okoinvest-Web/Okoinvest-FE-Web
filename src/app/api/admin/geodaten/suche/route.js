// GET /api/admin/geodaten/suche?q= – Gemeinde/Ort, KG, Grundstücksnummer („KG-Nr Gst-Nr“), Umspannwerk, Kandidat
import { route } from "@/lib/plattform/server/route";
import * as geo from "@/lib/plattform/geodaten";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ...(await geo.suche(nutzer, String(suche.get("q") || "").slice(0, 80))) }));
