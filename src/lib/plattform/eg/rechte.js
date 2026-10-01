// src/lib/plattform/eg/rechte.js
//
// Rechte je Gemeinschaft (Kontext-Rollen, Fachkonzept Abschnitt 5) – reine Funktionen, client- und serverseitig.
// Eigentümer: WP1. Python-Spiegel: plattform/eg_stamm_kern.py (EG_RECHTE, rollen_von, stufe_von) – Abgleich im Test.
//
// Zwei Ebenen:
//  1. Backoffice (Rolle admin): Bereich „eg“ der Rechte-Matrix (src/lib/plattform/rechte.js; Unterrolle „eg“ =
//     Betriebsführung Energiegemeinschaften). Daraus entstehen die Kontext-Rollen „organisator“ (Gemeinschaft mit aktivem
//     Dienstleistungs-/AV-Vertrag) bzw. „gruendung“ (Gemeinschaft vor dem Status „aktiv“). Ohne Schreibrecht im Bereich „eg“
//     wirken sie höchstens lesend.
//  2. Portal: Organ-Einträge (vorstand, kassier, schriftfuehrer, rechnungspruefer – Teamrollen innerhalb der Gemeinschaft,
//     analog Bank-Team) und Mitglied-Einträge mit Bezug zum Konto (mitglied, gemeinde, interessent). Das globale Konto kann
//     jede Portal-Rolle haben (mitglied, landwirt, unternehmen, kommune …) – maßgeblich ist der Eintrag in der Gemeinschaft.
//
// Stufen: 0 kein Zugriff, 1 lesen bzw. vorbereiten/vorschlagen, 2 ausführen/schreiben.

import { darfLesen, darfSchreiben } from "../rechte.js";
import { EG_TEAMROLLEN, GEMEINSCHAFT_STATUS, MITGLIED_AKTIV, ORGAN_FUNKTIONEN } from "./modell.js";

const R = Object.keys(EG_TEAMROLLEN); // interessent, mitglied, gemeinde, vorstand, kassier, schriftfuehrer, rechnungspruefer, organisator, gruendung

/**
 * Rechte-Matrix je Gemeinschaft. Spalten in der Reihenfolge von EG_TEAMROLLEN:
 * interessent, mitglied, gemeinde, vorstand, kassier, schriftfuehrer, rechnungspruefer, organisator, gruendung
 */
const M = {
  eigene_daten: { label: "Eigene Daten, Zählpunkte, Belege, Dashboard", s: [1, 2, 2, 2, 2, 2, 2, 0, 0] },
  beitritt: { label: "Beitritt beantragen, TF-Wunsch, Kündigung", s: [2, 2, 2, 0, 0, 0, 0, 0, 0] },
  mitgliederliste: { label: "Mitgliederliste (Name, Status)", s: [0, 0, 0, 2, 2, 2, 1, 2, 1] },
  mitglied_aufnehmen: { label: "Mitglied aufnehmen bzw. ablehnen (1 = vorbereiten)", s: [0, 0, 0, 2, 0, 0, 0, 1, 0] },
  stammdaten: { label: "Zählpunkte, Anlagen, Mitgliederdaten pflegen", s: [0, 0, 0, 2, 1, 2, 1, 2, 2] },
  organe_statuten: { label: "Statuten, Organe, Rechtsdaten der Gemeinschaft (1 = vorbereiten)", s: [0, 1, 1, 2, 0, 2, 0, 1, 2] },
  eda_ausloesen: { label: "EDA-Prozesse auslösen (Anmeldung, TF, Abmeldung)", s: [0, 0, 0, 0, 0, 0, 0, 2, 2] },
  eda_freigeben: { label: "EDA-Massenvorgänge freigeben (Vier-Augen)", s: [0, 0, 0, 2, 0, 0, 0, 0, 0] },
  qh_aggregiert: { label: "Viertelstundenwerte aggregiert", s: [0, 0, 0, 1, 1, 0, 1, 1, 0] },
  qh_einzeln: { label: "Viertelstundenwerte einzelner Mitglieder (Zweckbindung, protokolliert)", s: [0, 0, 0, 1, 0, 0, 0, 1, 0] },
  tarife: { label: "Tarife und Preisblatt (1 = Vorschlag/vorbereiten)", s: [0, 0, 0, 2, 1, 0, 0, 1, 0] },
  abrechnung_vorschau: { label: "Abrechnungslauf: Vorschau", s: [0, 0, 0, 1, 1, 0, 1, 2, 0] },
  abrechnung_freigabe_1: { label: "Abrechnung freigeben (1. Auge)", s: [0, 0, 0, 0, 2, 0, 0, 0, 0] },
  abrechnung_freigabe_2: { label: "Abrechnung freigeben (2. Auge)", s: [0, 0, 0, 2, 0, 0, 0, 0, 0] },
  abrechnung_versand: { label: "Belege versenden (Vorstand/Kassier: 2 nur in Selbstverwaltung ohne Organisator)", s: [0, 0, 0, 1, 1, 0, 0, 2, 0] },
  sepa: { label: "SEPA-Dateien erzeugen, Zahlungen abgleichen", s: [0, 0, 0, 0, 2, 0, 1, 2, 0] },
  buchhaltung: { label: "Buchhaltung, UVA-Vorbereitung, Jahresabschluss", s: [0, 0, 0, 1, 2, 0, 1, 2, 0] },
  buchhaltung_pruefen: { label: "Rechnungsprüfung (Prüfpfad, Prüfvermerk)", s: [0, 0, 0, 0, 0, 0, 2, 0, 0] },
  gv: { label: "GV einberufen, Protokoll (Mitglieder: Teilnahme und Stimme)", s: [0, 1, 1, 2, 0, 2, 1, 1, 0] },
  gruendungsauftrag: { label: "Gründungsauftrag", s: [2, 0, 2, 2, 0, 0, 0, 0, 2] },
  audit: { label: "Audit-Log der Gemeinschaft", s: [0, 0, 0, 1, 1, 0, 1, 1, 0] },
};

/** { recht: { label, rollen: { rolle: stufe } } } */
export const EG_RECHTE = Object.fromEntries(Object.entries(M).map(([k, z]) => [k, { label: z.label, rollen: Object.fromEntries(R.map((r, i) => [r, z.s[i]])) }]));
export const EG_RECHTE_IDS = Object.keys(EG_RECHTE);
const BACKOFFICE_ROLLEN = ["organisator", "gruendung"];
/**
 * Stammdatenpflege durch das Backoffice (Bereich „eg“) auch ohne Kontext-Rolle – jede Änderung wird protokolliert.
 * EDA, Abrechnungsfreigaben, Zahlungen, Rechnungsprüfung und Einzelwerte bleiben an die Kontext-Rollen gebunden.
 */
/** Selbstverwaltung (kein aktiver Organisator): Vorstand und Kassier versenden Belege selbst (Stufe 2) */
export const SELBST_VERSAND = ["vorstand", "kassier"];
export const BACKOFFICE_PFLEGE = ["mitgliederliste", "stammdaten", "organe_statuten", "mitglied_aufnehmen", "tarife", "audit", "qh_aggregiert"];
/** Vor diesen Status gilt Backoffice-Arbeit als Gründungsberatung */
const VOR_BETRIEB = ["interesse", "machbarkeit", "in_gruendung", "rechtsperson", "marktpartner", "vertrag_nb", "eda_bereit"];

const tag = (v) => String(v || "").slice(0, 10);
/** Organ am Stichtag wirksam? */
export function organWirksam(o, heute) {
  if (!o || o.status === "beendet") return false;
  const h = tag(heute);
  return (!o.von || tag(o.von) <= h) && (!o.bis || tag(o.bis) >= h);
}

/**
 * Kontext-Rollen eines Kontos in einer Gemeinschaft.
 * @param {{nutzer:object, gemeinschaft:object, organe?:object[], mitglieder?:object[], heute:string}} k
 * @returns {{rollen:string[], backofficeStufe:number}}
 */
export function egRollen({ nutzer, gemeinschaft, organe = [], mitglieder = [], heute } = {}) {
  const rollen = new Set();
  let backofficeStufe = 0;
  const selbstverwaltung = !gemeinschaft?.dienstleistung?.aktiv; // Betriebsmodell ohne aktiven Organisator (Koordinator-Entscheidung)
  if (!nutzer || !gemeinschaft) return { rollen: [], backofficeStufe, selbstverwaltung };
  const gid = gemeinschaft.id;
  for (const o of organe) {
    if (o.gemeinschaftId === gid && o.kontoId && o.kontoId === nutzer.id && organWirksam(o, heute)) {
      const r = ORGAN_FUNKTIONEN[o.funktion]?.teamrolle;
      if (r) rollen.add(r);
    }
  }
  for (const m of mitglieder) {
    if (m.gemeinschaftId !== gid || !m.kontoId || m.kontoId !== nutzer.id) continue;
    if (MITGLIED_AKTIV.includes(m.status)) rollen.add(m.art === "gemeinde" ? "gemeinde" : "mitglied");
    else if (["interessent", "antrag", "geprueft"].includes(m.status)) rollen.add("interessent");
  }
  if (nutzer.rollen?.includes("admin") && darfLesen(nutzer, "eg")) {
    backofficeStufe = darfSchreiben(nutzer, "eg") ? 2 : 1;
    if (VOR_BETRIEB.includes(gemeinschaft.status) || !GEMEINSCHAFT_STATUS[gemeinschaft.status]) rollen.add("gruendung");
    if (gemeinschaft.dienstleistung?.aktiv) rollen.add("organisator");
  }
  return { rollen: R.filter((r) => rollen.has(r)), backofficeStufe, selbstverwaltung };
}

/** Stufe (0–2) eines Rollen-Kontexts für ein Recht; Backoffice-Rollen gedeckelt auf die Stufe im Bereich „eg“ */
export function egStufe(kontext, recht) {
  const z = EG_RECHTE[recht]?.rollen;
  if (!z || !kontext) return 0;
  const aus = (kontext.rollen || []).reduce((m, r) => Math.max(m, BACKOFFICE_ROLLEN.includes(r) ? Math.min(z[r] || 0, kontext.backofficeStufe || 0) : z[r] || 0), 0);
  if (recht === "abrechnung_versand" && kontext.selbstverwaltung && (kontext.rollen || []).some((r) => SELBST_VERSAND.includes(r))) return 2;
  return BACKOFFICE_PFLEGE.includes(recht) ? Math.max(aus, kontext.backofficeStufe || 0) : aus;
}
export const egDarf = (kontext, recht, stufe = 1) => egStufe(kontext, recht) >= stufe;

/** Alle Rechte eines Kontexts als { recht: stufe } (für Seiten: Knöpfe ein-/ausblenden – geprüft wird serverseitig) */
export const egRechteVon = (kontext) => Object.fromEntries(EG_RECHTE_IDS.map((r) => [r, egStufe(kontext, r)]));

/** Organ-Einstieg: hat das Konto eine Organ-Rolle (Vorstand, Kassier, Schriftführung, Rechnungsprüfung)? */
export const istOrgan = (kontext) => (kontext?.rollen || []).some((r) => EG_TEAMROLLEN[r]?.art === "organ");
