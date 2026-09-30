// GET /api/portal/sicherheit – Überblick für /portal/sicherheit:
// { ok, zweiFaktor {aktiv, aktiviertAm, codesUebrig, pflicht, …}, sitzungen [..], anmeldungen [..], geraete [..] }
import { route } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";
import { anfrageKontext } from "@/lib/plattform/server/anmeldung";

export const GET = route({ ohne2fa: true }, async ({ nutzer, request, ip }) => {
  const s = sicherheit();
  const { geraetToken } = anfrageKontext(request, ip);
  const [zweiFaktor, sitzungen, anmeldungen, geraete] = await Promise.all([
    s.zweiFaktorStatus(nutzer),
    s.sitzungen(nutzer),
    s.anmeldungen(nutzer, { limit: 50 }),
    s.geraete(nutzer, { geraetToken }),
  ]);
  return { ok: true, zweiFaktor, sitzungen, anmeldungen, geraete };
});
