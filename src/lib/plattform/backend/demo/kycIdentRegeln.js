// src/lib/plattform/backend/demo/kycIdentRegeln.js
//
// Eigene Identifizierung (MRZ, Videoidentifizierung) – Helfer auf dem Demo-Datenbestand, die demo/kyc.js und
// demo/kycIdent.js innerhalb ihrer Transaktion nutzen. Ohne Datenbank-Lebenszyklus (kein lesen/aendern hier).
//
// Ablage der MRZ: nur der Befund liegt lesbar am Fall (Ampel, Befunde, Dokumentnummer maskiert); die abgetippten Zeilen
// selbst liegen AES-256-GCM-verschlüsselt (server/kycKrypto.js, AAD „<Fall-ID>:mrz“) im Feld f.mrz.chiffrat und fallen
// mit dem Fall unter die Löschfrist (kycFristen löscht den ganzen Fall).

import { TERMIN_AKTIV, zeitraumText } from "../../termine";
import { mrzBefund } from "../../kycIdent";
import { kycEntschluesseln, kycVerschluesseln } from "../../server/kycKrypto";

export const IDENT_TERMINART = "identifizierung";

/** Soll-Daten für den MRZ-Abgleich aus den Personenangaben des Falls */
export function mrzSoll(f) {
  const p = f?.person || {};
  return { vorname: p.vorname, nachname: p.nachname, geburtsdatum: p.geburtsdatum, staatsangehoerigkeit: p.staatsangehoerigkeit, ausweis: p.ausweis || {} };
}

/** MRZ bewerten und verschlüsselt am Fall ablegen */
export function mrzSetzen(f, zeilen, { vonId = null } = {}) {
  const befund = mrzBefund(zeilen, mrzSoll(f));
  f.mrz = { ...befund, am: new Date().toISOString(), vonId, chiffrat: kycVerschluesseln(Buffer.from(JSON.stringify(zeilen), "utf8"), `${f.id}:mrz`).toString("base64") };
  return f.mrz;
}

/** Abgetippte Zeilen entschlüsseln (nur Compliance bzw. Neubewertung) */
export function mrzZeilenLesen(f) {
  if (!f?.mrz?.chiffrat) return null;
  try {
    return JSON.parse(kycEntschluesseln(Buffer.from(f.mrz.chiffrat, "base64"), `${f.id}:mrz`).toString("utf8"));
  } catch (e) {
    console.warn("[plattform-kyc] MRZ nicht lesbar:", e?.message);
    return null;
  }
}

/** Nach Änderung der Personenangaben bzw. beim Einreichen neu abgleichen (Datum, Ablauf, Alter) */
export function mrzNeuBewerten(f) {
  const z = mrzZeilenLesen(f);
  if (z) mrzSetzen(f, z, { vonId: f.mrz?.vonId || null });
}

/** Befund ohne Chiffrat (für Ausgaben) */
export function mrzAusgabe(m) {
  if (!m) return null;
  const { chiffrat, ...rest } = m;
  return rest;
}

/** Aktiver Identifizierungstermin des Kontos (egal über welchen Weg gebucht) */
export function identTermin(db, kontoId) {
  return (db.service?.termine || [])
    .filter((t) => t.kontoId === kontoId && t.art === IDENT_TERMINART && TERMIN_AKTIV.includes(t.status))
    .sort((a, b) => a.start.localeCompare(b.start))[0] || null;
}

/**
 * Zusammenfassung der Videoidentifizierung eines Falls (ohne Mutation).
 * status: offen | gebucht | laufend | bestanden | abgebrochen | verdacht; ergebnis: letztes Ergebnis (Verdacht bleibt stehen).
 */
export function videoSicht(db, f) {
  const protokolle = f?.video?.protokolle || [];
  const laufend = protokolle.find((p) => !p.beendetAm) || null;
  const fertig = protokolle.filter((p) => p.beendetAm);
  const ergebnis = fertig.some((p) => p.ergebnis === "verdacht") ? "verdacht" : fertig.at(-1)?.ergebnis || null;
  const t = f?.kontoId ? identTermin(db, f.kontoId) : null;
  const termin = t ? { id: t.id, start: t.start, ende: t.ende, zeitraum: zeitraumText(t.start, t.ende), status: t.status, mitarbeiterId: t.mitarbeiterId } : null;
  let status = "offen";
  if (laufend) status = "laufend";
  else if (ergebnis === "verdacht") status = "verdacht";
  else if (ergebnis === "bestanden") status = "bestanden";
  else if (termin) status = "gebucht";
  else if (ergebnis === "abgebrochen") status = "abgebrochen";
  return { status, ergebnis, termin, laufendId: laufend?.id || null, protokolle, anzahl: protokolle.length };
}

/** Fall mit abgeleiteter Video-Sicht (für Anforderungen, Risiko, Freigabe-Gründe) */
export const fallMitIdent = (db, f) => (f ? { ...f, video: videoSicht(db, f) } : f);

/** Nutzersicht: kein Hinweis auf „Verdacht“ (Tipping-off-Verbot) */
export function videoFuerNutzer(sicht) {
  if (!sicht) return null;
  const status = sicht.status === "verdacht" || sicht.status === "bestanden" ? "abgeschlossen" : sicht.status;
  return { status, termin: sicht.termin ? { id: sicht.termin.id, start: sicht.termin.start, ende: sicht.termin.ende, zeitraum: sicht.termin.zeitraum } : null, gespraeche: sicht.protokolle.filter((p) => p.beendetAm).length };
}
