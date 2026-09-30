// PATCH /api/portal/konto/komfort – { farbe?, sprache?, kanaele? { email } } → { ok, komfort }
import { route } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";
import { komfortBereinigen } from "@/lib/plattform/organisation";

export const PATCH = route({}, async ({ nutzer, body }) => {
  const u = await sicherheit().komfortSpeichern(nutzer, body);
  return { ok: true, komfort: komfortBereinigen(u?.komfort || {}) };
});
