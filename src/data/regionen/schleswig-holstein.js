// Recherche: 29.09.2026 – Solar-Erlass SH vom 09.09.2024 (MIKWS/MEKUN), LEP SH Fortschreibung 2021 Kap. 4.5.2,
// Statistikamt Nord (LF 2025), Destatis Gemeindeverzeichnis (31.12.2024), Clearingstelle EEG|KWKG (§ 37c, geprüft 07/2026),
// Land SH Engpassmanagement 2025, Fachagentur Wind und Solar Länderinfo SH (02/2026), PVGIS v5.3

const region = {
  slug: "schleswig-holstein",
  land: "DE",
  name: "Schleswig-Holstein",
  inName: "in Schleswig-Holstein",
  kurz: "SH",
  seoTitel: "Solarpark & Agri-PV Schleswig-Holstein | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht in Schleswig-Holstein: was der Solar-Erlass 2024 und der LEP für Freiflächen-PV vorgeben, welche Flächen passen und was das Netz hergibt.",
  lead:
    "Schleswig-Holstein ist Windland, holt bei Solarparks aber deutlich auf. Der Solar-Erlass von 2024 lenkt Freiflächen-PV auf vorbelastete Flächen, an Autobahnen und Bahnlinien und schont gute Böden, Moore und Wiesenvogelgebiete.",
  akzent: "zwischen Knick und Netzknoten.",
  ertrag: {
    kwhProKwp: 980,
    ort: "bei Rendsburg",
    spanne: "rund 980 bis 1.110 kWh/kWp",
    hinweis:
      "Im Binnenland liegen die Werte um 980 kWh/kWp, auf Fehmarn und an der Ostseeküste deutlich höher (PVGIS rund 1.110 kWh/kWp).",
  },
  eckdaten: {
    hauptstadt: "Kiel",
    flaecheKm2: 15804,
    lfHa: 970800,
    lfJahr: 2025,
    einwohner: 2959517,
    quelle: {
      titel: "Statistikamt Nord – Landwirtschaft in Zahlen; Destatis Gemeindeverzeichnis, Stand 31.12.2024",
      url: "https://www.statistik-nord.de/zahlen-fakten/landwirtschaft",
    },
  },
  einleitung: [
    "Schleswig-Holstein ist vor allem für seine Windparks bekannt, Photovoltaik holt aber schnell auf. Ende 2025 waren im Land rund 4,6 GW Solarleistung installiert. Knapp die Hälfte davon, gut 2,1 GW in etwas über 700 Anlagen, steht auf Freiflächen. Allein 2025 kamen gut 800 MW hinzu. Die Landesregierung will Solarparks aber gezielt lenken: vorrangig auf belastete oder versiegelte Flächen und entlang von Autobahnen, Bahnstrecken und Stromtrassen. Hochwertige Ackerböden sollen der Landwirtschaft vorbehalten bleiben.",
    "Für Flächeneigentümer ist deshalb weniger die Frage entscheidend, ob Solarparks im Land möglich sind, sondern wo. Den Rahmen setzen der **Landesentwicklungsplan (LEP) 2021** mit seinem Kapitel 4.5.2 „Solarenergie“ und der gemeinsame **Solar-Erlass** von Innen- und Energiewendeministerium, zuletzt überarbeitet und seit dem 9. September 2024 in Kraft (befristet bis 1. Oktober 2027). Der Erlass teilt den Außenbereich in geeignete Suchräume, Flächen mit besonderem Prüfbedarf und Flächen mit fachrechtlicher Ausschlusswirkung ein.",
    "Hinzu kommt das Netz: Obwohl das Verteilnetz für die Windenergie vielerorts stark ausgebaut wurde, steht diese Kapazität für Solarstrom nur begrenzt zur Verfügung. Frühzeitige Abstimmung mit dem Netzbetreiber gehört in Schleswig-Holstein deshalb von Anfang an zur Flächenprüfung.",
  ],
  recht: [
    {
      titel: "Benachteiligte Gebiete: früher gesperrt, seit Solarpaket I grundsätzlich offen",
      text: "Anders als etwa Bayern hat Schleswig-Holstein die Länderöffnungsklausel für benachteiligte Gebiete vor 2024 nicht genutzt. Seit dem Solarpaket I (16.05.2024) sind Acker- und Grünland in benachteiligten Gebieten bundesweit grundsätzlich förderfähig, solange das Land sie nicht per Verordnung nach § 37c EEG ausschließt. Eine solche Beschränkungsverordnung für Schleswig-Holstein ist nach unserem Rechercheergebnis nicht bekannt. Ob eine Fläche tatsächlich in der EU-Gebietskulisse liegt, muss flurstücksgenau geprüft werden.",
      quelle: { titel: "Clearingstelle EEG|KWKG – Förderung von PV auf Acker- und Grünland (geprüft 02.07.2026)", url: "https://www.clearingstelle-eeg-kwkg.de/haeufige-rechtsfrage/169" },
    },
    {
      titel: "LEP 2021: Vorrang für vorbelastete Flächen, Bänder bis 1.000 Meter",
      text: "Nach Kapitel 4.5.2 LEP sollen raumbedeutsame Solarparks vorrangig auf versiegelte Flächen, Konversionsflächen und Deponien, entlang von Autobahnen, Bundesstraßen und überregionalen Schienenwegen oder auf sonst vorbelastete Flächen. Einzelne und benachbarte Anlagen sollen eine **Gesamtlänge von 1.000 Metern** nicht überschreiten, sonst sind Landschaftsfenster freizuhalten. Als Ziel ausgeschlossen sind Vorranggebiete für den Naturschutz, Vorbehaltsgebiete für Natur und Landschaft, Regionale Grünzüge und Grünzäsuren sowie Schwerpunkträume für Tourismus und Erholung (Ausnahme: vorbelastete Flächen).",
      quelle: { titel: "Land SH – Grundsätze zur Planung von großflächigen Solar-Freiflächenanlagen im Außenbereich (2024)", url: "https://www.schleswig-holstein.de/DE/fachinhalte/S/stadtenwicklung-staedtebau/Downloads/erlass_SolarFreiflaechenanlagen.pdf?__blob=publicationFile&v=1" },
    },
    {
      titel: "Kein Raumordnungsverfahren mehr ab 20 Hektar",
      text: "Der LEP sah für Solarparks ab 20 Hektar in der Regel ein Raumordnungsverfahren vor. Das Kabinett hat am 13.09.2022 beschlossen, darauf bei Einzel- und Agglomerationsplanungen zu verzichten. Das beschleunigt größere Projekte. Die landesplanerische Stellungnahme im Bauleitplanverfahren bleibt aber erforderlich.",
      quelle: { titel: "Solar-Erlass SH 2024, Abschnitt B. III.", url: "https://www.schleswig-holstein.de/DE/fachinhalte/S/stadtenwicklung-staedtebau/Downloads/erlass_SolarFreiflaechenanlagen.pdf?__blob=publicationFile&v=1" },
    },
    {
      titel: "Privilegierter 200-Meter-Streifen an Autobahn und Bahn",
      text: "Im 200-Meter-Streifen nach § 35 Abs. 1 Nr. 8 b BauGB wendet das Land das LEP-Ausschlussziel wegen des Vorrangs der Erneuerbaren (§ 2 EEG) bis zu einer LEP-Änderung nur als Grundsatz an. Vorranggebiete Windenergie oder Rohstoffabbau stehen dort aber in der Regel weiterhin entgegen. Außerhalb des Streifens gilt das LEP-Ziel unverändert.",
      quelle: { titel: "Solar-Erlass SH 2024, Abschnitt D. I.", url: "https://www.schleswig-holstein.de/DE/fachinhalte/S/stadtenwicklung-staedtebau/Downloads/erlass_SolarFreiflaechenanlagen.pdf?__blob=publicationFile&v=1" },
    },
    {
      titel: "Gute Böden: hohe Begründungslast für die Gemeinde",
      text: "Bei Flächen mit regional hoher Ertragsfähigkeit verlangt der Erlass eine enge Begründung: Die Gemeinde soll unter anderem darlegen, ob es im Gemeindegebiet versiegelte Alternativflächen gibt. Die Bodenpunkte lassen sich flächenscharf im Umweltportal ablesen. Bei Agri-PV mit gleichzeitigem Pflanzenbau kann die Bewertung anders ausfallen.",
      quelle: { titel: "Solar-Erlass SH 2024, Abschnitt D. II.", url: "https://www.schleswig-holstein.de/DE/fachinhalte/S/stadtenwicklung-staedtebau/Downloads/erlass_SolarFreiflaechenanlagen.pdf?__blob=publicationFile&v=1" },
    },
  ],
  kulisse: {
    text: "Der Solar-Erlass nennt ausdrücklich geeignete Suchräume und Flächen, die von vornherein ausscheiden. Dazwischen liegt eine breite Kategorie mit besonderem Abwägungs- und Prüferfordernis. Dazu gehören Landschaftsschutzgebiete, Naturparke, Biotopverbundflächen, Rastgebiete für Zugvögel und Moorböden. Solarparks sind dort nicht verboten, aber nur nach sorgfältiger Einzelfallprüfung umsetzbar.",
    gut: [
      "Flächen im 200-Meter-Streifen an Autobahnen und überregionalen Schienenwegen",
      "Konversionsflächen, Gewerbe- und Industriebrachen, ehemalige Abbauflächen (Auflagen beachten)",
      "Deponien – im Land gibt es über 25 Deponiestandorte in verschiedenen Phasen",
      "Vorbelastete Flächen, z. B. in Windparks oder Vorranggebieten Windenergie",
      "Ertragsschwächere Ackerstandorte, vor allem auf der Geest, mit nahem Netzverknüpfungspunkt",
    ],
    schwierig: [
      "Naturschutzgebiete, Nationalpark Wattenmeer, Natura 2000, geschützte Biotope (fachrechtlicher Ausschluss)",
      "Flächen der Wiesenvogelkulisse – nach dem Erlass in der Regel artenschutzrechtlich unzulässig",
      "Überschwemmungsgebiete, küstenschutzrechtlicher Bauverbotsstreifen und Deichschutzstreifen",
      "Regionale Grünzüge, Grünzäsuren und Schwerpunkträume für Tourismus und Erholung",
      "Dauergrünland auf Moor- und Anmoorböden, alte Grünland- und Brachestandorte mit hohem Naturschutzwert",
    ],
  },
  ablauf: {
    text: "Außerhalb der Privilegierungsstreifen braucht ein Solarpark in Schleswig-Holstein eine Änderung des Flächennutzungsplans und einen Bebauungsplan, oft als vorhabenbezogener Plan mit Durchführungsvertrag. Die Gemeinde entscheidet über die Aufstellung. Sie soll sich nach dem LEP mit Nachbargemeinden abstimmen, um zu große Anlagenhäufungen zu vermeiden. Viele Gemeinden und Ämter arbeiten mit eigenen Standort- oder Potenzialstudien. Das Innenministerium stellt ihnen dafür das Flächenmanagementkataster (FMK SH) mit einem PV-Freiflächenatlas bereit. Die Landesplanung nimmt im Verfahren Stellung. Die Kreise sind als untere Bauaufsichts- und Naturschutzbehörden beteiligt. Der Erlass empfiehlt, den Netzbetreiber bereits vor dem Aufstellungsbeschluss einzubinden.",
    behoerden: [
      { name: "Gemeinde / Amt", rolle: "Planungshoheit: Aufstellungsbeschluss, F-Plan-Änderung, Bebauungsplan, städtebaulicher Vertrag" },
      { name: "Ministerium für Inneres, Kommunales, Wohnen und Sport – Landesplanung", rolle: "Landesplanerische Stellungnahme, Zielabweichung nach § 13 LaplaG, FMK SH", url: "https://www.schleswig-holstein.de/DE/fachinhalte/L/landesplanung/allgemein/aufgaben_instrumente_bauleitplaene" },
      { name: "Kreis (untere Bauaufsicht, untere Naturschutzbehörde)", rolle: "Baugenehmigung, Eingriffsregelung, Artenschutz, Landschaftsschutzgebiete" },
      { name: "Ministerium für Energiewende, Klimaschutz, Umwelt und Natur (MEKUN)", rolle: "Mitherausgeber des Solar-Erlasses, Natur-, Moor- und Bodenschutz auf Landesebene" },
      { name: "Netzbetreiber (meist Schleswig-Holstein Netz)", rolle: "Netzverträglichkeitsprüfung, Netzverknüpfungspunkt, Ausbauplanung" },
    ],
  },
  agri: [
    "Der Solar-Erlass enthält einen eigenen Abschnitt zu „besonderen Solaranlagen“. Er stellt klar, dass Agri-PV nach DIN SPEC 91434 hoch aufgeständert oder senkrecht in Reihen gebaut werden kann. Besonders Gemüse-, Obst- und Sonderkulturen, die zunehmend unter Hagel, Frost und Dürre leiden, könnten von einer Teilüberdachung profitieren. Die Fachbehörden im Land halten Agri-PV, die zugleich die Anforderungen der GAP-Direktzahlungen-Verordnung erfüllt, für vorzugswürdig. Dort sind die Anforderungen an die landwirtschaftliche Nutzung strenger als bei den besonderen Solaranlagen des EEG.",
    "Hofnahe Agri-PV bis **2,5 Hektar** Grundfläche ist nach § 35 Abs. 1 Nr. 9 BauGB ohne Bebauungsplan möglich, eine Anlage je Hofstelle. Größere Agri-PV-Anlagen sind entweder im 200-Meter-Streifen privilegiert oder brauchen einen Bebauungsplan. Auf besseren Böden, bei denen klassische Solarparks eine hohe Begründungslast haben, kann Agri-PV mit gleichzeitigem Pflanzenbau in der Abwägung günstiger bewertet werden. Bei hohen Aufständerungen weist der Erlass auf mögliche zusätzliche Wirkungen auf das Landschaftsbild hin.",
  ],
  netz: {
    uenb: ["TenneT TSO"],
    vnb: ["Schleswig-Holstein Netz", "Stadtwerke-Netze (z. B. Kiel, Lübeck, Flensburg, Neumünster)"],
    hinweis:
      "Schleswig-Holstein Netz meldet Anschlussanfragen für Solarparks von mehr als 18 GW. Das ist ein Vielfaches der Versorgungsleistung des Verteilnetzes, und bei Ausbauten im Höchstspannungsnetz nennt der Solar-Erlass Wartezeiten bis zu zehn Jahren. Die Abregelung von Erneuerbaren an Land ist dagegen stark gesunken: 2025 waren es 825 GWh, etwa ein Viertel des Höchststands von 2019.",
    quelle: { titel: "Land SH – Engpassmanagement (Abregelung 2025)", url: "https://www.schleswig-holstein.de/DE/fachinhalte/N/netzausbau/engpassmanagement" },
  },
  besonderheiten: [
    {
      titel: "Moor-PV auf wiedervernässten Flächen",
      text: "Der Solar-Erlass behandelt Moor-PV ausdrücklich: Solarparks auf bisher entwässerten, landwirtschaftlich genutzten Moor- und Anmoorböden sind möglich, wenn die Fläche wiedervernässt wird. Dafür gibt es eine eigene EEG-Förderkategorie. Die Machbarkeit der Vernässung muss im Bebauungsplanverfahren nachgewiesen werden, notfalls mit einem hydrologischen Gutachten. Nach den Vorgaben der Bundesnetzagentur gelten Mindestwasserstände von 10 cm unter Flur im Winter und 30 cm im Sommer. Gesetzlich geschützte Moore sind ausgenommen.",
    },
    {
      titel: "Wiesenvögel, Rastvögel und Küste",
      text: "Vor allem in den Marschen der Westküste liegen Wiesenvogelgebiete, Rastgebiete für Zugvögel und küstenschutzrechtliche Bauverbotszonen. Flächen der Wiesenvogelkulisse gelten nach dem Erlass in der Regel als artenschutzrechtlich ausgeschlossen. Eine frühe Prüfung der Naturschutzkulissen spart hier viel Planungsaufwand.",
    },
    {
      titel: "Knicks und Landschaftsbild",
      text: "Die typischen Wallhecken prägen große Teile des Landes. Der Erlass nennt Knicks als überlieferte Landschaftselemente, die zu berücksichtigen sind, und empfiehlt eine Eingrünung mit standortheimischen Gehölzen. Zusammen mit der 1.000-Meter-Regel des LEP führt das eher zu mehreren kompakten Teilflächen als zu langen Modulbändern.",
    },
    {
      titel: "Bürgerenergie und Akzeptanz",
      text: "Das Land fördert Bürgerenergieprojekte bei Freiflächen-PV über einen Bürgerenergiefonds. Voraussetzung ist ein Zusammenschluss von mindestens sieben Personen aus verschiedenen Haushalten. Unabhängig davon können Betreiber die Standortgemeinde nach § 6 EEG finanziell beteiligen.",
    },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung:
      "Die Einstrahlung im Binnenland ist etwas geringer als im Süden, dafür ist die Nachfrage nach netznahen Flächen hoch. Entscheidend für die Pacht sind vor allem Netzanschluss, Lage im Privilegierungsstreifen und Bodengüte.",
  },
  faq: [
    {
      q: "Hat Schleswig-Holstein die benachteiligten Gebiete für Solarparks geöffnet?",
      a: "Vor 2024 nicht, das Land hat die frühere Öffnungsklausel nicht genutzt. Seit dem Solarpaket I sind benachteiligte Gebiete aber bundesweit grundsätzlich für die EEG-Ausschreibung offen, solange ein Land sie nicht per Verordnung ausschließt. Eine solche Verordnung ist für Schleswig-Holstein nach unserem Stand nicht bekannt. Die Förderfähigkeit sagt aber noch nichts über die Planungsfähigkeit: LEP, Solar-Erlass und Gemeinde entscheiden, ob gebaut werden darf.",
    },
    {
      q: "Wie viel Pacht bringt ein Solarpark in Schleswig-Holstein?",
      a: "Das hängt vor allem vom Netzanschluss, von der Lage (etwa im 200-Meter-Streifen an Autobahn oder Bahn), von der Flächengröße und vom Vermarktungsweg ab. In Schleswig-Holstein bestimmt der Netzanschluss den Wert einer Fläche besonders stark. Eine Fläche mit gesichertem Anschluss ist deutlich mehr wert als eine ohne. Konkrete Werte berechnen wir auf dieser Seite aus aktuellen Marktdaten.",
    },
    {
      q: "Brauche ich für einen Solarpark in Schleswig-Holstein ein Raumordnungsverfahren?",
      a: "In der Regel nein. Das Land verzichtet seit dem Kabinettsbeschluss vom 13.09.2022 auf Raumordnungsverfahren für Solarparks ab 20 Hektar. Die Ziele und Grundsätze des LEP gelten trotzdem und werden über die landesplanerische Stellungnahme im Bauleitplanverfahren geprüft.",
    },
    {
      q: "Darf ein Solarpark auf Moorboden gebaut werden?",
      a: "Auf entwässerten, landwirtschaftlich genutzten Moor- und Anmoorböden ja, aber als Moor-PV mit Wiedervernässung und nachgewiesener Umsetzbarkeit. Dauergrünland auf Moorböden und die Schutzkulisse der Moorböden unterliegen einer besonderen Prüfung. Gesetzlich geschützte Moore sind ausgeschlossen.",
    },
    {
      q: "Warum dauert der Netzanschluss in Schleswig-Holstein oft so lange?",
      a: "Das Netz wurde für Windstrom ausgebaut, diese Kapazität steht für Solarstrom nur teilweise zur Verfügung. Solarparks brauchen meist eigene Netzverknüpfungspunkte mit neuen Transformatoren, oft mit Ausbaubedarf bis ins Übertragungsnetz. Deshalb empfiehlt der Solar-Erlass, den Netzbetreiber früh einzubinden.",
    },
    {
      q: "Wie lang darf ein Solarpark in Schleswig-Holstein sein?",
      a: "Nach dem Grundsatz im LEP sollen einzelne und benachbarte Anlagen zusammen nicht länger als 1.000 Meter sein. Darüber hinaus sollen ausreichend große Landschaftsfenster frei bleiben. Das ist ein Grundsatz, kein striktes Verbot, wird aber in der Abwägung regelmäßig berücksichtigt.",
    },
  ],
  quellen: [
    { titel: "Land SH – Grundsätze zur Planung von großflächigen Solar-Freiflächenanlagen im Außenbereich (Solar-Erlass, 09.09.2024)", url: "https://www.schleswig-holstein.de/DE/fachinhalte/S/stadtenwicklung-staedtebau/Downloads/erlass_SolarFreiflaechenanlagen.pdf?__blob=publicationFile&v=1", stand: "09/2026" },
    { titel: "Land SH – Pressemitteilung zum überarbeiteten Solar-Erlass (02.10.2024)", url: "https://www.schleswig-holstein.de/DE/landesregierung/ministerien-behoerden/IV/Presse/PI/2024/241002_solarerlass", stand: "09/2026" },
    { titel: "Fachagentur Wind und Solar – Länderinformationen Schleswig-Holstein", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/laenderinformationen/schleswig-holstein", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – PV auf Acker- und Grünland, benachteiligte Gebiete", url: "https://www.clearingstelle-eeg-kwkg.de/haeufige-rechtsfrage/169", stand: "09/2026" },
    { titel: "§ 37c EEG 2023 – Verordnungsermächtigung für die Länder", url: "https://www.gesetze-im-internet.de/eeg_2014/__37c.html", stand: "09/2026" },
    { titel: "Land SH – Engpassmanagement und Abregelung", url: "https://www.schleswig-holstein.de/DE/fachinhalte/N/netzausbau/engpassmanagement", stand: "09/2026" },
    { titel: "Statistikamt Nord – Landwirtschaft in Zahlen", url: "https://www.statistik-nord.de/zahlen-fakten/landwirtschaft", stand: "09/2026" },
    { titel: "Destatis – Bundesländer nach Fläche und Bevölkerung, 31.12.2024", url: "https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/02-bundeslaender.html", stand: "09/2026" },
    { titel: "PVGIS 5.3 – Europäische Kommission, JRC", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/", stand: "09/2026" },
  ],
  unsicher: [
    "Kein Beleg für eine § 37c-Beschränkungsverordnung SH nach Solarpaket I gefunden (Clearingstelle listet SH nicht). Formulierung bewusst vorsichtig. Genaue Ausdehnung der benachteiligten Gebiete in SH nicht recherchiert (Landtag Drs. 18/4636 vermutete v. a. Geest).",
    "LEP-Änderung zu Kap. 4.5.2 (Solar) nicht gefunden. Die 2026 beschlossene LEP-Teilfortschreibung betrifft Windenergie (Kap. 4.5.1). Ob sich daraus Folgen für Solar ergeben, ist offen.",
    "Solarleistung Ende 2025 (4.570 MW, davon 2.117 MW Freifläche in 704 Anlagen) laut Fachagentur-Länderinfo, nicht direkt aus MaStR geprüft.",
    "Bürgerenergiefonds: Details (Förderhöhe bis 200.000 €, mind. sieben Personen) nur über Fachagentur belegt. Förderhöhe nicht im Text genannt.",
    "Ob SH ein Landesgesetz zur Pflicht-Beteiligung von Gemeinden an Solarparks plant oder hat, nicht recherchiert (WebSearch-Budget erschöpft). Daher nur § 6 EEG erwähnt.",
    "Stadtwerke-Netze als VNB nur beispielhaft genannt, keine Rangfolge nach Größe recherchiert.",
    "Keine eigenen PVGIS-Zahlen für die Westküste abgefragt. Spanne basiert auf Rendsburg (979) und Fehmarn (1.113), Nordfriesland bei Niebüll rund 985.",
  ],
};

export default region;
