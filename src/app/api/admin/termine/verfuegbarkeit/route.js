// GET   /api/admin/termine/verfuegbarkeit – Mitarbeiter mit Arbeitszeiten, Terminarten, Abwesenheiten; Feiertage
// PATCH /api/admin/termine/verfuegbarkeit – { kontoId, arbeitszeiten?{1:[["09:00","12:00"]]…}, terminarten?[], aktiv? } (schreiben)
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await serviceBackend().verfuegbarkeiten(nutzer)) }));

export const PATCH = route({ admin: true }, async ({ nutzer, body }) => ({
  ok: true,
  verfuegbarkeit: await serviceBackend().verfuegbarkeitSpeichern(nutzer, body.kontoId, { arbeitszeiten: body.arbeitszeiten, terminarten: body.terminarten, aktiv: body.aktiv }),
}));
