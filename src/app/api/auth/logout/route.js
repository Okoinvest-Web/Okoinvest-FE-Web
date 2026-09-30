// POST /api/auth/logout – aktuelle Sitzung im Backend beenden, Cookies löschen
import { route, antwort, sitzungLoeschen } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";

export const POST = route({ auth: "optional" }, async ({ nutzer }) => {
  if (nutzer?.sitzung?.id) await sicherheit().sitzungBeenden(nutzer, { id: nutzer.sitzung.id }).catch(() => {});
  return sitzungLoeschen(antwort({ ok: true }));
});
