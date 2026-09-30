// POST /api/admin/hinweis – interner Geldwäsche-Verdachtshinweis an Compliance (jedes Backoffice-Konto mit Cockpit-Leserecht).
//      Die meldende Person sieht die Akte danach nicht; es erfolgt kein Versand nach außen.
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";

export const POST = route({ admin: true, recht: { bereich: "cockpit", stufe: 1 } }, async ({ nutzer, body }) => werkzeugeBackend().verdachtMelden(nutzer, body));
