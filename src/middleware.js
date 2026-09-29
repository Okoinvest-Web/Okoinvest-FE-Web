import { NextResponse } from "next/server";
import { cookieName, tokenPruefen } from "@/lib/plattform/sitzung";

// Portal-Schutz: /portal/** nur mit gültig signiertem Sitzungscookie, sonst
// Weiterleitung zu /login?weiter=… (nur interne Pfade). Die Middleware prüft
// Signatur und Ablauf; Rollen, Sperre und Sitzungsversion prüfen Seiten und
// APIs bei jedem Aufruf frisch gegen das Backend.
export async function middleware(request) {
  const { pathname, search } = request.nextUrl;
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
    return res;
  }

  // Aktuellen Pfad an Server-Komponenten weiterreichen (für ?weiter= bei abgelaufener Sitzung)
  const kopf = new Headers(request.headers);
  kopf.set("x-oi-pfad", `${pathname}${search}`.slice(0, 300));
  return NextResponse.next({ request: { headers: kopf } });
}

export const config = {
  matcher: ["/portal", "/portal/:path*"],
};
