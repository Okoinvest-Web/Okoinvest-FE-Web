// POST /api/admin/dealroom/freigabe – { projektId, interesseId, an } Kontaktfreigabe Anbieter ↔ Investor (Umgehungsschutz)
// `an` fehlt → Freigabe erteilen (Standard); sonst als Boolean lesen (String "false" heißt Entzug, nicht Freigabe).
import { route } from "@/lib/plattform/server/route";
import { dealroom } from "@/lib/plattform/backend/dealroom";
import { wahr } from "@/lib/plattform/validierung";

export const POST = route({ admin: true }, async ({ nutzer, body }) => ({
  ok: true,
  freigabe: await dealroom().kontaktFreigabe(nutzer, { projektId: body.projektId, interesseId: body.interesseId, an: body.an === undefined || body.an === null ? true : wahr(body.an) }),
}));
