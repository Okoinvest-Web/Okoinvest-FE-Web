// GET  /api/admin/wissen?q=&kategorie= – interne Wissensdatenbank (Suche; nur Backoffice, Bereich „wissen“ lesen)
// POST /api/admin/wissen – Artikel anlegen { titel, kategorie, inhalt, tags[] } (schreiben)
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const GET = route({ admin: true }, async ({ nutzer, suche }) => ({
  ok: true,
  artikel: await serviceBackend().wissen(nutzer, { q: suche.get("q") || "", kategorie: suche.get("kategorie") || "" }),
}));

export const POST = route({ admin: true, maxBytes: 96 * 1024 }, async ({ nutzer, body }) => {
  const artikel = await serviceBackend().wissenSpeichern(nutzer, { titel: body.titel, kategorie: body.kategorie, inhalt: body.inhalt, tags: body.tags });
  return Response.json({ ok: true, artikel }, { status: 201, headers: { "Cache-Control": "no-store" } });
});
