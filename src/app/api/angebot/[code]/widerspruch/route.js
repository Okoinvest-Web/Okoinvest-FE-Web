// POST /api/angebot/[code]/widerspruch { bestaetigt: true } – Widerspruch gegen die Verarbeitung (Art. 21 Abs. 2 DSGVO):
//      Sperrliste (Person + Flurstücke) über alle Kampagnen, Code sofort inaktiv. Öffentlich, Origin + Rate-Limit.
import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";
import { akqLimit } from "@/lib/plattform/server/akquise2";
import { codeNormalisieren } from "@/lib/plattform/akquise-kampagne";

export const POST = route({ auth: false, maxBytes: 2 * 1024 }, async ({ params, body, ip }) => {
  akqLimit("angebotSchreiben", ip);
  const code = codeNormalisieren(params.code);
  if (!code) throw new PlattformFehler(404, "Dieser Code ist nicht gültig.");
  if (body.bestaetigt !== true) throw new PlattformFehler(422, "Bitte bestätigen Sie den Widerspruch.");
  await akquise2Backend().angebotWiderspruch(code);
  return { ok: true };
});

