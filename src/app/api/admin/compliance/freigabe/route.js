// POST /api/admin/compliance/freigabe – { schritt, kontoId, organisationId?, flaecheId? } → { ok, aktiv, gruende, hinweis }
//      Prüfung für Backoffice-Abläufe anderer Teams (z. B. Pachtauszahlung/Gutschrift freigeben). Cockpit-Leserecht genügt.
import { route } from "@/lib/plattform/server/route";
import { kycBackend } from "@/lib/plattform/backend/kyc";

export const POST = route({ admin: true, recht: { bereich: "cockpit", stufe: 1 } }, async ({ nutzer, body }) => ({
  ok: true,
  freigabe: await kycBackend().kycFreigabePruefen(nutzer, { schritt: String(body.schritt || ""), kontoId: body.kontoId || null, organisationId: body.organisationId || null, flaecheId: body.flaecheId || null }),
}));
