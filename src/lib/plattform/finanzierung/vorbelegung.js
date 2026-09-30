// src/lib/plattform/finanzierung/vorbelegung.js
//
// Vorbelegung des Finanzierungscockpits aus einem Börsenprojekt – dockt an das Bewertungswerkzeug der Fachprüfung an
// (fach/bewertung.js → bewertungVorbelegung: Datenblatt, Exposé, Markt) und übersetzt in die Cockpit-Eingaben.
// Reine Funktion; genutzt vom Demo-Backend und vom Frappe-Adapter (Frappe liefert nur die rechtegeprüften Projektdaten).

import { BAUART } from "../../invest/markt.js";
import { investition } from "../../rechner/solarpark.js";
import { bewertungVorbelegung } from "../fach/bewertung.js";
import { cockpitAusBewertung, TYPEN_FZ } from "./kern.js";

/** d = { projekt, vertraulich, datenblatt } (boerseDetail mit Datenraum-Zugriff) → { eingaben, quellen, modus, hinweise } */
export function vorbelegungAusProjekt(d) {
  const p = d.projekt;
  const vb = bewertungVorbelegung(p, d.vertraulich || {}, d.datenblatt || {});
  const b = vb.eingaben;
  const land = ["DE", "AT", "CH"].includes(p.land) ? p.land : "DE";
  const typ = TYPEN_FZ[p.typ] ? p.typ : "freiflaeche";
  const inv = vb.modus === "entwicklung" ? investition({ mwp: b.mwp, capexKwp: b.capexKwp, entwicklungKwp: (b.kaufpreisKwp || 0) + (b.restentwicklungKwp || 0), netzKm: b.netzKm }) : null;
  const x = cockpitAusBewertung(vb, { land, typ, inv, haProMwp: BAUART[b.bauart]?.haProMwp || 1.1 });
  return { ...x, hinweise: vb.hinweise || [] };
}
