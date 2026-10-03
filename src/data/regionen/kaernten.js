// Recherche: 29.09.2026 – Kärntner Photovoltaikanlagen-Verordnung 2024 (LGBl. Nr. 58/2024, Volltext), K-ElWOG § 6
// (RIS, Fassung 15.08.2024), Land Kärnten (Regierungssitzung 30.07.2024), LK Kärnten, WKO Kärnten PV-Checkliste
// (Stand März 2023, Naturschutz), energynewsmagazine (13.02.2026, Beschleunigungsgebiete), Statistik Austria
// Agrarstrukturerhebung 2023, WKO Fläche 2025, RIS EAG § 33, PVGIS v5.3.
import { fristenAT } from "./fristen";

const region = {
  slug: "kaernten",
  land: "AT",
  name: "Kärnten",
  inName: "in Kärnten",
  kurz: "K",
  seoTitel: "Solarpark & Agri-PV Kärnten: Pacht, Recht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht Kärnten: 4-ha-Grenze der Photovoltaikanlagen-Verordnung 2024, Widmung Grünland-PV, Agri-PV mit Beweidung oder Obstbau, Netz und Verfahren.",
  lead: "Kärnten hat die Freiflächen-PV mit der Photovoltaikanlagen-Verordnung 2024 eng gefasst: Widmungen im Grünland sind grundsätzlich auf 4 ha je zusammenhängender Fläche begrenzt, dafür hat Agri-PV erstmals eigene Regeln.",
  akzent: "mit 4-ha-Grenze und Agri-PV.",
  ertrag: {
    kwhProKwp: 1240,
    ort: "im Zollfeld nördlich von Klagenfurt",
    spanne: "rund 1.230 bis 1.240 kWh/kWp",
    hinweis: "Zweiter PVGIS-Punkt im unteren Lavanttal; nach PVGIS liegen die Kärntner Beckenlagen damit etwas über den Werten für das Burgenland oder Wien.",
  },
  eckdaten: {
    hauptstadt: "Klagenfurt am Wörthersee",
    flaecheKm2: 9537,
    lfHa: 204485,
    lfJahr: 2023,
    quelle: {
      titel: "Statistik Austria – Agrarstrukturerhebung 2023 (Pressemitteilung 26.06.2025); Fläche: WKO/Statistik Austria, Stand 01.01.2025",
      url: "https://www.statistik.at/fileadmin/announcement/2025/06/20250626AS2023.pdf",
    },
  },
  einleitung: [
    "In Kärnten regelt seit 15. August 2024 die **Kärntner Photovoltaikanlagen-Verordnung 2024 (K-PhV 2024)**, wo und wie groß Photovoltaikanlagen sein dürfen. Sie ersetzt die Verordnung aus 2013 und setzt zugleich Vorgaben der EU-Richtlinie RED III um. Das Land verfolgt damit ausdrücklich einen schrittweisen, netzverträglichen Ausbau, der die Landschaftsstruktur schont: Viele Anlagen auf Gebäuden, Parkplätzen, Infrastruktur- und Betriebsflächen sind ohne eigene Widmung zulässig, große Parks im Grünland dagegen nicht.",
    "Für Flächeneigentümer ist die zentrale Zahl die **4-ha-Grenze**: Eine zusammenhängende Widmungsfläche „Grünland – Photovoltaikanlage“ darf grundsätzlich höchstens 4 ha groß sein, zwischen zwei Widmungsflächen ist ein Abstand von 1.000 m einzuhalten. Auf vorbelasteten oder versiegelten Flächen und für Pilotanlagen sind bis zu 10 ha möglich, in besonders begründeten Einzelfällen mehr. Großflächige Solarparks wie in Niederösterreich oder im Burgenland sind in Kärnten damit die Ausnahme.",
    "Die Landwirtschaft ist in Kärnten stark vom Grünland und von der Viehhaltung geprägt; laut Agrarstrukturerhebung 2023 bewirtschafteten 9.068 Betriebe rund 204.000 ha. Für Freiflächen-PV kommen wegen der Gebirgslage vor allem Becken und Talböden infrage, etwa das Klagenfurter Becken oder das Lavanttal – und gerade dort schützt die Verordnung hochwertige Böden ausdrücklich.",
  ],
  recht: [
    {
      titel: "Widmung „Grünland – Photovoltaikanlage“, max. 4 ha",
      text: "Freiflächenanlagen, die nicht unter die Ausnahmen fallen, dürfen nur auf Flächen errichtet werden, die im Flächenwidmungsplan als „Grünland – Photovoltaikanlage“ gewidmet sind. Die zusammenhängende Widmungsfläche darf 4 ha nicht überschreiten; für Pilot- und Forschungsanlagen sowie auf vorbelasteten oder versiegelten Flächen sind bis zu 10 ha zulässig, in besonders begründeten Einzelfällen mehr. Zwischen Widmungsflächen gilt ein Mindestabstand von 1.000 m (§ 5 K-PhV 2024).",
      quelle: { titel: "RIS – Kärntner Photovoltaikanlagen-Verordnung 2024, LGBl. Nr. 58/2024", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=LrK&Gesetzesnummer=20000749" },
    },
    {
      titel: "Standorte: Nähe zu Infrastruktur, Ausschlussflächen",
      text: "Standorte sind so zu wählen, dass keine erheblichen Umweltauswirkungen zu erwarten sind; hochwertige Böden sollen möglichst geschützt werden. Zum Schutz der freien Landschaft sind Parks – ausgenommen Agri-PV mit Beweidung – im Nahebereich bestehender Infrastruktur vorzusehen, etwa bei Kläranlagen, Abfallbehandlungs-, Fernwärme- und Wasserkraftanlagen, Umspannwerken oder Autobahnmeistereien. Ausgeschlossen sind unter anderem Wildtierkorridore, hochwertige zusammenhängende Agrarflächen ab 30 ha, rote Gefahrenzonen und engere Trinkwasserschutzgebiete (§ 6 K-PhV 2024).",
      quelle: { titel: "RIS – Kärntner Photovoltaikanlagen-Verordnung 2024, LGBl. Nr. 58/2024", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=LrK&Gesetzesnummer=20000749" },
    },
    {
      titel: "Elektrizitätsrecht: Genehmigung über 500 kW",
      text: "Nach § 6 K-ElWOG in der seit 15.08.2024 geltenden Fassung bedürfen Erzeugungsanlagen mit mehr als 500 kW Engpassleistung einer elektrizitätswirtschaftsrechtlichen Genehmigung der Landesregierung; PV-Anlagen auf bestehenden baulichen Anlagen sind ausgenommen. Dem Antrag ist unter anderem eine Stellungnahme der Gemeinde beizulegen, dass das Vorhaben dem Flächenwidmungsplan bzw. der Photovoltaikanlagen-Verordnung entspricht.",
      quelle: { titel: "RIS – K-ElWOG § 6 und § 7", url: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=LrK&Gesetzesnummer=20000239&Paragraf=6" },
    },
    {
      titel: "Naturschutz: Bewilligung im gewidmeten Grünland",
      text: "Nach der PV-Checkliste der Wirtschaftskammer Kärnten sind PV-Anlagen im gewidmeten Grünland grundsätzlich nach dem Kärntner Naturschutzgesetz 2002 bewilligungspflichtig; zuständig ist die Bezirksverwaltungsbehörde. Zusätzliche Anforderungen gelten in Alpinregionen, Feuchtgebieten, Natur-, Landschafts- und Europaschutzgebieten.",
      quelle: { titel: "WKO Kärnten – Checkliste für die Realisierung einer PV-Anlage in Kärnten (Stand März 2023)", url: "https://www.wko.at/ktn/industrie/pv-checkliste-si-broschu-re-a4-web-30-.pdf" },
    },
    {
      titel: "Beschleunigungsgebiete: für PV keine weiteren geplant",
      text: "Nach Angaben des Landes vom Februar 2026 ist in Kärnten für Photovoltaik keine weitere Ausweisung von Beschleunigungsgebieten geplant; entsprechende Flächen seien bereits über die Photovoltaikanlagen-Verordnung von Widmungspflichten ausgenommen. Die Verordnung selbst ist spätestens drei Jahre nach Inkrafttreten, also bis August 2027, zu evaluieren.",
      quelle: { titel: "energynewsmagazine – Beschleunigungszonen für erneuerbare Energie: Länder spät (13.02.2026)", url: "https://www.energynewsmagazine.at/2026/02/13/beschleunigungszonen-fuer-erneuerbare-energie-laender-spaet/" },
    },
    {
      titel: "EAG: 25 % Abschlag, Ausnahme für Agri-PV",
      text: "Für Anlagen auf landwirtschaftlich genutzten Flächen oder im Grünland verringert sich der Zuschlagswert der EAG-Marktprämie um 25 %. Agri-PV-Anlagen, bei denen die landwirtschaftliche Hauptnutzung nicht oder nur gering beeinträchtigt wird, können ausgenommen sein – in Kärnten ein zusätzliches Argument für Agri-PV.",
      quelle: { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790" },
    },
    ...fristenAT(),
  ],
  kulisse: {
    text: "Weil die Widmungsfläche auf 4 ha begrenzt ist, geht es in Kärnten weniger um die große Fläche als um den richtigen Standort: nahe an bestehender Infrastruktur, außerhalb der Schutz- und Gefahrenzonen und nicht auf den besten Böden. Vorbelastete Flächen haben einen doppelten Vorteil, weil dort bis 10 ha möglich sind. Für Agri-PV mit Beweidung gilt die Pflicht zur Infrastrukturnähe nicht.",
    gut: [
      "Flächen neben Umspannwerken, Kläranlagen, Wasserkraftwerken oder Autobahnmeistereien",
      "vorbelastete oder versiegelte Flächen (bis 10 ha Widmungsfläche)",
      "Weideflächen für Agri-PV mit ausreichendem Viehbesatz",
      "Intensivobstanlagen mit Stein- oder Kernobst, Geflügelhaltung oder Fischzucht (Agri-PV ohne eigene Widmung)",
    ],
    schwierig: [
      "zusammenhängende hochwertige Agrarflächen ab 30 ha mit besonders bedeutsamen Böden",
      "Nationalparke, Naturparke, Biosphärenparke, Natura-2000-, Natur- und Landschaftsschutzgebiete",
      "Wildtierkorridore sowie rote Gefahrenzonen der Wildbach- und Flussgebietsplanung",
      "rutschungs-, muren- oder steinschlaggefährdete Hänge",
      "Flächen innerhalb von 1.000 m zu einer bestehenden PV-Widmung",
    ],
  },
  ablauf: {
    text: "Am Anfang steht die Gemeinde: Sie muss die Fläche als „Grünland – Photovoltaikanlage“ oder „Grünland – Agri-Photovoltaikanlage“ widmen, das Land prüft die Widmung als Aufsichtsbehörde. Parallel sollte die Netzanfrage bei KNG-Kärnten Netz gestellt werden. Über 500 kW folgt die Genehmigung nach dem K-ElWOG bei der Landesregierung, dazu in der Regel die naturschutzrechtliche Bewilligung bei der Bezirkshauptmannschaft sowie gegebenenfalls Wasser- und Forstrecht. Die Verordnung erlaubt Gemeinden ausdrücklich privatwirtschaftliche Maßnahmen, etwa Raumordnungsverträge mit Standortkriterien.",
    behoerden: [
      { name: "Gemeinde (Gemeinderat)", rolle: "Widmung Grünland-PV bzw. Grünland-Agri-PV, Stellungnahme zum ElWOG-Antrag, Raumordnungsverträge" },
      { name: "Amt der Kärntner Landesregierung (Raumordnung)", rolle: "Aufsicht über Widmungen, Photovoltaikanlagen-Verordnung" },
      { name: "Kärntner Landesregierung (Energierecht)", rolle: "Genehmigung nach K-ElWOG über 500 kW" },
      { name: "Bezirkshauptmannschaft", rolle: "Naturschutz, Wasser- und Forstrecht" },
    ],
  },
  agri: [
    "Die K-PhV 2024 unterscheidet erstmals zwischen Agri-PV und anderen Freiflächenanlagen. Als Agri-PV gilt eine Anlage auf einer nachhaltig landwirtschaftlich genutzten Kulturfläche, die entweder dem **Schutz und der Beschattung von Intensivobstbau mit Stein- und Kernobst, Geflügelhaltung oder Fischzucht** dient oder auf einer Weidefläche mit mindestens **1,5 Großvieheinheiten je Hektar an mindestens 120 Tagen im Jahr** liegt. Die Nachhaltigkeit ist mit einem landwirtschaftlichen Betriebskonzept nachzuweisen; die Gemeinde kann alle fünf Jahre eine Kopie des Mehrfachantrags verlangen.",
    "Für die erste Gruppe – Obstbau, Geflügel, Fischzucht – braucht es keine eigene Widmung. Weide-Agri-PV ist dagegen nur auf Flächen mit der Widmung „Grünland – Agri-Photovoltaikanlage“ zulässig, muss aber nicht in der Nähe von Infrastruktur liegen. Für Betriebe mit Weidehaltung kann Weide-Agri-PV damit der realistischste Weg zu einer PV-Nutzung ihrer Flächen sein – vorausgesetzt, der geforderte Viehbesatz wird tatsächlich gehalten.",
  ],
  netz: {
    uenb: ["APG (Austrian Power Grid)"],
    vnb: ["KNG-Kärnten Netz"],
    hinweis: "Das Land begründet die 4-ha-Grenze auch mit einem netzverträglichen Ausbau; für größere Parks ist die Netzkapazität im nächsten Umspannwerk früh zu klären.",
    quelle: { titel: "Land Kärnten – Regierungssitzung: Kärnten bekommt neue Regeln für Photovoltaik (30.07.2024)", url: "https://www.ktn.gv.at/Service/News?nid=37456" },
  },
  besonderheiten: [
    { titel: "Seen- und Tourismuslandschaft", text: "Rund um die großen Seen und in touristisch geprägten Tälern hat das Landschaftsbild besonderes Gewicht. Die Verordnung lenkt Freiflächenanlagen deshalb gezielt an bestehende Infrastruktur; Landschaftsschutzgebiete kommen nur infrage, wenn die Anlage mit dem Schutzzweck vereinbar ist." },
    { titel: "Naturgefahren im Gebirgsland", text: "Ein großer Teil Kärntens ist alpin. Standorte mit hoher Anfälligkeit für Steinschlag, Rutschungen, Muren oder Lawinen sowie rote Gefahrenzonen sind ausdrücklich ausgeschlossen – das engt die Kulisse auf Becken und Talböden ein." },
    { titel: "Evaluierung bis 2027", text: "Die Verordnung ist spätestens drei Jahre nach Inkrafttreten auf energiewirtschaftliche Effektivität zu evaluieren. Änderungen an der 4-ha-Grenze sind damit nicht ausgeschlossen, zum Recherchestand aber nicht beschlossen." },
  ],
  pacht: {
    tendenz: "unten",
    begruendung: "Die Begrenzung auf 4 ha je Widmungsfläche mit 1.000 m Abstand und der EAG-Abschlag machen Projekte kleinteilig; die sehr gute Einstrahlung gleicht das nur teilweise aus.",
  },
  faq: [
    { q: "Wie groß darf ein Solarpark in Kärnten sein?", a: "Eine zusammenhängende Widmungsfläche für PV darf grundsätzlich höchstens 4 ha groß sein. Auf vorbelasteten oder versiegelten Flächen und für Pilotanlagen sind bis zu 10 ha möglich, in besonders begründeten Einzelfällen mehr. Zwischen zwei Widmungsflächen sind 1.000 m Abstand einzuhalten." },
    { q: "Brauche ich für eine Freiflächenanlage in Kärnten eine Widmung?", a: "Ja, außer in den Ausnahmefällen der Verordnung, etwa auf Infrastruktur- und Betriebsflächen, über Parkplätzen oder für Agri-PV im Obstbau, bei Geflügel und Fischzucht. Sonst ist die Widmung „Grünland – Photovoltaikanlage“ bzw. für Weide-Agri-PV „Grünland – Agri-Photovoltaikanlage“ nötig." },
    { q: "Was gilt in Kärnten als Agri-PV?", a: "Anlagen, die Intensivobstbau mit Stein- und Kernobst, Geflügelhaltung oder Fischzucht schützen oder beschatten, oder Anlagen auf Weideflächen mit mindestens 1,5 Großvieheinheiten je Hektar an mindestens 120 Tagen im Jahr. Die landwirtschaftliche Nutzung ist mit einem Betriebskonzept nachzuweisen." },
    { q: "Welche Flächen sind in Kärnten ausgeschlossen?", a: "Unter anderem Wildtierkorridore, hochwertige zusammenhängende Agrarflächen ab 30 ha, Schutzgebiete, wenn die Anlage dem Schutzzweck widerspricht, rote Gefahrenzonen, engere Trinkwasserschutzgebiete und Hänge mit hoher Anfälligkeit für Massenbewegungen." },
    { q: "Ab wann braucht es eine Genehmigung nach dem Elektrizitätsrecht?", a: "Nach dem K-ElWOG ab mehr als 500 kW Engpassleistung. Zuständig ist die Kärntner Landesregierung; die Gemeinde bestätigt im Antrag, dass das Vorhaben der Widmung entspricht." },
    { q: "Lohnt sich die Verpachtung für einen Solarpark in Kärnten?", a: "Wegen der kleinen zulässigen Flächen eher für Standorte mit Infrastruktur- oder Netznähe, vorbelastete Flächen und Agri-PV. Mit dem Pachtrechner lässt sich prüfen, was eine Fläche von wenigen Hektar realistisch bringt." },
  ],
  quellen: [
    { titel: "RIS – Kärntner Photovoltaikanlagen-Verordnung 2024 (K-PhV 2024), LGBl. Nr. 58/2024", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=LrK&Gesetzesnummer=20000749", stand: "09/2026" },
    { titel: "RIS – Kärntner Elektrizitätswirtschafts- und -organisationsgesetz 2011 (K-ElWOG) § 6", url: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=LrK&Gesetzesnummer=20000239&Paragraf=6", stand: "09/2026" },
    { titel: "Land Kärnten – Regierungssitzung: Kärnten bekommt neue Regeln für Photovoltaik (30.07.2024)", url: "https://www.ktn.gv.at/Service/News?nid=37456", stand: "09/2026" },
    { titel: "Landwirtschaftskammer Kärnten – Photovoltaik auf Freiflächen", url: "https://ktn.lko.at/photovoltaik-auf-freifl%C3%A4chen+2400+4078042", stand: "09/2026" },
    { titel: "WKO Kärnten – Checkliste für die Realisierung einer PV-Anlage in Kärnten (Stand März 2023)", url: "https://www.wko.at/ktn/industrie/pv-checkliste-si-broschu-re-a4-web-30-.pdf", stand: "09/2026" },
    { titel: "energynewsmagazine – Beschleunigungszonen für erneuerbare Energie: Länder spät (13.02.2026)", url: "https://www.energynewsmagazine.at/2026/02/13/beschleunigungszonen-fuer-erneuerbare-energie-laender-spaet/", stand: "09/2026" },
    { titel: "Statistik Austria – Agrarstrukturerhebung 2023 (Pressemitteilung 26.06.2025)", url: "https://www.statistik.at/fileadmin/announcement/2025/06/20250626AS2023.pdf", stand: "09/2026" },
    { titel: "WKO Statistik – Fläche und Benützungsarten, Stand 1. Jänner 2025", url: "https://www.wko.at/statistik/bundesland/flaecheben.pdf", stand: "09/2026" },
    { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790", stand: "09/2026" },
    { titel: "PVGIS 5.3 (JRC) – PVcalc, 46,68° N / 14,37° O und 46,80° N / 14,85° O", url: "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=46.68&lon=14.37&peakpower=1&loss=14&optimalangles=1&outputformat=json", stand: "09/2026" },
  ],
  unsicher: [
    "Ob die 4-ha-Grenze nach § 5 Abs. 2 K-PhV auch für Widmungen „Grünland – Agri-Photovoltaikanlage“ gilt: Wortlaut verweist auf Abs. 1 (beide Widmungen), nicht durch Behördenquelle bestätigt – im Text daher nicht ausdrücklich behauptet.",
    "Naturschutz-Bewilligungspflicht nur aus WKO-Checkliste Stand März 2023 (vor K-PhV 2024); aktuellen Wortlaut K-NSG 2002 § 5 nicht geprüft.",
    "Vereinfachtes Verfahren im K-ElWOG (Checkliste 2023: bis 500 kW) nach der Novelle 2024 nicht geprüft, daher weggelassen.",
    "Weitere Verteilernetzbetreiber (z. B. städtische Netze) nicht belegt, nur KNG-Kärnten Netz genannt.",
    "Konkrete Netzengpässe in Kärnten nicht belegt.",
    "Die Ratgeber-Angabe „Widmung ab rund 100 m²“ entspricht der 100-m²-Ausnahme für Haus- und Vorgärten (§ 4 Abs. 5); eine allgemeine Flächenschwelle für Freiflächen kennt die K-PhV nicht.",
  ],
};

export default region;
