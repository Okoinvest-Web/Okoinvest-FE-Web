// Recherche: 29.09.2026 – Masterplan Solarcity (SenWEB, Fassung 05/2025) und Monitoringbericht 2025 (05/2026),
// Solargesetz Berlin (berlin.de), Amt für Statistik Berlin-Brandenburg (ASE 2023), Destatis (31.12.2024),
// LEP HR (GL Berlin-Brandenburg), § 13 ROG, Berliner Stadtgüter (Wikipedia), PVGIS v5.3

const region = {
  slug: "berlin",
  land: "DE",
  name: "Berlin",
  inName: "in Berlin",
  kurz: "BE",
  seoTitel: "Solarpark & Agri-PV Berlin: Flächen, Recht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht Berlin: warum Freiflächen-PV in der Hauptstadt die Ausnahme ist, was Masterplan Solarcity und Solargesetz regeln, wo das Umland Flächen bietet.",
  lead:
    "Berlin ist Spitzenreiter bei der Solarleistung pro Fläche, fast alles davon auf Dächern. Mit rund 1.900 Hektar Agrarfläche im Stadtgebiet sind Solarparks in Berlin die Ausnahme. Die Flächen dafür liegen meist in Brandenburg.",
  akzent: "Dächer zuerst, Umland für Parks.",
  ertrag: {
    kwhProKwp: 1050,
    ort: "bei Blankenfelde (Pankow)",
    spanne: "rund 1.040 bis 1.060 kWh/kWp",
    hinweis: "Die Einstrahlung ist im Stadtgebiet einheitlich und liegt über dem norddeutschen Durchschnitt.",
  },
  eckdaten: {
    hauptstadt: "Berlin",
    flaecheKm2: 891,
    lfHa: 1908,
    lfJahr: 2023,
    ackerHa: 1075,
    einwohner: 3685265,
    quelle: {
      titel: "Amt für Statistik Berlin-Brandenburg – Agrarstrukturerhebung Berlin 2023; Destatis Gemeindeverzeichnis 31.12.2024",
      url: "https://www.statistik-berlin-brandenburg.de/c-iv-14-u/",
    },
  },
  einleitung: [
    "In Berlin wirtschafteten 2023 nur 46 landwirtschaftliche Betriebe auf zusammen 1.908 Hektar, davon 1.075 Hektar Acker und 824 Hektar Dauergrünland. Rund drei Viertel dieser Fläche sind gepachtet. Das ist weniger als ein einzelner großer Ackerbaubetrieb in Brandenburg bewirtschaftet. Große Solarparks im klassischen Sinn sind im Stadtgebiet deshalb kaum möglich.",
    "Die Solarpolitik des Landes richtet sich folgerichtig auf die Dächer. Der Senat schreibt selbst, dass Flächen für Erneuerbare nur begrenzt zur Verfügung stehen und vorrangig das Dachpotenzial aktiviert werden soll. Das Ziel des **Masterplans Solarcity**: Bis spätestens 2035 sollen 25 Prozent der Berliner Stromerzeugung aus Solarenergie stammen. Ende 2025 waren in Berlin rund 55.900 Anlagen mit 487 MWp installiert, rechnerisch etwa 6 Prozent der Berliner Bruttostromerzeugung. Mit rund 549 kWp je Quadratkilometer liegt Berlin bei der Leistung pro Fläche bundesweit vorn.",
    "Für Flächeneigentümer bleiben in Berlin vor allem Sonderstandorte: große Park- und Gewerbeflächen, versiegelte Areale, Brachen und ehemalige Deponien. Größere Solarparks und Agri-PV entstehen dagegen im Brandenburger Umland. Dort besitzt das Land Berlin über die landeseigenen Berliner Stadtgüter selbst große Agrarflächen.",
  ],
  recht: [
    {
      titel: "Gemeinsame Landesplanung mit Brandenburg",
      text: "Berlin und Brandenburg haben eine gemeinsame Landesplanung. Den Rahmen setzt der **Landesentwicklungsplan Hauptstadtregion Berlin-Brandenburg (LEP HR)**, in Kraft seit 1. Juli 2019. Innerhalb Berlins übernimmt der Flächennutzungsplan zugleich die Funktion des Raumordnungsplans. Das ist in Stadtstaaten nach § 13 Abs. 1 ROG möglich. Eine eigene Regionalplanung mit Solarflächen gibt es in Berlin nicht.",
      quelle: { titel: "Gemeinsame Landesplanung Berlin-Brandenburg – LEP HR", url: "https://gl.berlin-brandenburg.de/landesplanung/landesentwicklungsplan-hauptstadtregion-berlin-brandenburg-lep-hr/" },
    },
    {
      titel: "Solargesetz Berlin: Pflicht auf Dächern seit 2023",
      text: "Seit 1. Januar 2023 gilt eine Solarpflicht für Neubauten und bei wesentlichen Dachumbauten im Bestand, für Gebäude mit mehr als 50 Quadratmetern Nutzfläche. Neubauten müssen mindestens 30 Prozent der Bruttodachfläche, Bestandsbauten 30 Prozent der Nettodachfläche mit PV belegen. Die Pflicht kann auch über Solarthermie oder Fassaden-PV erfüllt werden. Eine Solarpflicht für Parkplätze gibt es in Berlin nach aktuellem Stand nicht.",
      quelle: { titel: "SenWEB – Weitere Informationen zum Solargesetz Berlin", url: "https://www.berlin.de/sen/energie/erneuerbare-energien/solargesetz-berlin/artikel.1209711.php" },
    },
    {
      titel: "Masterplan Solarcity 2025–2030",
      text: "Der erste Masterplan (2020–2024) umfasste 27 Maßnahmen in neun Handlungsfeldern und wurde laut Senat fast vollständig umgesetzt. Seit Mai 2025 gilt die Fortschreibung mit fünf Handlungsfeldern. Schwerpunkt sind große Dachflächen, besonders auf Gewerbegebäuden. Freiflächen spielen in den Senatsunterlagen keine eigenständige Rolle.",
      quelle: { titel: "Solarcity Berlin – Monitoring 2020–2025", url: "https://www.berlin.de/solarcity/solarcity-berlin/was-ist-der-masterplan-und-wo-stehen-wir/monitoring/" },
    },
    {
      titel: "Bundesrecht gilt auch in der Stadt",
      text: "Für Anlagen auf Freiflächen gelten auch in Berlin die Regeln des BauGB und des EEG: Solarparks brauchen in der Regel einen Bebauungsplan. Im 200-Meter-Streifen an Autobahnen und bestimmten Schienenwegen kann eine Privilegierung nach § 35 Abs. 1 Nr. 8 b BauGB greifen, hofnahe Agri-PV bis 2,5 Hektar nach Nr. 9. Wegen der dichten Bebauung liegen im Stadtgebiet aber nur wenige solche Streifen im Außenbereich.",
    },
  ],
  kulisse: {
    text: "Im Stadtgebiet konkurrieren Freiflächen mit Wohnungsbau, Gewerbe, Erholung und Naturschutz. Solarstrom auf Flächen außerhalb von Gebäuden ist deshalb vor allem dort realistisch, wo die Fläche ohnehin versiegelt oder vorbelastet ist.",
    gut: [
      "Große Parkplätze von Handel, Gewerbe und Freizeitanlagen (freiwillige Stellplatz-PV)",
      "Versiegelte Gewerbe- und Industrieflächen, Lager- und Logistikareale",
      "Brachen, Konversionsflächen und ehemalige Deponien",
      "Lärmschutzwände und Flächen an Verkehrswegen",
    ],
    schwierig: [
      "Landwirtschaftliche Restflächen am Stadtrand – klein, oft verpachtet und im Landschaftsschutz",
      "Grünflächen, Kleingärten, Wald und Landschaftsschutzgebiete",
      "Flächen mit Wohnungsbau- oder Gewerbeperspektive im Flächennutzungsplan",
      "Natura-2000-Gebiete und geschützte Biotope",
    ],
  },
  ablauf: {
    text: "Berlin hat eine zweistufige Verwaltung aus Senat und Bezirken. Bebauungspläne stellen in der Regel die Bezirke auf, bei gesamtstädtisch bedeutsamen Vorhaben der Senat. Der Flächennutzungsplan wird auf Landesebene geführt. Für Energiefragen und das Solargesetz ist die Senatsverwaltung für Wirtschaft, Energie und Betriebe zuständig. Das SolarZentrum Berlin berät kostenlos. Wer Flächen in Brandenburg besitzt, plant dort mit der jeweiligen Gemeinde nach Brandenburger Recht und der Regionalplanung der Brandenburger Planungsregionen.",
    behoerden: [
      { name: "Bezirksamt (Stadtentwicklungsamt)", rolle: "Bebauungsplan, Baugenehmigung, bezirkliche Naturschutzbehörde" },
      { name: "Senatsverwaltung für Stadtentwicklung", rolle: "Flächennutzungsplan, Landschaftsprogramm, gesamtstädtische Bebauungspläne" },
      { name: "Senatsverwaltung für Wirtschaft, Energie und Betriebe", rolle: "Masterplan Solarcity, Solargesetz, Förderprogramm SolarPLUS", url: "https://www.berlin.de/sen/energie/erneuerbare-energien/" },
      { name: "Gemeinsame Landesplanungsabteilung Berlin-Brandenburg", rolle: "LEP HR, landesplanerische Stellungnahmen" },
      { name: "Stromnetz Berlin", rolle: "Netzanschluss im Verteilnetz" },
    ],
  },
  agri: [
    "Im Stadtgebiet ist Agri-PV ein Nischenthema: Die knapp 1.100 Hektar Ackerland verteilen sich auf wenige Betriebe am Stadtrand, etwa im Norden bei Blankenfelde oder im Westen bei Gatow. Für einzelne Betriebe kann hofnahe Agri-PV bis 2,5 Hektar nach § 35 Abs. 1 Nr. 9 BauGB trotzdem interessant sein, etwa über Grünland mit Weidetieren oder über Sonderkulturen. Sechs Betriebe mit 292 Hektar wirtschaften ökologisch, auch dort kann Agri-PV mit extensiver Beweidung passen.",
    "Größere Agri-PV-Vorhaben mit Berlin-Bezug liegen im Umland. Die landeseigenen **Berliner Stadtgüter** bewirtschaften rund 16.700 Hektar in Brandenburg und betreiben dort bereits Wind- und Solaranlagen. Nach öffentlich zugänglichen Angaben ist auf ihren Flächen auch ein Agri-PV-Projekt in Planung. Für private Eigentümer im Berliner Umland gelten die Brandenburger Regeln zu Freiflächen-PV, Regionalplanung und Kommunalbeteiligung.",
  ],
  netz: {
    uenb: ["50Hertz Transmission"],
    vnb: ["Stromnetz Berlin"],
    hinweis:
      "Nach Daten von Stromnetz Berlin lag die Berliner Stromerzeugung 2025 bei rund 4.782 GWh. Um das Solarcity-Ziel von 25 Prozent zu erreichen, wären nach der Expertenempfehlung von 2019 rund 4.400 MWp Solarleistung nötig.",
    quelle: { titel: "SenWEB – Monitoringbericht 2025 Masterplan Solarcity", url: "https://www.berlin.de/solarcity/solarcity-berlin/was-ist-der-masterplan-und-wo-stehen-wir/monitoring/" },
  },
  besonderheiten: [
    {
      titel: "Spitzenreiter bei Solarleistung pro Fläche",
      text: "Mit rund 549 kWp je Quadratkilometer liegt Berlin Ende 2025 bundesweit vorn, vor Saarland, Hamburg und Bayern. Das liegt an den vielen Dächern, nicht an Freiflächen. 2025 kamen rund 96 MWp hinzu, im ersten Quartal 2026 wurde die Marke von 500 MWp überschritten.",
    },
    {
      titel: "Stadtgüter und Rieselfelder im Umland",
      text: "Historisch gehören zu den Berliner Stadtgütern auch ehemalige Rieselfelder in Brandenburg. Nach öffentlich zugänglichen Angaben stehen dort unter anderem Kurzumtriebsplantagen, und es werden Solarparks auf ehemaligen Flug- und Bauschuttflächen betrieben. Solche vorbelasteten Flächen sind ein Beispiel dafür, wo Solarparks für Berlin tatsächlich entstehen.",
    },
    {
      titel: "Viele Pächter, wenige Eigentümer",
      text: "Rund 76 Prozent der Berliner Agrarfläche sind gepachtet. Wer eine Fläche für Solar oder Agri-PV nutzen will, muss deshalb meist Eigentümer und Pächter an einen Tisch bringen und bestehende Landpachtverträge berücksichtigen.",
    },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung:
      "Im Stadtgebiet gibt es kaum vergleichbare Projekte. Die Pacht hängt dort vom Einzelfall ab, im Umland von den Brandenburger Rahmenbedingungen.",
  },
  faq: [
    {
      q: "Gibt es in Berlin Solarparks auf Freiflächen?",
      a: "Nur vereinzelt. Mit rund 1.900 Hektar Agrarfläche und hohem Nutzungsdruck setzt Berlin auf Dächer. Freiflächen-PV ist im Stadtgebiet vor allem auf versiegelten oder vorbelasteten Flächen realistisch. Größere Solarparks entstehen im Brandenburger Umland.",
    },
    {
      q: "Kann ich meine Fläche in Berlin für Photovoltaik verpachten?",
      a: "Ja, wenn sie groß genug und planungsrechtlich geeignet ist. Das trifft am ehesten auf Parkplätze, Gewerbeflächen, Brachen oder ehemalige Deponien zu. Landwirtschaftliche Flächen am Stadtrand liegen oft in Landschaftsschutzgebieten und sind meist verpachtet.",
    },
    {
      q: "Wie viel Pacht bringt eine Solarfläche in Berlin?",
      a: "Wegen der wenigen Projekte gibt es für Berlin keine belastbaren Vergleichswerte. Entscheidend sind Flächengröße, Netzanschluss und Planungsrecht. Konkrete Werte berechnen wir auf dieser Seite aus zentralen Marktdaten.",
    },
    {
      q: "Gilt in Berlin eine Solarpflicht für Parkplätze?",
      a: "Nach aktuellem Stand nein. Das Berliner Solargesetz verpflichtet nur bei Gebäuden: Neubauten und wesentliche Dachumbauten mit mehr als 50 Quadratmetern Nutzfläche müssen mindestens 30 Prozent der Dachfläche mit PV belegen.",
    },
    {
      q: "Ich besitze Flächen im Berliner Umland. Welche Regeln gelten?",
      a: "Die Regeln des Landes Brandenburg, der dortigen Regionalplanung und der jeweiligen Gemeinde. Landesplanerisch gilt für Berlin und Brandenburg zwar der gemeinsame LEP HR, die Bauleitplanung liegt aber bei der Brandenburger Gemeinde.",
    },
  ],
  quellen: [
    { titel: "Solarcity Berlin – Masterplan Solarcity", url: "https://www.berlin.de/solarcity/", stand: "09/2026" },
    { titel: "SenWEB – Masterplan Solarcity Monitoring 2020–2025 und Monitoringbericht 2025", url: "https://www.berlin.de/solarcity/solarcity-berlin/was-ist-der-masterplan-und-wo-stehen-wir/monitoring/", stand: "09/2026" },
    { titel: "SenWEB – Masterplan Solarcity 2020 bis 2024", url: "https://www.berlin.de/solarcity/solarcity-berlin/was-ist-der-masterplan-und-wo-stehen-wir/masterplan-2020-bis-2024/", stand: "09/2026" },
    { titel: "SenWEB – Erneuerbare Energien in Berlin", url: "https://www.berlin.de/sen/energie/erneuerbare-energien/", stand: "09/2026" },
    { titel: "SenWEB – Weitere Informationen zum Solargesetz Berlin", url: "https://www.berlin.de/sen/energie/erneuerbare-energien/solargesetz-berlin/artikel.1209711.php", stand: "09/2026" },
    { titel: "Amt für Statistik Berlin-Brandenburg – Ausgewählte Ergebnisse der Agrarstrukturerhebung in Berlin", url: "https://www.statistik-berlin-brandenburg.de/c-iv-14-u/", stand: "09/2026" },
    { titel: "Gemeinsame Landesplanung Berlin-Brandenburg – LEP HR", url: "https://gl.berlin-brandenburg.de/landesplanung/landesentwicklungsplan-hauptstadtregion-berlin-brandenburg-lep-hr/", stand: "09/2026" },
    { titel: "§ 13 Raumordnungsgesetz", url: "https://www.gesetze-im-internet.de/rog_2008/__13.html", stand: "09/2026" },
    { titel: "Wikipedia – Berliner Stadtgüter", url: "https://de.wikipedia.org/wiki/Berliner_Stadtg%C3%BCter", stand: "09/2026" },
    { titel: "Destatis – Bundesländer nach Fläche und Bevölkerung, 31.12.2024", url: "https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/02-bundeslaender.html", stand: "09/2026" },
    { titel: "PVGIS 5.3 – Europäische Kommission, JRC", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/", stand: "09/2026" },
  ],
  unsicher: [
    "Konkrete Freiflächen-Solarparks im Berliner Stadtgebiet nicht recherchiert/belegt, daher keine Namen genannt.",
    "Berliner Stadtgüter (16.742 ha, Solarparks Staaken und Rüdersdorf, Agri-PV 70 ha in Schönefeld in Planung) nur über Wikipedia belegt, im Text bewusst allgemein gehalten. Flugplatz Staaken liegt teils auf Berliner Gebiet – daher ohne Ortsangabe.",
    "Zuständigkeiten Bezirke/Senat bei B-Plänen, Name „Senatsverwaltung für Stadtentwicklung“ (aktueller Ressortzuschnitt) und Bezirks-Stadtentwicklungsamt nicht gesondert verifiziert.",
    "Blankenfelde/Gatow als landwirtschaftliche Stadtrandlagen aus allgemeiner Kenntnis. PVGIS-Punkte dort abgefragt (1.054 bzw. 1.038 kWh/kWp).",
    "Keine Angaben zu benachteiligten Gebieten in Berlin gefunden, daher nicht erwähnt. Brandenburger Rechtslage bewusst nicht im Detail dargestellt (eigene Region).",
    "Aussage „Freiflächen spielen in den Senatsunterlagen keine eigenständige Rolle“ bezieht sich auf die gesichteten Seiten und den Monitoringbericht 2025, nicht auf den vollständigen Masterplan 2025–2030.",
    "Lärmschutzwände als PV-Standort in Berlin nicht mit Berliner Quelle belegt (allgemeiner Flächentyp nach § 48 EEG).",
  ],
};

export default region;
