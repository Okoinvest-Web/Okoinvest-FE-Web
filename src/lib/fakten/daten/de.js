// src/lib/fakten/daten/de.js
//
// Fakten DEUTSCHLAND (und DACH-weit gültige Technikwerte) – Welle 2, Paket B1.
// Überführt aus src/lib/invest/markt.js (FREIFLAECHE, ERLOESE, ZUSCHLAEGE, PACHT, KOMMUNE,
// DACH = Dach-PV, REGIONEN.ertrag, QUELLEN). Werte UNVERÄNDERT übernommen; Quelle ist die,
// die markt.js bzw. QUELLEN schon nannte. Wo markt.js keine Quelle nannte, steht die
// einschlägige Norm mit status "zu_pruefen" (von B1 ergänzt, nicht am Original geprüft).
// Eigene Einschätzungen: klasse "C", quelle.art "eigen", status "zu_pruefen".
// Vertrag: ../schema.js. NUR über src/lib/fakten/index.js importieren.
//
// Prüfer: Werte mit Vermerk „Paket E … abgerufen 03.10.2026“ in markt.js gelten als am
// Original geprüft (KI-Prüfung Welle 1). Die zweite Prüfperson (E6) ist noch nicht benannt
// → TODO-E6 im Feld pruefer. Inhaber-Entscheidung offen.

const PAKET_E = "2026-10-03";
/** Recherchestand laut markt.js „September 2026“ – Tag nicht dokumentiert, daher Monatsanfang */
const RECHERCHE = "2026-09-01";
const GEPRUEFT_E = "Paket E (Welle 1, Prüfung am Original) · Zweitprüfung TODO-E6";
const OFFEN = "TODO-E6";

const Q = {
  bnetza1: {
    titel: "Bundesnetzagentur – Beendete Ausschreibungen Solaranlagen erstes Segment",
    url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/BeendeteAusschreibungen/start.html",
  },
  bnetza2: {
    titel: "Bundesnetzagentur – Beendete Ausschreibungen Solaranlagen zweites Segment",
    url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen2/BeendeteAusschreibungen/start.html",
  },
  ise: { titel: "Fraunhofer ISE – Studie Stromgestehungskosten erneuerbarer Energien (Juli 2024)", url: "https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/studie-stromgestehungskosten-erneuerbare-energien.html" },
  pvgis: { titel: "EU JRC – PVGIS 5.3 (API PVcalc, SARAH3, 14 % Systemverluste, optimaler Winkel)", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" },
  lfl: { titel: "Bayerische Landesanstalt für Landwirtschaft – Solar/Photovoltaik: Strommarkt in den Jahren 2025, 2024, 2023", url: "https://www.lfl.bayern.de/iba/energie/372343/index.php" },
  eeg6: { titel: "EEG 2023, § 6 – Finanzielle Beteiligung der Kommunen", url: "https://www.gesetze-im-internet.de/eeg_2014/__6.html" },
  eeg8: { titel: "EEG 2023, § 8 – Anschluss (Abs. 6: Netzverträglichkeitsprüfung)", url: "https://www.gesetze-im-internet.de/eeg_2014/__8.html" },
  eeg25: { titel: "EEG 2023, § 25 – Beginn, Dauer und Beendigung des Anspruchs", url: "https://www.gesetze-im-internet.de/eeg_2014/__25.html" },
  eeg51: { titel: "EEG 2023, § 51 – Verringerung des Zahlungsanspruchs bei negativen Preisen", url: "https://www.gesetze-im-internet.de/eeg_2014/__51.html" },
  gewstg8: { titel: "Gewerbesteuergesetz, § 8 – Hinzurechnungen", url: "https://www.gesetze-im-internet.de/gewstg/__8.html" },
  gewstg11: { titel: "Gewerbesteuergesetz, § 11 – Steuermesszahl und Steuermessbetrag", url: "https://www.gesetze-im-internet.de/gewstg/__11.html" },
  gewstg16: { titel: "Gewerbesteuergesetz, § 16 – Hebesatz", url: "https://www.gesetze-im-internet.de/gewstg/__16.html" },
  gewstg29: { titel: "Gewerbesteuergesetz, § 29 – Zerlegungsmaßstab", url: "https://www.gesetze-im-internet.de/gewstg/__29.html" },
  praxisAgrar: {
    titel: "Bundesinformationszentrum Landwirtschaft – Pachtpreise (Destatis, Agrarstrukturerhebung 2023)",
    url: "https://www.praxis-agrar.de/service/infografiken/pachtpreise",
    art: "sekundaer",
  },
  fawSolar: { titel: "Fachagentur Wind und Solar – Regelungen zur finanziellen Teilhabe (Länderübersicht)", url: "https://www.fachagentur-wind-solar.de/solar/finanzielle-teilhabe/regelungen-zur-finanziellen-teilhabe", art: "sekundaer" },
  eigen: { titel: "Eigene Markteinschätzung ÖKOVOLT-Gruppe (Projektpraxis, keine Einzelquelle)", url: null, art: "eigen" },
  eigenNetz: { titel: "Eigene Einschätzung aus Projektpraxis und öffentlichen Angaben von Netzbetreibern", url: null, art: "eigen" },
  eigenDach: { titel: "Eigene Marktbeobachtung ÖKOVOLT-Gruppe (Gewerbedächer), Spannen ohne Netzausbau", url: null, art: "eigen" },
};

/** Eigene Annahme Deutschland (Klasse C, zu prüfen) */
const eigen = (id, wert, einheit, notiz, extra = {}) => ({
  id, wert, einheit, land: "DE", quelle: Q.eigen, abruf: RECHERCHE, gueltigAb: null, gueltigBis: null, status: "zu_pruefen", pruefer: OFFEN, klasse: "C", ...(notiz ? { notiz } : {}), ...extra,
});
/** Norm mit Fundstelle, von B1 ergänzt, nicht am Original geprüft (Klasse A) */
const norm = (id, wert, einheit, quelle, notiz) => ({
  id, wert, einheit, land: "DE", quelle, abruf: RECHERCHE, gueltigAb: null, gueltigBis: null, status: "zu_pruefen", pruefer: OFFEN, klasse: "A", notiz: notiz || "Fundstelle von B1 ergänzt (markt.js nannte keine); Wert nicht am Gesetzestext nachgeprüft.",
});

/* ------------------------------------------------------------------ */
/* Freiflächen-PV                                                      */
/* ------------------------------------------------------------------ */

const FREIFLAECHE = [
  eigen("freiflaeche.haProMwp", 1.1, "ha/MWp", "Süd, fest, moderne Module ~580–620 Wp. Technikwert, gilt DACH-weit.", { land: "DACH" }),
  eigen("freiflaeche.mindestHa", 3, "ha", "Sinnvolle Mindestgröße einer Fläche (darunter selten wirtschaftlich)."),
  eigen("freiflaeche.capexProKwp", { min: 400, mittel: 470, max: 600 }, "€/kWp", "Schlüsselfertige Errichtung (EPC) ohne Netzanschluss; große Parks 2025/26 am unteren Ende."),
  eigen("freiflaeche.kabelProMeter", 120, "€/m", "Mittelspannungs-Kabeltrasse inkl. Tiefbau.", { quelle: Q.eigenNetz }),
  eigen("freiflaeche.netzanschlussFixProMwp", 35000, "€/MWp", "Übergabestation/Trafo je MWp.", { quelle: Q.eigenNetz }),
  eigen("freiflaeche.entwicklungProKwp", { min: 40, max: 90 }, "€/kWp", "Planung, Gutachten, B-Plan bis Baureife."),
  eigen("freiflaeche.opexProKwp", 9, "€/kWp·a", "Ohne Pacht; größere Parks 7–9, kleine 10–12."),
  eigen("freiflaeche.rueckbauProKwp", 25, "€/kWp", "Rückbau-Rücklage einmalig."),
  eigen("freiflaeche.degradation", 0.004, "Anteil/Jahr", "Jährliche Moduldegradation. Technikwert, gilt DACH-weit.", { land: "DACH" }),
  eigen("freiflaeche.inflation", 0.02, "Anteil/Jahr", "Kostensteigerung Opex."),
  eigen("freiflaeche.laufzeit", 30, "Jahre", "Betrachtungszeitraum. Technikwert, gilt DACH-weit.", { land: "DACH" }),
  eigen("freiflaeche.netz.msSystemMw", 12, "MW", "Übertragbare Leistung je 20-kV-Kabelsystem über typische Trassenlängen.", { quelle: Q.eigenNetz }),
  eigen("freiflaeche.netz.zusatzSystemFaktor", 0.6, "Anteil", "Jedes weitere System in derselben Trasse, Anteil der Kosten je Meter.", { quelle: Q.eigenNetz }),
  eigen("freiflaeche.netz.uwFeld", { min: 150000, mittel: 250000, max: 400000 }, "€", "Schaltfeld an der MS-Sammelschiene eines Umspannwerks.", { quelle: Q.eigenNetz }),
  eigen("freiflaeche.netz.einschleifen", 80000, "€", "Einschleifen in eine bestehende MS-Leitung.", { quelle: Q.eigenNetz }),
  eigen("freiflaeche.netz.hsKabelProKm", { min: 900000, mittel: 1300000, max: 2000000 }, "€/km", "110-kV-Kabeltrasse inkl. Tiefbau.", { quelle: Q.eigenNetz }),
  eigen("freiflaeche.netz.kundenUwFix", 2000000, "€", "Kundenumspannwerk 110/20 kV, Grundkosten.", { quelle: Q.eigenNetz }),
  eigen("freiflaeche.netz.kundenUwProMva", 40000, "€/MVA", "Kundenumspannwerk, je MVA.", { quelle: Q.eigenNetz }),
  eigen("freiflaeche.netz.grenzeMsMw", 12, "MW", "Bis hierhin Anschluss an eine MS-Leitung in der Regel möglich.", { quelle: Q.eigenNetz }),
  eigen("freiflaeche.netz.grenzeUwMw", 35, "MW", "Bis hierhin meist MS-Sammelschiene eines Umspannwerks, darüber 110 kV.", { quelle: Q.eigenNetz }),
  eigen(
    "freiflaeche.netz.abregelung",
    [
      [1.0, 0],
      [0.9, 0.005],
      [0.8, 0.015],
      [0.7, 0.04],
      [0.6, 0.08],
      [0.5, 0.15],
    ],
    "Tabelle [Anschluss/Modulleistung, Energieverlust]",
    "Näherung für Süd, fest, DE.",
    { quelle: Q.eigenNetz }
  ),
  norm("freiflaeche.netz.pruefWochen", 8, "Wochen", Q.eeg8, "§ 8 Abs. 6 EEG: Netzverträglichkeitsprüfung mit Kostenvoranschlag spätestens nach acht Wochen. Wert aus markt.js, nicht am Gesetzestext nachgeprüft."),
];

/* ------------------------------------------------------------------ */
/* Ausschreibungsergebnisse (Bundesnetzagentur)                        */
/* ------------------------------------------------------------------ */

const zuschlag = (segment, datum, ct, hoechstwertCt) => ({
  id: `zuschlag.${segment}.${datum}`,
  wert: { ct, hoechstwertCt },
  einheit: "ct/kWh",
  land: "DE",
  quelle: segment === "dach" ? Q.bnetza2 : Q.bnetza1,
  abruf: PAKET_E,
  gueltigAb: datum,
  gueltigBis: null,
  status: "geprueft",
  pruefer: GEPRUEFT_E,
  klasse: "B",
  notiz: "ct = mengengewichteter durchschnittlicher Zuschlagswert, hoechstwertCt = zulässiger Höchstwert des Gebotstermins (gueltigAb = Gebotstermin).",
});

const ZUSCHLAEGE = [
  zuschlag("freiflaeche", "2025-03-01", 4.66, 6.8),
  zuschlag("freiflaeche", "2025-07-01", 4.84, 6.8),
  zuschlag("freiflaeche", "2025-12-01", 5.0, 6.8),
  zuschlag("freiflaeche", "2026-03-01", 4.94, 5.79),
  zuschlag("freiflaeche", "2026-07-01", 4.79, 5.9),
  zuschlag("dach", "2025-02-01", 9.1, 10.4),
  zuschlag("dach", "2025-06-01", 9.22, 10.4),
  zuschlag("dach", "2025-10-01", 9.66, 10.4),
  zuschlag("dach", "2026-02-01", 9.56, 10.0),
  zuschlag("dach", "2026-06-01", 9.72, 10.0),
];

/* ------------------------------------------------------------------ */
/* Erlöse und Erlösmodell (EEG)                                        */
/* ------------------------------------------------------------------ */

const ERLOESE = [
  eigen("erloese.eegFreiflaecheCt", 4.8, "ct/kWh", "Rechenwert: Mittel der letzten drei Zuschlagstermine 4,91 ct, bewusst leicht darunter (siehe zuschlag.freiflaeche.*).", {
    quelle: { titel: "Eigener Rechenwert aus den Ausschreibungsergebnissen der Bundesnetzagentur", url: Q.bnetza1.url, art: "eigen" },
    abruf: PAKET_E,
  }),
  eigen("erloese.eegBesondereCt", 5.3, "ct/kWh", "Agri-PV im ersten Segment: Zuschlag Freifläche + Bonus 0,5 ct/kWh für hoch aufgeständerte Anlagen. Eigenes Untersegment beihilferechtlich noch nicht freigegeben (zu prüfen)."),
  {
    id: "erloese.ppaCt",
    wert: { min: 3.8, mittel: 4.5, max: 5.5 },
    einheit: "ct/kWh",
    land: "DE",
    quelle: { titel: "dena PPA-Marktanalyse / Pexapark (Erzeuger-PPA 3,5–4,5 ct), eigene Einordnung", url: null, art: "sekundaer" },
    abruf: RECHERCHE,
    gueltigAb: null,
    gueltigBis: null,
    status: "zu_pruefen",
    pruefer: OFFEN,
    klasse: "B",
    notiz: "PPA Solar pay-as-produced, 10 Jahre. Fundstelle nachtragen.",
  },
  eigen("erloese.merchantCt", 4.0, "ct/kWh", "Durchschnittlicher Marktwert Solar (Capture Price) nach Förderende, konservativ."),
  eigen("erloese.merchantSteigerung", 0.01, "Anteil/Jahr", "Nominale Steigerung des Solar-Marktwerts, unter der Inflation (Kannibalisierung)."),
  {
    id: "erloese.negativAnteilSolar",
    wert: 0.234,
    einheit: "Anteil",
    land: "DE",
    quelle: Q.lfl,
    abruf: PAKET_E,
    gueltigAb: "2025-01-01",
    gueltigBis: null,
    status: "geprueft",
    pruefer: GEPRUEFT_E,
    klasse: "B",
    notiz: "Anteil der Solarerzeugung in Stunden mit negativen Preisen 2025 (Erzeugung nach SMARD). Andere Auswertungen liegen darunter (pv magazine 26.01.2026, ENTSO-E-Viertelstunden: 15,97 %) – Spanne, kein Naturgesetz.",
  },
  {
    id: "erloese.lcoeIseCt",
    wert: { min: 4.1, max: 6.9 },
    einheit: "ct/kWh",
    land: "DE",
    quelle: Q.ise,
    abruf: RECHERCHE,
    gueltigAb: null,
    gueltigBis: null,
    status: "zu_pruefen",
    pruefer: OFFEN,
    klasse: "B",
    notiz: "Neue PV-Freiflächenanlagen in DE. Wert aus markt.js, in Welle 1 nicht am Original nachgeprüft.",
  },
  {
    id: "recht.eeg.paragraph51",
    wert: "Für Zeiträume, in denen der Spotmarktpreis negativ ist, verringert sich der anzulegende Wert auf null.",
    einheit: "Text",
    land: "DE",
    quelle: Q.eeg51,
    abruf: PAKET_E,
    gueltigAb: null,
    gueltigBis: null,
    status: "geprueft",
    pruefer: GEPRUEFT_E,
    klasse: "A",
    notiz: "Fassung seit Solarspitzengesetz. § 51a EEG (Verlängerung des Vergütungszeitraums) wird in den Rechnern NICHT gerechnet (vorsichtig).",
  },
  norm("recht.eeg.foerderdauerJahre", 20, "Jahre", Q.eeg25, "Zahlungsanspruch 20 Jahre (§ 25 EEG). Bisher als Zahl 20 in den Rechnern; Fundstelle von B1 ergänzt, nicht am Gesetzestext nachgeprüft."),
];

/* ------------------------------------------------------------------ */
/* Pacht                                                               */
/* ------------------------------------------------------------------ */

const PACHT = [
  eigen("pacht.freiflaecheProHa", { min: 1500, mittel: 2800, max: 4500 }, "€/ha·a", "Freiflächen-PV Deutschland 2025/26, keine Einzelquelle. Für AT/CH NICHT verwenden (eigene Fakten je Land)."),
  eigen("pacht.agriProHa", { min: 600, mittel: 1200, max: 2000 }, "€/ha·a", "Agri-PV: Bewirtschaftung bleibt beim Landwirt, Pacht deutlich unter Freifläche."),
  eigen("pacht.umsatzbeteiligung", { min: 0.04, max: 0.08 }, "Anteil der Stromerlöse"),
  {
    id: "pacht.ackerProHa",
    wert: 407,
    einheit: "€/ha·a",
    land: "DE",
    quelle: Q.praxisAgrar,
    abruf: PAKET_E,
    gueltigAb: null,
    gueltigBis: null,
    status: "geprueft",
    pruefer: GEPRUEFT_E,
    klasse: "B",
    notiz: "Durchschnittliches Pachtentgelt Ackerland 2023 (Agrarstrukturerhebung). Gesamtwert 357 €/ha bestätigt in Destatis-PM Nr. 153 vom 12.04.2024. Paket E: von 380 auf 407 korrigiert.",
  },
  {
    id: "pacht.gruenlandProHa",
    wert: 212,
    einheit: "€/ha·a",
    land: "DE",
    quelle: Q.praxisAgrar,
    abruf: PAKET_E,
    gueltigAb: null,
    gueltigBis: null,
    status: "geprueft",
    pruefer: GEPRUEFT_E,
    klasse: "B",
    notiz: "Dauergrünland 2023 (Agrarstrukturerhebung).",
  },
  eigen("pacht.deckungsbeitragAcker", { min: 200, mittel: 450, max: 800 }, "€/ha·a", "Deckungsbeitrag Ackerbau (Getreide), stark schwankend."),
  eigen("pacht.laufzeit", 30, "Jahre"),
  eigen("pacht.verlaengerung", "2 × 5 Jahre Option", "Text"),
  eigen("pacht.indexierung", 0.015, "Anteil/Jahr", "Verbraucherpreisindex, vereinfacht."),
  eigen("pacht.reservierungProHa", { min: 100, max: 300 }, "€/ha·a", "Bereitstellungs-/Reservierungsprämie bis Baubeginn."),
  eigen("pacht.diskontEigentuemer", 0.03, "Anteil/Jahr", "Kalkulationszins für den Barwert aus Sicht des Eigentümers (Pachtangebot-Check)."),
  eigen("pacht.reservierungJahre", { ueblich: 3, max: 5 }, "Jahre", "Übliche Dauer der Reservierungs-/Optionsphase."),
  eigen("pacht.festlaufzeitMax", 30, "Jahre", "Festlaufzeit, ab der eine Bindung unüblich lang wird."),
  eigen("pacht.verlaengerungMax", 10, "Jahre", "Übliche Summe der Verlängerungsoptionen des Pächters."),
  eigen("pacht.anwaltskosten", { min: 1000, max: 3000 }, "€", "Übliche Kostenübernahme für die anwaltliche Prüfung des Vertrags."),
];

/* ------------------------------------------------------------------ */
/* Kommunen                                                            */
/* ------------------------------------------------------------------ */

const KOMMUNE = [
  {
    id: "kommune.beteiligungCt",
    wert: 0.2,
    einheit: "ct/kWh",
    land: "DE",
    quelle: Q.eeg6,
    abruf: PAKET_E,
    gueltigAb: null,
    gueltigBis: null,
    status: "geprueft",
    pruefer: GEPRUEFT_E,
    klasse: "A",
    notiz: "§ 6 EEG: freiwillige Zahlung bis 0,2 ct/kWh; Erstattung nur für geförderte Strommengen (§ 6 Abs. 5).",
  },
  norm("kommune.gewerbesteuerStandort", 0.9, "Anteil", Q.gewstg29, "§ 29 Abs. 1 Nr. 2 GewStG: 90 % des Messbetrags an die Standortgemeinde (Solar). Wert aus markt.js, nicht am Gesetzestext nachgeprüft."),
  {
    id: "kommune.hebesatz",
    wert: 4.09,
    einheit: "Faktor",
    land: "DE",
    quelle: { titel: "Statistisches Bundesamt – Pressemitteilung Nr. 309 vom 21.08.2025 (durchschnittlicher Hebesatz aller Gemeinden 2024)", url: null, art: "primaer" },
    abruf: PAKET_E,
    gueltigAb: "2024-01-01",
    gueltigBis: null,
    status: "zu_pruefen",
    pruefer: OFFEN,
    klasse: "B",
    notiz: "Hebesatz 409 % als Faktor 4,09. In Paket E am Original gelesen; die genaue URL der Pressemitteilung ist nicht dokumentiert – nachtragen, dann status geprueft.",
  },
  {
    id: "kommune.laenderMitBeteiligungsgesetz",
    wert: ["MV", "BB", "NI", "SL", "SN", "ST", "BY"],
    einheit: "Liste Bundesländer",
    land: "DE",
    quelle: Q.fawSolar,
    abruf: "2026-07-17",
    gueltigAb: null,
    gueltigBis: null,
    status: "zu_pruefen",
    pruefer: OFFEN,
    klasse: "A",
    notiz: "Länder, die Zahlungen bzw. Angebote vorschreiben (Stand der Übersicht 17.07.2026). Rechner bilden die Landesregeln noch NICHT ab; Werte je Land vor Übernahme am Gesetzestext prüfen.",
  },
  norm("kommune.messzahl", 0.035, "Anteil", Q.gewstg11, "Steuermesszahl 3,5 % (§ 11 Abs. 2 GewStG). Fundstelle von B1 ergänzt, nicht nachgeprüft."),
  eigen("kommune.betrachtungJahre", 20, "Jahre", "Betrachtungszeitraum für Kommunen (entspricht der EEG-Förderdauer)."),
  norm("kommune.afaJahre", 20, "Jahre", { titel: "AfA-Tabelle für die allgemein verwendbaren Anlagegüter (BMF)", url: null, art: "primaer" }, "Nutzungsdauer PV, lineare Abschreibung. Fundstelle (URL) nachtragen."),
  norm("kommune.hinzurechnungZinsen", 0.25, "Anteil", Q.gewstg8, "§ 8 Nr. 1 GewStG: 25 % der Entgelte für Schulden, soweit die Summe den Freibetrag übersteigt."),
  norm("kommune.hinzurechnungFreibetrag", 200000, "€", Q.gewstg8, "Freibetrag der Hinzurechnung nach § 8 Nr. 1 GewStG."),
  eigen("kommune.hebesatzSpanne", { min: 2.0, max: 6.0 }, "Faktor", "Reglerspanne im Rechner; Minimum 200 % nach § 16 Abs. 4 GewStG, Maximum Bedienspanne.", {
    quelle: { titel: Q.gewstg16.titel + " (Minimum), Obergrenze eigene Bedienspanne", url: Q.gewstg16.url, art: "eigen" },
  }),
];

/* ------------------------------------------------------------------ */
/* Dach-PV (markt.js DACH = Dachpacht, nicht die Region DACH)         */
/* ------------------------------------------------------------------ */

const dach = (id, wert, einheit, notiz, extra) => eigen(`dach.${id}`, wert, einheit, notiz, { quelle: Q.eigenDach, ...extra });

const DACH_PV = [
  dach("mindestM2", 1000, "m²", "Sinnvolle Mindestgröße für Dachpacht."),
  dach(
    "dacharten",
    [
      { id: "trapez", label: "Trapezblech", sub: "geneigt, Aufdach", m2ProKwp: 6, ertragFaktor: 0.95, belegbar: true, lastKgM2: "ca. 12–15 kg/m²" },
      { id: "sandwich", label: "Sandwichpaneel", sub: "Halle, gedämmt", m2ProKwp: 6, ertragFaktor: 0.95, belegbar: true, lastKgM2: "ca. 12–15 kg/m²" },
      { id: "flach", label: "Flachdach", sub: "Folie/Bitumen, Ost/West", m2ProKwp: 7, ertragFaktor: 0.9, belegbar: true, lastKgM2: "ca. 15–25 kg/m² mit Ballast" },
      { id: "faserzement", label: "Faserzement", sub: "Wellplatten", m2ProKwp: null, ertragFaktor: null, belegbar: false, lastKgM2: "–" },
    ],
    "Tabelle (m²/kWp, Ertragsfaktor)",
    "Dachfläche brutto je kWp und Ertragsfaktor relativ zur optimalen Freiflächenanlage."
  ),
  dach(
    "ausrichtung",
    [
      { id: "sued", label: "Süd", faktor: 1.0 },
      { id: "suedOstWest", label: "Südost/-west", faktor: 0.97 },
      { id: "ostWest", label: "Ost/West", faktor: 0.9 },
      { id: "nord", label: "Nord, flach geneigt", faktor: 0.78 },
    ],
    "Tabelle (Faktor)"
  ),
  dach("pachtProM2", { min: 1.0, mittel: 1.5, max: 3.0 }, "€/m²·a", "Marktübersichten nennen meist 2–5 €/m² (Werbewerte); bewusst vorsichtiger angesetzt (Pacht ≤ 5–10 % der Stromerlöse)."),
  dach("pachtProKwp", { min: 6, mittel: 10, max: 18 }, "€/kWp·a"),
  dach("umsatzbeteiligung", { min: 0.04, max: 0.08 }, "Anteil der Stromerlöse"),
  dach("laufzeit", 20, "Jahre"),
  dach("verlaengerung", "1–2 × 5 Jahre Option", "Text"),
  dach("einmalDiskont", 0.05, "Anteil/Jahr", "Diskontsatz für Einmalzahlung aus der Jahrespacht."),
  dach("capexProKwp", { min: 600, mittel: 750, max: 950 }, "€/kWp", "Gewerbedach 300 kWp – 2 MWp schlüsselfertig ohne Dachsanierung."),
  dach("opexProKwp", 14, "€/kWp·a"),
  dach("eegDachCt", 9.3, "ct/kWh", "Rechenwert Volleinspeisung: Mittel der Zuschläge 2025 (9,33). Mittel der letzten drei Termine wäre 9,65 – Umstellung zusammen mit den Texten.", {
    quelle: { titel: "Eigener Rechenwert aus den Ausschreibungsergebnissen der Bundesnetzagentur (zweites Segment)", url: Q.bnetza2.url, art: "eigen" },
    abruf: PAKET_E,
  }),
  dach("ueberschussCt", 6.5, "ct/kWh", "Erlös für Überschuss bei Eigenverbrauch – grobe Annahme."),
  dach("ppaVorOrtCt", { min: 10, mittel: 13, max: 16 }, "ct/kWh", "On-Site-PPA netto."),
  dach("ppaPachtAnteil", 0.5, "Anteil", "Anteil der Pacht, der bei zusätzlicher Stromlieferung üblich bleibt."),
  dach("eigenverbrauch", { min: 0.3, standard: 0.4, max: 0.8 }, "Anteil", "Eigenverbrauchsanteil Gewerbe (Tageslast, ohne Speicher)."),
  dach("restnutzungMinJahre", 25, "Jahre", "Mindest-Restnutzungsdauer des Dachs vor Belegung."),
  dach("sanierungProM2", { min: 45, mittel: 65, max: 95 }, "€/m²", "Neueindeckung Trapez/Sandwich inkl. Rückbau."),
  {
    id: "dach.lcoeIseCt",
    wert: { min: 5.0, max: 10.4 },
    einheit: "ct/kWh",
    land: "DE",
    quelle: Q.ise,
    abruf: RECHERCHE,
    gueltigAb: null,
    gueltigBis: null,
    status: "zu_pruefen",
    pruefer: OFFEN,
    klasse: "B",
    notiz: "Große Dachanlagen DE. Wert aus markt.js, in Welle 1 nicht am Original nachgeprüft.",
  },
];

/* ------------------------------------------------------------------ */
/* Ertrag je Region (PVGIS)                                            */
/* ------------------------------------------------------------------ */

const ertrag = (region, wert, pvgisMittel) => ({
  id: `region.${region}.ertrag`,
  wert,
  einheit: "kWh/kWp·a",
  land: "DE",
  quelle: Q.pvgis,
  abruf: PAKET_E,
  gueltigAb: null,
  gueltigBis: null,
  status: "geprueft",
  pruefer: GEPRUEFT_E,
  klasse: "B",
  notiz: `PVGIS-Mittel der Region aus 3–5 Standorten ~${pvgisMittel} kWh/kWp; Rechenwert liegt bewusst 2–8 % darunter (Verfügbarkeit, Verschmutzung, Abregelung – eigener Abschlag).`,
});

const REGIONEN = [ertrag("de-nord", 960, "1.000"), ertrag("de-ost", 1020, "1.078"), ertrag("de-west", 1000, "1.088"), ertrag("de-sued", 1100, "1.125")];

/* ------------------------------------------------------------------ */
/* Quellenverzeichnis (wie bisher markt.js QUELLEN bzw. DACH.quellen)  */
/* ------------------------------------------------------------------ */

const quellen = {
  allgemein: [
    { titel: "Bundesnetzagentur – Ausschreibungen Solaranlagen erstes Segment", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" },
    { titel: "Fraunhofer ISE – Stromgestehungskosten erneuerbarer Energien", url: "https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/studie-stromgestehungskosten-erneuerbare-energien.html" },
    { titel: "Fraunhofer ISE – Agri-Photovoltaik: Chance für Landwirtschaft und Energiewende (Leitfaden)", url: "https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/agri-photovoltaik-chance-fuer-landwirtschaft-und-energiewende.html" },
    { titel: "EU JRC – PVGIS Photovoltaic Geographical Information System", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" },
    { titel: "BDEW – Strompreisanalyse", url: "https://www.bdew.de/service/daten-und-grafiken/bdew-strompreisanalyse/" },
    { titel: "Umweltbundesamt – Emissionsbilanz erneuerbarer Energieträger", url: "https://www.umweltbundesamt.de/publikationen" },
    { titel: "Gesetz für den Ausbau erneuerbarer Energien (EEG 2023), § 6", url: "https://www.gesetze-im-internet.de/eeg_2014/__6.html" },
    { titel: "Baugesetzbuch § 35 (Bauen im Außenbereich)", url: "https://www.gesetze-im-internet.de/bbaug/__35.html" },
  ],
  dach: [
    { titel: "Bundesnetzagentur – Ausschreibungen Solaranlagen zweites Segment", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen2/artikel.html" },
    { titel: "Fraunhofer ISE – Stromgestehungskosten erneuerbarer Energien", url: "https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/studie-stromgestehungskosten-erneuerbare-energien.html" },
    { titel: "Bund der Steuerzahler – Gewerbliche Infizierung bei Photovoltaikanlagen", url: "https://steuerzahler.de/aktuelles/detail/gewerbliche-infizierung-von-vermietungseinkuenften-beim-betreiben-von-photovoltaikanlagen/" },
  ],
};

const MODUL = {
  name: "de",
  land: "DE",
  fakten: [...FREIFLAECHE, ...ZUSCHLAEGE, ...ERLOESE, ...PACHT, ...KOMMUNE, ...DACH_PV, ...REGIONEN],
  quellen,
};

export default MODUL;
