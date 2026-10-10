// src/lib/fakten/daten/eg-at.js
//
// Fakten ÖSTERREICH für die EG-Software (Welle 3, Paket B7: Preisblatt, Wechsel-Check, White-Label).
// Nur Rechts- und Prozessaussagen, die die Website heute schon trifft (Ratgeber „Energy Sharing“,
// docs/EG-MARKT.md 1.5, docs/EG-FACHKONZEPT.md 2.4–2.6) – hier mit Quelle, Stand und Prüfstatus,
// damit Wechsel-Check und Seiten denselben Wortlaut zeigen. Keine Preise: Das Preisblatt hat noch
// keine freigegebenen Beträge (src/lib/eg-angebot/preisblatt.js).
// Vertrag: ../schema.js. NUR über src/lib/fakten/index.js importieren.

const ABRUF = "2026-10-01"; // Stand der Recherche in docs/EG-MARKT.md („heute“ = Inkrafttreten ElWG)
const OFFEN = "TODO-E6 · Fachprüfung Team Österreich";

const Q = {
  elwgFaq: { titel: "Koordinationsstelle für Energiegemeinschaften – FAQs zum ElWG", url: "https://energiegemeinschaften.gv.at/faqs-zum-elwg/" },
  edaHandbuch: { titel: "EDA – Handbuch Energiegemeinschaften (HA II, Abschnitte 5.6, 8 und 9)", url: null, art: "sekundaer" },
};

const FAKTEN = [
  {
    id: "recht.elwg.gemeinschaftenAb",
    wert: "Die neuen Regeln des ElWG für die gemeinsame Energienutzung (§§ 65 bis 72) gelten seit 1. Oktober 2026. Bestehende Gemeinschaften werden überführt und müssen nicht neu gegründet werden; ihre Verträge sollen an die neuen Regeln angepasst werden.",
    einheit: "Text",
    land: "AT",
    quelle: Q.elwgFaq,
    abruf: ABRUF,
    gueltigAb: "2026-10-01",
    gueltigBis: null,
    status: "zu_pruefen",
    pruefer: OFFEN,
    klasse: "A",
    notiz: "Wortlaut wie Ratgeber energy-sharing-energiegemeinschaften und docs/EG-MARKT.md 1.5. Paragrafen am RIS-Original nachprüfen.",
  },
  {
    id: "recht.elwg.netzbetreiberEinschraenkung",
    wert: "Seit 5. Oktober 2026 lassen sich die neuen Modelle zunächst nur mit Zählpunkten desselben Netzbetreibers umsetzen; netzbetreiberübergreifend bzw. österreichweit voraussichtlich ab April 2027.",
    einheit: "Text",
    land: "AT",
    quelle: Q.elwgFaq,
    abruf: ABRUF,
    gueltigAb: "2026-10-05",
    // Spätestens dann neu prüfen: Danach zeigt die Website den Satz nur noch als „Stand abgelaufen, wird geprüft“.
    gueltigBis: "2027-04-30",
    status: "zu_pruefen",
    pruefer: OFFEN,
    klasse: "A",
    notiz: "Masterplan H3/B7: „Netzbetreiber-Einschränkung bis ca. April 2027“. Termin laut Koordinationsstelle „voraussichtlich“ – kein amtlich festes Datum. Gilt für alle Anbieter, nicht nur für ÖkoInvest.",
  },
  {
    id: "prozess.eda.anbieterwechselOhneNeuanmeldung",
    wert: "Die Marktpartner-ID gehört der Gemeinschaft. Wechselt nur der Software- oder Betriebsdienstleister, bleiben die Zählpunkte angemeldet und die Zustimmungen der Mitglieder bestehen; der neue Dienstleister erhält einen Zugang bzw. eine Bevollmächtigung, der bisherige wird ausgetragen.",
    einheit: "Text",
    land: "AT",
    quelle: Q.edaHandbuch,
    abruf: ABRUF,
    gueltigAb: null,
    gueltigBis: null,
    status: "zu_pruefen",
    pruefer: OFFEN,
    klasse: "A",
    notiz: "docs/EG-FACHKONZEPT.md 2.6 Schritt 2; gleiche Aussage auf /energiegemeinschaften/software (Abschnitt Wechsel, FAQ). Fundstelle im EDA-Handbuch mit Seitenzahl nachtragen.",
  },
  {
    id: "prozess.eda.modellwechselNeuanmeldung",
    wert: "Ein Wechsel des Verteilmodells oder zwischen lokal und regional bedeutet einen neuen Vertrag mit dem Netzbetreiber, eine neue Gemeinschafts-ID sowie die Ab- und Neuanmeldung aller Zählpunkte – unabhängig vom Software-Anbieter.",
    einheit: "Text",
    land: "AT",
    quelle: Q.edaHandbuch,
    abruf: ABRUF,
    gueltigAb: null,
    gueltigBis: null,
    status: "zu_pruefen",
    pruefer: OFFEN,
    klasse: "A",
    notiz: "docs/EG-FACHKONZEPT.md 2.5 (Änderungen beim Netzbetreiber) und 2.7 (Umwandlung). Ab 04.10.2027 soll ein Wechsel des Nahebereichs ohne Neuanmeldung möglich werden (Fachkonzept, Stufe 3) – dann neue Version mit gueltigAb anlegen.",
  },
];

const MODUL = {
  name: "eg-at",
  land: "AT",
  fakten: FAKTEN,
  quellen: {
    "eg-software": [{ titel: Q.elwgFaq.titel, url: Q.elwgFaq.url }],
  },
};

export default MODUL;
