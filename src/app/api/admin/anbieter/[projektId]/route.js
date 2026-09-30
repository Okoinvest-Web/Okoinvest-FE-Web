// POST /api/admin/anbieter/[projektId] – Backoffice (Bereich „projekte“, schreiben): { aktion: pruefpunkt_anlegen {bereich,text,pflicht,fristTage} ·
//      pruefpunkt {id, schritt: erledigt|erneut|verwerfen, kommentar} · mandat_bestaetigen · vorkenntnis_entscheiden {id, entscheidung, grund} }
import { route } from "@/lib/plattform/server/route";
import { anbieterBackend } from "@/lib/plattform/backend/anbieter";

export const POST = route({ admin: true, recht: "projekte" }, async ({ nutzer, params, body, ip }) => ({
  ok: true,
  akte: await anbieterBackend().anbieterAdminAktion(nutzer, params.projektId, body, { ip }),
}));
