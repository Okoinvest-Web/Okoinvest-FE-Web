// test/charakterisierung/faelle.mjs
//
// Charakterisierungsfälle (Golden Master) für alle Rechner – Paket F, Welle 1.
//
// WICHTIG: Die Snapshots halten die HEUTIGEN Ausgaben fest, nicht die fachlich
// richtigen. Sie sind ein Vorher-Nachher-Nachweis: Jede Abweichung, die Paket E
// (Zahlen-Sofortkorrektur) oder ein späteres Paket verursacht, wird sichtbar und
// muss im PR begründet werden (Masterplan Abschnitt 11, Paket E, Abnahme).
// Ein „grüner“ Snapshot heißt also nur „unverändert“, nicht „fachlich geprüft“.
//
// Aufbau: je Rechner ein Eintrag { modul, faelle }. Jeder Fall ist eine Funktion,
// die das Modul bekommt und das Ergebnis liefert. So lassen sich auch Hilfsfunktionen
// (Sensitivität, Tornado, Standortvergleich …) und Wirft-Fälle festhalten.
// Standardeingaben + Randfälle; Länderfälle AT/CH sind bewusst enthalten, weil
// Paket E dort die Länder-Sperre einbaut (diese Snapshots ändern sich dann gewollt).

const ha = (h) => ({ ha: h });

export const RECHNER = {
  markt: {
    modul: "src/lib/invest/markt.js",
    faelle: {
      // Alle Datenkonstanten (ohne Funktionen) – zeigt jede Wertänderung an markt.js.
      daten: (m) => Object.fromEntries(Object.entries(m).filter(([, v]) => typeof v !== "function")),
      npv_standard: (m) => m.npv(0.05, [-1000, 300, 300, 300, 300]),
      npv_null: (m) => m.npv(0, [-100, 50, 50]),
      irr_standard: (m) => m.irr([-1000, 300, 300, 300, 300]),
      irr_ohne_vorzeichenwechsel: (m) => m.irr([100, 100, 100]),
      irr_verlust: (m) => m.irr([-1000, 100, 100]),
      annuitaet_standard: (m) => m.annuitaet(1_000_000, 0.045, 18),
      annuitaet_zins_null: (m) => m.annuitaet(1_000_000, 0, 10),
      regionById_unbekannt: (m) => m.regionById("gibt-es-nicht"),
      phaseById_unbekannt: (m) => m.phaseById("gibt-es-nicht"),
    },
  },

  flaechencheck: {
    modul: "src/lib/rechner/flaechencheck.js",
    faelle: {
      standard: (m) => m.flaechencheck(),
      de_12ha: (m) => m.flaechencheck({ land: "DE", regionId: "de-ost", ...ha(12) }),
      de_0_5ha: (m) => m.flaechencheck({ land: "DE", regionId: "de-sued", ...ha(0.5) }),
      de_150ha_konversion: (m) => m.flaechencheck({ land: "DE", regionId: "de-nord", ha: 150, nutzung: "konversion", netz: "lt1" }),
      de_gruenland_schutzgebiet: (m) => m.flaechencheck({ land: "DE", regionId: "de-west", ha: 20, nutzung: "gruenland", besonderheiten: ["schutzgebiet", "hang"], netz: "gt10", eigentum: "gemeinschaft" }),
      de_benachteiligt_randstreifen: (m) => m.flaechencheck({ land: "DE", regionId: "de-sued", ha: 8, besonderheiten: ["benachteiligt", "randstreifen"], netz: "1-3", eigentum: "kommune" }),
      de_parkplatz_verpachtet: (m) => m.flaechencheck({ land: "DE", ha: 2, nutzung: "parkplatz", eigentum: "verpachtet", netz: "3-5" }),
      de_wald_ueberschwemmung: (m) => m.flaechencheck({ land: "DE", ha: 30, nutzung: "sonstige", besonderheiten: ["wald", "ueberschwemmung"], netz: "5-10" }),
      at_12ha: (m) => m.flaechencheck({ land: "AT", regionId: "at", ha: 12 }),
      ch_12ha: (m) => m.flaechencheck({ land: "CH", regionId: "ch", ha: 12 }),
      ha_null: (m) => m.flaechencheck({ ha: 0 }),
    },
  },

  pacht: {
    modul: "src/lib/rechner/pacht.js",
    faelle: {
      standard: (m) => m.pachtRechnung(),
      fest_25ha_sued: (m) => m.pachtRechnung({ ha: 25, regionId: "de-sued", modell: "fest" }),
      index_10ha_ost: (m) => m.pachtRechnung({ ha: 10, regionId: "de-ost", modell: "index" }),
      umsatz_10ha_nord: (m) => m.pachtRechnung({ ha: 10, regionId: "de-nord", modell: "umsatz" }),
      vorlauf_3_jahre: (m) => m.pachtRechnung({ ha: 10, vorlaufJahre: 3 }),
      klein_1ha: (m) => m.pachtRechnung({ ha: 1 }),
      gross_100ha_west: (m) => m.pachtRechnung({ ha: 100, regionId: "de-west" }),
      at_10ha: (m) => m.pachtRechnung({ ha: 10, regionId: "at" }),
      ch_10ha: (m) => m.pachtRechnung({ ha: 10, regionId: "ch" }),
      parkAuf_12ha: (m) => m.parkAuf(12, "de-sued"),
    },
  },

  agriPv: {
    modul: "src/lib/rechner/agriPv.js",
    faelle: {
      standard: (m) => m.agriVergleich(),
      hoch_acker: (m) => m.agriVergleich({ system: "hoch", kulturId: "acker" }),
      vertikal_gruenland_ppa: (m) => m.agriVergleich({ system: "vertikal", kulturId: "gruenland", vermarktung: "ppa" }),
      sonder_hoch_30ha: (m) => m.agriVergleich({ ha: 30, system: "hoch", kulturId: "sonder" }),
      weide_anteil_0: (m) => m.agriVergleich({ kulturId: "weide", anteil: 0 }),
      klein_1ha: (m) => m.agriVergleich({ ha: 1 }),
      at_10ha: (m) => m.agriVergleich({ regionId: "at" }),
      ch_10ha: (m) => m.agriVergleich({ regionId: "ch" }),
      anlage_hoch_5ha: (m) => m.agriAnlage({ ha: 5, system: "hoch", regionId: "de-ost" }),
      amortisation_beispiel: (m) => m.amortisation([-1000, 200, 300, 400, 500]),
      amortisation_nie: (m) => m.amortisation([-1000, 10, 10]),
    },
  },

  solarpark: {
    modul: "src/lib/rechner/solarpark.js",
    faelle: {
      standard: (m) => m.rechneSolarpark(),
      ppa: (m) => m.rechneSolarpark({ modell: "ppa", preisCt: 4.5, vertragJahre: 10 }),
      merchant: (m) => m.rechneSolarpark({ modell: "merchant" }),
      ost_west_nord: (m) => m.rechneSolarpark({ regionId: "de-nord", bauart: "ostWest" }),
      ohne_fk: (m) => m.rechneSolarpark({ fkQuote: 0 }),
      ohne_dscr: (m) => m.rechneSolarpark({ dscrBegrenzen: false }),
      gross_100mwp: (m) => m.rechneSolarpark({ mwp: 100, netzKm: 8 }),
      klein_1mwp: (m) => m.rechneSolarpark({ mwp: 1 }),
      at: (m) => m.rechneSolarpark({ regionId: "at" }),
      ch: (m) => m.rechneSolarpark({ regionId: "ch" }),
      investition: (m) => m.investition({ mwp: 10, capexKwp: 470, entwicklungKwp: 40, netzKm: 1 }),
      sensitivitaet: (m) => m.sensitivitaet(),
    },
  },

  projektbewertung: {
    modul: "src/lib/rechner/projektbewertung.js",
    faelle: {
      standard: (m) => m.bewerteProjekt(),
      flaeche_offen: (m) => m.bewerteProjekt({ phase: "flaeche", netz: "offen" }),
      rtb_reserviert_eeg: (m) => m.bewerteProjekt({ phase: "rtb", netz: "reserviert", vermarktung: "eeg" }),
      cod_ppa_50mwp: (m) => m.bewerteProjekt({ phase: "cod", mwp: 50, vermarktung: "ppa" }),
      netz_weit: (m) => m.bewerteProjekt({ netzKm: 15, netz: "anfrage" }),
      klein_1mwp: (m) => m.bewerteProjekt({ mwp: 1 }),
      at: (m) => m.bewerteProjekt({ land: "AT" }),
      ch: (m) => m.bewerteProjekt({ land: "CH" }),
    },
  },

  reststrom: {
    modul: "src/lib/rechner/reststrom.js",
    faelle: {
      standard: (m) => m.berechneReststrom(),
      zweischicht_2000: (m) => m.berechneReststrom({ verbrauchMwh: 2000, profil: "zweischicht", preisCt: 18 }),
      dreischicht_produzierend: (m) => m.berechneReststrom({ verbrauchMwh: 5000, profil: "dreischicht", produzierend: true }),
      handel_mit_pv: (m) => m.berechneReststrom({ verbrauchMwh: 800, profil: "handel", pvKwp: 300, pvBestand: true }),
      unter_schwelle_50: (m) => m.berechneReststrom({ verbrauchMwh: 50 }),
      preis_niedrig: (m) => m.berechneReststrom({ preisCt: 10 }),
      verbrauch_null: (m) => m.berechneReststrom({ verbrauchMwh: 0 }),
    },
  },

  ppa: {
    modul: "src/lib/rechner/ppa.js",
    faelle: {
      standard: (m) => m.rechnePpa(),
      base: (m) => m.rechnePpa({ struktur: "base" }),
      dreischicht_anteil_70: (m) => m.rechnePpa({ profil: "dreischicht", anteil: 0.7, verbrauchMwh: 10000 }),
      handel_15_jahre: (m) => m.rechnePpa({ profil: "handel", laufzeit: 15 }),
      ppa_teurer_als_preis: (m) => m.rechnePpa({ ppaCt: 12, preisCt: 9 }),
      klein_200: (m) => m.rechnePpa({ verbrauchMwh: 200 }),
      index_fall_5: (m) => m.indexImJahr("fall", 5),
      index_anstieg_5: (m) => m.indexImJahr("anstieg", 5),
    },
  },

  carport: {
    modul: "src/lib/rechner/carport.js",
    faelle: {
      standard: (m) => m.rechneCarport(),
      gross_300: (m) => m.rechneCarport({ stellplaetze: 300, ac: 40, dc: 4 }),
      ohne_laden: (m) => m.rechneCarport({ ac: 0, dc: 0 }),
      wenig_eigenverbrauch_nord: (m) => m.rechneCarport({ eigenverbrauch: 0.2, regionId: "de-nord" }),
      klein_10: (m) => m.rechneCarport({ stellplaetze: 10 }),
      at: (m) => m.rechneCarport({ regionId: "at" }),
      ch: (m) => m.rechneCarport({ regionId: "ch" }),
    },
  },

  kommune: {
    modul: "src/lib/rechner/kommune.js",
    faelle: {
      standard: (m) => m.rechneKommune(),
      ohne_paragraph6: (m) => m.rechneKommune({ paragraph6: false }),
      gemeindeflaeche_sitz: (m) => m.rechneKommune({ gemeindeflaeche: true, sitzInGemeinde: true }),
      hebesatz_hoch_50mwp: (m) => m.rechneKommune({ mwp: 50, hebesatz: 5 }),
      anteil_halb_ostwest: (m) => m.rechneKommune({ anteilGemeinde: 0.5, bauart: "ostWest" }),
      klein_1mwp: (m) => m.rechneKommune({ mwp: 1 }),
      at: (m) => m.rechneKommune({ regionId: "at" }),
      ch: (m) => m.rechneKommune({ regionId: "ch" }),
    },
  },

  pachtangebot: {
    modul: "src/lib/rechner/pachtangebot.js",
    faelle: {
      standard: (m) => m.pruefePachtangebot(),
      umsatz: (m) => m.pruefePachtangebot({ modell: "umsatz" }),
      kombi_vpi: (m) => m.pruefePachtangebot({ modell: "kombi", indexArt: "vpi" }),
      agri_fest_index: (m) => m.pruefePachtangebot({ flaechenart: "agri", indexArt: "fest", indexSatz: 0.02 }),
      niedriges_angebot: (m) => m.pruefePachtangebot({ proHa: 800, reservierungProHa: 0, vorlaufJahre: 6, optionsfrist: 10 }),
      gutes_angebot: (m) => m.pruefePachtangebot({ proHa: 3500, rueckbau: "buergschaft", rangruecktritt: true, anwalt: "voll" }),
      klein_2ha_ost: (m) => m.pruefePachtangebot({ ha: 2, regionId: "de-ost" }),
      at: (m) => m.pruefePachtangebot({ regionId: "at" }),
      ch: (m) => m.pruefePachtangebot({ regionId: "ch" }),
      zahlungsreihe_standard: (m) => m.zahlungsreihe(m.STANDARD),
      marktSpanne_agri: (m) => m.marktSpanne("agri"),
      parkLeistung_20ha: (m) => m.parkLeistung(20, "de-sued", "freiflaeche"),
    },
  },

  netzanschluss: {
    modul: "src/lib/rechner/netzanschluss.js",
    faelle: {
      standard: (m) => m.rechneNetzanschluss(),
      gross_80mwp_hs: (m) => m.rechneNetzanschluss({ mwp: 80, km: 12, ebene: "hs" }),
      knapp_ueberbaut_speicher: (m) => m.rechneNetzanschluss({ anschlussQuote: 0.7, kapazitaet: "knapp", speicherMw: 5, speicherNetzbezug: true }),
      cluster_frei: (m) => m.rechneNetzanschluss({ cluster: true, kapazitaet: "frei" }),
      msLeitung_kurz: (m) => m.rechneNetzanschluss({ mwp: 3, km: 0.5, ebene: "msLeitung" }),
      uwMs: (m) => m.rechneNetzanschluss({ mwp: 25, ebene: "uwMs" }),
      km_null: (m) => m.rechneNetzanschluss({ km: 0 }),
      at: (m) => m.rechneNetzanschluss({ land: "at" }),
      ch: (m) => m.rechneNetzanschluss({ land: "ch" }),
      abregelVerlust_reihe: (m) => [1, 0.9, 0.8, 0.7, 0.6, 0.5].map((q) => m.abregelVerlust(q)),
      ebeneFuer_reihe: (m) => [1, 5, 15, 30, 80, 200].map((mw) => m.ebeneFuer(mw)),
    },
  },

  grossspeicher: {
    modul: "src/lib/rechner/grossspeicher.js",
    faelle: {
      standard: (m) => m.rechneSpeicher(),
      colocation_4h: (m) => m.rechneSpeicher({ standort: "colocation", dauer: 4 }),
      hs_50mw: (m) => m.rechneSpeicher({ mw: 50, ebene: "hs" }),
      netzdienlich_ohne_befreiung: (m) => m.rechneSpeicher({ netzdienlich: true, netzentgeltBefreit: false }),
      erloese_vorsichtig: (m) => m.rechneSpeicher({ erloese: m.erloesAufteilung(90000) }),
      erloese_optimistisch: (m) => m.rechneSpeicher({ erloese: m.erloesAufteilung(180000) }),
      dauer_1h_klein: (m) => m.rechneSpeicher({ mw: 1, dauer: 1 }),
      investition_standard: (m) => m.investitionSpeicher(m.STANDARD),
      vergleich_standorte: (m) => m.vergleichStandorte(),
    },
  },

  beteiligung: {
    modul: "src/lib/rechner/beteiligung.js",
    faelle: {
      standard: (m) => m.rechneBeteiligung(),
      mit_steuer: (m) => m.rechneBeteiligung({ steuer: true }),
      viele_anteile_20mwp: (m) => m.rechneBeteiligung({ anteile: 40, parkMwp: 20 }),
      eg_quote_hoch_nord: (m) => m.rechneBeteiligung({ egQuote: 0.5, regionId: "de-nord" }),
      ein_anteil: (m) => m.rechneBeteiligung({ anteile: 1 }),
      at: (m) => m.rechneBeteiligung({ regionId: "at" }),
      ch: (m) => m.rechneBeteiligung({ regionId: "ch" }),
    },
  },

  energySharing: {
    modul: "src/lib/rechner/energySharing.js",
    faelle: {
      standard: (m) => m.rechneEnergySharing(),
      de: (m) => m.rechneEnergySharing(m.standardFuer("de")),
      at: (m) => m.rechneEnergySharing(m.standardFuer("at")),
      ch: (m) => m.rechneEnergySharing(m.standardFuer("ch")),
      de_haushalte_speicher: (m) => m.rechneEnergySharing({ ...m.standardFuer("de"), mix: "haushalte", speicher: true }),
      de_gewerbe_gross: (m) => m.rechneEnergySharing({ ...m.standardFuer("de"), mix: "gewerbe", kwp: 1000, teilnehmer: 200 }),
      at_wenig_teilnehmer: (m) => m.rechneEnergySharing({ ...m.standardFuer("at"), teilnehmer: 5 }),
      standardFuer_alle: (m) => ["de", "at", "ch"].map((l) => m.standardFuer(l)),
      geteilteMenge_reihe: (m) => [0.35, 0.45, 0.6].map((a) => m.geteilteMenge(100000, 200000, a)),
    },
  },

  energiegemeinschaftAt: {
    // öffentlicher Ersparnis-Rechner /energiegemeinschaften/rechner
    modul: "src/lib/plattform/eg/interesse.js",
    faelle: {
      standard: (m) => m.rechnerOeffentlich(),
      eeg_regional: (m) => m.rechnerOeffentlich({ modell: "eeg_regional" }),
      beg: (m) => m.rechnerOeffentlich({ modell: "beg" }),
      gea: (m) => m.rechnerOeffentlich({ modell: "gea" }),
      erzeuger_20kwp: (m) => m.rechnerOeffentlich({ rolle: "erzeuger", kwp: 20 }),
      prosumer_reichlich: (m) => m.rechnerOeffentlich({ rolle: "prosumer", deckung: "reichlich", profil: "haushalt_flex" }),
      gewerbe_knapp: (m) => m.rechnerOeffentlich({ profil: "gewerbe", deckung: "knapp", verbrauchKwh: 50000 }),
      landwirtschaft: (m) => m.rechnerOeffentlich({ profil: "landwirtschaft", verbrauchKwh: 20000 }),
      jahr_2027: (m) => m.rechnerOeffentlich({ jahr: 2027 }),
      ungueltige_eingaben: (m) => m.rechnerOeffentlich({ verbrauchKwh: -5, kwp: "abc", modell: "x", profil: "y" }),
    },
  },

  dachpacht: {
    modul: "src/lib/rechner/dachpacht.js",
    faelle: {
      standard: (m) => m.rechneDach(),
      flach_ostwest: (m) => m.rechneDach({ dachart: "flach", ausrichtung: "ostWest" }),
      sandwich_suedostwest: (m) => m.rechneDach({ dachart: "sandwich", ausrichtung: "suedOstWest" }),
      faserzement_sanierung: (m) => m.rechneDach({ dachart: "faserzement", sanierung: true }),
      nord_klein: (m) => m.rechneDach({ ausrichtung: "nord", m2: 800 }),
      gross_30000: (m) => m.rechneDach({ m2: 30000, laufzeit: 25 }),
      at: (m) => m.rechneDach({ regionId: "at" }),
      ch: (m) => m.rechneDach({ regionId: "ch" }),
      rentenbarwert_null: (m) => m.rentenbarwert(1000, 0, 20),
      rentenbarwert_3: (m) => m.rentenbarwert(1000, 0.03, 20),
    },
  },

  bestandsanlage: {
    modul: "src/lib/rechner/bestandsanlage.js",
    faelle: {
      standard: (m) => m.rechneBestand(),
      marktpraemie: (m) => m.rechneBestand({ modell: "marktpraemie", verguetungCt: 8 }),
      alt_2005: (m) => m.rechneBestand({ ibnJahr: 2005, verguetungCt: 45 }),
      jung_2021_dach: (m) => m.rechneBestand({ ibnJahr: 2021, verguetungCt: 6, typ: "dach" }),
      pacht_nicht_verlaengerbar: (m) => m.rechneBestand({ pachtVerlaengerbar: false, pachtEndeJahr: 2035 }),
      ohne_wr_ohne_rueckbau: (m) => m.rechneBestand({ wrTausch: false, rueckbau: false }),
      mit_kaufpreis: (m) => m.rechneBestand({ kaufpreis: 1_500_000 }),
      klein_100kwp_nord: (m) => m.rechneBestand({ kwp: 100, regionId: "de-nord" }),
      at: (m) => m.rechneBestand({ regionId: "at" }),
      ch: (m) => m.rechneBestand({ regionId: "ch" }),
      verguetungRichtwert_reihe: (m) => [2004, 2009, 2012, 2016, 2021].map((j) => m.verguetungRichtwert(j)),
      sensitivitaet: (m) => m.sensitivitaet(),
      tornado: (m) => m.tornado(),
    },
  },
};

// Module, die eine selbsttest()-Funktion anbieten (für den selbsttest-Lauf in verify)
export const SELBSTTEST_MODULE = Object.entries(RECHNER)
  .map(([name, r]) => ({ name, modul: r.modul }));
