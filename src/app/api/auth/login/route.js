// POST /api/auth/login – { email, passwort } → Sitzungscookie
// Mit aktiver Zwei-Faktor-Anmeldung (und nicht gemerktem Gerät): { ok, zweiFaktor: true } + Zwischen-Cookie,
// die Sitzung entsteht erst nach POST /api/auth/zwei-faktor. Kontosperre mit Backoff → 429 (code „gesperrt“).
import { route } from "@/lib/plattform/server/route";
import { anfrageKontext, anmeldungFortsetzen } from "@/lib/plattform/server/anmeldung";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { email as emailPruefen } from "@/lib/plattform/validierung";

export const POST = route({ auth: false, limit: "login" }, async ({ body, backend, request, ip }) => {
  const email = emailPruefen(body.email);
  if (!email || typeof body.passwort !== "string" || !body.passwort) throw new PlattformFehler(422, "Bitte E-Mail-Adresse und Passwort eingeben.");
  rateLimit(`loginEmail:${email}`, ...grenze("loginEmail"));
  const k = anfrageKontext(request, ip);
  const nutzer = await backend.anmelden({ email, passwort: body.passwort, ip, userAgent: k.userAgent, land: k.land });
  if (!nutzer) throw new PlattformFehler(401, "E-Mail-Adresse oder Passwort ist falsch.", "login");
  return anmeldungFortsetzen({ request, ip, nutzer, methode: "passwort" });
});
