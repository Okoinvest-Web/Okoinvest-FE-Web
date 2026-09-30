// POST /api/admin/automationen/tags – Tag an einem Objekt setzen/entfernen { art, id, tag, an }
// Recht: Schreiben im Bereich des Objekts (prüft das Backend), hier nur Backoffice-Zugang.
import { route } from "@/lib/plattform/server/route";

export const POST = route({ admin: true, recht: [{ bereich: "cockpit", stufe: 1 }] }, async ({ backend, nutzer, body }) => backend.objektTagSetzen(nutzer, body));
