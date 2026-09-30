// Ausschreibungen je Rolle: Lieferant NUR eingeladene (anonymisiert), Unternehmen nur eigene, Backoffice alle
import { route } from "@/lib/plattform/server/route";
import { energieBackend } from "@/lib/plattform/backend/energie";

export const GET = route({ rollen: ["lieferant", "unternehmen"] }, async ({ nutzer }) => ({ ok: true, ausschreibungen: await energieBackend().energieAusschreibungen(nutzer, {}) }));
