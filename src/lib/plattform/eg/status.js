// src/lib/plattform/eg/status.js
//
// Zustandswechsel der Kern-Entitäten (Fachkonzept 3.4, 3.6, 3.8): Gemeinschaft, Mitglied, Teilnahme. Reine Funktionen.
// WP2 (EDA) schreibt Teilnahme-Status AUSSCHLIESSLICH über teilnahmeUebergang() (Backend: egTeilnahmeUebergang).
// Python-Spiegel: plattform/eg_stamm_kern.py (gleiche Testvektoren: eg/testdaten/stamm/uebergaenge.json).

import { fehler, konfliktFehler, datum as datumPruefen, plusTage, text, ganz } from "../mitglied/basis.js";
import { GEMEINSCHAFT_STATUS, MITGLIED_STATUS, TEILNAHME_STATUS, TF_MAX, TF_MIN, ZUSTIMMUNG_FRIST_TAGE } from "./modell.js";

const tag = (v) => String(v || "").slice(0, 10);

/** Gemeinschaft: erlaubter Folgezustand? Wirft 409 sonst. Pflichtangaben je Ziel (ZVR/FN, Marktpartner-ID, Gemeinschafts-ID). */
export function gemeinschaftUebergang(g, nach, { grund = "" } = {}) {
  const von = g?.status || "interesse";
  if (!GEMEINSCHAFT_STATUS[nach]) throw fehler("Unbekannter Status der Gemeinschaft.", "status");
  if (von === nach) return { status: nach };
  if (!GEMEINSCHAFT_STATUS[von]?.naechste.includes(nach)) throw konfliktFehler(`Wechsel von „${GEMEINSCHAFT_STATUS[von]?.label || von}“ nach „${GEMEINSCHAFT_STATUS[nach].label}“ ist nicht vorgesehen.`);
  if (nach === "rechtsperson" && g.rechtsform !== "keine" && !(g.zvrZahl || g.firmenbuchnummer)) throw fehler("Für den Status „Rechtsperson“ bitte ZVR-Zahl bzw. Firmenbuchnummer eintragen.", "zvrZahl");
  if (nach === "marktpartner" && !g.marktpartnerId) throw fehler("Für den Status „Marktpartner“ bitte die Marktpartner-ID (ebUtilities) eintragen.", "marktpartnerId");
  if (nach === "vertrag_nb" && !g.gemeinschaftsId) throw fehler("Für den Status „Vertrag mit dem Netzbetreiber“ bitte die Gemeinschafts-ID eintragen.", "gemeinschaftsId");
  if (["aufgeloest", "in_aufloesung"].includes(nach) && !text(grund, 500)) throw fehler("Bitte den Beschluss bzw. Grund angeben.", "grund");
  return { status: nach };
}

/** Mitglied: erlaubter Folgezustand; Kündigung braucht `zum`, Ausschluss/Ablehnung einen Grund */
export function mitgliedUebergang(m, nach, { grund = "", zum = "" } = {}) {
  const von = m?.status || "interessent";
  if (!MITGLIED_STATUS[nach]) throw fehler("Unbekannter Mitgliedsstatus.", "status");
  if (von === nach) return { status: nach };
  if (!MITGLIED_STATUS[von]?.naechste.includes(nach)) throw konfliktFehler(`Wechsel von „${MITGLIED_STATUS[von]?.label || von}“ nach „${MITGLIED_STATUS[nach].label}“ ist nicht vorgesehen.`);
  if (nach === "gekuendigt" && !datumPruefen(zum)) throw fehler("Bitte das Austrittsdatum (Kündigung zum) angeben.", "zum");
  if (["abgelehnt", "ausgeschlossen"].includes(nach) && !text(grund, 500)) throw fehler("Bitte einen Grund angeben.", "grund");
  return { status: nach, ...(nach === "gekuendigt" ? { austrittZum: datumPruefen(zum) } : {}) };
}

/**
 * Teilnahme-Übergang anhand eines Ereignisses (TEILNAHME_STATUS[…].ereignisse).
 * @param {object} t Teilnahme (EgTeilnahme)
 * @param {string} ereignis z. B. senden, anforderung_econ, zustimmung_econ, abschluss_econ, tf_geaendert, cm_rev_sp, cm_rev_cus …
 * @param {{heute:string, datum?:string, consentId?:string, teilnahmefaktor?:number, responsecode?:string, prozessId?:string, grund?:string, von?:string|null}} o
 * @returns {object} neue Teilnahme (Kopie) mit Verlaufseintrag
 */
export function teilnahmeUebergang(t, ereignis, o = {}) {
  const von = t?.status || "entwurf";
  const ziel = TEILNAHME_STATUS[von]?.ereignisse?.[ereignis];
  if (!ziel) throw konfliktFehler(`Ereignis „${ereignis}“ ist im Status „${TEILNAHME_STATUS[von]?.label || von}“ nicht vorgesehen.`);
  const heute = tag(o.heute);
  const d = datumPruefen(o.datum) || heute;
  const neu = { ...t, status: ziel, tfHistorie: [...(t.tfHistorie || [])], verlauf: [...(t.verlauf || [])] };
  if (o.responsecode !== undefined) neu.responsecode = text(o.responsecode, 40);
  if (ereignis === "anforderung_econ") neu.fristBis = plusTage(d, ZUSTIMMUNG_FRIST_TAGE);
  if (ereignis === "zustimmung_econ") {
    neu.consentId = text(o.consentId, 80) || t.consentId || "";
    neu.fristBis = "";
  }
  if (ereignis === "abschluss_econ") {
    if (!datumPruefen(o.datum)) throw fehler("Für die Aktivierung bitte das Aktivierungsdatum laut ABSCHLUSS_ECON angeben.", "datum");
    neu.gueltigAb = d;
    neu.gueltigBis = "";
    neu.tfHistorie.push({ gueltigAb: d, tf: t.teilnahmefaktor, prozessId: text(o.prozessId, 40) });
  }
  if (ereignis === "tf_geaendert") {
    const tf = ganz(o.teilnahmefaktor, TF_MIN, TF_MAX);
    if (tf === null) throw fehler(`Der Teilnahmefaktor ist eine ganze Zahl von ${TF_MIN} bis ${TF_MAX} %.`, "teilnahmefaktor");
    if (neu.tfHistorie.some((h) => h.gueltigAb === d)) throw konfliktFehler("Je Gemeinschaft und Zählpunkt ist derzeit nur eine Änderung des Teilnahmefaktors pro Tag möglich.");
    neu.teilnahmefaktor = tf;
    neu.tfHistorie.push({ gueltigAb: d, tf, prozessId: text(o.prozessId, 40) });
  }
  if (ereignis === "cm_rev_sp") {
    if (d < heute) throw konfliktFehler("Eine Abmeldung ist nicht rückwirkend möglich (Prozessdatum frühestens heute).");
    neu.gueltigBis = d;
  }
  if (["abmeldung_ok", "cm_rev_cus", "cm_rev_imp"].includes(ereignis)) {
    neu.gueltigBis = ereignis === "abmeldung_ok" ? t.gueltigBis || d : d;
    neu.beendetGrund = ereignis === "cm_rev_cus" ? "widerruf" : ereignis === "cm_rev_imp" ? "implizit" : "abmeldung";
  }
  if (ereignis === "abmeldung_abgelehnt") neu.gueltigBis = "";
  if (ereignis === "erneut") Object.assign(neu, { consentId: "", fristBis: "", responsecode: "" });
  neu.verlauf.push({ am: o.am || `${heute}T12:00:00.000Z`, von, nach: ziel, ereignis, prozessId: text(o.prozessId, 40), text: text(o.grund, 300), vonKonto: o.von ?? null });
  return neu;
}

/** Erlaubte Ereignisse einer Teilnahme (für Knöpfe der Korrektur-Ansicht) */
export const teilnahmeEreignisse = (t) => Object.keys(TEILNAHME_STATUS[t?.status || "entwurf"]?.ereignisse || {});
