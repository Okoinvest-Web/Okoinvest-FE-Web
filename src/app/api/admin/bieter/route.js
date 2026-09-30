// GET  /api/admin/bieter – alle Bieterverfahren (Übersicht)
// POST /api/admin/bieter – Verfahren starten { projektId, art (indikativ|verbindlich), frist (ISO), pflicht[], hinweis?, teilnehmer?[] }
import { route } from "@/lib/plattform/server/route";
import { dealroom } from "@/lib/plattform/backend/dealroom";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, verfahren: await dealroom().bieterverfahrenListe(nutzer) }));

export const POST = route({ admin: true }, async ({ nutzer, body }) => ({ ok: true, verfahren: await dealroom().bieterStarten(nutzer, body) }));
