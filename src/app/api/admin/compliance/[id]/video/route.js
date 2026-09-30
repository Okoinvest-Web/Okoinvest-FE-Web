// POST /api/admin/compliance/[id]/video – Videoidentifizierung protokollieren (nur Unterrolle Compliance, nicht der eigene Fall):
//      { aktion: start | punkt {punkt, ok, notiz} | tan_senden {kanal} | tan_pruefen {code} | notiz {text} | abschluss {ergebnis, begruendung, abbruchgrund} }
// GET  /api/admin/compliance/[id]/video?protokoll=KV-…[&anzeigen=1] – Protokoll als PDF (Abruf im Revisionsprotokoll)
import { route } from "@/lib/plattform/server/route";
import { kycIdentBackend } from "@/lib/plattform/backend/kycIdent";
import { backendName } from "@/lib/plattform/backend";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { kycDateiAntwort } from "@/lib/plattform/server/kycDatei";
import { kycVideoPdf } from "@/lib/plattform/server/kycVideoPdf";

export const POST = route({ admin: true, maxBytes: 8 * 1024 }, async ({ nutzer, params, body }) => {
  const r = await kycIdentBackend().kycVideoAktion(nutzer, params.id, body);
  if (r?.ok === false) throw new PlattformFehler(422, r.error || "Aktion nicht möglich.");
  return r;
});

export const GET = route({ admin: true }, async ({ nutzer, params, suche, ip }) => {
  const daten = await kycIdentBackend().kycVideoProtokoll(nutzer, params.id, String(suche.get("protokoll") || ""), { ip });
  const pdf = kycVideoPdf(daten, { demo: backendName() === "demo" });
  return kycDateiAntwort({ name: `videoprotokoll-${daten.protokoll?.id || "kyc"}.pdf`, mime: "application/pdf" }, pdf, { anzeigen: suche.get("anzeigen") === "1" });
});
