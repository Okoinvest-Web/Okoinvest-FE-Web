// src/lib/fakten/daten/at.js
//
// Fakten ÖSTERREICH – Welle 2, Paket B1. Nur Werte, für die markt.js oder die Ratgeber
// heute schon eine Quelle nennen. Fehlende Werte (z. B. Pacht-Mittelwert, Kosten in AT,
// Förderdauer der EAG-Marktprämie) sind bewusst NICHT angelegt: marktFuer("AT") meldet
// sie als Lücke, die Länder-Sperre bleibt aktiv, bis die Rechenwerte status "geprueft"
// haben. Vertrag: ../schema.js. NUR über src/lib/fakten/index.js importieren.

const RECHERCHE = "2026-09-01";
const PAKET_E = "2026-10-03";
const OFFEN = "TODO-E6 · Fachprüfung Team Österreich";

const Q = {
  pvgis: { titel: "EU JRC – PVGIS 5.3 (API PVcalc, SARAH3, 14 % Systemverluste, optimaler Winkel)", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" },
  lkStmk: {
    titel: "Landwirtschaftskammer Steiermark – Photovoltaik auf Freiflächen: Nicht alles ist Gold, was glänzt (17.05.2022)",
    url: "https://stmk.lko.at/photovoltaik-auf-freifl%C3%A4chen-nicht-alles-ist-gold-was-gl%C3%A4nzt+2400+3668154",
  },
  eag: { titel: "RIS – Erneuerbaren-Ausbau-Gesetz (EAG), geltende Fassung", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20011619" },
};

const FAKTEN = [
  {
    id: "region.at.ertrag",
    wert: 1120,
    einheit: "kWh/kWp·a",
    land: "AT",
    quelle: Q.pvgis,
    abruf: PAKET_E,
    gueltigAb: null,
    gueltigBis: null,
    status: "geprueft",
    pruefer: "Paket E (Welle 1, Prüfung am Original) · Zweitprüfung TODO-E6",
    klasse: "B",
    notiz: "Flach- und Hügelland; PVGIS-Mittel ~1.199 kWh/kWp, Rechenwert bewusst darunter (eigener Abschlag wie DE).",
  },
  {
    id: "pacht.freiflaecheProHa",
    wert: { min: 3000, max: 5000 },
    einheit: "€/ha·a",
    land: "AT",
    quelle: Q.lkStmk,
    abruf: RECHERCHE,
    gueltigAb: null,
    gueltigBis: null,
    status: "zu_pruefen",
    pruefer: OFFEN,
    klasse: "B",
    notiz: "Von Energieversorgern ANGEBOTENE Pachten (Stand 2022, historisch), keine abgeschlossenen Verträge; kein Mittelwert belegt. Für Rechnungen nicht freigegeben.",
  },
  {
    id: "recht.eag.abschlagLandwirtschaft",
    wert: 0.25,
    einheit: "Anteil",
    land: "AT",
    quelle: Q.eag,
    abruf: RECHERCHE,
    gueltigAb: null,
    gueltigBis: null,
    status: "zu_pruefen",
    pruefer: OFFEN,
    klasse: "A",
    notiz: "§ 33 EAG: Abschlag auf den Zuschlagswert der Marktprämie für PV auf landwirtschaftlich genutzten Flächen oder im Grünland; entfällt u. a. für Agri-PV mit erhaltener Hauptnutzung (Stand 09/2026 laut markt.js). Paragraf am RIS-Original nachprüfen.",
  },
  {
    id: "recht.eag.marktpraemie",
    wert: "Gleitende Marktprämie nach dem EAG; die Höhe wird bei Photovoltaik in der Regel über Ausschreibungen bestimmt.",
    einheit: "Text",
    land: "AT",
    quelle: Q.eag,
    abruf: RECHERCHE,
    gueltigAb: null,
    gueltigBis: null,
    status: "zu_pruefen",
    pruefer: OFFEN,
    klasse: "A",
    notiz: "Wortlaut wie src/data/lexikon.js. Förderdauer, Regel bei negativen Preisen und Höchstwerte noch nicht im Register – nicht erfinden, am RIS-Original erheben.",
  },
  {
    id: "recht.eag.investitionszuschuss",
    wert: "Investitionszuschuss für Photovoltaik nach dem EAG über Fördercalls (Abschlag auf landwirtschaftlichen Flächen wie bei der Marktprämie).",
    einheit: "Text",
    land: "AT",
    quelle: Q.eag,
    abruf: RECHERCHE,
    gueltigAb: null,
    gueltigBis: null,
    status: "zu_pruefen",
    pruefer: OFFEN,
    klasse: "A",
    notiz: "Wie Regionalseiten (z. B. oberoesterreich.js). Fördercall-Termine gehören in die Termin-Daten (FRI).",
  },
];

const MODUL = {
  name: "at",
  land: "AT",
  fakten: FAKTEN,
  quellen: {
    allgemein: [
      { titel: "EU JRC – PVGIS Photovoltaic Geographical Information System", url: Q.pvgis.url },
      { titel: "RIS – Erneuerbaren-Ausbau-Gesetz (EAG)", url: Q.eag.url },
      { titel: "Landwirtschaftskammer Steiermark – Photovoltaik auf Freiflächen", url: Q.lkStmk.url },
    ],
  },
};

export default MODUL;
