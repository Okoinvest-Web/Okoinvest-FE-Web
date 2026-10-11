// src/lib/fakten/daten/gewerbestrom-at.js
//
// Gewerbestrom Österreich – Vorbereitung SNE-VO 2027 (Welle 4, Paket ATSNE, Masterplan B5 Schritt 3).
// Vertrag: ../schema.js. Eingebunden in ../index.js; NUR über src/lib/fakten/index.js importieren
// (Ausnahme: Tests in diesem Ordner). Genutzt von src/lib/rechner/gewerbestromAt.js.
//
// Inhalt – NUR Struktur und belegte Sätze, keine Schätzungen (Masterplan Abschnitt 9: kein AT-Atlas,
// keine Entgeltwerte vor der Kundmachung der neuen Systemnutzungsentgelte 2027 im RIS):
//   Struktur    Bestandteile des Systemnutzungsentgelts nach der geltenden SNE-V 2018 und Netzebenen
//               nach § 63 ElWOG 2010 – am RIS geprüft (11.10.2026)
//   Abgabe      Elektrizitätsabgabe, Regelsatz § 4 Abs. 2 ElAbgG – am RIS geprüft (11.10.2026).
//               Befristete Sondersätze (Übergangsrecht) bewusst NICHT als Wert erfasst, siehe notiz.
//   EAG         Erneuerbaren-Förderbeitrag § 75 EAG: Mechanik am RIS geprüft; der Satz des jeweiligen
//               Kalenderjahrs kommt aus einer jährlichen Verordnung – Wert offen (null), bis die
//               geltende Verordnung am RIS nachgeprüft ist.
//   Termin/Zeitplan der neuen Entgelte 2027: steht in netzentgelte-2027.js (Paket FRI,
//               ids netzentgelt.at.sne2027 und termin.at.sneTv2027) – hier nicht doppelt.
//
// Nachtrag der Werte nach Kundmachung im RIS: Anleitung scripts/at-sne-nachtrag.md.

const ABRUF = "2026-10-11";
const ATSNE = "Paket ATSNE (Wortlaut am Original RIS 11.10.2026) · Zweitprüfung TODO-E6";
const OFFEN = "TODO-E6 · Fachprüfung Team Österreich";

const Q = {
  sneV2018: {
    titel: "RIS – Systemnutzungsentgelte-Verordnung 2018 (SNE-V 2018), geltende Fassung",
    url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20010107",
  },
  elwog63: {
    titel: "RIS – Elektrizitätswirtschafts- und -organisationsgesetz 2010 (ElWOG 2010), § 63 Netzebenen",
    url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20007045",
  },
  elabgg: {
    titel: "RIS – Elektrizitätsabgabegesetz (ElAbgG), § 4 Abgabensätze, geltende Fassung",
    url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10005027",
  },
  eag75: {
    titel: "RIS – Erneuerbaren-Ausbau-Gesetz (EAG), § 75 Erneuerbaren-Förderbeitrag, geltende Fassung",
    url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20011619",
  },
};

export const GEWERBESTROM_AT = [
  // ---- Struktur der Systemnutzungsentgelte (geltendes Recht, SNE-V 2018) ----------------
  {
    id: "netzentgelt.at.bestandteile",
    wert: [
      { id: "netznutzung", titel: "Netznutzungsentgelt", text: "Arbeitspreis (ct/kWh) und – ab gemessener Leistung – Leistungspreis (€/kW), je Netzbereich und Netzebene", par: "§ 5 SNE-V 2018" },
      { id: "netzverlust", titel: "Netzverlustentgelt", text: "Entgelt für die Beschaffung der Netzverluste, arbeitsbezogen", par: "§ 6 SNE-V 2018" },
      { id: "netzbereitstellung", titel: "Netzbereitstellungsentgelt", text: "einmalig leistungsbezogen beim Netzzutritt bzw. bei Überschreitung des vereinbarten Ausmaßes", par: "§ 7 SNE-V 2018" },
      { id: "systemdienstleistung", titel: "Systemdienstleistungsentgelt", text: "für Erzeuger ab bestimmter Anschlussleistung (Sekundärregelung)", par: "§ 9 SNE-V 2018" },
      { id: "messleistung", titel: "Entgelt für Messleistungen", text: "Höchstpreise je Zählertyp und Ablesung", par: "§ 10 SNE-V 2018" },
    ],
    einheit: "Tabelle",
    land: "AT",
    quelle: Q.sneV2018,
    abruf: ABRUF,
    gueltigAb: null,
    gueltigBis: "2026-12-31",
    status: "geprueft",
    pruefer: ATSNE,
    klasse: "A",
    notiz:
      "Struktur nach der geltenden SNE-V 2018 (Entgeltbestandteile nach § 51 Abs. 2 ElWOG 2010). Die Entgelte sind je Netzbereich (Bundesland-Netzbereiche) und Netzebene festgelegt. Ab 01.01.2027 gelten neue Systemnutzungsentgelte nach dem ElWG (SNE-GV/SNE-TV der E-Control); Werte erst nach Kundmachung im RIS – Nachtrag: scripts/at-sne-nachtrag.md.",
  },
  {
    id: "netzentgelt.at.netzebenen",
    wert: [
      { id: "ne1", nr: 1, titel: "Höchstspannung (380/220 kV)" },
      { id: "ne2", nr: 2, titel: "Umspannung Höchst- auf Hochspannung" },
      { id: "ne3", nr: 3, titel: "Hochspannung (110 kV)" },
      { id: "ne4", nr: 4, titel: "Umspannung Hoch- auf Mittelspannung" },
      { id: "ne5", nr: 5, titel: "Mittelspannung" },
      { id: "ne6", nr: 6, titel: "Umspannung Mittel- auf Niederspannung" },
      { id: "ne7", nr: 7, titel: "Niederspannung (0,4 kV)" },
    ],
    einheit: "Tabelle",
    land: "AT",
    quelle: Q.elwog63,
    abruf: ABRUF,
    gueltigAb: null,
    gueltigBis: null,
    status: "geprueft",
    pruefer: ATSNE,
    klasse: "A",
    notiz: "Netzebenen 1–7 nach § 63 ElWOG 2010; die SNE-V 2018 legt die Entgelte je Netzebene fest. Gewerbebetriebe sind meist an den Ebenen 3–7 angeschlossen.",
  },

  // ---- Elektrizitätsabgabe --------------------------------------------------------------
  {
    id: "abgabe.at.elektrizitaet",
    wert: 1.5,
    einheit: "ct/kWh",
    land: "AT",
    quelle: Q.elabgg,
    abruf: ABRUF,
    gueltigAb: null,
    gueltigBis: null,
    status: "geprueft",
    pruefer: ATSNE,
    klasse: "A",
    notiz:
      "Regelsatz § 4 Abs. 2 ElAbgG: „Die Abgabe beträgt 0,015 Euro je kWh.“ Daneben bestehen befristete Sondersätze in den Übergangsbestimmungen (zuletzt u. a. 0,0082 €/kWh für Nicht-Haushalte); deren genauer Zeitraum ist vor jeder Verwendung am RIS zu prüfen – deshalb hier bewusst nur der unbefristete Regelsatz. Bahnstrom-Sondersatz § 4 Abs. 3 nicht erfasst (für Gewerbestrom ohne Belang).",
  },

  // ---- EAG-Förderbeitrag (Erneuerbaren-Förderbeitrag) ------------------------------------
  {
    id: "abgabe.at.eagFoerderbeitrag",
    wert: null,
    einheit: "Anteil",
    land: "AT",
    quelle: Q.eag75,
    abruf: ABRUF,
    gueltigAb: null,
    gueltigBis: null,
    status: "zu_pruefen",
    pruefer: OFFEN,
    klasse: "A",
    notiz:
      "Mechanik am RIS geprüft (§ 75 EAG): Der Erneuerbaren-Förderbeitrag ist von allen an das öffentliche Netz angeschlossenen Endverbrauchern zu leisten, bemisst sich „im Verhältnis zu den jeweilig zu entrichtenden Netznutzungs- und Netzverlustentgelten“ und wird jährlich im Vorhinein durch Verordnung festgelegt (§ 75 Abs. 1 und 2 EAG). Der Satz des jeweiligen Kalenderjahrs (Prozentsatz) steht in der jährlichen Verordnung – Wert offen, bis die geltende Verordnung am RIS nachgeprüft ist (scripts/at-sne-nachtrag.md, Schritt 4). Kein Wert wird angezeigt oder verrechnet, solange status ≠ geprueft.",
  },
];

const MODUL = { name: "gewerbestrom-at", land: "AT", fakten: GEWERBESTROM_AT };

export default MODUL;
