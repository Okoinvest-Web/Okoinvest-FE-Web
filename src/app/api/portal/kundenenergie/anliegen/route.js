// /api/portal/kundenenergie/anliegen – Anliegen des Contracting-Kunden (Kundenseite Energie)
//   GET  ?status=offen|alle[&auswahl=1]  eigene Anliegen (Konto bzw. Organisation); auswahl=1 zusätzlich Rechnungen/Anlagen fürs Formular
//   POST { art: einspruch|kuendigung|verlaengerung|kaufoption, belegId? | anlageId?, grund?, text, betragStrittigEur?, wunschJahre?, wunschTermin? }
// Rolle „unternehmen“; Eigentum (Rechnung/Anlage) und Teamrechte prüft das Backend. Backoffice: /api/admin/finanzen/anliegen.
import { route } from "@/lib/plattform/server/route";
import { grenze, rateLimit } from "@/lib/plattform/server/rateLimit";
import { kundenenergieBackend } from "@/lib/plattform/backend/kundenenergie";

export const GET = route({ rollen: ["unternehmen"] }, async ({ nutzer, suche }) => {
  const b = kundenenergieBackend();
  const anliegen = await b.kundenAnliegen(nutzer, { status: suche.get("status") === "offen" ? "offen" : "alle" });
  return { ok: true, anliegen, ...(suche.get("auswahl") === "1" && !nutzer.rollen.includes("admin") ? { auswahl: await b.kundenAnliegenAuswahl(nutzer) } : {}) };
});

export const POST = route({ rollen: ["unternehmen"] }, async ({ nutzer, body }) => {
  rateLimit(`kundenanliegen:${nutzer.id}`, ...grenze("anfrage"));
  return Response.json({ ok: true, anliegen: await kundenenergieBackend().kundenAnliegenAnlegen(nutzer, body) }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
