// src/lib/plattform/eg/eda/codes.js
//
// EDA-Marktkommunikation (WP2): Prozesse, Nachrichtencodes, Responsecodes, Fristen, Netzbetreiber-Anleitungen.
// Reine Daten. Python-Spiegel: plattform/eg_eda_kern.py (Abgleich per Testvektoren in eg/testdaten/eda/*.json).
//
// Quellen (Fachkonzept Abschnitte 2.4–2.7, 3.14, 10):
//  - Handlungsanweisung Energiegemeinschaften, Version II (Oesterreichs Energie, 04/2023) – „HA II“
//  - ebUtilities-Prozessbeschreibungen (ebutilities.at/prozesse/597, /396) und Schemas (ebutilities.at/schemas/160)
//  - Nachrichtencodes und Responsecodes zusätzlich nach Sekundärquelle (eegfaktura-Doku „Prozess-History“).
// Alles, was nur aus Sekundärquellen stammt, steht als (zu bestätigen) – vor Produktion gegen die offiziellen
// ebUtilities-Unterlagen (Prozessversionen ab 05.10.2026) abgleichen.
//
// Nachrichtenfluss Anmeldung (nach ebUtilities, zu bestätigen): Die Gemeinschaft sendet ANFORDERUNG_ECON (CMRequest).
// Der Netzbetreiber antwortet ANTWORT_ECON (Responsecode 99 = Anfrage angenommen, Zustimmung beim Kunden angefordert),
// danach ZUSTIMMUNG_ECON (Kunde hat im Netzbetreiber-Portal zugestimmt, mit Consent-ID) und ABSCHLUSS_ECON (Zuordnung
// aktiv ab Datum) – oder ABLEHNUNG_ECON mit Responsecode. Die Ereignisnamen des Teilnahme-Automaten (WP1, modell.js)
// werden darauf abgebildet: ANTWORT_ECON 99 → anforderung_econ, ANTWORT_ECON mit Technik-Code nach Zustimmung → antwort_econ.

export const EDA_STAND = "2026-10-01";

/** Ausgehender Standard-Absender-Sektor (Strom) */
export const SEKTOR_STROM = "01";

// ---------------------------------------------------------------- Prozesse (Fachkonzept 3.14)

/**
 * Prozesscodes. `richtung`: wer startet (aus = Gemeinschaft, ein = Netzbetreiber), `start`: erster Nachrichtencode,
 * `antworten`: erwartete Eingänge, `schema`/`version`: Schema laut Sekundärquelle (zu bestätigen), `teilnahme`: Prozess
 * hängt an genau einer Teilnahme, `intern`: kein EDA-Prozess (z. B. Reklamation per E-Mail).
 */
export const EDA_PROZESSE = {
  EC_REQ_ONL: { label: "Anmeldung mit Online-Zustimmung", kurz: "Anmeldung", richtung: "aus", start: "ANFORDERUNG_ECON", antworten: ["ANTWORT_ECON", "ZUSTIMMUNG_ECON", "ABSCHLUSS_ECON", "ABLEHNUNG_ECON", "EDASendError"], schema: "CMRequest", version: "01.30", teilnahme: true, quelle: "HA II 5.1; ebutilities.at/prozesse/597" },
  EC_REQ_OFF: { label: "Anmeldung mit Offline-Zustimmung (QR-Code)", kurz: "Anmeldung offline", richtung: "aus", start: "ANFORDERUNG_ECON", antworten: ["ANTWORT_ECON", "ZUSTIMMUNG_ECON", "ABSCHLUSS_ECON", "ABLEHNUNG_ECON", "EDASendError"], schema: "CMRequest", version: "01.30", teilnahme: true, quelle: "HA II 5.2 (QR-Code 30 Tage gültig, danach 5 Tage Widerruf)" },
  EC_PRTFACT_CHG: { label: "Änderung des Teilnahmefaktors", kurz: "TF-Änderung", richtung: "aus", start: "ANFORDERUNG_CPF", antworten: ["ANTWORT_CPF", "ABLEHNUNG_CPF", "EDASendError"], schema: "CPRequest", version: "01.12", teilnahme: true, quelle: "HA II 5.6; ElWG § 71 Abs. 5 (1 Änderung je Tag bis 01.04.2028)" },
  EC_PRT_CHANGE: { label: "Änderung des Aufteilungsschlüssels (statisch)", kurz: "Schlüssel-Änderung", richtung: "aus", start: "ANFORDERUNG_CPF", antworten: ["ANTWORT_CPF", "ABLEHNUNG_CPF", "EDASendError"], schema: "CPRequest", version: "01.12", teilnahme: true, quelle: "HA II 8, 12.2 (Normierung erst über 100 %)" },
  EC_PODLIST: { label: "Zählpunktliste anfordern (Abgleich)", kurz: "Zählpunktliste", richtung: "aus", start: "ANFORDERUNG_ECP", antworten: ["SENDEN_ECP", "ABLEHNUNG_ECP", "EDASendError"], schema: "ECMPList", version: "01.10", teilnahme: false, quelle: "HA II 5.5; ebutilities.at/prozesse/396" },
  CM_REV_SP: { label: "Abmeldung durch die Gemeinschaft", kurz: "Abmeldung", richtung: "aus", start: "AUFHEBUNG_CCMS", antworten: ["ANTWORT_CCMS", "ABLEHNUNG_CCMS", "EDASendError"], schema: "CMRevoke", version: "01.10", teilnahme: true, quelle: "HA II 9; Fachkonzept 2.7 (nicht rückwirkend)" },
  CM_REV_CUS: { label: "Widerruf durch das Mitglied (Netzbetreiber-Portal)", kurz: "Widerruf", richtung: "ein", start: "AUFHEBUNG_CCMS", antworten: [], schema: "CMRevoke", version: "01.10", teilnahme: true, quelle: "Fachkonzept 2.7" },
  CM_REV_IMP: { label: "Implizite Abmeldung (Auszug / vertragsloser Zustand)", kurz: "Implizite Abmeldung", richtung: "ein", start: "AUFHEBUNG_CCMS", antworten: [], schema: "CMRevoke", version: "01.10", teilnahme: true, quelle: "Fachkonzept 2.7" },
  CR_REQ_PT: { label: "Nachforderung von Energiedaten", kurz: "Nachforderung", richtung: "aus", start: "ANFORDERUNG_PT", antworten: ["ANTWORT_PT", "ABLEHNUNG_PT", "DATEN_CRMSG", "EDASendError"], schema: "CPRequest", version: "01.12", teilnahme: true, quelle: "Fachkonzept 2.5 (eegfaktura-Doku, zu bestätigen)" },
  CR_MSG: { label: "Empfang Energiedaten (Gemeinschaftsanteile)", kurz: "Energiedaten", richtung: "ein", start: "DATEN_CRMSG", antworten: [], schema: "ConsumptionRecord", version: "01.30", teilnahme: false, quelle: "HA II 13 (täglich; ab 10/2026 höchstens 2 Läufe je Tag, zu bestätigen)" },
  REKLAMATION: { label: "Datenqualitäts-Reklamation an den Netzbetreiber", kurz: "Reklamation", richtung: "aus", start: "REKLAMATION_NB", antworten: ["ANTWORT_NB"], schema: "", version: "", teilnahme: false, intern: true, quelle: "Plattform-Ablauf; schriftliche Dokumentation für die Schlichtungsstelle der E-Control" },
};

// ---------------------------------------------------------------- Nachrichtencodes (Fachkonzept 3.14)

/** `richtung` aus Sicht der Gemeinschaft; `schema` = Wurzelelement im kanonischen XML (eda/schema.js) */
export const EDA_NACHRICHTEN = {
  ANFORDERUNG_ECON: { label: "Anmeldung (Anforderung Zuordnung)", richtung: "aus", schema: "CMRequest" },
  ANTWORT_ECON: { label: "Antwort Netzbetreiber (Anmeldung)", richtung: "ein", schema: "CMNotification" },
  ZUSTIMMUNG_ECON: { label: "Zustimmung des Kunden", richtung: "ein", schema: "CMNotification" },
  ABLEHNUNG_ECON: { label: "Ablehnung (Anmeldung)", richtung: "ein", schema: "CMNotification" },
  ABSCHLUSS_ECON: { label: "Abschluss – Zuordnung aktiv", richtung: "ein", schema: "ECMPList" },
  ANFORDERUNG_CPF: { label: "Änderung Teilnahmefaktor bzw. Schlüssel", richtung: "aus", schema: "CPRequest" },
  ANTWORT_CPF: { label: "Änderung bestätigt", richtung: "ein", schema: "CPNotification" },
  ABLEHNUNG_CPF: { label: "Änderung abgelehnt", richtung: "ein", schema: "CPNotification" },
  AUFHEBUNG_CCMS: { label: "Aufhebung der Zuordnung", richtung: "beide", schema: "CMRevoke" },
  ANTWORT_CCMS: { label: "Aufhebung bestätigt", richtung: "ein", schema: "CMNotification" },
  ABLEHNUNG_CCMS: { label: "Aufhebung abgelehnt", richtung: "ein", schema: "CMNotification" },
  ANFORDERUNG_PT: { label: "Nachforderung Energiedaten", richtung: "aus", schema: "CPRequest" },
  ANTWORT_PT: { label: "Nachforderung angenommen", richtung: "ein", schema: "CPNotification" },
  ABLEHNUNG_PT: { label: "Nachforderung abgelehnt", richtung: "ein", schema: "CPNotification" },
  ANFORDERUNG_ECP: { label: "Zählpunktliste anfordern (zu bestätigen)", richtung: "aus", schema: "CPRequest" },
  SENDEN_ECP: { label: "Zählpunktliste der Gemeinschaft", richtung: "ein", schema: "ECMPList" },
  ABLEHNUNG_ECP: { label: "Zählpunktliste abgelehnt", richtung: "ein", schema: "CPNotification" },
  DATEN_CRMSG: { label: "Energiedaten (Viertelstundenwerte)", richtung: "ein", schema: "ConsumptionRecord" },
  ABLEHNUNG_CRMSG: { label: "Energiedaten zurückgewiesen", richtung: "aus", schema: "CPNotification" },
  EDASendError: { label: "Zustellfehler der EDA-Plattform", richtung: "ein", schema: "EDASendError" },
  REKLAMATION_NB: { label: "Reklamation an den Netzbetreiber (E-Mail)", richtung: "aus", schema: "", intern: true },
  ANTWORT_NB: { label: "Antwort des Netzbetreibers auf die Reklamation", richtung: "ein", schema: "", intern: true },
};

/** Welche Nachrichtencodes zu welchem Prozess gehören dürfen (Plausibilität beim Parsen) */
export const NACHRICHT_PROZESSE = Object.fromEntries(
  Object.keys(EDA_NACHRICHTEN).map((c) => [c, Object.entries(EDA_PROZESSE).filter(([, p]) => p.start === c || p.antworten.includes(c)).map(([k]) => k)]),
);

// ---------------------------------------------------------------- Prozess-Status

export const PROZESS_STATUS = {
  freigabe_offen: { label: "Freigabe offen (Vier-Augen)", ton: "warn", offen: true },
  entwurf: { label: "Wartet auf Versand", ton: "neutral", offen: true },
  gesendet: { label: "Gesendet – Antwort offen", ton: "info", offen: true },
  bestaetigt: { label: "Vom Netzbetreiber angenommen – läuft", ton: "info", offen: true },
  abgeschlossen: { label: "Abgeschlossen", ton: "ok", offen: false },
  abgelehnt: { label: "Abgelehnt", ton: "warn", offen: false },
  fehler: { label: "Fehler (Klärfall)", ton: "warn", offen: false },
  zeitueberschreitung: { label: "Zeitüberschreitung", ton: "warn", offen: false },
  verworfen: { label: "Verworfen", ton: "neutral", offen: false },
};
export const PROZESS_OFFEN = Object.keys(PROZESS_STATUS).filter((k) => PROZESS_STATUS[k].offen);

// ---------------------------------------------------------------- Fristen und Plattform-Regeln

export const EDA_FRISTEN = {
  zustimmungTage: 30, // Zustimmung im Netzbetreiber-Portal (Fachkonzept 2.4 Z 4; Marktanalyse: Altregel 10 Werktage) (zu bestätigen)
  offlineWiderrufTage: 5, // EC_REQ_OFF: Widerrufsfrist nach Zustimmung (Fachkonzept 2.4)
  antwortTage: 2, // Plattform-Regel: ohne Antwort der EDA-Plattform nach 2 Tagen erneut senden
  maxVersuche: 3, // Plattform-Regel: danach Zeitüberschreitung + Klärfall
  backoffTage: [2, 4, 8], // Abstand der Wiederholungen
  technikHinweisTage: 60, // Smart-Meter-Einbau bis zu 2 Monate (HA II 5.1.1, zu bestätigen)
  nachforderungTage: 5, // Plattform-Regel: Daten nach angenommener Nachforderung binnen 5 Tagen erwartet
  reklamationAntwortTage: 14, // Plattform-Regel: Antwortfrist für Reklamationen, danach Eskalation
  l3ErsatzTage: 60, // L3-Werte spätestens nach 60 Tagen durch L1/L2 ersetzt (HA II 2.3.1, 13.1)
  l3ErsatzTageBeg: 15, // BEG/VEZ: binnen 15 Kalendertagen, sonst Bewertung mit 0 (HA II 13.1)
  datenVerzugTage: 2, // Energiedaten D+1; ab 2 Tagen Verzug gilt ein Tag als Lücke (Plattform-Regel)
  erinnerungTage: [2, 7, 14, 21, 27], // Erinnerungen an das Mitglied nach Anforderung der Zustimmung (Plattform-Regel)
};
/** Ab dieser Anzahl Teilnahmen in einem Auftrag ist eine Abmeldung bzw. TF-Massenänderung freizugeben (Vier-Augen, Fachkonzept 5) */
export const VIER_AUGEN_AB = 3;
/** Höchstens so viele Teilnahmen je Massenaktion (Schutz vor Fehlbedienung) */
export const MASSEN_MAX = 500;

// ---------------------------------------------------------------- Responsecodes

/**
 * Klartexte der Responsecodes mit Handlungsempfehlung. Kategorie: ok, info, stammdaten, kunde, technik, konflikt, frist.
 * Quelle: Sekundärquelle (eegfaktura-Doku) und HA II – alle Codes und Texte (zu bestätigen) gegen die offizielle
 * Responsecode-Liste auf ebutilities.at. `erneut`: Neustart nach Korrektur sinnvoll.
 */
export const RESPONSECODES = {
  "56": { text: "Zählpunkt nicht gefunden", kategorie: "stammdaten", erneut: true, loesung: "Zählpunktnummer mit der Netzrechnung vergleichen (33 Zeichen, AT + Netzbetreibernummer + PLZ) und korrigieren, dann erneut anmelden." },
  "57": { text: "Zählpunkt nicht versorgt bzw. nicht aktiv", kategorie: "stammdaten", erneut: true, loesung: "Mit dem Mitglied klären, ob der Anschluss aktiv ist (Neubau, Abmeldung, Lieferantenwechsel); nach Aktivierung erneut anmelden." },
  "76": { text: "Ungültige Anforderungsdaten", kategorie: "stammdaten", erneut: true, loesung: "Gemeinschafts-ID, Energierichtung, Teilnahmefaktor und Datum prüfen; Rohnachricht im Journal ansehen." },
  "82": { text: "Prozessdatum ungültig", kategorie: "stammdaten", erneut: true, loesung: "Prozessdatum prüfen (Abmeldung nicht rückwirkend, Änderung nicht in der Vergangenheit)." },
  "86": { text: "Konflikt mit einem laufenden Prozess", kategorie: "konflikt", erneut: true, loesung: "Laufenden Prozess am Zählpunkt abwarten (z. B. offene Anmeldung oder Änderung), danach erneut senden." },
  "94": { text: "Keine Daten im angeforderten Zeitraum", kategorie: "info", erneut: false, loesung: "Zeitraum prüfen (vor Aktivierung gibt es keine Gemeinschaftsdaten); bei Lücken nach Aktivierung Reklamation vorbereiten." },
  "99": { text: "Meldung erhalten – Anfrage angenommen", kategorie: "ok", erneut: false, loesung: "" },
  "104": { text: "Falsche Energierichtung", kategorie: "stammdaten", erneut: true, loesung: "Richtung des Zählpunkts (Verbrauch/Erzeugung) in den Stammdaten korrigieren und erneut anmelden." },
  "158": { text: "Zählpunkt für diese Gemeinschaft nicht teilnahmeberechtigt (Nahebereich)", kategorie: "stammdaten", erneut: false, loesung: "Nahebereich (Trafostation bzw. Umspannwerk) beim Netzbetreiber erfragen (ElWG § 70 Abs. 6, Auskunft binnen 14 Tagen); ggf. BEG statt EEG." },
  "172": { text: "Kunde hat die Zustimmung abgelehnt", kategorie: "kunde", erneut: true, loesung: "Mit dem Mitglied sprechen (Missverständnis im Netzbetreiber-Portal?); bei Einverständnis erneut anmelden." },
  "173": { text: "Kunde hat nicht fristgerecht zugestimmt (Zeitüberschreitung)", kategorie: "frist", erneut: true, loesung: "Mitglied mit Anleitung für das Netzbetreiber-Portal erinnern und Anmeldung erneut anstoßen." },
  "174": { text: "Angefragte Daten nicht lieferbar", kategorie: "technik", erneut: false, loesung: "Netzbetreiber nach dem Grund fragen (Messung, Zählertausch); ggf. Reklamation vorbereiten." },
  "175": { text: "Zustimmung erteilt", kategorie: "ok", erneut: false, loesung: "" },
  "178": { text: "Zuordnung bzw. Consent besteht bereits", kategorie: "konflikt", erneut: false, loesung: "Zählpunktliste (EC_PODLIST) anfordern und Bestand abgleichen – die Teilnahme ist vermutlich schon aktiv." },
  "179": { text: "Consent-ID unbekannt", kategorie: "stammdaten", erneut: false, loesung: "Consent-ID per Zählpunktliste (EC_PODLIST) abgleichen; bei Altfällen vor dem 03.10.2022 lautet sie „Migration“ (HA II 7.2)." },
  "181": { text: "Gemeinschafts-ID unbekannt", kategorie: "stammdaten", erneut: true, loesung: "Gemeinschafts-ID (33 Zeichen) mit dem Betreibervertrag vergleichen; nach Umwandlung neue ID verwenden." },
  "182": { text: "Kein fernauslesbarer Zähler (Smart Meter fehlt)", kategorie: "technik", erneut: false, loesung: "Smart-Meter-Einbau bzw. Viertelstundenmessung beim Netzbetreiber anstoßen (bis zu 2 Monate, HA II 5.1.1); der Prozess läuft weiter." },
  "183": { text: "Summe der Teilnahmefaktoren über 100 %", kategorie: "konflikt", erneut: true, loesung: "Mitglied nach Teilnahmen in anderen Gemeinschaften fragen; Teilnahmefaktor senken (Σ ≤ 100 %, ElWG § 71 Abs. 5) und erneut anmelden." },
  "185": { text: "Höchstzahl gleichzeitiger Teilnahmen erreicht (5)", kategorie: "konflikt", erneut: false, loesung: "Der Zählpunkt nimmt bereits an 5 Gemeinschaften teil (ElWG § 71 Abs. 5); Mitglied muss zuerst eine Teilnahme beenden." },
};
/** Responsecodes, bei denen der Kunde nicht (rechtzeitig) zugestimmt hat */
export const CODES_KEINE_ZUSTIMMUNG = ["173"];
/** Responsecodes, die nach erteilter Zustimmung „Technik ausständig“ bedeuten */
export const CODES_TECHNIK = ["182"];

export function responsecodeInfo(code) {
  const c = String(code ?? "").trim();
  if (!c) return { code: "", text: "", kategorie: "", erneut: false, loesung: "", bekannt: false };
  const r = RESPONSECODES[c];
  return r ? { code: c, ...r, bekannt: true } : { code: c, text: `Responsecode ${c}`, kategorie: "unbekannt", erneut: false, loesung: "Code in der Responsecode-Liste auf ebutilities.at nachschlagen und in eda/codes.js ergänzen.", bekannt: false };
}

// ---------------------------------------------------------------- Energiedaten (CR_MSG) – Kennzahlen je Größe

/**
 * MeterCode (OBIS-ähnlich) → Größe laut modell.js MESS_GROESSEN. Zuordnung nach Sekundärquelle nur teilweise belegt –
 * gesamte Tabelle (zu bestätigen) gegen die ConsumptionRecord-Dokumentation von ebUtilities. Unbekannte Codes werden
 * beim Empfang als Hinweis gemeldet und nicht weitergegeben.
 */
export const METER_CODES = {
  "1-1:1.9.0 G.01": "verbrauch_gemessen",
  "1-1:1.9.0 P.01": "verbrauch_tf",
  "1-1:2.9.0 G.02": "anteil_erzeugung",
  "1-1:2.9.0 G.03": "eigendeckung",
  "1-1:2.9.0 G.04": "eigendeckung_ee",
  "1-1:2.9.0 G.01": "erzeugung_gemessen",
  "1-1:2.9.0 P.01": "erzeugung_tf",
  "1-1:2.9.0 G.05": "restueberschuss",
};
export const GROESSE_METER_CODE = Object.fromEntries(Object.entries(METER_CODES).map(([k, v]) => [v, k]));
export const GROESSEN_JE_RICHTUNG = {
  verbrauch: ["verbrauch_gemessen", "verbrauch_tf", "anteil_erzeugung", "eigendeckung"],
  erzeugung: ["erzeugung_gemessen", "erzeugung_tf", "restueberschuss"],
};
export const QUALITAETEN = ["L1", "L2", "L3"];

// ---------------------------------------------------------------- Netzbetreiber-Portale (Zustimmung des Mitglieds)

/**
 * Anleitung je Netzbetreiber für die Zustimmung im Kundenportal (größter Schmerzpunkt laut Marktanalyse 4.1: Mitglieder
 * vergessen die Frist oder scheitern an der Bedienung). Portalnamen und Menüpfade (zu bestätigen) – die Portale ändern
 * sich; vor dem Versand an Mitglieder prüfen. Ohne Eintrag gilt die allgemeine Anleitung.
 */
export const PORTAL_ANLEITUNGEN = {
  allgemein: {
    portal: "Smart-Meter- bzw. Kundenportal Ihres Netzbetreibers",
    schritte: [
      "Im Smart-Meter- bzw. Kundenportal Ihres Netzbetreibers anmelden. Noch kein Zugang? Registrieren Sie sich mit Zählpunktnummer und Kunden- bzw. Vertragskontonummer von Ihrer Netzrechnung; manche Netzbetreiber senden einen Aktivierungscode per Post.",
      "Den Bereich „Energiegemeinschaften“ bzw. „Datenfreigaben“ öffnen.",
      "Die Anfrage der Gemeinschaft prüfen: Name, Gemeinschafts-ID, Zählpunkt und Teilnahmefaktor müssen mit unserer E-Mail übereinstimmen.",
      "„Zustimmen“ wählen und bestätigen. Fertig – wir sehen die Zustimmung automatisch.",
    ],
    hinweis: "Ohne Zustimmung lehnt der Netzbetreiber die Anmeldung nach Fristablauf ab. Sie können die Zustimmung jederzeit im Portal widerrufen.",
  },
  "ENB-WIEN": { portal: "Smart Meter-Webportal der Wiener Netze (zu bestätigen)", schritte: null, hinweis: "" },
  "ENB-NOE": { portal: "Smart Meter Portal der Netz Niederösterreich (zu bestätigen)", schritte: null, hinweis: "" },
  "ENB-OOE": { portal: "eService-Portal der Netz Oberösterreich (zu bestätigen)", schritte: null, hinweis: "" },
  "ENB-LINZ": { portal: "Kundenportal der LINZ NETZ (zu bestätigen)", schritte: null, hinweis: "" },
  "ENB-SBG": { portal: "Kundenportal der Salzburg Netz (zu bestätigen)", schritte: null, hinweis: "" },
  "ENB-TIROL": { portal: "Kundenportal der TINETZ (zu bestätigen)", schritte: null, hinweis: "" },
  "ENB-KTN": { portal: "„Mein Portal“ der KNG-Kärnten Netz", schritte: null, hinweis: "" },
  "ENB-STMK": { portal: "Kundenportal der Energienetze Steiermark (zu bestätigen)", schritte: null, hinweis: "" },
  "ENB-VBG": { portal: "Kundenportal der Vorarlberger Energienetze (zu bestätigen)", schritte: null, hinweis: "" },
  "ENB-BGLD": { portal: "Kundenportal der Netz Burgenland (zu bestätigen)", schritte: null, hinweis: "" },
};

export function portalAnleitung(netzbetreiberId) {
  const a = PORTAL_ANLEITUNGEN.allgemein;
  const x = PORTAL_ANLEITUNGEN[netzbetreiberId] || {};
  return { portal: x.portal || a.portal, schritte: x.schritte || a.schritte, hinweis: x.hinweis || a.hinweis };
}
