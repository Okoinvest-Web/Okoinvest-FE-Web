// src/lib/fakten/daten/netzentgelte-2027.js
//
// Netzentgelte 2027 (Welle 2, Paket FRI) – nur Struktur, Termine und amtliche Verweise.
// Vertrag: ../schema.js. Eingebunden über netzentgelte-de/at/ch.js → ../index.js;
// NUR über src/lib/fakten/index.js importieren (Ausnahme: Tests in diesem Ordner).
//
// Stop-Liste (Masterplan Abschnitt 9): keine VNB-Vollabdeckung DE, kein AT-Atlas vor der
// SNE-Tarifverordnung 2027, CH nur als Verweis auf die amtliche ElCom-Quelle.
//   DE  Struktur nach § 17 StromNEV + Termin der vorläufigen (15.10.) und endgültigen Veröffentlichung
//   AT  neue Systemnutzungsentgelte ab 01.01.2027 – nur erwarteter Termin, Wert offen
//   CH  ElCom-Tarife 2027 – Verweis, Werte zu prüfen
// Offene Werte: wert null, status "zu_pruefen", notiz „Veröffentlichung erwartet bis TT.MM.JJJJ“.

const ABRUF = "2026-10-03";
const FRI = "Paket FRI (Wortlaut am Original 03.10.2026) · Zweitprüfung TODO-E6";
const OFFEN_DE = "TODO-E6 · Fachprüfung Team Deutschland";
const OFFEN_AT = "TODO-E6 · Fachprüfung Team Österreich";
const OFFEN_CH = "TODO-E6 · Fachprüfung Team Schweiz";

const Q = {
  enwg20: { titel: "Energiewirtschaftsgesetz (EnWG), § 20 Abs. 1 – Veröffentlichung der Netzentgelte", url: "https://www.gesetze-im-internet.de/enwg_2005/__20.html" },
  stromnev17: { titel: "Stromnetzentgeltverordnung (StromNEV), § 17 – Ermittlung der Netzentgelte", url: "https://www.gesetze-im-internet.de/stromnev/__17.html" },
  econtrolSne: {
    titel: "E-Control – Marktkonsultation zur Systemnutzungsentgelte-Grundsatzverordnung (SNE-GV), Teil 1 (19.02.2026)",
    url: "https://www.e-control.at/documents/1785851/0/Marktkonsultation+SNE-GV+Teil+1_20260219_1v0.pdf/c37b0eeb-080d-fd5c-9c4a-86b75b5f2051?t=1771832185841",
  },
  elcom: { titel: "ElCom – Strompreis-Webseite, Tarife 2027 je Gemeinde und Netzbetreiber", url: "https://www.strompreis.elcom.admin.ch/" },
};

export const NETZENTGELTE_2027 = [
  // ---- Deutschland -------------------------------------------------------------------
  {
    id: "netzentgelt.de.struktur",
    wert: "je Netzbetreiber: Arbeitspreis (ct/kWh) und Jahresleistungspreis (€/kW); ohne Leistungsmessung Arbeitspreis und ggf. Grundpreis; dazu Entgelt für den Messstellenbetrieb",
    einheit: "Text",
    land: "DE",
    quelle: Q.stromnev17,
    abruf: ABRUF,
    gueltigAb: null,
    gueltigBis: null,
    status: "geprueft",
    pruefer: FRI,
    klasse: "A",
    notiz: "Struktur nach § 17 Abs. 2, 6 und 7 StromNEV. Werte stehen im Preisblatt des jeweiligen Netzbetreibers; diese Übersicht führt bewusst keine Preisblätter einzelner Netzbetreiber. Die Bundesnetzagentur ordnet die Netzentgeltsystematik neu (AgNes); Änderungen werden nachgetragen.",
  },
  {
    id: "termin.netzentgelte.de.vorlaeufig2027",
    wert: {
      art: "stichtag",
      beginn: null,
      ende: "2026-10-15",
      titel: "Netzentgelte 2027: Veröffentlichung bis 15. Oktober 2026",
      text: "Netzbetreiber veröffentlichen ihre Netzentgelte für 2027 spätestens zum **15. Oktober 2026**. Stehen sie bis dahin nicht fest, veröffentlichen sie die voraussichtliche Höhe auf Basis der Erlösobergrenze (**vorläufige Netzentgelte**).",
    },
    einheit: "Termin",
    land: "DE",
    quelle: Q.enwg20,
    abruf: ABRUF,
    gueltigAb: null,
    gueltigBis: "2026-10-15",
    status: "geprueft",
    pruefer: FRI,
    klasse: "A",
    notiz: "§ 20 Abs. 1 Satz 1 und 2 EnWG.",
  },
  {
    id: "termin.netzentgelte.de.endgueltig2027",
    wert: {
      art: "erwartet",
      beginn: null,
      ende: "2026-12-31",
      titel: "Netzentgelte 2027: endgültige Entgelte",
      text: "Endgültige Netzentgelte veröffentlichen die Netzbetreiber **unmittelbar nach ihrer Ermittlung**; einen eigenen Stichtag dafür nennt das Gesetz nicht. Die Entgelte gelten für das Jahr 2027.",
    },
    einheit: "Termin",
    land: "DE",
    quelle: Q.enwg20,
    abruf: ABRUF,
    gueltigAb: null,
    gueltigBis: "2026-12-31",
    status: "zu_pruefen",
    pruefer: OFFEN_DE,
    klasse: "A",
    notiz: "§ 20 Abs. 1 EnWG nennt nur den 15. Oktober. Dass die endgültigen Entgelte bis zum Jahresbeginn vorliegen, ist die übliche Praxis, aber kein gesetzlicher Termin – Fachprüfung offen.",
  },

  // ---- Österreich --------------------------------------------------------------------
  {
    id: "netzentgelt.at.sne2027",
    wert: null,
    einheit: "Verordnung",
    land: "AT",
    quelle: Q.econtrolSne,
    abruf: ABRUF,
    gueltigAb: "2027-01-01",
    gueltigBis: "2027-12-31",
    status: "zu_pruefen",
    pruefer: OFFEN_AT,
    klasse: "A",
    notiz: "Veröffentlichung erwartet bis 31.12.2026. Neue Systemnutzungsentgelte nach dem ElWG ab 1. Jänner 2027 (E-Control): zuerst Grundsatzverordnung (SNE-GV), darauf die Tarifverordnung (SNE-TV). Kein Wert und kein AT-Atlas vor der Kundmachung im RIS.",
  },
  {
    id: "termin.at.sneTv2027",
    wert: {
      art: "erwartet",
      beginn: null,
      ende: "2026-12-31",
      titel: "Netzentgelte Österreich 2027: neue Tarifverordnung erwartet",
      text: "Die neuen **Systemnutzungsentgelte** nach dem ElWG sollen ab **1. Jänner 2027** gelten. Dafür erlässt die E-Control zuerst eine Grundsatzverordnung (SNE-GV) und darauf aufbauend die Tarifverordnung (SNE-TV). Ein amtlicher Kundmachungstermin ist noch nicht bekannt.",
    },
    einheit: "Termin",
    land: "AT",
    quelle: Q.econtrolSne,
    abruf: ABRUF,
    gueltigAb: null,
    gueltigBis: "2026-12-31",
    status: "zu_pruefen",
    pruefer: OFFEN_AT,
    klasse: "A",
    notiz: "Laut E-Control-Konsultation (19.02.2026) gilt die neue Entgeltstruktur ab 01.01.2027; die Bestimmungen des ElWG dazu treten mit 31.12.2026 in Kraft. Sekundärquellen nennen Erlasstermine (SNE-GV Oktober, SNE-TV Dezember 2026) – nicht amtlich bestätigt.",
  },

  // ---- Schweiz (CH-Schreibung: kein ß) -----------------------------------------------
  {
    id: "netzentgelt.ch.elcomTarife2027",
    wert: "Tarife je Gemeinde und Netzbetreiber, amtlich bei der ElCom abrufbar",
    einheit: "Text",
    land: "CH",
    quelle: Q.elcom,
    abruf: ABRUF,
    gueltigAb: "2027-01-01",
    gueltigBis: "2027-12-31",
    status: "zu_pruefen",
    pruefer: OFFEN_CH,
    klasse: "A",
    notiz: "Nur Verweis auf die amtliche Quelle; das Register übernimmt keine Tarifwerte (Werte zu prüfen, Lizenz der Open-Data-Abfrage vor Nutzung am Original prüfen). Grundversorgungstarife, keine Marktpreise.",
  },
];

export default NETZENTGELTE_2027;
