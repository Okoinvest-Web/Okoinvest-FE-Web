// src/lib/plattform/backend/demo/anbieterRegeln.js
//
// Anbieter / Verkäufer: Sperren für Statusübergänge, die demo.js innerhalb seiner Schreib-Transaktion braucht
// (ohne Import von demo.js – keine Zirkelbezüge). Arbeitet direkt auf `db` (Sammlung db.anbieter).
//
//   Projekt einreichen (→ pruefung)          offene Rückfragen des Backoffice → 422 „pruefpunkte“
//   Projekt veröffentlichen (pruefung → …)   ungeklärte Pflicht-Prüfpunkte → 409; identifizierende Angaben im Teaser → 409 „anonymitaet“
//   LOI annehmen (→ loi_angenommen)          Verkäufer hat die aktuelle LOI abgelehnt → 409 „votum“
//   Zuschlag im Bieterverfahren              Verkäufer hat das Gebot (diese Version) abgelehnt → 409 „votum“
//
// Python-Gegenstück: plattform/anbieter_kern.py → uebergang_sperre (aufgerufen in plattform/ablauf.py).

import { PlattformFehler } from "../../fehler";
import { AnbieterFehler, uebergangSperre, vorkenntnisAnerkannt, zuschlagSperre } from "../../anbieter/regeln.js";

export const anbieterAkteDb = (db, projektId) => db?.anbieter?.akten?.[projektId] || null;

/** Verkauf/Closing: vom Backoffice anerkannte Vorkenntnis zum Käufer → keine Provision (Python: anbieter_kern.vorkenntnis_anerkannt) */
export const anbieterVorkenntnisAnerkannt = (db, projektId, interesseId) => vorkenntnisAnerkannt(anbieterAkteDb(db, projektId), interesseId);

export function anbieterUebergangPruefen(db, art, o, nach) {
  if (!db || !o) return true;
  const projektId = art === "projekt" ? o.id : art === "interesse" ? o.projektId : null;
  if (!projektId) return true;
  const akte = anbieterAkteDb(db, projektId);
  const projekt = art === "projekt" ? o : (db.projekte || []).find((p) => p.id === projektId);
  const anbieter = projekt ? (db.nutzer || []).find((u) => u.id === projekt.anbieterId) : null;
  if (!akte && !(art === "projekt" && nach === "veroeffentlicht")) return true;
  try {
    return uebergangSperre({ art, nach, von: o.status, akte, projekt, anbieter, interesseId: art === "interesse" ? o.id : null, loiAm: art === "interesse" ? o.loi?.am : null });
  } catch (e) {
    if (e instanceof AnbieterFehler) throw new PlattformFehler(e.status, e.message, e.code);
    throw e;
  }
}

/** Bieterverfahren: Zuschlag auf ein vom Verkäufer abgelehntes Gebot → 409 „votum“ (Python: api/anbieter.zuschlag_pruefen) */
export function anbieterZuschlagPruefen(db, gebot) {
  if (!gebot) return true;
  const akte = anbieterAkteDb(db, gebot.projektId);
  if (!akte) return true;
  try {
    return zuschlagSperre({ akte, gebotId: gebot.id, version: gebot.version || 1 });
  } catch (e) {
    if (e instanceof AnbieterFehler) throw new PlattformFehler(e.status, e.message, e.code);
    throw e;
  }
}
