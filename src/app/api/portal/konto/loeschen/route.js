// POST /api/portal/konto/loeschen – { passwort, bestaetigung: "LÖSCHEN" } → Konto löschen (Art. 17 DSGVO), abmelden
import { route, antwort, sitzungLoeschen } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";

export const POST = route({ limit: "passwort", ohne2fa: true }, async ({ nutzer, body }) => {
  await sicherheit().kontoLoeschen(nutzer, { passwort: typeof body.passwort === "string" ? body.passwort : "", bestaetigung: body.bestaetigung });
  return sitzungLoeschen(antwort({ ok: true }));
});
