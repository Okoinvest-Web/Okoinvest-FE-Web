// src/data/strompreisatlasCh.js
//
// CH-Strompreis-Atlas (Welle 4, Paket CHATLAS) – Datensatz für /marktdaten/strompreise-schweiz,
// die Downloads (CSV/JSON) und das Dataset-JSON-LD. EINZIGE Quelle; Auswertung in
// src/lib/marktdaten/strompreisatlasCh.js.
//
// Herkunft (statischer, versionierter Auszug – KEIN Live-Abruf):
//  - Amtliche ElCom-Tarifdaten über LINDAS (SPARQL-Endpunkt https://lindas.admin.ch/query),
//    einmalig abgerufen am ATLAS_ABRUF. Cubes:
//      https://energy.ld.admin.ch/elcom/electricityprice-canton  (Median je Kanton)
//      https://energy.ld.admin.ch/elcom/electricityprice         (Tarif je Netzbetreiber und Gemeinde)
//  - Nur Produkt „standard“, Tarifjahre 2026 und 2027, Kategorien H4 (Haushalt) und C3 (Gewerbe).
//    Gemeinden: acht Beispielstädte (Umfang bewusst klein). Werte unverändert in Rp./kWh.
//  - Was die Quelle nicht veröffentlicht, fehlt hier (z. B. CKW-Tarif Luzern 2027 zum Abrufdatum).
//    Es wird nichts geschätzt und nichts ergänzt.
//
// Lizenz am Original geprüft am 11.10.2026 (Paket CHATLAS):
//  - Beide Datensätze tragen auf opendata.swiss die Nutzungsbedingung
//    https://opendata.swiss/terms-of-use#terms_open („Open use“). Wortlaut der Bedingung
//    (https://opendata.swiss/en/terms-of-use, gelesen am 11.10.2026):
//      „Open use. You may use this dataset for non-commercial purposes. You may use this dataset
//       for commercial purposes. You are recommended to provide the source (author, title and
//       link to the dataset).“
//  - Nachweis der Einstufung: CKAN-Metadaten der Datensätze „Median Strompreis per Kanton“
//    (median-strompreis-per-kanton) und „Strompreis per Stromnetzbetreiber“
//    (strompreis-per-stromnetzbetreiber), Feld rights = terms_open, Herausgeber ElCom.
//  - Zweitprüfung der fachlichen Darstellung: TODO-E6.
//
// Neue Tarifjahre: Auszug neu ziehen (SPARQL siehe oben), anhängen, ATLAS_ABRUF/STAND anpassen.

export const ATLAS_ABRUF = "2026-10-11";
export const ATLAS_STAND = "2026-10-11";
export const ATLAS_JAHRE = Object.freeze(["2026", "2027"]);
export const ATLAS_PRUEFER = "Paket CHATLAS (Lizenz und Daten am Original geprüft 11.10.2026) · Zweitprüfung durch E6 ausstehend";

/** Verbraucherkategorien der ElCom (Beschreibung wörtlich aus den LINDAS-Stammdaten). */
export const ATLAS_KATEGORIEN = Object.freeze({
  H4: Object.freeze({
    name: "Haushalt H4",
    nameEn: "Household H4",
    beschreibung: "4'500 kWh/Jahr: 5-Zimmerwohnung mit Elektroherd und Tumbler (ohne Elektroboiler)",
    beschreibungEn: "4,500 kWh/year: 5-room flat with electric stove and tumble dryer (without electric boiler)",
  }),
  C3: Object.freeze({
    name: "Gewerbe C3",
    nameEn: "Commercial C3",
    beschreibung: "150'000 kWh/Jahr: Mittlerer Betrieb, max. beanspruchte Leistung: 50 kW",
    beschreibungEn: "150,000 kWh/year: medium-sized business, maximum demand 50 kW",
  }),
});

export const ATLAS_LIZENZ = Object.freeze({
  name: "Nutzungsbedingung „Open use“ (opendata.swiss)",
  nameEn: "Terms of use “Open use” (opendata.swiss)",
  url: "https://opendata.swiss/terms-of-use#terms_open",
  fundstelle: "https://opendata.swiss/en/terms-of-use",
  wortlaut:
    "Open use. You may use this dataset for non-commercial purposes. You may use this dataset for commercial purposes. You are recommended to provide the source (author, title and link to the dataset).",
  geprueft: "2026-10-11",
  hinweis: "Zusammenstellung der ÖkoInvest GmbH aus den amtlichen ElCom-Tarifdaten (LINDAS); Werte unverändert übernommen.",
  hinweisEn: "Compilation by ÖkoInvest GmbH from the official ElCom tariff data (LINDAS); values taken unchanged.",
});

export const ATLAS_QUELLEN = Object.freeze({
  kantone: Object.freeze({
    titel: "ElCom – Median Strompreis per Kanton (LINDAS-Cube electricityprice-canton, opendata.swiss)",
    titelEn: "ElCom – median electricity tariff per canton (LINDAS cube electricityprice-canton, opendata.swiss)",
    url: "https://opendata.swiss/de/dataset/median-strompreis-per-kanton",
    stand: "Tarifjahre 2026/2027",
  }),
  gemeinden: Object.freeze({
    titel: "ElCom – Strompreis per Stromnetzbetreiber (LINDAS-Cube electricityprice, opendata.swiss)",
    titelEn: "ElCom – electricity tariff per network operator (LINDAS cube electricityprice, opendata.swiss)",
    url: "https://opendata.swiss/de/dataset/strompreis-per-stromnetzbetreiber",
    stand: "Tarifjahre 2026/2027",
  }),
  elcom: Object.freeze({
    titel: "ElCom – Strompreis-Webseite (amtliche Tarifabfrage je Gemeinde)",
    titelEn: "ElCom – electricity price website (official tariff lookup per municipality)",
    url: "https://www.strompreis.elcom.admin.ch/",
    stand: "laufend",
  }),
});

/**
 * Median je Kanton (Produkt „standard“), Rp./kWh.
 * total = Median des Gesamtpreises; energie/netz/abgaben/netzzuschlag = Mediane der Bestandteile
 * (Energie, Netznutzung, Abgaben an Gemeinwesen, Netzzuschlag nach Art. 35 EnG).
 * Mediane der Bestandteile summieren sich NICHT exakt zum Median des Totals.
 */
export const ATLAS_KANTONE = Object.freeze([
  { jahr: "2026", kategorie: "C3", nr: 1, abk: "ZH", name: "Zürich", total: 24.426, energie: 11.179, netz: 9.637, abgaben: 0.16, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 2, abk: "BE", name: "Bern", total: 26.083, energie: 11.55, netz: 10.8, abgaben: 0.4, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 3, abk: "LU", name: "Luzern", total: 23.627, energie: 12.0, netz: 8.33, abgaben: 0.848, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 4, abk: "UR", name: "Uri", total: 20.151, energie: 8.007, netz: 9.024, abgaben: 0.7, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 5, abk: "SZ", name: "Schwyz", total: 25.177, energie: 11.375, netz: 10.204, abgaben: 0.81, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 6, abk: "OW", name: "Obwalden", total: 23.5, energie: 9.483, netz: 10.222, abgaben: 1.4, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 7, abk: "NW", name: "Nidwalden", total: 19.001, energie: 5.5, netz: 10.105, abgaben: 1.0, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 8, abk: "GL", name: "Glarus", total: 24.818, energie: 9.7, netz: 11.77, abgaben: 0.3, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 9, abk: "ZG", name: "Zug", total: 19.798, energie: 6.3, netz: 10.561, abgaben: 0.59, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 10, abk: "FR", name: "Freiburg", total: 25.156, energie: 15.79, netz: 7.016, abgaben: 0.0, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 11, abk: "SO", name: "Solothurn", total: 27.666, energie: 13.143, netz: 10.8, abgaben: 1.0, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 12, abk: "BS", name: "Basel-Stadt", total: 32.427, energie: 9.393, netz: 13.571, abgaben: 6.977, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 13, abk: "BL", name: "Basel-Landschaft", total: 28.418, energie: 12.8, netz: 12.742, abgaben: 0.52, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 14, abk: "SH", name: "Schaffhausen", total: 30.36, energie: 11.99, netz: 15.59, abgaben: 0.0, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 15, abk: "AR", name: "Appenzell Ausserrhoden", total: 23.478, energie: 11.98, netz: 8.959, abgaben: 0.0, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 16, abk: "AI", name: "Appenzell Innerrhoden", total: 26.03, energie: 12.397, netz: 11.143, abgaben: 0.0, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 17, abk: "SG", name: "St. Gallen", total: 25.803, energie: 11.98, netz: 10.1685, abgaben: 0.7, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 18, abk: "GR", name: "Graubünden", total: 25.266, energie: 9.6, netz: 11.69, abgaben: 1.0, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 19, abk: "AG", name: "Aargau", total: 24.564, energie: 10.95, netz: 10.686, abgaben: 0.628, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 20, abk: "TG", name: "Thurgau", total: 26.576, energie: 12.9, netz: 10.53, abgaben: 0.25, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 21, abk: "TI", name: "Tessin", total: 25.747, energie: 10.997, netz: 11.617, abgaben: 2.22, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 22, abk: "VD", name: "Waadt", total: 25.126, energie: 12.745, netz: 7.477, abgaben: 1.624, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 23, abk: "VS", name: "Wallis", total: 22.924, energie: 12.686, netz: 9.13, abgaben: 0.8, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 24, abk: "NE", name: "Neuenburg", total: 28.053, energie: 14.09, netz: 9.992, abgaben: 1.6, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 25, abk: "GE", name: "Genf", total: 22.89, energie: 10.087, netz: 9.225, abgaben: 1.158, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", nr: 26, abk: "JU", name: "Jura", total: 25.853, energie: 10.962, netz: 10.8, abgaben: 1.7, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 1, abk: "ZH", name: "Zürich", total: 24.758, energie: 12.112, netz: 9.397, abgaben: 0.16, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 2, abk: "BE", name: "Bern", total: 29.347, energie: 12.15, netz: 11.253, abgaben: 1.5, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 3, abk: "LU", name: "Luzern", total: 25.414, energie: 12.0, netz: 8.73, abgaben: 1.01, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 4, abk: "UR", name: "Uri", total: 25.069, energie: 9.946, netz: 10.222, abgaben: 1.0, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 5, abk: "SZ", name: "Schwyz", total: 28.155, energie: 12.844, netz: 10.729, abgaben: 0.81, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 6, abk: "OW", name: "Obwalden", total: 26.529, energie: 9.723, netz: 11.532, abgaben: 1.4, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 7, abk: "NW", name: "Nidwalden", total: 22.063, energie: 6.8, netz: 10.497, abgaben: 1.0, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 8, abk: "GL", name: "Glarus", total: 29.663, energie: 10.4, netz: 14.363, abgaben: 0.3, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 9, abk: "ZG", name: "Zug", total: 21.883, energie: 6.3, netz: 11.12, abgaben: 0.59, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 10, abk: "FR", name: "Freiburg", total: 27.279, energie: 14.548, netz: 8.777, abgaben: 0.0, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 11, abk: "SO", name: "Solothurn", total: 30.419, energie: 13.73, netz: 11.797, abgaben: 1.0, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 12, abk: "BS", name: "Basel-Stadt", total: 33.25, energie: 10.892, netz: 11.414, abgaben: 7.443, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 13, abk: "BL", name: "Basel-Landschaft", total: 31.977, energie: 13.73, netz: 14.257, abgaben: 0.623, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 14, abk: "SH", name: "Schaffhausen", total: 32.197, energie: 12.63, netz: 15.48, abgaben: 0.0, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 15, abk: "AR", name: "Appenzell Ausserrhoden", total: 28.741, energie: 13.968, netz: 10.913, abgaben: 0.0, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 16, abk: "AI", name: "Appenzell Innerrhoden", total: 27.57, energie: 12.1, netz: 11.597, abgaben: 0.0, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 17, abk: "SG", name: "St. Gallen", total: 29.7995, energie: 13.0, netz: 11.25, abgaben: 0.7, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 18, abk: "GR", name: "Graubünden", total: 29.197, energie: 9.6, netz: 12.597, abgaben: 1.4, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 19, abk: "AG", name: "Aargau", total: 27.73, energie: 11.5, netz: 12.2126, abgaben: 0.75, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 20, abk: "TG", name: "Thurgau", total: 29.43, energie: 13.4, netz: 11.997, abgaben: 0.245, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 21, abk: "TI", name: "Tessin", total: 25.133, energie: 9.263, netz: 10.33, abgaben: 2.22, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 22, abk: "VD", name: "Waadt", total: 30.416, energie: 14.038, netz: 10.592, abgaben: 1.624, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 23, abk: "VS", name: "Wallis", total: 26.867, energie: 13.357, netz: 9.23, abgaben: 0.972, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 24, abk: "NE", name: "Neuenburg", total: 30.014, energie: 13.872, netz: 10.642, abgaben: 1.6, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 25, abk: "GE", name: "Genf", total: 24.88, energie: 9.672, netz: 9.877, abgaben: 1.243, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", nr: 26, abk: "JU", name: "Jura", total: 27.896, energie: 10.887, netz: 11.253, abgaben: 1.7, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 1, abk: "ZH", name: "Zürich", total: 23.292, energie: 10.952, netz: 9.972, abgaben: 0.16, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 2, abk: "BE", name: "Bern", total: 23.658, energie: 9.9665, netz: 11.307, abgaben: 0.4, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 3, abk: "LU", name: "Luzern", total: 22.833, energie: 11.5, netz: 8.15, abgaben: 0.85, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 4, abk: "UR", name: "Uri", total: 19.262, energie: 7.298, netz: 8.844, abgaben: 0.7, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 5, abk: "SZ", name: "Schwyz", total: 23.371, energie: 11.075, netz: 9.897, abgaben: 0.81, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 6, abk: "OW", name: "Obwalden", total: 23.33, energie: 9.493, netz: 10.042, abgaben: 1.4, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 7, abk: "NW", name: "Nidwalden", total: 18.914, energie: 5.512, netz: 10.006, abgaben: 1.0, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 8, abk: "GL", name: "Glarus", total: 22.086, energie: 8.173, netz: 11.59, abgaben: 0.3, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 9, abk: "ZG", name: "Zug", total: 19.075, energie: 5.613, netz: 10.431, abgaben: 0.63, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 10, abk: "FR", name: "Freiburg", total: 23.971, energie: 14.2, netz: 7.416, abgaben: 0.0, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 11, abk: "SO", name: "Solothurn", total: 25.685, energie: 12.31, netz: 10.454, abgaben: 1.0, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 12, abk: "BS", name: "Basel-Stadt", total: 32.597, energie: 9.393, netz: 13.391, abgaben: 7.327, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 13, abk: "BL", name: "Basel-Landschaft", total: 26.239, energie: 12.924, netz: 10.454, abgaben: 0.505, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 14, abk: "SH", name: "Schaffhausen", total: 28.641, energie: 10.97, netz: 15.117, abgaben: 0.0, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 15, abk: "AR", name: "Appenzell Ausserrhoden", total: 23.101, energie: 11.818, netz: 8.715, abgaben: 0.0, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 16, abk: "AI", name: "Appenzell Innerrhoden", total: 24.146, energie: 10.991, netz: 10.707, abgaben: 0.0, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 17, abk: "SG", name: "St. Gallen", total: 24.668, energie: 11.818, netz: 10.393, abgaben: 0.7, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 18, abk: "GR", name: "Graubünden", total: 25.25, energie: 9.272, netz: 12.05, abgaben: 1.0, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 19, abk: "AG", name: "Aargau", total: 24.5625, energie: 10.207, netz: 10.978, abgaben: 0.65, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 20, abk: "TG", name: "Thurgau", total: 25.126, energie: 12.0, netz: 10.5475, abgaben: 0.25, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 21, abk: "TI", name: "Tessin", total: 25.16, energie: 9.85, netz: 10.748, abgaben: 2.22, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 22, abk: "VD", name: "Waadt", total: 23.827, energie: 11.803, netz: 7.416, abgaben: 1.624, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 23, abk: "VS", name: "Wallis", total: 22.782, energie: 11.895, netz: 8.625, abgaben: 0.88, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 24, abk: "NE", name: "Neuenburg", total: 26.33, energie: 12.251, netz: 10.102, abgaben: 1.6, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 25, abk: "GE", name: "Genf", total: 22.4, energie: 9.697, netz: 9.125, abgaben: 1.157, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", nr: 26, abk: "JU", name: "Jura", total: 22.86, energie: 7.453, netz: 11.307, abgaben: 1.7, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 1, abk: "ZH", name: "Zürich", total: 24.632, energie: 11.859, netz: 9.833, abgaben: 0.16, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 2, abk: "BE", name: "Bern", total: 27.9485, energie: 10.5935, netz: 11.913, abgaben: 1.5, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 3, abk: "LU", name: "Luzern", total: 24.717, energie: 11.5, netz: 8.55, abgaben: 0.93, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 4, abk: "UR", name: "Uri", total: 24.088, energie: 9.245, netz: 9.942, abgaben: 1.0, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 5, abk: "SZ", name: "Schwyz", total: 27.229, energie: 12.544, netz: 10.449, abgaben: 0.81, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 6, abk: "OW", name: "Obwalden", total: 25.988, energie: 9.672, netz: 11.042, abgaben: 1.4, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 7, abk: "NW", name: "Nidwalden", total: 21.959, energie: 6.076, netz: 10.983, abgaben: 1.0, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 8, abk: "GL", name: "Glarus", total: 26.55, energie: 8.098, netz: 14.183, abgaben: 0.3, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 9, abk: "ZG", name: "Zug", total: 21.146, energie: 5.676, netz: 10.94, abgaben: 0.63, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 10, abk: "FR", name: "Freiburg", total: 26.481, energie: 13.148, netz: 9.193, abgaben: 0.0, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 11, abk: "SO", name: "Solothurn", total: 28.513, energie: 12.414, netz: 11.913, abgaben: 1.0, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 12, abk: "BS", name: "Basel-Stadt", total: 33.42, energie: 10.892, netz: 11.234, abgaben: 7.793, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 13, abk: "BL", name: "Basel-Landschaft", total: 31.205, energie: 13.452, netz: 13.775, abgaben: 0.611, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 14, abk: "SH", name: "Schaffhausen", total: 30.823, energie: 11.9, netz: 15.05, abgaben: 0.0, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 15, abk: "AR", name: "Appenzell Ausserrhoden", total: 29.113, energie: 13.786, netz: 11.283, abgaben: 0.0, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 16, abk: "AI", name: "Appenzell Innerrhoden", total: 25.59, energie: 11.1, netz: 10.617, abgaben: 0.0, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 17, abk: "SG", name: "St. Gallen", total: 30.113, energie: 12.971, netz: 11.631, abgaben: 0.7, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 18, abk: "GR", name: "Graubünden", total: 28.553, energie: 9.375, netz: 12.967, abgaben: 1.4, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 19, abk: "AG", name: "Aargau", total: 26.883, energie: 10.65, netz: 11.55, abgaben: 0.7, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 20, abk: "TG", name: "Thurgau", total: 28.343, energie: 12.5, netz: 12.269, abgaben: 0.25, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 21, abk: "TI", name: "Tessin", total: 25.911, energie: 10.35, netz: 9.628, abgaben: 2.22, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 22, abk: "VD", name: "Waadt", total: 29.086, energie: 13.005, netz: 10.183, abgaben: 1.624, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 23, abk: "VS", name: "Wallis", total: 26.557, energie: 12.092, netz: 9.033, abgaben: 0.974, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 24, abk: "NE", name: "Neuenburg", total: 28.657, energie: 12.1705, netz: 10.8395, abgaben: 1.6, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 25, abk: "GE", name: "Genf", total: 24.432, energie: 9.325, netz: 9.777, abgaben: 1.243, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", nr: 26, abk: "JU", name: "Jura", total: 25.791, energie: 7.967, netz: 11.913, abgaben: 1.7, netzzuschlag: 2.3 },
]);

/** Beispielstädte: Tarif je Netzbetreiber (Produkt „standard“), Rp./kWh. */
export const ATLAS_GEMEINDEN = Object.freeze([
  { jahr: "2026", kategorie: "C3", bfs: 2701, name: "Basel", betreiber: "IWB Industrielle Werke Basel", total: 32.427, energie: 9.393, netz: 13.571, abgaben: 6.977, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", bfs: 351, name: "Bern", betreiber: "Energie Wasser Bern", total: 30.958, energie: 13.479, netz: 13.367, abgaben: 1.75, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", bfs: 6621, name: "Genève", betreiber: "Services industriels de Genève", total: 22.89, energie: 10.087, netz: 9.225, abgaben: 1.158, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", bfs: 5586, name: "Lausanne", betreiber: "Services Industriels de Lausanne", total: 29.395, energie: 10.007, netz: 11.948, abgaben: 4.924, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", bfs: 5192, name: "Lugano", betreiber: "Aziende Industriali di Lugano (AIL) SA", total: 24.727, energie: 8.55, netz: 11.617, abgaben: 2.22, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", bfs: 1061, name: "Luzern", betreiber: "CKW AG", total: 24.579, energie: 12.0, netz: 8.33, abgaben: 1.8, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", bfs: 1061, name: "Luzern", betreiber: "ewl Kabelnetz AG", total: 21.462, energie: 6.021, netz: 10.983, abgaben: 2.1, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", bfs: 3203, name: "St. Gallen", betreiber: "St.Galler Stadtwerke", total: 27.179, energie: 11.711, netz: 11.289, abgaben: 1.76, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "C3", bfs: 261, name: "Zürich", betreiber: "Elektrizitätswerk der Stadt Zürich", total: 25.307, energie: 8.787, netz: 12.165, abgaben: 2.0, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", bfs: 2701, name: "Basel", betreiber: "IWB Industrielle Werke Basel", total: 33.25, energie: 10.892, netz: 11.414, abgaben: 7.443, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", bfs: 351, name: "Bern", betreiber: "Energie Wasser Bern", total: 33.26, energie: 13.2, netz: 13.03, abgaben: 2.65, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", bfs: 6621, name: "Genève", betreiber: "Services industriels de Genève", total: 24.88, energie: 9.672, netz: 9.877, abgaben: 1.243, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", bfs: 5586, name: "Lausanne", betreiber: "Services Industriels de Lausanne", total: 30.503, energie: 9.353, netz: 11.926, abgaben: 4.924, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", bfs: 5192, name: "Lugano", betreiber: "Aziende Industriali di Lugano (AIL) SA", total: 25.133, energie: 8.95, netz: 10.33, abgaben: 2.22, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", bfs: 1061, name: "Luzern", betreiber: "CKW AG", total: 26.203, energie: 12.0, netz: 8.73, abgaben: 1.8, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", bfs: 1061, name: "Luzern", betreiber: "ewl Kabelnetz AG", total: 27.197, energie: 9.032, netz: 11.844, abgaben: 2.1, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", bfs: 3203, name: "St. Gallen", betreiber: "St.Galler Stadtwerke", total: 30.59, energie: 12.987, netz: 11.25, abgaben: 1.76, netzzuschlag: 2.3 },
  { jahr: "2026", kategorie: "H4", bfs: 261, name: "Zürich", betreiber: "Elektrizitätswerk der Stadt Zürich", total: 24.758, energie: 7.884, netz: 10.735, abgaben: 2.0, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", bfs: 2701, name: "Basel", betreiber: "IWB Industrielle Werke Basel", total: 32.597, energie: 9.393, netz: 13.391, abgaben: 7.327, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", bfs: 351, name: "Bern", betreiber: "Energie Wasser Bern", total: 29.39, energie: 10.75, netz: 14.1, abgaben: 2.1, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", bfs: 6621, name: "Genève", betreiber: "Services industriels de Genève", total: 22.4, energie: 9.697, netz: 9.125, abgaben: 1.157, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", bfs: 5586, name: "Lausanne", betreiber: "Services Industriels de Lausanne", total: 29.26, energie: 9.524, netz: 12.296, abgaben: 4.924, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", bfs: 5192, name: "Lugano", betreiber: "Aziende Industriali di Lugano (AIL) SA", total: 25.16, energie: 9.85, netz: 10.748, abgaben: 2.22, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", bfs: 1061, name: "Luzern", betreiber: "ewl Kabelnetz AG", total: 21.28, energie: 7.33, netz: 9.434, abgaben: 2.1, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", bfs: 3203, name: "St. Gallen", betreiber: "St.Galler Stadtwerke", total: 29.31, energie: 13.492, netz: 11.603, abgaben: 1.76, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "C3", bfs: 261, name: "Zürich", betreiber: "Elektrizitätswerk der Stadt Zürich", total: 24.432, energie: 8.787, netz: 11.985, abgaben: 1.3, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", bfs: 2701, name: "Basel", betreiber: "IWB Industrielle Werke Basel", total: 33.42, energie: 10.892, netz: 11.234, abgaben: 7.793, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", bfs: 351, name: "Bern", betreiber: "Energie Wasser Bern", total: 31.113, energie: 10.75, netz: 13.45, abgaben: 2.8, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", bfs: 6621, name: "Genève", betreiber: "Services industriels de Genève", total: 24.432, energie: 9.325, netz: 9.777, abgaben: 1.243, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", bfs: 5586, name: "Lausanne", betreiber: "Services Industriels de Lausanne", total: 30.418, energie: 8.919, netz: 12.275, abgaben: 4.924, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", bfs: 5192, name: "Lugano", betreiber: "Aziende Industriali di Lugano (AIL) SA", total: 25.911, energie: 10.35, netz: 9.628, abgaben: 2.22, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", bfs: 1061, name: "Luzern", betreiber: "ewl Kabelnetz AG", total: 25.562, energie: 8.75, netz: 10.358, abgaben: 2.1, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", bfs: 3203, name: "St. Gallen", betreiber: "St.Galler Stadtwerke", total: 31.569, energie: 12.971, netz: 11.631, abgaben: 1.76, netzzuschlag: 2.3 },
  { jahr: "2027", kategorie: "H4", bfs: 261, name: "Zürich", betreiber: "Elektrizitätswerk der Stadt Zürich", total: 24.632, energie: 7.884, netz: 11.122, abgaben: 1.3, netzzuschlag: 2.3 },
]);
