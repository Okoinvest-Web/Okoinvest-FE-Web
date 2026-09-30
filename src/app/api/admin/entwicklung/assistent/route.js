// GET /api/admin/entwicklung/assistent?flaecheId=&land=&typ=&start= – Vorlage-Assistent „Neues Projekt aus Fläche“:
//     Vorschlag (Typ, Land, MWp aus ha), Meilenstein-Plan mit Soll-Terminen und kritischem Pfad, Monate bis COD
import { route } from "@/lib/plattform/server/route";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({
  ok: true,
  ...(await entwicklungBackend().entwicklungAssistent(nutzer, { flaecheId: suche.get("flaecheId") || "", land: suche.get("land") || "", typ: suche.get("typ") || "", start: suche.get("start") || "" })),
}));
