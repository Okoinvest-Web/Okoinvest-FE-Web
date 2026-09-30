// Recherche: 29.09.2026 – Land Tirol: Verfahrenshandbuch PV (02.06.2025), Anlaufstelle Erneuerbare Energie,
// Informationsblatt PV-Freiflächen (11/2022), Studie PV-Freiflächenpotenzial Tirol (08/2022), Presse Land Tirol (TBVO-PV),
// Kundmachung Entwurf TBVO-PV (Auflage 06–07/2026), RIS (§ 33 EAG), Statistik Austria (Agrarstrukturerhebung 2023,
// Bevölkerung 01.01.2026), BEV/WKO (Fläche 01.01.2025), PVGIS v5.3
const region = {
  slug: "tirol",
  land: "AT",
  name: "Tirol",
  inName: "in Tirol",
  kurz: "T",
  seoTitel: "Solarpark & Agri-PV Tirol: Pacht, Recht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht in Tirol: Freiflächen-PV über 250 kW per TEG-Bewilligung, Naturschutz ab 2.500 m², Agri-PV als Maßstab, Parkplätze und Deponien.",
  lead:
    "In Tirol sind große Solarparks auf Agrarflächen die Ausnahme. Chancen bieten vorbelastete Flächen, Infrastruktur und Agri-PV im Inntal – mit sehr gutem Ertrag.",
  akzent: "mit wenig Talboden.",
  ertrag: {
    kwhProKwp: 1370,
    ort: "im Inntal zwischen Innsbruck und Hall",
    spanne: "rund 1.110 kWh/kWp bei Kufstein bis 1.370 kWh/kWp im mittleren Inntal",
    hinweis:
      "Nach PVGIS liegt das mittlere Inntal deutlich über dem Unterland bei Kufstein; in engen Tälern mindert die Horizontabschattung den Ertrag teils stark. PVGIS berücksichtigt die Geländeabschattung am jeweiligen Punkt.",
  },
  eckdaten: {
    hauptstadt: "Innsbruck",
    flaecheKm2: 12648,
    lfHa: 226507,
    lfJahr: 2023,
    einwohner: 779060,
    quelle: {
      titel: "Statistik Austria – Land- und forstwirtschaftliche Betriebe nach Flächennutzung 2023 nach Bundesland",
      url: "https://www.statistik.at/fileadmin/pages/155/LuFBetriebeNachFlaechennutzung2023nBL.ods",
    },
  },
  einleitung: [
    "Tirol ist das Bundesland mit dem kleinsten Dauersiedlungsraum: Nur knapp 13 Prozent der Landesfläche stehen für Landwirtschaft, Siedlung und Verkehr zur Verfügung. Die landwirtschaftlich genutzte Fläche von rund 226.000 Hektar besteht zu einem großen Teil aus Almen und Grünland. Die ebenen Talböden im Inntal, im Unterland und in Osttirol sind knapp und stark umkämpft – von Siedlung, Gewerbe, Verkehr und einer Landwirtschaft, die ihre besten Flächen dringend braucht.",
    "**Große Freiflächen-Solarparks auf Wiesen und Äckern sind in Tirol deshalb kaum realistisch**, und das Land sagt das auch offen: Dachflächen bleiben bevorzugt, bei Freiflächen setzt Tirol auf bereits befestigte oder vorbelastete Flächen wie Großparkplätze, Deponien und Skigebiete. Eine landeseigene Potenzialstudie aus dem Jahr 2022 kam zum Ergebnis, dass ein großer Teil des benötigten Freiflächenstroms auf bereits genutzten, versiegelten oder geringwertigen Flächen erzeugt werden kann.",
    "Für Grundeigentümer ist Tirol dennoch nicht uninteressant. Die Einstrahlung im mittleren Inntal gehört zu den besten Österreichs, das Genehmigungsrecht ist für Anlagen über 250 kW im Elektrizitätsrecht gebündelt, und Agri-PV dient der Energiebehörde als Maßstab für die Verträglichkeit mit der Landwirtschaft. Wer eine vorbelastete Fläche, eine Fläche an Verkehrsinfrastruktur oder einen Betrieb mit Sonderkulturen hat, sollte genauer hinsehen.",
  ],
  recht: [
    {
      titel: "Tiroler Elektrizitätsgesetz: Bewilligung über 250 kW",
      text: "Nach dem TEG 2012 sind PV-Anlagen bis 50 kW frei, von über 50 bis 250 kW der Bezirksverwaltungsbehörde anzuzeigen und über 250 kW bewilligungspflichtig. Zuständig ist grundsätzlich die Bezirkshauptmannschaft, bei Anlagen über 500 kW die Landesregierung. Das Gesetz unterscheidet dabei nicht zwischen Dach- und Freiflächenanlagen.",
      quelle: { titel: "Land Tirol – Verfahrenshandbuch Photovoltaikanlagen (02.06.2025)", url: "https://www.tirol.gv.at/fileadmin/buergerservice/kundmachungen/wasserrecht/2025/PV-Handbuch_02_06_2025.pdf" },
    },
    {
      titel: "Sonderfläche bis 250 kWp, darüber kein Widmungserfordernis",
      text: "Frei stehende Anlagen im Freiland brauchen ab mehr als 100 m² Kollektorfläche eine Sonderflächenwidmung, etwa „Sonderfläche Photovoltaikanlage“ – allerdings nur bis 250 kWp. Größere Anlagen, die dem TEG unterliegen, fallen nach dem Verfahrenshandbuch des Landes nicht unter Bauordnung und Raumordnungsgesetz; ein Widmungserfordernis besteht dann nicht.",
      quelle: { titel: "Land Tirol – Verfahrenshandbuch Photovoltaikanlagen (02.06.2025)", url: "https://www.tirol.gv.at/fileadmin/buergerservice/kundmachungen/wasserrecht/2025/PV-Handbuch_02_06_2025.pdf" },
    },
    {
      titel: "Schutzziele im TEG: Landschaftsbild und Raumordnungsprogramme",
      text: "Für Freiflächenanlagen sind zwei Voraussetzungen des § 5 TEG 2012 entscheidend: Natur, Landschafts- und Ortsbild dürfen nicht wesentlich beeinträchtigt werden, und es darf kein Widerspruch zu einem Raumordnungsprogramm bestehen. Relevant sind vor allem die Regionalprogramme mit landwirtschaftlichen Vorsorgeflächen, die in Tirol auf Ebene der Planungsverbände landesweit bestehen.",
      quelle: { titel: "Land Tirol – Informationsblatt PV-Freiflächenanlagen (11/2022)", url: "https://www.tirol.gv.at/fileadmin/themen/umwelt/wasser_wasserrecht/Anlage_Info_PV_Freiflaechen.pdf" },
    },
    {
      titel: "Naturschutz ab 2.500 m² bebauter Fläche",
      text: "Außerhalb geschlossener Ortschaften ist eine PV-Anlage mit mehr als 2.500 m² zusammenhängend bebauter Fläche nach § 6 lit. a TNSchG 2005 bewilligungspflichtig. Unabhängig von der Größe gilt die Bewilligungspflicht an natürlichen Fließgewässern (inklusive 5-m-Uferstreifen), im 500-m-Streifen um stehende Gewässer über 2.000 m², in Auwäldern, Feuchtgebieten und Schutzgebieten. Im Nationalpark Hohe Tauern sind solche Energieanlagen verboten.",
      quelle: { titel: "Land Tirol – Verfahrenshandbuch Photovoltaikanlagen (02.06.2025)", url: "https://www.tirol.gv.at/fileadmin/buergerservice/kundmachungen/wasserrecht/2025/PV-Handbuch_02_06_2025.pdf" },
    },
    {
      titel: "Beschleunigungsgebiete: Parkplätze, Deponien, Skigebiete",
      text: "Mit der Tiroler Beschleunigungsverordnung für Photovoltaikanlagen (TBVO-PV) will das Land Beschleunigungsgebiete nach RED III auf befestigten Flächen wie Großparkplätzen, auf Deponien und in Skigebieten nach dem Seilbahn- und Skigebietsprogramm ausweisen. Der Entwurf lag vom 3. Juni bis 16. Juli 2026 in den Gemeinden auf. Beschleunigungsgebiete für Windkraft lehnt Tirol ab.",
      quelle: { titel: "Land Tirol – Land Tirol will PV beschleunigen (Presseaussendung)", url: "https://www.tirol.gv.at/presse/meldungen/meldung/land-tirol-will-pv-beschleunigen-und-setzt-bei-windenergie-auf-umfangreiche-einzelfallpruefung/" },
    },
    {
      titel: "EAG-Abschlag 25 % auf Grünland",
      text: "Für Anlagen auf landwirtschaftlich genutzten Flächen oder im Grünland verringert sich der Zuschlagswert der EAG-Marktprämie um 25 % (§ 33 EAG). Deponien, Infrastrukturstandorte und qualifizierte Agri-PV-Anlagen sind ausgenommen – für die Tiroler Standortlogik ein zusätzliches Argument für vorbelastete Flächen.",
      quelle: { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790" },
    },
  ],
  kulisse: {
    text: "Die Tiroler Flächenkulisse für Freiflächen-PV ist klein und klar auf Vorbelastung ausgerichtet. Die Potenzialstudie des Landes von 2022 schätzte das realistisch erschließbare Potenzial abseits von Almen und Hochgebirge auf rund 730 GWh pro Jahr: davon 283 GWh durch Überdachung von Großparkplätzen, 246 GWh durch Fahrbahnüberdachungen, 91 GWh auf Verkehrsrandflächen, 56 GWh auf Deponien und 50 GWh an Lärmschutzwänden, Kläranlagen und Brücken.",
    gut: [
      "Großparkplätze und andere befestigte Flächen (Beschleunigungsgebiete geplant)",
      "Deponien und Verkehrsrandflächen entlang von Autobahn und Bahn",
      "Flächen in Skigebieten nach dem Seilbahn- und Skigebietsprogramm",
      "Agri-PV auf Talflächen mit landwirtschaftlichem Betriebskonzept",
    ],
    schwierig: [
      "landwirtschaftliche Vorsorgeflächen der Regionalprogramme",
      "hochwertige Böden (die Behörde verlangt die Vermeidung einer Bodenklimazahl von 60/50)",
      "Almen und hochalpine Flächen (Landschaftsbild, Ökologie, Zugänglichkeit)",
      "Nationalpark Hohe Tauern, Gletscher und deren Vorfeld, Schutzgebiete",
      "Uferbereiche, Auwälder, Feuchtgebiete, Wald (Rodungsbewilligung ab 1.000 m²)",
    ],
  },
  ablauf: {
    text: "Das Verfahren in Tirol hängt an der Leistung. Bis 250 kWp braucht eine Freiflächenanlage die Sonderflächenwidmung der Gemeinde; die Zulässigkeit wird nach den Zielen des TROG 2022 beurteilt, gegebenenfalls mit Gutachten der Energie Tirol und Prüfung von Alternativstandorten. Über 250 kWp wird die Anlage im elektrizitätsrechtlichen Verfahren nach dem TEG 2012 bewilligt, das die Baubewilligung mitumfasst. Dort prüft die Behörde Landschaftsbild, Raumordnungsprogramme, Blendwirkung, Lärm, Statik, Hochwassergefährdung und eine netzverträgliche Anbindung. Die Anlaufstelle des Landes für erneuerbare Energie begleitet das Verfahren.",
    behoerden: [
      { name: "Gemeinde", rolle: "Sonderflächenwidmung für Anlagen bis 250 kWp" },
      { name: "Bezirkshauptmannschaft", rolle: "Anzeige und Bewilligung nach TEG 2012 bis 500 kW, Naturschutz, Rodung" },
      { name: "Amt der Tiroler Landesregierung – Abteilung Wasser-, Forst- und Energierecht", rolle: "Anlaufstelle Erneuerbare Energie, Bewilligung nach TEG für Anlagen über 500 kW", url: "https://www.tirol.gv.at/umwelt/wasser-forst-und-energierecht/erzeugungsanlagen-von-erneuerbarer-energie/" },
      { name: "TINETZ – Tiroler Netze", rolle: "Netzzugang und Nachweis der netzverträglichen Anbindung" },
    ],
  },
  agri: [
    "Agri-PV hat in Tirol eine besondere Rolle im Bewilligungsverfahren: Die Energiebehörde verwendet eine Agri-PV-Anlage als Referenzanlage, bei der sie annimmt, dass sie nicht im Widerspruch zu den Regionalprogrammen mit landwirtschaftlichen Vorsorgeflächen steht. Abweichungen davon werden einzeln bewertet. Maßgeblich sind die Förderkriterien der EAG-Investitionszuschüsseverordnung: rückstandslose Rückbaubarkeit, mindestens 80 cm Modulunterkante, mindestens zwei Meter Reihenabstand, landwirtschaftliche Hauptnutzung, gleichmäßige Modulverteilung und höchstens 7 % Flächenverlust durch Aufbauten und Infrastruktur.",
    "Zusätzlich verlangt die Behörde ein landwirtschaftliches Betriebskonzept, eine Bewertung des Landschaftsbildes und die Vermeidung hochwertiger Böden. Das Land weist auf mögliche Vorteile wie Hagelschutz, Regenwassernutzung und geringere Verdunstung hin. Für Obstbau, Beerenkulturen und Grünland im Inntal kann Agri-PV damit der realistischste Weg zu einer Freiflächenanlage sein.",
  ],
  netz: {
    uenb: ["APG (Austrian Power Grid)"],
    vnb: ["TINETZ – Tiroler Netze"],
    hinweis:
      "Die Tiroler Verteilernetzbetreiber veröffentlichen wie alle österreichischen Netzbetreiber ihre freien Einspeisekapazitäten je Umspannwerk quartalsweise; im TEG-Verfahren ist eine Netzanbindung ohne nachteilige Rückwirkungen nachzuweisen.",
    quelle: { titel: "EbUtilities – Verfügbare Netzanschlusskapazitäten", url: "https://www.ebutilities.at/verfuegbare-netzanschlusskapazitaeten" },
  },
  besonderheiten: [
    {
      titel: "Hohe Erträge im Inntal, Abschattung in engen Tälern",
      text: "PVGIS ergibt im mittleren Inntal rund 1.370 kWh/kWp – deutlich mehr als im Alpenvorland. In engen Seitentälern verkürzen Berge die Sonnenstunden, besonders im Winter; bei Kufstein ergibt PVGIS nur rund 1.110 kWh/kWp. Eine standortgenaue Ertragsrechnung mit Horizontprofil ist in Tirol unverzichtbar.",
    },
    {
      titel: "Skigebiete und alpine PV",
      text: "Das Land hebt Skigebiete als besonders effizient hervor, weil alpine Anlagen im Winter hohe Erträge liefern. Hochalpine Flächen und Almen haben rechnerisch enormes Potenzial, prägen aber das Landschaftsbild und sind teils ökologisch hochwertig und schwer erschließbar; die Potenzialstudie verlangt hier eine genaue Prüfung.",
    },
    {
      titel: "Landschaftsbild ohne Interessenabwägung",
      text: "Nach dem Informationsblatt des Landes sieht das TEG bei einer wesentlichen Beeinträchtigung von Natur, Landschafts- oder Ortsbild keine Interessenabwägung vor – die Bewilligung ist dann zu versagen. In Tourismusregionen ist eine sorgfältige Landschaftsbildbewertung deshalb zentral.",
    },
  ],
  pacht: {
    tendenz: "unten",
    begruendung:
      "Kleine verfügbare Flächen, Agri-PV als Maßstab und höhere Bau- und Anschlusskosten in Hang- und Tallagen begrenzen, was ein Projekt an Pacht tragen kann. Vorbelastete Flächen mit gutem Netzanschluss im Inntal können darüber liegen.",
  },
  faq: [
    {
      q: "Kann ich in Tirol meine Wiese für einen Solarpark verpachten?",
      a: "Nur in Einzelfällen. Größere Anlagen auf Wiesen und Äckern stoßen in Tirol auf die landwirtschaftlichen Vorsorgeflächen der Regionalprogramme und auf strenge Anforderungen an das Landschaftsbild. Realistisch sind vor allem Agri-PV mit fortgesetzter Bewirtschaftung oder Flächen mit Vorbelastung, etwa neben Verkehrsinfrastruktur.",
    },
    {
      q: "Wie viel Pacht ist in Tirol für eine PV-Fläche möglich?",
      a: "Wegen der kleinen Flächen und der Agri-PV-Anforderungen liegt die Pacht eher im unteren Bereich der üblichen Spanne; gut angebundene, vorbelastete Flächen im Inntal können mehr erzielen. Eine erste Einschätzung liefert der Pachtrechner.",
    },
    {
      q: "Braucht ein Solarpark in Tirol eine Flächenwidmung?",
      a: "Bis 250 kWp ist im Freiland ab mehr als 100 m² Kollektorfläche eine Sonderflächenwidmung nötig. Größere Anlagen werden nach dem Verfahrenshandbuch des Landes im elektrizitätsrechtlichen Verfahren bewilligt und brauchen keine eigene Widmung – die Behörde prüft dort aber Raumordnungsprogramme und Landschaftsbild.",
    },
    {
      q: "Ab wann ist in Tirol eine Naturschutzbewilligung nötig?",
      a: "Außerhalb geschlossener Ortschaften ab mehr als 2.500 m² zusammenhängend bebauter Fläche. An Gewässern, in Auwäldern, Feuchtgebieten und Schutzgebieten gilt die Bewilligungspflicht unabhängig von der Größe.",
    },
    {
      q: "Welche Anforderungen stellt Tirol an Agri-PV?",
      a: "Die Behörde orientiert sich an den Förderkriterien des EAG: mindestens 80 cm Modulunterkante, zwei Meter Reihenabstand, landwirtschaftliche Hauptnutzung und höchstens 7 % Flächenverlust. Dazu kommen ein landwirtschaftliches Betriebskonzept und eine Landschaftsbildbewertung.",
    },
    {
      q: "Wo will Tirol Photovoltaik beschleunigen?",
      a: "Der Entwurf der Tiroler Beschleunigungsverordnung für Photovoltaik sieht Großparkplätze, Deponien und Skigebiete vor. Landwirtschaftliche Flächen sind nach den verfügbaren Informationen nicht als Beschleunigungsgebiete vorgesehen.",
    },
  ],
  quellen: [
    { titel: "Land Tirol – Verfahrenshandbuch Photovoltaikanlagen (02.06.2025)", url: "https://www.tirol.gv.at/fileadmin/buergerservice/kundmachungen/wasserrecht/2025/PV-Handbuch_02_06_2025.pdf", stand: "09/2026" },
    { titel: "Land Tirol – Anlaufstelle für Erzeugungsanlagen von erneuerbarer Energie", url: "https://www.tirol.gv.at/umwelt/wasser-forst-und-energierecht/erzeugungsanlagen-von-erneuerbarer-energie/", stand: "09/2026" },
    { titel: "Land Tirol – Anlage zum Informationsblatt Photovoltaik-Anlagen bezüglich Freiflächenanlagen (28.11.2022)", url: "https://www.tirol.gv.at/fileadmin/themen/umwelt/wasser_wasserrecht/Anlage_Info_PV_Freiflaechen.pdf", stand: "09/2026" },
    { titel: "Wasser Tirol im Auftrag des Landes – Photovoltaik-Freiflächenpotenzial in Tirol (30.08.2022)", url: "https://www.tirol.gv.at/fileadmin/themen/umwelt/wasser_wasserrecht/PV-FREIFLAECHEN-Bericht-fi.pdf", stand: "09/2026" },
    { titel: "Land Tirol – Land Tirol will PV beschleunigen und setzt bei Windenergie auf umfangreiche Einzelfallprüfung", url: "https://www.tirol.gv.at/presse/meldungen/meldung/land-tirol-will-pv-beschleunigen-und-setzt-bei-windenergie-auf-umfangreiche-einzelfallpruefung/", stand: "09/2026" },
    { titel: "Gemeinde Tristach – Kundmachung Auflage Entwurf Tiroler Beschleunigungsverordnung PV (06/2026)", url: "https://www.tristach.at/2026/06/02/kundmachung/", stand: "09/2026" },
    { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790", stand: "09/2026" },
    { titel: "Statistik Austria – Betriebe nach Flächennutzung 2023 nach Bundesland", url: "https://www.statistik.at/fileadmin/pages/155/LuFBetriebeNachFlaechennutzung2023nBL.ods", stand: "09/2026" },
    { titel: "WKO Statistik – Fläche und Benützungsarten (BEV/Statistik Austria, Stand 01.01.2025)", url: "https://www.wko.at/statistik/bundesland/flaecheben.pdf", stand: "09/2026" },
    { titel: "Statistik Austria – Bevölkerung zu Jahres-/Quartalsanfang", url: "https://www.statistik.at/statistiken/bevoelkerung-und-soziales/bevoelkerung/bevoelkerungsstand/bevoelkerung-zu-jahres-/-quartalsanfang", stand: "09/2026" },
    { titel: "JRC PVGIS 5.3 – Ertragsberechnung (Inntal, Kufstein)", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/", stand: "09/2026" },
  ],
  unsicher: [
    "TBVO-PV: Auflagefrist 03.06.–16.07.2026 nur aus Suchergebnis-Auszug der Gemeinde-Kundmachungen (Seite selbst nicht lesbar); ob die Verordnung bis 29.09.2026 erlassen wurde, offen.",
    "„2. Tiroler Erneuerbaren-Ausbaugesetz“ (laut Presseaussendung Landtagsbeschluss für 10/2025 geplant) – Inhalt und Beschluss nicht geprüft; mögliche Änderungen am TEG/TROG nach 06/2025 daher nicht berücksichtigt.",
    "Agri-PV-Kriterien (7 % Flächenverlust, Bodenklimazahl 60/50, Betriebskonzept) stammen aus dem Informationsblatt vom 28.11.2022; ob die Praxis 2026 unverändert ist, nicht bestätigt (Anlaufstellen-Seite nennt weiter landwirtschaftliches Gutachten).",
    "„Keine Interessenabwägung im TEG“ laut Informationsblatt 11/2022 – als Aussage des Landes zitiert.",
    "Weitere Tiroler Verteilernetzbetreiber (z. B. städtische Netze) nicht recherchiert – nur TINETZ genannt.",
    "Keine Tiroler Landesförderung für Agri-PV gefunden (nur Speicher-Nachrüstung 2026 in Suchtreffern) – weggelassen.",
    "PVGIS-Punkte: Inntal 47,28/11,45 (1.369), Kufstein 47,58/12,17 (1.114).",
  ],
};

export default region;
