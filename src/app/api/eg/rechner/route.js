// POST /api/eg/rechner – öffentlicher Ersparnis-Rechner Energiegemeinschaft (WP6), ohne Personendaten.
// Gleiche reine Funktion wie im Browser (eg/interesse.js rechnerOeffentlich, Python eg_portal_kern.rechner_oeffentlich).
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const POST = route({ auth: false, limit: "nachricht", maxBytes: 8 * 1024 }, async ({ body }) => ({ ok: true, ergebnis: await egBackend().ptRechner(null, { daten: body.daten || {} }) }));
