// src/lib/plattform/eg/vorlagen/index.js
//
// WP5 – Verzeichnis aller Dokumentvorlagen (reine Daten). Rendern: eg/vertraege.js vorlageRendern(). Export für Python:
// node scripts/eg-gruendung-export.mjs (schreibt plattform/eg_gruendung_daten.json; Prüfung mit --pruefen).

import { STATUTEN_EGEN, STATUTEN_VEREIN } from "./statuten.js";
import { BEITRITT, DATENSCHUTZ, ERZEUGERVERTRAG, PACHTVERTRAG, TEILNAHMEVERTRAG } from "./mitglied.js";
import { AGB, INFORMATIONSBLATT } from "./lieferant.js";
import { AVV, GRUENDUNGSAUFTRAG, ORGANISATOR_ANZEIGE, VOLLMACHT_ORGANISATOR } from "./organisator.js";
import { ELWG_NACHTRAG, GRUENDUNGSPROTOKOLL, MITGLIEDERINFO_WECHSEL } from "./verein.js";

const LISTE = [
  STATUTEN_VEREIN, STATUTEN_EGEN, GRUENDUNGSPROTOKOLL, BEITRITT, TEILNAHMEVERTRAG, ERZEUGERVERTRAG, DATENSCHUTZ, PACHTVERTRAG,
  AGB, INFORMATIONSBLATT, VOLLMACHT_ORGANISATOR, ORGANISATOR_ANZEIGE, AVV, GRUENDUNGSAUFTRAG, MITGLIEDERINFO_WECHSEL, ELWG_NACHTRAG,
];

/** { id: vorlage } */
export const VORLAGEN = Object.fromEntries(LISTE.map((v) => [v.id, v]));
export const VORLAGEN_IDS = LISTE.map((v) => v.id);
/** Gruppen für die Auswahl im Portal */
export const VORLAGEN_GRUPPEN = { statuten: "Statuten und Gründung", verein: "Vereinsorganisation", mitglied: "Verträge mit Mitgliedern", lieferant: "Lieferantenpflichten (§ 69 ElWG)", organisator: "Organisator und Datenschutz", auftrag: "Auftrag", wechsel: "Wechsel und ElWG-Anpassung" };
