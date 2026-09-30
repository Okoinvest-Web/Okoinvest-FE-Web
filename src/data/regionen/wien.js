// Recherche: 29.09.2026 – Stadt Wien (Sonnenstrom-Offensive, Statistik Landwirtschaft, Energiestrategien),
// MA 37 Richtlinie PV-Anlagen (10.07.2026, BO-Novelle 2023, WElWG 2005), RIS Bauordnung für Wien § 6,
// Wien Energie (Schafflerhofstraße 11.06.2021 und 28.09.2023; Top-10-Solarkraftwerke 29.04.2025),
// Statistik Austria Agrarstrukturerhebung 2023, WKO Fläche 2025, RIS EAG § 33, PVGIS v5.3.
const region = {
  slug: "wien",
  land: "AT",
  name: "Wien",
  inName: "in Wien",
  kurz: "W",
  seoTitel: "Solarpark & Agri-PV Wien: Pacht, Recht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht Wien: Warum große Freiflächen-PV in Wien selten ist, was Bauordnung und WElWG verlangen und wo Agri-PV auf Wiener Äckern möglich wird.",
  lead: "Wien setzt beim Sonnenstrom vor allem auf Dächer, Fassaden und Infrastruktur. Freiflächenanlagen sind die Ausnahme – es gibt sie aber, etwa in der Donaustadt, und die Stadt hat noch landwirtschaftliche Flächen im Süden, Norden und Osten.",
  akzent: "mit wenig Fläche, aber Potenzial.",
  ertrag: {
    kwhProKwp: 1190,
    ort: "in der Donaustadt",
    spanne: "rund 1.180 bis 1.190 kWh/kWp",
    hinweis: "Zweiter PVGIS-Punkt in Floridsdorf nördlich der Donau.",
  },
  eckdaten: {
    hauptstadt: "Wien",
    flaecheKm2: 415,
    lfHa: 6275,
    lfJahr: 2023,
    quelle: {
      titel: "Statistik Austria – Agrarstrukturerhebung 2023 (Pressemitteilung 26.06.2025); Fläche: WKO/Statistik Austria, Stand 01.01.2025",
      url: "https://www.statistik.at/fileadmin/announcement/2025/06/20250626AS2023.pdf",
    },
  },
  einleitung: [
    "Ehrlich vorweg: **Wien ist kein Land für große Solarparks.** Auf 415 km² Stadtfläche stehen Wohn- und Gewerbegebiete, Wienerwald, Donauinsel, Lobau und Erholungsgebiete in Konkurrenz um jeden Hektar. Die Stadt setzt deshalb mit ihrer Sonnenstrom-Offensive vor allem auf Dächer, Fassaden, Parkplätze und städtische Infrastruktur. Ziel sind 800 MWp installierte PV-Leistung bis 2030; nach Angaben der Stadt waren im Februar 2026 über 330 MWp erreicht, nach rund 50 MWp im Jahr 2020.",
    "Trotzdem hat Wien eine echte Landwirtschaft: Laut Agrarstrukturerhebung 2023 bewirtschafteten 455 Betriebe rund 6.300 ha. Nach Angaben der Stadt wird rund ein Drittel der Wiener Grünflächen landwirtschaftlich genutzt – Ackerbau vor allem am Südrand in Favoriten sowie in Floridsdorf und der Donaustadt, Gärtnereien in Simmering und der Donaustadt, Weinbau an Kahlenberg, Nußberg und Bisamberg. Wien ist nach eigenen Angaben die einzige Großstadt mit Weinbau innerhalb der Stadtgrenze und bundesweit führend beim Fruchtgemüse aus dem Glashaus.",
    "Für Flächeneigentümer bedeutet das: Eine klassische Freiflächenanlage auf gutem Ackerboden ist in Wien die Ausnahme. Realistische Ansatzpunkte sind vorbelastete Flächen wie ehemalige Deponien, Flächen neben Infrastruktur und Agri-PV-Konzepte, die die landwirtschaftliche Nutzung erhalten. Das bekannteste Beispiel ist die Anlage von Wien Energie an der Schafflerhofstraße in der Donaustadt.",
  ],
  recht: [
    {
      titel: "Widmung: ländliche Gebiete sind für die Landwirtschaft bestimmt",
      text: "In Wien legt der Gemeinderat die Nutzung im Flächenwidmungs- und Bebauungsplan fest. Nach § 6 der Bauordnung für Wien sind ländliche Gebiete für land- und forstwirtschaftliche oder berufsgärtnerische Nutzung bestimmt; zulässig sind dort Bauwerke für diese Zwecke und für öffentliche Zwecke. Eine eigene Widmungskategorie für Freiflächen-PV, wie sie andere Bundesländer kennen, sieht § 6 nicht vor. Ob eine Freiflächenanlage auf einer bestimmten Fläche zulässig ist, hängt deshalb stark von der konkreten Widmung und einer Prüfung durch die Stadt ab.",
      quelle: { titel: "RIS – Bauordnung für Wien § 6", url: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=LrW&Gesetzesnummer=20000006&Paragraf=6" },
    },
    {
      titel: "Bauordnung: Bewilligung im Grünland-Schutzgebiet",
      text: "Seit der Bauordnungsnovelle 2023 (in Kraft 14.12.2023) sind PV-Anlagen grundsätzlich bewilligungsfrei nach § 62a BO. Eine Baubewilligung ist aber jedenfalls nötig im **Grünland-Schutzgebiet** und in Gebieten mit Bausperre, außerdem in bestimmten Fällen in Schutzzonen und für Anlagen über 15 kW, die weder nach dem Elektrizitätsrecht noch nach anderen Materiengesetzen geprüft werden. Freistehende Module auf Rasenflächen im Kleingartengebiet sind nicht zulässig.",
      quelle: { titel: "Stadt Wien, MA 37 – Richtlinie Errichtung von Fotovoltaikanlagen (10.07.2026)", url: "https://www.wien.gv.at/pdf/ma37/rl-pv-anlagen-2024.pdf" },
    },
    {
      titel: "Elektrizitätsrecht: Genehmigung schon über 250 kW",
      text: "Nach dem Wiener Elektrizitätswirtschaftsgesetz 2005 (WElWG 2005) sind PV-Anlagen mit mehr als 15 kW bis 50 kW anzuzeigen, über 50 kW bis 250 kW gilt ein vereinfachtes Verfahren, über 250 kW ist eine Genehmigung nötig. Zuständig ist die MA 64. Die Schwelle liegt damit deutlich niedriger als in den Flächenländern, wo die Landesgenehmigung meist erst ab 500 oder 1.000 kW greift.",
      quelle: { titel: "Stadt Wien, MA 37 – Richtlinie Errichtung von Fotovoltaikanlagen (10.07.2026)", url: "https://www.wien.gv.at/pdf/ma37/rl-pv-anlagen-2024.pdf" },
    },
    {
      titel: "Sonnenstrom-Offensive: 800 MWp bis 2030",
      text: "Die Stadt will bis 2030 PV-Anlagen mit insgesamt 800 MWp installiert haben, was jährlich einen Zubau in der Größenordnung von rund 200 Fußballfeldern erfordert. Die Stadt errichtet selbst Anlagen auf eigenen Gebäuden und Flächen und baut Beratung und Förderung für private Eigentümer, Bauträger und Betriebe aus. Der Schwerpunkt liegt klar auf bereits genutzten Flächen.",
      quelle: { titel: "Stadt Wien – Wiener Sonnenstrom-Offensive", url: "https://sonnenstrom.wien.gv.at/" },
    },
    {
      titel: "EAG: 25 % Abschlag auch in Wien",
      text: "Auch in Wien verringert sich der Zuschlagswert der EAG-Marktprämie für Anlagen auf landwirtschaftlich genutzten Flächen oder im Grünland um 25 %. Ausgenommen sein können Agri-PV-Anlagen mit nicht oder nur gering beeinträchtigter Hauptnutzung sowie vorbelastete Flächen wie Deponien – in Wien die naheliegenden Fälle.",
      quelle: { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790" },
    },
  ],
  kulisse: {
    text: "Die größte Wiener Freiflächenanlage steht auf einer ehemaligen Schotterdeponie der Stadt. Die übrigen Freiflächenanlagen in der Liste der zehn größten Wiener Solarkraftwerke von Wien Energie haben jeweils unter 1 MWp, etwa in Liesing, am Kraftwerk Donaustadt, am Zentralfriedhof oder am Gasspeicher Leopoldau. Für private Flächeneigentümer ist das ein Hinweis, wo Projekte realistisch sind: auf vorbelasteten oder technisch genutzten Flächen und in Agri-PV-Konzepten am Stadtrand.",
    gut: [
      "vorbelastete Flächen wie ehemalige Deponien oder Schottergruben",
      "Flächen neben Kraftwerken, Umspannwerken und Betriebsgeländen",
      "Ackerflächen am Stadtrand für Agri-PV mit weiterlaufender Bewirtschaftung",
      "Flächen mit Beweidung oder extensiver Grünlandnutzung",
    ],
    schwierig: [
      "Grünland-Schutzgebiete, Wald- und Wiesengürtel",
      "Nationalpark Donau-Auen (Lobau) und Biosphärenpark Wienerwald",
      "Weinbauflächen an Kahlenberg, Nußberg und Bisamberg",
      "Flächen in Stadtentwicklungsgebieten mit absehbarer Umwidmung",
      "Kleingartengebiete (Module auf Freiflächen unzulässig)",
    ],
  },
  ablauf: {
    text: "Weil Wien Land und Gemeinde zugleich ist, laufen Widmung und Landesverfahren in einer Hand: Die Stadtplanung prüft, ob die Nutzung mit dem Flächenwidmungs- und Bebauungsplan vereinbar ist, Änderungen beschließt der Gemeinderat. Für Anlagen über 250 kW folgt die elektrizitätsrechtliche Genehmigung durch die MA 64, im Grünland-Schutzgebiet zusätzlich eine Baubewilligung durch die MA 37. Naturschutzrechtliche Fragen sind in Schutzgebieten gesondert zu klären. Den Netzanschluss stellt Wiener Netze her.",
    behoerden: [
      { name: "Gemeinderat und Stadtplanung (Flächenwidmung)", rolle: "Flächenwidmungs- und Bebauungsplan, Prüfung der Zulässigkeit", url: "https://www.wien.gv.at/stadtplanung/flaechenwidmung" },
      { name: "MA 64 (Energierecht)", rolle: "Anzeige und Genehmigung nach WElWG 2005" },
      { name: "MA 37 – Baupolizei", rolle: "Baubewilligung im Grünland-Schutzgebiet, in Bausperren und Sonderfällen" },
      { name: "Wiener Netze", rolle: "Netzzugang und Netzanschluss" },
    ],
  },
  agri: [
    "Wien hat ein bekanntes Agri-PV-Versuchsfeld: An der Schafflerhofstraße in der Donaustadt betreibt Wien Energie seit 2021 eine Freiflächenanlage, die 2023 auf rund 17 MW und 16,8 ha erweitert wurde. Zwischen den südausgerichteten Reihen weiden rund 150 Schafe, zusätzlich stehen rund 400 bifaziale, vertikal montierte Module, zwischen denen landwirtschaftlicher Anbau möglich ist. Die landwirtschaftliche Doppelnutzung wird gemeinsam mit der Universität für Bodenkultur erforscht.",
    "Für Wiener Landwirte mit Ackerflächen am Südrand, in Floridsdorf oder der Donaustadt sind vertikale Anlagen oder hoch aufgeständerte Systeme die naheliegende Form, weil Getreide-, Zuckerrüben- und Gemüsebau weiterlaufen können. Förderrechtlich kann eine echte Agri-PV-Nutzung den 25-%-Abschlag beim EAG vermeiden. Wie sich Agri-PV-Anlagen mit der Widmung „ländliches Gebiet“ vertragen, sollte vor jeder Vertragsbindung mit der Stadtplanung geklärt werden.",
  ],
  netz: {
    uenb: ["APG (Austrian Power Grid)"],
    vnb: ["Wiener Netze"],
    hinweis: "Belastbare Angaben zu Netzengpässen in Wien lagen nicht vor; Anschlusspunkt und freie Kapazität sind im Einzelfall bei Wiener Netze anzufragen.",
  },
  besonderheiten: [
    { titel: "Deponie statt Acker", text: "Die größte Freiflächenanlage Wiens steht auf einer ehemaligen Schotterdeponie der Stadt. Vorbelastete Flächen sind in Wien der wichtigste Flächentyp für Freiflächen-PV – und förderrechtlich vom EAG-Abschlag ausgenommen." },
    { titel: "Gemüse und Glashäuser", text: "Wien liegt nach Angaben der Stadt bundesweit an erster Stelle bei Fruchtgemüse wie Gurken, Paradeisern und Melanzani, angebaut im Freiland und unter Glas; die Gärtnereien liegen vor allem in Simmering und der Donaustadt. Für Gärtnereibetriebe liegen PV auf Dächern und Nebenflächen näher als auf der Anbaufläche selbst." },
    { titel: "Weinbau in der Stadt", text: "Die Wiener Weinberge an Kahlenberg, Nußberg und Bisamberg prägen Landschaftsbild und Tourismus. Freiflächenanlagen spielen dort nach aktuellem Stand keine Rolle." },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung: "Wenige geeignete Flächen, kurze Netzwege und hohe Nachfrage nach Sonnenstrom stehen der Konkurrenz durch Stadtentwicklung und Naturschutz sowie dem EAG-Abschlag gegenüber; in Wien hängt fast alles vom Einzelfall ab.",
  },
  faq: [
    { q: "Kann ich in Wien meine Fläche für einen Solarpark verpachten?", a: "Grundsätzlich ja, aber nur in Einzelfällen. Wien setzt vor allem auf Dächer und Infrastruktur; größere Freiflächenanlagen gibt es bisher vor allem auf vorbelasteten oder städtischen Flächen. Ob Ihre Fläche infrage kommt, hängt von Widmung, Schutzgebieten und Netzanschluss ab." },
    { q: "Was ist die größte PV-Freiflächenanlage in Wien?", a: "Nach Angaben von Wien Energie die Anlage an der Schafflerhofstraße in der Donaustadt mit rund 17 MW auf 16,8 ha, errichtet auf einer ehemaligen Schotterdeponie und kombiniert mit Schafbeweidung und einem Agri-PV-Versuchsbereich." },
    { q: "Welche Genehmigungen braucht eine PV-Anlage in Wien?", a: "Nach dem WElWG 2005 über 15 kW eine Anzeige, über 50 kW ein vereinfachtes Verfahren und über 250 kW eine Genehmigung der MA 64. Im Grünland-Schutzgebiet und in Bausperren ist zusätzlich eine Baubewilligung nötig." },
    { q: "Ist Agri-PV in Wien möglich?", a: "Ja, Wien Energie erprobt mit der Universität für Bodenkultur vertikale bifaziale Module an der Schafflerhofstraße. Für eigene Flächen sollte die Vereinbarkeit mit der Widmung „ländliches Gebiet“ früh mit der Stadt geklärt werden." },
    { q: "Welches Ausbauziel hat Wien für Photovoltaik?", a: "Die Sonnenstrom-Offensive der Stadt sieht 800 MWp bis 2030 vor. Im Februar 2026 waren nach Angaben der Stadt über 330 MWp installiert." },
    { q: "Wie viel Pacht ist in Wien realistisch?", a: "Das lässt sich in Wien kaum pauschal sagen, weil nur wenige Flächen infrage kommen und jede Fläche einzeln geprüft wird. Entscheidend sind Widmung, Vorbelastung und Förderfähigkeit. Eine erste Orientierung gibt der Pachtrechner." },
  ],
  quellen: [
    { titel: "Stadt Wien – Wiener Sonnenstrom-Offensive", url: "https://sonnenstrom.wien.gv.at/", stand: "09/2026" },
    { titel: "Stadt Wien, MA 37 – Richtlinie Errichtung von Fotovoltaikanlagen (PV-Anlagen), 10.07.2026", url: "https://www.wien.gv.at/pdf/ma37/rl-pv-anlagen-2024.pdf", stand: "09/2026" },
    { titel: "RIS – Bauordnung für Wien § 6 (Zulässige Nutzungen)", url: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=LrW&Gesetzesnummer=20000006&Paragraf=6", stand: "09/2026" },
    { titel: "Stadt Wien – Statistik Landwirtschaft", url: "https://www.wien.gv.at/statistik/landwirtschaft", stand: "09/2026" },
    { titel: "Wien Energie – Wien Energie erweitert größte Photovoltaik-Anlage Wiens (28.09.2023)", url: "https://www.wienenergie.at/pressrelease/wien-energie-erweitert-groesste-photovoltaik-anlage-wiens/", stand: "09/2026" },
    { titel: "Wien Energie – Photovoltaik-Ausbau: Solarschafe ziehen am Wiener Schafflerhof ein (11.06.2021)", url: "https://www.wienenergie.at/pressrelease/photovoltaik-ausbau-solarschafe-ziehen-am-wiener-schafflerhof-ein/", stand: "09/2026" },
    { titel: "Wien Energie – Die 10 größten Solarkraftwerke Wiens (29.04.2025)", url: "https://www.wienenergie.at/blog/die-10-groessten-solarkraftwerke-wiens/", stand: "09/2026" },
    { titel: "Statistik Austria – Agrarstrukturerhebung 2023 (Pressemitteilung 26.06.2025)", url: "https://www.statistik.at/fileadmin/announcement/2025/06/20250626AS2023.pdf", stand: "09/2026" },
    { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790", stand: "09/2026" },
    { titel: "PVGIS 5.3 (JRC) – PVcalc, 48,22° N / 16,50° O und 48,28° N / 16,42° O", url: "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=48.22&lon=16.50&peakpower=1&loss=14&optimalangles=1&outputformat=json", stand: "09/2026" },
  ],
  unsicher: [
    "Widmungsrechtliche Zulässigkeit von Freiflächen-PV bzw. Agri-PV in „Grünland – ländliche Gebiete“ nicht durch Behördenquelle geklärt; § 6 BO enthält keine PV-Regel – im Text vorsichtig formuliert.",
    "Widmung der Fläche Schafflerhofstraße nicht ermittelt.",
    "Wiener Naturschutzgesetz: Bewilligungspflichten für PV in Schutzgebieten nicht geprüft; nur allgemein erwähnt.",
    "Voller Name der MA 64 nicht geprüft, daher nur „MA 64 (Energierecht)“; Zuständigkeit laut MA-37-Richtlinie.",
    "Keine Agri-PV-Förderprogramme der Stadt Wien gefunden.",
    "Typ (Freifläche/Dach) der kleineren Anlagen aus der Wien-Energie-Top-10-Liste nur per Zusammenfassung übernommen.",
  ],
};

export default region;
