// GET  /api/portal/kyc/video?von=&bis= – Videoidentifizierung (eigener Fall): Stand, freie Termine der Compliance, Link, Datenschutz
// POST /api/portal/kyc/video – { aktion: "buchen", start } bzw. { aktion: "stornieren" } (nutzt die Terminbuchung, Terminart „identifizierung“)
import { route } from "@/lib/plattform/server/route";
import { kycIdentBackend } from "@/lib/plattform/backend/kycIdent";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({}, async ({ nutzer, suche }) => ({ ok: true, ...(await kycIdentBackend().kycVideo(nutzer, { von: suche.get("von") || "", bis: suche.get("bis") || "" })) }));

export const POST = route({ maxBytes: 2 * 1024 }, async ({ nutzer, body }) => {
  const b = kycIdentBackend();
  if (body.aktion === "buchen") return { ok: true, ...(await b.kycVideoBuchen(nutzer, { start: String(body.start || "") })) };
  if (body.aktion === "stornieren") return { ok: true, ...(await b.kycVideoStornieren(nutzer)) };
  throw new PlattformFehler(422, "Unbekannte Aktion.");
});
