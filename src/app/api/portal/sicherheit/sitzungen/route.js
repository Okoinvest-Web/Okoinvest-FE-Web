// GET  /api/portal/sicherheit/sitzungen – aktive Sitzungen { ok, sitzungen }
// POST /api/portal/sicherheit/sitzungen – { alleAnderen: true } alle anderen Sitzungen beenden; diese Sitzung bleibt
//      (neues Cookie mit der erhöhten Sitzungsversion) → { ok, beendet }
import { route, antwort, sitzungSetzen } from "@/lib/plattform/server/route";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";
import { sitzungStarten } from "@/lib/plattform/server/anmeldung";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({ ohne2fa: true }, async ({ nutzer }) => ({ ok: true, sitzungen: await sicherheit().sitzungen(nutzer) }));

export const POST = route({ ohne2fa: true }, async ({ nutzer, body, request, ip }) => {
  if (body.alleAnderen !== true) throw new PlattformFehler(422, "Bitte bestätigen Sie „alle anderen abmelden“.");
  const r = await sicherheit().sitzungBeenden(nutzer, { alleAnderen: true });
  const neu = { ...nutzer, sitzungVersion: r.sitzungVersion };
  // Ältere Sitzung ohne Kennung: neue Sitzung anlegen, sonst dieselbe Sitzung neu signieren
  if (!nutzer.sitzung?.id) return sitzungStarten({ request, ip, nutzer: neu, methode: "sitzung-erneuert", daten: { beendet: r.beendet } });
  return sitzungSetzen(antwort({ ok: true, beendet: r.beendet }), neu, { sitzungId: nutzer.sitzung.id });
});
