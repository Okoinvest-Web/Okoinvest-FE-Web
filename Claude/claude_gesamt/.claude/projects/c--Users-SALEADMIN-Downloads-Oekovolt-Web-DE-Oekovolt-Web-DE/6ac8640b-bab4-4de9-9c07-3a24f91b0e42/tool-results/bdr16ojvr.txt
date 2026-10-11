// src/lib/plattform/entwicklung.js
//
// Projektentwicklung (internes Entwicklungsmanagement) – Stammlisten, Meilenstein-Vorlagen je Land und Typ,
// Terminplanung (Vorwärtsrechnung über Abhängigkeiten), kritischer Pfad, Verzug und Pipeline-Wert.
// Reine Funktionen ohne Node-Importe: im Browser (Gantt, Assistent) und auf dem Server (Demo-Backend) nutzbar.
// Frappe-Spiegel: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/entwicklung_kern.py (bei Änderungen nachziehen).
//
// Fachliche Grundlage: Ratgeber „Solarpark-Genehmigung“ und „Netzanschluss“ (src/content/ratgeber). Dauern sind
// Planwerte (Monate) zur Vorbelegung, im Projekt je Meilenstein änderbar – keine Zusage über Verfahrensdauern.

import { ENTWICKLUNG, PHASEN } from "@/lib/invest/markt";
import { heuteLokal } from "./format";

export const ENTWICKLUNG_TYPEN = {
  freiflaeche: "Freiflächen-PV",
  agri: "Agri-PV",
  carport: "Solarcarport / Parkplatz",
  dach: "Dach-PV (Gewerbe/Halle)",
  speicher: "Batteriegroßspeicher",
  hybrid: "PV mit Speicher",
};
export const ENTWICKLUNG_TYP_IDS = Object.keys(ENTWICKLUNG_TYPEN);

export const ENTWICKLUNG_STATUS = {
  aktiv: { label: "In Entwicklung", ton: "info" },
  pausiert: { label: "Pausiert", ton: "warn" },
  boerse: { label: "An Börse übergeben", ton: "ok" },
  bau: { label: "An Bau/Betrieb übergeben", ton: "ok" },
  abgebrochen: { label: "Abgebrochen", ton: "neutral" },
};
export const ENTWICKLUNG_STATUS_IDS = Object.keys(ENTWICKLUNG_STATUS);
export const ENTWICKLUNG_OFFEN = ["aktiv", "pausiert"];

/** Vermarktung – Bezeichnung je Land (Förderregime) */
export const VERMARKTUNG = {
  eeg: { label: "Förderung (Ausschreibung/Marktprämie)", land: { DE: "EEG-Ausschreibung / Marktprämie", AT: "EAG-Marktprämie / Investitionszuschuss", CH: "Einmalvergütung (Pronovo)" } },
  ppa: { label: "PPA (Stromliefervertrag)" },
  merchant: { label: "Merchant (Direktvermarktung ohne Förderung)" },
};
export const VERMARKTUNG_IDS = Object.keys(VERMARKTUNG);
export const vermarktungLabel = (id, land) => VERMARKTUNG[id]?.land?.[land] || VERMARKTUNG[id]?.label || "–";

/** Pachtstatus einer Projektfläche */
export const PACHT_STATUS = {
  angefragt: { label: "Angefragt", ton: "neutral" },
  verhandlung: { label: "In Verhandlung", ton: "info" },
  option: { label: "Optionsvertrag", ton: "info" },
  pachtvertrag: { label: "Pachtvertrag unterschrieben", ton: "ok" },
  abgelehnt: { label: "Abgelehnt / verloren", ton: "warn" },
};
export const PACHT_STATUS_IDS = Object.keys(PACHT_STATUS);
export const PACHT_GESICHERT = ["option", "pachtvertrag"];

export const MEILENSTEIN_STATUS = {
  offen: { label: "Geplant", ton: "neutral" },
  in_arbeit: { label: "In Arbeit", ton: "info" },
  erledigt: { label: "Erledigt", ton: "ok" },
  entfaellt: { label: "Entfällt", ton: "neutral" },
};
export const MEILENSTEIN_STATUS_IDS = Object.keys(MEILENSTEIN_STATUS);
export const MEILENSTEIN_FERTIG = ["erledigt", "entfaellt"];

export const KATEGORIEN = {
  flaeche: { label: "Fläche", farbe: "ov" },
  netz: { label: "Netz", farbe: "navy" },
  gemeinde: { label: "Gemeinde & Planungsrecht", farbe: "navy" },
  gutachten: { label: "Gutachten", farbe: "sand" },
  genehmigung: { label: "Genehmigung", farbe: "navy" },
  vermarktung: { label: "Vermarktung", farbe: "sun" },
  finanzierung: { label: "Finanzierung", farbe: "sun" },
  bau: { label: "Bau & Inbetriebnahme", farbe: "ov" },
};

export const RISIKO_KATEGORIEN = {
  genehmigung: "Genehmigung / Planungsrecht",
  netz: "Netzanschluss",
  flaeche: "Fläche / Eigentümer",
  natur: "Natur- und Artenschutz",
  akzeptanz: "Akzeptanz / Gemeinde",
  markt: "Markt / Vermarktung",
  finanzierung: "Finanzierung",
  technik: "Technik / Bau",
  sonstige: "Sonstige",
};
export const RISIKO_STATUS = { offen: "Offen", beobachten: "Beobachten", mitigiert: "Gemindert", eingetreten: "Eingetreten", geschlossen: "Geschlossen" };
/** Stufen 1–5 für Eintritt und Auswirkung; Score = Eintritt × Auswirkung (1–25) */
export const RISIKO_STUFEN = { 1: "sehr gering", 2: "gering", 3: "mittel", 4: "hoch", 5: "sehr hoch" };
export function risikoScore(r) {
  const e = Math.min(5, Math.max(1, Number(r?.eintritt) || 1));
  const a = Math.min(5, Math.max(1, Number(r?.auswirkung) || 1));
  return e * a;
}
export function risikoAmpel(score) {
  if (score >= 15) return { id: "hoch", label: "hoch", ton: "warn" };
  if (score >= 8) return { id: "mittel", label: "mittel", ton: "info" };
  return { id: "gering", label: "gering", ton: "ok" };
}

export const BUDGET_KATEGORIEN = {
  flaeche: "Flächensicherung & Pacht (Entwicklungsphase)",
  planung: "Planung & Bauleitplanung",
  gutachten: "Gutachten",
  netz: "Netzanfrage & Netzplanung",
  recht: "Rechtsberatung & Verträge",
  gebuehren: "Gebühren & Sicherheiten",
  personal: "Eigenleistung (Stunden)",
  sonstiges: "Sonstiges",
};

export const KONTAKT_ROLLEN_ENTWICKLUNG = {
  gemeinde: "Gemeinde / Bürgermeister",
  bauamt: "Bauamt / Planungsbehörde",
  naturschutz: "Naturschutzbehörde",
  netzbetreiber: "Netzbetreiber",
  landratsamt: "Landratsamt / Bezirkshauptmannschaft / Kanton",
  planer: "Planungsbüro",
  gutachter: "Gutachter",
  eigentuemer: "Eigentümer / Bewirtschafter",
  sonstige: "Sonstige Stakeholder",
};

/** Gutachter/Planer: Fachgebiete und Qualifikation (Profil am Konto, bei Einladung bzw. im Backoffice erfasst) */
export const GUTACHTER_FACHGEBIETE = {
  artenschutz: "Artenschutz / Faunistik (saP)",
  umwelt: "Umweltbericht / UVP / Eingriffsregelung",
  ffh: "FFH- bzw. Naturverträglichkeitsprüfung",
  landschaft: "Landschaftsplanung / Landschaftsbild",
  blendung: "Blendgutachten",
  schall: "Schallimmissionen",
  geotechnik: "Baugrund / Geotechnik / Rammtests",
  kampfmittel: "Kampfmittelerkundung (UXO)",
  archaeologie: "Archäologie / Denkmalpflege",
  hydrologie: "Entwässerung / Hydrologie",
  netz: "Netzplanung / Netzverträglichkeit",
  statik: "Statik / Tragwerksplanung",
  brandschutz: "Brandschutz",
  bauleitplanung: "Bauleitplanung / Stadtplanung",
  agrar: "Agrarwissenschaft (Agri-PV, DIN SPEC 91434)",
  vermessung: "Vermessung",
};
export const GUTACHTER_QUALIFIKATION = {
  oebuv: "Öffentlich bestellt und vereidigt (Sachverständige/r)",
  zertifiziert: "Zertifiziert / akkreditiert (z. B. DIN EN ISO/IEC 17024)",
  kammer: "Kammermitglied (Architekten-/Ingenieurkammer, Ziviltechniker)",
  fachbuero: "Fachbüro / Fachplaner",
  sonstige: "Sonstige Qualifikation",
};

export const ENTSCHEIDUNG_ARTEN = { go: "Go / Freigabe", nogo: "Stopp / No-Go", budget: "Budget", strategie: "Strategie / Vermarktung", sonstige: "Sonstige" };

// ================================================================ Meilenstein-Vorlagen

const FREI = ["freiflaeche", "agri", "hybrid"];
const GEBAEUDE = ["dach", "carport"];

/**
 * Schritte je Land. Felder: s (Schlüssel), t (Titel intern), k (Kategorie), m (Plandauer Monate), nach (Abhängigkeiten),
 * phase (erreichte PHASEN-id, wenn erledigt), dok (Dokumentenpflicht), ext (vereinfachter Titel für Eigentümer, sonst
 * nicht sichtbar), g (typischer Gutachter-/Planerauftrag), nur/ohne (Projekttypen).
 * Abhängigkeiten auf Schritte, die für den Typ entfallen, werden transitiv aufgelöst.
 */
const SCHRITTE = {
  DE: [
    { s: "flaechensicherung", t: "Flächensicherung (Pacht-/Optionsvertrag)", k: "flaeche", m: 3, nach: [], phase: "flaeche", dok: ["Pacht- oder Optionsvertrag", "Grundbuchauszug"], ext: "Flächensicherung und Pachtvertrag" },
    { s: "netzanfrage", t: "Netzanfrage nach § 8 EEG", k: "netz", m: 1, nach: ["flaechensicherung"], dok: ["Netzanschlussbegehren"], ext: "Anfrage beim Netzbetreiber", ohne: ["speicher"] },
    { s: "netzanfrage", t: "Netzanschlussbegehren (§ 17 EnWG)", k: "netz", m: 1, nach: ["flaechensicherung"], dok: ["Netzanschlussbegehren"], ext: "Anfrage beim Netzbetreiber", nur: ["speicher"] },
    { s: "netzvertraeglichkeit", t: "Netzverträglichkeitsprüfung / Netzplanung (Anschlussvariante, Kabeltrasse)", k: "netz", m: 3, nach: ["netzanfrage"], dok: ["Netzverträglichkeitsprüfung"], g: true },
    { s: "netzzusage", t: "Netzzusage / Reservierung Netzverknüpfungspunkt", k: "netz", m: 3, nach: ["netzvertraeglichkeit"], phase: "netz", dok: ["Netzzusage des Netzbetreibers"], ext: "Netzanschluss zugesagt" },
    { s: "gemeinde_vorgespraech", t: "Vorgespräch Gemeinde", k: "gemeinde", m: 2, nach: ["flaechensicherung"], dok: ["Präsentation / Protokoll Gemeinderat"], ext: "Gespräch mit der Gemeinde", ohne: GEBAEUDE },
    { s: "nutzungskonzept_agri", t: "Landwirtschaftliches Nutzungskonzept Agri-PV (DIN SPEC 91434)", k: "gutachten", m: 2, nach: ["flaechensicherung"], dok: ["Landwirtschaftliches Nutzungskonzept"], ext: "Nutzungskonzept für die Landwirtschaft", g: true, nur: ["agri"] },
    { s: "aufstellungsbeschluss", t: "Aufstellungsbeschluss B-Plan (§ 2 Abs. 1 BauGB)", k: "gemeinde", m: 3, nach: ["gemeinde_vorgespraech"], phase: "aufstellung", dok: ["Beschluss Gemeinderat", "Städtebaulicher Vertrag (§ 11 BauGB)"], ext: "Aufstellungsbeschluss der Gemeinde", nur: FREI },
    { s: "fruehzeitige_beteiligung", t: "Frühzeitige Beteiligung (§ 3 Abs. 1, § 4 Abs. 1 BauGB)", k: "gemeinde", m: 2, nach: ["aufstellungsbeschluss", "nutzungskonzept_agri"], dok: ["Vorentwurf B-Plan", "Stellungnahmen"], ext: "Frühzeitige Beteiligung von Bürgern und Behörden", nur: FREI },
    { s: "gutachten_artenschutz", t: "Gutachten Artenschutz (saP, § 44 BNatSchG)", k: "gutachten", m: 9, nach: ["aufstellungsbeschluss"], dok: ["Artenschutzgutachten"], ext: "Naturschutz-Gutachten", g: true, nur: FREI },
    { s: "gutachten_ffh", t: "FFH-Vorprüfung (Natura 2000, falls Schutzgebiet in der Nähe)", k: "gutachten", m: 2, nach: ["aufstellungsbeschluss"], dok: ["FFH-Vorprüfung"], g: true, nur: FREI },
    { s: "gutachten_landschaft", t: "Landschaftsbild / Sichtbarkeitsanalyse", k: "gutachten", m: 2, nach: ["aufstellungsbeschluss"], dok: ["Sichtbarkeitsanalyse"], g: true, nur: FREI },
    { s: "gutachten_blendung", t: "Blendgutachten", k: "gutachten", m: 2, nach: ["aufstellungsbeschluss"], dok: ["Blendgutachten"], g: true, nur: FREI },
    { s: "gutachten_blendung", t: "Blendgutachten (falls Verkehrswege/Nachbarn betroffen)", k: "gutachten", m: 2, nach: ["flaechensicherung"], dok: ["Blendgutachten"], g: true, nur: ["carport"] },
    { s: "gutachten_schall", t: "Schallgutachten (Trafostationen, Wechselrichter)", k: "gutachten", m: 2, nach: ["aufstellungsbeschluss"], dok: ["Schallgutachten"], g: true, nur: ["freiflaeche", "agri"] },
    { s: "gutachten_schall", t: "Schallgutachten (Trafos, Wechselrichter, Speicher) / Brandschutzkonzept", k: "gutachten", m: 2, nach: ["aufstellungsbeschluss"], dok: ["Schallgutachten", "Brandschutzkonzept"], g: true, nur: ["hybrid"] },
    { s: "gutachten_schall", t: "Schallgutachten / Brandschutzkonzept", k: "gutachten", m: 2, nach: ["flaechensicherung"], dok: ["Schallgutachten", "Brandschutzkonzept"], g: true, nur: ["speicher"] },
    { s: "gutachten_entwaesserung", t: "Entwässerungskonzept / Oberflächenwasser (Starkregen, Versickerung)", k: "gutachten", m: 2, nach: ["aufstellungsbeschluss"], dok: ["Entwässerungskonzept"], g: true, nur: FREI },
    { s: "gutachten_archaeologie", t: "Archäologische Voruntersuchung (Bodendenkmalpflege)", k: "gutachten", m: 3, nach: ["aufstellungsbeschluss"], dok: ["Stellungnahme Denkmalbehörde / Prospektionsbericht"], g: true, nur: FREI },
    { s: "gutachten_boden", t: "Baugrundgutachten mit Rammtests / Pfahlprobebelastung", k: "gutachten", m: 2, nach: ["flaechensicherung"], dok: ["Baugrundgutachten", "Protokoll Rammtests"], g: true, ohne: GEBAEUDE },
    { s: "gutachten_kampfmittel", t: "Kampfmittelvorerkundung (UXO)", k: "gutachten", m: 1, nach: ["flaechensicherung"], dok: ["Kampfmittelfreigabe bzw. Auswertung Luftbilder"], g: true, ohne: GEBAEUDE },
    { s: "gutachten_statik", t: "Statik-Gutachten (Tragwerk)", k: "gutachten", m: 2, nach: ["flaechensicherung"], dok: ["Statischer Nachweis"], g: true, nur: GEBAEUDE },
    { s: "umweltbericht", t: "Umweltbericht (§ 2 Abs. 4, § 2a BauGB)", k: "gutachten", m: 3, nach: ["gutachten_artenschutz", "gutachten_ffh", "gutachten_landschaft", "fruehzeitige_beteiligung"], dok: ["Umweltbericht"], ext: "Umweltbericht", g: true, nur: FREI },
    { s: "offenlage", t: "Offenlage (§ 3 Abs. 2, § 4 Abs. 2 BauGB)", k: "gemeinde", m: 2, nach: ["umweltbericht", "gutachten_blendung", "gutachten_schall", "gutachten_entwaesserung", "gutachten_archaeologie"], dok: ["Entwurf B-Plan mit Begründung"], ext: "Öffentliche Auslegung des Plans", nur: FREI },
    { s: "abwaegung", t: "Abwägung (§ 1 Abs. 7 BauGB)", k: "gemeinde", m: 2, nach: ["offenlage"], dok: ["Abwägungstabelle"], nur: FREI },
    { s: "satzungsbeschluss", t: "Satzungsbeschluss (§ 10 Abs. 1 BauGB)", k: "gemeinde", m: 1, nach: ["abwaegung"], phase: "satzung", dok: ["Satzungsbeschluss"], ext: "Satzungsbeschluss – Baurecht in Sicht", nur: FREI },
    { s: "rechtskraft", t: "Bekanntmachung / Rechtskraft (§ 10 Abs. 3 BauGB)", k: "gemeinde", m: 1, nach: ["satzungsbeschluss"], dok: ["Bekanntmachung"], ext: "Bebauungsplan rechtskräftig", nur: FREI },
    { s: "baugenehmigung", t: "Baugenehmigung (falls nach Landesbauordnung erforderlich)", k: "genehmigung", m: 3, nach: ["rechtskraft", "netzzusage", "gutachten_boden", "gutachten_schall"], phase: "rtb", dok: ["Baugenehmigung oder Nachweis Verfahrensfreiheit"], ext: "Baugenehmigung – Projekt baureif", nur: FREI },
    { s: "baugenehmigung", t: "Baugenehmigung (Landesbauordnung, ggf. verfahrensfrei)", k: "genehmigung", m: 3, nach: ["netzzusage", "gutachten_statik", "gutachten_blendung"], phase: "rtb", dok: ["Baugenehmigung oder Nachweis Verfahrensfreiheit"], ext: "Baugenehmigung – Projekt baureif", nur: GEBAEUDE },
    { s: "baugenehmigung", t: "Baugenehmigung bzw. B-Plan (Speicher – Privilegierung im Außenbereich nach aktuellem Stand prüfen)", k: "genehmigung", m: 6, nach: ["gemeinde_vorgespraech", "netzzusage", "gutachten_schall", "gutachten_boden"], phase: "rtb", dok: ["Baugenehmigung"], ext: "Genehmigung – Projekt baureif", nur: ["speicher"] },
    { s: "vermarktung", t: "EEG-Gebot / Zuschlag oder PPA", k: "vermarktung", m: 4, nach: ["satzungsbeschluss", "netzzusage"], dok: ["Zuschlag der Bundesnetzagentur oder PPA-Vertrag"], nur: FREI },
    { s: "vermarktung", t: "EEG-Marktprämie / Mieterstrom oder PPA", k: "vermarktung", m: 3, nach: ["baugenehmigung"], dok: ["PPA-Vertrag oder Nachweis Förderweg"], nur: GEBAEUDE },
    { s: "vermarktung", t: "Vermarktung (Tolling, Regelenergie, Arbitrage)", k: "vermarktung", m: 4, nach: ["baugenehmigung"], dok: ["Vermarktungsvertrag / Term Sheet"], nur: ["speicher"] },
    { s: "finanzierung", t: "Finanzierung (Financial Close)", k: "finanzierung", m: 3, nach: ["vermarktung", "baugenehmigung"], dok: ["Kreditvertrag / Finanzierungszusage"] },
    { s: "epc_vergabe", t: "EPC-Vergabe", k: "bau", m: 2, nach: ["finanzierung"], dok: ["EPC-Vertrag"] },
    { s: "baubeginn", t: "Baubeginn", k: "bau", m: 1, nach: ["epc_vergabe", "gutachten_kampfmittel"], dok: ["Baubeginnanzeige"], ext: "Baubeginn" },
    { s: "inbetriebnahme", t: "Inbetriebnahme (COD)", k: "bau", m: 5, nach: ["baubeginn"], phase: "cod", dok: ["Inbetriebnahmeprotokoll", "Registrierung Marktstammdatenregister"], ext: "Inbetriebnahme" },
  ],
  AT: [
    { s: "flaechensicherung", t: "Flächensicherung (Pacht-/Optionsvertrag, Grundbuch)", k: "flaeche", m: 3, nach: [], phase: "flaeche", dok: ["Pacht- oder Optionsvertrag", "Grundbuchsauszug"], ext: "Flächensicherung und Pachtvertrag" },
    { s: "netzanfrage", t: "Netzzugangsantrag beim Verteilernetzbetreiber", k: "netz", m: 1, nach: ["flaechensicherung"], dok: ["Netzzugangsantrag"], ext: "Anfrage beim Netzbetreiber" },
    { s: "netzvertraeglichkeit", t: "Netzverträglichkeitsprüfung / Netzplanung", k: "netz", m: 3, nach: ["netzanfrage"], dok: ["Netzverträglichkeitsprüfung"], g: true },
    { s: "netzzusage", t: "Netzzugangszusage / Anschlusspunkt", k: "netz", m: 3, nach: ["netzvertraeglichkeit"], phase: "netz", dok: ["Netzzusage"], ext: "Netzanschluss zugesagt" },
    { s: "gemeinde_vorgespraech", t: "Vorgespräch Gemeinde (Bürgermeister, Raumplanung)", k: "gemeinde", m: 2, nach: ["flaechensicherung"], dok: ["Gesprächsprotokoll"], ext: "Gespräch mit der Gemeinde", ohne: GEBAEUDE },
    { s: "nutzungskonzept_agri", t: "Landwirtschaftliches Nutzungskonzept Agri-PV (DIN SPEC 91434 als Orientierung)", k: "gutachten", m: 2, nach: ["flaechensicherung"], dok: ["Landwirtschaftliches Nutzungskonzept"], ext: "Nutzungskonzept für die Landwirtschaft", g: true, nur: ["agri"] },
    { s: "widmung_antrag", t: "Antrag Umwidmung „Grünland-Photovoltaik“ (Flächenwidmungsplan)", k: "gemeinde", m: 3, nach: ["gemeinde_vorgespraech", "nutzungskonzept_agri"], phase: "aufstellung", dok: ["Widmungsantrag", "Raumordnungsfachliche Unterlagen"], ext: "Umwidmung beantragt", nur: FREI },
    { s: "uvp_feststellung", t: "UVP-Feststellungsverfahren (je nach Größe und Schutzgebiet)", k: "genehmigung", m: 4, nach: ["flaechensicherung"], dok: ["Feststellungsbescheid"], nur: FREI },
    { s: "gutachten_natur", t: "Naturschutzgutachten / naturschutzrechtliche Bewilligung", k: "gutachten", m: 6, nach: ["widmung_antrag"], dok: ["Naturschutzgutachten"], ext: "Naturschutz-Gutachten", g: true, nur: FREI },
    { s: "gutachten_nvp", t: "Naturverträglichkeitsprüfung (Natura 2000, falls betroffen)", k: "gutachten", m: 3, nach: ["widmung_antrag"], dok: ["Naturverträglichkeitserklärung"], g: true, nur: FREI },
    { s: "gutachten_landschaft", t: "Landschaftsbild / Sichtbarkeitsanalyse", k: "gutachten", m: 2, nach: ["widmung_antrag"], dok: ["Sichtbarkeitsanalyse"], g: true, nur: FREI },
    { s: "gutachten_blendung", t: "Blendgutachten", k: "gutachten", m: 2, nach: ["widmung_antrag"], dok: ["Blendgutachten"], g: true, nur: FREI },
    { s: "gutachten_boden", t: "Geotechnisches Gutachten mit Rammtests", k: "gutachten", m: 2, nach: ["flaechensicherung"], dok: ["Geotechnisches Gutachten"], g: true, ohne: GEBAEUDE },
    { s: "gutachten_statik", t: "Statik-Gutachten (Tragwerk)", k: "gutachten", m: 2, nach: ["flaechensicherung"], dok: ["Statischer Nachweis"], g: true, nur: GEBAEUDE },
    { s: "gutachten_schall", t: "Schallgutachten (Trafostationen, Wechselrichter)", k: "gutachten", m: 2, nach: ["widmung_antrag"], dok: ["Schallgutachten"], g: true, nur: ["freiflaeche", "agri"] },
    { s: "gutachten_schall", t: "Schallgutachten / Brandschutzkonzept", k: "gutachten", m: 2, nach: ["flaechensicherung"], dok: ["Schallgutachten", "Brandschutzkonzept"], g: true, nur: ["speicher", "hybrid"] },
    { s: "widmung_beschluss", t: "Gemeinderatsbeschluss Widmung und aufsichtsbehördliche Genehmigung", k: "gemeinde", m: 4, nach: ["gutachten_natur", "gutachten_nvp", "gutachten_landschaft", "gutachten_blendung", "uvp_feststellung"], phase: "satzung", dok: ["Gemeinderatsbeschluss", "Genehmigung Landesregierung"], ext: "Widmung beschlossen", nur: FREI },
    { s: "baubewilligung", t: "Baubewilligung bzw. Bauanzeige (je nach Bauordnung des Landes)", k: "genehmigung", m: 3, nach: ["gutachten_statik", "gutachten_schall", "gemeinde_vorgespraech"], phase: "satzung", dok: ["Baubewilligung oder Bauanzeige"], ext: "Baubewilligung", ohne: FREI },
    { s: "elektrizitaetsrecht", t: "Elektrizitätsrechtliche Bewilligung (Landes-Elektrizitätswirtschaftsgesetz)", k: "genehmigung", m: 3, nach: ["widmung_beschluss", "baubewilligung", "netzzusage", "gutachten_schall", "gutachten_boden"], phase: "rtb", dok: ["Elektrizitätsrechtlicher Bescheid"], ext: "Bewilligung – Projekt baureif" },
    { s: "vermarktung", t: "EAG-Förderung (Marktprämie/Investitionszuschuss) oder PPA", k: "vermarktung", m: 4, nach: ["elektrizitaetsrecht"], dok: ["Förderzusage (EAG-Abwicklungsstelle) oder PPA-Vertrag"], ohne: ["speicher"] },
    { s: "vermarktung", t: "Vermarktung (Regelenergie, Arbitrage, Tolling)", k: "vermarktung", m: 4, nach: ["elektrizitaetsrecht"], dok: ["Vermarktungsvertrag / Term Sheet"], nur: ["speicher"] },
    { s: "finanzierung", t: "Finanzierung (Financial Close)", k: "finanzierung", m: 3, nach: ["vermarktung"], dok: ["Kreditvertrag / Finanzierungszusage"] },
    { s: "epc_vergabe", t: "EPC-Vergabe", k: "bau", m: 2, nach: ["finanzierung"], dok: ["EPC-Vertrag"] },
    { s: "baubeginn", t: "Baubeginn", k: "bau", m: 1, nach: ["epc_vergabe"], dok: ["Baubeginnanzeige"], ext: "Baubeginn" },
    { s: "inbetriebnahme", t: "Inbetriebnahme", k: "bau", m: 5, nach: ["baubeginn"], phase: "cod", dok: ["Inbetriebnahmeprotokoll", "Fertigstellungsmeldung Netzbetreiber"], ext: "Inbetriebnahme" },
  ],
  CH: [
    { s: "flaechensicherung", t: "Flächensicherung (Dienstbarkeit/Baurecht, Pacht)", k: "flaeche", m: 3, nach: [], phase: "flaeche", dok: ["Dienstbarkeits- oder Pachtvertrag", "Grundbuchauszug"], ext: "Flächensicherung und Vertrag" },
    { s: "netzanfrage", t: "Anschlussgesuch beim Verteilnetzbetreiber", k: "netz", m: 1, nach: ["flaechensicherung"], dok: ["Anschlussgesuch"], ext: "Anfrage beim Netzbetreiber" },
    { s: "netzvertraeglichkeit", t: "Netzverträglichkeitsprüfung / Netzplanung", k: "netz", m: 2, nach: ["netzanfrage"], dok: ["Netzverträglichkeitsprüfung"], g: true },
    { s: "netzzusage", t: "Anschlusszusage Verteilnetzbetreiber", k: "netz", m: 3, nach: ["netzvertraeglichkeit"], phase: "netz", dok: ["Anschlusszusage"], ext: "Netzanschluss zugesagt" },
    { s: "gemeinde_vorgespraech", t: "Vorgespräch Gemeinde und Kanton", k: "gemeinde", m: 2, nach: ["flaechensicherung"], dok: ["Gesprächsprotokoll"], ext: "Gespräch mit Gemeinde und Kanton", ohne: GEBAEUDE },
    { s: "nutzungskonzept_agri", t: "Landwirtschaftliches Nutzungskonzept Agri-PV", k: "gutachten", m: 2, nach: ["flaechensicherung"], dok: ["Landwirtschaftliches Nutzungskonzept"], ext: "Nutzungskonzept für die Landwirtschaft", g: true, nur: ["agri"] },
    { s: "richtplan", t: "Richtplan-Abstimmung (Kanton)", k: "gemeinde", m: 6, nach: ["gemeinde_vorgespraech", "nutzungskonzept_agri"], phase: "aufstellung", dok: ["Stellungnahme Kanton / Richtplaneintrag"], ext: "Abstimmung mit dem Kanton", nur: FREI },
    { s: "gutachten_umwelt", t: "Umweltabklärung / Umweltverträglichkeitsbericht (falls UVP-pflichtig)", k: "gutachten", m: 6, nach: ["richtplan"], dok: ["Umweltbericht"], ext: "Umweltabklärung", g: true, nur: FREI },
    { s: "gutachten_landschaft", t: "Landschaftsbild / Sichtbarkeitsanalyse (Landschaftsschutz)", k: "gutachten", m: 2, nach: ["richtplan"], dok: ["Sichtbarkeitsanalyse"], g: true, nur: FREI },
    { s: "gutachten_blendung", t: "Blendgutachten", k: "gutachten", m: 2, nach: ["richtplan"], dok: ["Blendgutachten"], g: true, nur: FREI },
    { s: "gutachten_boden", t: "Geotechnisches Gutachten mit Rammtests", k: "gutachten", m: 2, nach: ["flaechensicherung"], dok: ["Geotechnisches Gutachten"], g: true, ohne: GEBAEUDE },
    { s: "gutachten_statik", t: "Statik-Gutachten (Tragwerk)", k: "gutachten", m: 2, nach: ["flaechensicherung"], dok: ["Statischer Nachweis"], g: true, nur: GEBAEUDE },
    { s: "gutachten_schall", t: "Lärmgutachten (Trafostationen, Wechselrichter)", k: "gutachten", m: 2, nach: ["richtplan"], dok: ["Lärmgutachten"], g: true, nur: ["freiflaeche", "agri"] },
    { s: "gutachten_schall", t: "Lärm- und Brandschutznachweis", k: "gutachten", m: 2, nach: ["flaechensicherung"], dok: ["Lärmgutachten", "Brandschutznachweis"], g: true, nur: ["speicher", "hybrid"] },
    { s: "nutzungsplan", t: "Nutzungsplanung / Sondernutzungsplan (Gemeinde)", k: "gemeinde", m: 6, nach: ["gutachten_umwelt", "gutachten_landschaft", "gutachten_blendung"], phase: "satzung", dok: ["Genehmigter Nutzungsplan"], ext: "Nutzungsplan genehmigt", nur: FREI },
    { s: "baubewilligung", t: "Baubewilligung (Gemeinde/Kanton)", k: "genehmigung", m: 3, nach: ["nutzungsplan", "netzzusage", "gutachten_schall", "gutachten_boden"], phase: "rtb", dok: ["Baubewilligung"], ext: "Baubewilligung – Projekt baureif", nur: FREI },
    { s: "baubewilligung", t: "Meldeverfahren (Art. 18a RPG) bzw. Baubewilligung", k: "genehmigung", m: 2, nach: ["gutachten_statik", "netzzusage"], phase: "rtb", dok: ["Meldebestätigung oder Baubewilligung"], ext: "Bewilligung – Projekt baureif", nur: GEBAEUDE },
    { s: "baubewilligung", t: "Baubewilligung (Speicher)", k: "genehmigung", m: 4, nach: ["gemeinde_vorgespraech", "gutachten_schall", "gutachten_boden", "netzzusage"], phase: "rtb", dok: ["Baubewilligung"], ext: "Bewilligung – Projekt baureif", nur: ["speicher"] },
    { s: "vermarktung", t: "Pronovo-Anmeldung (Einmalvergütung) oder PPA", k: "vermarktung", m: 3, nach: ["baubewilligung"], dok: ["Anmeldebestätigung Pronovo oder PPA-Vertrag"], ohne: ["speicher"] },
    { s: "vermarktung", t: "Vermarktung (Regelenergie, Arbitrage)", k: "vermarktung", m: 3, nach: ["baubewilligung"], dok: ["Vermarktungsvertrag / Term Sheet"], nur: ["speicher"] },
    { s: "finanzierung", t: "Finanzierung (Financial Close)", k: "finanzierung", m: 3, nach: ["vermarktung"], dok: ["Kreditvertrag / Finanzierungszusage"] },
    { s: "epc_vergabe", t: "EPC-Vergabe", k: "bau", m: 2, nach: ["finanzierung"], dok: ["EPC-Vertrag"] },
    { s: "baubeginn", t: "Baubeginn", k: "bau", m: 1, nach: ["epc_vergabe"], dok: ["Baubeginnmeldung"], ext: "Baubeginn" },
    { s: "inbetriebnahme", t: "Inbetriebnahme", k: "bau", m: 5, nach: ["baubeginn"], phase: "cod", dok: ["Inbetriebnahmeprotokoll", "Beglaubigung Herkunftsnachweise"], ext: "Inbetriebnahme" },
  ],
};

const passt = (x, typ) => (!x.nur || x.nur.includes(typ)) && (!x.ohne || !x.ohne.includes(typ));

/**
 * Meilenstein-Vorlage für Land und Typ: [{ schluessel, titel, kategorie, dauerMonate, nach, phase, dokumentPflicht, externTitel, gutachten }]
 * Abhängigkeiten auf nicht enthaltene Schritte werden durch deren (enthaltene) Vorgänger ersetzt.
 */
export function vorlage(land = "DE", typ = "freiflaeche") {
  const alle = SCHRITTE[land] || SCHRITTE.DE;
  const t = ENTWICKLUNG_TYPEN[typ] ? typ : "freiflaeche";
  const aktiv = alle.filter((x) => passt(x, t));
  const drin = new Set(aktiv.map((x) => x.s));
  // Vorgänger je Schlüssel über ALLE Varianten (für transitive Auflösung entfallener Schritte)
  const nachAlle = new Map();
  for (const x of alle) nachAlle.set(x.s, [...new Set([...(nachAlle.get(x.s) || []), ...x.nach])]);
  const aufloesen = (liste, gesehen = new Set()) => {
    const erg = [];
    for (const s of liste) {
      if (gesehen.has(s)) continue;
      gesehen.add(s);
      if (drin.has(s)) erg.push(s);
      else erg.push(...aufloesen(nachAlle.get(s) || [], gesehen));
    }
    return [...new Set(erg)];
  };
  return aktiv.map((x) => ({
    schluessel: x.s,
    titel: x.t,
    kategorie: x.k,
    dauerMonate: x.m,
    nach: aufloesen(x.nach),
    phase: x.phase || null,
    dokumentPflicht: x.dok || [],
    externTitel: x.ext || "",
    gutachten: !!x.g,
  }));
}

// ================================================================ Termine

const TAG = 86400e3;
export const isoTag = (d) => new Date(d).toISOString().slice(0, 10);
export const heuteIso = () => heuteLokal(); // Europe/Vienna (Überfälligkeit von Meilensteinen)
export function plusMonate(iso, monate) {
  const d = new Date(`${iso}T00:00:00Z`);
  const ganz = Math.floor(monate);
  const tag = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + ganz);
  d.setUTCDate(Math.min(tag, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate())); // 31.01. + 1 → 28.02. (nicht 03.03.)
  const rest = monate - ganz;
  if (rest) d.setTime(d.getTime() + Math.round(rest * 30.4 * TAG));
  return isoTag(d);
}
export const tageZwischen = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / TAG);
const maxIso = (liste) => liste.filter(Boolean).sort().at(-1) || null;

/** Effektives Ende eines Meilensteins für Nachfolger: Ist-Ende; offen und überfällig → heute (Prognose) */
export function effektivesEnde(m, heute = heuteIso(), prognose = true) {
  if (m.status === "erledigt") return m.istEnde || m.sollEnde;
  if (m.status === "entfaellt") return m.istEnde || m.sollStart || m.sollEnde;
  if (prognose && m.sollEnde && m.sollEnde < heute) return heute;
  return m.sollEnde;
}

/** Topologische Reihenfolge (Kreise werden am Ende angehängt, nie Endlosschleife) */
export function topologisch(meilensteine) {
  const nachId = new Map(meilensteine.map((m) => [m.id, m]));
  const erg = [];
  const status = new Map();
  const besuch = (m) => {
    if (status.get(m.id) === 2) return;
    if (status.get(m.id) === 1) return; // Kreis
    status.set(m.id, 1);
    for (const v of m.nach || []) if (nachId.has(v)) besuch(nachId.get(v));
    status.set(m.id, 2);
    erg.push(m);
  };
  for (const m of meilensteine) besuch(m);
  return erg;
}

/** Würde die Abhängigkeit `von → id` einen Kreis erzeugen? (von hängt dann an id) */
export function erzeugtKreis(meilensteine, id, neueVorgaenger) {
  const nachId = new Map(meilensteine.map((m) => [m.id, { ...m }]));
  if (nachId.has(id)) nachId.get(id).nach = neueVorgaenger;
  const gesehen = new Set();
  const stapel = [...neueVorgaenger];
  while (stapel.length) {
    const x = stapel.pop();
    if (x === id) return true;
    if (gesehen.has(x)) continue;
    gesehen.add(x);
    stapel.push(...(nachId.get(x)?.nach || []));
  }
  return false;
}

/**
 * Soll-Termine vorwärts rechnen: Start = max(effektives Ende der Vorgänger) bzw. Projektstart; Ende = Start + Dauer.
 * Erledigte Meilensteine behalten ihre Termine. `fixieren` = Meilensteine mit manuell gesetztem Soll behalten es.
 * `prognose` = überfällige, offene Vorgänger enden frühestens heute (verschiebt Nachfolger); ohne: Soll-Basis.
 * Liefert NEUE Objekte (sollStart, sollEnde gesetzt).
 */
export function planBerechnen(meilensteine, { start = heuteIso(), heute = heuteIso(), fixieren = true, prognose = true } = {}) {
  const neu = new Map();
  for (const m of topologisch(meilensteine)) {
    const x = { ...m };
    if (x.status !== "erledigt" && x.status !== "entfaellt" && !(fixieren && x.sollFix)) {
      const vorg = (x.nach || []).map((v) => neu.get(v)).filter(Boolean);
      const beginn = maxIso([start, ...vorg.map((v) => effektivesEnde(v, heute, prognose))]);
      const s = x.istStart || beginn;
      x.sollStart = s;
      x.sollEnde = plusMonate(s, Number(x.dauerMonate) || 1);
    }
    neu.set(x.id, x);
  }
  return meilensteine.map((m) => neu.get(m.id));
}

/**
 * Kritischer Pfad über Soll-/Prognose-Termine: Rückwärtsrechnung der spätesten Enden, Puffer ≤ 0 Tage = kritisch.
 * Liefert Map id → { puffer, kritisch, prognoseStart, prognoseEnde } und das Prognose-Ende des Projekts.
 */
export function kritischerPfad(meilensteine, { heute = heuteIso() } = {}) {
  const aktiv = meilensteine.filter((m) => m.status !== "entfaellt");
  const ids = new Set(aktiv.map((m) => m.id));
  // Prognose vorwärts (Verzug schiebt Nachfolger)
  const prog = new Map();
  for (const m of topologisch(aktiv)) {
    const dauer = Math.max(1, tageZwischen(m.sollStart || heute, m.sollEnde || heute));
    const vorg = (m.nach || []).filter((v) => ids.has(v)).map((v) => prog.get(v)).filter(Boolean);
    let start = m.status === "erledigt" ? m.istStart || m.sollStart : maxIso([m.istStart || m.sollStart, ...vorg.map((v) => v.ende)]);
    start = start || heute;
    let ende;
    if (m.status === "erledigt") ende = m.istEnde || m.sollEnde;
    else {
      ende = isoTag(new Date(`${start}T00:00:00Z`).getTime() + dauer * TAG);
      if (ende < heute) ende = heute;
    }
    prog.set(m.id, { start, ende, dauer });
  }
  const projektEnde = maxIso([...prog.values()].map((p) => p.ende)) || heute;
  const nachfolger = new Map(aktiv.map((m) => [m.id, []]));
  for (const m of aktiv) for (const v of m.nach || []) if (nachfolger.has(v)) nachfolger.get(v).push(m.id);
  const spaet = new Map();
  for (const m of [...topologisch(aktiv)].reverse()) {
    const nf = nachfolger.get(m.id) || [];
    const lf = nf.length ? nf.map((n) => isoTag(new Date(`${spaet.get(n)}T00:00:00Z`).getTime() - prog.get(n).dauer * TAG)).sort()[0] : projektEnde;
    spaet.set(m.id, lf);
  }
  const erg = new Map();
  for (const m of aktiv) {
    const p = prog.get(m.id);
    const puffer = tageZwischen(p.ende, spaet.get(m.id));
    erg.set(m.id, { puffer, kritisch: m.status !== "erledigt" && puffer <= 0, prognoseStart: p.start, prognoseEnde: p.ende });
  }
  return { je: erg, projektEnde };
}

/** Verzug in Tagen (> 0 = überfällig bzw. verspätet erledigt), sonst 0 */
export function verzugTage(m, heute = heuteIso()) {
  if (!m?.sollEnde || m.status === "entfaellt") return 0;
  if (m.status === "erledigt") return Math.max(0, m.istEnde ? tageZwischen(m.sollEnde, m.istEnde) : 0);
  return Math.max(0, tageZwischen(m.sollEnde, heute));
}
export const istUeberfaellig = (m, heute = heuteIso()) => !MEILENSTEIN_FERTIG.includes(m.status) && !!m.sollEnde && m.sollEnde < heute;

/** Fehlende Vorgänger (nicht erledigt/entfallen) – Erledigen ist erst danach möglich */
export function offeneVorgaenger(meilensteine, m) {
  const nachId = new Map(meilensteine.map((x) => [x.id, x]));
  return (m.nach || []).map((v) => nachId.get(v)).filter((v) => v && !MEILENSTEIN_FERTIG.includes(v.status));
}

// ================================================================ Phase & Pipeline-Wert

const PHASEN_IDS = PHASEN.map((p) => p.id);

/** Erreichte Phase = höchste Phase erledigter Meilensteine (null = Akquise, vor Flächensicherung) */
export function phaseAusMeilensteinen(meilensteine) {
  let best = -1;
  for (const m of meilensteine) if (m.status === "erledigt" && m.phase) best = Math.max(best, PHASEN_IDS.indexOf(m.phase));
  return best >= 0 ? PHASEN_IDS[best] : null;
}

export const phaseLabel = (id) => (id ? PHASEN.find((p) => p.id === id)?.kurz || id : "Akquise");

/** Pipeline-Wert = MWp × 1000 × €/kWp (Mitte der Phasenspanne) × Wahrscheinlichkeit */
export function pipelineWert({ mwp, phase, wahrscheinlichkeit = null }) {
  const p = PHASEN.find((x) => x.id === phase) || PHASEN[0];
  const preisProKwp = (p.preisProKwp.min + p.preisProKwp.max) / 2;
  const w = wahrscheinlichkeit !== null && wahrscheinlichkeit !== undefined && wahrscheinlichkeit !== "" ? Number(wahrscheinlichkeit) : ENTWICKLUNG.wahrscheinlichkeit[phase || "akquise"] ?? 0;
  const kwp = (Number(mwp) || 0) * 1000;
  const volumen = Math.round(kwp * preisProKwp);
  return { phase: phase || null, phaseLabel: phaseLabel(phase), preisProKwp, wahrscheinlichkeit: w, volumen, wert: Math.round(volumen * w), gewichtetMwp: Math.round((Number(mwp) || 0) * w * 100) / 100 };
}

/** Plan-Dauer bis COD über die Vorlage (Monate entlang des längsten Pfads) */
export function planMonate(schritte) {
  const ende = new Map();
  const nachS = new Map(schritte.map((s) => [s.schluessel, s]));
  const rechne = (s, tiefe = 0) => {
    if (ende.has(s.schluessel)) return ende.get(s.schluessel);
    if (tiefe > 60) return 0;
    const v = Math.max(0, ...s.nach.map((n) => (nachS.has(n) ? rechne(nachS.get(n), tiefe + 1) : 0)));
    const e = v + s.dauerMonate;
    ende.set(s.schluessel, e);
    return e;
  };
  return Math.max(0, ...schritte.map((s) => rechne(s)));
}

/** Grobe MWp-Schätzung aus Fläche (ha) für den Assistenten – Agri-PV mit größerem Reihenabstand */
export function mwpAusFlaeche(ha, { agri = false, haProMwp = 1.1 } = {}) {
  const x = Number(ha) || 0;
  return Math.round((x / (agri ? haProMwp * 1.6 : haProMwp)) * 10) / 10;
}

export const ZIEL_MWP_JAHR = ENTWICKLUNG.zielMwpJahr;

/** Quartal eines Datums (für vereinfachte Sichten): „Q3 2027“ */
export function quartal(iso) {
  if (!iso) return "";
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
}
