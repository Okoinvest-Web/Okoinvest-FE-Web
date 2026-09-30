// POST /api/auth/magic-link/einloesen – { token } → Sitzung (bzw. 2FA-Zwischenschritt). Einlösen nur per POST von
// der Seite /login/link – ein Vorabruf des Links durch Mail-Scanner verbraucht das Token nicht.
import { route } from "@/lib/plattform/server/route";
import { anmeldungFortsetzen } from "@/lib/plattform/server/anmeldung";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";

export const POST = route({ auth: false, limit: "magicLink" }, async ({ body, request, ip }) => {
  const nutzer = await sicherheit().magicLinkEinloesen({ token: typeof body.token === "string" ? body.token.slice(0, 200) : "" });
  return anmeldungFortsetzen({ request, ip, nutzer, methode: "e-mail-link" });
});
