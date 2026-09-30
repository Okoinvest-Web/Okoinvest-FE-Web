// GET /api/auth/email-aendern?token=… – Link aus der Mail an die NEUE Adresse: Anmeldeadresse ändern.
// Ergebnis: Weiterleitung ins Profil (bzw. zum Login mit Hinweis). Token 256 Bit, einmalig, 24 h.
import { NextResponse } from "next/server";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";
import { rateLimit, grenze } from "@/lib/plattform/server/rateLimit";
import { ipAdresse } from "@/lib/ipAdresse";

export async function GET(request) {
  const ziel = new URL("/portal/profil", request.url);
  try {
    rateLimit(`passwort:${ipAdresse(request) || "ohne-ip"}`, ...grenze("passwort"));
    await sicherheit().emailAendernBestaetigen({ token: request.nextUrl.searchParams.get("token") || "" });
    ziel.searchParams.set("hinweis", "email-geaendert");
  } catch {
    ziel.pathname = "/login";
    ziel.searchParams.set("hinweis", "link-ungueltig");
  }
  return NextResponse.redirect(ziel, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
