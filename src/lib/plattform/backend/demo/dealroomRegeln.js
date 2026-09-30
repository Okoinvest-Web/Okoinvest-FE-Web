// src/lib/plattform/backend/demo/dealroomRegeln.js
//
// Reine Regeln des Deal-Rooms auf der Demo-Datenbank, die auch demo.js braucht
// (Freigabestufen beim Dokument-Download, Aufrufverlauf). Ohne Import von demo.js,
// damit keine Zirkelbezüge entstehen.

import { investorStufe } from "../../dealroom";

const TZ = "Europe/Vienna";
export const tagHeute = (d = new Date()) => d.toLocaleDateString("sv-SE", { timeZone: TZ });

/** Ist der Investor (Interesse) zur verbindlichen Runde eines aktiven Bieterverfahrens zugelassen? */
export function verbindlichZugelassen(db, interesse) {
  if (!interesse) return false;
  const liste = db.dealroom?.verfahren || [];
  return liste.some(
    (v) =>
      v.projektId === interesse.projektId &&
      !["abgebrochen"].includes(v.status) &&
      (v.runden || []).some((r) => r.art === "verbindlich" && (r.teilnehmer || []).includes(interesse.id))
  );
}

/** Stufe (1|2) eines Datenraum-Dokuments – Standard 1 */
export function dokumentStufe(db, dokumentId) {
  return Number(db.dealroom?.dokMeta?.[dokumentId]?.stufe) === 2 ? 2 : 1;
}

/** Darf der Investor (Interesse) dieses Datenraum-Dokument nach Freigabestufe öffnen? */
export function datenraumStufeOk(db, dokument, interesse) {
  const stufe = investorStufe(interesse, { verbindlichZugelassen: verbindlichZugelassen(db, interesse) });
  return stufe >= dokumentStufe(db, dokument?.id);
}

/** Aufruf eines Exposés je Tag zählen (Anbieter-Cockpit „Aufrufe über Zeit“), 400 Tage vorhalten */
export function aufrufVerlaufZaehlen(db, projektId) {
  db.aufrufVerlauf = db.aufrufVerlauf || {};
  const v = (db.aufrufVerlauf[projektId] = db.aufrufVerlauf[projektId] || {});
  const tag = tagHeute();
  v[tag] = (v[tag] || 0) + 1;
  const tage = Object.keys(v).sort();
  if (tage.length > 400) for (const t of tage.slice(0, tage.length - 400)) delete v[t];
}
