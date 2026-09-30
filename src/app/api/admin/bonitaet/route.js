// GET  /api/admin/bonitaet?q= – Auskünfte, offene LOI-Voraussetzungen, Einstellungen (nur Leitung/Transaktion/Compliance)
// POST /api/admin/bonitaet – Auskunft beauftragen { subjekt: { art: organisation|konto, id }, land, registernummer?, name?,
//      anlass, rechtsgrundlage, interesseId?, informieren (Standard true: Information des Betroffenen ohne Ergebnis) }
import { route } from "@/lib/plattform/server/route";
import { diensteBackend } from "@/lib/plattform/backend/dienste";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({ ok: true, ...(await diensteBackend().bonitaetUebersicht(nutzer, { q: suche.get("q") || "" })) }));

export const POST = route({ admin: true }, async ({ nutzer, body }) => Response.json({ ok: true, ...(await diensteBackend().bonitaetBeauftragen(nutzer, body)) }, { status: 201, headers: { "Cache-Control": "no-store" } }));
