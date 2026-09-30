// GET    /api/admin/wissen/[id] – Artikel mit Versionen
// PATCH  /api/admin/wissen/[id] – Artikel ändern (neue Version) · DELETE – löschen (Bereich „wissen“ schreiben)
import { route } from "@/lib/plattform/server/route";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const GET = route({ admin: true }, async ({ nutzer, params }) => ({ ok: true, artikel: await serviceBackend().wissenArtikel(nutzer, params.id) }));

export const PATCH = route({ admin: true, maxBytes: 96 * 1024 }, async ({ nutzer, params, body }) => ({
  ok: true,
  artikel: await serviceBackend().wissenSpeichern(nutzer, { id: params.id, titel: body.titel, kategorie: body.kategorie, inhalt: body.inhalt, tags: body.tags }),
}));

export const DELETE = route({ admin: true, json: false }, async ({ nutzer, params }) => serviceBackend().wissenLoeschen(nutzer, params.id));
