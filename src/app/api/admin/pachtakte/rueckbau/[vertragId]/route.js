// POST /api/admin/pachtakte/rueckbau/[vertragId] – { ziel: rueckbau|sicherheit|vertrag, nach, kommentar?, termin?, art?, betrag?, geber?, hinterlegtAm? }
//   rueckbau:   angekuendigt (termin) · laufend · abnahme_bereit (termin) · abgenommen (Protokoll, kommentar)
//   sicherheit: hinterlegt (art, betrag, geber, hinterlegtAm) · freigegeben (erst nach Abnahme)
//   vertrag:    beendet (erst nach Abnahme und Freigabe der Sicherheit)
import { route } from "@/lib/plattform/server/route";
import { pachtakteBackend } from "@/lib/plattform/backend/pachtakte";

export const POST = route({ admin: true }, async ({ nutzer, params, body, ip }) => ({
  ok: true,
  akte: await pachtakteBackend().rueckbauAktion(nutzer, params.vertragId, {
    ziel: body.ziel, nach: body.nach, kommentar: body.kommentar, termin: body.termin, art: body.art, betrag: body.betrag, geber: body.geber, hinterlegtAm: body.hinterlegtAm,
  }, { ip }),
}));
