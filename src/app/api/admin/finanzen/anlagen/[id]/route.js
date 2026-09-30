// PUT /api/admin/finanzen/anlagen/[id] – Anlage aktivieren/ändern { anschaffungswert, nutzungsdauerJahre, inbetriebnahme, regel (AT|DE|CH), bemerkung? }
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const PUT = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, asset: await finanzenBackend().finanzAnlageSpeichern(nutzer, params.id, body) }));
