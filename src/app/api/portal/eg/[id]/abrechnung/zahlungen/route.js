// POST /api/portal/eg/[id]/abrechnung/zahlungen – Zahlungslauf { art: pain008|pain001, belegIds?, ausfuehrungAm? }
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const POST = route({ maxBytes: 128 * 1024 }, async ({ nutzer, params, body }) => ({ ok: true, ...(await egBackend().abZahlungslauf(nutzer, params.id, { art: body?.art, belegIds: body?.belegIds || null, ausfuehrungAm: body?.ausfuehrungAm || "" })) }));
