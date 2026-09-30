// src/lib/plattform/server/bedienung.js
//
// Serverseitige Helfer „Bedienung & Onboarding“: Checkliste „Erste Schritte“ aus
// echten Daten (rechtegeprüfte Backend-Operationen) + gespeichertem Zustand.

import { backend } from "../backend";
import { bedienung } from "../backend/bedienung";
import { ersteSchritte } from "../onboarding";

const hat = (n, ...r) => r.some((x) => n?.rollen?.includes(x));

/** { zustand, liste } für den angemeldeten Nutzer. Fehler einzelner Quellen blockieren nicht. */
export async function ersteSchritteLaden(n) {
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
