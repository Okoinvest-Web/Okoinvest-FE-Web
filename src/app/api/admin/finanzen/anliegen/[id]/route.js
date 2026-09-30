// POST /api/admin/finanzen/anliegen/[id] – Entscheidung des Backoffice (Bereich „finanzen“ schreiben)
//   { aktion: pruefen | stattgeben {begruendung, korrekturEur?} | teilweise {begruendung, korrekturEur} | ablehnen {begruendung}
//            | bestaetigen {begruendung} | angebot {betragEur, stichtag | jahre, preisCt, grundgebuehrMonat?; gueltigBis, text?} }
import { route } from "@/lib/plattform/server/route";
import { kundenenergieBackend } from "@/lib/plattform/backend/kundenenergie";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, anliegen: await kundenenergieBackend().kundenAnliegenAktion(nutzer, params.id, body) }));
