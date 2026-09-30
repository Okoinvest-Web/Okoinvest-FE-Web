// POST /api/admin/dealroom/freigabe – { projektId, interesseId, an } Kontaktfreigabe Anbieter ↔ Investor (Umgehungsschutz)
import { route } from "@/lib/plattform/server/route";
import { dealroom } from "@/lib/plattform/backend/dealroom";

export const POST = route({ admin: true }, async ({ nutzer, body }) => ({
  ok: true,
  freigabe: await dealroom().kontaktFreigabe(nutzer, { projektId: body.projektId, interesseId: body.interesseId, an: body.an !== false }),
}));
