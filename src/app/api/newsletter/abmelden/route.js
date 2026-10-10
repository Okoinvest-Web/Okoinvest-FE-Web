// /api/newsletter/abmelden – Abmeldung mit einem Klick (Welle 3, Paket NL)
//
//   POST { token }                              Knopf der Seite /newsletter/abo/[token] (JSON, mit Origin-Prüfung)
//   POST ?token=…  Body „List-Unsubscribe=One-Click“  Ein-Klick-Abmeldung aus dem Mailprogramm nach RFC 8058
//        (Kopfzeilen List-Unsubscribe / List-Unsubscribe-Post jeder Mail). Mailprogramme senden keinen Origin –
//        das Token genügt: Wer es kennt, kann nur abmelden, nie anmelden oder lesen. Antwort ohne Inhalt.
//   GET  ändert NIE etwas (Link-Scanner) – leitet auf die Seite mit dem Abmeldeknopf.

import { NextResponse } from "next/server";
import { route, fehlerAntwort } from "@/lib/plattform/server/route";
import { grenze, rateLimit } from "@/lib/plattform/server/rateLimit";
import { ipAdresse } from "@/lib/ipAdresse";
import { abmelden } from "@/lib/newsletter/dienst";
import { TOKEN_MUSTER } from "@/lib/bericht/token";

const perKnopf = route({ auth: false, limit: "anfrage", maxBytes: 1024 }, async ({ body }) => abmelden({ token: body.token }));

async function einKlick(request) {
  try {
    rateLimit(`anfrage:${ipAdresse(request) || "ohne-ip"}`, ...grenze("anfrage"));
    if (Number(request.headers.get("content-length") || 0) > 2048) return NextResponse.json({ ok: false }, { status: 413, headers: { "Cache-Control": "no-store" } });
    const form = await request.formData().catch(() => null);
    if (form?.get("List-Unsubscribe") !== "One-Click") return NextResponse.json({ ok: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
    await abmelden({ token: request.nextUrl.searchParams.get("token") || "" });
    return new NextResponse(null, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return fehlerAntwort(e);
  }
}

export async function POST(request, ctx) {
  const typ = (request.headers.get("content-type") || "").toLowerCase();
  if (request.nextUrl.searchParams.has("token") && (typ.startsWith("application/x-www-form-urlencoded") || typ.startsWith("multipart/form-data"))) return einKlick(request);
  return perKnopf(request, ctx);
}

export async function GET(request) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const ziel = new URL(TOKEN_MUSTER.test(token) ? `/newsletter/abo/${token}` : "/newsletter", request.url);
  const res = NextResponse.redirect(ziel, 303);
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
