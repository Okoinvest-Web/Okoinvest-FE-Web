// src/lib/plattform/eg/periodenbeitrag.js
//
// WP3 (Integration): Beiträge je Zählpunkt für zusammengesetzte Periodenwerte – ein Beitrag hält Summen je Größe, je
// Tarif-Zeitfenster und je Tarif-Version sowie Zähler (aktive Tage, Soll-/fehlende/L3-Werte). Monatsbeiträge werden im
// Backend zwischengespeichert und zu beliebigen Zeiträumen addiert (ganze Monate als Summe, angeschnittene je Tag).
// Python-Spiegel: plattform/api/eg_energie.py (_beitrag_leer, _beitrag_addieren).

/** Leerer Beitrag */
export const beitragLeer = () => ({ groessen: {}, fenster: {}, tarif: {}, l3: 0, soll: 0, fehlend: 0, aktivTage: 0 });

function zuAddieren(ziel, quelle) {
  for (const [k, v] of Object.entries(quelle)) {
    if (v && typeof v === "object") zuAddieren((ziel[k] ||= {}), v);
    else ziel[k] = (ziel[k] || 0) + v;
  }
}

/** Beitrag q auf z addieren (z wird verändert, q nie – Cache-Einträge bleiben unberührt) */
export function beitragAddieren(z, q) {
  for (const k of ["l3", "soll", "fehlend", "aktivTage"]) z[k] += q[k];
  zuAddieren(z.groessen, q.groessen);
  zuAddieren(z.fenster, q.fenster);
  zuAddieren(z.tarif, q.tarif);
  return z;
}
