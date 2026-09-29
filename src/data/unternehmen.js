// src/data/unternehmen.js
//
// Firmengeschichte, Gesellschafterstruktur und Registerdaten der
// ÖKOVOLT-Gruppe.
//
// QUELLEN: Die Registerangaben unter GESELLSCHAFTEN sind oeffentlich
// abfragbar (Handelsregister DE / Firmenbuch AT) und auf der Seite bewusst
// mit Registernummer ausgewiesen - wer will, kann jede Angabe nachschlagen.
// Alles Uebrige (Rollen, Beteiligungsquoten, Erzaehltext) kommt aus der
// Unternehmenskommunikation.
//
// ACHTUNG BETEILIGUNGEN: Die Salzburg AG war von 2021 bis 2025 mit 49 %
// beteiligt und ist 2025 ausgeschieden - die Gruppe ist seitdem wieder
// vollstaendig in Familienhand. Oeffentliche Register hinken solchen
// Aenderungen oft nach; vor jeder Aktualisierung hier den aktuellen
// Firmenbuch-/Handelsregisterstand pruefen.
//
// PFLEGE: `stand` dokumentiert den Redaktionsstand und wird ausgewiesen.

export const STAND = "2026-09-27";

/** Kurzprofil für den Einstieg. */
export const PROFIL = {
  kopf: "Solarpioniere aus dem Allgäu. Seit 2010.",
  titel: "Solarpioniere aus dem Allgäu",
  lead:
    "Als wir 2010 angefangen haben, war Photovoltaik noch keine Selbstverständlichkeit, sondern Überzeugungsarbeit. Große Solaranlagen galten als Wagnis, Finanzierer waren skeptisch, und Erfahrung musste man sich selbst erarbeiten. Andreas Wegscheider und Susanne Messmer haben damals eine einfache Entscheidung getroffen: Wir planen nicht nur, wir bauen selbst. Und wir betreiben, was wir bauen. Aus dieser Haltung ist über die Jahre ein Verbund eigener Gesellschaften gewachsen, gegründet und getragen von denselben zwei Menschen.",
};

/** Schlusssatz des Kapitels. */
export const CLAIM = "ÖKOVOLT. Wir bauen, was wir selbst betreiben würden.";

/**
 * Kennzahlen für den "Heute"-Abschnitt.
 *
 * PLATZHALTER: `projekte` und `team` sind bewusst null - die Zahlen lagen bei
 * der Textabnahme noch nicht vor. Die Komponente blendet null-Werte aus,
 * damit nie ein "[X]" auf der Seite landet. Sobald die Zahlen feststehen,
 * hier eintragen.
 */
export const HEUTE = [
  { wert: "über 15 Jahre", label: "Erfahrung seit 2010" },
  { wert: null, label: "realisierte Projekte" },
  { wert: null, label: "Fachleute in Türkheim" },
];

/**
 * Markenangaben - NUR ausfuellen, wenn eine Eintragung vorliegt, die fuer
 * Deutschland gilt (DPMA oder EUIPO). Eine rein oesterreichische Marke traegt
 * das ® auf oekovolt.de nicht: Das waere irrefuehrende Werbung.
 *
 * STAND: Eine Eintragung war oeffentlich nicht auffindbar (DPMAregister und
 * TMview liefern keinen Treffer). Solange `nummer` null ist, rendert die
 * Komponente weder Markensatz noch ®.
 */
export const MARKE = {
  amt: null,        // "DPMA" | "EUIPO"
  form: null,       // "Wortmarke" | "Wort-/Bildmarke"
  nummer: null,
  inhaber: null,
  jahr: null,
};

/**
 * "Betreiber aus Überzeugung" - das eigentliche Unterscheidungsmerkmal.
 */
export const HALTUNG = {
  kopf: "Betreiber aus Überzeugung",
  titel: "Wir kennen unsere Anlagen nicht nur vom Bau",
  absaetze: [
    "Was ÖKOVOLT von Anfang an unterscheidet: Die Solarparks aus diesen frühen Jahren sind bis heute in der Hand der Gründer und werden von ihnen betrieben.",
    "Deshalb wissen wir nicht nur, wie man eine Anlage baut, sondern wie sie sich über zehn, zwölf, fünfzehn Jahre verhält: Ertrag, Wartung, Wechselrichtertausch, Netzbetreiber, Direktvermarktung. Diese Erfahrung fließt in jede Anlage ein, die wir heute für unsere Kunden planen.",
  ],
};

/**
 * Der rote Faden: Türkheim ist Ursprung und Muttergesellschaft. Von hier aus
 * wurde mit deutschem Know-how die österreichische Schwester aufgebaut.
 */
export const URSPRUNG = {
  kopf: "Deutschland und Österreich",
  titel: "Eine Mutter, eine Schwester – ein Verbund",
  absaetze: [
    "Türkheim ist der Ursprung und bis heute die Muttergesellschaft. Hier sitzt die Technik, hier werden die Standards gesetzt, nach denen gebaut wird.",
    "Mit diesem deutschen Know-how wurde die österreichische Schwestergesellschaft aufgebaut – mit denselben Prozessen und derselben Qualitätslatte. Heute zählt sie zu den führenden Errichtern von PV-Anlagen für Gewerbe und Industrie in Österreich.",
    "Beide Gesellschaften arbeiten eng verzahnt: exklusiver Zentraleinkauf, gemeinsame Planungsdienstleistungen und eine gemeinsame EDV-Infrastruktur.",
  ],
  kennzahlen: [
    { wert: "2010", label: "Muttergesellschaft in Türkheim" },
    { wert: "2012", label: "Schwestergesellschaft in Österreich" },
    { wert: "Zentral", label: "Einkauf, Planung und EDV im Verbund" },
  ],
};

/** Die Menschen hinter dem Unternehmen. */
export const GENERATIONEN = [
  {
    id: "erste",
    kopf: "1. Generation",
    titel: "Die Pioniere",
    einleitung:
      "Lange bevor Photovoltaik Mainstream wurde, haben die beiden Gründer sie zu ihrem Beruf gemacht – aus Überzeugung, nicht wegen einer Förderkulisse.",
    personen: [
      {
        initialen: "AW",
        name: "Andreas Wegscheider",
        rolle: "Gründer & Geschäftsführer",
        schlagzeile: "Pionier der ersten Stunde",
        text:
          "Andreas Wegscheider gehört zu den Pionieren der Photovoltaik im DACH-Raum. Er hat Anlagen geplant und montiert, als Module noch ein Vielfaches kosteten und jede Installation Überzeugungsarbeit war. Dieses technische Fundament – und der Anspruch, jede Anlage so zu bauen, als stünde sie auf dem eigenen Dach – prägt ÖKOVOLT bis heute.",
      },
      {
        initialen: "SM",
        name: "Susanne Messmer",
        rolle: "Gründerin & Geschäftsführung",
        schlagzeile: "Pionierin der ersten Stunde",
        text:
          "Susanne Messmer steht für strategische Weitsicht und kaufmännische Stärke. Sie hat aus einem Handwerksbetrieb eine Unternehmensgruppe gemacht und die wirtschaftliche Entwicklung über alle Marktzyklen hinweg gesteuert – durch Förderstopps, Preisverfall und Boomjahre.",
      },
    ],
  },
  {
    id: "zweite",
    kopf: "2. Generation",
    titel: "Internet of Energy & Vertrieb",
    einleitung:
      "Seit 2025 führt die nächste Generation das Unternehmen weiter – mit Digitalisierung auf der einen und gewachsener Vertriebsstärke auf der anderen Seite.",
    personen: [
      {
        initialen: "AM",
        name: "Alexander Messmer",
        rolle: "2. Generation · Digitalisierung & Cyber Security",
        schlagzeile: "Seit 2025 im Verbund: Solensa GmbH",
        text:
          "Als Sohn von Susanne Messmer tritt Alexander Messmer die zweite Generation an und ergänzt die Gruppe seit 2025 mit seiner Firma Solensa GmbH. Mit Know-how in Digitalisierung, Cyber Security und Softwareentwicklung vernetzt er alle Energiesysteme unter dem Konzept des Internet of Energy – und sichert die digitale Infrastruktur der Gruppe ab.",
        kompetenzen: [
          { icon: "ShieldCheck", titel: "Cyber Security", text: "Schutz digitaler Energieinfrastruktur" },
          { icon: "Code", titel: "Software-Entwicklung", text: "Eigenentwicklungen für IoE" },
          { icon: "Network", titel: "Internet of Energy", text: "Vernetzung aller Energiesysteme" },
        ],
      },
      {
        initialen: "MT",
        name: "Manuel Thaler",
        rolle: "Vertrieb · PV GmbH",
        schlagzeile: "Seit über 10 Jahren Teil der Familie",
        text:
          "Manuel Thaler gehört seit mehr als zehn Jahren zur ÖKOVOLT-Familie und verantwortet mit der PV GmbH den Vertrieb der Gruppe. Er begleitet Kundinnen und Kunden von der ersten Frage bis zur fertigen Anlage – und kennt die Region, die Netzbetreiber und die Förderlandschaft aus tausenden Projekten.",
      },
    ],
  },
];

/**
 * Die Salzburg-AG-Partnerschaft – abgeschlossenes Kapitel (2021–2025).
 * Bewusst in der Vergangenheitsform: Die Beteiligung ist 2025 beendet worden.
 */
export const SALZBURG_AG = {
  zeitraum: "2021 – 2025",
  kopf: "Ein Kapitel Konzerngeschichte",
  titel: "Die Partnerschaft mit der Salzburg AG",
  text:
    "Die Beteiligung betraf die österreichische Schwestergesellschaft, die Ökovolt Solartechnik GmbH. Sie gehörte 2021 bereits zu den TOP 3 der IPC-Errichter Österreichs – genau deshalb kam einer der großen Landesenergieversorger auf sie zu: Die Position war der Grund für den Einstieg, nicht sein Ergebnis. Vier Jahre lang öffnete die Partnerschaft zusätzlich den Zugang zu Liegenschaften und Infrastruktur eines Landesversorgers. 2025 ist die Salzburg AG wieder ausgeschieden – die Gruppe ist seitdem vollständig in Familienhand.",
  kennzahlen: [
    { wert: "TOP 3", label: "IPC-Errichter – schon vor dem Einstieg" },
    { wert: "49 %", label: "Beteiligung von 2021 bis 2025" },
    { wert: "2025", label: "Rückkehr in vollständigen Familienbesitz" },
  ],
  punkte: [
    "Bereits vor 2021 unter den TOP 3 der IPC-Errichter (Integrierter Photovoltaik-Contractor) Österreichs",
    "Bevorzugter PV-Errichter des Salzburg AG Konzerns",
    "Zugang zu Liegenschaften und Infrastrukturprojekten eines Landesenergieversorgers",
    "Großprojekte im Bereich Freifläche, Agri-PV und gewerbliche Dachanlagen",
  ],
};

/**
 * Struktur der Unternehmensgruppe (Stand siehe STAND).
 * `ebene`: 0 = Holding, 1 = operative Landesgesellschaften, 2 = Beteiligungen.
 */
export const GRUPPE = [
  { ebene: 0, name: "ÖKOVOLT Gruppe", text: "Familiengeführte Unternehmensgruppe" },
  {
    ebene: 1,
    flagge: "DE",
    name: "ÖKOVOLT GmbH Solartechnik",
    text: "Deutsche Gesellschaft – Planung, Installation und Service",
    gesellschaft: "de",
  },
  {
    ebene: 1,
    flagge: "AT",
    name: "ÖKOVOLT Solartechnik GmbH",
    text: "Österreichische Gesellschaft – Vertrieb und Projektgeschäft AT",
    gesellschaft: "at",
  },
  {
    ebene: 2,
    name: "ÖkoInvest GmbH",
    anteil: "ÖKOVOLT Solartechnik GmbH: 22,60 %",
    text: "Projektgesellschaft für Freiflächen-PV, Agri-PV, Contracting & PPA. Geschäftsführung: Andreas Wegscheider und Manuel Thaler.",
  },
  {
    ebene: 2,
    name: "GFL – PV-Kraftwerk GmbH",
    anteil: "ÖkoInvest GmbH: 100,00 %",
    text: "Betrieb von PV-Kraftwerken",
  },
  {
    ebene: 2,
    name: "HIL PV Kraftwerk GmbH",
    anteil: "ÖkoInvest GmbH: 50,00 %",
    text: "Gemeinschaftsgesellschaft mit der Prime Energy Solutions GmbH (50 %)",
  },
  {
    ebene: 2,
    name: "PV GmbH",
    anteil: "Beteiligt an der ÖkoInvest GmbH mit 25,80 %",
    text: "Exklusiver Vertriebspartner der Gruppe – autonom agierend (Manuel Thaler)",
  },
  {
    ebene: 2,
    name: "Solensa GmbH",
    badge: "Neu seit 2025",
    text: "Digitalisierung, Cyber Security & Internet of Energy (Alexander Messmer)",
  },
];

/**
 * Registerdaten der operativen Gesellschaften – oeffentlich abfragbar.
 * DE aus dem eigenen Impressum, AT aus dem oesterreichischen Firmenbuch.
 */
export const GESELLSCHAFTEN = {
  de: {
    land: "Deutschland",
    flagge: "DE",
    name: "ÖKOVOLT GmbH Solartechnik",
    sitz: "Schlingener Straße 1a, 86842 Türkheim",
    register: "Handelsregister HRB 14166",
    gericht: "Amtsgericht Memmingen",
    eingetragen: "15. April 2010",
    ustId: "DE270816873",
    website: "https://www.oekovolt.de",
  },
  at: {
    land: "Österreich",
    flagge: "AT",
    name: "ÖKOVOLT Solartechnik GmbH",
    sitz: "Gewerbegebiet 10, 5121 Ostermiething",
    register: "Firmenbuch FN 375708m",
    gericht: "Landesgericht Ried im Innkreis",
    eingetragen: "16. Februar 2012",
    website: "https://www.oekovolt.com",
  },
};

/**
 * Projekt- und Beteiligungsgesellschaften - ebenfalls im oesterreichischen
 * Firmenbuch abfragbar. Bewusst ohne Ausschmueckung: reine Registerangaben.
 */
export const BETEILIGUNGEN = [
  {
    name: "ÖkoInvest GmbH",
    register: "FN 541505g",
    gericht: "Landesgericht Ried im Innkreis",
    sitz: "Gewerbegebiet 10, 5121 Ostermiething",
    eingetragen: "10. September 2020",
  },
  {
    name: "GFL – PV-Kraftwerk GmbH",
    register: "FN 617005k",
    gericht: "Landesgericht Ried im Innkreis",
    sitz: "Gewerbegebiet 10, 5121 Ostermiething",
    eingetragen: "2023",
  },
  {
    name: "HIL PV Kraftwerk GmbH",
    register: "FN 646495d",
    gericht: "Landesgericht Ried im Innkreis",
    sitz: "Gewerbegebiet 10, 5121 Ostermiething",
  },
];

/**
 * Chronologie – speist die Zeitleiste.
 * `text` ist ein Array: Ereignisse desselben Jahres gehoeren in EINE Station,
 * sonst steht die Jahreszahl mehrfach untereinander und wirkt wie ein Fehler.
 */
export const MEILENSTEINE = [
  {
    jahr: "2010",
    titel: "Der Anfang",
    text: [
      "Andreas Wegscheider und Susanne Messmer gründen die ÖKOVOLT GmbH in Burgau und ziehen wenige Wochen später nach Türkheim im Unterallgäu, wo ÖKOVOLT bis heute zu Hause ist.",
      "Noch im selben Jahr gründen sie mit der ÖKOVOLT Montage GmbH ihre eigene Montagegesellschaft. Von Beginn an gilt: Planung, Bau und Inbetriebnahme kommen aus einer Hand – mit eigenen Montageteams und einem festen Ansprechpartner, der das Projekt von der ersten Skizze bis zur Inbetriebnahme verantwortet.",
    ],
    icon: "Building2",
    hervorgehoben: true,
  },
  {
    jahr: "2012",
    titel: "Vom Dach aufs Feld",
    text: [
      "Die Gründer gehen den nächsten Schritt: Solarparks. Sie bauen sie nicht nur, sie betreiben sie auch selbst. Dafür gründen sie die ÖKOVOLT Solarstrom Betriebs GmbH und darunter für jeden Park eine eigene Betreibergesellschaft – darunter die Artern Solarstrom GmbH & Co. KG und die Tilleda Solarstrom GmbH & Co. KG in Mitteldeutschland.",
      "Weil die Fundamente dieser Parks spezialisierte Technik brauchen, gründen sie außerdem die Deutsche Solar & Rammtechnik GmbH. Sie wollten keine Abhängigkeit von Dritten, sondern die Kontrolle über jede Schraube im Boden.",
      "Im selben Jahr überschreitet ÖKOVOLT die Grenze: Mit der Ökovolt Solartechnik GmbH entsteht die Schwestergesellschaft für den österreichischen Markt.",
    ],
    icon: "TrendingUp",
  },
  {
    jahr: "2013",
    titel: "Vor der eigenen Haustür",
    text: [
      "Mit der Irsingen Solarstrom GmbH & Co. KG entsteht ein Solarpark direkt in Irsingen, einem Ortsteil von Türkheim. Er zeigt, dass Energiewende auch lokal funktioniert: sauberer Strom, erzeugt dort, wo wir leben und arbeiten.",
    ],
    icon: "Home",
  },
  {
    jahr: "2021",
    titel: "Neu aufgestellt für die nächste Welle",
    text: [
      "Die Gründer ordnen ihre Unternehmen neu. Die Solarparks werden in der AWSM Beteiligung GmbH gebündelt, der Beteiligungsgesellschaft von Andreas Wegscheider und Susanne Messmer. Die ÖKOVOLT GmbH Solartechnik konzentriert sich seitdem ganz auf Planung, Bau und Inbetriebnahme von PV-Anlagen für Gewerbe, Industrie, Kommunen und Landwirtschaft.",
      "Wie stark ÖKOVOLT inzwischen gewachsen ist, zeigt ein Jahr: Allein 2021 errichtet die österreichische Schwestergesellschaft Ökovolt Solartechnik GmbH PV-Anlagen mit 30 MWp Leistung und gehört damit zu den führenden Errichtern von PV-Anlagen für Gewerbe und Industrie in Österreich.",
      "Im selben Jahr beteiligt sich die Salzburg AG, einer der großen österreichischen Landesenergieversorger, mit 49 Prozent am Unternehmen.",
    ],
    icon: "Network",
    hervorgehoben: true,
  },
  {
    // Bewusst ohne Laenderbezug: Der Schweizer Franchisepartner ist seit dem
    // 30.04.2026 in Konkurs. Eine Erfolgsstation daraus zu machen, faellt bei
    // der ersten Handelsregister-Abfrage auf. Die Aussage selbst bleibt wahr.
    jahr: "2022",
    titel: "Aus einem Konzept wird ein Franchisesystem",
    text: [
      "ÖKOVOLT öffnet sein Konzept erstmals für Partner und startet ein eigenes Franchisesystem. Unternehmer, die Photovoltaik mit demselben Anspruch umsetzen wollen, arbeiten seitdem unter dem Namen ÖKOVOLT – mit unserem Know-how aus Planung, Bau und über einem Jahrzehnt Anlagenbetrieb.",
    ],
    icon: "Handshake",
  },
  {
    jahr: "Heute",
    titel: "Die Photovoltaik ist erwachsen geworden – wir waren von Anfang an dabei",
    text: [
      "Über 15 Jahre Erfahrung und ein Team von Fachleuten in Türkheim. Dahinter stehen bis heute dieselben Gründer, die 2010 angefangen haben. Und wir machen weiter: mit Speicher, Eigenverbrauchsoptimierung und intelligentem Energiemanagement.",
    ],
    icon: "Sunrise",
    hervorgehoben: true,
  },
];

/**
 * Wer macht heute was - die deutsche Seite der Gruppe.
 *
 * Aufbau: eine operative Gesellschaft, eigene Montage und Rammtechnik,
 * darueber die Beteiligungsgesellschaft der Gruender, darunter die
 * Betriebs-GmbH als Komplementaerin der einzelnen Park-KGs. Jede Anlage
 * bekommt eine eigene Betreibergesellschaft - so lassen sich Finanzierung,
 * Haftung und Betrieb je Park sauber trennen.
 *
 * Angaben aus Handelsregister und veroeffentlichten Jahresabschluessen.
 */
export const ROLLEN_DE = {
  kopf: "Deutschland",
  titel: "Wer macht heute was",
  lead:
    "Hinter dem Fachbetrieb steht eine gewachsene Struktur: eine operative Gesellschaft, eigene Montage und Rammtechnik – und je Solarpark eine eigene Betreibergesellschaft.",
  eintraege: [
    {
      name: "ÖKOVOLT GmbH Solartechnik",
      rolle: "Das operative Geschäft",
      text:
        "Konzentriert sich seit 2021 ganz auf Planung, Bau und Inbetriebnahme von PV-Anlagen für Gewerbe, Industrie, Kommunen und Landwirtschaft. Unternehmensgegenstand laut Satzung 2021: Handel mit Technologieprodukten, Vertrieb, Verkauf, Montage und Inbetriebnahme von Fotovoltaikanlagen, Planung und Consulting.",
      hervorgehoben: true,
    },
    {
      name: "ÖKOVOLT Montage GmbH",
      rolle: "Eigene Montage",
      text: "Seit 2010 eigene Montageteams – das Rückgrat der Ausführung. Bei Bedarf ergänzt durch geprüfte Partnerbetriebe, die Verantwortung bleibt bei uns.",
    },
    {
      name: "Deutsche Solar & Rammtechnik GmbH",
      rolle: "Fundamente",
      text: "Seit 2012: Rammtechnik für Freiflächenanlagen – Kontrolle über jede Schraube im Boden.",
    },
    {
      name: "AWSM Beteiligung GmbH",
      rolle: "Beteiligungsgesellschaft der Gründer",
      text: "Bündelt seit 2021 die Solarparks von Andreas Wegscheider und Susanne Messmer.",
    },
    {
      name: "ÖKOVOLT Solarstrom Betriebs GmbH",
      rolle: "Komplementärin der Park-KGs",
      text: "Führt als Vollhafterin die Betreibergesellschaften der einzelnen Solarparks.",
    },
  ],
  /** Je Solarpark eine eigene Betreibergesellschaft. */
  parks: [
    {
      name: "Irsingen Solarstrom GmbH & Co. KG",
      ort: "Irsingen – Ortsteil von Türkheim",
      jahr: "seit 2013",
      text: "Der Solarpark direkt vor der eigenen Haustür.",
    },
    {
      name: "Tilleda Solarstrom GmbH & Co. KG",
      ort: "Tilleda, Sachsen-Anhalt",
      jahr: "seit Mai 2012",
      text: "Gegenstand laut Register: Betrieb von Solarkraftwerken.",
    },
    {
      name: "Artern Solarstrom GmbH & Co. KG",
      ort: "Artern, Thüringen",
      jahr: "seit 2012",
      text: "Betreibergesellschaft des dortigen Solarparks.",
    },
  ],
  weitere: [{ name: "Ventesimasun Srl", text: "Beteiligung laut Abschluss 2021" }],
};
