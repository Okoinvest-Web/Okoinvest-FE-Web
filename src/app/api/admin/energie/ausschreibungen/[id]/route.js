// Ausschreibung (Backoffice): GET Detail inkl. normiertem Vergleich · POST {aktion: starten | einladen | frist | beenden |
// naechsteRunde | erinnern | antworten | zuschlagVorschlag | zuschlag | vorschlagZurueck | abbrechen, …}
import { route, basisUrl } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, ...(await energieBackend().energieAusschreibung(nutzer, params.id)) }));
export const POST = route({ admin: true }, async ({ nutzer, params, body, request }) => ({ ok: true, ausschreibung: await energieBackend().energieAusschreibungAktion(nutzer, params.id, { ...body, basisUrl: basisUrl(request) }) }));
