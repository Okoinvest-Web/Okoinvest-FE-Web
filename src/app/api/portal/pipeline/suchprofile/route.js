// PUT /api/portal/pipeline/suchprofile – { profile: [{ id?, name, mwpMin, mwpMax, phasen, laender, typen, ticketMin, ticketMax, schwelle }] }
//     Gespeicherte Suchprofile (zusätzlich zum Hauptprofil am Konto), höchstens 8
import { route } from "@/lib/plattform/server/route";
import { dealroom } from "@/lib/plattform/backend/dealroom";

export const PUT = route({ rollen: ["investor"] }, async ({ nutzer, body }) => ({ ok: true, suchprofile: await dealroom().suchprofileSpeichern(nutzer, body.profile) }));
