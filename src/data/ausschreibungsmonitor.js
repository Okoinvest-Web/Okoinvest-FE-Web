// src/data/ausschreibungsmonitor.js
//
// Ausschreibungs-Monitor DACH (Welle 3, Paket B9) – Datensätze für /marktdaten/ausschreibungen,
// die Downloads (CSV/JSON) und das Dataset-JSON-LD. EINZIGE Quelle; Auswertung in
// src/lib/marktdaten/monitor.js.
//
// Grundsätze
//  - Nur amtliche Veröffentlichungen (Bundesnetzagentur, EEG, EAG-Förderabwicklungsstelle, RIS, Pronovo).
//    Werte unverändert übernommen (kW → MW nur umgerechnet), Rundung nur in der Anzeige.
//  - Was die Quelle nicht nennt, steht als null und wird als „nicht veröffentlicht“ angezeigt –
//    nie geschätzt (z. B. Gebotsmengen in Österreich, Höchstpreise AT vor 2026).
//  - DE, AT und CH sind getrennte Reihen mit eigener Einheit; sie werden nie in einer Zahl vermischt.
//  - Erstes Segment DE kommt aus src/data/marktdaten.js (bereits geprüft, dieselbe Reihe wie /marktdaten).
//  - Prüfstand: am Original gelesen am ABRUF (Tabelle bzw. Excel/PDF der Stelle), Zweitprüfung fehlt (TODO-E6).
//
// Neue Runden: unten an die Reihe anhängen, ABRUF/STAND anpassen, offene Termine in TERMINE austragen.
// Relative Importe mit Dateiendung (node:test lädt das Modul direkt).

import { AUSSCHREIBUNGEN } from "./marktdaten.js";

export const MONITOR_ABRUF = "2026-10-09";
export const MONITOR_STAND = "2026-10-09";
export const MONITOR_PRUEFER = "Paket B9 (am Original gelesen 09.10.2026) · Zweitprüfung TODO-E6";
export const MONITOR_LIZENZ = Object.freeze({
  name: "CC BY 4.0",
  url: "https://creativecommons.org/licenses/by/4.0/",
  hinweis: "Eigene Zusammenstellung der ÖkoInvest GmbH aus amtlichen Veröffentlichungen (Quellen je Reihe).",
  hinweisEn: "Own compilation by ÖkoInvest GmbH from official publications (sources per series).",
});

/* ------------------------------------------------------------------ */
/* Quellen                                                             */
/* ------------------------------------------------------------------ */

export const MONITOR_QUELLEN = Object.freeze({
  bnetzaS1: {
    titel: "Bundesnetzagentur – Beendete Ausschreibungen Solaranlagen des ersten Segments (Statistik)",
    titelEn: "Bundesnetzagentur (Federal Network Agency) – completed tenders, solar installations first segment (statistics)",
    url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/BeendeteAusschreibungen/start.html",
    stand: "09/2026",
  },
  bnetzaS2: {
    titel: "Bundesnetzagentur – Beendete Ausschreibungen Solaranlagen des zweiten Segments (Statistik)",
    titelEn: "Bundesnetzagentur – completed tenders, solar installations second segment (statistics)",
    url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen2/BeendeteAusschreibungen/start.html",
    stand: "10/2026",
  },
  bnetzaInno: {
    titel: "Bundesnetzagentur – Beendete Innovationsausschreibungen (Statistik)",
    titelEn: "Bundesnetzagentur – completed innovation tenders (statistics)",
    url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Innovation/BeendeteAusschreibungen/start.html",
    stand: "10/2026",
  },
  eeg28a: {
    titel: "EEG 2023, § 28a – Gebotstermine Solaranlagen des ersten Segments (1. März, 1. Juli, 1. Dezember)",
    titelEn: "EEG 2023, section 28a – bidding dates solar first segment (1 March, 1 July, 1 December)",
    url: "https://www.gesetze-im-internet.de/eeg_2014/__28a.html",
    stand: "10/2026",
  },
  eeg28b: {
    titel: "EEG 2023, § 28b – Gebotstermine Solaranlagen des zweiten Segments (1. Februar, 1. Juni, 1. Oktober)",
    titelEn: "EEG 2023, section 28b – bidding dates solar second segment (1 February, 1 June, 1 October)",
    url: "https://www.gesetze-im-internet.de/eeg_2014/__28b.html",
    stand: "10/2026",
  },
  eeg28e: {
    titel: "EEG 2023, § 28e – Gebotstermine Innovationsausschreibungen (1. Mai, 1. September)",
    titelEn: "EEG 2023, section 28e – bidding dates innovation tenders (1 May, 1 September)",
    url: "https://www.gesetze-im-internet.de/eeg_2014/__28e.html",
    stand: "10/2026",
  },
  eagZuschlaege: {
    titel: "EAG-Förderabwicklungsstelle – Veröffentlichung der Zuschläge gemäß § 26 EAG, Ausschreibung Photovoltaikanlagen (Excel je Gebotstermin)",
    titelEn: "EAG funding settlement agency – publication of awards under section 26 EAG, photovoltaic tenders (Excel per bidding date)",
    url: "https://www.eag-abwicklungsstelle.at/veroeffentlichungen",
    stand: "07/2026",
  },
  eagMpv: {
    titel: "RIS – EAG-Marktprämienverordnung, § 4 (Höchstpreise 2026/2027) und § 5 (Gebotstermine und Volumen 2026/2027)",
    titelEn: "RIS – EAG Market Premium Ordinance, section 4 (maximum prices 2026/2027) and section 5 (bidding dates and volumes 2026/2027)",
    url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20012029",
    stand: "10/2026",
  },
  pronovo: {
    titel: "Pronovo – PV-Auktionen (laufende Runde, Auktionsbedingungen)",
    titelEn: "Pronovo – PV auctions (current round, auction conditions)",
    url: "https://pronovo.ch/de/foerderung/photovoltaik/auktionen/",
    stand: "10/2026",
  },
  cockpit2023: { titel: "Pronovo – Cockpit PV-Auktionen 2023 (Runde 4)", titelEn: "Pronovo – PV auction cockpit 2023 (round 4)", url: "https://pronovo.ch/?wpdmdl=12817&ind=0", stand: "12/2023" },
  cockpit2024: { titel: "Pronovo – Cockpit PV-Auktionen 2024 (Runde 4)", titelEn: "Pronovo – PV auction cockpit 2024 (round 4)", url: "https://pronovo.ch/?wpdmdl=14099&ind=0", stand: "12/2024" },
  cockpit2025: { titel: "Pronovo – Cockpit PV-Auktionen 2025 (Runde 3)", titelEn: "Pronovo – PV auction cockpit 2025 (round 3)", url: "https://pronovo.ch/?wpdmdl=16857&ind=0", stand: "01/2026" },
  cockpit2026: { titel: "Pronovo – Cockpit PV-Auktionen 2026 (Runde 3)", titelEn: "Pronovo – PV auction cockpit 2026 (round 3)", url: "https://pronovo.ch/?wpdmdl=18725&ind=0", stand: "08/2026" },
});

/* ------------------------------------------------------------------ */
/* Reihen                                                              */
/* ------------------------------------------------------------------ */

/**
 * Reihe = ein Ausschreibungsprogramm eines Landes.
 *  einheit   Einheit der Zuschlagswerte (ct/kWh, CHF/kW, Rp./kWh)
 *  wert      was der Zuschlagswert bedeutet (Anzeige „So lesen“)
 *  quellen   Schlüssel aus MONITOR_QUELLEN
 */
export const SERIEN = Object.freeze([
  {
    id: "de-solar1",
    land: "DE",
    name: "EEG Solar, erstes Segment",
    nameEn: "EEG solar, first segment",
    kurz: "Freiflächen",
    kurzEn: "Ground-mounted",
    einheit: "ct/kWh",
    wert: "anzulegender Wert für 20 Jahre (gleitende Marktprämie), mengengewichtet",
    wertEn: "reference value for 20 years (sliding market premium), volume-weighted",
    stelle: "Bundesnetzagentur",
    quellen: ["bnetzaS1", "eeg28a"],
  },
  {
    id: "de-solar2",
    land: "DE",
    name: "EEG Solar, zweites Segment",
    nameEn: "EEG solar, second segment",
    kurz: "Gebäude und Lärmschutzwände",
    kurzEn: "Buildings and noise barriers",
    einheit: "ct/kWh",
    wert: "anzulegender Wert für 20 Jahre (gleitende Marktprämie), mengengewichtet",
    wertEn: "reference value for 20 years (sliding market premium), volume-weighted",
    stelle: "Bundesnetzagentur",
    quellen: ["bnetzaS2", "eeg28b"],
  },
  {
    id: "de-innovation",
    land: "DE",
    name: "EEG-Innovationsausschreibung",
    nameEn: "EEG innovation tender",
    kurz: "Anlagenkombinationen, meist Solar mit Speicher",
    kurzEn: "Plant combinations, mostly solar with storage",
    einheit: "ct/kWh",
    wert: "anzulegender Wert (gleitende Marktprämie), mengengewichtet; Reihe ab 2023, frühere Runden mit fixer Marktprämie sind nicht vergleichbar",
    wertEn: "reference value (sliding market premium), volume-weighted; series from 2023, earlier rounds with a fixed market premium are not comparable",
    stelle: "Bundesnetzagentur",
    quellen: ["bnetzaInno", "eeg28e"],
  },
  {
    id: "at-eag-pv",
    land: "AT",
    name: "EAG-Marktprämie Photovoltaik",
    nameEn: "EAG market premium, photovoltaics",
    kurz: "Ausschreibung nach EAG",
    kurzEn: "Tender under the EAG",
    einheit: "ct/kWh",
    wert: "anzulegender Wert (Gebotswert) der Marktprämie, mengengewichtet laut Veröffentlichung nach § 26 EAG",
    wertEn: "reference value (bid value) of the market premium, volume-weighted as published under section 26 EAG",
    stelle: "EAG-Förderabwicklungsstelle",
    quellen: ["eagZuschlaege", "eagMpv"],
  },
  {
    id: "ch-heiv",
    land: "CH",
    name: "Hohe Einmalvergütung (HEIV), Auktion",
    nameEn: "High one-off remuneration (HEIV), auction",
    kurz: "Anlagen ab 150 kW ohne Eigenverbrauch",
    kurzEn: "Installations from 150 kW without self-consumption",
    einheit: "CHF/kW",
    wert: "einmaliger Beitrag je kW Leistung, mengengewichtet; Werte provisorisch (allfällige Rechtsmittelverfahren)",
    wertEn: "one-off contribution per kW of capacity, volume-weighted; provisional values (possible appeals)",
    stelle: "Pronovo",
    quellen: ["cockpit2023", "cockpit2024", "cockpit2025", "cockpit2026", "pronovo"],
  },
  {
    id: "ch-gmp",
    land: "CH",
    name: "Gleitende Marktprämie (GMP), Auktion",
    nameEn: "Sliding market premium (GMP), auction",
    kurz: "Anlagen ab 150 kW ohne Eigenverbrauch, seit 2025",
    kurzEn: "Installations from 150 kW without self-consumption, since 2025",
    einheit: "Rp./kWh",
    wert: "Vergütungssatz für 20 Jahre, mengengewichtet; Werte provisorisch (allfällige Rechtsmittelverfahren)",
    wertEn: "remuneration rate for 20 years, volume-weighted; provisional values (possible appeals)",
    stelle: "Pronovo",
    quellen: ["cockpit2025", "cockpit2026", "pronovo"],
  },
]);

/* ------------------------------------------------------------------ */
/* Runden mit Ergebnis                                                 */
/* ------------------------------------------------------------------ */

/**
 * Runde = ein Gebotstermin mit veröffentlichtem Ergebnis.
 *  datum       Gebotstermin (ISO)
 *  volumen     ausgeschriebene Menge in MW (AT: MWp) – null, wenn nicht veröffentlicht
 *  gebote      eingereichte Gebotsmenge in MW – null, wenn nicht veröffentlicht
 *  zuschlag    bezuschlagte Menge in MW
 *  nGebote, nZuschlaege  Anzahl – null, wenn nicht veröffentlicht
 *  mittel      mengengewichteter Zuschlagswert (Einheit der Reihe) – null, wenn nicht veröffentlicht
 *  min, max    niedrigster / höchster bezuschlagter Gebotswert
 *  hoechst     zulässiger Höchstwert des Termins – null, wenn nicht am Original belegt
 *  vorlaeufig  true = Quelle nennt die Werte provisorisch
 *  notiz       Besonderheit laut Quelle
 *  quelle      Schlüssel aus MONITOR_QUELLEN, wenn nicht die erste Quelle der Reihe (Pronovo: Cockpit je Jahr)
 */
const r = (datum, volumen, gebote, zuschlag, nZuschlaege, nGebote, mittel, min, max, hoechst, extra = {}) => ({ datum, volumen, gebote, zuschlag, nZuschlaege, nGebote, mittel, min, max, hoechst, ...extra });
const kw = (v) => Math.round(v) / 1000; // kW → MW (Quelle in kW, drei Nachkommastellen bleiben exakt)

/** DE erstes Segment: dieselben Werte wie /marktdaten (src/data/marktdaten.js, Bundesnetzagentur). */
const DE_SOLAR1 = AUSSCHREIBUNGEN.map((a) => r(a.datum, a.volumen, a.gebote, a.zuschlag, a.anzahl[0], a.anzahl[1], a.mittel, a.min, a.max, a.hoechst));

/** DE zweites Segment (Bundesnetzagentur, Statistik-Tabelle; Mengen in kW, hier MW). Gebotstermine laut § 28b EEG bzw. Vorgängerrecht. */
const DE_SOLAR2 = [
  r("2021-06-01", kw(150000), kw(213172), kw(152534), 114, 168, 6.88, 5.35, 7.89, 9.0),
  r("2021-12-01", kw(150000), kw(232975), kw(153986), 136, 209, 7.43, 5.7, 8.28, 9.0),
  r("2022-04-01", kw(766667), kw(212022), kw(203540), 163, 171, 8.53, 7.0, 8.91, 8.91),
  r("2022-08-01", kw(766667), kw(214035), kw(201044), 106, 115, 8.84, 8.2, 8.91, 8.91),
  r("2022-12-01", kw(202292), kw(127596), kw(105029), 56, 67, 8.74, 8.09, 8.91, 8.91),
  r("2023-02-01", kw(216667), kw(212736), kw(194950), 87, 94, 10.87, 9.0, 11.25, 11.25),
  r("2023-06-01", kw(190116), kw(342461), kw(192841), 79, 155, 10.18, 8.8, 10.18, 11.25, {
    notiz: "Laut Quelle sind Ø-Zuschlagswert und höchster bezuschlagter Wert gleich (10,18 ct/kWh) – unverändert übernommen, Rückfrage bei der Bundesnetzagentur offen.",
    notizEn: "According to the source, the Ø award value and the highest awarded value are identical (10.18 ct/kWh) – taken over unchanged, query to the Bundesnetzagentur pending.",
  }),
  r("2023-10-01", kw(190115), kw(372987), kw(191068), 88, 184, 9.58, 8.8, 9.98, 11.25),
  r("2024-02-01", kw(263236), kw(377990), kw(264059), 125, 194, 8.92, 6.9, 9.48, 10.5),
  r("2024-06-01", kw(258058), kw(362874), kw(258562), 119, 162, 8.94, 7.95, 10.19, 10.5),
  r("2024-10-01", kw(258059), kw(433698), kw(258811), 119, 209, 9.04, 7.45, 9.69, 10.5),
  r("2025-02-01", kw(315405), kw(368835), kw(316964), 143, 169, 9.1, 7.9, 9.69, 10.4),
  r("2025-06-01", kw(282721), kw(273554), kw(255367), 118, 127, 9.22, 6.9, 10.38, 10.4),
  r("2025-10-01", kw(282721), kw(309627), kw(280838), 121, 140, 9.66, 8.28, 10.4, 10.4),
  r("2026-02-01", kw(282720), kw(177137), kw(155080), 85, 98, 9.56, 7.88, 10.0, 10.0),
  r("2026-06-01", kw(296269), kw(238272), kw(208572), 108, 125, 9.72, 8.4, 10.0, 10.0),
];

/** DE Innovationsausschreibung ab 2023 (gleitende Marktprämie; Bundesnetzagentur, Statistik-Tabelle). */
const DE_INNOVATION = [
  r("2023-05-01", kw(400000), kw(83500), kw(83500), 3, 3, null, null, null, 9.18, {
    notiz: "Nur drei Gebote; die Bundesnetzagentur veröffentlicht für diesen Termin keine Zuschlagswerte.",
    notizEn: "Only three bids; the Bundesnetzagentur does not publish award values for this date.",
  }),
  r("2023-09-01", kw(400000), kw(779088), kw(407957), 32, 53, 8.33, 7.76, 8.78, 9.18),
  r("2024-05-01", kw(583250), kw(564046), kw(511824), 43, 48, 8.33, 6.78, 9.17, 9.18),
  r("2024-09-01", kw(583250), kw(1855907), kw(587184), 50, 154, 7.09, 6.74, 7.45, 9.18),
  r("2025-05-01", kw(485713), kw(2020409), kw(487529), 29, 158, 6.15, 5.0, 6.39, 9.0),
  r("2025-09-01", kw(485713), kw(2181682), kw(489887), 33, 163, 5.31, 4.79, 5.59, 9.0),
  r("2026-05-01", kw(475000), kw(749241), kw(482421), 27, 46, 5.34, 4.75, 5.61, 7.13),
  r("2026-09-01", kw(475000), kw(678431), kw(480111), 32, 53, 5.14, 4.5, 5.4, 7.13),
];

/**
 * AT EAG-Marktprämie Photovoltaik: Kopfwerte der Excel-Veröffentlichung je Gebotstermin (§ 26 EAG):
 * Ausschreibungsvolumen, insgesamt bezuschlagte Leistung (kWpeak → MWp), niedrigster, höchster und
 * mengengewichteter durchschnittlicher Zuschlagswert. Gebotsmenge und Anzahl werden nicht veröffentlicht.
 * Höchstpreis nur, wo am Verordnungstext belegt (2026: 7,77 ct/kWh, § 4 Abs. 1 Z 1 EAG-MPV).
 * Bieternamen und Standorte aus den Listen werden bewusst NICHT übernommen.
 */
const UEBERTRAG = { notiz: "Volumen inklusive Übertrag aus vorangegangenen Ausschreibungen (laut Quelle).", notizEn: "Volume including carry-over from previous tenders (according to the source)." };
const AT_EAG_PV = [
  r("2022-12-13", kw(700000), null, kw(398112), null, null, 7.37, 5.63, 9.33, null),
  r("2023-02-14", kw(175000), null, kw(59831), null, null, 9.18, 3.94, 9.33, null),
  r("2023-04-25", kw(290169), null, kw(20579), null, null, 9.0, 4.9, 9.33, null, UEBERTRAG),
  r("2023-07-25", kw(444590), null, kw(84749), null, null, 7.76, 7.0, 9.33, null, UEBERTRAG),
  r("2023-10-10", kw(534841), null, kw(83706), null, null, 9.22, 7.0, 9.33, null, UEBERTRAG),
  r("2024-05-14", kw(287500), null, kw(251433), null, null, 8.85, 4.18, 8.98, null),
  r("2024-07-09", kw(323567), null, kw(186814), null, null, 8.89, 6.0, 8.98, null),
  r("2024-09-24", kw(424253), null, kw(118383), null, null, 8.8, 6.71, 8.98, null),
  r("2024-12-10", kw(593370), null, kw(489980), null, null, 8.96, 5.0, 8.98, null),
  r("2025-02-10", kw(175000), null, kw(113310), null, null, 8.71, 6.72, 8.98, null),
  r("2025-04-22", kw(236690), null, kw(235194), null, null, 8.85, 5.0, 8.97, null),
  r("2025-07-22", kw(176496), null, kw(175451), null, null, 8.14, 7.0, 8.48, null),
  r("2025-10-07", kw(176045), null, kw(174200), null, null, 6.91, 5.98, 7.29, null),
  r("2026-03-17", kw(175000), null, kw(170967), null, null, 6.34, 4.0, 6.8, 7.77),
  r("2026-06-11", kw(179033), null, kw(181439), null, null, 6.4, 4.61, 6.69, 7.77),
];

/** CH hohe Einmalvergütung (Pronovo-Cockpits PV-Auktionen 2023–2026; MW, CHF/kW; provisorisch). */
const V = { vorlaeufig: true };
const CH_HEIV = [
  r("2023-02-01", 50, 43.6, 31.5, 86, 116, 516.2, 360, 640, 650, V),
  r("2023-05-01", 50, 74.6, 47.1, 115, 193, 534.6, 420, 600, 650, V),
  r("2023-08-01", 60, 55.5, 44.2, 126, 161, 543.4, 450, 600, 650, V),
  r("2023-11-01", 60, 75.9, 40.2, 110, 170, 549.45, 388, 599, 650, V),
  r("2024-02-01", 60, 60.8, 26.7, 80, 129, 558.86, 450, 595, 640, V),
  r("2024-05-01", 60, 76.0, 38.9, 99, 153, 561.0, 374, 590, 630, V),
  r("2024-08-01", 60, 65.3, 38.2, 80, 122, 554.29, 477, 585, 620, V),
  r("2024-11-01", 60, 61.1, 39.9, 88, 130, 554.23, 447, 580, 610, V),
  r("2025-05-01", 50, 82.3, 45.2, 97, 137, 549.5, 460, 575, 600, V),
  r("2025-08-01", 60, 49.0, 38.7, 79, 100, 544.6, 510, 564.6, 600, V),
  r("2025-11-01", 50, 48.7, 40.6, 88, 103, 539.9, 500, 552, 590, V),
  r("2026-02-01", 50, 34.0, 25.8, 53, 67, 526.65, 443, 548, 590, V),
  r("2026-05-01", 50, 42.21, 32.13, 76, 90, 539.04, 499, 597, 620, V),
  r("2026-08-01", 50, 30.76, 22.95, 57, 67, 562.89, 519, 595, 620, V),
];

/** CH gleitende Marktprämie (Pronovo-Cockpits 2025–2026; MW, Rp./kWh; provisorisch). */
const CH_GMP = [
  r("2025-05-01", 50, 2.7, 2.2, 5, 7, 8.6, 8.0, 8.9, 9, V),
  r("2025-08-01", 20, 0.6, 0.3, 1, 2, 8.5, 8.5, 8.5, 9, V),
  r("2025-11-01", 10, 0.3, 0, 0, 1, null, null, null, 9, { ...V, notiz: "Kein Zuschlag in dieser Runde.", notizEn: "No award in this round." }),
  r("2026-02-01", 10, 2.0, 1.2, 3, 5, 8.7, 8.4, 8.7, 9, V),
  r("2026-05-01", 10, 11.99, 9.52, 11, 13, 9.76, 8.7, 9.9, 10, V),
  r("2026-08-01", 10, 21.01, 7.91, 3, 8, 9.73, 9.4, 9.8, 10, V),
];

/** Quelle je Runde: Pronovo veröffentlicht ein Cockpit je Jahr (cockpit2023 … cockpit2026). */
const cockpit = (liste) => liste.map((x) => ({ ...x, quelle: `cockpit${x.datum.slice(0, 4)}` }));

export const RUNDEN = Object.freeze({
  "de-solar1": DE_SOLAR1,
  "de-solar2": DE_SOLAR2,
  "de-innovation": DE_INNOVATION,
  "at-eag-pv": AT_EAG_PV,
  "ch-heiv": cockpit(CH_HEIV),
  "ch-gmp": cockpit(CH_GMP),
});

/* ------------------------------------------------------------------ */
/* Termine ohne Ergebnis (kommend bzw. Ergebnis ausstehend)            */
/* ------------------------------------------------------------------ */

/**
 * Termin = Gebotstermin, für den (noch) kein Ergebnis vorliegt.
 *  datum     Gebotstermin = letzter Tag der Gebotsabgabe (ISO)
 *  beginn    erster Tag der Gebotsabgabe, wo die Stelle ihn nennt (sonst null)
 *  volumen   ausgeschriebene Menge in MW – null = noch nicht bekannt gegeben (nie geschätzt)
 *  hoechst   zulässiger Höchstwert – null = noch nicht bekannt gegeben
 *  quelle    Schlüssel aus MONITOR_QUELLEN
 */
const t = (serie, datum, quelle, extra = {}) => ({ serie, datum, beginn: null, volumen: null, hoechst: null, quelle, ...extra });
const EAG = { volumen: 175, hoechst: 7.77 }; // § 5 Abs. 1/2 und § 4 Abs. 1 Z 1 EAG-MPV

export const TERMINE = Object.freeze([
  // Deutschland (Gebotstermine aus dem EEG; Volumen und Höchstwert gibt die Bundesnetzagentur je Termin bekannt)
  t("de-solar2", "2026-10-01", "eeg28b"),
  t("de-solar1", "2026-12-01", "eeg28a"),
  t("de-solar2", "2027-02-01", "eeg28b"),
  t("de-solar1", "2027-03-01", "eeg28a"),
  t("de-innovation", "2027-05-01", "eeg28e"),
  t("de-solar2", "2027-06-01", "eeg28b"),
  t("de-solar1", "2027-07-01", "eeg28a"),
  t("de-innovation", "2027-09-01", "eeg28e"),
  t("de-solar2", "2027-10-01", "eeg28b"),
  t("de-solar1", "2027-12-01", "eeg28a"),
  // Österreich (EAG-Marktprämienverordnung § 5: Termine und Volumen 2026/2027, § 4: Höchstpreis)
  t("at-eag-pv", "2026-09-24", "eagMpv", EAG),
  t("at-eag-pv", "2026-12-10", "eagMpv", EAG),
  t("at-eag-pv", "2027-02-10", "eagMpv", EAG),
  t("at-eag-pv", "2027-04-22", "eagMpv", EAG),
  t("at-eag-pv", "2027-07-08", "eagMpv", EAG),
  t("at-eag-pv", "2027-10-07", "eagMpv", EAG),
  // Schweiz (Pronovo: Runde 4/2026; Termine 2027 kommuniziert Pronovo mindestens einen Monat im Voraus)
  t("ch-heiv", "2026-11-01", "pronovo", { beginn: "2026-10-18", volumen: 50, hoechst: 620 }),
  t("ch-gmp", "2026-11-01", "pronovo", { beginn: "2026-10-18", volumen: 10, hoechst: 10 }),
]);
