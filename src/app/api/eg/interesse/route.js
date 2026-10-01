// POST /api/eg/interesse – öffentliches Interesse an einer Energiegemeinschaft (WP6, Fachkonzept 2.1): schmale Daten,
// Einwilligung Pflicht; Antwort mit passenden Gemeinschaften ohne Personendaten. Angemeldet: Zuordnung zum Konto.
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const POST = route({ auth: "optional", limit: "anfrage", maxBytes: 16 * 1024 }, async ({ nutzer, body, ip }) => {
  if (body.website) return { ok: true, id: "", passend: [] }; // Honeypot
  return egBackend().ptInteresse(nutzer, { daten: body.daten || {} }, { ip });
});
