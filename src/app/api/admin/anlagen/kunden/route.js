// GET /api/admin/anlagen/kunden – Auswahllisten für die Zuordnung (Kundenkonten „unternehmen“, Organisationen, Betrieb)
import { route } from "@/lib/plattform/server/route";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";

export const GET = route({ admin: true }, async ({ nutzer }) => ({ ok: true, ...(await anlagenBackend().anlagenKunden(nutzer)) }));
