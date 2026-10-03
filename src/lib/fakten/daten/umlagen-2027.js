// src/lib/fakten/daten/umlagen-2027.js
//
// Umlagen 2027 Deutschland (Welle 2, Paket FRI) – nur Registerdaten, keine Pressearbeit.
// Vertrag: ../schema.js. Eingebunden über umlagen-de.js → ../index.js; NUR über
// src/lib/fakten/index.js importieren (Ausnahme: Tests in diesem Ordner).
//
// Stand 03.10.2026: Die Übertragungsnetzbetreiber haben die Werte 2027 noch NICHT veröffentlicht
// (Pflicht nach § 11 EnFG bzw. Tz. 7 der Festlegung BK8-24-001-A: bis zum 25. Oktober).
// Deshalb: wert null, status "zu_pruefen", notiz „Veröffentlichung erwartet bis 25.10.2026“.
// KEINE Schätzwerte. Sobald veröffentlicht: wert (ct/kWh) + Quelle der Jahresseite auf
// netztransparenz.de eintragen; status "geprueft" nur mit benanntem Prüfer, sonst bleibt TODO-E6.
// Die Werte 2026 sind hier bewusst nicht angelegt (gehören zu B5/Rechnungs-Check, eigene Prüfung).

const ABRUF = "2026-10-03";
const OFFEN = "TODO-E6 · Werte nach Veröffentlichung am Original eintragen und prüfen";
const FRI = "Paket FRI (Wortlaut am Original 03.10.2026) · Zweitprüfung TODO-E6";
export const VEROEFFENTLICHUNG_BIS = "2026-10-25";
const HINWEIS = "Veröffentlichung erwartet bis 25.10.2026";

const Q = {
  enfg11: { titel: "Energiefinanzierungsgesetz (EnFG), § 11 Veröffentlichung von Umlagen", url: "https://www.gesetze-im-internet.de/enfg/__11.html" },
  kwkg: { titel: "netztransparenz.de – KWKG-Umlage (Übertragungsnetzbetreiber)", url: "https://www.netztransparenz.de/de-de/Erneuerbare-Energien-und-Umlagen/KWKG/KWKG-Umlage" },
  offshore: {
    titel: "netztransparenz.de – Offshore-Netzumlagen-Übersicht (Übertragungsnetzbetreiber)",
    url: "https://www.netztransparenz.de/de-de/Erneuerbare-Energien-und-Umlagen/Sonstige-Umlagen/Offshore-Netzumlage/Offshore-Netzumlagen-%C3%9Cbersicht",
  },
  aufschlag: {
    titel: "netztransparenz.de – Aufschlag für besondere Netznutzung (bis 2024: § 19 StromNEV-Umlage)",
    url: "https://www.netztransparenz.de/de-de/Erneuerbare-Energien-und-Umlagen/Sonstige-Umlagen/Aufschlag-f%C3%BCr-besondere-Netznutzung-19-StromNEV-Umlage",
  },
};

/** Umlage 2027 als offener Wert (bis zur Veröffentlichung) */
function umlage2027(id, quelle, notiz) {
  return {
    id,
    wert: null,
    einheit: "ct/kWh",
    land: "DE",
    quelle,
    abruf: ABRUF,
    gueltigAb: "2027-01-01",
    gueltigBis: "2027-12-31",
    status: "zu_pruefen",
    pruefer: OFFEN,
    klasse: "A",
    notiz: `${HINWEIS}. ${notiz}`,
  };
}

export const UMLAGEN_2027 = [
  umlage2027("umlage.kwkg", Q.kwkg, "KWKG-Umlage nach §§ 10, 11 EnFG; bundesweit einheitlich, netto je kWh Letztverbrauch."),
  umlage2027("umlage.offshoreNetz", Q.offshore, "Offshore-Netzumlage nach § 17f EnWG in Verbindung mit dem EnFG; bundesweit einheitlich."),
  umlage2027(
    "umlage.besondereNetznutzung",
    Q.aufschlag,
    "Grundlage: Festlegung BK8-24-001-A der Bundesnetzagentur (Tz. 7). Der Aufschlag ist nach Verbrauch je Abnahmestelle gestaffelt (erste GWh und darüber); die Staffel 2027 wird mit den Werten übernommen."
  ),
  {
    id: "termin.umlagen.veroeffentlichung2027",
    wert: {
      art: "stichtag",
      beginn: null,
      ende: VEROEFFENTLICHUNG_BIS,
      titel: "Umlagen 2027: Veröffentlichung bis 25. Oktober 2026",
      text: "Die Übertragungsnetzbetreiber veröffentlichen die Umlagen für 2027 (**KWKG-Umlage**, **Offshore-Netzumlage** und **Aufschlag für besondere Netznutzung**) bis zum **25. Oktober 2026** auf netztransparenz.de.",
    },
    einheit: "Termin",
    land: "DE",
    quelle: Q.enfg11,
    abruf: ABRUF,
    gueltigAb: null,
    gueltigBis: VEROEFFENTLICHUNG_BIS,
    status: "geprueft",
    pruefer: FRI,
    klasse: "A",
    notiz: "§ 11 EnFG: Veröffentlichung „bis zum 25. Oktober eines Kalenderjahres“ für das folgende Kalenderjahr. Für den Aufschlag für besondere Netznutzung nennt netztransparenz.de denselben Termin (Tz. 7 BK8-24-001-A).",
  },
];

export default UMLAGEN_2027;
