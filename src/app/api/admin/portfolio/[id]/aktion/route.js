// POST /api/admin/portfolio/[id]/aktion – { aktion, … }:
//   status { nach, grund? } · ertrag { monat, kwh, quelle? } · abruf { betrag, faelligAm, zweck, meilenstein? } (Frist ≥ 10 Tage, ≤ offene Zusage)
//   abruf_bestaetigen { abrufId, datum? } · abruf_stornieren { abrufId, grund } · ausschuettung { art, periode, betrag, datum, bankZustimmung?, notiz? }
//   (Lock-up → 409 ohne Bankzustimmung, KYC → 409) · ausschuettung_storno { ausschuettungId, grund } · boerse (Börsen-Entwurf)
import { route } from "@/lib/plattform/server/route";
import { portfolioBackend } from "@/lib/plattform/backend/portfolio";

export const POST = route({ admin: true }, async ({ nutzer, params, body }) => ({ ok: true, position: await portfolioBackend().pfAktion(nutzer, params.id, body) }));
