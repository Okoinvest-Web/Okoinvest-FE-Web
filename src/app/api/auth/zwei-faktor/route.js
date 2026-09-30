// POST /api/auth/zwei-faktor – { code, merken? } zweiter Schritt der Anmeldung (Zwischen-Cookie aus Login/E-Mail-Link)
// code: 6-stelliger TOTP-Code oder Wiederherstellungscode (XXXXX-XXXXX, einmalig). merken: Gerät 30 Tage merken.
// Falsche Codes zählen zur Kontosperre (Backoff). Erfolg: neue Sitzung, { ok, nutzer, zweiFaktorMethode, codesUebrig }.
import { route } from "@/lib/plattform/server/route";
import { zweiFaktorAbschliessen } from "@/lib/plattform/server/anmeldung";

export const POST = route({ auth: false, limit: "zweiFaktor" }, async ({ body, request, ip }) =>
  zweiFaktorAbschliessen({ request, ip, code: body.code, merken: body.merken === true })
);
