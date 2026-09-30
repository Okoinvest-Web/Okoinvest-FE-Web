// POST /api/admin/geodaten/kampagnen/[id]/versand { stufe: 1|2, empfaengerIds? } – Versand bestätigen (Briefe vermerken)
import { route } from "@/lib/plattform/server/route";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";

const RECHT = [{ bereich: "geodaten", stufe: 2 }, { bereich: "akquise", stufe: 2 }];

export const POST = route({ admin: true, recht: RECHT }, async ({ nutzer, params, body }) => akquise2Backend().versandBestaetigen(nutzer, params.id, { stufe: body.stufe, empfaengerIds: Array.isArray(body.empfaengerIds) ? body.empfaengerIds.slice(0, 2000) : undefined }));
