// POST /api/auth/passwort-setzen – { token, passwort } → neues Passwort, alle alten Sitzungen ungültig, neu angemeldet
// (bei aktiver Zwei-Faktor-Anmeldung erst nach dem Code-Schritt – der Reset-Link ersetzt keinen zweiten Faktor)
import { route } from "@/lib/plattform/server/route";
import { anmeldungFortsetzen } from "@/lib/plattform/server/anmeldung";
import { passwortLeakPruefen } from "@/lib/plattform/server/leak";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";

export const POST = route({ auth: false, limit: "passwort" }, async ({ body, backend, request, ip }) => {
  await passwortLeakPruefen(body.passwort);
  const nutzer = await backend.passwortSetzen({ token: body.token, passwort: body.passwort, ip });
  const status = await sicherheit().zweiFaktorStatus(nutzer);
  return anmeldungFortsetzen({ request, ip, nutzer: { ...nutzer, zweiFaktorAktiv: !!status?.aktiv }, methode: "passwort-reset" });
});
