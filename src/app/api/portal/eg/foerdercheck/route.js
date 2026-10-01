// POST /api/portal/eg/foerdercheck – Förder-Check (WP5) { gemeinschaftId?, auftragId?, daten: { modell, bundesland, antragsteller,
//   gemeindeBeteiligt, anlagen[{art, kwp, speicherKwh, status, bezeichnung}] }, speichern? } → Programme mit Ergebnis, Gründen, Quellen
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const POST = route({}, async ({ nutzer, body }) => ({ ok: true, ...(await egBackend().grFoerdercheck(nutzer, { gemeinschaftId: body?.gemeinschaftId || "", auftragId: body?.auftragId || "", daten: body?.daten || {}, speichern: body?.speichern === true })) }));
