// src/lib/invest/markt.js
//
// MARKTANNAHMEN für alle Rechner, Tools und Texte der ÖkoInvest-Website –
// an EINER Stelle. Texte und Rechner importieren diese Werte, statt Zahlen
// abzutippen. Wer hier ändert, ändert die ganze Website.
//
// FASSADE (Welle 2, Paket B1, Strangler-Muster): FREIFLAECHE, ZUSCHLAEGE, ERLOESE, PACHT,
// KOMMUNE, DACH (Dach-PV), QUELLEN und REGIONEN.ertrag stehen jetzt im Faktenregister
// src/lib/fakten (je Wert Quelle, Stand, Gültigkeit, Status, Prüfer, Klasse) und kommen
// hier unverändert über marktFuer("DE") heraus. Werte dort ändern, nicht hier.
// Länderfähig rechnen: marktFuer(land) / rechenbasisFuer() aus src/lib/invest/laender/marktFuer.js.
// Die übrigen Konstanten (FINANZIERUNG, AGRI, CARPORT, SPEICHER, STROM, …) folgen später.
//
// Recherchestand: September 2026. Alles ORIENTIERUNGSWERTE für eine erste
// Einschätzung (Spannen, keine Angebote). Die konkrete Projektrechnung
// erfolgt im Einzelfall.
//
// Quellen (Auswahl, siehe QUELLEN): Bundesnetzagentur (Ausschreibungs-
// ergebnisse Solar), Fraunhofer ISE (Stromgestehungskosten, Agri-PV-Leitfaden),
// PVGIS (Einstrahlung), Destatis (Pachtpreise), BDEW-Strompreisanalyse,
// EEG 2023, EnWG, DIN SPEC 91434, E-Control (AT), BFE (CH).
//
// Konvention: Geld in €, Energie in kWh, Leistung in kWp, Fläche in ha.

import { marktFuer, regionenAlle } from "./laender/marktFuer.js";
import { faktWert } from "../fakten/index.js";

/** Deutsche Marktannahmen aus dem Faktenregister (Quelle aller Fassaden-Konstanten unten) */
const DE = marktFuer("DE");

export const STAND = "September 2026";

/**
 * Datum der letzten fachlich geprüften Änderung an der Rechenlogik (markt.js und
 * src/lib/rechner/*), ISO-Format. Quelle für `dateModified` der Rechnerseiten
 * (RechnerSeite.js) – NUR ändern, wenn sich Werte oder Rechenwege wirklich ändern.
 * Welle 1, Paket E (Zahlen-Sofortkorrektur): 03.10.2026.
 */
export const STAND_RECHENLOGIK = "2026-10-03";

/**
 * Länder-Sperre (Masterplan S1, „Länder-Sperre bis B1“) – Definition jetzt in
 * src/lib/invest/laender/sperre.js (unverändert), hier weiter exportiert.
 */
export { LAENDER_SPERRE, landVonRegion, laenderSperre } from "./laender/sperre.js";
import { laenderSperre } from "./laender/sperre.js";

/* ------------------------------------------------------------------ */
/* Regionen und spezifischer Ertrag                                    */
/* ------------------------------------------------------------------ */

/**
 * Spezifischer Jahresertrag einer optimal ausgerichteten Freiflächenanlage
 * (Süd, fest aufgeständert, monofazial) in kWh/kWp im ersten Jahr.
 * Grundlage: PVGIS-Einstrahlung, Performance Ratio ~0,85.
 *
 * Prüfung Paket E (03.10.2026) gegen PVGIS 5.3 (EU JRC, API PVcalc, SARAH3,
 * Systemverluste 14 %, optimaler Winkel), Mittel je Region aus 3–5 Standorten:
 * de-nord ~1.000, de-ost ~1.078, de-west ~1.088, de-sued ~1.125, AT ~1.199,
 * CH-Mittelland ~1.211 kWh/kWp (Bern 1.231, Zürich-Land 1.157, Payerne 1.255,
 * St. Gallen-Rheintal 1.202). Die DE- und AT-Werte unten liegen bewusst 2–8 %
 * darunter (Verfügbarkeit, Verschmutzung, Abregelung) und bleiben unverändert.
 * CH lag mit 1.050 rund 13 % darunter und widersprach src/data/regionen/schweiz.js
 * (1.230); korrigiert auf PVGIS-Mittel × mittleren Abschlag der übrigen Regionen
 * (Ø 0,935) = 1.132 → 1.130. Für CH sind Geldwerte ohnehin gesperrt (LAENDER_SPERRE).
 */
/** Ertragsregionen DE/AT/CH; ertrag aus dem Faktenregister (region.<id>.ertrag) */
export const REGIONEN = regionenAlle();

export const regionById = (id) => REGIONEN.find((r) => r.id === id) || REGIONEN[3];

/**
 * Mehrertrag/Minderertrag nach Anlagenbauart gegenüber fester Süd-Aufständerung
 * (Bezug: REGIONEN = optimaler Winkel).
 * ostWest: Paket E (03.10.2026) von 0,92 auf 0,84 korrigiert. Quelle PVGIS 5.3
 * (EU JRC, API PVcalc, 14 % Verluste): Ost/West 12° je kWp gegenüber optimal
 * ausgerichteter Süd-Anlage 0,81–0,84 an 23 Standorten DE/AT/CH, z. B. Straubing
 * (945 + 952) / 2 / 1.131 = 0,839, Cottbus 0,814, Bern 0,827, Zürich 0,839.
 * Der Wert-Vorteil von Ost/West (Erzeugung außerhalb der Mittagsspitze) ist hier
 * NICHT eingerechnet. tracker 1,15: PVGIS (einachsig horizontal, ideal ohne
 * Backtracking/Verschattung) 1,16–1,17 – unverändert, mit Verschattung eher
 * darunter (zu prüfen). Übrige Faktoren unverändert, nicht neu geprüft.
 */
export const BAUART = {
  sued: { label: "Süd, fest", faktor: 1.0, haProMwp: 1.1 },
  ostWest: { label: "Ost/West, fest", faktor: 0.84, haProMwp: 0.85 },
  tracker: { label: "Einachsig nachgeführt", faktor: 1.15, haProMwp: 1.5 },
  agriVertikal: { label: "Agri-PV vertikal, bifazial", faktor: 0.9, haProMwp: 2.6 },
  agriHoch: { label: "Agri-PV hoch aufgeständert", faktor: 0.95, haProMwp: 1.6 },
};

/* ------------------------------------------------------------------ */
/* Freiflächen-PV                                                      */
/* ------------------------------------------------------------------ */

/**
 * Freiflächen-PV (Fläche je MWp, EPC-Kosten, Netzanschluss-Bausteine, Opex, Degradation, Laufzeit).
 * Werte, Einheiten und Herleitung: src/lib/fakten/daten/de.js (freiflaeche.*), überwiegend eigene
 * Einschätzung (Klasse C, Prüfung ausstehend); netz.pruefWochen = § 8 Abs. 6 EEG.
 */
export const FREIFLAECHE = DE.FREIFLAECHE;

/* ------------------------------------------------------------------ */
/* Erlöse                                                              */
/* ------------------------------------------------------------------ */

/**
 * EEG-Ausschreibungen Solar – EINE Quelle für alle Rechner, Texte und Ratgeber.
 * ct = mengengewichteter durchschnittlicher Zuschlagswert, hoechstwertCt = zulässiger Höchstwert
 * des Termins, ct/kWh (Bundesnetzagentur, beendete Ausschreibungen erstes/zweites Segment,
 * abgerufen 03.10.2026). Neue Termine als Fakt zuschlag.<segment>.<datum> in
 * src/lib/fakten/daten/de.js anlegen – die Liste hier ordnet sie chronologisch.
 */
export const ZUSCHLAEGE = DE.ZUSCHLAEGE;

/** Die letzten `n` Termine einer Liste aus ZUSCHLAEGE */
export const letzteZuschlaege = (liste, n = 3) => liste.slice(-n);

/**
 * Bisheriger Wert 24,1 % mit Zuschreibung „dena/Pexapark“ – bleibt vorerst nur für STROM.ppa, weil
 * src/app/rechner/ppa/page.js und PpaRechner.js ihn ausdrücklich dena/Pexapark zuschreiben. Am Original
 * nicht geprüft (zu prüfen); nach Anpassung der Texte auf NEGATIV_ANTEIL_SOLAR_2025 umstellen.
 */
const NEGATIV_ANTEIL_SOLAR_2025_DENA = 0.241;

/**
 * Erlöse Freiflächen-PV: Rechenwert EEG-Zuschlag (4,8 ct), Agri-PV-Bonus, PPA-Spanne, Merchant,
 * § 51 EEG (paragraph51.anteilNegativ = Anteil der Solarerzeugung in negativen Stunden 2025, 23,4 %,
 * LfL Bayern), zuschlagsHistorie (@deprecated, Termine 2025 aus ZUSCHLAEGE), Stromgestehungskosten ISE.
 * Wirkung von § 51 siehe eegErloesCt. Werte und Quellen: src/lib/fakten/daten/de.js (erloese.*).
 */
export const ERLOESE = DE.ERLOESE;

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
  /*
   * ---- Ergänzung Finanzierungscockpit & Bankfinanzierung (Stand September 2026, Herleitung docs/FINANZIERUNG.md) ----
   * Marktübliche Spannen der Projektfinanzierung PV im DACH-Raum – eigene Einschätzung aus veröffentlichten
   * Branchenberichten und Term-Sheet-Übersichten, KEINE Bankkonditionen. Zinsen tagesaktuell anfragen.
   *  dscrP50/dscrP90  Sizing-DSCR, auf den die Bank das Darlehen bemisst (EEG/Marktprämie; PPA/Merchant höher)
   *  dscrLockup       Ausschüttungssperre (Lock-up), dscrDefault Kündigungsgrund (Event of Default)
   *  fkMaxQuote       Obergrenze Fremdkapital (Gearing) bei Non-Recourse, laufzeitJahre Tenor (Tail zur Förder-/Pachtdauer)
   *  dsraMonate       Schuldendienstreservekonto (Debt Service Reserve Account) in Monaten Schuldendienst
   *  referenzzinsPct  EUR-Swapsatz 10–15 Jahre, Größenordnung 2025/26; margePct Kreditmarge; bearbeitungPct einmalige Gebühr
   */
  projekt: { dscrP50: 1.2, dscrP90: 1.1, dscrLockup: 1.1, dscrDefault: 1.05, fkMaxQuote: 0.85, laufzeitJahre: 18, dsraMonate: 6, referenzzinsPct: 2.7, margePct: 1.8, bearbeitungPct: 1.0 },
  /**
   * Förderkredit je Land (Rechenwerte fürs Cockpit). DE: KfW Erneuerbare Energien – Standard (270): bis 100 % der
   * Investitionskosten, bis 150 Mio. € je Vorhaben, Laufzeit bis 30 Jahre, bis 5 tilgungsfreie Anlaufjahre, danach gleich
   * hohe Raten, risikogerechter Zins (kfw.de/270, abgerufen 09/2026). Zins = eigene Annahme für eine gute Preisklasse.
   * AT/CH: kein dem KfW-270 vergleichbarer Standardkredit für PV-Parks → Rechenwert = Bankkredit (Hinweise im Förder-Check).
   */
  foerderkredit: {
    DE: { zins: 0.041, laufzeit: 20, anlaufJahre: 3, anteilMax: 1, tilgung: "linear" },
    AT: { zins: 0.045, laufzeit: 15, anlaufJahre: 1, anteilMax: 0.8, tilgung: "annuitaet" },
    CH: { zins: 0.03, laufzeit: 15, anlaufJahre: 1, anteilMax: 0.8, tilgung: "annuitaet" },
  },
  /** Anlagenleasing / Mietkauf PV (eigene Annahme): Aufschlag auf den Bankzins, Laufzeit, Restwert bzw. Sonder-/Anzahlung */
  leasing: { zinsAufschlag: 0.01, laufzeit: 15, restwert: 0.1, sonderzahlung: 0.1 },
  mietkauf: { zinsAufschlag: 0.0075, laufzeit: 15, anzahlung: 0.1 },
  /**
   * Steuern (Näherung, mit Steuerberatung prüfen): Ertragsteuersatz Kapitalgesellschaft DE ~30 % (KSt sinkt ab 2028 schrittweise
   * auf 10 % im Jahr 2032, Gesetz für ein steuerliches Investitionssofortprogramm 2025), AT 23 % KöSt, CH je Kanton ~12–21 %.
   * Degressive AfA DE 30 % (max. 3 × linear) für Anschaffungen 1.7.2025–31.12.2027; AT § 7 Abs. 1a EStG bis 30 %.
   * AT Investitionsfreibetrag (IFB, § 11 EStG): 10 % bzw. 15 % ökologisch, befristet 11/2025–12/2026 20 % bzw. 22 %,
   * Bemessung höchstens 1 Mio. € je Wirtschaftsjahr (WKO, abgerufen 09/2026).
   */
  steuerLand: { DE: 0.3, AT: 0.23, CH: 0.18 },
  afaDegressiv: { DE: 0.3, AT: 0.3, CH: 0 },
  ifbAt: { satz: 0.22, regulaer: 0.15, maxBemessung: 1000000, befristetBis: "2026-12-31" },
  /**
   * Portfolio (Investor nach dem Kauf): Quellensteuer auf Gewinnausschüttungen einer Kapitalgesellschaft – DE
   * Kapitalertragsteuer 25 % + 5,5 % Soli (§§ 43, 43a EStG, ohne Kirchensteuer), AT KESt 27,5 % (§ 27a EStG),
   * CH Verrechnungssteuer 35 % (Art. 13 VStG, Rückforderung je nach Empfänger). Für Kapitalgesellschaften als Empfänger
   * gelten Befreiungen/Erstattungen (DE § 8b KStG/§ 43b EStG, AT § 10 KStG, CH Meldeverfahren) – nur Orientierung für
   * den Hinweis im Portfolio, Steuerberatung nötig.
   */
  quellensteuerAusschuettung: { DE: 0.26375, AT: 0.275, CH: 0.35 },
};

/* ------------------------------------------------------------------ */
/* Pacht                                                               */
/* ------------------------------------------------------------------ */

/**
 * Pacht Freiflächen- und Agri-PV in DEUTSCHLAND (€/ha·a, Umsatzbeteiligung, Ackerpacht Destatis 2023,
 * Vertragsrichtwerte für den Pachtangebot-Check). Für AT/CH gelten eigene Fakten (marktFuer(land));
 * bis zur Freigabe Länder-Sperre. Werte und Quellen: src/lib/fakten/daten/de.js (pacht.*).
 */
export const PACHT = DE.PACHT;

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
    vertikal: { min: 550, mittel: 640, max: 800 },
    hoch: { min: 850, mittel: 1000, max: 1300 },
  },
  /** Betriebskosten ohne Pacht €/kWp·a – etwas über Freifläche (Bewirtschaftung zwischen den Reihen, mehr Unterkonstruktion) */
  opexProKwp: 10,
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
  /**
   * Österreich, § 33 EAG: Abschlag auf den Zuschlagswert der Marktprämie für PV auf
   * landwirtschaftlich genutzten Flächen oder im Grünland; entfällt u. a. für
   * Agri-PV, bei der die landwirtschaftliche Hauptnutzung erhalten bleibt
   * (RIS, EAG § 33, Stand 09/2026; genutzt auf den Regionalseiten /regionen).
   */
  eagAbschlagAt: faktWert("recht.eag.abschlagLandwirtschaft", "AT"),
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
  /**
   * ISEA Battery Revenue Index (RWTH Aachen/enspired, battery-charts.de) 2025,
   * 2-h-System, marktübergreifend, THEORETISCH mit perfekter Voraussicht, €/MW·a
   * (pv magazine, 23.01.2026). Einzelmärkte sind nicht addierbar. Real erzielte
   * Erlöse liegen erfahrungsgemäß deutlich darunter (eigene Einschätzung ~50–60 %).
   */
  indexErloes2025: { gesamt2h: 259000, gesamt1h: 151000, fcr: 106000, afrrLeistung: 146000, afrrArbeit: 76500, dayAhead: 91000 },
  /** Aufteilung realistischer Erlöse (2-h-System, 2026) – eigene Einschätzung auf Basis des Index: aFRR ist Hauptanker, FCR verliert */
  erloesMix: { arbitrage: 0.4, afrr: 0.5, fcr: 0.1 },
  /** Erlös je MW relativ zum 2-h-System nach Speicherdauer (Index 2025: 1 h ≈ 58 % von 2 h; längere Dauer mit abnehmendem Grenznutzen) */
  dauerFaktor: { 1: 0.6, 2: 1.0, 3: 1.2, 4: 1.35 },
  /** Kapazitätsverlust je Jahr (LFP, ~1 Vollzyklus/Tag) */
  degradation: 0.02,
  /** Erlöstrend je Jahr (mehr Speicher im Markt drückt Spreads und Regelenergiepreise) – eigene vorsichtige Annahme */
  erloesTrend: -0.02,
  /** Betriebskosten (Wartung, Versicherung, Pacht, Betriebsführung) in % der Investition p. a. */
  opexAnteilCapex: 0.015,
  /** Entgelt des Vermarkters/Optimierers in % der Erlöse */
  vermarktungAnteil: 0.07,
  /** Betrachtungsdauer (Jahre) */
  lebensdauer: 15,
  /** Diskontsatz Barwert (merchant-lastiges Risiko, eigene Annahme) */
  diskont: 0.08,
  /**
   * Baukostenzuschuss (BKZ) nach Leistungspreismodell, €/kW – Beispiel Bayernwerk Netz 2025
   * (Mittelspannung 125,31 €/kW, Hochspannung 97,26 €/kW). Zulässig auch für Speicher
   * (BGH, Beschluss vom 15.07.2025, EnVR 1/24). Netzdienliche Fahrweise: einzelne
   * Netzbetreiber gewähren Abschläge (z. B. Bayernwerk: 30 % des Leistungspreises).
   */
  bkzProKw: { ms: 125, hs: 97 },
  bkzNetzdienlichFaktor: 0.3,
  /** Netzanschluss/Umspannung/Schaltanlage je kW, eigene Einschätzung (Co-Location nutzt den Anschluss des Solarparks) */
  netzanschlussProKw: { coLocation: 20, ms: 60, hs: 110 },
  /** Co-Location: Erlösabschlag wegen gemeinsam genutzter Anschlussleistung und Ladebeschränkungen (eigene Annahme) */
  coLocationErloesFaktor: 0.85,
  /** Netzentgelt auf Ladestrom ohne Befreiung, ct/kWh – grobe Näherung (Reform der Netzentgelte offen) */
  netzentgeltCt: 1.5,
  /** § 118 Abs. 6 EnWG: Befreiung von Netzentgelten für Speicher mit Inbetriebnahme bis 4. August 2029, 20 Jahre */
  netzentgeltBefreiungBis: "4. August 2029",
};

/* ------------------------------------------------------------------ */
/* Strom für Unternehmen (Reststrom-Pool, virtuelles Kraftwerk)        */
/* ------------------------------------------------------------------ */

export const STROM = {
  /**
   * Gewerblicher Strompreis Mittelstand DE (netto, ohne USt.), ct/kWh, Neuverträge 2026,
   * Verbrauch bis 1 GWh je Abnahmestelle, Mittelspannung, Stromsteuer zum Regelsatz.
   * Paket E (03.10.2026), Quellen:
   *  - BDEW-Strompreisanalyse August 2026, S. 40 „Strompreis-Bestandteile für Industrie“ (160 MWh–20 GWh/a,
   *    MS): Beschaffung, Netzentgelt, Vertrieb zusammen 14,695 ct; KWKG 0,446; Offshore 0,941;
   *    Konzessionsabgabe 0,110; Summe 17,175 ct (mit ermäßigter Stromsteuer 0,05 und § 19 im Mittel 0,933).
   *  - Aufschlag für besondere Netznutzung (§ 19 StromNEV) 2026: 1,559 ct für die ersten 1.000.000 kWh,
   *    darüber 0,050 ct (Veröffentlichung der Netzbetreiber, z. B. ENERVIE Vernetzt „Umlagen und Steuern
   *    2026“; ÜNB-Veröffentlichung vom 24.10.2025; netztransparenz.de am 03.10.2026 nicht erreichbar).
   *  - Stromsteuer Regelsatz 2,05 ct (§ 3 StromStG), produzierendes Gewerbe 0,05 ct (unten).
   * Umlagen = 0,446 + 0,941 + 1,559 = 2,946 ct (bisher 1,8 – zu niedrig).
   * Die Aufteilung der BDEW-Summe 14,695 auf Netz (5,5, eigene Einschätzung, unverändert) und
   * Beschaffung & Vertrieb (Rest 9,195 → 9,2) ist eine Näherung; bisher 10,5 + 5,5 = 16,0 lag über BDEW.
   * Gesamt 19,8 ct (bisher 19,96) = BDEW 14,695 + Umlagen bis 1 GWh 2,946 + KA 0,11 + Stromsteuer 2,05.
   */
  bestandteile: [
    { id: "beschaffung", label: "Beschaffung & Vertrieb", ct: 9.2, beeinflussbar: true },
    { id: "netz", label: "Netzentgelte & Messung", ct: 5.5, beeinflussbar: false },
    { id: "umlagen", label: "Umlagen (KWKG, Offshore, § 19; bis 1 GWh)", ct: 2.946, beeinflussbar: false },
    { id: "konzession", label: "Konzessionsabgabe", ct: 0.11, beeinflussbar: false },
    { id: "stromsteuer", label: "Stromsteuer", ct: 2.05, beeinflussbar: false },
  ],
  /** Umlagen 2026 je Bestandteil, ct/kWh (Quellen siehe bestandteile) */
  umlagen2026: { kwkg: 0.446, offshore: 0.941, besondereNetznutzungBis1Gwh: 1.559, besondereNetznutzungUeber1Gwh: 0.05 },
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
  /**
   * PPA-Rechner für Unternehmen (/rechner/ppa):
   *  baseTerminCt     Terminmarkt Strom DE Cal-27 Base, Ende August 2026 rund 110–115 €/MWh (EEX, lt. enerchase WeeklyTrading KW 36/2026)
   *  captureRate      Solar-Marktwert relativ zum Base-Preis im Jahresmittel – 2025 in Mai/Juni nur 0,31–0,33 (dena PPA-Marktanalyse 2025, Pexapark), Jahresmittel eigene Einschätzung
   *  pppCt            Liefer-PPA Solar pay-as-produced an Unternehmen, 10 Jahre, ct/kWh – dena 2025: Erzeuger-PPA 35–45 €/MWh; seit dem Anstieg am Terminmarkt 2026 höher (eigene Einschätzung)
   *  strukturierungCt Aufschlag für Umwandlung in ein Baseload-/Lastprofil (Profil-, Mengen-, Ausgleichsenergierisiko), eigene Einschätzung
   *  bilanzierungCt   Bilanzkreis/Ausgleichsenergie bei pay-as-produced, eigene Einschätzung
   *  residualAufschlag  Reststrom außerhalb der Solarstunden ist teurer als Base (Abend/Winter)
   *  vermarktungsAbschlag  Abschlag beim Weiterverkauf von Überschüssen
   *  negativAnteilSolar  Anteil Solarerzeugung in Stunden mit negativen Preisen 2025: 24,1 % (dena/Pexapark, nicht am Original geprüft; s. o.)
   */
  ppa: {
    baseTerminCt: 11.0,
    captureRate: 0.6,
    pppCt: { min: 5.0, mittel: 6.0, max: 7.5 },
    strukturierungCt: { min: 1.0, mittel: 1.8, max: 3.0 },
    bilanzierungCt: 0.3,
    residualAufschlag: 0.05,
    vermarktungsAbschlag: 0.1,
    negativAnteilSolar: NEGATIV_ANTEIL_SOLAR_2025_DENA,
  },
};

/* ------------------------------------------------------------------ */
/* Kommunen                                                            */
/* ------------------------------------------------------------------ */

/**
 * Einnahmen der Standortgemeinde: § 6 EEG (0,2 ct/kWh), Gewerbesteuer (§ 29 GewStG 90 %, Hebesatz Ø 409 %
 * Destatis 2024, Messzahl, Hinzurechnung § 8 Nr. 1), Länder mit Beteiligungsgesetz (Übersicht FA Wind und
 * Solar, laenderGesetzeStand = Abrufdatum). Werte und Quellen: src/lib/fakten/daten/de.js (kommune.*).
 */
export const KOMMUNE = DE.KOMMUNE;

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
  /**
   * Energy-Sharing-Rechner (/rechner/energy-sharing) – Standardwerte je Land.
   * Preise netto je kWh in Landeswährung (DE/AT ct, CH Rp.). Orientierung, im Rechner änderbar.
   *  energiepreis   Energieanteil des heutigen Arbeitspreises (Beschaffung + Vertrieb) beim Lieferanten
   *  netzAp         Arbeitspreis Netznutzung auf der Endkundenebene
   *                 AT NE7 Beispiele 2026: Vorarlberg 4,96, Wien 6,98, NÖ 8,79 ct/kWh (Stromliste.at)
   *  rabatte        Abschlag auf den Netz-Arbeitspreis für geteilten Strom
   *                 AT: lokal 57 %, regional 28 % (Netzebenen 6/7) nach SNE-V 2018 – gilt bis 31.12.2026
   *                     (gueltigBis); die Neufestlegung ab 01.01.2027 ist offen. Paket E: Prozentsätze nicht am
   *                     RIS-Original geprüft (zu prüfen); der frühere Vermerk „Regeln ab 1.10.2026“ war irreführend.
   *                 CH: LEG 40 % gleiche Netzebene, 20 % über mehrere Ebenen (StromVV Art. 19h) – zu prüfen
   *                 DE: nach aktuellem Stand kein Netzentgeltvorteil (§ 42c EnWG)
   *  abgabenCt      Entfall von Abgaben auf geteilten Strom – AT: Elektrizitätsabgabe 2026 befristet gesenkt auf
   *                 0,1 ct/kWh für Haushalte und 0,82 ct/kWh für alle anderen (Nationalrat 16.12.2025, Parlamentskorrespondenz
   *                 „Nationalrat beschließt Senkung der Elektrizitätsabgabe“, abgerufen 03.10.2026; ab 2027 wieder 1,5 ct).
   *                 abgabenCtNachTyp trennt die Sätze; abgabenCt bleibt der Satz für Nicht-Haushalte.
   *  ueberschussCt  Vergütung für nicht geteilten Überschuss (Marktwert/Einspeisevergütung, grobe Annahme)
   *  gemeinschaftCt Preis für geteilten Strom innerhalb der Gemeinschaft (Vorschlag)
   *  verwaltung     Mess-/Abrechnungs-/Verwaltungskosten je Teilnehmer und Jahr
   */
  rechner: {
    de: { waehrung: "€", ct: "ct", energiepreis: 14, netzAp: 9, rabatte: [{ id: "keiner", label: "Energy Sharing", sub: "§ 42c EnWG", anteil: 0 }], abgabenCt: 0, ueberschussCt: 6, gemeinschaftCt: 11, verwaltung: 30 },
    at: {
      waehrung: "€",
      ct: "ct",
      energiepreis: 12,
      netzAp: 7,
      rabatte: [
        { id: "lokal", label: "EEG lokal", sub: "−57 % Netz-AP", anteil: 0.57 },
        { id: "regional", label: "EEG regional", sub: "−28 % Netz-AP", anteil: 0.28 },
        { id: "beg", label: "BEG", sub: "ohne Abschlag", anteil: 0 },
      ],
      rabatteGueltigBis: "2026-12-31",
      abgabenCt: 0.82,
      abgabenCtNachTyp: { haushalt: 0.1, sonstige: 0.82 },
      abgabenGueltigBis: "2026-12-31",
      ueberschussCt: 5,
      gemeinschaftCt: 10,
      verwaltung: 20,
    },
    ch: {
      waehrung: "CHF",
      ct: "Rp.",
      /**
       * Energietarif Grundversorgung 2027, Median Haushalt H4: 11,35 Rp./kWh (ElCom, Medienmitteilung
       * „Leicht sinkende Strompreise 2027“, admin.ch, 08.09.2026, abgerufen 03.10.2026). Paket E: von 14 korrigiert.
       * netzAp (10) und ueberschussCt (6) unverändert, nicht neu geprüft (Netznutzung 2027 Median 10,94 Rp. inkl.
       * Bestandteile, auf die der LEG-Abschlag nicht wirkt; 6 Rp. Rückliefervergütung zu prüfen).
       */
      energiepreis: 11.35,
      netzAp: 10,
      rabatte: [
        { id: "leg40", label: "LEG, eine Ebene", sub: "−40 % Netznutzung", anteil: 0.4 },
        { id: "leg20", label: "LEG, mehrere Ebenen", sub: "−20 % Netznutzung", anteil: 0.2 },
      ],
      abgabenCt: 0,
      ueberschussCt: 6,
      /** Vorschlag: 1 Rp. unter dem Energietarif (wie bisher 13 bei 14 Rp.) – eigene Annahme, im Rechner änderbar */
      gemeinschaftCt: 10.35,
      verwaltung: 40,
    },
  },
  /**
   * Beteiligungsrechner Genossenschaft (/rechner/beteiligung) – BEISPIELWERTE, die
   * Genossenschaft ist im Aufbau, Anteilshöhe und Kosten stehen noch nicht fest:
   *  anteilEur           Beispiel-Nennwert eines Anteils
   *  verwaltungAnteil    laufende Kosten der eG p. a. in % des Mitgliederkapitals (Prüfungsverband, Buchhaltung,
   *                      Generalversammlung; verteilt auf mehrere Beteiligungen) – eigene Einschätzung
   *  ruecklageAnteil     Zuführung zur gesetzlichen/satzungsmäßigen Rücklage (Anteil am Überschuss)
   *  kapitalertragsteuer DE: 25 % + Solidaritätszuschlag (ohne Kirchensteuer)
   */
  beteiligung: { anteilEur: 250, verwaltungAnteil: 0.01, ruecklageAnteil: 0.1, kapitalertragsteuer: 0.26375 },
  /**
   * Steuerabzug auf Dividenden der Genossenschaft (Mitgliederbereich /portal/beteiligung, vereinfacht, ohne Kirchensteuer):
   *  DE: Kapitalertragsteuer 25 % + Solidaritätszuschlag 5,5 % darauf (§ 43a EStG, SolZG); Sparer-Pauschbetrag 1.000 € (§ 20 Abs. 9 EStG)
   *  AT: Kapitalertragsteuer 27,5 % (§ 27a Abs. 1 Z 2 EStG AT)
   *  CH: Verrechnungssteuer 35 % (Art. 13 VStG), rückforderbar
   * Rückvergütungen (nach Umsatz) ohne Abzug gerechnet – steuerliche Behandlung durch Steuerberatung prüfen.
   */
  steuerAbzug: { DE: 0.26375, AT: 0.275, CH: 0.35, freibetragDeEur: 1000 },
};

/* ------------------------------------------------------------------ */
/* Allgemein                                                           */
/* ------------------------------------------------------------------ */

export const ALLGEMEIN = {
  /**
   * CO₂-Vermeidung je kWh Solarstrom in DEUTSCHLAND: Netto-Vermeidungsfaktor Photovoltaik 2024
   * 684,74 g CO₂-Äq./kWh (Umweltbundesamt, Emissionsbilanz erneuerbarer Energieträger 2024,
   * CLIMATE CHANGE 11/2026, Tabelle 10, abgerufen 03.10.2026). Paket E: von 0,65 auf 0,685 korrigiert.
   * Gilt nur für den deutschen Strommix – für AT/CH NICHT verwenden (co2KgProKwhFuer liefert dort null).
   */
  co2KgProKwh: 0.685,
  /** Durchschnittlicher Haushaltsverbrauch für anschauliche Vergleiche */
  haushaltKwh: 3500,
  /**
   * Anteil der Jahreserzeugung je Monat (Jan–Dez) einer fest aufgeständerten PV-Anlage in Mitteleuropa,
   * Summe 1 – Soll-Ist-Vergleich im Anlagen-Monitoring. Quelle: typische Monatsverteilung nach PVGIS
   * (EU JRC, Standorte DE/AT/CH, gerundet, eigene Auswertung).
   */
  pvMonatsanteile: [0.025, 0.045, 0.08, 0.115, 0.13, 0.135, 0.135, 0.12, 0.09, 0.065, 0.035, 0.025],
};

/** CO₂-Faktor (kg/kWh) für ein Land bzw. eine Regions-ID – nur DE belegt, sonst null (ausblenden) */
export const co2KgProKwhFuer = (landOderRegion = "DE") => (laenderSperre(landOderRegion) ? null : ALLGEMEIN.co2KgProKwh);

/** Quellenverzeichnis (Auswahl) – src/lib/fakten/daten/de.js, quellen.allgemein */
export const QUELLEN = DE.QUELLEN;

/* ------------------------------------------------------------------ */
/* Hilfsfunktionen für alle Rechner                                    */
/* ------------------------------------------------------------------ */

/**
 * Durchschnittlicher Erlös je erzeugbarer kWh im EEG-Marktprämienmodell mit § 51 EEG (ct/kWh):
 * max(AW, MW) − anteilNegativ × max(AW − MW, 0). awCt = anzulegender Wert, marktCt = Marktwert Solar
 * im Jahr (inkl. negativer Stunden). Herleitung bei ERLOESE.paragraph51; § 51a (Verlängerung) nicht gerechnet.
 */
export function eegErloesCt(awCt, marktCt, anteilNegativ = ERLOESE.paragraph51.anteilNegativ) {
  const a = Math.min(Math.max(Number(anteilNegativ) || 0, 0), 1);
  return Math.max(awCt, marktCt) - a * Math.max(awCt - marktCt, 0);
}

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

/* ------------------------------------------------------------------ */
/* Dach-PV: Dachpacht auf Gewerbe-, Hallen-, Agrar- und Logistikdächern */
/* ------------------------------------------------------------------ */

/**
 * Orientierungswerte für die Verpachtung großer Dachflächen (ab ca. 1.000 m²) an einen PV-Betreiber,
 * DE-Schwerpunkt: Dacharten, Ausrichtung, Pachtspannen, Investition, Rechenwert Volleinspeisung
 * (eegDachCt 9,3 = Mittel der Zuschläge 2025), zuschlagsHistorie (@deprecated, Termine 2025 aus
 * ZUSCHLAEGE.dach), Stromgestehungskosten ISE, quellen. Werte und Herleitung:
 * src/lib/fakten/daten/de.js (dach.*).
 */
export const DACH = DE.DACH;

/* ------------------------------------------------------------------ */
/* Bestandsanlagen (Zweitmarkt)                                        */
/* ------------------------------------------------------------------ */

/**
 * Bewertung laufender PV-Anlagen. Eigene Annahmen auf Basis üblicher
 * Transaktionspraxis (Ertragswert/DCF), Stand September 2026. Preisspanne je
 * kWp für jüngere Anlagen siehe PHASEN (id "cod").
 */
export const BESTAND = {
  /** Bewertungsjahr (erstes Jahr im Cashflow) */
  bewertungsjahr: 2027,
  /** Technische Nutzungsdauer ab Inbetriebnahme (Jahre), 30–35 bei guter Wartung */
  nutzungsdauer: 30,
  nutzungsdauerSpanne: { min: 25, max: 40 },
  /** Förderdauer ab Inbetriebnahme: EEG DE 20 Jahre plus Rest des IBN-Jahres; AT/CH laut Bescheid */
  foerderJahre: 20,
  /** Degradation älterer Module p. a. */
  degradation: 0.005,
  /** Betriebskosten ohne Pacht €/kWp·a (Bestand, inkl. Direktvermarktung, Versicherung) */
  opexProKwp: 13,
  /** Wechselrichtertausch €/kWp inkl. Montage und Inbetriebnahme – eigene Marktbeobachtung */
  wechselrichterProKwp: { min: 40, mittel: 60, max: 90 },
  /** Übliche Lebensdauer Wechselrichter (Jahre) */
  wechselrichterJahre: { min: 12, max: 15 },
  /** Diskontsatz (Ertragswert, unverschuldet) – Spanne für Bestandsanlagen */
  diskont: { min: 0.045, standard: 0.06, max: 0.09 },
  /** Direktvermarktungskosten nach Förderende ct/kWh */
  direktvermarktungCt: 0.3,
  /**
   * Grobe Richtwerte der Vergütung nach Inbetriebnahmejahr (Freifläche bzw.
   * größere Dachanlagen, DE) – NUR zur Vorbelegung, tatsächlichen Wert aus
   * Abrechnung/Zuschlag übernehmen. Eigene Zusammenfassung der EEG-Sätze
   * bzw. Ausschreibungsergebnisse (Bundesnetzagentur).
   */
  verguetungRichtwerte: [
    { bis: 2009, ct: 32 },
    { bis: 2010, ct: 27 },
    { bis: 2011, ct: 22 },
    { bis: 2012, ct: 16 },
    { bis: 2014, ct: 11 },
    { bis: 2017, ct: 8 },
    { bis: 2022, ct: 5.2 },
    { bis: 2030, ct: 5 },
  ],
  /** Abweichung Ist-Ertrag zu Prognose, ab der eine technische Prüfung dringend ist */
  minderertragWarnung: 0.9,
};

/* ------------------------------------------------------------------ */
/* Projektentwicklung (internes Entwicklungsmanagement, Portfolio)     */
/* ------------------------------------------------------------------ */

/**
 * Planannahmen der Projektentwicklung (Backoffice /portal/admin/entwicklung).
 *  zielMwpJahr        Neuentwicklung pro Jahr laut Unternehmensangabe (docs/BRIEFING.md, „rund 50 MWp pro Jahr“)
 *  wahrscheinlichkeit Erfolgswahrscheinlichkeit bis zur Inbetriebnahme je erreichter Phase (PHASEN-id; „akquise“ = vor
 *                     Flächensicherung). Grobe, interne Planannahme zur Gewichtung des Pipeline-Werts (übliche
 *                     Größenordnungen aus Projektbörsen/Branchengesprächen) – KEINE belegte Quote, je Projekt überschreibbar.
 *  preisBasis         Pipeline-Wert = MWp × 1000 × Mitte der Phasenspanne PHASEN.preisProKwp × Wahrscheinlichkeit
 */
export const ENTWICKLUNG = {
  zielMwpJahr: 50,
  wahrscheinlichkeit: { akquise: 0.05, flaeche: 0.15, netz: 0.25, aufstellung: 0.4, satzung: 0.65, rtb: 0.85, cod: 1 },
  preisBasis: "mitte",
};

/**
 * Projektkostenkalkulation (Backoffice /portal/admin/entwicklung/[id]?reiter=kalkulation) – Vorschlagswerte je Gewerk.
 * Grundlage sind die Spannen oben (FREIFLAECHE, AGRI, CARPORT, DACH, SPEICHER, PACHT, FINANZIERUNG); die Aufteilung der
 * schlüsselfertigen Errichtung (EPC) auf Gewerke ist eine EIGENE EINSCHÄTZUNG aus Projektpraxis und veröffentlichten
 * Kostenaufstellungen (Größenordnung 2025/26) – Orientierung, keine Angebotspreise. Jede Zahl ist in der Kalkulation
 * überschreibbar; mit fortschreitendem Kostenstand ersetzen Angebote/Vergaben die Vorschläge.
 *  epcAnteile        Anteil am EPC-Preis (capexProKwp.mittel des Typs) je Gewerk; Summe = 1. Zaun und Wege werden, sobald
 *                    Zaunlänge bzw. Fläche bekannt sind, stattdessen über zaunProM/wegeProHa berechnet
 *                    (bos = Monitoring, Blitz-/Überspannungsschutz, Kommunikation, Beschilderung, Inbetriebnahme)
 *  zaunProM          Zaun 2,0–2,4 m mit Übersteigschutz inkl. Tore, €/m; kameraProHa Videoüberwachung/Einbruchmeldung €/ha
 *  wegeProHa         Wege, Stellflächen, Erdarbeiten €/ha Anlagenfläche
 *  trasseProM        MS-Kabeltrasse je Verlegeart inkl. Tiefbau und Kabel (ein System), €/m – „graben“ = FREIFLAECHE.kabelProMeter
 *  querung           Sonderbauwerke je Querung (Spülbohrung/Pressung inkl. Genehmigung), €
 *  dienstbarkeitProM Entschädigung Leitungsrecht (beschränkte persönliche Dienstbarkeit) je Trassenmeter, einmalig
 *  notarJeFlaeche    Notar/Grundbuch je Grundstücksvorgang (Dienstbarkeit, Vormerkung)
 *  entwicklungAnteile Aufteilung der Entwicklungskosten (FREIFLAECHE.entwicklungProKwp) ohne Gutachten
 *  gutachtenEur      Gutachten je Art (Vorlage-Schlüssel der Projektentwicklung), Orientierungswert € je Gutachten
 *  ausgleichProHa    Ausgleichs-/Ökomaßnahmen (Ansaat, Hecken, Pflege in der Herstellungsphase) €/ha
 *  versicherungBau   Bauleistungs-/Montageversicherung (CAR/EAR) in % der Bausumme
 *  contingency       Unvorhergesehenes je Kostenstand (Anteil an Bau + Netz) – übliche Reserve sinkt mit Planungstiefe
 *  bauzeitMonate     typische Bauzeit je Typ (Monate) für Bauzeitzinsen; mittlere Inanspruchnahme 50 %
 */
export const PROJEKTKOSTEN = {
  epcAnteile: {
    standard: { module: 0.24, wechselrichter: 0.07, unterkonstruktion: 0.3, dc: 0.08, ac: 0.06, bos: 0.08, bauleitung: 0.1, zaun: 0.03, wege: 0.04 },
    carport: { module: 0.15, wechselrichter: 0.05, unterkonstruktion: 0.53, dc: 0.05, ac: 0.05, bos: 0.03, bauleitung: 0.1, zaun: 0, wege: 0.04 },
    dach: { module: 0.3, wechselrichter: 0.09, unterkonstruktion: 0.2, dc: 0.1, ac: 0.08, bos: 0.1, bauleitung: 0.13, zaun: 0, wege: 0 },
  },
  zaunProM: 55,
  kameraProHa: 1500,
  wegeProHa: 12000,
  trasseProM: { graben: 120, pflug: 85, bankett: 160, asphalt: 230, spuelbohrung: 280 },
  querung: { strasse: 15000, bahn: 60000, gewaesser: 25000 },
  dienstbarkeitProM: 5,
  notarJeFlaeche: 2500,
  entwicklungAnteile: { pacht: 0, planung: 0.45, gebuehren: 0.15, recht: 0.2, netzpruefung: 0.2 },
  gutachtenEur: {
    gutachten_artenschutz: 25000, gutachten_ffh: 8000, gutachten_landschaft: 7000, gutachten_blendung: 4000, gutachten_schall: 5000,
    gutachten_entwaesserung: 7000, gutachten_archaeologie: 12000, gutachten_boden: 18000, gutachten_kampfmittel: 9000, umweltbericht: 20000,
    nutzungskonzept_agri: 6000, gutachten_nvp: 15000, statik: 8000, standard: 8000,
  },
  ausgleichProHa: 2000,
  versicherungBau: 0.003,
  contingency: { schaetzung: 0.15, kostenrahmen: 0.1, kostenberechnung: 0.07, angebote: 0.05, vergabe: 0.03, abrechnung: 0 },
  bauzeitMonate: { freiflaeche: 6, agri: 8, carport: 6, dach: 4, speicher: 9, hybrid: 8 },
};
