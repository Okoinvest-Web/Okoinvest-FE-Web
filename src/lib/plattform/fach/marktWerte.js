// src/lib/plattform/fach/marktWerte.js
//
// Auszug der Marktwerte aus src/lib/invest/markt.js, den die Frappe-App für dieselben Plausibilitätsprüfungen braucht
// (Backend-Import/oekoinvest_app/oekoinvest_app/plattform/fach/markt_werte.json). Die JSON-Datei wird aus dieser
// Funktion erzeugt; scripts/plattform-test-fach-kapital.mjs prüft, dass beide übereinstimmen.

import { AGRI, BAUART, CARPORT, ERLOESE, FREIFLAECHE, PACHT, REGIONEN } from "../../invest/markt.js";

export function marktWerte() {
  return {
    quelle: "src/lib/invest/markt.js (Auszug, generiert – nicht von Hand ändern)",
    regionen: Object.fromEntries(REGIONEN.map((r) => [r.id, r.ertrag])),
    bauart: Object.fromEntries(Object.entries(BAUART).map(([k, b]) => [k, { label: b.label, faktor: b.faktor, haProMwp: b.haProMwp }])),
    carportErtragFaktor: CARPORT.ertragFaktor,
    erloese: { eegFreiflaecheCt: ERLOESE.eegFreiflaecheCt, eegBesondereCt: ERLOESE.eegBesondereCt, ppaCt: { min: ERLOESE.ppaCt.min, max: ERLOESE.ppaCt.max } },
    capex: {
      freiflaeche: { min: FREIFLAECHE.capexProKwp.min, max: FREIFLAECHE.capexProKwp.max },
      agri: { min: AGRI.capexProKwp.hoch.min, max: AGRI.capexProKwp.hoch.max },
      carport: { min: CARPORT.capexProKwp.min, max: CARPORT.capexProKwp.max },
    },
    pacht: { freiflaeche: { min: PACHT.freiflaecheProHa.min, max: PACHT.freiflaecheProHa.max }, agri: { min: PACHT.agriProHa.min, max: PACHT.agriProHa.max } },
    agriPrivilegierungHa: AGRI.privilegierungHa,
  };
}
