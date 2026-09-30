// Recherche: 29.09.2026 – PVGIS v5.3 (JRC), Destatis Gemeindeverzeichnis 31.12.2024, Statistisches Landesamt Sachsen (ASE 2023),
// SMR-Arbeitshilfe „Photovoltaik auf Landwirtschaftsflächen“ (2024, inkl. Auszüge LEP 2013 und Regionalpläne), energie.sachsen.de
// (PVFVO, EEErtrBetG), SAENA-Factsheet, Stiftung Umweltenergierecht (10/2024), EEG 2023 § 37c, MITNETZ STROM, Energiepark Witznitz
const region = {
  slug: "sachsen",
  land: "DE",
  name: "Sachsen",
  inName: "in Sachsen",
  kurz: "SN",
  seoTitel: "Solarpark & Agri-PV Sachsen: Pacht, Recht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht Sachsen: Freiflächen-PV und Agri-PV auf Acker, Grünland und Bergbaufolgeflächen – Regionalpläne, Bodenwertzahl-Grenzen, Kulisse, Ablauf.",
  lead:
    "In Sachsen entscheiden vor allem die Regionalpläne und die Bodenqualität darüber, ob ein Solarpark auf Ackerland möglich ist – die Braunkohlefolgeflächen um Leipzig und in der Lausitz zeigen, was auf vorbelasteten Flächen geht.",
  akzent: "mit Regionalplan und Bodenwertzahl.",
  ertrag: {
    kwhProKwp: 1080,
    ort: "bei Wurzen (Landkreis Leipzig)",
    spanne: "rund 1.070 bis 1.080 kWh/kWp",
    hinweis:
      "Ein zweiter PVGIS-Punkt bei Löbau (Oberlausitz) liefert rund 1.070 kWh/kWp; in den Kammlagen des Erzgebirges ist wegen Höhenlage, Schnee und Relief mit abweichenden Werten zu rechnen.",
  },
  eckdaten: {
    hauptstadt: "Dresden",
    flaecheKm2: 18450,
    lfHa: 897200,
    lfJahr: 2023,
    einwohner: 4042422,
    quelle: {
      titel: "Statistisches Landesamt Sachsen, Medieninformation 33/2024 (ASE 2023); Destatis Gemeindeverzeichnis (31.12.2024)",
      url: "https://www.statistik.sachsen.de/download/presse-2024/mi_statistik-sachsen-033-2024_agrarstruktuererhebung-landwirtschaftliche-betriebe-2023.pdf",
    },
  },
  einleitung: [
    "In Sachsen bewirtschafteten 2023 rund 6.500 Betriebe etwa 897.200 Hektar landwirtschaftliche Fläche. Mit 78,3 % ist der Ackeranteil deutlich höher als im Bundesschnitt, die Betriebe sind mit durchschnittlich 138 Hektar gut doppelt so groß. Die Landschaft reicht von den fruchtbaren Lössgebieten Mittelsachsens über die Heide- und Teichlandschaften der Lausitz bis in die Mittelgebirgslagen von Erzgebirge und Vogtland – entsprechend unterschiedlich fällt die Eignung für Solarparks aus.",
    "Sachsen hatte Acker- und Grünland in benachteiligten Gebieten schon 2021 per Landesverordnung für EEG-Ausschreibungen geöffnet. Seit dem Solarpaket I gilt die bundesweite Öffnung; die Landesverordnung ist damit überlagert. Die eigentliche Steuerung erfolgt in Sachsen heute vor allem über den Landesentwicklungsplan und die Regionalpläne der vier Planungsverbände, die teils harte Ausschlusskriterien für Freiflächenanlagen enthalten – bis hin zu Grenzwerten bei der Bodenwertzahl.",
    "Gleichzeitig steht in Sachsen einer der größten Solarparks Europas: der Energiepark Witznitz im Leipziger Südraum mit rund 650 MW auf einer ehemaligen Braunkohletagebaufläche. Er zeigt, welche Rolle Bergbaufolgeflächen im Freistaat spielen. Für landwirtschaftliche Flächeneigentümer gilt: Eine gute Planung beginnt mit dem Blick in den gültigen Regionalplan.",
  ],
  recht: [
    {
      titel: "Benachteiligte Gebiete: PVFVO 2021, seit Mai 2024 von Bundesrecht überlagert",
      text:
        "Die Sächsische Photovoltaik-Freiflächenverordnung (PVFVO) trat am 23.09.2021 in Kraft und öffnete Acker- und Grünland in benachteiligten Gebieten mit einem Jahresdeckel von 180 MW; Natura-2000-Gebiete waren ausgeschlossen. Seit dem Solarpaket I (16.05.2024) hat der neue § 37c EEG Vorrang: Benachteiligte Gebiete sind bundesweit grundsätzlich offen, der sächsische Jahresdeckel gilt nicht mehr. Beschränken dürfte das Land nur noch, wenn mehr als 1 % der Landwirtschaftsfläche mit Freiflächenanlagen belegt ist – davon ist Sachsen nach Angaben des Freistaats noch weit entfernt.",
      quelle: { titel: "energie.sachsen.de – Gesetze und Verordnungen", url: "https://www.energie.sachsen.de/gesetze-verordnungen-3969.html" },
    },
    {
      titel: "Landesentwicklungsplan: 35 % Vorranggebiete Landwirtschaft",
      text:
        "Nach Ziel 4.2.1.1 des Landesentwicklungsplans müssen die Regionalpläne mindestens **35 % der regionalen landwirtschaftlichen Nutzfläche als Vorranggebiete Landwirtschaft** festlegen. In diesen Vorranggebieten sind großflächige Solarparks in der Regel ausgeschlossen. Eine Zielabweichung ist nach der Arbeitshilfe der Landesplanung nicht möglich, wenn der Anteil dadurch unter 35 % sinken würde. Agri-PV wird aus raumordnerischer Sicht dagegen auch auf Vorrang- und Vorbehaltsflächen Landwirtschaft als grundsätzlich vereinbar angesehen.",
      quelle: { titel: "SMR-Arbeitshilfe „Photovoltaik auf Landwirtschaftsflächen“ (2024)", url: "https://www.landesentwicklung.sachsen.de/download/Landesentwicklung/Arbeitshilfe_SMR_PV_2024.pdf" },
    },
    {
      titel: "Regionalpläne mit harten Ausschlüssen",
      text:
        "Der Regionalplan **Leipzig-Westsachsen (2021)** schließt Freiflächenanlagen unter anderem auf landwirtschaftlichen Flächen mit einer **Bodenwertzahl über 50**, in Vorranggebieten Landwirtschaft, Grünzügen, Kaltluftentstehungsgebieten und Gebieten mit hoher Wassererosionsgefährdung aus. Der Regionalplan der **Region Chemnitz** nennt als Ausschluss unter anderem Ackerzahlen über 70, Waldgebiete mit 200 m Puffer sowie landschaftsprägende Höhenrücken und Hanglagen. Der Regionalplan **Oberlausitz-Niederschlesien (2023)** verzichtet bisher auf eigene PV-Festlegungen, erwartet aber Konflikte etwa mit Vorranggebieten Landwirtschaft – ausdrücklich nicht in der Regel bei Agri-PV.",
      quelle: { titel: "SMR-Arbeitshilfe, Anhang 6.1 (Festlegungen LEP und Regionalpläne)", url: "https://www.landesentwicklung.sachsen.de/download/Landesentwicklung/Arbeitshilfe_SMR_PV_2024.pdf" },
    },
    {
      titel: "Zielabweichung: Gunstfaktoren Bodenwertzahl unter 36 und bis 20 MW",
      text:
        "Steht ein Ziel der Raumordnung entgegen, kann die Landesdirektion Sachsen eine Zielabweichung zulassen. Für eine positive Entscheidung sprechen laut Arbeitshilfe etwa die Lage in der EEG-Förderkulisse, eine **Bodenwertzahl unter 36**, eine Begrenzung auf **20 MW** und der Ausschluss einer Existenzgefährdung landwirtschaftlicher Betriebe. Böden mit Bodenwertzahlen über 50 kommen nur in absoluten Ausnahmefällen infrage.",
      quelle: { titel: "SMR-Arbeitshilfe, Kap. 3.8 Zielabweichungsverfahren", url: "https://www.landesentwicklung.sachsen.de/download/Landesentwicklung/Arbeitshilfe_SMR_PV_2024.pdf" },
    },
    {
      titel: "Ertragsbeteiligung der Gemeinden per Landesgesetz",
      text:
        "Das Erneuerbare-Energien-Ertragsbeteiligungsgesetz (EEErtrBetG) ist seit 29.06.2024 in Kraft und gilt für Freiflächenanlagen ab 1 MW, die ab dem 01.01.2025 genehmigt wurden. In der ursprünglichen Fassung zahlen Betreiber der Standortgemeinde 0,1 Cent je eingespeister Kilowattstunde; individuelle Vereinbarungen, etwa nach § 6 EEG, sind möglich. Das Gesetz wurde im September 2025 novelliert.",
      quelle: { titel: "energie.sachsen.de – Ertragsbeteiligungsgesetz", url: "https://www.energie.sachsen.de/ertragsbeteiligungsgesetz.html" },
    },
  ],
  kulisse: {
    text:
      "Die sächsische Flächenkulisse ergibt sich aus dem Zusammenspiel von EEG-Kulisse und Raumordnung. Die Landesplanung empfiehlt eine Alternativenprüfung vor der Inanspruchnahme von Ackerland; günstig sind Standorte nahe einem Netzanschlusspunkt, an Verkehrstrassen, neben Hochspannungsleitungen oder Windparks und mit niedrigen Bodenwertzahlen. Je nach Planungsregion unterscheiden sich die Ausschlüsse deutlich.",
    gut: [
      "Braunkohle-Folgeflächen im Leipziger Südraum und in der Lausitz",
      "Halden, stillgelegte Deponien und versiegelte Konversionsflächen",
      "Ackerflächen mit niedriger Bodenwertzahl in benachteiligten Gebieten",
      "Flächen an Autobahnen, Bahnlinien, Hochspannungsleitungen oder Windparks",
      "Agri-PV auch auf landwirtschaftlich gesicherten Flächen (raumordnerisch vereinbar)",
    ],
    schwierig: [
      "Vorranggebiete Landwirtschaft (mindestens 35 % der LF je Region)",
      "Böden mit Bodenwertzahl über 50 (Leipzig-Westsachsen: Ausschluss)",
      "Regionale Grünzüge, Grünzäsuren und Kaltluftentstehungsgebiete",
      "Landschaftsprägende Kuppen, Höhenrücken und Hanglagen, Wald",
      "Vorranggebiete Braunkohlenabbau, Hochwasserschutz, Arten- und Biotopschutz",
    ],
  },
  ablauf: {
    text:
      "Ein Solarpark in Sachsen braucht in der Regel einen Bebauungsplan der Gemeinde. Die Landesplanung empfiehlt den Gemeinden ein Standortkonzept, für das die Arbeitshilfe ein Muster enthält. Im Verfahren nehmen der zuständige Regionale Planungsverband und die Landesdirektion Sachsen als Raumordnungsbehörde Stellung; steht ein Ziel entgegen, ist ein Zielabweichungsverfahren bei der Landesdirektion nötig, das die Gemeinde selbst beantragen kann. Die untere Landwirtschaftsbehörde gibt eine agrarstrukturelle Stellungnahme ab, das Landratsamt ist als Bau- und Naturschutzbehörde beteiligt. Den Netzbetreiber sollten Sie laut Arbeitshilfe bereits bei der ersten Projektidee einbinden.",
    behoerden: [
      { name: "Stadt / Gemeinde", rolle: "Standortkonzept, Flächennutzungs- und Bebauungsplan, ggf. Antrag auf Zielabweichung" },
      { name: "Regionaler Planungsverband (vier Regionen)", rolle: "Regionalplan mit Ausschlusskriterien, Stellungnahme" },
      { name: "Landesdirektion Sachsen", rolle: "Raumordnungsbehörde, Zielabweichungsverfahren", url: "https://www.lds.sachsen.de/" },
      { name: "Landratsamt / kreisfreie Stadt", rolle: "Bauaufsicht, Naturschutz, untere Landwirtschaftsbehörde" },
    ],
  },
  agri: [
    "Die sächsische Landesplanung sieht Agri-PV als Beitrag zur Vereinbarkeit von Landwirtschaft und Photovoltaik. Nach der Arbeitshilfe von 2024 sind Agri-PV-Anlagen aus raumordnerischer Sicht grundsätzlich auch auf Vorrang- und Vorbehaltsgebieten Landwirtschaft möglich; auch der Regionalplan Oberlausitz-Niederschlesien erwartet bei Agri-PV in der Regel keinen Konflikt mit der Landwirtschaft. Für Flächen mit guten Böden, auf denen ein klassischer Solarpark an der Bodenwertzahl scheitert, ist Agri-PV daher oft der realistischere Weg.",
    "Kleinere Agri-PV-Anlagen bis 2,5 Hektar können im räumlich-funktionalen Zusammenhang mit einem landwirtschaftlichen Betrieb nach § 35 Abs. 1 Nr. 9 BauGB auch ohne Bebauungsplan privilegiert sein. Das Landesamt für Umwelt, Landwirtschaft und Geologie hat Informationen zur Agri-PV veröffentlicht, das Landwirtschaftsressort informiert zu den rechtlichen Rahmenbedingungen. Mit einem Rapsanteil von 16,1 % am Ackerland und hohem Getreideanteil sind vor allem Ackerbaukulturen und Grünland die Ausgangsbasis.",
  ],
  netz: {
    uenb: ["50Hertz Transmission"],
    vnb: ["MITNETZ STROM", "SachsenNetze"],
    hinweis:
      "MITNETZ STROM ist in weiten Teilen Sachsens Verteilnetzbetreiber, SachsenNetze in Dresden und Ostsachsen; in größeren Städten kommen kommunale Netzgesellschaften hinzu. Im MITNETZ-Gebiet lag der Anteil erneuerbarer Energien am Stromverbrauch 2024 bereits bei 113 %.",
    quelle: {
      titel: "enviaM-Gruppe/MITNETZ STROM, Pressemitteilung 05.03.2025",
      url: "https://www.enviam-gruppe.de/media/unternehmensnachrichten/pressemitteilung/erneuerbare-energien-und-neue-verbrauchseinrichtungen-nehmen-im-netzgebiet-von-mitnetz-strom-weiter-deutlich-zu",
    },
  },
  besonderheiten: [
    {
      titel: "Energiepark Witznitz: Solarpark auf dem Tagebau",
      text:
        "Im Leipziger Südraum ging 2024 auf einer ehemaligen Braunkohletagebaufläche der Energiepark Witznitz mit rund 650 MW ans Netz, verteilt auf etwa 5 km². Für angrenzende Regionen heißt das: Bergbaufolgeflächen werden bevorzugt genutzt, landwirtschaftliche Flächen müssen sich über Netznähe, Bodenqualität und Akzeptanz behaupten.",
    },
    {
      titel: "Planungsregion entscheidet",
      text:
        "Ob eine Ackerfläche geht, hängt in Sachsen stark von der Region ab: Leipzig-Westsachsen zieht die Grenze bei Bodenwertzahl 50, die Region Chemnitz bei Ackerzahl 70, Oberlausitz-Niederschlesien hat bisher keine eigene PV-Steuerung. Es lohnt sich, die Regionalplankarte für das eigene Flurstück zu prüfen.",
    },
    {
      titel: "Kulisse benachteiligter Gebiete wird fortgeschrieben",
      text:
        "Die sächsische Gebietskulisse der benachteiligten Gebiete wurde zum 01.01.2023 angepasst und ist über die Kartendienste des Freistaats abrufbar. Die Karte überlagert auch Wald, Siedlung und Gewässer; entscheidend ist die tatsächliche Nutzung des Flurstücks.",
    },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung:
      "Gute Einstrahlung und viele vorbelastete Flächen stehen strengen regionalplanerischen Ausschlüssen auf guten Böden gegenüber; die Spanne hängt stark von Region, Bodenwert und Netzanschluss ab.",
  },
  faq: [
    {
      q: "Hat Sachsen die benachteiligten Gebiete für Solarparks geöffnet?",
      a: "Ja, bereits 2021 mit der PVFVO und einem Jahresdeckel von 180 MW. Seit dem Solarpaket I im Mai 2024 gilt die bundesweite Öffnung nach § 37c EEG, der sächsische Deckel ist damit entfallen.",
    },
    {
      q: "Welche Bodenwertzahl ist in Sachsen für einen Solarpark zu hoch?",
      a: "Das regelt der Regionalplan. In Leipzig-Westsachsen sind Flächen mit Bodenwertzahl über 50 ausgeschlossen, in der Region Chemnitz Ackerzahlen über 70. Bei Zielabweichungen gilt eine Bodenwertzahl unter 36 als Gunstfaktor.",
    },
    {
      q: "Wie viel Pacht zahlt ein Solarpark in Sachsen?",
      a: "Das hängt von Region, Bodenwert, Netzanschluss und Vermarktung ab. Sachsen liegt innerhalb der üblichen Spanne im mittleren Bereich; eine belastbare Zahl gibt es nur für die konkrete Fläche.",
    },
    {
      q: "Liegt meine Fläche in einem Vorranggebiet Landwirtschaft – ist dann alles vorbei?",
      a: "Für einen klassischen Solarpark meist ja. Agri-PV wird von der sächsischen Landesplanung aber auch dort als grundsätzlich vereinbar angesehen. Eine Zielabweichung ist möglich, aber nicht, wenn der regionale Anteil der Vorranggebiete unter 35 % sinken würde.",
    },
    {
      q: "Bekommt die Gemeinde in Sachsen Geld vom Solarpark?",
      a: "Ja. Nach dem sächsischen Ertragsbeteiligungsgesetz zahlen Betreiber neuer Freiflächenanlagen ab 1 MW der Standortgemeinde einen Betrag je eingespeister Kilowattstunde; alternativ sind individuelle Vereinbarungen möglich. Das Geld zahlt der Betreiber, nicht der Eigentümer.",
    },
    {
      q: "Wer entscheidet über einen Solarpark in Sachsen?",
      a: "Die Gemeinde über den Bebauungsplan. Regionaler Planungsverband und Landesdirektion Sachsen prüfen die Raumordnung, das Landratsamt Bau- und Naturschutzfragen.",
    },
  ],
  quellen: [
    { titel: "PVGIS v5.3 (JRC) – PVcalc, Punkte Wurzen und Löbau", url: "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=51.35&lon=12.65&peakpower=1&loss=14&optimalangles=1&outputformat=json", stand: "09/2026" },
    { titel: "Statistisches Landesamt Sachsen – Agrarstrukturerhebung 2023 (MI 33/2024)", url: "https://www.statistik.sachsen.de/download/presse-2024/mi_statistik-sachsen-033-2024_agrarstruktuererhebung-landwirtschaftliche-betriebe-2023.pdf", stand: "09/2026" },
    { titel: "Destatis – Bundesländer nach Fläche und Bevölkerung (31.12.2024)", url: "https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/02-bundeslaender.html", stand: "09/2026" },
    { titel: "SMR – Arbeitshilfe Photovoltaik auf Landwirtschaftsflächen (2024)", url: "https://www.landesentwicklung.sachsen.de/download/Landesentwicklung/Arbeitshilfe_SMR_PV_2024.pdf", stand: "09/2026" },
    { titel: "energie.sachsen.de – Gesetze und Verordnungen (PVFVO, Solarpaket I)", url: "https://www.energie.sachsen.de/gesetze-verordnungen-3969.html", stand: "09/2026" },
    { titel: "REVOSax – Photovoltaik-Freiflächenverordnung", url: "https://www.revosax.sachsen.de/vorschrift/19326-Photovoltaik-Freiflaechenverordnung", stand: "09/2026" },
    { titel: "Stiftung Umweltenergierecht – Rolle der Länder bei den PV-Ausbauzielen (24.10.2024)", url: "https://stiftung-umweltenergierecht.de/wp-content/uploads/2024/11/03_Stiftung_Umweltenergierecht_Bovet_Rolle_der_Laender_bei_der_Erreichung_der_PV_Ausbauziele_2024-10-24.pdf", stand: "09/2026" },
    { titel: "energie.sachsen.de – Erneuerbare-Energien-Ertragsbeteiligungsgesetz", url: "https://www.energie.sachsen.de/ertragsbeteiligungsgesetz.html", stand: "09/2026" },
    { titel: "SAENA – Factsheet EEErtrBetG", url: "https://www.saena.de/download/Erneuerbare%20Energien/Factsheet_EEErtrBetG.pdf", stand: "09/2026" },
    { titel: "EEG 2023 § 37c", url: "https://www.gesetze-im-internet.de/eeg_2014/__37c.html", stand: "09/2026" },
    { titel: "Wikipedia – Energiepark Witznitz", url: "https://de.wikipedia.org/wiki/Energiepark_Witznitz", stand: "09/2026" },
    { titel: "enviaM-Gruppe – MITNETZ STROM Netzgebiet 2024 (PM 05.03.2025)", url: "https://www.enviam-gruppe.de/media/unternehmensnachrichten/pressemitteilung/erneuerbare-energien-und-neue-verbrauchseinrichtungen-nehmen-im-netzgebiet-von-mitnetz-strom-weiter-deutlich-zu", stand: "09/2026" },
  ],
  unsicher: [
    "Inhalt der EEErtrBetG-Novelle vom 10.09.2025 (u. a. Anwohnerbeteiligung) nur aus Sekundärquelle (Fachagentur Wind und Solar) – ob sich der PV-Satz von 0,1 ct/kWh geändert hat, nicht verifiziert; Betrag daher als „ursprüngliche Fassung“ formuliert.",
    "Aussage „Sachsen weit von der 1-%-Schwelle entfernt“ stammt aus Suchtreffer-Zusammenfassung der energie.sachsen.de-Seite, Seite selbst lieferte 404 beim Abruf.",
    "Ob die Regionalpläne (insb. Region Chemnitz, Oberes Elbtal/Osterzgebirge) seit 2024 fortgeschrieben wurden, nicht geprüft; Angaben nach Stand der SMR-Arbeitshilfe 2024.",
    "LEP 2013 ist in Fortschreibung (laut Fachagentur, Stand 02/2026) – neue PV-Ziele möglich, nicht geprüft.",
    "Konkrete LfULG-Agri-PV-Publikation (2022) nicht im Original gelesen, daher nur allgemein erwähnt.",
    "Fläche 18.450 km² gerundet aus Destatis 18.449,89 km².",
    "URL der Landesdirektion Sachsen (lds.sachsen.de) nicht abgerufen.",
  ],
};

export default region;
