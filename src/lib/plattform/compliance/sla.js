// src/lib/plattform/compliance/sla.js
//
// Bearbeitungsziel (SLA) der KYC/KYB-Warteschlange – reine Funktionen. Werktage Mo–Fr (Feiertage bleiben
// unberücksichtigt – bewusst konservativ). Ziel ist ein internes Serviceversprechen, keine gesetzliche Frist.

export const KYC_SLA = { kyc: 3, kyb: 5, zweitpruefung: 2 }; // Werktage ab Einreichung bzw. Erstprüfung

const tag = (iso) => new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);

/** Werktage zwischen a (exklusiv) und b (inklusiv); negativ, wenn b vor a */
export function werktage(a, b) {
  const von = tag(a);
  const bis = tag(b);
  const vz = bis >= von ? 1 : -1;
  let n = 0;
  const d = new Date(von);
  while (vz > 0 ? d < bis : d > bis) {
    d.setUTCDate(d.getUTCDate() + vz);
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) n += vz;
  }
  return n;
}

/** Datum + n Werktage */
export function plusWerktage(iso, n) {
  const d = tag(iso);
  let rest = n;
  while (rest > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) rest--;
  }
  return d.toISOString().slice(0, 10);
}

/** SLA eines Falls: { zielTage, faelligAm, restWerktage, ampel: gruen|gelb|rot|keine } */
export function kycSla(f, heute, sla = KYC_SLA) {
  const offen = ["eingereicht", "in_pruefung", "zweitpruefung"].includes(f?.status);
  const start = f?.status === "zweitpruefung" ? f.pruefung?.erstAm || f.eingereichtAm : f?.eingereichtAm;
  if (!offen || !start) return { ampel: "keine", zielTage: null, faelligAm: null, restWerktage: null };
  const ziel = f.status === "zweitpruefung" ? sla.zweitpruefung : f.kontotyp === "unternehmen" ? sla.kyb : sla.kyc;
  const faellig = plusWerktage(start, ziel);
  const rest = werktage(heute, faellig);
  return { zielTage: ziel, faelligAm: faellig, restWerktage: rest, ampel: rest < 0 ? "rot" : rest === 0 ? "gelb" : "gruen" };
}
