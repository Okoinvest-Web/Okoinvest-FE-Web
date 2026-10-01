// GET /api/portal/eg/[id]/abrechnung/jahresbescheinigung?mitgliedId=&jahr= – Jahresbescheinigung Erzeuger (kWh, €, § 3 Abs. 1 Z 39 EStG)
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const GET = route({}, async ({ nutzer, suche }) => ({ ok: true, ...(await egBackend().abJahresbescheinigung(nutzer, suche.get("mitgliedId") || "", { jahr: suche.get("jahr") || "" })) }));
