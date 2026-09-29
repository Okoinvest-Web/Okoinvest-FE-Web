// POST /api/auth/registrieren – Konto anlegen, sofort angemeldet.
// { email, passwort, vorname, nachname, firma?, telefon?, rollen: [..], vorgang?, agb: true }
import { route, antwort, basisUrl, sitzungSetzen, nutzerFuerBrowser } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const POST = route({ auth: false, limit: "registrieren" }, async ({ body, backend, request, ip }) => {
  if (body.website) throw new PlattformFehler(422, "Registrierung nicht möglich.");
  if (body.agb !== true) throw new PlattformFehler(422, "Bitte akzeptieren Sie Nutzungsbedingungen und Datenschutzerklärung.");
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
  const res = antwort({ ok: true, nutzer: nutzerFuerBrowser(nutzer), vorgangVerknuepft: vorgangVerknuepft || null }, 201);
  return sitzungSetzen(res, nutzer);
});
