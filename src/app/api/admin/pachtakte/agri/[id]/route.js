// POST /api/admin/pachtakte/agri/[id] – Agri-PV-Nachweis { nach: bestaetigt|rueckfrage, kommentar }
import { route } from "@/lib/plattform/server/route";
import { pachtakteBackend } from "@/lib/plattform/backend/pachtakte";

export const POST = route({ admin: true }, async ({ nutzer, params, body, ip }) => ({
  ok: true,
  nachweis: await pachtakteBackend().agriNachweisAktion(nutzer, params.id, { nach: body.nach, kommentar: body.kommentar }, { ip }),
}));
