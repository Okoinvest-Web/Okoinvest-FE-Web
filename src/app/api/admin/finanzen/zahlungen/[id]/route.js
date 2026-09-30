// POST /api/admin/finanzen/zahlungen/[id] – Zahlungslauf { aktion: bestaetigen (Bank hat ausgeführt → bezahlt) | verwerfen }
import { route } from "@/lib/plattform/server/route";
import { finanzenBackend } from "@/lib/plattform/backend/finanzen";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, zahlungslauf: await finanzenBackend().zahlungslaufAktion(nutzer, params.id, body) }));
