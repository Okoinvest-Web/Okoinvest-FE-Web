// src/lib/plattform/oeffentlich.js
//
// Sichtbarkeitsregeln für Projekte der Börse (Positivliste).
//  - öffentlich:  anonymer Teaser, grobe Region, keine Anbieterdaten
//  - vertraulich: nur für Anbieter, Admin und Investoren mit freigegebenem NDA
// Beide Backends liefern Daten ausschließlich über diese Projektionen aus.

const OEFFENTLICH = [
  "id", "slug", "titel", "typ", "land", "bundesland", "region", "mwp", "mwhSpeicher", "flaecheHa", "phase", "netzanschluss",
  "codGeplant", "preisModus", "preis", "preisProKwp", "beschreibung", "highlights", "status", "veroeffentlichtAm", "demo",
  // Welle 3, Paket B10 (Neutralität): Anbieter-Kennzeichnung und Backoffice-Vorprüfung – nur Booleans,
  // keine Anbieterdaten. Badges entstehen daraus in src/lib/boerse/neutralitaet.js.
  "eigenprojekt", "gruppeBeteiligt", "unterlagenVorgeprueft",
];

/** Öffentlicher Teaser – für Liste und Exposé ohne NDA */
export function projektOeffentlich(p) {
  if (!p) return null;
  const o = {};
  for (const k of OEFFENTLICH) if (p[k] !== undefined) o[k] = p[k];
  o.highlights = Array.isArray(p.highlights) ? p.highlights : [];
  for (const k of ["eigenprojekt", "gruppeBeteiligt", "unterlagenVorgeprueft"]) if (o[k] !== undefined && typeof o[k] !== "boolean") delete o[k];
  return o;
}

/** Vertrauliche Felder – nur nach NDA-Freigabe */
export const VERTRAULICH_FELDER = {
  gemeinde: "Gemeinde",
  gemarkung: "Gemarkung / Katastralgemeinde",
  flurstuecke: "Flurstücke",
  netzbetreiber: "Netzbetreiber",
  einspeisepunkt: "Einspeisepunkt / Umspannwerk",
  entfernungNetzKm: "Entfernung zum Netzverknüpfungspunkt (km)",
  sicherung: "Flächensicherung (Pacht / Gestattung)",
  planungsrecht: "Planungsrechtlicher Stand",
  ertragKwhKwp: "Spezifischer Ertrag (kWh/kWp)",
  verguetung: "Vergütung / Vermarktung",
  details: "Weitere Angaben",
};

export function projektVertraulich(p) {
  const v = p?.vertraulich || {};
  const o = {};
  for (const k of Object.keys(VERTRAULICH_FELDER)) if (v[k] !== undefined && v[k] !== "") o[k] = v[k];
  return o;
}
