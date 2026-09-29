// GET /api/admin/nutzer?q=&rolle= – Nutzerverwaltung (nur admin)
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer, suche }) => ({
  ok: true,
  nutzer: await backend.nutzerListe(nutzer, { q: suche.get("q") || undefined, rolle: suche.get("rolle") || undefined }),
}));
