// Recherche: 29.09.2026 – PVGIS v5.3 (JRC), Destatis Gemeindeverzeichnis 31.12.2024, Statistisches Landesamt Sachsen-Anhalt
// (PM 251/2024, ASE 2023), MWU Sachsen-Anhalt (AuBG, FFAVO), LENA FAQ Photovoltaik, Fachagentur Wind und Solar (Länderinfo 12/2025),
// Übersicht Länderöffnungsklausel (KNE, 12/2023), EEG 2023 § 37c, MITNETZ STROM, Wikipedia (Tilleda)
const region = {
  slug: "sachsen-anhalt",
  land: "DE",
  name: "Sachsen-Anhalt",
  inName: "in Sachsen-Anhalt",
  kurz: "ST",
  seoTitel: "Solarpark & Agri-PV Sachsen-Anhalt: Pacht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht Sachsen-Anhalt: Freiflächen-PV und Agri-PV auf Acker, Grünland und Bergbaufolgeflächen – Kulisse, Gemeindebeteiligung, Börde-Böden, Ablauf.",
  lead:
    "Sachsen-Anhalt ist Ackerbauland: Fast 85 % der Landwirtschaftsfläche sind Acker, von den Spitzenböden der Magdeburger Börde bis zu sandigen Standorten in Altmark und Fläming – entsprechend unterschiedlich sind die Chancen für einen Solarpark.",
  akzent: "zwischen Börde und Revier.",
  ertrag: {
    kwhProKwp: 1080,
    ort: "bei Wanzleben (Magdeburger Börde)",
    spanne: "rund 1.080 bis 1.090 kWh/kWp",
    hinweis:
      "Ein zweiter PVGIS-Punkt nördlich von Halle (Saale) liefert rund 1.090 kWh/kWp – der Süden des Landes gehört zu den strahlungsreicheren Regionen Mitteldeutschlands.",
  },
  eckdaten: {
    hauptstadt: "Magdeburg",
    flaecheKm2: 20555,
    lfHa: 1152100,
    lfJahr: 2023,
    ackerHa: 976900,
    einwohner: 2135597,
    quelle: {
      titel: "Statistisches Landesamt Sachsen-Anhalt, PM 251/2024 (ASE 2023); Destatis Gemeindeverzeichnis (31.12.2024)",
      url: "https://statistik.sachsen-anhalt.de/fileadmin/Bibliothek/Landesaemter/StaLa/startseite/Daten_und_Veroeffentlichungen/Pressemitteilungen/2024/h_August/251-PK-ASE.pdf",
    },
  },
  einleitung: [
    "Sachsen-Anhalt hat laut Agrarstrukturerhebung 2023 rund 1,15 Millionen Hektar landwirtschaftlich genutzte Fläche, davon 976.900 Hektar Ackerland. Die rund 4.150 Betriebe bewirtschaften im Schnitt knapp 278 Hektar – mehr als das Vierfache des Bundesdurchschnitts. Große, gut zugeschnittene Schläge machen das Land für Solarparks interessant; gleichzeitig liegen hier mit der Magdeburger Börde einige der ertragreichsten Ackerböden Deutschlands, deren Umwidmung politisch kaum vermittelbar ist.",
    "Das Land hat benachteiligte Gebiete 2022 mit der Freiflächenanlagenverordnung (FFAVO) für EEG-Ausschreibungen geöffnet – allerdings nur für Ackerland und mit einem Jahresdeckel. Seit dem Solarpaket I gilt die bundesweite Öffnung. Neu ist seit Oktober 2025 ein **Akzeptanz- und Beteiligungsgesetz**, das Betreiber zu Zahlungen an die Standortgemeinde verpflichtet. Ein neuer Landesentwicklungsplan ist nach Angaben der Fachagentur Wind und Solar bis Ende 2026 geplant.",
    "Die ÖKOVOLT Gruppe, zu der ÖkoInvest gehört, betreibt in der Kyffhäuser-Region eigene Solarparks, darunter in Tilleda (Ortsteil von Kelbra, Landkreis Mansfeld-Südharz).",
  ],
  recht: [
    {
      titel: "Benachteiligte Gebiete: FFAVO 2022, seit Solarpaket I bundesweit offen",
      text:
        "Die FFAVO trat am 26.02.2022 in Kraft. Sie ließ Gebote für Solarparks auf **Ackerland** in benachteiligten Gebieten zu, begrenzt auf 100 MW Zuschlagsvolumen je Kalenderjahr; ausgeschlossen waren unter anderem Natura-2000-Gebiete, geschützte Teile von Natur und Landschaft und gesetzlich geschützte Biotope. Der Anhang listet 296 benachteiligte Gebiete (Gemeinden bzw. Gemeindeteile nach Stand 13.03.1997). Mit dem Solarpaket I (16.05.2024) sind benachteiligte Gebiete bundesweit grundsätzlich offen, die Länder können nur noch nach § 37c EEG beschränken. Eine neue Beschränkungsverordnung Sachsen-Anhalts haben wir nicht gefunden.",
      quelle: { titel: "Clearingstelle EEG|KWKG – FFAVO Sachsen-Anhalt", url: "https://www.clearingstelle-eeg-kwkg.de/gesetz/6308" },
    },
    {
      titel: "Akzeptanz- und Beteiligungsgesetz: Zahlung an die Gemeinde",
      text:
        "Für Freiflächenanlagen, die ab dem 01.10.2025 in Betrieb gehen, gilt das **Gesetz zur Akzeptanzsteigerung und Beteiligung beim Ausbau der erneuerbaren Energien (AuBG)**. Betreiber zahlen der Gemeinde, auf deren Gebiet die Anlage steht, 0,3 Cent je eingespeister Kilowattstunde, mindestens aber 2,50 Euro je Kilowatt-Peak – es gilt der höhere Betrag. Individuelle Vereinbarungen zwischen Gemeinde und Betreiber sind möglich. Die Zahlung trägt der Betreiber, nicht der Flächeneigentümer.",
      quelle: { titel: "MWU Sachsen-Anhalt – Erläuterungen zum AuBG", url: "https://mwu.sachsen-anhalt.de/energie/erneuerbare-energien/akzeptanz-und-beteiligungsgesetz/page/erlaeuterungen-zum-akzeptanz-und-beteiligungsgesetz" },
    },
    {
      titel: "Landesplanung: vorrangig Dächer und Konversion, Acker möglich",
      text:
        "Nach der Länderübersicht der Fachagentur Wind und Solar sollen Freiflächenanlagen in Sachsen-Anhalt vorrangig auf Dächern und Konversionsflächen entstehen, auf landwirtschaftlichen Flächen aber ebenfalls möglich sein; großflächige Anlagen bleiben nur mit Bebauungsplan zulässig. Das Infrastrukturministerium hat eine Arbeitshilfe zur raumplanerischen Steuerung großflächiger Photovoltaik-Freiflächenanlagen für Kommunen veröffentlicht. Ein neuer Landesentwicklungsplan ist in Arbeit.",
      quelle: { titel: "Fachagentur Wind und Solar – Länderinformation Sachsen-Anhalt", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/laenderinformationen/sachsen-anhalt" },
    },
    {
      titel: "Privilegierung entlang Autobahnen und Schienenwegen",
      text:
        "Freiflächenanlagen im Streifen entlang von Autobahnen und Schienenwegen des übergeordneten Netzes sind bundesrechtlich als privilegierte Vorhaben im Außenbereich festgelegt. Die Landesenergieagentur weist darauf in ihren FAQ ausdrücklich hin. Für Eigentümer mit Flächen an der A 2, A 9, A 14 oder A 38 oder an großen Bahntrassen kann das den Weg zur Genehmigung deutlich verkürzen.",
      quelle: { titel: "LENA Sachsen-Anhalt – FAQ Photovoltaik", url: "https://lena.sachsen-anhalt.de/erneuerbare-energien-und-wasserstoff/servicestelle-erneuerbare-energien/sonne-als-stromquelle/faq-photovoltaik" },
    },
  ],
  kulisse: {
    text:
      "Die Chancen einer Fläche hängen in Sachsen-Anhalt stark vom Boden ab: Wo die Böden weniger ertragreich sind, etwa in Teilen der Altmark, des Flämings oder der Dübener Heide, und wo die Fläche in der Kulisse benachteiligter Gebiete liegt, lassen sich Projekte leichter begründen als auf Spitzenböden. Vorbelastete Flächen wie frühere Bergbau-, Militär- oder Industriestandorte stehen planerisch an erster Stelle.",
    gut: [
      "Bergbaufolge- und Konversionsflächen, z. B. im Mitteldeutschen Revier",
      "Ackerflächen in benachteiligten Gebieten mit geringer Bodengüte",
      "Streifen entlang von Autobahnen und Schienenwegen (Privilegierung)",
      "Flächen nahe Umspannwerken und bestehenden Hochspannungstrassen",
      "Agri-PV auf Acker und Grünland mit fortgesetzter Bewirtschaftung",
    ],
    schwierig: [
      "Spitzenböden der Magdeburger Börde und anderer Lössgebiete",
      "Natura-2000-Gebiete, geschützte Biotope und Naturschutzgebiete",
      "Vorranggebiete der Regionalpläne für Landwirtschaft, Natur und Landschaft oder Hochwasserschutz",
      "Harz und Saale-Unstrut-Region mit besonderem Landschaftsbild",
      "Flächen ohne erreichbaren Netzanschlusspunkt",
    ],
  },
  ablauf: {
    text:
      "Ein Solarpark in Sachsen-Anhalt braucht in aller Regel einen Bebauungsplan. Die Gemeinde entscheidet über Aufstellungsbeschluss und Planung, meist ausgehend von einem Standortkonzept. Die Regionale Planungsgemeinschaft prüft die Vereinbarkeit mit dem Regionalplan, die Landesplanung die Ziele des Landesentwicklungsplans; der Landkreis ist als Bau-, Naturschutz- und Landwirtschaftsbehörde beteiligt. Seit Oktober 2025 gehört die Vereinbarung über die Gemeindebeteiligung nach dem AuBG praktisch zu jedem neuen Projekt. Beratung für Kommunen bietet die Landesenergieagentur (LENA).",
    behoerden: [
      { name: "Stadt / Gemeinde", rolle: "Flächennutzungs- und Bebauungsplan, Beteiligungsvereinbarung nach AuBG" },
      { name: "Regionale Planungsgemeinschaft", rolle: "Regionalplan, Stellungnahme im Verfahren" },
      { name: "Ministerium für Infrastruktur und Digitales", rolle: "Landesentwicklungsplan, Arbeitshilfe zur raumplanerischen Steuerung", url: "https://mid.sachsen-anhalt.de/" },
      { name: "Landkreis / kreisfreie Stadt", rolle: "Bauaufsicht, Naturschutz, Landwirtschaftsbehörde" },
      { name: "Landesenergieagentur Sachsen-Anhalt (LENA)", rolle: "Servicestelle Erneuerbare Energien, Beratung", url: "https://lena.sachsen-anhalt.de/" },
    ],
  },
  agri: [
    "Die Landespolitik bewertet Agri-PV als besondere Form der Landnutzung und will Genehmigungen dafür beschleunigen und vereinfachen, so die Länderübersicht der Fachagentur Wind und Solar. Für Sachsen-Anhalt mit seinem sehr hohen Ackeranteil ist Agri-PV vor allem dort interessant, wo ein klassischer Solarpark wegen guter Böden oder Vorranggebieten Landwirtschaft nicht durchsetzbar ist: Die Fläche bleibt überwiegend in Produktion, der Betrieb behält seine Flächenbasis.",
    "Kleinere Agri-PV-Anlagen bis 2,5 Hektar im räumlich-funktionalen Zusammenhang mit einem landwirtschaftlichen Betrieb sind nach § 35 Abs. 1 Nr. 9 BauGB im Außenbereich privilegiert. Größere Anlagen brauchen wie klassische Solarparks einen Bebauungsplan und müssen die Anforderungen der DIN SPEC 91434 erfüllen, um als besondere Solaranlage in der EEG-Ausschreibung anerkannt zu werden.",
  ],
  netz: {
    uenb: ["50Hertz Transmission"],
    vnb: ["Avacon Netz", "MITNETZ STROM"],
    hinweis:
      "Norden und Westen werden überwiegend von Avacon Netz versorgt; MITNETZ STROM ist u. a. in Wittenberg, Dessau-Roßlau, Saalekreis, Halle, Mansfeld-Südharz und Burgenlandkreis sowie in Teilen von Harz, Anhalt-Bitterfeld und Salzlandkreis zuständig. Im MITNETZ-Gebiet lag der Anteil erneuerbarer Energien am Stromverbrauch 2024 bereits bei 113 %.",
    quelle: {
      titel: "enviaM-Gruppe/MITNETZ STROM, Pressemitteilung 05.03.2025",
      url: "https://www.enviam-gruppe.de/media/unternehmensnachrichten/pressemitteilung/erneuerbare-energien-und-neue-verbrauchseinrichtungen-nehmen-im-netzgebiet-von-mitnetz-strom-weiter-deutlich-zu",
    },
  },
  besonderheiten: [
    {
      titel: "Börde-Böden: Solarpark meist nur als Ausnahme",
      text:
        "Die Magdeburger Börde gehört zu den besten Ackerstandorten Deutschlands. Hier ist der Widerstand gegen den Verlust von Produktionsfläche groß; realistischer sind Agri-PV-Konzepte oder Flächen an Verkehrstrassen. In Regionen mit leichteren Böden sieht die Lage deutlich anders aus.",
    },
    {
      titel: "Bergbaufolgelandschaften im Süden",
      text:
        "Im Mitteldeutschen Braunkohlerevier südlich von Halle und um Bitterfeld gibt es große Bergbaufolgeflächen, die planerisch als vorbelastet gelten. Sie konkurrieren um Netzanschlüsse mit landwirtschaftlichen Standorten, bieten aber häufig weniger Konfliktpotenzial.",
    },
    {
      titel: "Gemeindebeteiligung höher als der EEG-Standard",
      text:
        "Mit 0,3 Cent je Kilowattstunde liegt die Mindestbeteiligung nach dem AuBG über den 0,2 Cent, die § 6 EEG als freiwillige Zahlung zulässt. Für Gemeinden wird ein Solarpark damit finanziell spürbar – ein Faktor, der die Zustimmung im Gemeinderat erleichtern kann.",
    },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung:
      "Große Schläge, gute Einstrahlung und eine offene EEG-Kulisse stehen hohen Bodenwerten in der Börde und Netzengpässen gegenüber; die Spanne zwischen Standorten ist entsprechend groß.",
  },
  faq: [
    {
      q: "Hat Sachsen-Anhalt die benachteiligten Gebiete geöffnet?",
      a: "Ja, 2022 mit der FFAVO für Ackerland und einem Deckel von 100 MW pro Jahr. Seit dem Solarpaket I im Mai 2024 sind benachteiligte Gebiete bundesweit grundsätzlich offen; eine neue Beschränkung durch das Land haben wir nicht gefunden.",
    },
    {
      q: "Wie viel Pacht bringt ein Solarpark in Sachsen-Anhalt?",
      a: "Das hängt von Bodenqualität, Kulisse, Netzanschluss und Vermarktung ab. Sachsen-Anhalt liegt innerhalb der üblichen Spanne im mittleren Bereich – für eine konkrete Aussage prüfen wir die einzelne Fläche.",
    },
    {
      q: "Muss der Solarpark an die Gemeinde zahlen?",
      a: "Ja, für Anlagen ab Inbetriebnahme 01.10.2025 nach dem AuBG: 0,3 Cent je Kilowattstunde, mindestens 2,50 Euro je Kilowatt-Peak. Das zahlt der Betreiber, nicht der Eigentümer der Fläche.",
    },
    {
      q: "Geht ein Solarpark auf Börde-Boden?",
      a: "Nur in Ausnahmefällen. Auf sehr guten Böden ist ein klassischer Solarpark planerisch schwer durchsetzbar. Eher infrage kommen Agri-PV oder Flächen im privilegierten Streifen an Autobahnen und Schienenwegen.",
    },
    {
      q: "Wer entscheidet in Sachsen-Anhalt über einen Solarpark?",
      a: "Die Gemeinde über den Bebauungsplan. Regionale Planungsgemeinschaft und Landesplanung prüfen die Raumordnung, der Landkreis Bau-, Naturschutz- und Landwirtschaftsfragen.",
    },
    {
      q: "Welcher Netzbetreiber ist für meine Fläche zuständig?",
      a: "Im Norden und Westen meist Avacon Netz, im Süden und Osten meist MITNETZ STROM; in Städten auch kommunale Netzbetreiber. Übertragungsnetzbetreiber ist 50Hertz.",
    },
  ],
  quellen: [
    { titel: "PVGIS v5.3 (JRC) – PVcalc, Punkte Wanzleben und nördlich Halle", url: "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=52.05&lon=11.35&peakpower=1&loss=14&optimalangles=1&outputformat=json", stand: "09/2026" },
    { titel: "Statistisches Landesamt Sachsen-Anhalt – PM 251/2024 Agrarstrukturerhebung 2023", url: "https://statistik.sachsen-anhalt.de/fileadmin/Bibliothek/Landesaemter/StaLa/startseite/Daten_und_Veroeffentlichungen/Pressemitteilungen/2024/h_August/251-PK-ASE.pdf", stand: "09/2026" },
    { titel: "Destatis – Bundesländer nach Fläche und Bevölkerung (31.12.2024)", url: "https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/02-bundeslaender.html", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – FFAVO Sachsen-Anhalt", url: "https://www.clearingstelle-eeg-kwkg.de/gesetz/6308", stand: "09/2026" },
    { titel: "pv magazine – Sachsen-Anhalt weist benachteiligte Gebiete für Solarparks aus (02.02.2022)", url: "https://www.pv-magazine.de/2022/02/02/sachsen-anhalt-weist-flaechen-als-benachteiligte-gebiete-fuer-solarparks-aus/", stand: "09/2026" },
    { titel: "KNE – Übersicht Länderöffnungsklausel Solaranlagen (12/2023)", url: "https://www.naturschutz-energiewende.de/wp-content/uploads/Uebersicht_Stand_Laenderoeffnungsklausel_Solaranlagen.pdf", stand: "09/2026" },
    { titel: "EEG 2023 § 37c", url: "https://www.gesetze-im-internet.de/eeg_2014/__37c.html", stand: "09/2026" },
    { titel: "MWU Sachsen-Anhalt – Erläuterungen zum Akzeptanz- und Beteiligungsgesetz", url: "https://mwu.sachsen-anhalt.de/energie/erneuerbare-energien/akzeptanz-und-beteiligungsgesetz/page/erlaeuterungen-zum-akzeptanz-und-beteiligungsgesetz", stand: "09/2026" },
    { titel: "Fachagentur Wind und Solar – Länderinformation Sachsen-Anhalt (12/2025)", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/laenderinformationen/sachsen-anhalt", stand: "09/2026" },
    { titel: "LENA Sachsen-Anhalt – FAQ Photovoltaik", url: "https://lena.sachsen-anhalt.de/erneuerbare-energien-und-wasserstoff/servicestelle-erneuerbare-energien/sonne-als-stromquelle/faq-photovoltaik", stand: "09/2026" },
    { titel: "MITNETZ STROM – Investitionen Netzregion Sachsen-Anhalt (Blog 25.09.2024)", url: "https://www.mitnetz-strom.de/unternehmen/blog/blog/2024/09/25/-mitnetz-strom-investiert-rekordbudget-in-sachsen-anhalt", stand: "09/2026" },
    { titel: "Wikipedia – Tilleda (Kyffhäuser)", url: "https://de.wikipedia.org/wiki/Tilleda_(Kyffh%C3%A4user)", stand: "09/2026" },
  ],
  unsicher: [
    "Keine Opt-out-Verordnung Sachsen-Anhalts nach § 37c Abs. 2 EEG n. F. gefunden; Websuche-Budget erschöpft – vor Veröffentlichung bei BNetzA/Land gegenprüfen.",
    "Die Aussage, die FFAVO sei durch das Solarpaket I überlagert, ist für Sachsen amtlich belegt; für Sachsen-Anhalt aus der Systematik des § 37c n. F. abgeleitet – formuliert als „bundesweit grundsätzlich offen“.",
    "Konkrete Ziele des LEP 2010 zu PV-Freiflächen (Nummern Z/G) und Inhalt der MID-Arbeitshilfe nicht im Original gelesen (PDF-Link lieferte 404) – daher nur über Fachagentur zitiert.",
    "Netzgebietsaufteilung Avacon (Nord/West) vs. MITNETZ aus Wikipedia/Suchtreffer-Zusammenfassung des MITNETZ-Blogs, nicht aus Netzgebietskarte.",
    "Bergbaufolgeflächen (Mitteldeutsches Revier, Bitterfeld) nur allgemein beschrieben, keine konkreten PV-Projekte verifiziert.",
    "Aussagen zu leichteren Böden in Altmark, Fläming, Dübener Heide sind allgemeine Landeskunde, nicht mit Bodenwertkarte belegt.",
    "Tilleda-Solarpark der ÖKOVOLT Gruppe: laut Auftrag belegt; keine Leistungsangaben ergänzt.",
  ],
};

export default region;
