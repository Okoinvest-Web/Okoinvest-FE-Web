// POST /api/portal/bank/einladung – Bank-Einladung annehmen { token } (angemeldet mit der eingeladenen E-Mail-Adresse);
//      setzt die Rolle „bank“ und verknüpft das Konto mit der Bank der Anfrage → { anfrageId }
import { route } from "@/lib/plattform/server/route";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";

export const POST = route({ limit: "einladung" }, async ({ nutzer, body }) => ({ ok: true, ...(await finanzierungBackend().fzBankEinladungAnnehmen(nutzer, String(body.token || "").slice(0, 200))) }));
