// POST /api/portal/termine/oeffentlich – öffentliche Terminbuchung (Website /termin, Kontakt- und Flächencheck-Formulare)
//   { art, start, kontakt:{name,email,telefon?,firma?,plz?,ort?,land?}, notiz?, kanal?, herkunft?: kontakt|flaechencheck|website, einwilligung:true, website:"" (Honeypot) }
//   → { termin, verwaltenToken } (Link zum Umbuchen/Absagen steht zusätzlich in der Bestätigungs-E-Mail mit ICS)
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const POST = route({ auth: "optional", limit: "anfrage", maxBytes: 16 * 1024 }, async ({ nutzer, body, ip }) => {
  if (body.website) throw new PlattformFehler(422, "Ungültige Anfrage."); // Honeypot
  const r = await serviceBackend().terminBuchen(nutzer && !nutzer.rollen?.includes("admin") ? nutzer : null, body, { ip });
  return Response.json({ ok: true, termin: r.termin, verwaltenToken: r.verwaltenToken || null }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
