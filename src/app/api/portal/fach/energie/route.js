// GET /api/portal/fach/energie – Abnahmestellen, Lastgänge, Energiegemeinschaft, Genossenschaft des Kontos (Fachprüfung Kapitalseite)
import { route } from "@/lib/plattform/server/route";
import { fachBackend } from "@/lib/plattform/backend/fach";

export const GET = route({}, async ({ nutzer, suche }) => ({ ok: true, ...(await fachBackend().energieDaten(nutzer, { nutzerId: suche.get("nutzerId") || undefined })) }));
