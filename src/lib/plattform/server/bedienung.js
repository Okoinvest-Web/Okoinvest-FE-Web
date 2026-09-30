// src/lib/plattform/server/bedienung.js
//
// Serverseitige Helfer „Bedienung & Onboarding“: Checkliste „Erste Schritte“ aus
// echten Daten (rechtegeprüfte Backend-Operationen) + gespeichertem Zustand.

import { backend } from "../backend";
import { bedienung } from "../backend/bedienung";
import { ersteSchritte } from "../onboarding";
import { assistentLaden, checklisteAusPfad } from "./onboarding"; // Onboarding-Assistenten je Rolle (Team B1)

const hat = (n, ...r) => r.some((x) => n?.rollen?.includes(x));

/**
 * { zustand, liste, pfad } für den angemeldeten Nutzer. Seit den Onboarding-Assistenten je Rolle (Team B1) kommt die
 * Checkliste aus dem aktiven Pfad (server/onboarding.js); die generische Liste bleibt als Rückfall.
 */
export async function ersteSchritteLaden(n) {
  try {
    const a = await assistentLaden(n);
    if (a.pfad) return { zustand: a.legacy, liste: checklisteAusPfad(a.pfad), pfad: { id: a.pfad.id, titel: a.pfad.titel, untertyp: a.pfad.untertyp, untertypen: a.pfad.untertypen, abgeschlossen: a.pfad.abgeschlossen, pflichtOffen: a.pfad.pflichtOffen.length, naechster: a.pfad.naechster } };
  } catch {
    /* Rückfall: generische Checkliste */
  }
  return ersteSchritteGenerisch(n);
}

async function ersteSchritteGenerisch(n) {
  const b = backend();
  const leer = () => [];
  const [zustand, flaechen, projekte, vorgaenge] = await Promise.all([
    bedienung().onboarding(n),
    hat(n, "flaeche", "landwirt") ? b.flaechen(n).catch(leer) : [],
    hat(n, "anbieter") ? b.projekte(n).catch(leer) : [],
    b.vorgaenge(n).catch(leer),
  ]);
  const liste = ersteSchritte(
    {
      rollen: n.rollen || [],
      telefon: n.telefon,
      emailBestaetigt: !!n.emailBestaetigt,
      suchprofil: n.suchprofil || null,
      mailEinstellungen: n.mailEinstellungen || null,
      flaechen: flaechen.length,
      projekte: projekte.length,
      vorgaenge: vorgaenge.length,
    },
    zustand
  );
  return { zustand, liste };
}
