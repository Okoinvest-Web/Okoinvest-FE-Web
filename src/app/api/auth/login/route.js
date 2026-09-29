// POST /api/auth/login – { email, passwort } → Sitzungscookie
import { route, sitzungSetzen, antwort, nutzerFuerBrowser } from "@/lib/plattform/server/route";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { email as emailPruefen } from "@/lib/plattform/validierung";

export const POST = route({ auth: false, limit: "login" }, async ({ body, backend }) => {
  const email = emailPruefen(body.email);
  if (!email || typeof body.passwort !== "string" || !body.passwort) throw new PlattformFehler(422, "Bitte E-Mail-Adresse und Passwort eingeben.");
  rateLimit(`loginEmail:${email}`, ...grenze("loginEmail"));
  const nutzer = await backend.anmelden({ email, passwort: body.passwort });
  if (!nutzer) throw new PlattformFehler(401, "E-Mail-Adresse oder Passwort ist falsch.", "login");
  const res = antwort({ ok: true, nutzer: nutzerFuerBrowser(nutzer) });
  return sitzungSetzen(res, nutzer);
});
