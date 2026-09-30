// GET /api/portal/anlagen?q=&typ=&status= – Anlagen, die das Konto sehen darf (Kunde: eigene/Organisation; Betrieb: alle),
// mit Live-Wert, Summen heute/Monat/Jahr, Ampel und Gesamtsummen. Erst Rechte (Backend), dann Messdaten.
import { route } from "@/lib/plattform/server/route";
import { anlagenMitStatus } from "@/lib/plattform/messdaten/auswertung";

export const GET = route({}, async ({ nutzer, suche }) => ({
  ok: true,
  ...(await anlagenMitStatus(nutzer, { q: suche.get("q") || "", typ: suche.get("typ") || "", status: suche.get("status") || "" })),
}));
