// POST /api/portal/passwort – { alt, neu } → andere Sitzungen werden ungültig, diese erhält eine neue Sitzung (Rotation)
// Optional (PLATTFORM_HIBP=1): neues Passwort gegen bekannte Datenlecks prüfen.
import { route } from "@/lib/plattform/server/route";
import { sitzungStarten } from "@/lib/plattform/server/anmeldung";
import { passwortLeakPruefen } from "@/lib/plattform/server/leak";

export const POST = route({ limit: "passwort", ohne2fa: true }, async ({ backend, nutzer, body, request, ip }) => {
  await passwortLeakPruefen(body.neu);
  const neu = await backend.passwortAendern(nutzer, { alt: body.alt, neu: body.neu });
  return sitzungStarten({ request, ip, nutzer: neu, methode: "passwort-geaendert", zweiFaktor: !!nutzer.sitzung?.zweiFaktor, ersetzt: nutzer.sitzung?.id || null });
});
