// DELETE /api/portal/sicherheit/sitzungen/[id] – eine eigene Sitzung beenden (sofort ungültig; die aktuelle = Abmelden)
import { route, antwort, sitzungLoeschen } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";

export const DELETE = route({ json: false, ohne2fa: true }, async ({ nutzer, params }) => {
  const r = await sicherheit().sitzungBeenden(nutzer, { id: params.id });
  const aktuell = params.id === nutzer.sitzung?.id;
  const res = antwort({ ok: true, beendet: r.beendet, abgemeldet: aktuell });
  return aktuell ? sitzungLoeschen(res) : res;
});
