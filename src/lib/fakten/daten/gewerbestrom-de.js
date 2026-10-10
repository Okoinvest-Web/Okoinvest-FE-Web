// src/lib/fakten/daten/gewerbestrom-de.js
//
// Rechnungs-Check Gewerbestrom Deutschland (Welle 3, Paket B5 – Preisradar Schritt 1).
// Vertrag: ../schema.js. Eingebunden in ../index.js; NUR über src/lib/fakten/index.js importieren
// (Ausnahme: Tests in diesem Ordner). Genutzt von src/lib/rechner/gewerbestrom.js.
//
// Inhalt (alle Werte netto, ohne Umsatzsteuer):
//   Umlagen 2026        KWKG-Umlage, Offshore-Netzumlage, Aufschlag für besondere Netznutzung (mit Staffel über 1 GWh)
//                       – am Original netztransparenz.de geprüft (09.10.2026). Die Werte 2027 stehen als offene
//                       Versionen derselben id in umlagen-2027.js (Paket FRI, Veröffentlichung bis 25.10.2026).
//   Stromsteuer         Regelsatz § 3 StromStG, Entlastung § 9b StromStG (Betrag je MWh und Sockel 250 €/Jahr)
//   Konzessionsabgabe   Höchstbeträge § 2 KAV: Sondervertragskunden, Tarifkunden nach Gemeindegröße, Schwachlast,
//                       Abgrenzung Tarif-/Sondervertragskunde in Niederspannung (§ 2 Abs. 7 KAV)
//   Börse               Day-Ahead DE/LU, Monatsmittel und Profil (Monat × Tagtyp × Stunde) der letzten 12 Monate
//                       aus SMARD (Bundesnetzagentur | SMARD.de, CC BY 4.0); abgeleitet mit
//                       scripts/gewerbestrom-smard.mjs – monatlich aktualisieren (gueltigBis erzwingt die Prüfung)
//   Einschätzung        Lieferantenaufschlag über dem Börsenwert (Klasse C, eigene Einschätzung, zu prüfen)
//
// Nicht enthalten (bewusst): Netzentgelte einzelner Netzbetreiber (Schritt 2, Masterplan Abschnitt 6),
// Versorgermarken, Endpreise, EEX-/EPEX-Daten, Begrenzungen für stromkostenintensive Unternehmen (§§ 30 ff. EnFG).

const ABRUF = "2026-10-09";
const B5 = "Paket B5 (Wert am Original 09.10.2026) · Zweitprüfung TODO-E6";
const OFFEN = "TODO-E6 · Fachprüfung Team Deutschland (Energieversorger DE)";

const Q = {
  kwkg: { titel: "netztransparenz.de – KWKG-Umlage (Übertragungsnetzbetreiber), Jahreswert 2026", url: "https://www.netztransparenz.de/de-de/Erneuerbare-Energien-und-Umlagen/KWKG/KWKG-Umlage" },
  offshore: {
    titel: "netztransparenz.de – Offshore-Netzumlage 2026 (Übertragungsnetzbetreiber)",
    url: "https://www.netztransparenz.de/de-de/Erneuerbare-Energien-und-Umlagen/Sonstige-Umlagen/Offshore-Netzumlage/Offshore-Netzumlagen-%C3%9Cbersicht/Offshore-Netzumlage-2026",
  },
  aufschlag: {
    titel: "netztransparenz.de – Aufschlag für besondere Netznutzung 2026 je Letztverbrauchergruppe (Tz. 7 BK8-24-001-A)",
    url: "https://www.netztransparenz.de/de-de/Erneuerbare-Energien-und-Umlagen/Sonstige-Umlagen/Aufschlag-f%C3%BCr-besondere-Netznutzung-19-StromNEV-Umlage/%C3%9Cbersicht-Aufschlag-f%C3%BCr-besondere-Netznutzung/Aufschlag-f%C3%BCr-besondere-Netznutzung-2026",
  },
  stromstg3: { titel: "Stromsteuergesetz (StromStG), § 3 Steuertarif", url: "https://www.gesetze-im-internet.de/stromstg/__3.html" },
  stromstg9b: { titel: "Stromsteuergesetz (StromStG), § 9b Steuerentlastung für Unternehmen", url: "https://www.gesetze-im-internet.de/stromstg/__9b.html" },
  kav: { titel: "Konzessionsabgabenverordnung (KAV), § 2 Bemessung und zulässige Höhe", url: "https://www.gesetze-im-internet.de/kav/__2.html" },
  smard: { titel: "Bundesnetzagentur | SMARD.de – Großhandelspreise Day-Ahead DE/LU (CC BY 4.0)", url: "https://www.smard.de/home/marktdaten" },
  eigen: { titel: "Eigene Einschätzung ÖkoInvest (Rechnungs-Check Gewerbestrom)", url: null, art: "eigen" },
};

const amtlich = (id, wert, einheit, quelle, notiz, extra = {}) => ({
  id,
  wert,
  einheit,
  land: "DE",
  quelle,
  abruf: ABRUF,
  gueltigAb: null,
  gueltigBis: null,
  status: "geprueft",
  pruefer: B5,
  klasse: "A",
  notiz,
  ...extra,
});

const JAHR_2026 = { gueltigAb: "2026-01-01", gueltigBis: "2026-12-31" };

/* ------------------------------------------------------------------ */
/* Umlagen 2026 (bundesweit einheitlich)                               */
/* ------------------------------------------------------------------ */

const UMLAGEN_2026 = [
  amtlich("umlage.kwkg", 0.446, "ct/kWh", Q.kwkg, "KWKG-Umlage 2026 nach §§ 10, 11 EnFG; netztransparenz.de Jahresreihe „2026;0,446“. Begrenzungen für stromkostenintensive Unternehmen (§§ 30 ff. EnFG) nicht berücksichtigt.", JAHR_2026),
  amtlich("umlage.offshoreNetz", 0.941, "ct/kWh", Q.offshore, "Offshore-Netzumlage 2026 (§ 17f EnWG i. V. m. EnFG), Seite „Offshore-Netzumlage 2026“: 0,941 ct/kWh.", JAHR_2026),
  amtlich(
    "umlage.besondereNetznutzung",
    1.559,
    "ct/kWh",
    Q.aufschlag,
    "Letztverbrauchergruppe A‘: jeweils erste 1.000.000 kWh je Abnahmestelle (Seite „Aufschlag für besondere Netznutzung 2026“).",
    JAHR_2026
  ),
  amtlich(
    "umlage.besondereNetznutzung.ueber1Gwh",
    0.05,
    "ct/kWh",
    Q.aufschlag,
    "Letztverbrauchergruppe B‘: Strombezug über 1.000.000 kWh je Abnahmestelle, höchstens 0,050 ct/kWh.",
    JAHR_2026
  ),
  amtlich(
    "umlage.besondereNetznutzung.ueber1GwhProduzierend",
    0.025,
    "ct/kWh",
    Q.aufschlag,
    "Letztverbrauchergruppe C‘: produzierendes Gewerbe, schienengebundener Verkehr, Eisenbahninfrastruktur mit Stromkosten über 4 % des Umsatzes im Vorjahr – Bezug über 1.000.000 kWh höchstens 0,025 ct/kWh.",
    JAHR_2026
  ),
  amtlich("umlage.besondereNetznutzung.grenzeKwh", 1000000, "kWh", Q.aufschlag, "Grenze der Letztverbrauchergruppen A‘/B‘/C‘ je Abnahmestelle und Jahr.", JAHR_2026),
];

/* ------------------------------------------------------------------ */
/* Stromsteuer                                                         */
/* ------------------------------------------------------------------ */

const STROMSTEUER = [
  amtlich("steuer.strom.regelsatz", 2.05, "ct/kWh", Q.stromstg3, "§ 3 StromStG: 20,50 Euro je Megawattstunde."),
  amtlich(
    "steuer.strom.entlastung9b",
    2.0,
    "ct/kWh",
    Q.stromstg9b,
    "§ 9b Abs. 2 StromStG: Entlastung 20 Euro je Megawattstunde auf Antrag für Unternehmen des Produzierenden Gewerbes und der Land- und Forstwirtschaft (betriebliche Zwecke, Einschränkungen nach Abs. 1–1b; nicht für Elektromobilität). Auf der Rechnung steht in der Regel der Regelsatz; die Entlastung erstattet das Hauptzollamt."
  ),
  amtlich("steuer.strom.entlastung9bSockel", 250, "€/a", Q.stromstg9b, "§ 9b Abs. 2 Satz 2 StromStG: Entlastung nur, soweit der Entlastungsbetrag im Kalenderjahr 250 Euro übersteigt."),
];

/* ------------------------------------------------------------------ */
/* Konzessionsabgabe (Höchstbeträge)                                   */
/* ------------------------------------------------------------------ */

const KAV = [
  amtlich("kav.sondervertrag", 0.11, "ct/kWh", Q.kav, "§ 2 Abs. 3 Nr. 1 KAV: Höchstbetrag bei Strom für Sondervertragskunden. Nach § 2 Abs. 4 KAV entfällt die Abgabe, wenn der Durchschnittspreis (inkl. Netzentgelt) unter dem amtlichen Grenzpreis liegt – im Check nicht gerechnet, nur als Hinweis."),
  amtlich(
    "kav.tarif",
    [
      { id: "bis25", label: "bis 25.000 Einwohner", ct: 1.32 },
      { id: "bis100", label: "bis 100.000 Einwohner", ct: 1.59 },
      { id: "bis500", label: "bis 500.000 Einwohner", ct: 1.99 },
      { id: "ueber500", label: "über 500.000 Einwohner", ct: 2.39 },
    ],
    "ct/kWh",
    Q.kav,
    "§ 2 Abs. 2 Nr. 1 b KAV: Höchstbeträge für Tarifkunden (kein Schwachlaststrom) nach Einwohnerzahl der Gemeinde; maßgeblich ist die amtlich fortgeschriebene Einwohnerzahl des Statistischen Landesamts."
  ),
  amtlich("kav.schwachlast", 0.61, "ct/kWh", Q.kav, "§ 2 Abs. 2 Nr. 1 a KAV: Schwachlaststrom von Tarifkunden."),
  amtlich(
    "kav.tarifGrenze",
    { kw: 30, kwh: 30000 },
    "kW / kWh",
    Q.kav,
    "§ 2 Abs. 7 KAV: Lieferungen aus dem Niederspannungsnetz gelten als Tariflieferungen, es sei denn, die gemessene Leistung übersteigt in mindestens zwei Monaten des Abrechnungsjahres 30 kW UND der Jahresverbrauch beträgt mehr als 30.000 kWh (je Abnahmestelle). Netzbetreiber und Gemeinde können niedrigere Werte vereinbaren."
  ),
];

/* ------------------------------------------------------------------ */
/* Börse: Day-Ahead DE/LU aus SMARD (CC BY 4.0)                         */
/* ------------------------------------------------------------------ */

const SMARD = { abruf: ABRUF, gueltigAb: "2026-10-01", gueltigBis: "2026-11-30", status: "geprueft", pruefer: "Paket B5 (Abruf SMARD-Datenschnittstelle 09.10.2026, scripts/gewerbestrom-smard.mjs) · Zweitprüfung TODO-E6", klasse: "B" };

const MONATE = [
  { monat: "2025-10", eurMwh: 84.4 },
  { monat: "2025-11", eurMwh: 101.88 },
  { monat: "2025-12", eurMwh: 93.47 },
  { monat: "2026-01", eurMwh: 110.09 },
  { monat: "2026-02", eurMwh: 96.58 },
  { monat: "2026-03", eurMwh: 99.29 },
  { monat: "2026-04", eurMwh: 78.52 },
  { monat: "2026-05", eurMwh: 97.54 },
  { monat: "2026-06", eurMwh: 109.52 },
  { monat: "2026-07", eurMwh: 105.45 },
  { monat: "2026-08", eurMwh: 126.89 },
  { monat: "2026-09", eurMwh: 144.82 }
];

/** [Kalendermonat 0–11][Tagtyp 0 = Mo–Fr, 1 = Sa/So][Stunde 0–23] in €/MWh (Mittel Okt. 2025 – Sept. 2026) */
const PROFIL = [
    [[91.2, 87.8, 84.5, 82.4, 82.9, 86.4, 100.3, 123.2, 139.9, 135, 124.7, 116.6, 112.3, 112.5, 119.6, 129.9, 143.2, 151.9, 142.9, 129.7, 113.3, 104.4, 100.6, 92],
     [94.7, 92.8, 90.5, 89.1, 88.2, 88.9, 89.1, 91.7, 98.5, 105.4, 105.6, 103.4, 102.4, 100.6, 104, 108.7, 117.7, 129.7, 131.5, 125.9, 115.4, 106.2, 105.2, 98.2]], // Jan
    [[85.9, 84.6, 83.5, 83.4, 83.6, 88.6, 103, 119.9, 125.7, 117.7, 106.5, 96.7, 87.1, 85.8, 90.9, 102.2, 113, 130.2, 129.1, 119.5, 107.6, 100.7, 97.3, 89.3],
     [85.9, 82.5, 80.8, 78.8, 77.9, 78, 77, 81.9, 84.9, 82.6, 78, 74.3, 70.9, 67.7, 70, 78.4, 94, 109.8, 114.6, 108.2, 96.7, 90.7, 88.9, 80.5]], // Feb
    [[93.1, 88.4, 86.6, 86.5, 89.1, 100.1, 126.4, 142.8, 122.5, 93.2, 64.5, 42.6, 32.1, 32.5, 47.8, 72.9, 106.2, 149.9, 185.9, 176.6, 147, 129.9, 121.9, 107.1],
     [113.5, 110.2, 107.5, 105.9, 107.3, 110.3, 112.1, 107.3, 95.2, 74.6, 55.6, 35.4, 22.9, 18, 27.4, 56, 92, 122.1, 148.4, 146.7, 131.4, 118.3, 111.9, 100.1]], // Mär
    [[106.2, 101.4, 100, 99.8, 102.3, 111.2, 133.3, 140.9, 126.7, 97.1, 61.6, 37.3, 22.6, 8.8, 10.6, 24.3, 45.2, 80.4, 118.1, 154, 160.2, 135.8, 123.1, 111.5],
     [78.8, 75.8, 75.2, 74.8, 76, 77.5, 76.1, 70.7, 52.9, 30, 8.4, -23.9, -58.6, -97.3, -97.4, -56.2, 0.3, 42, 78.7, 106.6, 111.6, 101.3, 94.4, 84.9]], // Apr
    [[128.4, 120.9, 118, 117.1, 118.4, 124.6, 138, 137.8, 122.4, 93.8, 67.3, 50, 30.9, 16.8, 18.2, 41.4, 69.2, 99.2, 131.8, 164.5, 194.7, 176.3, 148.8, 132.3],
     [130.5, 123, 120.4, 117.7, 117, 115.1, 110, 95.9, 65.5, 27.1, 2.4, -4.1, -14.3, -25.8, -18.1, -3.5, 14.6, 67.8, 116.3, 139.4, 154.7, 151.3, 143.2, 132.7]], // Mai
    [[132.6, 123, 117.3, 115.5, 116.6, 122.3, 139, 139, 124.8, 104, 84, 67.8, 55, 48, 49.5, 62.5, 82.9, 107.3, 139.4, 204.6, 266.3, 253.8, 193.6, 148.6],
     [118.8, 107.6, 101.2, 95.2, 94.6, 88, 76.1, 66.8, 52.6, 26.8, 5.3, -3.7, -7.5, -13.3, -13.9, -8, 13.9, 54.2, 82.1, 116.1, 143, 148.3, 141.7, 127.9]], // Jun
    [[144.3, 136.5, 130.2, 127.2, 128.8, 136.1, 150.9, 151.3, 137.6, 109.9, 81.4, 57.8, 39.9, 29.1, 28.2, 36.8, 58.9, 90.2, 124, 159.7, 184.2, 183.2, 171.8, 155],
     [143.9, 137, 133.2, 131.6, 127.5, 122.7, 114.2, 96.8, 67.4, 24.6, 4.1, -0.7, -2.2, -4.3, -5.3, -3, -0.1, 19.3, 80.5, 126.4, 143.2, 148, 147.9, 139]], // Jul
    [[158.9, 151, 144.7, 141.6, 142.3, 153, 173.6, 175.9, 166.1, 141.7, 110, 79, 58.1, 48.9, 51.7, 68.7, 94.7, 131.9, 168.1, 206.7, 213.2, 197.5, 181.5, 164.2],
     [153.2, 144.4, 138.2, 134.5, 132.3, 133.8, 133.6, 125, 100.7, 60.6, 31.5, 15.4, 5, 0.1, 1.8, 7.6, 26, 88.2, 150.3, 176.3, 185, 181.8, 174.7, 162.2]], // Aug
    [[161.4, 153.7, 148.8, 147.3, 148.2, 161.7, 201.9, 228.4, 212.4, 172.3, 134.1, 96.4, 67.6, 53.6, 60, 83.4, 119.5, 171.3, 229.4, 290.5, 263.6, 216.3, 194.2, 173.5],
     [134, 126, 121.3, 114, 113.5, 114.5, 119.9, 120.9, 106.1, 68.6, 40.3, 23.2, 12.4, 9.5, 11.4, 19.1, 42.8, 93.5, 142.2, 174.2, 174.9, 160.6, 153.2, 141.9]], // Sep
    [[76.7, 71.2, 68.4, 66.5, 67.7, 74.5, 97.9, 131, 137.4, 114, 95, 81.9, 72.6, 70, 75.8, 88.3, 101.5, 128.8, 166.5, 168.7, 121.2, 99.8, 91.7, 80.3],
     [48.1, 45.3, 38.9, 42, 41.7, 42.1, 43.8, 47.4, 49.3, 45.3, 40.4, 36.2, 29.2, 23.3, 27.5, 38.3, 45.7, 62.8, 73.8, 73.9, 61.9, 51.4, 52.7, 45.1]], // Okt
    [[80.4, 76.2, 73.8, 72.6, 75.1, 81.7, 99.7, 132.5, 139.6, 122.4, 109.6, 106, 105.1, 108.9, 117.9, 137.4, 156.3, 165.4, 146.1, 129.3, 111.1, 100.3, 95.1, 83.5],
     [82.4, 78.2, 75.2, 73.9, 73.4, 74.6, 74, 80.2, 82.9, 83, 81.1, 79.5, 78.7, 81.3, 88, 96.6, 104, 113.8, 112.5, 105.4, 96.8, 91.7, 91.1, 85.2]], // Nov
    [[73.1, 69.5, 67.4, 66.3, 67.5, 72.9, 85.7, 100.9, 113.6, 109.6, 100.3, 96.3, 94, 97.6, 106.9, 118.1, 123.8, 122.3, 114.6, 107.2, 99.8, 92.3, 90.3, 81.3],
     [86.8, 83.4, 79.8, 78.7, 78.8, 79.2, 80.4, 85.9, 93.7, 96, 92.4, 91.3, 90.3, 90.9, 95.1, 102.6, 107, 108.4, 104.2, 97.3, 91.9, 86.8, 85.2, 76.8]], // Dez
];

const BOERSE = [
  {
    id: "boerse.dayAhead.monate",
    wert: MONATE,
    einheit: "€/MWh",
    land: "DE",
    quelle: Q.smard,
    ...SMARD,
    notiz: "Monatsmittel Großhandelspreis Day-Ahead Deutschland/Luxemburg (SMARD-Filter 4169), Oktober 2025 bis September 2026. Nennung: Bundesnetzagentur | SMARD.de, Lizenz CC BY 4.0 (smard.de/home/datennutzung). Monatlich mit scripts/gewerbestrom-smard.mjs aktualisieren.",
  },
  {
    id: "boerse.dayAhead.profil",
    wert: PROFIL,
    einheit: "€/MWh",
    land: "DE",
    quelle: Q.smard,
    ...SMARD,
    notiz: "Eigene Auswertung der SMARD-Stundenwerte (Filter 4169) desselben Zeitraums: Mittel je Kalendermonat × Tagtyp (Mo–Fr | Sa/So) × Stunde (Ortszeit). Feiertage zählen als Werktag. Grundlage des Profilfaktors (Lastprofil bzw. Lastgang gegen gleichmäßigen Bezug).",
  },
];

/* ------------------------------------------------------------------ */
/* Eigene Einschätzung (Klasse C)                                      */
/* ------------------------------------------------------------------ */

const EINSCHAETZUNG = [
  {
    id: "gewerbestrom.lieferantenaufschlag",
    wert: { min: 1.0, mittel: 2.0, max: 3.5 },
    einheit: "ct/kWh",
    land: "DE",
    quelle: Q.eigen,
    abruf: ABRUF,
    gueltigAb: null,
    gueltigBis: null,
    status: "zu_pruefen",
    pruefer: OFFEN,
    klasse: "C",
    notiz: "Übliche Spanne zwischen Börsenwert (Day-Ahead, profilgewichtet) und Energiepreis eines Gewerbevertrags: Strukturierung, Ausgleichsenergie und Bilanzkreis, Termin-/Risikoaufschlag, Vertrieb und Marge. Eigene Einschätzung, keine Marktstatistik; Terminmarkt zum Zeitpunkt des Vertragsschlusses kann deutlich abweichen.",
  },
  {
    id: "gewerbestrom.toleranzUeberMarkt",
    wert: 1.5,
    einheit: "ct/kWh",
    land: "DE",
    quelle: Q.eigen,
    abruf: ABRUF,
    gueltigAb: null,
    gueltigBis: null,
    status: "zu_pruefen",
    pruefer: OFFEN,
    klasse: "C",
    notiz: "Bewertung: bis zum oberen Ende der Spanne „marktgerecht“, bis zu diesem Abstand darüber „etwas über Markt“, darüber „deutlich über Markt“. Eigene Festlegung.",
  },
];

const MODUL = {
  name: "gewerbestrom-de",
  land: "DE",
  fakten: [...UMLAGEN_2026, ...STROMSTEUER, ...KAV, ...BOERSE, ...EINSCHAETZUNG],
};

export default MODUL;
