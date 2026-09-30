// Einladung eines Versorgers: GET ?token= Kurzinfo (öffentlich) · POST {token, vorname?, nachname?, passwort?}
// angemeldet: Rolle „lieferant“ + Zuordnung (E-Mail muss passen) · ohne Konto: Konto anlegen, danach Anmeldung über /login
import { route } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";
import { passwortLeakPruefen } from "@/lib/plattform/server/leak";

export const GET = route({ auth: false, limit: "einladung" }, async ({ suche }) => ({ ok: true, ...(await energieBackend().energieEinladungInfo(String(suche.get("token") || "").slice(0, 200))) }));
export const POST = route({ auth: "optional", limit: "einladung" }, async ({ nutzer, body, ip }) => {
  // Neues Konto mit Passwort: wie bei der Registrierung gegen bekannte Datenlecks prüfen (nur mit PLATTFORM_HIBP=1)
  if (!nutzer && typeof body.passwort === "string" && body.passwort) await passwortLeakPruefen(body.passwort);
  return {
  ...(await energieBackend().energieEinladungAnnehmen(nutzer || null, typeof body.token === "string" ? body.token.slice(0, 200) : "", {
    vorname: body.vorname,
    nachname: body.nachname,
    passwort: typeof body.passwort === "string" ? body.passwort.slice(0, 200) : "",
    ip,
  })),
  };
});
