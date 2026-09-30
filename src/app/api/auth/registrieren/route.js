// POST /api/auth/registrieren – Konto anlegen, sofort angemeldet.
// { email, passwort, vorname, nachname, firma?, telefon?, rollen: [..], vorgang?, agb: true }
// Optional (PLATTFORM_HIBP=1): Passwort gegen bekannte Datenlecks prüfen (k-Anonymity).
import { route, basisUrl } from "@/lib/plattform/server/route";
import { sitzungStarten } from "@/lib/plattform/server/anmeldung";
import { passwortLeakPruefen } from "@/lib/plattform/server/leak";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const POST = route({ auth: false, limit: "registrieren" }, async ({ body, backend, request, ip }) => {
  if (body.website) throw new PlattformFehler(422, "Registrierung nicht möglich.");
  if (body.agb !== true) throw new PlattformFehler(422, "Bitte akzeptieren Sie Nutzungsbedingungen und Datenschutzerklärung.");
  await passwortLeakPruefen(body.passwort);
  const { nutzer, vorgangVerknuepft } = await backend.registrieren({
    email: body.email,
    passwort: body.passwort,
    vorname: body.vorname,
    nachname: body.nachname,
    firma: body.firma,
    telefon: body.telefon,
    rollen: body.rollen,
    vorgangId: body.vorgang,
    basisUrl: basisUrl(request),
    ip,
  });
  return sitzungStarten({ request, ip, nutzer, methode: "registrierung", daten: { vorgangVerknuepft: vorgangVerknuepft || null }, status: 201 });
});
