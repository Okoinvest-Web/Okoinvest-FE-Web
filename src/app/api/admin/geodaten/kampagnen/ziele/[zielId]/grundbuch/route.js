// POST /api/admin/geodaten/kampagnen/ziele/[zielId]/grundbuch { empfaenger: [{ anrede, titel, vorname, nachname, firma, zusatz,
//      strasse, plz, ort, land, flurstuecke[] }], kostenIst? } – Ergebnis der Grundbuchabfrage (manuell), Sperrlisten-Abgleich
import { route } from "@/lib/plattform/server/route";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";

const RECHT = [{ bereich: "geodaten", stufe: 2 }, { bereich: "akquise", stufe: 2 }];

export const POST = route({ admin: true, recht: RECHT }, async ({ nutzer, params, body }) => ({ ok: true, ...(await akquise2Backend().grundbuchErgebnis(nutzer, params.zielId, body)) }));
