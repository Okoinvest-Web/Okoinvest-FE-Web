// /api/portal/eg/[id]/eda – Vier-Augen-Freigaben der EDA-Massenvorgänge für den Vorstand (WP2)
// GET  → { freigaben[], darfFreigeben } (Recht eda_freigeben ≥ 1 in der Gemeinschaft, sonst 403/404)
// POST { prozessIds[], entscheidung: "erteilen"|"ablehnen", grund? } → { freigegeben, abgelehnt, fehler[] } (eda_freigeben 2,
//      nicht durch die beantragende Person). Danach sendet die Plattform die Abmeldungen bzw. TF-Änderungen an den Netzbetreiber.
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, ...(await egBackend().edaFreigaben(nutzer, params.id)) }));

export const POST = route({}, async ({ nutzer, params, body }) => ({ ok: true, ...(await egBackend().edaFreigeben(nutzer, params.id, { prozessIds: body.prozessIds, entscheidung: body.entscheidung, grund: body.grund })) }));
