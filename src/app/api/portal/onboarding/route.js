// GET /api/portal/onboarding – Onboarding-Zustand am Konto + Checkliste „Erste Schritte“
// PUT /api/portal/onboarding – { status?: neu|laufend|erledigt|uebersprungen, schritt?: 0–3, erledigt?: [profil|objekt|benachrichtigungen|bedienung|fertig], checklisteAus?: bool }
//                              (erledigt wird ergänzt, nie entfernt; nur das eigene Konto)
import { route } from "@/lib/plattform/server/route";
import { bedienung } from "@/lib/plattform/backend/bedienung";
import { ersteSchritteLaden } from "@/lib/plattform/server/bedienung";

export const GET = route({}, async ({ nutzer }) => ({ ok: true, ...(await ersteSchritteLaden(nutzer)) }));

export const PUT = route({ maxBytes: 4 * 1024 }, async ({ nutzer, body }) => {
  const erlaubt = {};
  for (const k of ["status", "schritt", "erledigt", "checklisteAus"]) if (body[k] !== undefined) erlaubt[k] = body[k];
  return { ok: true, zustand: await bedienung().onboardingSpeichern(nutzer, erlaubt) };
});
