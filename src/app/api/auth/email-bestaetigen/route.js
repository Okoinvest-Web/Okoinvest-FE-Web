// GET /api/auth/email-bestaetigen?token=… – Link aus der Bestätigungs-E-Mail.
// Ergebnis: Weiterleitung ins Portal (bzw. zum Login mit Hinweis). Das Token ist 256 Bit
// zufällig und einmalig; ein Vorabruf durch Mail-Scanner bestätigt nur die Adresse.
import { NextResponse } from "next/server";
import { backend } from "@/lib/plattform/backend";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";
import { ipAdresse } from "@/lib/ipAdresse";

export async function GET(request) {
  const ziel = new URL("/portal", request.url);
  try {
    rateLimit(`passwort:${ipAdresse(request) || "ohne-ip"}`, ...grenze("passwort"));
    await backend().emailBestaetigen({ token: request.nextUrl.searchParams.get("token") || "" });
    ziel.searchParams.set("hinweis", "email-bestaetigt");
  } catch {
    ziel.pathname = "/login";
    ziel.searchParams.set("hinweis", "link-ungueltig");
  }
  return NextResponse.redirect(ziel, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
