// GET /api/portal/closing – eigene Closing-Räume (Käufer bzw. Verkäufer)
import { route } from "@/lib/plattform/server/route";
import { closingBackend } from "@/lib/plattform/backend/closing";

export const GET = route({}, async ({ nutzer }) => ({ ok: true, ...(await closingBackend().clMeine(nutzer)) }));
