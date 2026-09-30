// Ausschreibung je Rolle – nicht eingeladen bzw. fremd → 404 (keine Existenz verraten)
import { route } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";

export const GET = route({ rollen: ["lieferant", "unternehmen"] }, async ({ nutzer, params }) => ({ ok: true, ...(await energieBackend().energieAusschreibung(nutzer, params.id)) }));
