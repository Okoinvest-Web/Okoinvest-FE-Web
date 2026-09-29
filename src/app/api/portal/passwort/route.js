// POST /api/portal/passwort – { alt, neu } → andere Sitzungen werden ungültig, diese erhält ein neues Cookie
import { route, antwort, sitzungSetzen } from "@/lib/plattform/server/route";

export const POST = route({ limit: "passwort" }, async ({ backend, nutzer, body }) => {
  const neu = await backend.passwortAendern(nutzer, { alt: body.alt, neu: body.neu });
  return sitzungSetzen(antwort({ ok: true }), neu);
});
