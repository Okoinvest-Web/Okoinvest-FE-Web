// GET /api/admin/bonitaet/status?kontoId=&organisationId= – nur Pflicht/erfüllt (OHNE Ergebnis) für die NDA-&-LOI-Übersicht
//     (Bereich „interessen“ lesen genügt; die Auskunfts-ID sieht nur, wer Bonität lesen darf)
import { route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const GET = route({ admin: true, recht: [{ bereich: "interessen", stufe: 1 }] }, async ({ nutzer, suche }) => ({ ok: true, ...(await diensteBackend().bonitaetStatus(nutzer, { kontoId: suche.get("kontoId") || null, organisationId: suche.get("organisationId") || null })) }));
