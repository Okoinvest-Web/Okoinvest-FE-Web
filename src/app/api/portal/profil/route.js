// GET   /api/portal/profil – eigenes Konto
// PATCH /api/portal/profil – { vorname, nachname, firma, telefon, rollen? } (admin nie selbst wählbar)
import { route, nutzerFuerBrowser } from "@/lib/plattform/server/route";

export const GET = route({}, async ({ nutzer }) => ({ ok: true, nutzer: nutzerFuerBrowser(nutzer) }));

export const PATCH = route({}, async ({ backend, nutzer, body }) => ({
  ok: true,
  nutzer: nutzerFuerBrowser(await backend.profilSpeichern(nutzer, body)),
}));
