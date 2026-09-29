// POST /api/auth/logout – Sitzungscookie löschen
import { route, antwort, sitzungLoeschen } from "@/lib/plattform/server/route";

export const POST = route({ auth: false }, async () => sitzungLoeschen(antwort({ ok: true })));
