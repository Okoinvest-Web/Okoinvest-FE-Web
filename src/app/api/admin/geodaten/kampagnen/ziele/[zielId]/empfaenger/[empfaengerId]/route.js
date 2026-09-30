// PATCH /api/admin/geodaten/kampagnen/ziele/[zielId]/empfaenger/[empfaengerId] { rueckmeldung?, termin?{am,notiz},
//       status? (reaktion|termin|gesichert|abgelehnt), gesichertHa?, einwilligungTelefon?{quelle,telefon}|null, einwilligungEmail? }
// POST  … { grund, quelle, notiz } – Widerspruch/Sperre (wirkt über alle Kampagnen)
import { route } from "@/lib/plattform/server/route";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";

const RECHT = [{ bereich: "geodaten", stufe: 2 }, { bereich: "akquise", stufe: 2 }];

export const PATCH = route({ admin: true, recht: RECHT }, async ({ nutzer, params, body }) => ({ ok: true, ...(await akquise2Backend().empfaengerAendern(nutzer, params.zielId, params.empfaengerId, body)) }));
export const POST = route({ admin: true, recht: RECHT }, async ({ nutzer, params, body }) => ({ ok: true, ...(await akquise2Backend().empfaengerSperren(nutzer, params.zielId, params.empfaengerId, { grund: body.grund, quelle: body.quelle, notiz: body.notiz })) }));

