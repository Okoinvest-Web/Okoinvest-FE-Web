// src/lib/plattform/backend/demo/diensteRegeln.js
//
// Regeln der Dienste (Bonität vor LOI/Gebot) auf der Demo-Datenbank für ANDERE Module innerhalb ihrer
// Schreib-Transaktion. Ohne Import von demo.js (keine Zirkelbezüge) – arbeitet direkt auf `db` (Sammlung db.dienste).
//
// Nutzung (eine Zeile):
//   import { bonitaetUebergangPruefen, bonitaetSperre } from "./demo/diensteRegeln";
//   bonitaetUebergangPruefen(db, art, o, nach);                       // demo.js → uebergangAnwenden (LOI)
//   bonitaetSperre(db, "gebot", { kontoId, organisationId });          // dealroom.js → Gebot
// wirft PlattformFehler 409 (code „bonitaet“), solange keine gültige Bonitätsauskunft vorliegt (nur wenn Pflicht).

import { PlattformFehler } from "../../fehler";
import { BONITAET_HINWEIS_NUTZER, bonitaetEinstellungenStandard, bonitaetGueltig, bonitaetPflichtAktiv } from "../../dienste/bonitaet/basis";

export function bonitaetEinstellungenDb(db) {
  return { ...bonitaetEinstellungenStandard(), ...(db?.dienste?.einstellungen?.bonitaet || {}) };
}

/** Handelt das Subjekt als Unternehmen? (Organisation, Firmenname am Konto oder KYB-Fall) */
export function istFirma(db, { kontoId = null, organisationId = null } = {}) {
  if (organisationId) return true;
  const u = (db?.nutzer || []).find((x) => x.id === kontoId);
  if (u?.firma && String(u.firma).trim()) return true;
  const f = (db?.kyc?.faelle || []).find((x) => x.kontoId === kontoId);
  return f?.kontotyp === "unternehmen";
}

/** Neueste Auskunft zum Subjekt (Organisation vor Konto) */
export function bonitaetAktuell(db, { kontoId = null, organisationId = null } = {}) {
  const liste = (db?.dienste?.bonitaet || []).filter((a) => (organisationId && a.subjekt?.organisationId === organisationId) || (kontoId && a.subjekt?.kontoId === kontoId));
  return liste.sort((a, b) => String(b.auskunftAm || b.am).localeCompare(String(a.auskunftAm || a.am)))[0] || null;
}

/** Freigabe prüfen: { ok, aktiv, grund, auskunftId } */
export function bonitaetFreigabeDb(db, schritt, { kontoId = null, organisationId = null } = {}) {
  const e = bonitaetEinstellungenDb(db);
  const aktiv = bonitaetPflichtAktiv(schritt, { kontoId, firma: istFirma(db, { kontoId, organisationId }) }, e, process.env);
  if (!aktiv) return { ok: true, aktiv: false, grund: "", auskunftId: null };
  const a = bonitaetAktuell(db, { kontoId, organisationId });
  const g = bonitaetGueltig(a, e);
  return { ok: g.ok, aktiv: true, grund: g.grund, auskunftId: a?.id || null };
}

/** Wirft 409 (code „bonitaet“), wenn für den Schritt keine gültige Auskunft vorliegt. Kein Ergebnis im Text (Vertraulichkeit). */
export function bonitaetSperre(db, schritt, ziel = {}) {
  const r = bonitaetFreigabeDb(db, schritt, ziel);
  if (r.ok) return r;
  throw new PlattformFehler(409, ziel.text || BONITAET_HINWEIS_NUTZER, "bonitaet");
}

/** Statusübergänge mit Bonitätspflicht (demo.js → uebergangAnwenden) */
export function bonitaetUebergangPruefen(db, art, o, nach) {
  if (art === "interesse" && nach === "loi_abgegeben") bonitaetSperre(db, "loi", { kontoId: o.investorId, organisationId: o.organisationId || null });
  return true;
}
