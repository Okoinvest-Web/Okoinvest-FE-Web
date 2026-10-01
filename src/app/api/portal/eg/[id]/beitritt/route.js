// POST /api/portal/eg/[id]/beitritt – Beitrittsantrag mit Zählpunkten, Zustimmungen und einfacher elektronischer
// Unterschrift (WP6). Legt Mitglied (Status „antrag“) und Teilnahme-Entwürfe über die WP1-Operationen an.
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const POST = route({ limit: "anfrage", maxBytes: 32 * 1024 }, async ({ nutzer, params, body, ip }) => egBackend().ptBeitrittAntrag(nutzer, params.id, { daten: body.daten || {} }, { ip }));
