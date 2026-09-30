// src/lib/plattform/finanzen/konstanten.js
//
// Stammlisten der Finanz- und Abrechnungsfunktionen (Pacht, Contracting, Provision, Anlagenbuchhaltung).
// Gleiche Tabellen in Frappe: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/finanzen/logik.py.
// Client- und serverseitig nutzbar (keine Node-Importe).

export const PACHTMODELLE = {
  fest: { label: "Festpacht", text: "Fester Jahresbetrag (z. B. €/ha × Fläche), ohne Anpassung." },
  indexiert: { label: "Indexierte Pacht", text: "Jahresbetrag wertgesichert über einen Verbraucherpreisindex (VPI/LIK)." },
  umsatz: { label: "Umsatzbeteiligung", text: "Anteil an den Stromerlösen der Anlage, mindestens die vereinbarte Mindestpacht." },
};

export const PACHT_OBJEKTE = { flaeche: "Fläche (Freifläche / Agri-PV)", dach: "Dach / Gebäude" };

export const BEGINN_ARTEN = {
  baubeginn: "Baubeginn",
  inbetriebnahme: "Inbetriebnahme",
  vertrag: "Vertragsbeginn",
};

/** Zahlungsrhythmus: Monate je Periode (kalendergebunden) */
export const RHYTHMEN = {
  jaehrlich: { label: "jährlich", monate: 12 },
  halbjaehrlich: { label: "halbjährlich", monate: 6 },
  quartalsweise: { label: "vierteljährlich", monate: 3 },
  monatlich: { label: "monatlich", monate: 1 },
};

export const ZAHLWEISEN = {
  vorschuessig: "im Voraus (vorschüssig)",
  nachschuessig: "im Nachhinein (nachschüssig)",
};

export const PACHTVERTRAG_STATUS = {
  entwurf: { label: "Entwurf", ton: "neutral" },
  aktiv: { label: "Aktiv", ton: "ok" },
  gekuendigt: { label: "Gekündigt", ton: "warn" },
  beendet: { label: "Beendet", ton: "neutral" },
};

/**
 * Index-Reihen für die Wertsicherung. Werte pflegt das Backoffice (Tabelle „VPI-Werte“), maßgeblich ist immer die
 * amtliche Veröffentlichung. Jahreswerte = Jahresdurchschnitt.
 */
export const INDEX_REIHEN = {
  "VPI-AT-2020": { land: "AT", label: "VPI 2020 (Österreich)", quelle: "Statistik Austria – Verbraucherpreisindex 2020 = 100", url: "https://www.statistik.at" },
  "VPI-DE-2020": { land: "DE", label: "VPI 2020 (Deutschland)", quelle: "Destatis – Verbraucherpreisindex für Deutschland, 2020 = 100", url: "https://www.destatis.de" },
  "LIK-CH-2020": { land: "CH", label: "LIK Dez. 2020 (Schweiz)", quelle: "BFS – Landesindex der Konsumentenpreise, Dezember 2020 = 100", url: "https://www.bfs.admin.ch" },
};

/**
 * Startwerte der Demo und des Setup-Assistenten – gerundete BEISPIELWERTE (Jahresdurchschnitte), keine amtlichen
 * Zahlen. Vor jeder echten Abrechnung mit der Veröffentlichung von Statistik Austria / Destatis / BFS abgleichen und
 * im Backoffice unter „Index (VPI)“ korrigieren.
 */
export const INDEX_STARTWERTE = [
  ["VPI-AT-2020", 2020, 100.0], ["VPI-AT-2020", 2021, 102.8], ["VPI-AT-2020", 2022, 111.6], ["VPI-AT-2020", 2023, 120.0], ["VPI-AT-2020", 2024, 123.5], ["VPI-AT-2020", 2025, 127.5],
  ["VPI-DE-2020", 2020, 100.0], ["VPI-DE-2020", 2021, 103.1], ["VPI-DE-2020", 2022, 110.2], ["VPI-DE-2020", 2023, 116.7], ["VPI-DE-2020", 2024, 119.3], ["VPI-DE-2020", 2025, 121.9],
  ["LIK-CH-2020", 2021, 100.6], ["LIK-CH-2020", 2022, 103.4], ["LIK-CH-2020", 2023, 105.6], ["LIK-CH-2020", 2024, 106.7], ["LIK-CH-2020", 2025, 106.9],
];

export const ABRECHNUNG_ARTEN = {
  pacht: { label: "Pachtabrechnung", beleg: "Gutschrift", erpnext: "Purchase Invoice", kreis: "PG" },
  contracting: { label: "Contracting-Rechnung", beleg: "Rechnung", erpnext: "Sales Invoice", kreis: "CR" },
  provision: { label: "Provisionsrechnung", beleg: "Rechnung", erpnext: "Sales Invoice", kreis: "PR" },
};

/** Status eines Belegs; „überfällig“ wird aus Fälligkeit und Status berechnet (zahlungsstatus) */
export const ABRECHNUNG_STATUS = {
  offen: { label: "Offen", ton: "info" },
  angewiesen: { label: "Zahlung angewiesen", ton: "info" },
  bezahlt: { label: "Bezahlt", ton: "ok" },
  storniert: { label: "Storniert", ton: "neutral" },
};

export const ZAHLUNGSSTATUS = {
  offen: { label: "Offen", ton: "info" },
  ueberfaellig: { label: "Überfällig", ton: "warn" },
  angewiesen: { label: "Zahlung angewiesen", ton: "info" },
  bezahlt: { label: "Bezahlt", ton: "ok" },
  storniert: { label: "Storniert", ton: "neutral" },
};

export const KLAERFALL_STATUS = {
  offen: { label: "Offen", ton: "warn" },
  erledigt: { label: "Erledigt", ton: "ok" },
  verworfen: { label: "Verworfen", ton: "neutral" },
};

export const LAUF_ARTEN = {
  pacht: "Pachtabrechnung",
  contracting: "Contracting-Abrechnung",
  provision: "Provisionsrechnungen",
  alle: "Alle Abrechnungen",
};

/** Mahnstufen nach Tagen Überfälligkeit (nur Hinweis – Mahnungen verschickt die Buchhaltung) */
export const MAHNSTUFEN = [
  { tage: 7, stufe: 1, label: "Zahlungserinnerung" },
  { tage: 21, stufe: 2, label: "1. Mahnung" },
  { tage: 35, stufe: 3, label: "2. Mahnung / Klärung" },
];

/** Artikel (ERPNext Item) je Abrechnungsposition */
export const ARTIKEL = {
  PACHT: { label: "Pacht", art: "pacht" },
  "PACHT-RES": { label: "Reservierungsprämie", art: "pacht" },
  "PACHT-UMSATZ": { label: "Pacht Umsatzbeteiligung", art: "pacht" },
  PROVISION: { label: "Vermittlungsprovision Projektbörse", art: "provision" },
  "CONTRACTING-STROM": { label: "Contracting-Strom (Arbeitspreis)", art: "contracting" },
  "CONTRACTING-GRUND": { label: "Contracting Grundgebühr", art: "contracting" },
};

/** Kostenstellen (ERPNext Cost Center) */
export const KOSTENSTELLEN = {
  pacht: "Flächen & Pacht",
  contracting: "Contracting & PPA",
  provision: "Projektbörse",
  entwicklung: "Projektentwicklung",
  verwaltung: "Verwaltung",
};

export const KOSTENARTEN = {
  planung: "Planung & Gutachten",
  netz: "Netzanschluss & Netzprüfung",
  genehmigung: "Genehmigung & Verfahren",
  flaeche: "Flächensicherung (Reservierung/Pacht)",
  personal: "Personal (Stunden)",
  recht: "Recht & Steuern",
  sonstiges: "Sonstiges",
};

/** Abschreibung: Standard-Nutzungsdauer PV und Hinweise je Land (keine Steuerberatung) */
export const AFA = {
  nutzungsdauerPv: 20,
  nutzungsdauerSpeicher: 10,
  regeln: {
    AT: { label: "AT – linear, Halbjahresregel", text: "§ 7 EStG 1988: lineare AfA; Inbetriebnahme im zweiten Halbjahr → halbe Jahres-AfA im ersten Jahr. Eine betriebsgewöhnliche Nutzungsdauer von 20 Jahren ist für PV üblich, aber nicht amtlich festgelegt; degressive AfA (§ 7 Abs. 1a) prüfen." },
    DE: { label: "DE – linear, monatsgenau", text: "§ 7 Abs. 1 EStG: lineare AfA, im ersten Jahr zeitanteilig nach Monaten. AfA-Tabelle: PV-Anlagen 20 Jahre. Sonderregeln (degressive AfA, Sonderabschreibungen) mit der Steuerberatung abstimmen." },
    CH: { label: "CH – linear, monatsgenau", text: "Linear über die Nutzungsdauer, zeitanteilig. Steuerlich gelten die Abschreibungssätze der ESTV bzw. der Kantone – mit der Treuhand abstimmen." },
  },
};

export const HINWEIS_STEUERBERATUNG = "Steuerliche Behandlung als Vorschlag hinterlegt – mit der Steuerberatung abstimmen.";
