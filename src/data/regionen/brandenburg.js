// Recherche: 29.09.2026 – PVGIS v5.3 (JRC), Destatis Gemeindeverzeichnis 31.12.2024, Amt für Statistik Berlin-Brandenburg,
// BRAVORS (BbgEESG 2025, BbgPVAbgG 2024), Gemeinsame Arbeitshilfe PV-FFA (MLUK/MIL/MWAE, Stand 08/2023), MLEUV (LSG),
// EEG 2023 § 37c, LEAG, MITNETZ STROM, Wikipedia (Solarpark Weesow-Willmersdorf)
const region = {
  slug: "brandenburg",
  land: "DE",
  name: "Brandenburg",
  inName: "in Brandenburg",
  kurz: "BB",
  seoTitel: "Solarpark & Agri-PV Brandenburg: Pacht, Recht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht Brandenburg: Freiflächen-PV und Agri-PV auf Acker, Grünland und Tagebaufolgeflächen – Kulisse, Solar-Abgabe, LSG-Regeln und Ablauf.",
  lead:
    "Brandenburg ist eines der wichtigsten Flächenländer für Solarparks: große Schläge, viele ertragsschwache Sandböden und eine gesetzliche Sonderabgabe, die Gemeinden direkt am Ertrag beteiligt.",
  akzent: "mit Abgabe und Arbeitshilfe.",
  ertrag: {
    kwhProKwp: 1070,
    ort: "bei Cottbus (Lausitz)",
    spanne: "rund 1.040 bis 1.070 kWh/kWp",
    hinweis:
      "Der zweite PVGIS-Punkt bei Kyritz (Prignitz) liegt bei rund 1.040 kWh/kWp; der Süden und Osten des Landes schneiden etwas besser ab als der Nordwesten.",
  },
  eckdaten: {
    hauptstadt: "Potsdam",
    flaecheKm2: 29654,
    lfHa: 1300000,
    lfJahr: 2024,
    einwohner: 2556747,
    quelle: {
      titel: "Destatis, Gemeindeverzeichnis (Stand 31.12.2024); Amt für Statistik Berlin-Brandenburg, PM 79/2025 (LF rund 1,3 Mio. ha)",
      url: "https://www.statistik-berlin-brandenburg.de/079-2025/",
    },
  },
  einleitung: [
    "Brandenburg bewirtschaftet rund 1,3 Millionen Hektar landwirtschaftliche Fläche, etwa drei Viertel davon als Ackerland. Die Betriebe sind mit durchschnittlich rund 242 Hektar deutlich größer als im Bundesschnitt, und ein großer Teil der Flächen ist gepachtet. Für Solarparks bedeutet das: zusammenhängende Flächen sind vergleichsweise leicht zu finden, gleichzeitig spielen Pachtverhältnisse und die Abstimmung mit dem bewirtschaftenden Betrieb eine große Rolle.",
    "Das Land setzt in seiner Energiestrategie 2040 auf einen starken Photovoltaik-Ausbau: bis 2030 sollen es 18 GW installierte Leistung sein, bis 2040 33 GW. Der Schwerpunkt soll zwar auf Dächern und Parkflächen liegen, Freiflächenanlagen sowie die Sonderformen **Agri-PV** und **Moor-PV** sind nach der gemeinsamen Arbeitshilfe der Landesministerien aber ausdrücklich ein wichtiger Bestandteil.",
    "Hinzu kommen Besonderheiten, die es so nur in wenigen Ländern gibt: die großen Tagebaufolgeflächen der Lausitz, eine landesgesetzliche **Sonderabgabe an die Gemeinden** und ein besonderes Zustimmungsverfahren für Solarparks in Landschaftsschutzgebieten. Schon 2020/2021 ging bei Werneuchen (Barnim) mit Weesow-Willmersdorf ein Solarpark mit 187 MW ohne EEG-Förderung ans Netz – ein Beleg dafür, dass in Brandenburg auch förderfreie Vermarktung per Stromliefervertrag praktisch erprobt ist.",
  ],
  recht: [
    {
      titel: "Benachteiligte Gebiete: seit Solarpaket I automatisch geöffnet",
      text:
        "Brandenburg hatte die Länderöffnungsklausel für Acker- und Grünland in benachteiligten Gebieten vor 2024 nicht genutzt – anders als etwa Sachsen oder Thüringen. Mit dem Solarpaket I (in Kraft seit 16.05.2024) wurde das Prinzip umgedreht: Benachteiligte Gebiete sind bundesweit grundsätzlich für EEG-Ausschreibungen offen, die Länder können sie nach § 37c EEG nur noch per Verordnung wieder beschränken, etwa wenn mehr als 1 % der landwirtschaftlich genutzten Fläche mit Freiflächenanlagen belegt ist. Eine solche Brandenburger Beschränkungsverordnung haben wir bei der Recherche nicht gefunden. Ob Ihre Fläche in der Kulisse liegt, sollte trotzdem vor jeder Zusage geprüft werden.",
      quelle: { titel: "EEG 2023 § 37c", url: "https://www.gesetze-im-internet.de/eeg_2014/__37c.html" },
    },
    {
      titel: "Sonderabgabe an Gemeinden: 2.000 € je MW und Jahr",
      text:
        "Brandenburg verpflichtet Betreiber per Gesetz zu einer Zahlung an die Standortgemeinde. Seit dem 28.11.2025 gilt das **BbgEESG** (Sonderabgabe für Windenergie- und Photovoltaik-Freiflächenanlagen), das das frühere Photovoltaik-Abgabengesetz vom Januar 2024 ablöst. Für Freiflächenanlagen über 1 MW, die nach dem 31.12.2024 in Betrieb gehen, beträgt die Abgabe **2.000 Euro je Megawatt installierter Leistung und Jahr**; einbezogen sind auch Anlagen auf Braunkohlesanierungsflächen, die nach dem 31.12.2025 in Betrieb gehen. Die Zahlung wird jährlich bis zum 30. April des Folgejahres fällig. Für Eigentümer heißt das: Die Gemeinde hat ein messbares Eigeninteresse am Projekt – das erleichtert oft die Bauleitplanung.",
      quelle: { titel: "BRAVORS – BbgEESG vom 27.11.2025", url: "https://bravors.brandenburg.de/gesetze/bbgeesg" },
    },
    {
      titel: "Gemeinsame Arbeitshilfe PV-FFA mit Positiv- und Ausschlusskriterien",
      text:
        "Die Ministerien für Landwirtschaft/Umwelt, Infrastruktur/Landesplanung und Wirtschaft haben eine gemeinsame Arbeitshilfe für Kommunen herausgegeben (Stand August 2023). Sie ist kein Gesetz, prägt aber die Praxis der Gemeinden. **Ausgeschlossen** sind danach unter anderem der Freiraumverbund nach Ziel 6.2 des Landesentwicklungsplans Hauptstadtregion (LEP HR), Wald, Naturschutz- und FFH-Gebiete, gesetzlich geschützte Biotope, natürliche Gewässer und Wasserschutzgebiete. Einzelfallprüfung gilt etwa für Ortsrandlagen, störungsarme Räume und hochwertige Landschaftsbildräume.",
      quelle: { titel: "Gemeinsame Arbeitshilfe PV-FFA (MLUK/MIL/MWAE, 08/2023)", url: "https://mleuv.brandenburg.de/sixcms/media.php/9/Gemeinsame-Arbeitshilfe-PV-FFA.pdf" },
    },
    {
      titel: "Landschaftsschutzgebiete: Zustimmung des Ministeriums möglich",
      text:
        "In Brandenburger Landschaftsschutzgebieten ist ein Zustimmungsverfahren eingeführt: Das zuständige Umweltministerium kann einem konkreten Bebauungsplan, der dem Schutzzweck widerspricht, ausnahmsweise zustimmen. Der Landtag hat eine standortbezogene Öffnung für Freiflächen-, Agri- und Moor-PV in großräumigen LSG beschlossen; dafür hat das Ministerium eigene Rahmenbedingungen veröffentlicht. Eine Fläche im LSG ist also nicht automatisch ausgeschlossen, braucht aber deutlich mehr Begründung.",
      quelle: { titel: "MLEUV Brandenburg – Bauleitplanung in LSG", url: "https://mleuv.brandenburg.de/mleuv/de/umwelt/natur/natur-und-landschaftsschutzgebiete/bauleitplanung-in-lsg/" },
    },
    {
      titel: "Empfehlungen zur Anlagengestaltung",
      text:
        "Die Arbeitshilfe empfiehlt, Anlagen aus Gründen des Biotopverbunds nicht größer als **200 ha** zu planen. Ab 100 ha sollen zusammenhängende Modulteilflächen höchstens 20 ha umfassen und ein Viertel der Gesamtfläche frei bleiben; bei Anlagen ab 500 m Länge sollen Querungskorridore für Wild vorgesehen werden, innerhalb der Zäunung Randstreifen von mindestens 3 m. Diese Vorgaben beeinflussen, wie viel Ihrer Fläche tatsächlich mit Modulen belegt wird.",
      quelle: { titel: "Gemeinsame Arbeitshilfe PV-FFA (MLUK/MIL/MWAE, 08/2023)", url: "https://mleuv.brandenburg.de/sixcms/media.php/9/Gemeinsame-Arbeitshilfe-PV-FFA.pdf" },
    },
  ],
  kulisse: {
    text:
      "Brandenburg bietet viel Fläche, aber keine beliebige: Maßgeblich sind die Ausschlusskriterien der Landesarbeitshilfe, der Freiraumverbund des gemeinsamen Landesentwicklungsplans mit Berlin und die Schutzgebiete. Besonders gute Chancen haben vorbelastete Flächen und ertragsschwache Ackerstandorte in Netznähe; für Äcker außerhalb der EEG-Kulisse bleibt die förderfreie Vermarktung per PPA.",
    gut: [
      "Tagebaufolge- und Rekultivierungsflächen in der Lausitz",
      "Konversionsflächen (frühere Militär-, Gewerbe- oder Verkehrsflächen), soweit nicht naturschutzfachlich wertvoll",
      "Ertragsschwache Sandäcker in benachteiligten Gebieten",
      "Streifen bis 500 m entlang von Autobahnen und Schienenwegen",
      "Entwässerte, landwirtschaftlich genutzte Moorböden – nur als Moor-PV mit Wiedervernässung",
    ],
    schwierig: [
      "Freiraumverbund nach Ziel 6.2 LEP HR (regelmäßig ausgeschlossen)",
      "Wald, Naturschutz- und FFH-Gebiete, geschützte Biotope, Wasserschutzgebiete",
      "Landschaftsschutzgebiete (nur mit ministerieller Zustimmung zum B-Plan)",
      "Hochwertige Landschaftsbildräume und störungsarme Räume laut Landschaftsprogramm",
      "Unmittelbare Ortsrandlagen ohne ausreichenden Abstand",
    ],
  },
  ablauf: {
    text:
      "Wie überall in Deutschland braucht ein Solarpark in Brandenburg in aller Regel einen Bebauungsplan der Gemeinde. Die Gemeinde prüft das Vorhaben anhand der Landesarbeitshilfe und oft eines eigenen Standortkonzepts. Die Gemeinsame Landesplanungsabteilung Berlin-Brandenburg prüft die Vereinbarkeit mit den Zielen der Raumordnung, insbesondere mit dem Freiraumverbund des LEP HR; die fünf Regionalen Planungsgemeinschaften (etwa Prignitz-Oberhavel mit einer eigenen Arbeitshilfe für PV-Anlagen) bringen regionale Belange ein. Der Landkreis ist als untere Bauaufsichts- und Naturschutzbehörde beteiligt, in Landschaftsschutzgebieten zusätzlich das Umweltministerium. Parallel laufen Netzanfrage und die Klärung der Sonderabgabe mit der Gemeinde.",
    behoerden: [
      { name: "Stadt / Gemeinde", rolle: "Aufstellungsbeschluss, Flächennutzungs- und Bebauungsplan, Abschluss von Beteiligungsvereinbarungen" },
      {
        name: "Gemeinsame Landesplanungsabteilung Berlin-Brandenburg",
        rolle: "Prüfung der Ziele der Raumordnung (LEP HR, Freiraumverbund)",
        url: "https://gl.berlin-brandenburg.de/",
      },
      { name: "Regionale Planungsgemeinschaft", rolle: "Regionalplan, Stellungnahme im Verfahren" },
      { name: "Landkreis / kreisfreie Stadt", rolle: "Untere Bauaufsicht und Naturschutzbehörde, Baugenehmigung" },
      {
        name: "MLEUV Brandenburg",
        rolle: "Zustimmung zu Bebauungsplänen in Landschaftsschutzgebieten",
        url: "https://mleuv.brandenburg.de/mleuv/de/umwelt/natur/natur-und-landschaftsschutzgebiete/bauleitplanung-in-lsg/",
      },
    ],
  },
  agri: [
    "Brandenburg nennt Agri-PV und Moor-PV ausdrücklich als **landespolitische Vorzugslösungen**. Die Arbeitshilfe empfiehlt den Gemeinden, Mehrfachnutzungskonzepte mit linienhaft angeordneten Modulreihen zu unterstützen, zwischen denen weiter bewirtschaftet werden kann. Bei einer Ausgestaltung nach DIN SPEC 91434 lassen sich nach dieser Quelle ungefähr 85 bis 90 % der Fläche weiter landwirtschaftlich nutzen – ein Argument, das in Gemeinderäten mit starker Landwirtschaft oft zählt.",
    "Für Eigentümer, deren Flächen an einen Betrieb verpachtet sind, ist Agri-PV besonders interessant: Der Pächter kann weiter wirtschaften, und der überwiegende Teil der Pachtfläche bleibt in landwirtschaftlicher Nutzung. Moor-PV ist nach der Arbeitshilfe nur im Zusammenhang mit der Wiedervernässung entwässerter, landwirtschaftlich genutzter Moorflächen zu unterstützen; hier sind Wasserbehörde und Wasserrecht früh einzubinden.",
  ],
  netz: {
    uenb: ["50Hertz Transmission"],
    vnb: ["E.DIS Netz", "MITNETZ STROM"],
    hinweis:
      "Nordosten und Mitte werden überwiegend von E.DIS Netz versorgt, der Süden (u. a. Elbe-Elster, Oberspreewald-Lausitz, Spree-Neiße) teils von MITNETZ STROM. Im MITNETZ-Gebiet lag der Anteil erneuerbarer Energien am Stromverbrauch 2024 bereits bei 113 %; freie Netzkapazität ist daher ein zentrales Standortkriterium.",
    quelle: {
      titel: "enviaM-Gruppe/MITNETZ STROM, Pressemitteilung 05.03.2025",
      url: "https://www.enviam-gruppe.de/media/unternehmensnachrichten/pressemitteilung/erneuerbare-energien-und-neue-verbrauchseinrichtungen-nehmen-im-netzgebiet-von-mitnetz-strom-weiter-deutlich-zu",
    },
  },
  besonderheiten: [
    {
      titel: "Tagebaufolgeflächen der Lausitz",
      text:
        "Die LEAG plant auf ihren Bergbaufolgeflächen mit der „GigawattFactory“ Wind- und Solarparks im Gigawatt-Maßstab; als ein Baustein entsteht im Energiepark Bohrau auf landwirtschaftlich rekultivierten Flächen des Tagebaus Jänschwalde ein Solarpark mit 133 MW. Für private Eigentümer angrenzender Flächen kann das die Netzsituation und die Konkurrenz um Anschlusspunkte beeinflussen.",
    },
    {
      titel: "Floating-PV auf dem Cottbuser Ostsee",
      text:
        "Auf dem Cottbuser Ostsee, einem gefluteten Tagebau, hat die LEAG eine schwimmende PV-Anlage mit rund 29 MW errichtet; Sturmschäden verzögerten Anfang 2025 die Inbetriebnahme. Für Floating-PV gelten nach Wasserhaushaltsgesetz enge Grenzen: höchstens 15 % Bedeckung und mindestens 40 m Uferabstand auf künstlichen Gewässern.",
    },
    {
      titel: "Viele Pachtflächen, große Betriebe",
      text:
        "Rund zwei Drittel der landwirtschaftlichen Fläche in Brandenburg sind gepachtet. Eigentümer sollten daher früh klären, wie laufende Landpachtverträge beendet oder mit dem Solarprojekt abgestimmt werden – oder ob Agri-PV mit dem bisherigen Pächter die bessere Lösung ist.",
    },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung:
      "Viel verfügbare Fläche und ertragsschwache Böden stehen einer hohen Nachfrage von Projektierern und der Abgabe an die Gemeinden gegenüber; entscheidend für die Höhe sind vor allem Netzanschluss und Kulisse im Einzelfall.",
  },
  faq: [
    {
      q: "Hat Brandenburg die benachteiligten Gebiete für Solarparks geöffnet?",
      a: "Vor 2024 nicht. Seit dem Solarpaket I (16.05.2024) sind benachteiligte Gebiete bundesweit grundsätzlich für EEG-Ausschreibungen offen, solange ein Land sie nicht per Verordnung nach § 37c EEG wieder beschränkt. Eine solche Brandenburger Verordnung haben wir nach aktuellem Stand nicht gefunden – die konkrete Fläche sollte trotzdem geprüft werden.",
    },
    {
      q: "Was ist die Brandenburger Solar-Abgabe?",
      a: "Betreiber von Freiflächenanlagen über 1 MW, die nach dem 31.12.2024 in Betrieb gehen, zahlen der Standortgemeinde jährlich 2.000 Euro je Megawatt. Grundlage ist seit November 2025 das BbgEESG. Die Abgabe zahlt der Betreiber, nicht der Flächeneigentümer.",
    },
    {
      q: "Wie viel Pacht bringt ein Solarpark in Brandenburg?",
      a: "Die Pacht hängt vor allem von Netzanschluss, Kulisse (EEG oder PPA), Flächengröße und Zuschnitt ab. Brandenburg liegt innerhalb der üblichen Spanne eher im mittleren Bereich; eine konkrete Einschätzung ist nur für die einzelne Fläche seriös möglich.",
    },
    {
      q: "Ist meine Fläche im Landschaftsschutzgebiet ausgeschlossen?",
      a: "Nicht automatisch. In Brandenburger LSG kann das Umweltministerium einem konkreten Bebauungsplan zustimmen, wenn die Voraussetzungen der veröffentlichten Rahmenbedingungen erfüllt sind. Das Verfahren ist aber aufwendiger und der Ausgang offen.",
    },
    {
      q: "Wie groß darf ein Solarpark in Brandenburg sein?",
      a: "Eine feste gesetzliche Obergrenze gibt es nicht. Die Landesarbeitshilfe empfiehlt aber, Anlagen nicht größer als 200 ha zu planen und größere Anlagen in Teilflächen von höchstens 20 ha zu gliedern.",
    },
    {
      q: "Kommt meine Moorfläche für einen Solarpark infrage?",
      a: "Nur als Moor-PV in Verbindung mit einer Wiedervernässung entwässerter, landwirtschaftlich genutzter Moorböden. Das Land sieht Moor-PV als Vorzugslösung, die wasserrechtlichen Anforderungen sind aber hoch.",
    },
  ],
  quellen: [
    { titel: "PVGIS v5.3 (JRC) – PVcalc, Punkte Cottbus und Kyritz", url: "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=51.76&lon=14.33&peakpower=1&loss=14&optimalangles=1&outputformat=json", stand: "09/2026" },
    { titel: "Destatis – Bundesländer nach Fläche und Bevölkerung (31.12.2024)", url: "https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/02-bundeslaender.html", stand: "09/2026" },
    { titel: "Amt für Statistik Berlin-Brandenburg – Die Brandenburger Landwirtschaft in Zahlen (PM 79/2025)", url: "https://www.statistik-berlin-brandenburg.de/079-2025/", stand: "09/2026" },
    { titel: "Amt für Statistik Berlin-Brandenburg – Agrarstrukturerhebung 2023 (PM 8/2024)", url: "https://www.statistik-berlin-brandenburg.de/008-2024/", stand: "09/2026" },
    { titel: "EEG 2023 § 37c", url: "https://www.gesetze-im-internet.de/eeg_2014/__37c.html", stand: "09/2026" },
    { titel: "BRAVORS – BbgEESG vom 27.11.2025", url: "https://bravors.brandenburg.de/gesetze/bbgeesg", stand: "09/2026" },
    { titel: "BRAVORS – BbgPVAbgG vom 31.01.2024 (außer Kraft 28.11.2025)", url: "https://bravors.brandenburg.de/gesetze/bbgpvabgg", stand: "09/2026" },
    { titel: "Gemeinsame Arbeitshilfe PV-FFA (MLUK/MIL/MWAE, Stand 08/2023)", url: "https://mleuv.brandenburg.de/sixcms/media.php/9/Gemeinsame-Arbeitshilfe-PV-FFA.pdf", stand: "09/2026" },
    { titel: "MLEUV – Bauleitplanung in Landschaftsschutzgebieten", url: "https://mleuv.brandenburg.de/mleuv/de/umwelt/natur/natur-und-landschaftsschutzgebiete/bauleitplanung-in-lsg/", stand: "09/2026" },
    { titel: "pv magazine – LEAG baut 133-MW-Solarpark (GigawattFactory), 11.09.2025", url: "https://www.pv-magazine.de/2025/09/11/leag-treibt-gigawattfactory-mit-bau-eines-133-megawatt-solarparks-voran/", stand: "09/2026" },
    { titel: "pv magazine – Schäden an Floating-PV Cottbuser Ostsee, 27.02.2025", url: "https://www.pv-magazine.de/2025/02/27/starke-schaeden-an-floating-photovoltaik-anlage-29-megawatt-gehen-vorerst-nicht-ans-netz/", stand: "09/2026" },
    { titel: "enviaM-Gruppe – MITNETZ STROM Netzgebiet 2024 (PM 05.03.2025)", url: "https://www.enviam-gruppe.de/media/unternehmensnachrichten/pressemitteilung/erneuerbare-energien-und-neue-verbrauchseinrichtungen-nehmen-im-netzgebiet-von-mitnetz-strom-weiter-deutlich-zu", stand: "09/2026" },
  ],
  unsicher: [
    "Keine Brandenburger Opt-out-Verordnung nach § 37c Abs. 2 EEG gefunden; Websuche-Budget war am Ende erschöpft, Stand bei BNetzA vor Veröffentlichung nochmals prüfen.",
    "Aktueller Betriebsstatus der Floating-PV Cottbuser Ostsee (nach Sturmschäden 2025) nicht verifiziert – Text entsprechend vorsichtig.",
    "Ob die Arbeitshilfe PV-FFA (Stand 08/2023) inzwischen aktualisiert wurde, nicht geprüft.",
    "Anteil benachteiligter Gebiete an der LF (Sekundärquelle nennt ca. 80 %) nicht amtlich belegt – weggelassen.",
    "Datum/Inhalt der LSG-Rahmenbedingungen (Stand 15.07.2024 laut Suchtreffer) nicht im Original gelesen.",
    "LF 1,3 Mio. ha ist ein gerundeter Wert (PM 79/2025, Bezug 2024); ASE 2023 nennt ebenfalls rund 1,3 Mio. ha.",
    "URL der Gemeinsamen Landesplanungsabteilung (gl.berlin-brandenburg.de) nicht abgerufen.",
  ],
};

export default region;
