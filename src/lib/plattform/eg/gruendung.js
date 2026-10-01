// src/lib/plattform/eg/gruendung.js
//
// WP5 – Gründungsdienstleistung (Fachkonzept 2.3, 3.15, 6.2 Punkt 2): Pakete, Auftrag, Angebot, Schrittvorlage je Modell
// und Rechtsform mit Fristen und Nachweisen, Wirkung erledigter Schritte auf die Gemeinschaft (über WP1-Operationen),
// Formular-Ausfüllhilfen (Vereinsbehörde, Verf 15a/15/26, U 12/U 15, ElAbg, ebUtilities, Betreibervertrag je Netzbetreiber,
// EDA-Zugang) und Prüfung „EDA-bereit“. Wechsel-Schritte stehen ebenfalls hier (Assistent: eg/wechsel.js).
// Reine Funktionen; Python-Spiegel plattform/eg_gruendung_kern.py (Testvektoren eg/testdaten/gruendung/*.json).
// Unsichere Angaben sind mit (zu bestätigen) gekennzeichnet; Dauern ohne Rechtsgrundlage sind Planwerte.

import { EDA_ANBINDUNGEN, EG_MODELLE, GEMEINSCHAFT_STATUS, RECHTSFORMEN, ZONELEVEL } from "./modell.js";
import { gemeinschaftsIdPruefen, marktpartnerIdPruefen } from "./zaehlpunkt.js";
import { uidPruefen } from "./stamm.js";
import { iban as ibanPruefen } from "../mitglied/basis.js";

export const GR_STAND = "2026-10-01";
export const UST_SATZ_PCT = 20;

// ---------------------------------------------------------------- Pakete, Status

export const GR_PAKETE = {
  check: {
    label: "Machbarkeits-Check",
    text: "Lohnt sich eine Gemeinschaft, welches Modell und welche Rechtsform passen? Mit Netzgebiets- und Nahebereichs-Check, Simulation und Förder-Check.",
    leistungen: ["Interessentenliste und Netzgebiets- bzw. Nahebereichs-Check", "Simulation mit Lastprofilen (Eigendeckung, Ersparnis je Teilnehmer)", "Empfehlung zu Modell, Nahebereich und Rechtsform", "Förder-Check mit Quellen", "Machbarkeitsbericht (PDF)"],
  },
  gruendung: {
    label: "Gründung bis EDA-bereit",
    text: "Vom Konzept bis zum Vertrag mit dem Netzbetreiber: Statuten, Gründungsversammlung, Behördenwege, Marktpartner, EDA-Zugang – mit Fristenwecker.",
    leistungen: ["alle Leistungen des Machbarkeits-Checks", "Statuten und Verträge aus Mustern (zur Prüfung)", "Gründungsversammlung mit Einladung, Protokoll und Wahl der Organe", "Behördenwege mit Ausfüllhilfen (Vereinsbehörde bzw. Firmenbuch, Finanzamt)", "Registrierung als Marktpartner (ebUtilities)", "Vertrag mit dem Netzbetreiber und Gemeinschafts-ID", "EDA-Zugang", "Fristenüberwachung bis „EDA-bereit“"],
  },
  komplett: {
    label: "Gründung komplett mit erstem Betriebsjahr",
    text: "Wie „Gründung“, zusätzlich Mitgliederaufnahme, Erstanmeldung der Zählpunkte, Lieferantenpflichten und das erste Betriebsjahr mit ÖkoInvest als Organisator.",
    leistungen: ["alle Leistungen der Gründung", "Online-Beitritt mit Verträgen und Signatur", "Erstanmeldung der Zählpunkte und Begleitung der Zustimmungen im Netzbetreiber-Portal", "Lieferantenpflichten nach § 69 ElWG, falls die Schwelle überschritten ist", "erste Abrechnung und erstes Betriebsjahr als Organisator (§ 68 Abs. 2 ElWG)"],
  },
  wechsel: {
    label: "Wechsel einer bestehenden Gemeinschaft",
    text: "Ohne Ab- und Neuanmeldung der Zählpunkte: Mandat, Übernahme der EDA-Rolle, Import aus dem bisherigen System, Kontrollabrechnung, Stichtag, ElWG-Anpassung.",
    leistungen: ["Mandat, Organisator-Bestellung und Anzeige an den Netzbetreiber", "Übernahme der EDA-Rolle ohne Neuanmeldung (Consent-IDs bleiben)", "Import aus dem bisherigen System mit Plausibilitätsprüfung", "Abgleich mit der Zählpunktliste des Netzbetreibers (EC_PODLIST)", "Parallellauf und Probe- bzw. Kontrollabrechnung", "Umstellungsplan mit Stichtag und Saldovortrag", "Mitgliederinformation und ElWG-Anpassung der Verträge"],
  },
};

/** Auftragsstatus (Fachkonzept 3.15, für den Wechsel um eigene Abschnitte ergänzt); `rang` = Reihenfolge */
export const GR_STATUS = {
  anfrage: { label: "Anfrage", ton: "neutral", rang: 0 },
  angebot: { label: "Angebot liegt vor", ton: "info", rang: 1 },
  beauftragt: { label: "Beauftragt", ton: "info", rang: 2 },
  machbarkeit: { label: "Machbarkeit", ton: "warn", rang: 3 },
  rechtsform_statuten: { label: "Rechtsform und Statuten", ton: "warn", rang: 4 },
  konstituierung: { label: "Gründungsversammlung und Organe", ton: "warn", rang: 5 },
  behoerde: { label: "Vereinsbehörde bzw. Firmenbuch", ton: "warn", rang: 6 },
  finanzamt_bank: { label: "Finanzamt und Bank", ton: "warn", rang: 7 },
  marktpartner: { label: "Marktpartner (ebUtilities)", ton: "warn", rang: 8 },
  nb_vertrag: { label: "Vertrag mit dem Netzbetreiber", ton: "warn", rang: 9 },
  eda: { label: "EDA-Zugang und Verträge", ton: "warn", rang: 10 },
  mitgliederaufnahme: { label: "Mitgliederaufnahme und Erstanmeldung", ton: "warn", rang: 11 },
  wechsel_mandat: { label: "Wechsel: Mandat und EDA-Rolle", ton: "warn", rang: 12 },
  wechsel_daten: { label: "Wechsel: Datenübernahme und Abgleich", ton: "warn", rang: 13 },
  wechsel_parallel: { label: "Wechsel: Parallellauf und Kontrollabrechnung", ton: "warn", rang: 14 },
  wechsel_umstellung: { label: "Wechsel: Umstellung zum Stichtag", ton: "warn", rang: 15 },
  betriebsbereit: { label: "Betriebsbereit", ton: "ok", rang: 16 },
  uebergeben: { label: "Übergeben", ton: "ok", rang: 17 },
  abgebrochen: { label: "Abgebrochen", ton: "neutral", rang: 18 },
};
export const GR_AKTIV = ["beauftragt", "machbarkeit", "rechtsform_statuten", "konstituierung", "behoerde", "finanzamt_bank", "marktpartner", "nb_vertrag", "eda", "mitgliederaufnahme", "wechsel_mandat", "wechsel_daten", "wechsel_parallel", "wechsel_umstellung", "betriebsbereit"];

export const SCHRITT_STATUS = {
  offen: { label: "Offen", ton: "neutral" },
  in_arbeit: { label: "In Arbeit", ton: "info" },
  wartet_extern: { label: "Wartet auf Behörde bzw. Netzbetreiber", ton: "warn" },
  erledigt: { label: "Erledigt", ton: "ok" },
  entfaellt: { label: "Entfällt", ton: "neutral" },
};
export const SCHRITT_FERTIG = ["erledigt", "entfaellt"];
export const ZUSTAENDIG = { oekoinvest: "ÖkoInvest", auftraggeber: "Auftraggeber bzw. Vorstand", behoerde: "Behörde bzw. Netzbetreiber" };
export const PHASEN = { konzept: "Phase 1 – Konzept", gruendung: "Phase 2 – Gründung", realisierung: "Phase 3 – Realisierung (EDA)", betrieb: "Phase 4 – Betrieb" }; // HA II 1

// ---------------------------------------------------------------- Schrittvorlage

/**
 * Schritte. `nur`: Einschränkung auf modelle | rechtsformen | pakete | wenn (Merkmal aus schrittMerkmale) | rechtsperson.
 * Frist: `frist: { art: "auftrag"|"nach"|"start"|"stichtag", tage, nach?: [schluessel] }` – „start“ ab Beginn des Schritts.
 * `pflichtFuer`: Pakete, in denen der Schritt Pflicht ist (sonst optional). `feld`: Gemeinschaftsfeld, das beim Erledigen
 * gesetzt wird; `statusZiel`: Lebenszyklus der Gemeinschaft (WP1); `ereignis`: Ereignis an WP2.
 */
const P_ALLE = ["check", "gruendung", "komplett"];
const P_GR = ["gruendung", "komplett"];
export const GR_SCHRITTE = [
  { s: "interessenten", label: "Interessentenliste und Auftaktgespräch", abschnitt: "machbarkeit", phase: "konzept", zustaendig: "auftraggeber", pakete: P_ALLE, pflichtFuer: P_ALLE, frist: { art: "auftrag", tage: 21 }, nachweis: "Liste mit Name, PLZ, Rolle (Verbraucher/Erzeuger) und Einwilligung", quelle: "Fachkonzept 2.1; DSGVO Art. 6 Abs. 1 lit. a" },
  { s: "nb_auskunft", label: "Netzbetreiber-Auskunft zum Nahebereich", abschnitt: "machbarkeit", phase: "konzept", zustaendig: "oekoinvest", pakete: P_ALLE, pflichtFuer: P_ALLE, frist: { art: "start", tage: 14 }, nachweis: "Auskunft Trafostation bzw. Umspannwerk (Nahebereichs-ID)", quelle: "ElWG § 70 Abs. 6 (Auskunft binnen 14 Tagen)", text: "Netzgebiet über PLZ-Liste und Ziffern 3–8 der Zählpunktnummer; Netzbetreiber muss binnen 14 Tagen Auskunft geben." },
  { s: "smart_meter", label: "Smart-Meter-Check der Zählpunkte", abschnitt: "machbarkeit", phase: "konzept", zustaendig: "auftraggeber", pakete: P_ALLE, pflichtFuer: P_ALLE, frist: { art: "auftrag", tage: 45 }, nachweis: "Liste der Zählpunkte mit Viertelstundenwerten bzw. Einbauanträge", quelle: "HA II 5.1.1 (Einbau bis zu 2 Monate, zu bestätigen)" },
  { s: "simulation", label: "Simulation (Eigendeckung, Ersparnis je Teilnehmer)", abschnitt: "machbarkeit", phase: "konzept", zustaendig: "oekoinvest", pakete: P_ALLE, pflichtFuer: P_ALLE, frist: { art: "auftrag", tage: 30 }, hilfe: "simulation", quelle: "Fachkonzept 2.2, 4.7 (WP3)" },
  { s: "foerdercheck", label: "Förder-Check", abschnitt: "machbarkeit", phase: "konzept", zustaendig: "oekoinvest", pakete: P_ALLE, pflichtFuer: ["check"], frist: { art: "auftrag", tage: 30 }, hilfe: "foerdercheck", quelle: "Fachkonzept 6.2 Punkt 7" },
  { s: "machbarkeitsbericht", label: "Machbarkeitsbericht mit Empfehlung", abschnitt: "machbarkeit", phase: "konzept", zustaendig: "oekoinvest", pakete: P_ALLE, pflichtFuer: ["check"], frist: { art: "auftrag", tage: 35 }, nachweis: "Bericht (PDF)", quelle: "Fachkonzept 2.2 Punkt 5" },
  { s: "rechtsform", label: "Rechtsform entscheiden", abschnitt: "rechtsform_statuten", phase: "gruendung", zustaendig: "auftraggeber", pakete: P_ALLE, pflichtFuer: P_GR, nur: { rechtsperson: true }, frist: { art: "auftrag", tage: 42 }, hilfe: "rechtsform", quelle: "VerG 2002; GenG; EAG § 79 Abs. 2" },
  { s: "statuten", label: "Statuten aus der Mustervorlage", abschnitt: "rechtsform_statuten", phase: "gruendung", zustaendig: "oekoinvest", pakete: P_GR, pflichtFuer: P_GR, nur: { rechtsformen: ["verein", "egen"] }, frist: { art: "auftrag", tage: 56 }, vorlage: "statuten", nachweis: "beschlussreife Statuten (Version)", feld: "statutenVersion", quelle: "VerG § 3 Abs. 2; Musterstatuten der Koordinationsstelle" },
  { s: "revisionsverband", label: "Aufnahme in einen Revisionsverband", abschnitt: "rechtsform_statuten", phase: "gruendung", zustaendig: "auftraggeber", pakete: P_GR, pflichtFuer: P_GR, nur: { rechtsformen: ["egen"] }, frist: { art: "auftrag", tage: 70 }, nachweis: "Aufnahmebestätigung des Revisionsverbands", quelle: "GenRevG 1997 (Voraussetzung der Firmenbuch-Eintragung, zu bestätigen)" },
  { s: "gesellschaftsvertrag", label: "Gesellschaftsvertrag (GmbH bzw. OG/KG)", abschnitt: "rechtsform_statuten", phase: "gruendung", zustaendig: "auftraggeber", pakete: P_GR, pflichtFuer: P_GR, nur: { rechtsformen: ["gmbh", "og_kg"] }, frist: { art: "auftrag", tage: 70 }, nachweis: "Gesellschaftsvertrag (GmbH: Notariatsakt)", quelle: "GmbHG § 4; UGB (zu bestätigen)" },
  { s: "gea_vertraege", label: "Vereinbarung der GEA-Teilnehmer", abschnitt: "rechtsform_statuten", phase: "gruendung", zustaendig: "oekoinvest", pakete: P_GR, pflichtFuer: P_GR, nur: { modelle: ["gea"] }, frist: { art: "auftrag", tage: 56 }, nachweis: "Vereinbarung über Aufteilung, Betrieb und Kosten (Muster GEA der Koordinationsstelle)", quelle: "ElWG §§ 68, 70 Abs. 6 Z 1; Koordinationsstelle GEA-Musterverträge" },
  { s: "p2p_vertrag", label: "P2P- bzw. Eigenversorgungsvertrag", abschnitt: "rechtsform_statuten", phase: "gruendung", zustaendig: "oekoinvest", pakete: P_GR, pflichtFuer: P_GR, nur: { modelle: ["p2p", "eigenversorgung"] }, frist: { art: "auftrag", tage: 30 }, nachweis: "Vertrag nach dem P2P-Vertragsmuster der Koordinationsstelle", quelle: "ElWG § 65 Abs. 2, § 68 Abs. 1" },
  { s: "gruendungsversammlung", label: "Gründungsversammlung (Statuten, Wahl der Organe)", abschnitt: "konstituierung", phase: "gruendung", zustaendig: "auftraggeber", pakete: P_GR, pflichtFuer: P_GR, nur: { rechtsformen: ["verein", "egen", "gmbh", "og_kg"] }, frist: { art: "auftrag", tage: 70 }, vorlage: "gruendungsprotokoll", nachweis: "Protokoll mit Beschluss der Statuten und Wahl der Organe", quelle: "VerG §§ 2, 11; GenG § 5" },
  { s: "organe", label: "Organe erfasst und vollständig", abschnitt: "konstituierung", phase: "gruendung", zustaendig: "oekoinvest", pakete: P_GR, pflichtFuer: P_GR, nur: { rechtsperson: true }, frist: { art: "nach", nach: ["gruendungsversammlung"], tage: 7 }, hilfe: "organe", quelle: "VerG §§ 5, 21; GenG (zu bestätigen)" },
  { s: "vereinsanzeige", label: "Errichtungsanzeige bei der Vereinsbehörde", abschnitt: "behoerde", phase: "gruendung", zustaendig: "auftraggeber", pakete: P_GR, pflichtFuer: P_GR, nur: { rechtsformen: ["verein"] }, frist: { art: "nach", nach: ["gruendungsversammlung"], tage: 7 }, hilfe: "vereinsanzeige", nachweis: "Eingangsbestätigung der Vereinsbehörde", quelle: "VerG § 11" },
  { s: "zvr", label: "Verein entstanden – ZVR-Zahl erhalten", abschnitt: "behoerde", phase: "gruendung", zustaendig: "behoerde", pakete: P_GR, pflichtFuer: P_GR, nur: { rechtsformen: ["verein"] }, frist: { art: "nach", nach: ["vereinsanzeige"], tage: 28 }, feld: "zvrZahl", statusZiel: "rechtsperson", nachweis: "Auszug aus dem Vereinsregister", quelle: "VerG § 13 (4 Wochen, verlängerbar auf 6 Wochen)" },
  { s: "firmenbuch", label: "Eintragung im Firmenbuch – FN erhalten", abschnitt: "behoerde", phase: "gruendung", zustaendig: "auftraggeber", pakete: P_GR, pflichtFuer: P_GR, nur: { rechtsformen: ["egen", "gmbh", "og_kg"] }, frist: { art: "nach", nach: ["gruendungsversammlung"], tage: 42 }, feld: "firmenbuchnummer", statusZiel: "rechtsperson", nachweis: "Firmenbuchauszug", quelle: "GenG; GmbHG; UGB (Planwert)" },
  { s: "bank", label: "Bankkonto auf die Rechtsperson", abschnitt: "finanzamt_bank", phase: "gruendung", zustaendig: "auftraggeber", pakete: P_GR, pflichtFuer: P_GR, nur: { rechtsperson: true }, frist: { art: "nach", nach: ["zvr", "firmenbuch"], tage: 14 }, feld: "iban", quelle: "Fachkonzept 2.3" },
  { s: "creditor_id", label: "SEPA-Gläubiger-ID (für Lastschriften)", abschnitt: "finanzamt_bank", phase: "gruendung", zustaendig: "auftraggeber", pakete: P_GR, pflichtFuer: [], nur: { rechtsperson: true }, frist: { art: "nach", nach: ["bank"], tage: 21 }, feld: "creditorId", quelle: "Fachkonzept 2.3 (Antrag bei der OeNB)" },
  { s: "finanzamt", label: "Meldung beim Finanzamt (Verf 15a bzw. Verf 15 und Verf 26)", abschnitt: "finanzamt_bank", phase: "gruendung", zustaendig: "auftraggeber", pakete: P_GR, pflichtFuer: P_GR, nur: { rechtsperson: true }, frist: { art: "nach", nach: ["zvr", "firmenbuch"], tage: 30 }, hilfe: "finanzamt", feld: "steuernummer", nachweis: "Steuernummer bzw. Bestätigung des Finanzamts", quelle: "EEG-Ratgeber Steuern & Abgaben (binnen 1 Monat nach Beginn)" },
  { s: "ust_option", label: "Umsatzsteuer: Option U 12 bzw. UID (U 15)", abschnitt: "finanzamt_bank", phase: "gruendung", zustaendig: "auftraggeber", pakete: P_GR, pflichtFuer: [], nur: { rechtsperson: true }, frist: { art: "nach", nach: ["finanzamt"], tage: 14 }, hilfe: "ust", feld: "uid", quelle: "UStG § 6 Abs. 3 (Verzicht, 5 Jahre bindend); EEG-Ratgeber Steuern (nur nach Steuerberatung)" },
  { s: "ebutilities", label: "Registrierung als Marktpartner (ebUtilities)", abschnitt: "marktpartner", phase: "realisierung", zustaendig: "oekoinvest", pakete: P_GR, pflichtFuer: P_GR, nur: { modelle: ["eeg", "beg", "gea"] }, frist: { art: "nach", nach: ["zvr", "firmenbuch", "gea_vertraege"], tage: 14 }, hilfe: "ebutilities", feld: "marktpartnerId", statusZiel: "marktpartner", nachweis: "Bestätigung mit Marktpartner-ID", quelle: "HA II 11; Koordinationsstelle Schritt 4" },
  { s: "organisator_vollmacht", label: "Organisator bestellen (Vollmacht, Dienstleistungs- und AV-Vertrag)", abschnitt: "marktpartner", phase: "realisierung", zustaendig: "auftraggeber", pakete: P_GR, pflichtFuer: P_GR, nur: { wenn: "organisator" }, frist: { art: "nach", nach: ["gruendungsversammlung", "p2p_vertrag", "gea_vertraege"], tage: 14 }, vorlage: "vollmacht_organisator", nachweis: "unterzeichnete Vollmacht und AVV (Art. 28 DSGVO)", quelle: "ElWG § 68 Abs. 2; DSGVO Art. 28" },
  { s: "betreibervertrag", label: "Vertrag mit dem Netzbetreiber – Gemeinschafts-ID", abschnitt: "nb_vertrag", phase: "realisierung", zustaendig: "oekoinvest", pakete: P_GR, pflichtFuer: P_GR, frist: { art: "nach", nach: ["ebutilities", "p2p_vertrag"], tage: 30 }, hilfe: "betreibervertrag", feld: "gemeinschaftsId", statusZiel: "vertrag_nb", nachweis: "unterzeichneter Betreibervertrag", quelle: "HA II 7.1; Koordinationsstelle Schritt 5 (BEG: Gemeinschafts-ID über ebUtilities)" },
  { s: "organisator_anzeige", label: "Anzeige des Organisators an den Netzbetreiber", abschnitt: "nb_vertrag", phase: "realisierung", zustaendig: "oekoinvest", pakete: P_GR, pflichtFuer: P_GR, nur: { wenn: "organisator" }, frist: { art: "nach", nach: ["betreibervertrag"], tage: 7 }, vorlage: "organisator_anzeige", nachweis: "Eingangsbestätigung des Netzbetreibers", quelle: "ElWG § 68 Abs. 2 letzter Satz, § 70 Abs. 2" },
  { s: "eda_zugang", label: "Zugang zur EDA-Plattform", abschnitt: "eda", phase: "realisierung", zustaendig: "oekoinvest", pakete: P_GR, pflichtFuer: P_GR, frist: { art: "nach", nach: ["ebutilities", "betreibervertrag"], tage: 21 }, hilfe: "eda_zugang", feld: "edaAnbindung", quelle: "HA II 6, 11; Koordinationsstelle Schritt 6" },
  { s: "vertraege", label: "Verträge, Preisblatt und Tarifbeschluss", abschnitt: "eda", phase: "realisierung", zustaendig: "oekoinvest", pakete: P_GR, pflichtFuer: P_GR, frist: { art: "nach", nach: ["statuten", "gea_vertraege", "p2p_vertrag"], tage: 30 }, vorlage: "teilnahmevertrag", nachweis: "Vertragsmuster und beschlossener Tarif", quelle: "Fachkonzept 2.4 Punkt 2" },
  { s: "lieferantenpflichten", label: "AGB und Informationsblatt (§ 69 ElWG)", abschnitt: "eda", phase: "realisierung", zustaendig: "oekoinvest", pakete: P_GR, pflichtFuer: P_GR, nur: { wenn: "lieferantenpflicht" }, frist: { art: "nach", nach: ["vertraege"], tage: 7 }, vorlage: "agb", quelle: "ElWG § 69 Abs. 1 Z 1–2" },
  { s: "datenschutz", label: "Datenschutz: Verzeichnis, Information, AVV", abschnitt: "eda", phase: "realisierung", zustaendig: "oekoinvest", pakete: P_GR, pflichtFuer: P_GR, frist: { art: "nach", nach: ["vertraege"], tage: 7 }, vorlage: "datenschutz", quelle: "DSGVO Art. 13, 28, 30" },
  { s: "eda_bereit", label: "Gemeinschaft EDA-bereit – Start der Anmeldungen", abschnitt: "eda", phase: "realisierung", zustaendig: "oekoinvest", pakete: P_GR, pflichtFuer: P_GR, frist: { art: "nach", nach: ["betreibervertrag"], tage: 14 }, statusZiel: "eda_bereit", ereignis: "eg.gemeinschaft.eda_bereit", hilfe: "eda_bereit", quelle: "Fachkonzept 8 (WP5 → WP2)" },
  { s: "mitgliederaufnahme", label: "Mitgliederaufnahme (Online-Beitritt, Verträge)", abschnitt: "mitgliederaufnahme", phase: "betrieb", zustaendig: "oekoinvest", pakete: ["komplett"], pflichtFuer: ["komplett"], frist: { art: "nach", nach: ["eda_bereit"], tage: 30 }, quelle: "Fachkonzept 2.4" },
  { s: "erstanmeldung", label: "Erstanmeldung der Zählpunkte und Zustimmungen", abschnitt: "mitgliederaufnahme", phase: "betrieb", zustaendig: "oekoinvest", pakete: ["komplett"], pflichtFuer: ["komplett"], frist: { art: "nach", nach: ["eda_bereit"], tage: 30 }, quelle: "Fachkonzept 2.4 Punkte 3–5 (EC_REQ_ONL, Zustimmung binnen 30 Tagen)" },
  { s: "elabg_meldung", label: "Meldung zur Elektrizitätsabgabe-Befreiung", abschnitt: "mitgliederaufnahme", phase: "betrieb", zustaendig: "auftraggeber", pakete: P_GR, pflichtFuer: ["komplett"], nur: { wenn: "elabg" }, frist: { art: "nach", nach: ["erstanmeldung"], tage: 28 }, hilfe: "elabg", quelle: "EEG-Ratgeber Steuern (binnen 4 Wochen nach Inbetriebnahme); Eigenstrombefreiungsverordnung" },
  { s: "erste_abrechnung", label: "Erste Abrechnung", abschnitt: "betriebsbereit", phase: "betrieb", zustaendig: "oekoinvest", pakete: ["komplett"], pflichtFuer: ["komplett"], frist: { art: "nach", nach: ["erstanmeldung"], tage: 50 }, quelle: "Koordinationsstelle Schritt 7 (frühestens ab dem 20. des Folgemonats)" },
  { s: "uebergabe", label: "Übergabe und Einweisung der Organe", abschnitt: "betriebsbereit", phase: "betrieb", zustaendig: "oekoinvest", pakete: P_ALLE, pflichtFuer: P_ALLE, frist: { art: "nach", nach: ["erste_abrechnung", "eda_bereit", "machbarkeitsbericht"], tage: 14 }, quelle: "Fachkonzept 3.15" },
];

/** Wechsel einer bestehenden Gemeinschaft (Fachkonzept 2.6); Fristen relativ zum Stichtag (erster Monat bei ÖkoInvest) */
export const WECHSEL_SCHRITTE = [
  { s: "mandat_beschluss", label: "Vorstandsbeschluss über den Wechsel", abschnitt: "wechsel_mandat", zustaendig: "auftraggeber", frist: { art: "stichtag", tage: -56 }, nachweis: "Beschluss (Beschlussregister)", quelle: "Fachkonzept 2.6 Punkt 1" },
  { s: "dl_vertrag_avv", label: "Dienstleistungs- und Auftragsverarbeitungsvertrag", abschnitt: "wechsel_mandat", zustaendig: "auftraggeber", frist: { art: "stichtag", tage: -49 }, vorlage: "avv", nachweis: "unterzeichnete Verträge", quelle: "DSGVO Art. 28; Fachkonzept 2.6 Punkt 1" },
  { s: "organisator_vollmacht", label: "Organisator bestellen (Vollmacht)", abschnitt: "wechsel_mandat", zustaendig: "auftraggeber", frist: { art: "stichtag", tage: -49 }, vorlage: "vollmacht_organisator", quelle: "ElWG § 68 Abs. 2" },
  { s: "eda_bevollmaechtigung", label: "Übernahme der EDA-Rolle (Portal-Benutzer bzw. Plattformvertrag)", abschnitt: "wechsel_mandat", zustaendig: "oekoinvest", frist: { art: "stichtag", tage: -35 }, feld: "edaAnbindung", text: "Die Marktpartner-ID bleibt bei der Gemeinschaft. ÖkoInvest erhält einen Benutzer im EDA-Anwenderportal der Gemeinschaft oder eine Bevollmächtigung im EDA-Plattformvertrag. Keine Ab- und Neuanmeldung der Zählpunkte.", quelle: "Fachkonzept 2.6 Punkt 2; HA II 6, 11" },
  { s: "organisator_anzeige", label: "Anzeige des Organisators an den Netzbetreiber", abschnitt: "wechsel_mandat", zustaendig: "oekoinvest", frist: { art: "stichtag", tage: -35 }, vorlage: "organisator_anzeige", quelle: "ElWG § 68 Abs. 2, § 70 Abs. 2" },
  { s: "altdienstleister", label: "Bisherigen Dienstleister kündigen bzw. austragen", abschnitt: "wechsel_mandat", zustaendig: "auftraggeber", frist: { art: "stichtag", tage: -42 }, nachweis: "Kündigung bzw. Widerruf der Bevollmächtigung", quelle: "Fachkonzept 2.6 Punkt 2" },
  { s: "datenexport", label: "Datenexport aus dem bisherigen System", abschnitt: "wechsel_daten", zustaendig: "auftraggeber", frist: { art: "stichtag", tage: -35 }, nachweis: "CSV- bzw. Excel-Export (Mitglieder, Zählpunkte, Tarife, offene Posten)", quelle: "Fachkonzept 2.6 Punkt 3" },
  { s: "import", label: "Import mit Spaltenzuordnung und Plausibilitätsprüfung", abschnitt: "wechsel_daten", zustaendig: "oekoinvest", frist: { art: "stichtag", tage: -28 }, hilfe: "import", quelle: "Fachkonzept 2.6 Punkt 3" },
  { s: "podlist", label: "Abgleich mit dem Netzbetreiber (EC_PODLIST)", abschnitt: "wechsel_daten", zustaendig: "oekoinvest", frist: { art: "stichtag", tage: -21 }, text: "Ist (Zählpunktliste des Netzbetreibers) gegen Soll (Import): Consent-IDs, Teilnahmefaktor, Verteilmodell. Altzuordnungen vor 03.10.2022 haben die Consent-ID „Migration“.", quelle: "Fachkonzept 2.6 Punkt 3; HA II 5.5, 7.2" },
  { s: "elwg_anpassung", label: "ElWG-Anpassung der Statuten und Verträge", abschnitt: "wechsel_daten", zustaendig: "oekoinvest", frist: { art: "stichtag", tage: 0 }, vorlage: "elwg_nachtrag", text: "Pflichtschritt bis zum Stichtag: Statuten und Verträge auf §§ 65–72 ElWG umstellen (Mustervorlagen), § 69-Schwelle prüfen, Organisator-Anzeige, Nahebereichs-ID im Betreibervertrag.", quelle: "Fachkonzept 2.6 Punkt 6; ElWG §§ 188, 189 Abs. 17" },
  { s: "lieferantenpflichten", label: "AGB und Informationsblatt (§ 69 ElWG)", abschnitt: "wechsel_daten", zustaendig: "oekoinvest", nur: { wenn: "lieferantenpflicht" }, frist: { art: "stichtag", tage: 0 }, vorlage: "agb", quelle: "ElWG § 69" },
  { s: "mitgliederinfo", label: "Mitglieder informieren", abschnitt: "wechsel_parallel", zustaendig: "oekoinvest", frist: { art: "stichtag", tage: -28 }, vorlage: "mitgliederinfo_wechsel", quelle: "Fachkonzept 2.6; Marktanalyse 5 Punkt 11" },
  { s: "parallellauf", label: "Parallellauf über einen Monat (Abweichungsbericht)", abschnitt: "wechsel_parallel", zustaendig: "oekoinvest", frist: { art: "stichtag", tage: -3 }, text: "Eigene Zuteilung gegen die Netzbetreiber-Werte vergleichen (WP3, Abweichungsbericht).", quelle: "Fachkonzept 2.6 Punkt 5" },
  { s: "probeabrechnung", label: "Probe- bzw. Kontrollabrechnung", abschnitt: "wechsel_parallel", zustaendig: "oekoinvest", frist: { art: "stichtag", tage: -7 }, hilfe: "probeabrechnung", text: "Abrechnung des letzten Monats beim Altdienstleister nachrechnen (WP4) und zeilengenau vergleichen.", quelle: "Marktanalyse 5 Punkt 11" },
  { s: "stichtag", label: "Umstellung zum Stichtag", abschnitt: "wechsel_umstellung", zustaendig: "oekoinvest", frist: { art: "stichtag", tage: 0 }, text: "Abrechnungen bis Monat M beim Altdienstleister, ab M+1 bei ÖkoInvest.", quelle: "Fachkonzept 2.6 Punkt 4" },
  { s: "saldovortrag", label: "Saldovortrag offener Posten", abschnitt: "wechsel_umstellung", zustaendig: "oekoinvest", frist: { art: "stichtag", tage: 14 }, quelle: "Fachkonzept 2.6 Punkt 4" },
  { s: "nummernkreis", label: "Nummernkreis der Belege festlegen", abschnitt: "wechsel_umstellung", zustaendig: "oekoinvest", frist: { art: "stichtag", tage: -7 }, text: "Neu oder fortgeführt – fortlaufend je Aussteller (UStG § 11, zu bestätigen).", quelle: "Fachkonzept 2.6 Punkt 4" },
  { s: "uebergabe", label: "Abschluss des Wechsels", abschnitt: "betriebsbereit", zustaendig: "oekoinvest", frist: { art: "stichtag", tage: 30 }, quelle: "Fachkonzept 2.6" },
].map((x) => ({ phase: "betrieb", pakete: ["wechsel"], pflichtFuer: ["wechsel"], ...x }));

// ---------------------------------------------------------------- Auftrag

const txt = (v, max = 200) => (v === undefined || v === null || typeof v === "object" ? "" : String(v).replace(/\s+/g, " ").trim().slice(0, max));
const mehr = (v, max = 2000) => (v === undefined || v === null || typeof v === "object" ? "" : String(v).replace(/\r\n?/g, "\n").trim().slice(0, max));
/** Kalenderdatum JJJJ-MM-TT gültig (kein Überlauf wie 31.02.) */
export function datumGueltig(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ""));
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}
const istDatum = datumGueltig;
const datum = (v) => (istDatum(v) ? String(v) : "");
const zahl = (v, min, max) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 100) / 100 : null;
};
const fehler = (text, feld = "") => Object.assign(new Error(text), { status: 422, feld });
const konflikt = (text) => Object.assign(new Error(text), { status: 409 });
const wahr = (v) => v === true || v === "true" || v === "ja" || v === 1;

export const BUNDESLAENDER_GR = { W: "Wien", N: "Niederösterreich", O: "Oberösterreich", S: "Salzburg", T: "Tirol", V: "Vorarlberg", K: "Kärnten", St: "Steiermark", B: "Burgenland" };
export const ALTDIENSTLEISTER = { energiedigital: "energiedigital", eegfaktura: "EEG Faktura", egon: "EGON", eda_portal: "EDA-Anwenderportal / Excel-Tool", sonstige: "anderer Anbieter" };
/** Zonelevel-Vorschlag je Modell (Fachkonzept 1.2/1.3) */
export const ZONELEVEL_STANDARD = { eeg: 3, beg: 6, gea: 1, p2p: 3, eigenversorgung: 3 };

/** Stammdaten der Gemeinschaft aus dem Auftrag (Eingabe für WP1 egGemeinschaftSpeichern; Demo- und Frappe-Adapter) */
export function gemeinschaftAusAuftrag(a, extra = {}) {
  const b = a.bestehend || {};
  return {
    name: extra.name || b.name || a.arbeitsname, kurzname: extra.kurzname || "", modell: a.modell, zonelevel: a.zonelevel || ZONELEVEL_STANDARD[a.modell], rechtsform: a.rechtsform,
    sitzAdresse: { strasse: extra.strasse || "", plz: a.plz, ort: a.ort }, email: extra.email || a.ansprechpartner?.email || "", netzbetreiber: extra.netzbetreiber?.length ? extra.netzbetreiber : a.netzbetreiberId ? [a.netzbetreiberId] : [],
    marktpartnerId: b.marktpartnerId || "", gemeinschaftsId: b.gemeinschaftsId || "", verteilmodell: b.verteilmodell || "dynamisch", edaAnbindung: "anwenderportal",
    dienstleistung: { aktiv: false, paket: a.paket, seit: "", avvAm: "" }, gruendungsauftragId: a.id, beschreibung: `Angelegt aus Gründungsauftrag ${a.id} (${GR_PAKETE[a.paket]?.label || a.paket}).`,
  };
}

/**
 * Auftrag bereinigen (Anfrage des Auftraggebers). Wirft 422 mit Feld.
 * @returns {object} bereinigter Auftrag ohne Status/Meta
 */
export function auftragBereinigen(d = {}) {
  const paket = Object.hasOwn(GR_PAKETE, d.paket) ? d.paket : "";
  if (!paket) throw fehler("Bitte wählen Sie ein Paket.", "paket");
  const modell = Object.hasOwn(EG_MODELLE, d.modell) ? d.modell : "eeg";
  const zl = Number(d.zonelevel) || ZONELEVEL_STANDARD[modell];
  if (!ZONELEVEL[zl] || !ZONELEVEL[zl].modelle.includes(modell)) throw fehler(`Zonelevel ${zl} ist für ${EG_MODELLE[modell].kurz} nicht zulässig.`, "zonelevel");
  const rechtsform = Object.hasOwn(RECHTSFORMEN, d.rechtsform) ? d.rechtsform : EG_MODELLE[modell].rechtsperson ? "verein" : "keine";
  if (EG_MODELLE[modell].rechtsperson && rechtsform === "keine") throw fehler(`Eine ${EG_MODELLE[modell].kurz} braucht eine Rechtsperson.`, "rechtsform");
  if (!EG_MODELLE[modell].rechtsperson && rechtsform !== "keine") throw fehler(`Für ${EG_MODELLE[modell].kurz} ist keine eigene Rechtsperson nötig.`, "rechtsform");
  const a = {
    paket, modell, zonelevel: zl, rechtsform,
    arbeitsname: txt(d.arbeitsname, 140),
    plz: /^\d{4}$/.test(String(d.plz || "").trim()) ? String(d.plz).trim() : "",
    ort: txt(d.ort, 80),
    bundesland: Object.hasOwn(BUNDESLAENDER_GR, d.bundesland) ? d.bundesland : "",
    netzbetreiberId: txt(d.netzbetreiberId, 40),
    erwarteteMitglieder: zahl(d.erwarteteMitglieder, 0, 100000) ?? 0,
    erzeugungKwp: zahl(d.erzeugungKwp, 0, 1000000) ?? 0,
    speicherKwh: zahl(d.speicherKwh, 0, 1000000) ?? 0,
    haushaltErzeugung: wahr(d.haushaltErzeugung),
    gemeindeBeteiligt: wahr(d.gemeindeBeteiligt),
    investitionGeplant: wahr(d.investitionGeplant),
    organisator: d.organisator === undefined ? ["komplett", "wechsel"].includes(paket) : wahr(d.organisator),
    zielTermin: datum(d.zielTermin),
    ansprechpartner: { name: txt(d.ansprechpartner?.name, 120), email: txt(d.ansprechpartner?.email, 160).toLowerCase(), telefon: txt(d.ansprechpartner?.telefon, 40) },
    nachricht: mehr(d.nachricht, 2000),
    bestehend: null,
  };
  if (a.arbeitsname.length < 3) throw fehler("Bitte geben Sie einen Arbeitsnamen der Gemeinschaft an (mindestens 3 Zeichen).", "arbeitsname");
  if (!a.plz) throw fehler("Bitte die Postleitzahl (4 Ziffern) angeben – sie bestimmt Netzgebiet und Nahebereich.", "plz");
  if (paket === "wechsel") {
    const b = d.bestehend || {};
    a.bestehend = {
      name: txt(b.name, 140), gemeinschaftsId: txt(b.gemeinschaftsId, 40).toUpperCase().replace(/\s/g, ""), marktpartnerId: txt(b.marktpartnerId, 12).toUpperCase().replace(/\s/g, ""),
      altdienstleister: Object.hasOwn(ALTDIENSTLEISTER, b.altdienstleister) ? b.altdienstleister : "sonstige",
      mitglieder: zahl(b.mitglieder, 0, 100000) ?? 0, zaehlpunkte: zahl(b.zaehlpunkte, 0, 100000) ?? 0,
      letzteAbrechnung: /^20\d\d-(0[1-9]|1[0-2])$/.test(String(b.letzteAbrechnung || "")) ? b.letzteAbrechnung : "",
      verteilmodell: b.verteilmodell === "statisch" ? "statisch" : "dynamisch",
    };
    if (!a.bestehend.name) throw fehler("Bitte den Namen der bestehenden Gemeinschaft angeben.", "bestehend.name");
    if (a.bestehend.marktpartnerId) {
      const mp = marktpartnerIdPruefen(a.bestehend.marktpartnerId, modell);
      if (!mp.ok) throw fehler(mp.fehler, "bestehend.marktpartnerId");
    }
    if (a.bestehend.gemeinschaftsId) {
      const g = gemeinschaftsIdPruefen(a.bestehend.gemeinschaftsId, { modell, marktpartnerId: a.bestehend.marktpartnerId });
      if (!g.ok) throw fehler(g.fehler, "bestehend.gemeinschaftsId");
    }
  }
  return a;
}

/** Hinweise zur Anfrage (Schwellen, Nahebereich, Phasen der Marktprozesse) */
export function auftragHinweise(a, { heute = GR_STAND } = {}) {
  const h = [];
  const kw = Number(a.erzeugungKwp) || 0;
  if (kw > 100 || (a.haushaltErzeugung && kw > 30)) h.push({ stufe: "warn", text: `Erzeugungsleistung ${kw} kW: Lieferantenpflichten nach § 69 ElWG (AGB, Informationsblatt, Rechnungsinhalte) – übernimmt auf Wunsch ÖkoInvest als Organisator.`, quelle: "ElWG § 69, § 68 Abs. 2" });
  if (a.modell === "eeg" && a.gemeindeBeteiligt) h.push({ stufe: "info", text: "Gemeinde mit eigener Anlage: mindestens 10 % der Erzeugung für schutzbedürftige Haushalte (Sozialquote) und fremdübliche Preise beachten.", quelle: "ElWG § 68 Abs. 6; Fachkonzept 4.10" });
  const zl = ZONELEVEL[a.zonelevel];
  if (zl && zl.phase > 1) h.push({ stufe: "warn", text: `Zonelevel ${a.zonelevel} („${zl.label}“) ist erst ab Marktprozess-Phase ${zl.phase} (05.04.2027) möglich (zu bestätigen).`, quelle: "ebUtilities-Konzept 17.04.2026" });
  if (a.modell === "beg") h.push({ stufe: "info", text: "BEG: Netzentgelt-Reduktion bis 31.12.2026 keine; Kontrolle durch natürliche Personen, Gebietskörperschaften und kleine Unternehmen in den Statuten verankern.", quelle: "ElWG § 67 Abs. 3; Fachkonzept 1.2" });
  if (a.paket !== "wechsel") h.push({ stufe: "info", text: `Neu aktivierte Gemeinschaften erhalten ab ${heute < "2026-10-05" ? "05.10.2026" : "sofort"} voraussichtlich nur noch das dynamische Verteilmodell (zu bestätigen).`, quelle: "ebUtilities-Konzept 17.04.2026" });
  if (a.paket === "wechsel" && a.bestehend?.verteilmodell === "statisch") h.push({ stufe: "info", text: "Statisches Verteilmodell im Bestand: Der Wechsel des Dienstleisters ändert das Modell nicht; ein Wechsel auf dynamisch hieße neuer Vertrag, neue Gemeinschafts-ID und Neuanmeldung aller Zählpunkte.", quelle: "HA II 5.6, 8, 9; Fachkonzept 2.5" });
  return h;
}

/** Angebot bereinigen und rechnen (USt 20 %) */
export function angebotBereinigen(d = {}, { heute = GR_STAND, paket = "" } = {}) {
  const netto = zahl(d.betragNetto, 0, 1000000);
  if (netto === null) throw fehler("Bitte das Honorar (netto) angeben.", "betragNetto");
  const tage = zahl(d.gueltigTage, 1, 180);
  const bis = datum(d.gueltigBis) || plusTage(heute, tage ?? 30);
  if (bis < heute) throw fehler("Das Angebot muss mindestens bis heute gültig sein.", "gueltigBis");
  const leistungen = (Array.isArray(d.leistungen) && d.leistungen.length ? d.leistungen : GR_PAKETE[paket]?.leistungen || []).map((x) => txt(x, 200)).filter(Boolean).slice(0, 30);
  const ust = Math.round(netto * UST_SATZ_PCT) / 100;
  return { betragNetto: netto, ustPct: UST_SATZ_PCT, ustEur: ust, betragBrutto: Math.round((netto + ust) * 100) / 100, gueltigBis: bis, leistungen, zahlungsplan: mehr(d.zahlungsplan, 600), hinweise: mehr(d.hinweise, 1200) };
}

// ---------------------------------------------------------------- Datum

export function plusTage(iso, tage) {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.round(Number(tage) || 0));
  return d.toISOString().slice(0, 10);
}
export const tageBis = (von, bis) => Math.round((Date.parse(`${String(bis).slice(0, 10)}T12:00:00Z`) - Date.parse(`${String(von).slice(0, 10)}T12:00:00Z`)) / 864e5);

// ---------------------------------------------------------------- Schritte erzeugen und steuern

/** Merkmale des Auftrags für Bedingungen der Schrittvorlage */
export function schrittMerkmale(a = {}, g = null) {
  const modell = g?.modell || a.modell;
  const kw = Number(g?.kennzahlen?.erzeugungsleistungKw ?? a.erzeugungKwp) || 0;
  return {
    modell, rechtsform: g?.rechtsform || a.rechtsform, paket: a.paket,
    rechtsperson: !!EG_MODELLE[modell]?.rechtsperson,
    organisator: a.organisator === true || !!g?.dienstleistung?.aktiv,
    lieferantenpflicht: !!g?.kennzahlen?.lieferantenpflichten || kw > 100 || (a.haushaltErzeugung === true && kw > 30),
    elabg: ["eeg", "gea"].includes(modell),
  };
}

function schrittPasst(v, m) {
  if (!v.pakete.includes(m.paket)) return false;
  const n = v.nur || {};
  if (n.modelle && !n.modelle.includes(m.modell)) return false;
  if (n.rechtsformen && !n.rechtsformen.includes(m.rechtsform)) return false;
  if (n.rechtsperson && !m.rechtsperson) return false;
  if (n.wenn && !m[n.wenn]) return false;
  return true;
}

/** Vorlage-Definition eines Schritts */
export const schrittDefinition = (schluessel, paket = "") => (paket === "wechsel" ? WECHSEL_SCHRITTE : GR_SCHRITTE).find((x) => x.s === schluessel) || GR_SCHRITTE.find((x) => x.s === schluessel) || WECHSEL_SCHRITTE.find((x) => x.s === schluessel) || null;

/**
 * Schritte für einen Auftrag erzeugen. Bereits vorhandene Schritte (Status, Datum, Wert, Nachweise) bleiben erhalten;
 * neu passende Schritte kommen hinzu, nicht mehr passende offene Schritte entfallen (Status „entfaellt“ mit Begründung).
 */
export function schritteErzeugen(a, { vorhanden = [], gemeinschaft = null } = {}) {
  const m = schrittMerkmale(a, gemeinschaft);
  const liste = a.paket === "wechsel" ? WECHSEL_SCHRITTE : GR_SCHRITTE;
  const alt = new Map(vorhanden.map((x) => [x.schluessel, x]));
  const neu = [];
  liste.forEach((v, i) => {
    const passt = schrittPasst(v, m);
    const x = alt.get(v.s);
    if (!passt) {
      if (x && !SCHRITT_FERTIG.includes(x.status)) neu.push({ ...x, status: "entfaellt", notiz: x.notiz || "Für diese Konstellation nicht erforderlich." });
      else if (x) neu.push(x);
      return;
    }
    neu.push({
      schluessel: v.s, reihenfolge: i + 1, label: v.label, abschnitt: v.abschnitt, phase: v.phase, zustaendig: v.zustaendig, pflicht: v.pflichtFuer.includes(a.paket),
      status: "offen", gestartetAm: "", datum: "", wert: "", notiz: "", nachweise: [], fristManuell: "", vonId: null,
      ...(x || {}),
      reihenfolgeVorlage: i + 1,
    });
  });
  return neu.sort((p, q) => (p.reihenfolgeVorlage || p.reihenfolge || 99) - (q.reihenfolgeVorlage || q.reihenfolge || 99)).map((x, i) => ({ ...x, reihenfolge: i + 1 }));
}

/** Frist eines Schritts (ISO-Datum oder ""), Planwerte ab Auftrag bzw. Vorschritt, gesetzliche Fristen ab Beginn */
export function schrittFrist(x, schritte = [], a = {}) {
  if (x.fristManuell) return x.fristManuell;
  const v = schrittDefinition(x.schluessel, a.paket);
  const f = v?.frist;
  if (!f) return "";
  if (f.art === "auftrag") return a.auftragAm ? plusTage(a.auftragAm, f.tage) : "";
  if (f.art === "start") return x.gestartetAm ? plusTage(x.gestartetAm, f.tage) : "";
  if (f.art === "stichtag") return a.stichtag ? plusTage(a.stichtag, f.tage) : "";
  if (f.art === "nach") {
    for (const k of f.nach || []) {
      const vor = schritte.find((y) => y.schluessel === k && y.status === "erledigt" && y.datum);
      if (vor) return plusTage(vor.datum, f.tage);
    }
  }
  return "";
}

/** Ampel zur Frist: ueberfaellig | bald (≤ 7 Tage) | ok | "" */
export function fristAmpel(frist, heute, status) {
  if (!frist || SCHRITT_FERTIG.includes(status)) return "";
  const t = tageBis(heute, frist);
  return t < 0 ? "ueberfaellig" : t <= 7 ? "bald" : "ok";
}

/** Schritte mit Frist, Ampel und Vorlage-Infos anreichern */
export function schritteAnreichern(schritte = [], a = {}, { heute = GR_STAND } = {}) {
  return schritte.map((x) => {
    const v = schrittDefinition(x.schluessel, a.paket) || {};
    const frist = schrittFrist(x, schritte, a);
    return {
      ...x, frist, ampel: x.pflicht ? fristAmpel(frist, heute, x.status) : "", statusLabel: SCHRITT_STATUS[x.status]?.label || x.status, abschnittLabel: GR_STATUS[x.abschnitt]?.label || x.abschnitt,
      zustaendigLabel: ZUSTAENDIG[x.zustaendig] || x.zustaendig, quelle: v.quelle || "", text: v.text || "", nachweisText: v.nachweis || "", feld: v.feld || "", hilfe: v.hilfe || "", vorlage: v.vorlage || "",
      fristArt: v.frist?.art || "", statusZiel: v.statusZiel || "", ereignis: v.ereignis || "",
    };
  });
}

/** Auftragsstatus aus den Schritten (nach „beauftragt“): erster offener Pflichtschritt, sonst betriebsbereit */
export function auftragStatusAusSchritten(a, schritte = []) {
  if (!GR_AKTIV.includes(a.status)) return a.status;
  const offen = schritte.filter((x) => x.pflicht && !SCHRITT_FERTIG.includes(x.status)).sort((p, q) => p.reihenfolge - q.reihenfolge);
  return offen.length ? offen[0].abschnitt : "betriebsbereit";
}

/** Fortschritt in Prozent der Pflichtschritte und offene Fristen */
export function auftragFortschritt(schritte = [], { heute = GR_STAND, auftrag = {} } = {}) {
  const pflicht = schritte.filter((x) => x.pflicht && x.status !== "entfaellt");
  const fertig = pflicht.filter((x) => x.status === "erledigt").length;
  const reich = schritteAnreichern(schritte, auftrag, { heute });
  return {
    pflicht: pflicht.length, erledigt: fertig, prozent: pflicht.length ? Math.round((fertig / pflicht.length) * 100) : 0,
    ueberfaellig: reich.filter((x) => x.ampel === "ueberfaellig").length, bald: reich.filter((x) => x.ampel === "bald").length,
    naechste: reich.filter((x) => !SCHRITT_FERTIG.includes(x.status)).slice(0, 3).map((x) => ({ schluessel: x.schluessel, label: x.label, frist: x.frist, ampel: x.ampel, zustaendig: x.zustaendig })),
  };
}

/** Erlaubte Aktionen je Schrittstatus */
export const SCHRITT_AKTIONEN = {
  starten: { von: ["offen", "wartet_extern"], nach: "in_arbeit", label: "Beginnen" },
  warten: { von: ["offen", "in_arbeit"], nach: "wartet_extern", label: "Wartet auf Behörde/Netzbetreiber" },
  erledigen: { von: ["offen", "in_arbeit", "wartet_extern"], nach: "erledigt", label: "Erledigt" },
  entfaellt: { von: ["offen", "in_arbeit", "wartet_extern"], nach: "entfaellt", label: "Entfällt" },
  wiedereroeffnen: { von: ["erledigt", "entfaellt"], nach: "in_arbeit", label: "Wieder öffnen" },
  frist: { von: ["offen", "in_arbeit", "wartet_extern"], nach: null, label: "Frist setzen" },
  notiz: { von: Object.keys(SCHRITT_STATUS), nach: null, label: "Notiz" },
};

/** Wert eines Gemeinschaftsfelds prüfen (Schritte mit `feld`) – liefert den normierten Wert oder wirft 422 */
export function feldwertPruefen(feld, wert, { modell = "", marktpartnerId = "", verteilmodell = "" } = {}) {
  const s = txt(wert, 60);
  if (!feld) return "";
  if (!s) throw fehler("Bitte den Wert eintragen (z. B. Registernummer, IBAN, Kennung).", "wert");
  const ohne = s.replace(/\s/g, "");
  switch (feld) {
    case "zvrZahl":
      if (!/^\d{9,10}$/.test(ohne)) throw fehler("Die ZVR-Zahl besteht aus 9 bzw. 10 Ziffern (Format zu bestätigen).", "wert");
      return ohne;
    case "firmenbuchnummer": {
      const fn = ohne.toLowerCase().replace(/^fn/, "");
      if (!/^\d{1,6}[a-z]$/.test(fn)) throw fehler("Firmenbuchnummer: bis zu 6 Ziffern und ein Prüfbuchstabe (z. B. 541505g).", "wert");
      return fn;
    }
    case "iban": {
      const i = ibanPruefen(ohne);
      if (!i) throw fehler("Die IBAN ist ungültig (Prüfsumme).", "wert");
      return i;
    }
    case "creditorId": {
      const c = ohne.toUpperCase();
      if (!/^AT\d{2}ZZZ\d{11}$/.test(c)) throw fehler("SEPA-Gläubiger-ID Österreich: AT + 2 Prüfziffern + ZZZ + 11 Ziffern (zu bestätigen).", "wert");
      return c;
    }
    case "marktpartnerId": {
      const r = marktpartnerIdPruefen(ohne, modell);
      if (!r.ok || !r.wert) throw fehler(r.fehler || "Bitte die Marktpartner-ID angeben.", "wert");
      return r.wert;
    }
    case "gemeinschaftsId": {
      const r = gemeinschaftsIdPruefen(ohne, { modell, marktpartnerId, verteilmodell });
      if (!r.ok || !r.wert) throw fehler(r.fehler || "Bitte die Gemeinschafts-ID angeben.", "wert");
      return r.wert;
    }
    case "uid": {
      const u = uidPruefen(ohne);
      if (!u) throw fehler("Die UID-Nummer hat das Format ATU + 8 Ziffern.", "wert");
      return u;
    }
    case "edaAnbindung":
      if (!Object.hasOwn(EDA_ANBINDUNGEN, s)) throw fehler(`EDA-Anbindung: ${Object.keys(EDA_ANBINDUNGEN).join(", ")}.`, "wert");
      return s;
    default:
      return s;
  }
}

/**
 * Schritt-Aktion (reine Prüfung, ohne Wirkung auf die Gemeinschaft).
 * @returns {object} geänderter Schritt
 */
export function schrittAktion(x, aktion, { datum: d = "", wert = "", notiz = "", frist = "", grund = "", nachweis = null, heute = GR_STAND, von = null, gemeinschaft = null, paket = "" } = {}) {
  const def = SCHRITT_AKTIONEN[aktion];
  if (!def) throw fehler("Unbekannte Aktion.", "aktion");
  if (!def.von.includes(x.status)) throw konflikt(`„${def.label}“ ist im Status „${SCHRITT_STATUS[x.status]?.label || x.status}“ nicht möglich.`);
  const v = schrittDefinition(x.schluessel, paket) || {};
  const neu = { ...x, nachweise: [...(x.nachweise || [])], vonId: von };
  const tag = datum(d) || heute;
  if (tag > heute && aktion === "erledigen") throw fehler("Das Erledigungsdatum liegt in der Zukunft.", "datum");
  if (aktion === "frist") {
    if (frist && !istDatum(frist)) throw fehler("Bitte ein gültiges Datum angeben.", "frist");
    neu.fristManuell = datum(frist);
    return neu;
  }
  if (nachweis && typeof nachweis === "object") neu.nachweise.push({ titel: txt(nachweis.titel, 160) || "Nachweis", dokumentId: txt(nachweis.dokumentId, 40), am: heute });
  if (notiz) neu.notiz = mehr(notiz, 1000);
  if (aktion === "notiz") return neu;
  if (aktion === "starten" && !neu.gestartetAm) neu.gestartetAm = tag;
  if (aktion === "warten" && !neu.gestartetAm) neu.gestartetAm = tag;
  if (aktion === "entfaellt") {
    if (x.pflicht && !txt(grund, 300)) throw fehler("Ein Pflichtschritt entfällt nur mit Begründung.", "grund");
    neu.notiz = txt(grund, 300) || neu.notiz;
  }
  if (aktion === "erledigen") {
    if (v.feld) neu.wert = feldwertPruefen(v.feld, wert || (gemeinschaft?.[v.feld] ?? ""), { modell: gemeinschaft?.modell, marktpartnerId: gemeinschaft?.marktpartnerId, verteilmodell: gemeinschaft?.verteilmodell });
    else if (wert) neu.wert = txt(wert, 200);
    if (v.nachweis && x.pflicht && !neu.nachweise.length && !neu.notiz && !neu.wert) throw fehler(`Bitte einen Nachweis anfügen oder vermerken: ${v.nachweis}.`, "nachweis");
    neu.datum = tag;
    if (!neu.gestartetAm) neu.gestartetAm = tag;
  }
  if (aktion === "wiedereroeffnen") neu.datum = "";
  neu.status = def.nach;
  return neu;
}

/**
 * Wirkung eines erledigten Schritts auf die Gemeinschaft (ausgeführt vom Backend über egGemeinschaftSpeichern/-Status).
 * @returns {{felder:object, statusZiel:string, ereignis:string}}
 */
export function schrittWirkung(x, { auftrag = {}, gemeinschaft = null } = {}) {
  const v = schrittDefinition(x.schluessel, auftrag.paket) || {};
  const felder = {};
  if (x.status !== "erledigt") return { felder, statusZiel: "", ereignis: "" };
  if (v.feld && x.wert) felder[v.feld] = x.wert;
  if (x.schluessel === "betreibervertrag") felder.betreibervertragDatum = x.datum;
  if (x.schluessel === "organisator_anzeige") felder.organisatorAngezeigtAm = x.datum;
  if (x.schluessel === "organisator_vollmacht" || x.schluessel === "dl_vertrag_avv") felder.dienstleistung = { aktiv: true, paket: auftrag.paket === "wechsel" ? "rundum" : auftrag.paket, seit: gemeinschaft?.dienstleistung?.seit || x.datum, avvAm: gemeinschaft?.dienstleistung?.avvAm || x.datum };
  if (x.schluessel === "ust_option" && x.wert) Object.assign(felder, { ustStatus: "regelbesteuert", ustOptionSeit: x.datum });
  if (x.schluessel === "statuten" && !x.wert) felder.statutenVersion = `Muster ${x.datum}`;
  return { felder, statusZiel: v.statusZiel || "", ereignis: v.ereignis || "" };
}

const KETTE = ["interesse", "machbarkeit", "in_gruendung", "rechtsperson", "marktpartner", "vertrag_nb", "eda_bereit", "aktiv"];
/**
 * Pfad im Lebenszyklus der Gemeinschaft (nur vorwärts, über erlaubte Übergänge GEMEINSCHAFT_STATUS.naechste).
 * @returns {string[]} Folge der Zielstatus (ohne Startstatus); [] wenn schon erreicht oder nicht erreichbar
 */
export function statusPfad(von, nach) {
  const iv = KETTE.indexOf(von);
  const in_ = KETTE.indexOf(nach);
  if (iv < 0 || in_ < 0 || in_ <= iv) return [];
  const warte = [[von]];
  const gesehen = new Set([von]);
  while (warte.length) {
    const pfad = warte.shift();
    const letzter = pfad[pfad.length - 1];
    for (const n of GEMEINSCHAFT_STATUS[letzter]?.naechste || []) {
      if (gesehen.has(n) || !KETTE.includes(n) || KETTE.indexOf(n) > in_) continue;
      const p = [...pfad, n];
      if (n === nach) return p.slice(1);
      gesehen.add(n);
      warte.push(p);
    }
  }
  return [];
}

/** Prüfung vor „EDA-bereit“ (Fachkonzept 2.3; Ereignis eg.gemeinschaft.eda_bereit an WP2) */
export function edaBereitPruefen(g, { schritte = [], organisator = false } = {}) {
  const f = [];
  if (!g) return { bereit: false, fehlend: ["Gemeinschaft ist noch nicht angelegt."] };
  if (EG_MODELLE[g.modell]?.rechtsperson && !(g.zvrZahl || g.firmenbuchnummer)) f.push("ZVR-Zahl bzw. Firmenbuchnummer fehlt (Rechtsperson).");
  if (["eeg", "beg", "gea"].includes(g.modell) && !g.marktpartnerId) f.push("Marktpartner-ID (ebUtilities) fehlt.");
  if (!g.gemeinschaftsId) f.push("Gemeinschafts-ID aus dem Vertrag mit dem Netzbetreiber fehlt.");
  if (!g.netzbetreiber?.length && g.modell !== "p2p") f.push("Netzbetreiber fehlt.");
  if (!g.edaAnbindung) f.push("EDA-Anbindung fehlt.");
  if ((organisator || g.dienstleistung?.aktiv) && !g.organisatorAngezeigtAm) f.push("Organisator ist dem Netzbetreiber noch nicht angezeigt (§ 68 Abs. 2 ElWG).");
  if (!["vertrag_nb", "eda_bereit", "aktiv"].includes(g.status)) f.push(`Status der Gemeinschaft ist „${GEMEINSCHAFT_STATUS[g.status]?.label || g.status}“ – erwartet „Vertrag mit dem Netzbetreiber“.`);
  const offen = schritte.filter((x) => x.pflicht && !SCHRITT_FERTIG.includes(x.status) && ["vertraege", "datenschutz", "eda_zugang", "lieferantenpflichten"].includes(x.schluessel));
  for (const x of offen) f.push(`Schritt offen: ${x.label}.`);
  return { bereit: !f.length, fehlend: f };
}

// ---------------------------------------------------------------- Rechtsform-Empfehlung

/** Profile der Rechtsformen (Vor- und Nachteile, Fachkonzept 2.3) */
export const RECHTSFORM_PROFIL = {
  verein: { pro: ["häufigste Form für EEG und BEG", "gebührenfreie Errichtungsanzeige, Entstehung nach 4 (höchstens 6) Wochen", "Einnahmen-Ausgaben-Rechnung bis 1 Mio. € Einnahmen bzw. Ausgaben", "kein Mindestkapital"], contra: ["Investitionen schwer finanzierbar (keine Geschäftsanteile)", "Organe arbeiten meist ehrenamtlich und haften bei Pflichtverletzung"], quelle: "VerG 2002 §§ 13, 21, 22; Fachkonzept 2.3" },
  egen: { pro: ["Kapital über Geschäftsanteile – gut für eigene Anlagen und Speicher", "Haftung über Geschäftsanteile begrenzt", "Revision durch den Revisionsverband schafft Vertrauen"], contra: ["Firmenbuch, Revisionsverband und Jahresabschluss verursachen laufende Kosten", "höherer Formalaufwand bei der Gründung"], quelle: "GenG; GenRevG 1997; Fachkonzept 2.3" },
  gmbh: { pro: ["klare Haftungsbegrenzung", "passt für wenige professionelle Beteiligte (z. B. Gemeinde mit Betrieben)"], contra: ["Notariatsakt, Stammkapital und Bilanzierung", "Gewinnorientierung der Rechtsform passt schlecht zum Hauptzweck „kein finanzieller Gewinn“", "Mitgliederwechsel aufwendig"], quelle: "GmbHG (zu bestätigen); EAG § 79 Abs. 2" },
  og_kg: { pro: ["einfache Gründung für wenige Beteiligte"], contra: ["unbeschränkte Haftung zumindest eines Gesellschafters", "für offene Mitgliederkreise ungeeignet"], quelle: "UGB" },
};

/**
 * Empfehlung zur Rechtsform (Entscheidungshilfe, keine Rechtsberatung).
 * @param {{modell:string, erwarteteMitglieder?:number, investitionGeplant?:boolean, erzeugungKwp?:number, gemeindeBeteiligt?:boolean}} d
 */
export function rechtsformEmpfehlung(d = {}) {
  const modell = Object.hasOwn(EG_MODELLE, d.modell) ? d.modell : "eeg";
  if (!EG_MODELLE[modell].rechtsperson) return { empfehlung: "keine", begruendung: [`Für ${EG_MODELLE[modell].kurz} ist keine eigene Rechtsperson nötig – es genügen Verträge zwischen den Beteiligten.`], alternativen: [], quelle: EG_MODELLE[modell].quelle };
  const b = [];
  let empf = "verein";
  const mitglieder = Number(d.erwarteteMitglieder) || 0;
  const kw = Number(d.erzeugungKwp) || 0;
  if (d.investitionGeplant) {
    empf = "egen";
    b.push("Die Gemeinschaft will eigene Anlagen finanzieren – Geschäftsanteile einer Genossenschaft eignen sich dafür besser als Vereinsbeiträge.");
  } else b.push("Ohne eigene Investitionen ist der Verein die einfachste und günstigste Form.");
  if (mitglieder > 300 && empf === "verein") b.push(`Bei ${mitglieder} erwarteten Mitgliedern auf eine professionelle Buchhaltung achten; ab 1 Mio. € Einnahmen in zwei Folgejahren besteht Bilanzpflicht (VerG § 22).`);
  if (kw > 100) b.push(`Mit ${kw} kW Erzeugungsleistung gelten Lieferantenpflichten nach § 69 ElWG – unabhängig von der Rechtsform; ein Organisator kann sie übernehmen.`);
  if (d.gemeindeBeteiligt) b.push("Gemeinden können Mitglied jeder Rechtsform sein; Beschluss des Gemeinderats und beihilferechtlich fremdübliche Preise beachten.");
  if (modell === "beg") b.push("BEG: Die Kontrollklausel (§ 67 Abs. 3 ElWG) ist in Statuten bzw. Satzung zu verankern.");
  const alternativen = Object.entries(RECHTSFORM_PROFIL).map(([rf, p]) => ({ rechtsform: rf, label: RECHTSFORMEN[rf].label, empfohlen: rf === empf, ...p }));
  return { empfehlung: empf, begruendung: b, alternativen, quelle: "Fachkonzept 2.3; Ratgeber Rechtsformen der Koordinationsstelle" };
}

// ---------------------------------------------------------------- Formular-Ausfüllhilfen

/**
 * Ausfüllhilfe zu einem Behörden- bzw. Netzbetreiber-Formular mit vorbefüllten Werten aus den Stammdaten.
 * @param {string} art vereinsanzeige | finanzamt | ust | elabg | ebutilities | betreibervertrag | eda_zugang | rechtsform | organe | eda_bereit
 * @param {{gemeinschaft?:object, netzbetreiber?:object[], organe?:object[], auftrag?:object, zaehlpunkte?:number}} k
 */
export function formularHilfe(art, { gemeinschaft = null, netzbetreiber = [], organe = [], auftrag = {}, zaehlpunkte = 0 } = {}) {
  const g = gemeinschaft || {};
  const name = g.name || auftrag.arbeitsname || "";
  const sitz = [g.sitzAdresse?.strasse, [g.sitzAdresse?.plz || auftrag.plz, g.sitzAdresse?.ort || auftrag.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const rf = g.rechtsform || auftrag.rechtsform;
  const modell = g.modell || auftrag.modell;
  const leitung = organe.filter((o) => o.status !== "beendet" && ["obmann", "obmann_stv", "kassier", "schriftfuehrer", "vorstand", "geschaeftsfuehrer"].includes(o.funktion)).map((o) => `${o.personName || o.name} (${o.funktionLabel || o.funktion})`);
  const feld = (label, wert, quelle = "Stammdaten") => ({ label, wert: wert || "", quelle, offen: !wert });
  const nbs = netzbetreiber.filter((x) => (g.netzbetreiber || []).includes(x.id) || x.id === auftrag.netzbetreiberId);
  let h;
  switch (art) {
    case "vereinsanzeige":
      h = { titel: "Errichtungsanzeige bei der Vereinsbehörde", stelle: "Vereinsbehörde am Sitz (Bezirkshauptmannschaft bzw. Landespolizeidirektion)", frist: "Die Behörde hat 4 Wochen (verlängerbar auf 6 Wochen) Zeit; danach entsteht der Verein bzw. schon mit Einladung zur Aufnahme der Tätigkeit (VerG § 13).", quelle: "VerG §§ 11, 13",
        felder: [feld("Vereinsname", name), feld("Sitz und Zustellanschrift", sitz), feld("Statuten (beschlossene Fassung)", g.statutenVersion), feld("Organwalter des Leitungsorgans", leitung.join("; ")), feld("Gründungsversammlung", auftrag.gruendungsversammlungAm || "", "Gründungsschritt")],
        hinweise: ["Anzeige durch die Proponenten mit einem Exemplar der Statuten; Angaben zu den Organwaltern (Name, Geburtsdatum, Anschrift) laut Formular der Behörde (zu bestätigen).", "Die Anzeige ist in der Regel gebührenfrei (Fachkonzept 2.3, zu bestätigen)."] };
      break;
    case "finanzamt":
      h = { titel: rf === "verein" ? "Verf 15a (Verein) und Verf 26" : "Verf 15 (Körperschaft) und Verf 26", stelle: "Finanzamt Österreich (FinanzOnline bzw. Formular)", frist: "binnen 1 Monat nach Beginn der Tätigkeit", quelle: "EEG-Ratgeber Steuern & Abgaben (Fachkonzept 2.3)",
        felder: [feld("Name", name), feld(rf === "verein" ? "ZVR-Zahl" : "Firmenbuchnummer", rf === "verein" ? g.zvrZahl : g.firmenbuchnummer), feld("Sitz", sitz), feld("Bankverbindung (IBAN)", g.iban), feld("Vertretungsbefugte Personen (Verf 26)", leitung.join("; ")), feld("Umsatzsteuer", g.ustStatus === "regelbesteuert" ? "Regelbesteuerung (U 12)" : "Kleinunternehmer (§ 6 Abs. 1 Z 27 UStG)")],
        hinweise: ["Verf 26: Angaben zu den vertretungsbefugten Personen (Bezeichnung laut Fachkonzept, zu bestätigen).", "Keine Steuerberatung – Umsatzsteuer-Option und Körperschaftsteuer mit der Steuerberatung klären."] };
      break;
    case "ust":
      h = { titel: "U 12 (Verzicht auf die Kleinunternehmerbefreiung) bzw. U 15 (UID)", stelle: "Finanzamt Österreich", frist: "Verzicht bindet 5 Kalenderjahre", quelle: "UStG § 6 Abs. 3; EEG-Ratgeber Steuern",
        felder: [feld("Name", name), feld("Steuernummer", g.steuernummer), feld("Beginn", "")],
        hinweise: ["Sinnvoll vor allem bei Vorsteuer aus eigenen Investitionen bzw. Reverse-Charge-Bezügen von regelbesteuerten Erzeugern – vorher Kleinunternehmer-Monitor (WP4) und Steuerberatung."] };
      break;
    case "elabg":
      h = { titel: "Meldung zur Befreiung von der Elektrizitätsabgabe", stelle: "Finanzamt (Zollamt Österreich, zu bestätigen)", frist: "binnen 4 Wochen nach Inbetriebnahme", quelle: "Elektrizitätsabgabe-Eigenstrombefreiungsverordnung; EEG-Ratgeber Steuern",
        felder: [feld("Gemeinschaft", name), feld("Gemeinschafts-ID", g.gemeinschaftsId), feld("Erzeugungsleistung", g.kennzahlen?.erzeugungsleistungKw ? `${g.kennzahlen.erzeugungsleistungKw} kW` : auftrag.erzeugungKwp ? `${auftrag.erzeugungKwp} kWp (Plan)` : "")],
        hinweise: ["Befreiung laut Koordinationsstelle nur für EEG (und Eigendeckung in GEA); für BEG nicht (Fachkonzept 1.2).", "Jährliche Erklärung; bilanzielle Aufzeichnungen der EEG genügen (BMF-Anfragebeantwortung 03.11.2023)."] };
      break;
    case "ebutilities":
      h = { titel: "Registrierung als Marktpartner auf ebUtilities", stelle: "ebUtilities.at (Rolle " + (modell === "beg" ? "BEG" : modell === "gea" ? "GEA" : "EEG") + ")", frist: "nach Entstehung der Rechtsperson", quelle: "HA II 11; Koordinationsstelle Schritt 4", link: "https://energiegemeinschaften.gv.at/4-registrierung-als-marktpartner/",
        felder: [feld("Name", name), feld("Rechtsform", RECHTSFORMEN[rf]?.label), feld(rf === "verein" ? "ZVR-Zahl" : "Firmenbuchnummer", rf === "verein" ? g.zvrZahl : g.firmenbuchnummer), feld("Sitz", sitz), feld("Ansprechperson", leitung[0] || auftrag.ansprechpartner?.name), feld("E-Mail", g.email || auftrag.ansprechpartner?.email)],
        hinweise: [`Ergebnis: Marktpartner-ID ${EG_MODELLE[modell]?.marktpartnerPraefix || "XX"} + 6 Ziffern.`, "Upload: Identitätsnachweis und Vereinsregister- bzw. Firmenbuchauszug.", "Ab 05.10.2026 optimierter Ablauf (auch P2P und Eigenversorgung, Präfixe zu bestätigen)."] };
      break;
    case "betreibervertrag": {
      const wege = nbs.map((nb) => ({ netzbetreiber: nb.name, weg: nb.vertragsweg, kontakt: nb.kontaktEmail || "", formular: nb.formularUrl || nb.portalUrl || "", besonderheiten: nb.besonderheiten || "" }));
      h = { titel: "Vertrag über den Betrieb der Gemeinschaft mit dem Netzbetreiber", stelle: nbs.map((x) => x.name).join(", ") || "Netzbetreiber laut Zählpunkt", frist: "Bearbeitungsdauer je Netzbetreiber (zu bestätigen)", quelle: "HA II 7.1; Koordinationsstelle Schritt 5", link: modell === "beg" ? "https://energiegemeinschaften.gv.at/5-vertrag-mit-dem-netzbetreiber-beg/" : modell === "gea" ? "https://energiegemeinschaften.gv.at/4-vertrag-mit-dem-netzbetreiber-gea/" : "https://energiegemeinschaften.gv.at/5-vertrag-mit-dem-netzbetreiber/",
        felder: [feld("Marktpartner-ID", g.marktpartnerId), feld("Name und Sitz", [name, sitz].filter(Boolean).join(", ")), feld("Verteilmodell", g.verteilmodell || "dynamisch"), feld("Nahebereich / Zonelevel", `${g.zonelevel || auftrag.zonelevel || ""} ${ZONELEVEL[g.zonelevel || auftrag.zonelevel]?.label || ""}`.trim()), feld("Nahebereichs-ID (Trafostation bzw. Umspannwerk)", g.nahebereichRef), feld("Organisator", (g.dienstleistung?.aktiv || auftrag.organisator) ? "ÖkoInvest GmbH, Gewerbegebiet 10, 5121 Ostermiething" : "")],
        wege, hinweise: ["Ab 10/2026 im Vertrag: Nahebereichs-ID und Organisator (HA II, ebUtilities-Konzept, zu bestätigen).", modell === "beg" ? "BEG: Die Gemeinschafts-ID vergibt ebUtilities." : "Der Netzbetreiber vergibt die Gemeinschafts-ID.", "Neu aktivierte Gemeinschaften ab 05.10.2026 voraussichtlich nur dynamisch (zu bestätigen)."] };
      break;
    }
    case "eda_zugang": {
      const n = Number(zaehlpunkte) || Number(auftrag.erwarteteMitglieder) || 0;
      const vorschlag = n <= 50 ? "anwenderportal" : n <= 200 ? "email" : "kep";
      h = { titel: "Zugang zur EDA-Plattform", stelle: "EDA GmbH (eda.at)", frist: "vor der ersten Anmeldung", quelle: "HA II 6, 11; Koordinationsstelle Schritt 6", link: "https://energiegemeinschaften.gv.at/6-registrierung-in-der-eda-infrastruktur/",
        felder: [feld("Marktpartner-ID", g.marktpartnerId), feld("Zählpunkte (erwartet)", n ? String(n) : ""), feld("Vorschlag Anbindung", EDA_ANBINDUNGEN[vorschlag].label, "Regel: bis 50 ZP Portal, bis ca. 200 E-Mail, darüber KEP")],
        vorschlag, hinweise: ["Ein Dienstleister arbeitet immer mit der Marktpartner-ID der Gemeinschaft – als Benutzer im Portal oder bevollmächtigt im Plattformvertrag.", "Preise ab 50 Zählpunkten laut Preisliste der EDA GmbH (zu bestätigen)."] };
      break;
    }
    case "rechtsform": {
      const r = rechtsformEmpfehlung({ modell, erwarteteMitglieder: auftrag.erwarteteMitglieder, investitionGeplant: auftrag.investitionGeplant, erzeugungKwp: auftrag.erzeugungKwp, gemeindeBeteiligt: auftrag.gemeindeBeteiligt });
      h = { titel: "Entscheidungshilfe Rechtsform", stelle: "Gründungsinitiative", frist: "", quelle: r.quelle, felder: [feld("Empfehlung", RECHTSFORMEN[r.empfehlung]?.label || r.empfehlung, "Regel")], empfehlung: r, hinweise: r.begruendung };
      break;
    }
    default:
      h = { titel: "Hinweise", stelle: "", frist: "", quelle: "", felder: [], hinweise: [] };
  }
  return { art, ...h, fehlend: h.felder.filter((x) => x.offen).map((x) => x.label) };
}

/** Kennzahlen der Auftragsliste (Backoffice) */
export function auftraegeKennzahlen(liste = [], { heute = GR_STAND } = {}) {
  const k = { gesamt: liste.length, anfragen: 0, angebote: 0, inArbeit: 0, betriebsbereit: 0, ueberfaellig: 0, wechsel: 0 };
  for (const a of liste) {
    if (a.status === "anfrage") k.anfragen++;
    else if (a.status === "angebot") k.angebote++;
    else if (a.status === "betriebsbereit" || a.status === "uebergeben") k.betriebsbereit++;
    else if (GR_AKTIV.includes(a.status)) k.inArbeit++;
    if (a.paket === "wechsel") k.wechsel++;
    if ((a.schritte || []).some((x) => x.pflicht && fristAmpel(schrittFrist(x, a.schritte, a), heute, x.status) === "ueberfaellig")) k.ueberfaellig++;
  }
  return k;
}

/** Übergänge des Auftrags durch Aktionen (Backoffice bzw. Auftraggeber) */
export const AUFTRAG_UEBERGAENGE = {
  angebot: { von: ["anfrage", "angebot"], nach: "angebot" },
  annehmen: { von: ["angebot"], nach: "beauftragt" },
  beauftragt_manuell: { von: ["anfrage", "angebot"], nach: "beauftragt" },
  ablehnen: { von: ["angebot"], nach: "abgebrochen" },
  abbrechen: { von: ["anfrage", "angebot", ...GR_AKTIV], nach: "abgebrochen" },
  uebergeben: { von: ["betriebsbereit"], nach: "uebergeben" },
};
export function auftragUebergang(a, aktion, { heute = GR_STAND } = {}) {
  const u = AUFTRAG_UEBERGAENGE[aktion];
  if (!u) throw fehler("Unbekannte Aktion.", "aktion");
  if (!u.von.includes(a.status)) throw konflikt(`„${aktion}“ ist im Status „${GR_STATUS[a.status]?.label || a.status}“ nicht möglich.`);
  if (aktion === "annehmen" && a.angebot?.gueltigBis && a.angebot.gueltigBis < heute) throw konflikt("Das Angebot ist abgelaufen – bitte ein neues Angebot anfordern.");
  return u.nach;
}
