// POST   /api/admin/anlagen/[id]/eintraege – { art: komponente|messpunkt|wartung|vertrag|monatswert, id?, daten }
// DELETE /api/admin/anlagen/[id]/eintraege?art=…&id=… – Komponente, Messpunkt (ohne Monatswerte), Wartung, Monatswert
import { route } from "@/lib/plattform/server/route";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({
  ok: true,
  eintrag: await anlagenBackend().anlageEintragSpeichern(nutzer, params.id, { art: body.art, id: body.id || null, daten: body.daten || {} }),
}));

export const DELETE = route({ admin: true, json: false }, async ({ nutzer, params, suche }) =>
  anlagenBackend().anlageEintragLoeschen(nutzer, params.id, { art: suche.get("art"), id: suche.get("id") })
);
