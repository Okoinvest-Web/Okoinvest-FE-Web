// POST /api/auth/passwort-setzen – { token, passwort } → neues Passwort, alle alten Sitzungen ungültig, neu angemeldet
import { route, antwort, sitzungSetzen, nutzerFuerBrowser } from "@/lib/plattform/server/route";

export const POST = route({ auth: false, limit: "passwort" }, async ({ body, backend, ip }) => {
  const nutzer = await backend.passwortSetzen({ token: body.token, passwort: body.passwort, ip });
  return sitzungSetzen(antwort({ ok: true, nutzer: nutzerFuerBrowser(nutzer) }), nutzer);
});
