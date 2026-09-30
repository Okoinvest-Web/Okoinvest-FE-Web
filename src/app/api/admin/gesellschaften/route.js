// GET  /api/admin/gesellschaften?q=&status= – Gesellschaftsverzeichnis mit Organigramm, Fortschritt und Fristen
// POST /api/admin/gesellschaften – Gründung anlegen (Assistent): { rechtsform, name, sitz, anschrift, stammkapital, einzahlung,
//      gesellschafter[{art: gruppe|person|extern, gesellschaftId?, name, anteil, einlage}], geschaeftsfuehrung[{name,…}],
//      komplementaer?, gegenstand?, bilanzstichtag?, musterprotokoll?, entwicklungProjektId?, namenspruefung? } – schreiben
import { route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ...(await diensteBackend().gesellschaftenListe(nutzer, { q: suche.get("q") || "", status: suche.get("status") || "" })) }));

export const POST = route({ admin: true }, async ({ nutzer, body }) => Response.json({ ok: true, ...(await diensteBackend().gesellschaftAnlegen(nutzer, body)) }, { status: 201, headers: { "Cache-Control": "no-store" } }));
