import { NextResponse } from "next/server";
import { cookieName, tokenPruefen } from "@/lib/plattform/sitzung";

// Portal-Schutz: /portal/** nur mit gültig signiertem Sitzungscookie, sonst
// Weiterleitung zu /login?weiter=… (nur interne Pfade). Die Middleware prüft
// Signatur und Ablauf; Rollen, Sperre und Sitzungsversion prüfen Seiten und
// APIs bei jedem Aufruf frisch gegen das Backend.
// Sichere Kopfzeilen für Portal, Anmeldung, Einladungen und Plattform-APIs (Login, Sicherheit & Teams):
// kein Einbetten (Clickjacking), eigener Browsing-Kontext, kein Referrer bei Token-Links, HSTS in Produktion.
function sicherheitsKopf(res, pathname) {
  const h = res.headers;
  h.set("X-Frame-Options", "DENY");
  h.set("Content-Security-Policy", "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self), payment=(), usb=()");
  const tokenSeite = ["/login/link", "/einladung/", "/passwort-vergessen", "/api/auth/"].some((p) => pathname.startsWith(p));
  h.set("Referrer-Policy", tokenSeite ? "no-referrer" : "strict-origin-when-cross-origin");
  if (!pathname.startsWith("/api/")) h.set("Cache-Control", "no-store");
  if (process.env.NODE_ENV === "production") h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  return res;
}

export async function middleware(request) {
  const { pathname, search } = request.nextUrl;
  // Nicht-Portal-Pfade (Anmeldung, Einladung, APIs): nur Kopfzeilen, keine Sitzungsprüfung hier
  if (pathname !== "/portal" && !pathname.startsWith("/portal/")) return sicherheitsKopf(NextResponse.next(), pathname);
  const token = request.cookies.get(cookieName())?.value;

  let gueltig = false;
  try {
    gueltig = !!(await tokenPruefen(token));
  } catch (e) {
    // z. B. SESSION_SECRET fehlt in Produktion – nie ohne Prüfung durchlassen
    console.error("[plattform] Sitzungsprüfung fehlgeschlagen:", e?.message);
  }

  if (!gueltig) {
    const ziel = new URL("/login", request.url);
    ziel.searchParams.set("weiter", `${pathname}${search}`.slice(0, 300));
    const res = NextResponse.redirect(ziel);
    if (token) res.cookies.delete(cookieName());
    return sicherheitsKopf(res, pathname);
  }

  // Aktuellen Pfad an Server-Komponenten weiterreichen (für ?weiter= bei abgelaufener Sitzung)
  const kopf = new Headers(request.headers);
  kopf.set("x-oi-pfad", `${pathname}${search}`.slice(0, 300));
  return sicherheitsKopf(NextResponse.next({ request: { headers: kopf } }), pathname);
}

export const config = {
  matcher: ["/portal", "/portal/:path*", "/login", "/login/:path*", "/registrieren", "/passwort-vergessen", "/einladung/:path*", "/api/auth/:path*", "/api/portal/:path*"],
};
