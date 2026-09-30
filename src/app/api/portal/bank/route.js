// GET /api/portal/bank – Finanzierungsanfragen der eigenen Bank (Rolle „bank“, nur verknüpfte Banken)
import { route } from "@/lib/plattform/server/route";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";

export const GET = route({ rollen: ["bank"] }, async ({ nutzer }) => ({ ok: true, ...(await finanzierungBackend().fzBankMeine(nutzer)) }));
