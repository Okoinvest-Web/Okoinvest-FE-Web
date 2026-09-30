// GET /api/dienste/eid/rueckkehr?code=…&state=… (bzw. ?error=…&state=…) – Rücksprung vom eID-Aussteller (ID Austria,
// eID-Service Online-Ausweis oder DEMO-Simulator).
//
// Schutz: angemeldete Portal-Sitzung Pflicht (Cookie, SameSite=Lax → bei Top-Level-Rücksprung vorhanden); state muss
// zu einem offenen Vorgang DIESES Kontos gehören (nur Hash gespeichert) UND zur Browser-Bindung (HttpOnly-Cookie,
// nur für diesen Pfad) passen – ersetzt die Origin-Prüfung (CSRF/Login-CSRF). Einmalig (Vorgang wird vor dem
// Code-Tausch verbraucht), 10 min gültig, Replay-Schutz über den Token-Hash. Code/Token werden nie protokolliert oder
// weitergegeben; die Antwort leitet ohne Code (303) weiter, Referrer-Policy no-referrer, kein Cache.
import { NextResponse } from "next/server";
import { ipAdresse } from "@/lib/ipAdresse";
import { rateLimit } from "@/lib/plattform/server/rateLimit";
import { basisUrl, nutzerAusAnfrage } from "@/lib/plattform/server/route";
import { eidBackend } from "@/lib/plattform/backend/eid";
import { EID_BINDUNG_COOKIE, EID_REDIRECT_PFAD } from "@/lib/plattform/dienste/eid/methoden";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const dynamic = "force-dynamic";

function weiter(request, pfad) {
  const res = NextResponse.redirect(new URL(pfad, `${basisUrl(request)}/`), 303);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.cookies.set(EID_BINDUNG_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: EID_REDIRECT_PFAD, maxAge: 0 });
  return res;
}

export async function GET(request) {
  const sp = request.nextUrl.searchParams;
  try {
    rateLimit(`eid-rueckkehr:${ipAdresse(request) || "ohne-ip"}`, 30, 60 * 1000);
    const nutzer = await nutzerAusAnfrage(request);
    if (!nutzer) return weiter(request, `/login?weiter=${encodeURIComponent("/portal/verifizierung?eid=anmeldung")}`);
    const r = await eidBackend().eidAbschluss(nutzer, {
      state: String(sp.get("state") || "").slice(0, 200),
      code: String(sp.get("code") || "").slice(0, 2000),
      fehler: String(sp.get("error") || "").slice(0, 60),
      bindung: request.cookies.get(EID_BINDUNG_COOKIE)?.value || "",
    });
    return weiter(request, `/portal/verifizierung?eid=${encodeURIComponent(r.vorgang?.id || "")}&ergebnis=${encodeURIComponent(r.vorgang?.status || "")}`);
  } catch (e) {
    const code = e instanceof PlattformFehler ? (e.status === 409 ? "doppelt" : e.status === 429 ? "limit" : "ungueltig") : "fehler";
    if (!(e instanceof PlattformFehler)) console.error("[plattform-eid] Rücksprung:", e?.message);
    return weiter(request, `/portal/verifizierung?eid=${code}`);
  }
}
