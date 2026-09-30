// GET  /api/portal/signatur/[id] – Vorgang (Unterzeichner: eigener Eintrag vollständig, andere ohne E-Mail/Browser, IP maskiert)
// POST /api/portal/signatur/[id] – { aktion: "code" | "unterschreiben" | "ablehnen" | "widerrufen" | "erinnern", … }
//   code:           Bestätigungscode per E-Mail (Rate-Limit je IP und Konto)
//   unterschreiben: { code, art: "gezeichnet"|"getippt", bild (data:image/png;base64,…), name, zustimmung: true }
//                   → nach der letzten Unterschrift signiertes PDF; bei Standard-Erklärungen (NDA/Provision) Folgeaktion
//   ablehnen:       { grund } (Unterzeichner) · widerrufen: { grund } (Backoffice/Ersteller) · erinnern (Backoffice)
import { route } from "@/lib/plattform/server/route";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";
import { serviceBackend } from "@/lib/plattform/backend/service";
import { folgeAktionAusfuehren } from "@/lib/plattform/signatur/server";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({}, async ({ nutzer, params }) => ({ ok: true, vorgang: await serviceBackend().signatur(nutzer, params.id) }));

export const POST = route({ maxBytes: 400 * 1024 }, async ({ backend, nutzer, params, body, ip, request }) => {
  const s = serviceBackend();
  const userAgent = request.headers.get("user-agent") || "";
  switch (body.aktion) {
    case "code":
      rateLimit(`signatur-code:${ip || "ohne-ip"}`, ...grenze("zweiFaktor"));
      rateLimit(`signatur-code:${nutzer.id}`, ...grenze("zweiFaktor"));
      return { ok: true, ...(await s.signaturCodeAnfordern(nutzer, params.id, { ip, userAgent })) };
    case "unterschreiben": {
      rateLimit(`signatur:${nutzer.id}`, ...grenze("zweiFaktor"));
      const r = await s.signaturUnterschreiben(nutzer, params.id, {
        code: String(body.code || ""), art: body.art, bild: body.bild, name: body.name, zustimmung: body.zustimmung === true, ip, userAgent,
      });
      const folge = await folgeAktionAusfuehren(backend, nutzer, r.folgeAktion, { ip, userAgent });
      return { ok: true, vorgang: r.vorgang, folge };
    }
    case "ablehnen":
      return { ok: true, vorgang: await s.signaturAblehnen(nutzer, params.id, { grund: body.grund, ip }) };
    case "widerrufen":
      return { ok: true, vorgang: await s.signaturWiderrufen(nutzer, params.id, { grund: body.grund, ip }) };
    case "erinnern":
      return { ok: true, vorgang: await s.signaturErinnern(nutzer, params.id) };
    default:
      throw new PlattformFehler(422, "Unbekannte Aktion.");
  }
});
