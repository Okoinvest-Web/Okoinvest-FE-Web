// POST /api/admin/finanzierung/geschaeftsmodell – Vergleich Build-to-Sell / Eigenbetrieb / Contracting / Verpachtung rechnen
//      { fallId? | eingaben, annahmen } – nur Rechnung (lesen); die Entscheidung speichert /[id]/aktion „geschaeftsmodell“ (Leitung)
import { route } from "@/lib/plattform/server/route";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";

export const POST = route({ admin: true, recht: [{ bereich: "finanzierung", stufe: 1 }] }, async ({ nutzer, body }) => ({
  ok: true,
  vergleich: await finanzierungBackend().fzGeschaeftsmodell(nutzer, { fallId: body.fallId || "", eingaben: body.eingaben || {}, annahmen: body.annahmen || {} }),
}));
