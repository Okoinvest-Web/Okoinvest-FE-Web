// GET  /api/admin/entwicklung[?q=&status=] – Portfolio (Projekte mit Phase, Pipeline-Wert, Verzug; Summen je Phase/Land/Jahr,
//      Verzugsliste, Fristen 30 Tage, Auslastung je Projektleitung) – Bereich „entwicklung“ lesen
// POST /api/admin/entwicklung – Entwicklungsprojekt anlegen { titel, typ, land, bundesland, gemeinde?, mwp, mwh?, zielCod?, vermarktung,
//      projektleiterId?, start?, flaecheId? (Vorlage-Assistent „aus Fläche“), mitVorlage? } – schreiben
import { route } from "@/lib/plattform/server/route";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ...(await entwicklungBackend().entwicklungPortfolio(nutzer, { q: suche.get("q") || "", status: suche.get("status") || "" })) }));

export const POST = route({ admin: true }, async ({ nutzer, body }) => {
  const projekt = await entwicklungBackend().entwicklungAnlegen(nutzer, body);
  return Response.json({ ok: true, projekt }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
