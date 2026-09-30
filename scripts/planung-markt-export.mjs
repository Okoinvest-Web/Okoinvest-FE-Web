// scripts/planung-markt-export.mjs
//
// Erzeugt Backend-Import/oekoinvest_app/oekoinvest_app/plattform/planung_markt.py aus src/lib/invest/markt.js (nur die Werte,
// die die Projektkostenkalkulation braucht) – damit Frappe (planung_kern.py) und das Portal (planung/kosten.js) mit denselben
// Vorschlagswerten rechnen. Nach Änderungen an markt.js ausführen:  node scripts/planung-markt-export.mjs
import { writeFileSync } from "node:fs";
import { AGRI, CARPORT, DACH, FINANZIERUNG, FREIFLAECHE, PACHT, PROJEKTKOSTEN, SPEICHER, STAND } from "../src/lib/invest/markt.js";

const werte = {
  FREIFLAECHE: { capexProKwp: FREIFLAECHE.capexProKwp, netzanschlussFixProMwp: FREIFLAECHE.netzanschlussFixProMwp, entwicklungProKwp: FREIFLAECHE.entwicklungProKwp, rueckbauProKwp: FREIFLAECHE.rueckbauProKwp, netz: { msSystemMw: FREIFLAECHE.netz.msSystemMw, zusatzSystemFaktor: FREIFLAECHE.netz.zusatzSystemFaktor, uwFeld: FREIFLAECHE.netz.uwFeld, einschleifen: FREIFLAECHE.netz.einschleifen, hsKabelProKm: FREIFLAECHE.netz.hsKabelProKm, kundenUwFix: FREIFLAECHE.netz.kundenUwFix, kundenUwProMva: FREIFLAECHE.netz.kundenUwProMva, grenzeMsMw: FREIFLAECHE.netz.grenzeMsMw, grenzeUwMw: FREIFLAECHE.netz.grenzeUwMw } },
  AGRI_CAPEX: AGRI.capexProKwp.vertikal,
  CARPORT_CAPEX: CARPORT.capexProKwp,
  DACH_CAPEX: DACH.capexProKwp,
  SPEICHER: { capexProKwh: SPEICHER.capexProKwh, bkzProKw: SPEICHER.bkzProKw, netzanschlussProKw: SPEICHER.netzanschlussProKw },
  PACHT: { reservierungProHa: PACHT.reservierungProHa, reservierungJahre: PACHT.reservierungJahre },
  FINANZIERUNG: { fremdkapitalQuote: FINANZIERUNG.fremdkapitalQuote, projekt: { referenzzinsPct: FINANZIERUNG.projekt.referenzzinsPct, margePct: FINANZIERUNG.projekt.margePct, bearbeitungPct: FINANZIERUNG.projekt.bearbeitungPct } },
  PROJEKTKOSTEN,
};
const py = `# Copyright (c) 2026, ÖkoInvest GmbH
#
# GENERIERT aus src/lib/invest/markt.js (Stand ${STAND}) – nicht von Hand ändern:  node scripts/planung-markt-export.mjs
# Vorschlagswerte der Projektkostenkalkulation (planung_kern.py), identisch zum Portal (src/lib/plattform/planung/kosten.js).

import json

MARKT = json.loads(r"""${JSON.stringify(werte)}""")
`;
writeFileSync(new URL("../Backend-Import/oekoinvest_app/oekoinvest_app/plattform/planung_markt.py", import.meta.url), py);
console.log("planung_markt.py geschrieben");
