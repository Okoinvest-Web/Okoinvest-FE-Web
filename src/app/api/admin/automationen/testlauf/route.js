// POST /api/admin/automationen/testlauf – Was würde passieren? { regelId | regel, bezugArt?, bezugId?, score?, kategorie? }
// Mit Objekt: Ausführung auf einer Kopie der Daten (nichts wird gespeichert, nur protokolliert). Ohne Objekt: Rückblick auf die letzten 50 Objekte.
import { route } from "@/lib/plattform/server/route";

export const POST = route({ admin: true }, async ({ backend, nutzer, body }) => ({ ok: true, testlauf: await backend.automationTestlauf(nutzer, body) }));
