// POST /api/admin/finanzen/buchhaltung/einstellungen – { mahnwesen?, konten? } (Bereich „finanzen“ schreiben)
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";

export const POST = route({ admin: true }, async ({ nutzer, body }) => werkzeugeBackend().bhEinstellungenSpeichern(nutzer, { mahnwesen: body.mahnwesen, konten: body.konten }));
