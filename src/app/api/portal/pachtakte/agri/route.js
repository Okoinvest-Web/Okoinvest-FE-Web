// PUT /api/portal/pachtakte/agri – Agri-PV-Bewirtschaftungsnachweis speichern bzw. einreichen
//   { vertragId, id?, daten{jahr,art,kultur,gesamtHa,bewirtschaftetHa,ertrag,einheit,…}, einreichen? }
import { route } from "@/lib/plattform/server/route";
import { pachtakteBackend } from "@/lib/plattform/backend/pachtakte";

export const PUT = route({ rollen: ["flaeche", "landwirt"], limit: "nachricht" }, async ({ nutzer, body, ip }) => ({
  ok: true,
  nachweis: await pachtakteBackend().agriNachweisSpeichern(nutzer, { vertragId: body.vertragId, id: body.id || null, daten: body.daten || {}, einreichen: body.einreichen === true }, { ip }),
}));
