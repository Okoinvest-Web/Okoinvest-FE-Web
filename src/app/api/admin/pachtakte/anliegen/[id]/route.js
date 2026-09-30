// POST /api/admin/pachtakte/anliegen/[id] – { nach: in_pruefung|rueckfrage|erledigt|abgelehnt, kommentar, wirksamZum?, neuesKontoId?, ab? }
// Erledigen wirkt: Kündigung → Vertrag gekündigt; Eigentümerwechsel/Erbfall mit Konto → Vertrag und Fläche übertragen.
import { route } from "@/lib/plattform/server/route";
import { pachtakteBackend } from "@/lib/plattform/backend/pachtakte";

export const POST = route({ admin: true }, async ({ nutzer, params, body, ip }) => ({
  ok: true,
  anliegen: await pachtakteBackend().anliegenAktion(nutzer, params.id, { nach: body.nach, kommentar: body.kommentar, wirksamZum: body.wirksamZum, neuesKontoId: body.neuesKontoId, ab: body.ab }, { ip }),
}));
