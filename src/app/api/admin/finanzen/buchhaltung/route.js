// GET /api/admin/finanzen/buchhaltung – Übersicht Buchhaltung: OP-Liste, Mahnvorschläge, Zahlungseingänge, Stornos, Nummernkreise, Steuer-Check
import { route } from "@/lib/plattform/server/route";
import { werkzeugeBackend } from "@/lib/plattform/backend/werkzeuge";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await werkzeugeBackend().bhUebersicht(nutzer)) }));
