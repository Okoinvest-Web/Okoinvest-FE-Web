// src/data/referenzen.js
//
// Inhalte der Seite /referenzen – ausschließlich belegte Angaben zur
// ÖKOVOLT Gruppe. KEINE Kundenprojekte, Zitate, Logos oder Kennzahlen, die
// sich nicht belegen lassen.
//
// QUELLEN:
//   [U]  Unternehmensangaben der ÖKOVOLT Gruppe – Ökovolt-DE-Website,
//        src/data/unternehmen.js (Stand 27.09.2026): Meilensteine, Rollen,
//        Betreibergesellschaften, Rammtechnik, 30 MWp AT 2021.
//        „TOP 3 IPC“ entfernt (Paket D, 03.10.2026): nur Eigenangabe, kein Drittbeleg.
//   [HR] Handelsregister Amtsgericht Memmingen (öffentlich abrufbar):
//        Artern Solarstrom GmbH & Co. KG HRA 12215 (eingetragen 05.03.2012),
//        Tilleda Solarstrom GmbH & Co. KG HRA 12240,
//        Irsingen Solarstrom GmbH & Co. KG HRA 12450.
//   [MaStR] Marktstammdatenregister der Bundesnetzagentur, ausgewertet von
//        Global Energy Monitor (gem.wiki/Tilleda_Solarstrom_solar_farm,
//        abgerufen 29.09.2026): Tilleda rund 3 MWp, Inbetriebnahme 2012,
//        Kelbra (Sachsen-Anhalt).
//
// BEWUSST WEGGELASSEN (nicht belastbar belegt): Leistung und Inbetriebnahme
// der Parks Artern und Irsingen. Eine Fundstelle nennt für Irsingen einen
// Park mit Inbetriebnahme 2010 und anderem Errichter – das passt nicht zur
// Betreibergesellschaft von 2013 und wird daher NICHT verwendet.
// Vor Ergänzung: Einheit im Marktstammdatenregister (MaStR-Nr.) nachschlagen.

export const REFERENZEN_STAND = "29.09.2026";

/** Quellenverzeichnis, das auf der Seite ausgewiesen wird. */
export const QUELLEN_REFERENZEN = [
  {
    id: "U",
    titel: "Unternehmensangaben der ÖKOVOLT Gruppe",
    text: "Firmengeschichte, Rollen der Gesellschaften, Errichtungsleistung in Österreich",
    url: "https://www.oekovolt.de",
  },
  {
    id: "HR",
    titel: "Handelsregister, Amtsgericht Memmingen",
    text: "Betreibergesellschaften der Solarparks (HRA 12215, HRA 12240, HRA 12450)",
    url: "https://www.handelsregister.de",
  },
  {
    id: "MaStR",
    titel: "Marktstammdatenregister der Bundesnetzagentur (ausgewertet von Global Energy Monitor)",
    text: "Leistung und Inbetriebnahmejahr des Solarparks Tilleda",
    url: "https://www.gem.wiki/Tilleda_Solarstrom_solar_farm",
  },
];

/**
 * Bestandsparks – je Park eine eigene Betreibergesellschaft.
 * `eckdaten` nur mit Quelle; fehlt ein Beleg, bleibt das Feld weg.
 * `karte`: Koordinaten im viewBox der DACH-Karte (siehe Referenzen/DachKarte).
 */
export const PARKS = [
  {
    id: "irsingen",
    name: "Solarpark Irsingen",
    ort: "Irsingen, Ortsteil von Türkheim",
    region: "Bayern",
    gesellschaft: "Irsingen Solarstrom GmbH & Co. KG",
    register: "HRA 12450, Amtsgericht Memmingen",
    seit: "Betreibergesellschaft seit 2013",
    text: "Der Solarpark direkt am Firmensitz der Muttergesellschaft – Strom, erzeugt dort, wo die Gruppe arbeitet.",
    eckdaten: [],
    quellen: ["U", "HR"],
  },
  {
    id: "artern",
    name: "Solarpark Artern",
    ort: "Artern",
    region: "Thüringen",
    gesellschaft: "Artern Solarstrom GmbH & Co. KG",
    register: "HRA 12215, Amtsgericht Memmingen",
    seit: "Betreibergesellschaft seit 2012",
    text: "Einer der ersten Parks, mit denen die Gründer 2012 den Schritt vom Dach auf die Freifläche gemacht haben.",
    eckdaten: [],
    quellen: ["U", "HR"],
  },
  {
    id: "tilleda",
    name: "Solarpark Tilleda",
    ort: "Tilleda, Stadt Kelbra (Kyffhäuser)",
    region: "Sachsen-Anhalt",
    gesellschaft: "Tilleda Solarstrom GmbH & Co. KG",
    register: "HRA 12240, Amtsgericht Memmingen",
    seit: "Betreibergesellschaft seit Mai 2012",
    text: "Gegenstand laut Register: Betrieb von Solarkraftwerken.",
    eckdaten: [
      { label: "Leistung", wert: "rund 3 MWp", quelle: "MaStR" },
      { label: "Inbetriebnahme", wert: "2012", quelle: "MaStR" },
    ],
    quellen: ["U", "HR", "MaStR"],
  },
];

/** Standorte für die Karte (Koordinaten im viewBox 600 × 767). */
export const STANDORTE = [
  { nr: 1, art: "sitz", name: "Türkheim (DE)", text: "Muttergesellschaft ÖKOVOLT GmbH Solartechnik – und Solarpark Irsingen", x: 256.3, y: 570.5 },
  { nr: 2, art: "sitz", name: "Ostermiething (AT)", text: "ÖkoInvest GmbH und ÖKOVOLT Solartechnik GmbH", x: 367.4, y: 571.8 },
  { nr: 3, art: "park", name: "Artern (DE)", text: "Solarpark, Thüringen", x: 289.5, y: 306.6 },
  { nr: 4, art: "park", name: "Tilleda (DE)", text: "Solarpark, Sachsen-Anhalt", x: 282.3, y: 302 },
];

/** Chronologie – nur Stationen, die den eigenen Betrieb belegen. */
export const BETRIEB_CHRONIK = [
  { jahr: "2010", titel: "Gründung mit eigener Montage", text: "ÖKOVOLT GmbH in Türkheim und ÖKOVOLT Montage GmbH – Planung, Bau und Inbetriebnahme von Beginn an aus einer Hand." },
  { jahr: "2012", titel: "Erste eigene Solarparks", text: "Die Gründer bauen Solarparks und betreiben sie selbst – je Park eine Betreibergesellschaft, u. a. in Artern und Tilleda. Dazu entsteht die Deutsche Solar & Rammtechnik GmbH." },
  { jahr: "2013", titel: "Solarpark vor der Haustür", text: "Mit der Irsingen Solarstrom GmbH & Co. KG entsteht ein Park in Irsingen, einem Ortsteil von Türkheim." },
  { jahr: "2021", titel: "Parks gebündelt", text: "Die Solarparks werden in der AWSM Beteiligung GmbH gebündelt, der Beteiligungsgesellschaft der Gründer. Die ÖKOVOLT Solarstrom Betriebs GmbH führt als Komplementärin die Park-KGs." },
  { jahr: "Heute", titel: "Über ein Jahrzehnt Betriebserfahrung", text: "Ertrag, Wartung, Wechselrichtertausch, Netzbetreiber, Direktvermarktung – diese Erfahrung fließt in jedes neue Projekt." },
];

/** Kompetenzen der Gruppe – jeweils mit zuständiger Gesellschaft. */
export const KOMPETENZEN = [
  {
    icon: "PencilRuler",
    titel: "Planung",
    gesellschaft: "ÖKOVOLT GmbH Solartechnik · ÖkoInvest GmbH",
    text: "Planung und Consulting für PV-Anlagen gehören zum Unternehmensgegenstand der Muttergesellschaft. ÖkoInvest entwickelt Freiflächen- und Agri-PV bis zur Baureife – rund 50 MWp gehen pro Jahr neu in die Entwicklung.",
  },
  {
    icon: "HardHat",
    titel: "Bau",
    gesellschaft: "ÖKOVOLT GmbH Solartechnik · ÖKOVOLT Montage GmbH",
    text: "Planung, Bau und Inbetriebnahme für Gewerbe, Industrie, Kommunen und Landwirtschaft – seit 2010 mit eigenen Montageteams, bei Bedarf ergänzt durch Partnerbetriebe.",
  },
  {
    icon: "Hammer",
    titel: "Rammtechnik",
    gesellschaft: "Deutsche Solar & Rammtechnik GmbH",
    text: "Seit 2012 eigene Rammtechnik für die Fundamente von Freiflächenanlagen – ohne Abhängigkeit von Dritten bei der Gründung der Unterkonstruktion.",
  },
  {
    icon: "Gauge",
    titel: "Betrieb",
    gesellschaft: "ÖKOVOLT Solarstrom Betriebs GmbH",
    text: "Eigene Solarparks seit 2012, je Park eine Betreibergesellschaft. So lassen sich Finanzierung, Haftung und Betrieb sauber trennen – dieselbe Struktur, die Käufer von Projektgesellschaften kennen.",
  },
  {
    icon: "Zap",
    titel: "Direktvermarktung über Partner",
    gesellschaft: "Erfahrung aus dem Parkbetrieb",
    text: "Die Vermarktung des Stroms läuft über spezialisierte Direktvermarkter. Die Gruppe kennt die Anforderungen aus Betreibersicht – Verträge, Fernsteuerbarkeit, Abrechnung.",
  },
  {
    icon: "Globe2",
    titel: "Errichtung in Österreich",
    gesellschaft: "ÖKOVOLT Solartechnik GmbH",
    text: "Die österreichische Schwester errichtete allein 2021 PV-Anlagen mit 30 MWp (Unternehmensangabe).",
  },
];
