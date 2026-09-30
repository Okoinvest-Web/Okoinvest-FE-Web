// GET  /api/admin/akquise?land=&prioritaet=&sla=&zustaendig=&status=&q=&alle=1 – Akquise-Pipeline Flächen (Score, Priorität, SLA, Gebiet)
// POST /api/admin/akquise – Massen-Zuweisung { ids[], modus: "gebiet"|"person", zustaendigId?, ueberschreiben? }
import { route } from "@/lib/plattform/server/route";

export const GET = route({ admin: true }, async ({ backend, nutzer, suche }) => ({
  ok: true,
  ...(await backend.akquise(nutzer, {
    land: suche.get("land") || undefined,
    prioritaet: suche.get("prioritaet") || undefined,
    sla: suche.get("sla") || undefined,
    zustaendigId: suche.get("zustaendig") || undefined,
    status: suche.get("status") || undefined,
    q: suche.get("q")?.slice(0, 80) || undefined,
    alle: suche.get("alle") === "1",
  })),
}));

export const POST = route({ admin: true }, async ({ backend, nutzer, body }) => ({ ok: true, ergebnis: await backend.akquiseZuweisen(nutzer, body) }));
