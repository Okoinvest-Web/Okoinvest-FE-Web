// POST /api/portal/eg/[id]/import – Wechsel-Import: Vorschau mit Anbieter-Erkennung, Spaltenzuordnung und Plausibilitätsprüfung (WP5)
//   { csv? (CSV bzw. aus Excel kopierte Tabelle), dateiname?, anbieter?, zuordnung?: { zielfeld: spaltenindex }, importId?, auftragId? }
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";

export const POST = route({ maxBytes: 3_200_000 }, async ({ nutzer, params, body }) => ({
  ok: true,
  ...(await egBackend().grImportVorschau(nutzer, params.id, { csv: String(body?.csv || ""), dateiname: String(body?.dateiname || ""), anbieter: String(body?.anbieter || ""), zuordnung: body?.zuordnung && typeof body.zuordnung === "object" ? body.zuordnung : null, importId: String(body?.importId || ""), auftragId: String(body?.auftragId || "") })),
}));
