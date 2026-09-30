// POST /api/portal/dienste/identitaet/demo – nur Demo-Anbieter: Ergebnis der eigenen Sitzung simulieren
//      { sitzungId, ergebnis: bestanden|pruefen|abgelehnt|abgebrochen } → signierter Webhook über denselben Prüfpfad
import { route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const POST = route({}, async ({ nutzer, body }) => diensteBackend().identDemoAbschluss(nutzer, { sitzungId: body.sitzungId, ergebnis: body.ergebnis }));
