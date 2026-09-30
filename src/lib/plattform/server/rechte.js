// src/lib/plattform/server/rechte.js
//
// Durchsetzung der Backoffice-Unterrollen (src/lib/plattform/rechte.js):
//  - APIs: route() ruft adminRechtPruefen() für jede Anfrage auf /api/admin/** (nach dem Lesen des Bodys,
//    damit z. B. /api/admin/status die Objektart kennt). Option `recht` im route()-Aufruf überschreibt die
//    Ableitung aus dem Pfad.
//  - Seiten: server/seite.js prüft /portal/admin/** über seitenRechtOk().
// Nicht-Admins werden hier nicht geprüft (dafür sorgt `admin: true` in route() bzw. portalNutzer).

import { PlattformFehler } from "../fehler";
import { BEREICHE, STUFE_LABEL, apiAnforderungen, fehlendeRechte, darfLesen, seitenBereich } from "../rechte";

export function adminRechtPruefen(nutzer, { request, body, params, recht } = {}) {
  const pfad = request?.nextUrl?.pathname || "";
  if (!pfad.startsWith("/api/admin/") && !recht) return;
  if (!nutzer?.rollen?.includes("admin")) return;
  const fehlt = fehlendeRechte(nutzer, apiAnforderungen({ pfad, methode: request.method, body, params, recht }));
  if (fehlt.length) {
    const f = fehlt[0];
    throw new PlattformFehler(403, `Ihre Backoffice-Rolle erlaubt im Bereich „${BEREICHE[f.bereich] || f.bereich}“ kein ${STUFE_LABEL[f.stufe]}.`, "recht");
  }
}

/** Darf der Nutzer die Admin-Seite (Pfad) sehen? */
export function seitenRechtOk(nutzer, pfad) {
  const bereich = seitenBereich(pfad);
  return !bereich || darfLesen(nutzer, bereich);
}
