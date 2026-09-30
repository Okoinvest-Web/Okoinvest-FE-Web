// POST   /api/admin/entwicklung/[id]/eintraege – { art: flaeche|meilenstein|risiko|entscheidung|budget|kontakt|freigabe, id?, daten }
//        Meilenstein: Abhängigkeiten ohne Kreis (409), „erledigt“ erst nach allen Vorgängern (409) und mit Dokumentenpflicht
//        oder begründetem Verzicht (422); Entscheidungen sind unveränderlich (409)
// DELETE /api/admin/entwicklung/[id]/eintraege?art=…&id=…
import { route } from "@/lib/plattform/server/route";
import { entwicklungBackend } from "@/lib/plattform/backend/entwicklung";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({
  ok: true,
  ...(await entwicklungBackend().entwicklungEintragSpeichern(nutzer, params.id, { art: String(body.art || ""), id: body.id || null, daten: body.daten && typeof body.daten === "object" ? body.daten : {} })),
}));

export const DELETE = route({ admin: true, json: false }, async ({ nutzer, params, suche }) => ({
  ok: true,
  projekt: await entwicklungBackend().entwicklungEintragLoeschen(nutzer, params.id, { art: suche.get("art") || "", id: suche.get("id") || "" }),
}));
