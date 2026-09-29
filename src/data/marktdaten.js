// src/data/marktdaten.js
//
// Marktdaten-Hub (/marktdaten): historische Kennzahlen zu Freiflächen-PV im
// DACH-Raum – EEG-Ausschreibungen Solar erstes Segment, Marktwert Solar,
// Capture Rate, negative Preise, Zubau. EINZIGE Quelle für Seite, Diagramme
// und Dataset-JSON-LD.
//
// Recherchestand: 29.09.2026. Alle Werte aus öffentlich zugänglichen Quellen
// (siehe MARKTDATEN_QUELLEN), Tabellenwerte unverändert übernommen, Rundungen
// nur in der Anzeige. Neue Gebotstermine unten an AUSSCHREIBUNGEN anhängen.

export const MARKTDATEN_STAND = "2026-09-29";
export const MARKTDATEN_STAND_TEXT = "29. September 2026";

/* ------------------------------------------------------------------ */
/* EEG-Ausschreibungen Solaranlagen des ersten Segments (Freifläche)   */
/* ------------------------------------------------------------------ */

/**
 * Bundesnetzagentur, „Beendete Ausschreibungen – Solaranlagen des ersten
 * Segments“ (Statistik-Tabelle), Stand 09/2026; Termine 1.3.2026 und
 * 1.7.2026 zusätzlich aus den Ergebnisseiten bzw. der Pressemitteilung vom
 * 18.08.2026 abgeglichen.
 *
 *  datum      Gebotstermin (ISO)
 *  volumen    ausgeschriebene Menge in MW
 *  gebote     eingereichte Gebotsmenge in MW
 *  zuschlag   bezuschlagte Menge in MW
 *  anzahl     Anzahl Zuschläge / Anzahl Gebote
 *  mittel     mengengewichteter durchschnittlicher Zuschlagswert in ct/kWh
 *  min, max   niedrigster / höchster bezuschlagter Gebotswert in ct/kWh
 *  hoechst    Höchstwert des Gebotstermins in ct/kWh
 *
 * 2019 und 2020 gab es neben den regulären Terminen zusätzliche
 * Sonderausschreibungen (Energiesammelgesetz) – daher die höhere Zahl an
 * Gebotsterminen in diesen Jahren.
 */
export const AUSSCHREIBUNGEN = [
  { datum: "2017-02-01", volumen: 200, gebote: 488, zuschlag: 200.1, anzahl: [38, 97], mittel: 6.58, min: 6.0, max: 6.75, hoechst: 8.91 },
  { datum: "2017-06-01", volumen: 200, gebote: 646, zuschlag: 200.6, anzahl: [32, 133], mittel: 5.66, min: 5.34, max: 5.9, hoechst: 8.91 },
  { datum: "2017-10-01", volumen: 200, gebote: 754, zuschlag: 222.2, anzahl: [20, 110], mittel: 4.91, min: 4.29, max: 5.06, hoechst: 8.84 },
  { datum: "2018-02-01", volumen: 200, gebote: 545.9, zuschlag: 201.1, anzahl: [24, 79], mittel: 4.33, min: 3.86, max: 4.59, hoechst: 8.84 },
  { datum: "2018-06-01", volumen: 182.5, gebote: 359.7, zuschlag: 183.5, anzahl: [28, 59], mittel: 4.59, min: 3.89, max: 4.96, hoechst: 8.84 },
  { datum: "2018-10-01", volumen: 182.5, gebote: 550.8, zuschlag: 192.0, anzahl: [37, 76], mittel: 4.69, min: 3.86, max: 5.15, hoechst: 8.75 },
  { datum: "2019-02-01", volumen: 175, gebote: 465.2, zuschlag: 178.1, anzahl: [24, 80], mittel: 4.8, min: 4.11, max: 5.18, hoechst: 8.91 },
  { datum: "2019-03-01", volumen: 500, gebote: 869.1, zuschlag: 505.2, anzahl: [121, 163], mittel: 6.59, min: 3.9, max: 8.4, hoechst: 8.91 },
  { datum: "2019-06-01", volumen: 150, gebote: 556, zuschlag: 204.7, anzahl: [14, 105], mittel: 5.47, min: 4.97, max: 5.58, hoechst: 7.5 },
  { datum: "2019-10-01", volumen: 150, gebote: 648, zuschlag: 152.8, anzahl: [27, 153], mittel: 4.9, min: 4.59, max: 5.2, hoechst: 7.5 },
  { datum: "2019-12-01", volumen: 500, gebote: 1344.4, zuschlag: 501.3, anzahl: [121, 346], mittel: 5.68, min: 4.7, max: 6.2, hoechst: 7.5 },
  { datum: "2020-02-01", volumen: 100, gebote: 493, zuschlag: 100.6, anzahl: [18, 98], mittel: 5.01, min: 3.55, max: 5.21, hoechst: 7.5 },
  { datum: "2020-03-01", volumen: 300, gebote: 838.4, zuschlag: 301.2, anzahl: [51, 190], mittel: 5.18, min: 4.64, max: 5.48, hoechst: 7.5 },
  { datum: "2020-06-01", volumen: 96.4, gebote: 447.2, zuschlag: 99.6, anzahl: [21, 101], mittel: 5.27, min: 4.9, max: 5.4, hoechst: 7.5 },
  { datum: "2020-07-01", volumen: 192.7, gebote: 779.4, zuschlag: 193.3, anzahl: [30, 174], mittel: 5.18, min: 4.69, max: 5.36, hoechst: 7.5 },
  { datum: "2020-09-01", volumen: 257.0, gebote: 675, zuschlag: 257.9, anzahl: [75, 163], mittel: 5.22, min: 4.8, max: 5.39, hoechst: 7.5 },
  { datum: "2020-10-01", volumen: 96.4, gebote: 393.3, zuschlag: 103.1, anzahl: [30, 87], mittel: 5.23, min: 4.98, max: 5.36, hoechst: 7.5 },
  { datum: "2020-12-01", volumen: 257.0, gebote: 936.1, zuschlag: 264.2, anzahl: [45, 186], mittel: 5.1, min: 4.88, max: 5.26, hoechst: 7.5 },
  { datum: "2021-03-01", volumen: 617, gebote: 1504.1, zuschlag: 619.7, anzahl: [103, 288], mittel: 5.03, min: 4.69, max: 5.18, hoechst: 5.9 },
  { datum: "2021-06-01", volumen: 510.3, gebote: 1129.7, zuschlag: 513.3, anzahl: [95, 242], mittel: 5.0, min: 4.69, max: 5.09, hoechst: 5.9 },
  { datum: "2021-11-01", volumen: 509.5, gebote: 986.1, zuschlag: 512.0, anzahl: [133, 232], mittel: 5.0, min: 4.57, max: 5.2, hoechst: 5.9 },
  { datum: "2022-03-01", volumen: 1107.7, gebote: 1115.9, zuschlag: 1083.6, anzahl: [201, 209], mittel: 5.19, min: 4.05, max: 5.55, hoechst: 5.57 },
  { datum: "2022-06-01", volumen: 1126.0, gebote: 713.5, zuschlag: 695.9, anzahl: [109, 116], mittel: 5.51, min: 4.87, max: 5.69, hoechst: 5.7 },
  { datum: "2022-11-01", volumen: 890.1, gebote: 676.9, zuschlag: 609.0, anzahl: [104, 117], mittel: 5.8, min: 5.2, max: 5.9, hoechst: 5.9 },
  { datum: "2023-03-01", volumen: 1950, gebote: 2868.7, zuschlag: 1951.9, anzahl: [245, 347], mittel: 7.03, min: 5.29, max: 7.3, hoechst: 7.37 },
  { datum: "2023-07-01", volumen: 1611.1, gebote: 4653.4, zuschlag: 1673.4, anzahl: [124, 516], mittel: 6.47, min: 5.39, max: 6.65, hoechst: 7.37 },
  { datum: "2023-12-01", volumen: 1611.1, gebote: 5485.3, zuschlag: 1612.5, anzahl: [124, 574], mittel: 5.17, min: 4.44, max: 5.47, hoechst: 7.37 },
  { datum: "2024-03-01", volumen: 2230.7, gebote: 4099.8, zuschlag: 2233.9, anzahl: [326, 569], mittel: 5.11, min: 3.62, max: 5.49, hoechst: 7.37 },
  { datum: "2024-07-01", volumen: 2147.8, gebote: 4205.6, zuschlag: 2152.3, anzahl: [268, 495], mittel: 5.05, min: 4.5, max: 5.24, hoechst: 7.37 },
  { datum: "2024-12-01", volumen: 2147.8, gebote: 4708.5, zuschlag: 2149.7, anzahl: [242, 524], mittel: 4.76, min: 3.88, max: 4.95, hoechst: 7.37 },
  { datum: "2025-03-01", volumen: 2625.1, gebote: 3839.0, zuschlag: 2638.4, anzahl: [271, 420], mittel: 4.66, min: 3.99, max: 4.88, hoechst: 6.8 },
  { datum: "2025-07-01", volumen: 2266.5, gebote: 2820.5, zuschlag: 2271.5, anzahl: [258, 313], mittel: 4.84, min: 4.0, max: 6.26, hoechst: 6.8 },
  { datum: "2025-12-01", volumen: 2327.5, gebote: 5247.1, zuschlag: 2340.8, anzahl: [262, 634], mittel: 5.0, min: 4.4, max: 5.3, hoechst: 6.8 },
  { datum: "2026-03-01", volumen: 2294.8, gebote: 4622.5, zuschlag: 2299.3, anzahl: [268, 532], mittel: 4.94, min: 3.99, max: 5.1, hoechst: 5.79 },
  { datum: "2026-07-01", volumen: 2134.6, gebote: 3170.0, zuschlag: 2134.7, anzahl: [261, 401], mittel: 4.79, min: 4.38, max: 4.97, hoechst: 5.9 },
];

/** Nächster regulärer Gebotstermin (EEG 2023: 1. März, 1. Juli, 1. Dezember) */
export const NAECHSTER_GEBOTSTERMIN = "1. Dezember 2026";

/* ------------------------------------------------------------------ */
/* Marktwert Solar und Capture Rate                                    */
/* ------------------------------------------------------------------ */

/**
 * Jahresmarktwerte nach Anlage 1 Nr. 4 EEG, veröffentlicht von den
 * Übertragungsnetzbetreibern auf netztransparenz.de (ct/kWh), seit 2020:
 *  spot   JW – Jahresmittel des Day-Ahead-Spotmarktpreises
 *  solar  JW Solar – mit der Solareinspeisung gewichteter Jahresmarktwert
 * Werte 2020–2024 nach der Zusammenstellung der DGS (Dr. Andreas Horn,
 * „Jahres-/Monatsmarktwerte Solar 2025“, Januar 2026), 2025 zusätzlich direkt
 * auf netztransparenz.de geprüft (JW 8,932 / JW Solar 4,508).
 * Capture Rate = JW Solar / JW (eigene Berechnung).
 */
export const MARKTWERTE = [
  { jahr: 2020, spot: 3.047, solar: 2.458 },
  { jahr: 2021, spot: 9.685, solar: 7.552 },
  { jahr: 2022, spot: 23.545, solar: 22.306 },
  { jahr: 2023, spot: 9.518, solar: 7.2 },
  { jahr: 2024, spot: 7.946, solar: 4.624 },
  { jahr: 2025, spot: 8.932, solar: 4.508 },
].map((z) => ({ ...z, capture: z.solar / z.spot }));

/**
 * Vor 2020 veröffentlichten die ÜNB den „tatsächlichen Jahresmittelwert des
 * Marktwerts Solar“ nach § 33 EEG 2012 (ct/kWh) – methodisch nicht exakt
 * gleich, als Einordnung aber brauchbar. Quelle: DGS-Zusammenstellung (s. o.).
 */
export const MARKTWERT_SOLAR_FRUEHER = [
  { jahr: 2017, solar: 3.474 },
  { jahr: 2018, solar: 4.515 },
  { jahr: 2019, solar: 3.776 },
];

/**
 * Stunden mit negativem Day-Ahead-Preis (DE-LU) je Jahr.
 * Quelle: Auswertung Energy-Charts (Fraunhofer ISE) in der DGS-Zusammenstellung
 * „Jahres-/Monatsmarktwerte Solar 2025“ (Januar 2026).
 */
export const NEGATIVE_STUNDEN = [
  { jahr: 2019, stunden: 211 },
  { jahr: 2020, stunden: 298 },
  { jahr: 2021, stunden: 139 },
  { jahr: 2022, stunden: 69 },
  { jahr: 2023, stunden: 301 },
  { jahr: 2024, stunden: 459 },
  { jahr: 2025, stunden: 575 },
];

/* ------------------------------------------------------------------ */
/* Zubau Photovoltaik DACH (grob)                                      */
/* ------------------------------------------------------------------ */

/**
 * Grobe Einordnung des Zubaus, GW (Brutto, alle Segmente) und – wo belegt –
 * Freiflächenanteil.
 *  DE: Bundesnetzagentur, Jahresauswertung Marktstammdatenregister (Januar 2026):
 *      2025 rund 16,4 GW, davon etwa die Hälfte (≈ 8,2 GW) Freiflächenanlagen;
 *      2024 rund 16,2 GW, Dachanlagen etwa doppelt so viel wie Freiflächen.
 *      Kumuliert Ende 2025 gut 117 GW.
 *  AT: PV Austria, Marktzahlen (März 2026): 2023 2.474 MW, 2024 2.084 MW,
 *      2025 1.634 MW; kumuliert knapp 9,8 GW. Kein amtlicher Freiflächenanteil.
 *  CH: Swissolar (November 2025): 2024 knapp 1,8 GW, 2025 rund 1,5 GW erwartet;
 *      Freiflächen spielen kaum eine Rolle, erste alpine Solarexpress-Anlagen
 *      teilweise in Betrieb.
 */
export const ZUBAU = [
  {
    land: "Deutschland",
    kurz: "DE",
    werte: [
      { jahr: 2024, gw: 16.2 },
      { jahr: 2025, gw: 16.4 },
    ],
    freiflaeche: "2025 rund 8,2 GW – etwa die Hälfte des Zubaus (2024: rund ein Drittel)",
    kumuliert: "gut 117 GW (Ende 2025)",
    einordnung: "Mit Abstand größter Freiflächenmarkt im DACH-Raum; Treiber sind EEG-Ausschreibungen und PPA-Parks ohne Förderung.",
  },
  {
    land: "Österreich",
    kurz: "AT",
    werte: [
      { jahr: 2023, gw: 2.474 },
      { jahr: 2024, gw: 2.084 },
      { jahr: 2025, gw: 1.634 },
    ],
    freiflaeche: "kein amtlicher Anteil ausgewiesen; Freiflächen wachsen, bleiben aber hinter Dachanlagen",
    kumuliert: "knapp 9,8 GW (Ende 2025)",
    einordnung: "Engpass ist die Widmung „Grünland-Photovoltaik“ je Bundesland und der Netzzugang.",
  },
  {
    land: "Schweiz",
    kurz: "CH",
    werte: [
      { jahr: 2024, gw: 1.8 },
      { jahr: 2025, gw: 1.5 },
    ],
    freiflaeche: "praktisch keine Freiflächen im Mittelland; alpine Anlagen über den Solarexpress",
    kumuliert: "Zubau 2025 als Schätzung von Swissolar",
    einordnung: "Fokus auf Dächer, Fassaden und alpine Großanlagen; Freiflächen außerhalb der Bauzone nur ausnahmsweise.",
  },
];

/* ------------------------------------------------------------------ */
/* Quellen                                                             */
/* ------------------------------------------------------------------ */

export const MARKTDATEN_QUELLEN = [
  {
    id: "bnetza",
    titel: "Bundesnetzagentur – Beendete Ausschreibungen Solaranlagen des ersten Segments (Statistik)",
    url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/BeendeteAusschreibungen/start.html",
    stand: "09/2026",
  },
  {
    id: "bnetza-pm",
    titel: "Bundesnetzagentur – Pressemitteilung vom 18.08.2026: Ergebnisse Gebotstermin 1. Juli 2026",
    url: "https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260818_Solar1.html",
    stand: "08/2026",
  },
  {
    id: "netztransparenz",
    titel: "Netztransparenz.de (Übertragungsnetzbetreiber) – Marktwertübersicht, Jahresmarktwerte",
    url: "https://www.netztransparenz.de/de-de/Erneuerbare-Energien-und-Umlagen/EEG/Transparenzanforderungen/Marktpr%C3%A4mie/Marktwert%C3%BCbersicht",
    stand: "09/2026",
  },
  {
    id: "dgs",
    titel: "DGS – Jahres- und Monatsmarktwerte Solar 2025 (Zusammenstellung Dr. Andreas Horn, Daten netztransparenz.de und Energy-Charts)",
    url: "https://www.dgs.de/wp-content/uploads/2026/01/DGS_Jahres-Monatsmarktwerte-Solar_2025.pdf",
    stand: "01/2026",
  },
  {
    id: "zubau-de",
    titel: "Solarserver – Bundesnetzagentur legt Zahlen zum Ausbau der erneuerbaren Energien 2025 vor",
    url: "https://www.solarserver.de/2026/01/08/bundesnetzagentur-legt-zahlen-zum-ausbau-der-erneuerbaren-energien-in-2025-vor/",
    stand: "01/2026",
  },
  {
    id: "zubau-at",
    titel: "pv magazine – Österreichs Photovoltaik-Zubau sank 2025 auf 1634 Megawatt (Zahlen PV Austria)",
    url: "https://www.pv-magazine.de/2026/03/26/oesterreichs-photovoltaik-zubau-sank-2025-auf-1634-megawatt/",
    stand: "03/2026",
  },
  {
    id: "zubau-ch",
    titel: "pv magazine – Swissolar geht von konstantem Photovoltaik-Zubau von etwa 1,5 Gigawatt aus",
    url: "https://www.pv-magazine.de/2025/11/13/swissolar-geht-von-konstantem-photovoltaik-zubau-von-etwa-15-gigawatt-in-den-naechsten-jahren-aus/",
    stand: "11/2025",
  },
  {
    id: "destatis",
    titel: "Statistisches Bundesamt – Pachtpreise für landwirtschaftliche Flächen (PM 153/2024)",
    url: "https://www.destatis.de/DE/Presse/Pressemitteilungen/2024/04/PD24_153_41.html",
    stand: "04/2024",
  },
];

/* ------------------------------------------------------------------ */
/* Abgeleitete Kennzahlen (für Texte und Kennzahlkacheln)              */
/* ------------------------------------------------------------------ */

const jahrVon = (d) => Number(d.slice(0, 4));

/** Mengengewichteter Jahresdurchschnitt der Zuschlagswerte, Summe Volumen/Gebote/Zuschläge je Jahr */
export const AUSSCHREIBUNGEN_JAHR = Object.values(
  AUSSCHREIBUNGEN.reduce((acc, a) => {
    const j = jahrVon(a.datum);
    const z = (acc[j] ||= { jahr: j, termine: 0, volumen: 0, gebote: 0, zuschlag: 0, summeWert: 0 });
    z.termine += 1;
    z.volumen += a.volumen;
    z.gebote += a.gebote;
    z.zuschlag += a.zuschlag;
    z.summeWert += a.mittel * a.zuschlag;
    return acc;
  }, {})
).map((z) => ({ ...z, mittel: z.summeWert / z.zuschlag, ueberzeichnung: z.gebote / z.volumen }));

export const LETZTE_AUSSCHREIBUNG = AUSSCHREIBUNGEN[AUSSCHREIBUNGEN.length - 1];
export const LETZTER_MARKTWERT = MARKTWERTE[MARKTWERTE.length - 1];
export const MIN_ZUSCHLAG = AUSSCHREIBUNGEN.reduce((a, b) => (b.mittel < a.mittel ? b : a));
export const MAX_ZUSCHLAG = AUSSCHREIBUNGEN.reduce((a, b) => (b.mittel > a.mittel ? b : a));
export const SUMME_ZUSCHLAG_MW = AUSSCHREIBUNGEN.reduce((s, a) => s + a.zuschlag, 0);

/* ------------------------------------------------------------------ */
/* Pachtniveau (Einordnung, Solarpacht selbst aus markt.js PACHT)      */
/* ------------------------------------------------------------------ */

/**
 * Destatis, PM 153 vom 24.04.2024 (Agrarstrukturerhebung 2023): durchschnittliches
 * Pachtentgelt je ha landwirtschaftlich genutzter Fläche 2023 (alle Bestandsverträge)
 * und Spanne der Flächenländer (Saarland / Nordrhein-Westfalen), €/ha und Jahr.
 */
export const LANDPACHT_DESTATIS = { schnitt: 357, min: 99, minLand: "Saarland", max: 560, maxLand: "Nordrhein-Westfalen", jahr: 2023 };
