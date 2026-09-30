// GET /api/portal/onboarding – Onboarding-Zustand am Konto + Checkliste „Erste Schritte“ (aus dem aktiven Pfad) + Pfad-Kurzinfo
//     ?ansicht=assistent → zusätzlich verfügbare Pfade, ausgewerteter Pfad mit allen Schritten und Pfad-Zustand
//     ?ansicht=tour      → nur Tour-Zustand ({ aus, gesehen[] }) – leicht, ohne Fakten
// PUT /api/portal/onboarding – generischer Einstieg (unverändert):
//       { status?: neu|laufend|erledigt|uebersprungen, schritt?: 0–3, erledigt?: [profil|objekt|benachrichtigungen|bedienung|fertig], checklisteAus?: bool }
//       (erledigt wird ergänzt, nie entfernt; nur das eigene Konto)
//     Onboarding-Assistenten je Rolle (Team B1): { aktion, pfad?, untertyp?, schritt?, aus?, gesehen? }
//       aktion ∈ pfad | untertyp | bestaetigen | spaeter | fortsetzen | abschliessen | tour
//       Server prüft: Pfad passt zu den Rollen (403), Schritt existiert/bestätigbar, Untertyp erlaubt (422),
//       Abschluss nur bei erfüllten Pflichtkriterien aus echten Daten (409). Nur das eigene Konto.
import { route } from "@/lib/plattform/server/route";
import { bedienung } from "@/lib/plattform/backend/bedienung";
import { onboardingBackend } from "@/lib/plattform/backend/onboarding";
import { ersteSchritteLaden } from "@/lib/plattform/server/bedienung";
import { assistentLaden, onboardingAktion } from "@/lib/plattform/server/onboarding";

export const GET = route({}, async ({ nutzer, suche }) => {
  const ansicht = suche.get("ansicht");
  if (ansicht === "tour") {
    const z = await onboardingBackend().onbZustand(nutzer);
    return { ok: true, tour: z.tour };
  }
  if (ansicht === "assistent") {
    const a = await assistentLaden(nutzer);
    return { ok: true, pfade: a.pfade, pfad: a.pfad, pfadZustand: a.zustand.pfade[a.pfad?.id] || null, zustand: a.legacy };
  }
  return { ok: true, ...(await ersteSchritteLaden(nutzer)) };
});

export const PUT = route({ maxBytes: 4 * 1024 }, async ({ nutzer, body }) => {
  if (body.aktion !== undefined) {
    const aktion = {};
    for (const k of ["aktion", "pfad", "untertyp", "schritt", "aus", "gesehen"]) if (body[k] !== undefined) aktion[k] = body[k];
    const r = await onboardingAktion(nutzer, aktion);
    return { ok: true, pfad: r.pfad, pfadZustand: r.zustand.pfade[r.pfad?.id] || null, tour: r.zustand.tour };
  }
  const erlaubt = {};
  for (const k of ["status", "schritt", "erledigt", "checklisteAus"]) if (body[k] !== undefined) erlaubt[k] = body[k];
  return { ok: true, zustand: await bedienung().onboardingSpeichern(nutzer, erlaubt) };
});
