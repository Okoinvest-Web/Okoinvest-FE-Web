// POST /api/angebot/[code]/aufruf – Aufruf der Angebotsseite zählen (Rücklauf-Tracking). Öffentlich (ohne Anmeldung),
//      Origin-Prüfung + Rate-Limit je IP; antwortet immer neutral (kein Hinweis, ob ein Code existiert).
import { route } from "@/lib/plattform/server/route";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";
import { akqLimit } from "@/lib/plattform/server/akquise2";
import { codeNormalisieren } from "@/lib/plattform/akquise-kampagne";

export const POST = route({ auth: false }, async ({ params, ip }) => {
  akqLimit("angebotLesen", ip);
  const code = codeNormalisieren(params.code);
  if (code) await akquise2Backend().angebotAufruf(code).catch(() => null);
  return { ok: true };
});
