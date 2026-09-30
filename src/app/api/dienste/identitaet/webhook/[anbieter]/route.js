// POST /api/dienste/identitaet/webhook/[anbieter] – Ergebnis-Webhook des Identitätsanbieters (ÖFFENTLICH, ohne Sitzung).
//
// Schutz: HMAC-Signatur über den ROH-Body (Verfahren je Anbieter, dienste/identitaet/anbieter.js), zeitkonstanter Vergleich,
// falsche/fehlende Signatur → 401 ohne Details; Rate-Limit je IP; Body ≤ 256 KB; nur application/json; idempotent
// (Ereignis-ID). Keine Origin-Prüfung (Server-zu-Server). Frappe-Betrieb: Weiterleitung an dienste.webhook_identitaet.
import { NextResponse } from "next/server";
import { ipAdresse } from "@/lib/ipAdresse";
import { rateLimit } from "@/lib/plattform/server/rateLimit";
import { diensteBackend } from "@/lib/plattform/backend/dienste";
import { PlattformFehler } from "@/lib/plattform/fehler";

const MAX = 256 * 1024;
const antwort = (daten, status = 200) => NextResponse.json(daten, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request, ctx) {
  try {
    const { anbieter } = await ctx.params;
    rateLimit(`ident-webhook:${ipAdresse(request) || "ohne-ip"}`, 120, 60 * 1000);
    if (!/^[a-z]{2,20}$/.test(String(anbieter || ""))) return antwort({ ok: false }, 404);
    if (!String(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) return antwort({ ok: false, error: "Erwartet wird JSON." }, 415);
    if (Number(request.headers.get("content-length") || 0) > MAX) return antwort({ ok: false }, 413);
    const roh = await request.text();
    if (roh.length > MAX) return antwort({ ok: false }, 413);
    const r = await diensteBackend().identWebhook({ anbieter, kopf: (h) => request.headers.get(h), roh });
    return antwort(r.antwort, r.status);
  } catch (e) {
    if (e instanceof PlattformFehler) return antwort({ ok: false, error: e.message }, e.status);
    console.error("[plattform-dienste] Webhook:", e?.message);
    return antwort({ ok: false }, 500);
  }
}
