// src/lib/invest/markt.js
//
// MARKTANNAHMEN für alle Rechner, Tools und Texte der ÖkoInvest-Website –
// an EINER Stelle. Texte und Rechner importieren diese Werte, statt Zahlen
// abzutippen. Wer hier ändert, ändert die ganze Website.
//
// Recherchestand: September 2026. Alles ORIENTIERUNGSWERTE für eine erste
// Einschätzung (Spannen, keine Angebote). Die konkrete Projektrechnung
// erfolgt im Einzelfall.
//
// Quellen (Auswahl, siehe QUELLEN unten): Bundesnetzagentur (Ausschreibungs-
// ergebnisse Solar), Fraunhofer ISE (Stromgestehungskosten, Agri-PV-Leitfaden),
// PVGIS (Einstrahlung), Destatis (Pachtpreise), BDEW-Strompreisanalyse,
// EEG 2023, EnWG, DIN SPEC 91434, E-Control (AT), BFE (CH).
//
// Konvention: Geld in €, Energie in kWh, Leistung in kWp, Fläche in ha.

export const STAND = "September 2026";

/* ------------------------------------------------------------------ */
/* Regionen und spezifischer Ertrag                                    */
/* ------------------------------------------------------------------ */

/**
 * Spezifischer Jahresertrag einer optimal ausgerichteten Freiflächenanlage
 * (Süd, fest aufgeständert, monofazial) in kWh/kWp im ersten Jahr.
 * Grundlage: PVGIS-Einstrahlung, Performance Ratio ~0,85.
 */
export const REGIONEN = [
  { id: "de-nord", land: "DE", label: "Norddeutschland", sub: "SH, HH, NI, HB, MV", ertrag: 960 },
  { id: "de-ost", land: "DE", label: "Ostdeutschland", sub: "BB, BE, SN, ST, TH", ertrag: 1020 },
  { id: "de-west", land: "DE", label: "West- & Mitteldeutschland", sub: "NW, HE, RP, SL", ertrag: 1000 },
  { id: "de-sued", land: "DE", label: "Süddeutschland", sub: "BY, BW", ertrag: 1100 },
  { id: "at", land: "AT", label: "Österreich", sub: "Flach- und Hügelland", ertrag: 1120 },
  { id: "ch", land: "CH", label: "Schweiz", sub: "Mittelland", ertrag: 1050 },
];

export const regionById = (id) => REGIONEN.find((r) => r.id === id) || REGIONEN[3];

/** Mehrertrag/Minderertrag nach Anlagenbauart gegenüber fester Süd-Aufständerung */
export const BAUART = {
  sued: { label: "Süd, fest", faktor: 1.0, haProMwp: 1.1 },
  ostWest: { label: "Ost/West, fest", faktor: 0.92, haProMwp: 0.85 },
  tracker: { label: "Einachsig nachgeführt", faktor: 1.15, haProMwp: 1.5 },
  agriVertikal: { label: "Agri-PV vertikal, bifazial", faktor: 0.9, haProMwp: 2.6 },
  agriHoch: { label: "Agri-PV hoch aufgeständert", faktor: 0.95, haProMwp: 1.6 },
};

/* ------------------------------------------------------------------ */
/* Freiflächen-PV                                                      */
/* ------------------------------------------------------------------ */

export const FREIFLAECHE = {
  /** Fläche je MWp (Süd, fest, moderne Module ~ 580–620 Wp) */
  haProMwp: 1.1,
  /** Sinnvolle Mindestgröße einer Fläche in ha (darunter selten wirtschaftlich) */
  mindestHa: 3,
  /**
   * Schlüsselfertige Errichtung (EPC) ohne Netzanschluss, €/kWp – Spanne.
   * Große Parks (> 10 MWp) liegen 2025/26 bei stark gefallenen Modulpreisen
   * eher am unteren Ende, kleine und schwierige Standorte am oberen.
   */
  capexProKwp: { min: 400, mittel: 470, max: 600 },
  /** Netzanschluss: Kabeltrasse Mittelspannung je Meter (inkl. Tiefbau) */
  kabelProMeter: 120,
  /** Übergabestation / Trafo je MWp */
  netzanschlussFixProMwp: 35000,
  /** Entwicklungskosten bis Baureife (Planung, Gutachten, B-Plan) €/kWp */
  entwicklungProKwp: { min: 40, max: 90 },
  /**
   * Betriebskosten ohne Pacht, €/kWp und Jahr: technische und kaufmännische
   * Betriebsführung, Wartung/Grünpflege, Versicherung, Direktvermarktung,
   * Überwachung/Sicherheit. Größere Parks eher 7–9, kleine 10–12.
   */
  opexProKwp: 9,
  /** Rückbau-Rücklage €/kWp einmalig (bis Laufzeitende angespart) */
  rueckbauProKwp: 25,
  /** Jährliche Degradation */
  degradation: 0.004,
  /** Kostensteigerung Opex pro Jahr */
  inflation: 0.02,
  /** Laufzeit Betrachtung (Jahre) */
  laufzeit: 30,
};

/* ------------------------------------------------------------------ */
/* Erlöse                                                              */
/* ------------------------------------------------------------------ */

export const ERLOESE = {
  /**
   * EEG-Ausschreibung Freifläche (erstes Segment): mengengewichtete
   * durchschnittliche Zuschlagswerte lagen 2024/2025 grob zwischen 4,5 und
   * 5,2 ct/kWh (Bundesnetzagentur). Anzulegender Wert gilt 20 Jahre.
   */
  eegFreiflaecheCt: 4.8,
  /**
   * Agri-PV in der Ausschreibung: Ein eigenes Untersegment mit höherem Höchstwert
   * ist im EEG vorgesehen, war aber zum Stand noch nicht beihilferechtlich
   * freigegeben. Agri-PV bietet daher im ersten Segment mit, hoch aufgeständerte
   * Anlagen erhalten einen Bonus von 0,5 ct/kWh → Zuschlag Freifläche + Bonus.
   */
  eegBesondereCt: 5.3,
  /**
   * PPA Solar pay-as-produced, 10 Jahre, DE – Spanne. Reine Erzeuger-PPA
   * notieren wegen Kannibalisierung eher bei 3,5–4,5 ct (dena/Pexapark),
   * Liefer-PPA an Unternehmen mit Strukturierung darüber.
   */
  ppaCt: { min: 3.8, mittel: 4.5, max: 5.5 },
  /** Durchschnittlicher Marktwert Solar (Capture Price) nach Förderende, konservativ */
  merchantCt: 4.0,
  /**
   * Jährliche Steigerung des Solar-Marktwerts (nominal) für Merchant-Phasen.
   * Eigene vorsichtige Annahme: unter der allgemeinen Inflation, weil mit
   * wachsendem PV-Zubau die Mittagspreise sinken (Kannibalisierung).
   */
  merchantSteigerung: 0.01,
  /** Gebotstermine 2025 (Bundesnetzagentur, erstes Segment, mengengewichteter Durchschnitt) */
  zuschlagsHistorie: [
    { termin: "1. März 2025", ct: 4.66 },
    { termin: "1. Juli 2025", ct: 4.84 },
    { termin: "1. Dezember 2025", ct: 5.0 },
  ],
  /** Fraunhofer ISE, Studie Stromgestehungskosten (Juli 2024): neue PV-Freiflächenanlagen in DE, ct/kWh */
  lcoeIseCt: { min: 4.1, max: 6.9 },
};

/* ------------------------------------------------------------------ */
/* Finanzierung                                                        */
/* ------------------------------------------------------------------ */

export const FINANZIERUNG = {
  fremdkapitalQuote: 0.75,
  zins: 0.045,
  tilgungJahre: 18,
  /** Eigenkapitalrendite-Erwartung (Diskontsatz für Barwerte) */
  diskont: 0.065,
  /** Steuersatz vereinfacht (Körperschaft + Gewerbe, DE) */
  steuer: 0.3,
  /**
   * Mindest-Schuldendienstdeckungsgrad (DSCR), auf den Banken das Darlehen
   * bemessen – bei EEG-Projekten meist um 1,10–1,20, bei PPA/Merchant höher
   * (marktübliche Spanne, eigene Einschätzung).
   */
  dscrZiel: 1.15,
};

/* ------------------------------------------------------------------ */
/* Pacht                                                               */
/* ------------------------------------------------------------------ */

export const PACHT = {
  /** Übliche Pacht für Freiflächen-PV in €/ha und Jahr (DACH, 2025/26) */
  freiflaecheProHa: { min: 1500, mittel: 2800, max: 4500 },
  /** Agri-PV: höhere Nutzung bleibt beim Landwirt, Pacht meist niedriger */
  agriProHa: { min: 800, mittel: 1600, max: 2500 },
  /** Alternativ: Umsatzbeteiligung in % der Stromerlöse */
  umsatzbeteiligung: { min: 0.04, max: 0.08 },
  /** Durchschnittliche landwirtschaftliche Pacht Ackerland DE (Destatis, Landwirtschaftszählung) */
  ackerProHa: 380,
  /** Deckungsbeitrag Ackerbau €/ha und Jahr (Getreide, stark schwankend) */
  deckungsbeitragAcker: { min: 200, mittel: 450, max: 800 },
  /** Übliche Laufzeit in Jahren + Verlängerungsoptionen */
  laufzeit: 30,
  verlaengerung: "2 × 5 Jahre Option",
  /** Jährliche Indexierung (Verbraucherpreisindex, vereinfacht) */
  indexierung: 0.015,
  /** Einmalige Bereitstellungs-/Reservierungsprämie je ha (bis Baubeginn) */
  reservierungProHa: { min: 100, max: 300 },
};

/* ------------------------------------------------------------------ */
/* Agri-PV                                                             */
/* ------------------------------------------------------------------ */

export const AGRI = {
  /** DIN SPEC 91434: max. Flächenverlust durch Aufbauten */
  flaechenverlustMaxKat1: 0.1,
  flaechenverlustMaxKat2: 0.15,
  /** DIN SPEC 91434: landwirtschaftlicher Ertrag mind. 66 % des Referenzertrags */
  mindestErtrag: 0.66,
  /** GAP-Direktzahlungen DE: bis 85 % der Fläche bleibt förderfähig (Abzug 15 %) */
  gapFoerderfaehig: 0.85,
  /** Einkommensgrundstützung + Umverteilung DE grob €/ha (2025/26) */
  direktzahlungProHa: 250,
  capexProKwp: {
    vertikal: { min: 600, mittel: 700, max: 850 },
    hoch: { min: 900, mittel: 1100, max: 1400 },
  },
  opexProKwp: 14,
  /** Privilegierung Außenbereich § 35 Abs. 1 Nr. 9 BauGB: Grundfläche bis 2,5 ha, Hofbezug */
  privilegierungHa: 2.5,
  /**
   * Kulturen für den Agri-PV-Rechner – GROBE Orientierung, stark betriebs- und
   * jahresabhängig (im Rechner überschreibbar):
   *  db      Deckungsbeitrag ohne Anlage in €/ha und Jahr (Größenordnung KTBL-Standarddeckungsbeiträge)
   *  ertrag  landwirtschaftlicher Ertrag unter dem System relativ zur Referenz, inkl. Flächenverlust
   *          (Bandbreiten aus Fraunhofer ISE, Agri-PV-Leitfaden; DIN SPEC 91434 verlangt ≥ 66 %)
   *          null = System für diese Kultur unüblich
   */
  kulturen: [
    { id: "acker", label: "Ackerbau", sub: "Getreide, Raps, Mais", db: 450, ertrag: { vertikal: 0.9, hoch: 0.85 } },
    { id: "gruenland", label: "Grünland", sub: "Mahd, Futterbau", db: 300, ertrag: { vertikal: 0.92, hoch: 0.9 } },
    { id: "weide", label: "Weide", sub: "Schafe, Rinder, Geflügel", db: 250, ertrag: { vertikal: 0.95, hoch: 0.95 } },
    { id: "sonder", label: "Obst & Beeren", sub: "Sonderkultur", db: 3500, ertrag: { vertikal: null, hoch: 0.95 } },
  ],
  /** Anteil an der Anlage, den ein Landwirt über Genossenschaft/Beteiligung halten kann (Rechner-Spanne) */
  beteiligungAnteil: { min: 0.05, standard: 0.2, max: 0.49 },
};

/* ------------------------------------------------------------------ */
/* Solarcarports & Parkflächen                                         */
/* ------------------------------------------------------------------ */

export const CARPORT = {
  /** kWp je Stellplatz (2,5 × 5 m, Module ~ 225 Wp/m²) */
  kwpProStellplatz: 2.6,
  /** Errichtung inkl. Stahlbau, Fundamente, Entwässerung €/kWp */
  capexProKwp: { min: 1100, mittel: 1350, max: 1700 },
  /** Ertrag geringer als Freifläche (flachere Neigung, Verschattung) */
  ertragFaktor: 0.93,
  /** Ladepunkt AC 11/22 kW inkl. Installation */
  ladepunktAc: 2500,
  /** Ladepunkt DC 50–150 kW inkl. Installation (ohne Netzausbau) */
  ladepunktDc: 45000,
  opexProKwp: 15,
  /** Betrachtungszeitraum Wirtschaftlichkeit (Jahre) – Stahlbau hält deutlich länger, Wechselrichter-Tausch in Opex */
  laufzeit: 25,
  /** Contracting: Vertragslaufzeit (Jahre) und Aufschlag des Contractors auf die Vollkosten (eigene Annahme) */
  contractingJahre: 20,
  contractingMarge: 0.1,
  /** Stellplatzfläche brutto inkl. anteiliger Fahrgasse, m² (Orientierung) */
  stellplatzM2: 25,
};

/* ------------------------------------------------------------------ */
/* Batteriegroßspeicher                                                */
/* ------------------------------------------------------------------ */

export const SPEICHER = {
  /** Systempreis 2-h-Speicher schlüsselfertig €/kWh (2026, stark fallend) */
  capexProKwh: { min: 200, mittel: 260, max: 340 },
  /** Erlöse (Arbitrage + Regelenergie) €/MW und Jahr – Spanne, stark marktabhängig */
  erloesProMwJahr: { min: 90000, mittel: 130000, max: 180000 },
  zyklenProJahr: 330,
  wirkungsgrad: 0.87,
};

/* ------------------------------------------------------------------ */
/* Strom für Unternehmen (Reststrom-Pool, virtuelles Kraftwerk)        */
/* ------------------------------------------------------------------ */

export const STROM = {
  /**
   * Gewerblicher Strompreis Mittelstand DE (netto, ohne USt.), ct/kWh:
   * Beschaffung/Vertrieb, Netzentgelte, Abgaben/Umlagen, Stromsteuer.
   * Grobe Aufteilung für Neuverträge 2026 (BDEW-Strompreisanalyse, eigene Einschätzung).
   */
  bestandteile: [
    { id: "beschaffung", label: "Beschaffung & Vertrieb", ct: 10.5, beeinflussbar: true },
    { id: "netz", label: "Netzentgelte & Messung", ct: 5.5, beeinflussbar: false },
    { id: "umlagen", label: "Umlagen (KWKG, Offshore, § 19)", ct: 1.8, beeinflussbar: false },
    { id: "konzession", label: "Konzessionsabgabe", ct: 0.11, beeinflussbar: false },
    { id: "stromsteuer", label: "Stromsteuer", ct: 2.05, beeinflussbar: false },
  ],
  /**
   * Stromsteuer: Regelsatz 2,05 ct/kWh; produzierendes Gewerbe sowie Land-
   * und Forstwirtschaft seit 2026 auf EU-Mindestsatz 0,05 ct/kWh entlastet.
   */
  stromsteuerProduzierend: 0.05,
  /**
   * Wirkung des Pools auf die Beschaffungskomponente (ct/kWh), vorsichtig:
   *  - Bündelung / strukturierte Tranchenbeschaffung statt Einzelvertrag zum Stichtag
   *  - Solar-PPA aus Parks der Gruppe für die Tagesstunden
   *  - Flexibilität (Lastverschiebung, Speicher) in günstige Viertelstunden
   */
  poolHebel: [
    { id: "buendelung", label: "Bündelung & strukturierte Beschaffung", ct: { min: 0.4, max: 1.2 } },
    { id: "ppa", label: "Solarstrom aus Parks der Gruppe (PPA)", ct: { min: 0.5, max: 2.0 } },
    { id: "flex", label: "Flexibilität & Speicher im virtuellen Kraftwerk", ct: { min: 0.2, max: 1.0 } },
  ],
  /** Anteil der Tagesstunden-Last, die typischerweise aus Solar-PPA gedeckt werden kann */
  ppaDeckungsanteil: { min: 0.2, max: 0.4 },
};

/* ------------------------------------------------------------------ */
/* Kommunen                                                            */
/* ------------------------------------------------------------------ */

export const KOMMUNE = {
  /** § 6 EEG: freiwillige Zahlung bis 0,2 ct/kWh an betroffene Gemeinden */
  beteiligungCt: 0.2,
  /** § 29 Abs. 1 Nr. 2 GewStG: 90 % des Gewerbesteuermessbetrags an Standortgemeinde (Solar) */
  gewerbesteuerStandort: 0.9,
  /** Hebesatz Durchschnitt DE */
  hebesatz: 4.0,
  messzahl: 0.035,
  /** Betrachtungszeitraum für Kommunen (Jahre, entspricht der EEG-Förderdauer) */
  betrachtungJahre: 20,
  /** Nutzungsdauer PV nach AfA-Tabelle (lineare Abschreibung) */
  afaJahre: 20,
  /** § 8 Nr. 1 GewStG: 25 % der Entgelte für Schulden werden hinzugerechnet, soweit die Summe 200.000 € übersteigt */
  hinzurechnungZinsen: 0.25,
  hinzurechnungFreibetrag: 200000,
  /** Reglerspanne Hebesatz (gesetzliches Minimum 200 %, § 16 Abs. 4 GewStG) */
  hebesatzSpanne: { min: 2.0, max: 6.0 },
};

/* ------------------------------------------------------------------ */
/* Projektbörse: Bewertung von Projektrechten nach Phase               */
/* ------------------------------------------------------------------ */

/**
 * Übliche Kaufpreise (Entwicklungsprämie) für Freiflächenprojekte in €/kWp
 * je Entwicklungsstand, DACH 2025/26 – breite Spannen, stark abhängig von
 * Netzanschluss, Größe, Tarif/PPA und Standort.
 */
export const PHASEN = [
  { id: "flaeche", label: "Fläche gesichert", kurz: "Flächensicherung", preisProKwp: { min: 5, max: 20 }, risiko: "sehr hoch", monateBisRtb: 30 },
  { id: "netz", label: "Netzanschlusszusage", kurz: "Netzzusage", preisProKwp: { min: 15, max: 40 }, risiko: "hoch", monateBisRtb: 24 },
  { id: "aufstellung", label: "Aufstellungsbeschluss B-Plan", kurz: "Aufstellungsbeschluss", preisProKwp: { min: 25, max: 55 }, risiko: "mittel–hoch", monateBisRtb: 15 },
  { id: "satzung", label: "Satzungsbeschluss / Baurecht", kurz: "Baurecht", preisProKwp: { min: 45, max: 90 }, risiko: "mittel", monateBisRtb: 6 },
  { id: "rtb", label: "Ready-to-Build (RTB)", kurz: "Baureif", preisProKwp: { min: 60, max: 130 }, risiko: "gering", monateBisRtb: 0 },
  { id: "cod", label: "In Betrieb (COD / Bestand)", kurz: "Bestand", preisProKwp: { min: 550, max: 850 }, risiko: "sehr gering", monateBisRtb: 0 },
];

export const phaseById = (id) => PHASEN.find((p) => p.id === id) || PHASEN[0];

/** Provisionsmodell der Projektbörse (Erfolgsprovision, nur bei Abschluss) */
export const PROVISION = {
  verkaeufer: { min: 0.015, max: 0.03, text: "1,5–3 % des Kaufpreises, nur bei erfolgreichem Abschluss" },
  kaeufer: { text: "für Investoren kostenfrei (Suchprofil, NDA, Datenraum)" },
  flaeche: { text: "für Flächeneigentümer immer kostenfrei" },
};

/* ------------------------------------------------------------------ */
/* Energiegemeinschaften DACH                                          */
/* ------------------------------------------------------------------ */

export const GEMEINSCHAFTEN = {
  de: {
    titel: "Energy Sharing (§ 42c EnWG)",
    text: "Gemeinsame Nutzung von Strom aus Anlagen in derselben Region über das öffentliche Netz – zunächst im Netzgebiet eines Verteilnetzbetreibers, später auch in angrenzenden Gebieten.",
  },
  at: {
    titel: "Erneuerbare-Energie-Gemeinschaft (EEG) und Bürgerenergiegemeinschaft (BEG)",
    text: "Lokale und regionale EEGs erhalten reduzierte Netzentgelte; BEGs dürfen österreichweit tätig sein. Teilnahme an mehreren Gemeinschaften ist möglich.",
  },
  ch: {
    titel: "ZEV, vZEV und lokale Elektrizitätsgemeinschaft (LEG)",
    text: "Seit 2026 können Verbraucher innerhalb einer Gemeinde über das Verteilnetz Strom teilen (LEG) – mit reduziertem Netznutzungsentgelt.",
  },
};

/* ------------------------------------------------------------------ */
/* Allgemein                                                           */
/* ------------------------------------------------------------------ */

export const ALLGEMEIN = {
  /** CO₂-Vermeidung je kWh Solarstrom (UBA, Emissionsbilanz erneuerbarer Energien, gerundet) */
  co2KgProKwh: 0.65,
  /** Durchschnittlicher Haushaltsverbrauch für anschauliche Vergleiche */
  haushaltKwh: 3500,
};

export const QUELLEN = [
  { titel: "Bundesnetzagentur – Ausschreibungen Solaranlagen erstes Segment", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" },
  { titel: "Fraunhofer ISE – Stromgestehungskosten erneuerbarer Energien", url: "https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/studie-stromgestehungskosten-erneuerbare-energien.html" },
  { titel: "Fraunhofer ISE – Agri-Photovoltaik: Chance für Landwirtschaft und Energiewende (Leitfaden)", url: "https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/agri-photovoltaik-chance-fuer-landwirtschaft-und-energiewende.html" },
  { titel: "EU JRC – PVGIS Photovoltaic Geographical Information System", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" },
  { titel: "BDEW – Strompreisanalyse", url: "https://www.bdew.de/service/daten-und-grafiken/bdew-strompreisanalyse/" },
  { titel: "Umweltbundesamt – Emissionsbilanz erneuerbarer Energieträger", url: "https://www.umweltbundesamt.de/publikationen" },
  { titel: "Gesetz für den Ausbau erneuerbarer Energien (EEG 2023), § 6", url: "https://www.gesetze-im-internet.de/eeg_2014/__6.html" },
  { titel: "Baugesetzbuch § 35 (Bauen im Außenbereich)", url: "https://www.gesetze-im-internet.de/bbaug/__35.html" },
];

/* ------------------------------------------------------------------ */
/* Hilfsfunktionen für alle Rechner                                    */
/* ------------------------------------------------------------------ */

/** Barwert einer Zahlungsreihe (Index 0 = Jahr 0) */
export function npv(rate, cashflows) {
  return cashflows.reduce((s, cf, t) => s + cf / Math.pow(1 + rate, t), 0);
}

/** Interner Zinsfuß per Bisektion; null, wenn keine Lösung im Intervall */
export function irr(cashflows, lo = -0.9, hi = 1.0) {
  const f = (r) => npv(r, cashflows);
  let flo = f(lo);
  let fhi = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < 1e-6) return mid;
    if (flo * fm < 0) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}

/** Annuität (Rate je Jahr) */
export function annuitaet(betrag, zins, jahre) {
  if (zins === 0) return betrag / jahre;
  return (betrag * zins) / (1 - Math.pow(1 + zins, -jahre));
}
