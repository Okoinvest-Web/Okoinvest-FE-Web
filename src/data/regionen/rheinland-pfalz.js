// Recherche: 29.09.2026 – PVGIS v5.3 (JRC), Destatis Gemeindeverzeichnis (31.12.2024), Statistikportal (BHE 2025),
// Statistisches Landesamt RLP (ASE 2023), MdI RLP Leitfaden FFPVA vom 26.01.2024 (4. Teilfortschreibung LEP IV),
// Clearingstelle EEG|KWKG (LVO benachteiligte Gebiete), Fachagentur Wind und Solar (Länderinfo RLP 11/2025, Analyse 2025)
const region = {
  slug: "rheinland-pfalz",
  land: "DE",
  name: "Rheinland-Pfalz",
  inName: "in Rheinland-Pfalz",
  kurz: "RP",
  seoTitel: "Solarpark & Agri-PV Rheinland-Pfalz: Pacht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht in Rheinland-Pfalz: LEP IV mit 2-Prozent-Ackergrenze, Ertragsmesszahl, Vorranggebiete Landwirtschaft und Agri-PV im Wein- und Obstbau erklärt.",
  lead:
    "Rheinland-Pfalz gehört zu den zuschlagsstärksten Ländern bei EEG-Ausschreibungen für Freiflächen-PV. Das Landesentwicklungsprogramm steuert dabei über die Ertragsmesszahl, eine landesweite Ackergrenze und Vorbehaltsgebiete in den Regionalplänen.",
  akzent: "zwischen Rebhang und Regionalplan.",
  ertrag: {
    kwhProKwp: 1110,
    ort: "bei Worms (Rheinhessen)",
    spanne: "rund 1.090 bis 1.110 kWh/kWp",
    hinweis:
      "Ein zweiter PVGIS-Punkt bei Mayen am Rand der Eifel ergibt rund 1.090 kWh/kWp; der Oberrheingraben gehört zu den strahlungsreicheren Lagen im Westen Deutschlands.",
  },
  eckdaten: {
    hauptstadt: "Mainz",
    flaecheKm2: 19858,
    lfHa: 711900,
    lfJahr: 2025,
    einwohner: 4129569,
    quelle: {
      titel: "Statistikportal des Bundes und der Länder (Bodennutzungshaupterhebung 2025); Destatis, Gemeindeverzeichnis, Stand 31.12.2024",
      url: "https://www.statistikportal.de/de/land-und-forstwirtschaft/betriebe-flaeche-viehhaltung-und-arbeitskraefte",
    },
  },
  einleitung: [
    "Rheinland-Pfalz ist das waldreichste Bundesland – gut 40 Prozent der Landesfläche sind bewaldet – und zugleich das Weinland Deutschlands mit sechs Anbaugebieten von der Ahr bis zur Pfalz. Von der landwirtschaftlich genutzten Fläche entfielen 2023 laut Statistischem Landesamt rund 55 Prozent auf Ackerland, 35 Prozent auf Dauergrünland und etwa 10 Prozent auf Dauerkulturen wie Reben und Obst. Diese Mischung prägt auch die Solarplanung: Sonderkulturen, Hanglagen und Mittelgebirge verlangen andere Antworten als die Ackerebenen Rheinhessens.",
    "Bei den EEG-Ausschreibungen für Freiflächenanlagen hat Rheinland-Pfalz stark aufgeholt. Nach Auswertung der Fachagentur Wind und Solar erhielten Projekte im Land 2025 Zuschläge über 583 MW – rund 8 Prozent der bundesweiten Menge und Platz vier unter den Ländern. Das Land strebt laut Landesklimaschutzgesetz an, den Stromverbrauch bis 2030 bilanziell vollständig aus erneuerbaren Energien zu decken.",
    "Die raumordnerischen Leitplanken setzt die **Vierte Teilfortschreibung des Landesentwicklungsprogramms (LEP IV)**, die Anfang 2023 in Kraft trat. Das Innenministerium hat dazu im Januar 2024 einen eigenen Leitfaden zur Planung und Bewertung von Freiflächen-PV aus raumordnerischer Sicht veröffentlicht. Für Eigentümer entscheidend sind vor allem die Ertragsmesszahl der Fläche und die Frage, ob sie in einem Vorranggebiet Landwirtschaft liegt.",
  ],
  recht: [
    {
      titel: "LEP IV: Vorbehaltsgebiete für Freiflächen-PV in allen Regionalplänen",
      text: "Mit der 4. Teilfortschreibung müssen die Regionalpläne **Vorbehaltsgebiete für Freiflächen-PV** ausweisen, auch entlang linienförmiger Infrastruktur wie Autobahnen, Bundes- und Landesstraßen, Bahnstrecken oder Höchstspannungsleitungen (Z 166 b). Vorranggebiete für Solar sind zusätzlich möglich. In den Kernzonen und Rahmenbereichen der UNESCO-Welterbestätten **Oberes Mittelrheintal** und **Obergermanisch-Raetischer Limes** sind Freiflächenanlagen ausgeschlossen (Z 166 a); Zielabweichungen davon gelten laut Leitfaden als aussichtslos.",
      quelle: { titel: "MdI RLP – Leitfaden Freiflächen-PV aus raumordnerischer Sicht (26.01.2024)", url: "https://mdi.rlp.de/fileadmin/03/Themen/Landesplanung/Dokumente/Landesentwicklungsprogramm/4.TF/FFPVA_Leitfaden_vom_26.01.2024.pdf" },
    },
    {
      titel: "2-Prozent-Grenze für Ackerflächen",
      text: "Nach G 166 c soll landesweit die Nutzung von Ackerflächen für weitere Freiflächenanlagen (Stichtag 31.12.2020) auf **2 Prozent der Ackerfläche** begrenzt und per Monitoring beobachtet werden. Einzelne Kommunen dürfen mehr überplanen, solange die örtliche Landwirtschaft nicht unverhältnismäßig betroffen ist. Laut Leitfaden sind deren Belange grundsätzlich gewahrt, wenn bei Überschreiten der 2 Prozent keine Vorranggebiete Landwirtschaft genutzt werden oder insgesamt nicht mehr als 5 Prozent der örtlichen Ackerfläche.",
      quelle: { titel: "MdI RLP – Leitfaden Freiflächen-PV aus raumordnerischer Sicht (26.01.2024)", url: "https://mdi.rlp.de/fileadmin/03/Themen/Landesplanung/Dokumente/Landesentwicklungsprogramm/4.TF/FFPVA_Leitfaden_vom_26.01.2024.pdf" },
    },
    {
      titel: "Ertragsmesszahl als Maßstab",
      text: "Freiflächenanlagen sollen vorrangig auf ertragsschwachen, artenarmen oder vorbelasteten Acker- und Grünlandflächen entstehen (G 166). Als Kennzahl dient die **Ertragsmesszahl (EMZ)**: Der Landesdurchschnitt liegt laut Leitfaden bei 35, Flächen darunter gelten tendenziell als ertragsschwächer. Maßgeblich ist aber der Vergleich mit der lokaltypischen EMZ der Gemarkung. Die Werte lassen sich flurstückgenau aus dem Liegenschaftskataster bzw. über das Landesamt für Steuern ermitteln.",
      quelle: { titel: "MdI RLP – Leitfaden Freiflächen-PV aus raumordnerischer Sicht (26.01.2024)", url: "https://mdi.rlp.de/fileadmin/03/Themen/Landesplanung/Dokumente/Landesentwicklungsprogramm/4.TF/FFPVA_Leitfaden_vom_26.01.2024.pdf" },
    },
    {
      titel: "Benachteiligte Gebiete: Landesverordnung seit 2018, heute Bundesrecht",
      text: "Rheinland-Pfalz hatte 2018 mit einer Landesverordnung zunächst Grünland in benachteiligten Gebieten für EEG-Gebote geöffnet; die Änderung Ende 2021 erhöhte das Kontingent von 50 auf 200 MW pro Jahr und bezog Ackerland geringer Bodengüte ein. Mit dem Solarpaket I (Mai 2024) sind benachteiligte Gebiete bundesweit grundsätzlich zugelassen, die Landesverordnung ist insoweit überholt. Die Vollzugshinweise der Landesministerien zu Land-, Forst- und Wasserwirtschaft sowie Naturschutz gelten laut Leitfaden ergänzend weiter.",
      quelle: { titel: "Clearingstelle EEG|KWKG – Landesverordnung RLP über Gebote für Solaranlagen", url: "https://www.clearingstelle-eeg-kwkg.de/gesetz/4707" },
    },
    {
      titel: "Kein Landesbeteiligungsgesetz für Solarparks",
      text: "Anders als etwa Niedersachsen hat Rheinland-Pfalz nach aktuellem Recherchestand kein eigenes Gesetz zur finanziellen Beteiligung von Kommunen an Solarparks. Es gilt die freiwillige Zahlung nach § 6 EEG von bis zu 0,2 ct/kWh an die Standortgemeinde, die in Rheinland-Pfalz vielfach Bestandteil der Verhandlungen mit der Gemeinde ist.",
      quelle: { titel: "node.energy – Länderbeteiligungsgesetze im Überblick", url: "https://www.node.energy/blog/6-eeg-laenderbeteiligungsgesetze" },
    },
  ],
  kulisse: {
    text: "Die Kulisse in Rheinland-Pfalz wird stark von den Regionalplänen der vier Planungsgemeinschaften und des Verbands Region Rhein-Neckar bestimmt. Vorranggebiete Landwirtschaft schließen Freiflächen-PV zunächst aus; hier hilft nur ein Zielabweichungsverfahren. Günstig sind dagegen Flächen mit unterdurchschnittlicher Ertragsmesszahl, Konversionsflächen und Korridore an Verkehrswegen, für die der LEP ausdrücklich eine Positivplanung vorsieht.",
    gut: [
      "Acker- und Grünland mit Ertragsmesszahl unter dem lokaltypischen Durchschnitt",
      "200-m-Korridore an Autobahnen, Bahnstrecken und Höchstspannungsleitungen, dazu der 500-m-Streifen der EEG-Kulisse",
      "Versiegelte Konversionsflächen mit geringer ökologischer Funktion, etwa frühere Militär- oder Gewerbeflächen",
      "Deponien, soweit Abdichtung und Standfestigkeit es zulassen",
      "Vorbehaltsgebiete Freiflächen-PV in den fortgeschriebenen Regionalplänen",
    ],
    schwierig: [
      "Vorranggebiete Landwirtschaft – nur über Zielabweichungsverfahren, auch für Agri-PV",
      "Kernzonen und Rahmenbereiche der Welterbestätten Oberes Mittelrheintal und Limes",
      "Vorranggebiete Regionaler Biotopverbund und Rohstoffsicherung",
      "Gemeinden, die ihre Ackerfläche bereits über 2 bzw. 5 Prozent mit Solarparks überplant haben",
      "Steile, bewaldete Mittelgebirgslagen in Eifel, Hunsrück, Westerwald und Pfälzerwald",
    ],
  },
  ablauf: {
    text: "In Rheinland-Pfalz beginnt ein Solarpark mit dem Beschluss der Ortsgemeinde, die Flächennutzungsplanung liegt meist bei der Verbandsgemeinde. Für größere Vorhaben prüft die Kreisverwaltung als untere Landesplanungsbehörde in einer vereinfachten raumordnerischen Prüfung, ob das Projekt mit dem Regionalplan vereinbar ist. Liegt die Fläche in einem Vorranggebiet, entscheidet die obere Landesplanungsbehörde bei der SGD Nord oder SGD Süd über eine Zielabweichung; laut Leitfaden können auch Privatpersonen diese beantragen. Eine Befristung mit festgelegter Folgenutzung Landwirtschaft ist dabei ein übliches Argument.",
    behoerden: [
      { name: "Ortsgemeinde / Verbandsgemeinde", rolle: "Bebauungsplan (Ortsgemeinde), Flächennutzungsplan (in der Regel Verbandsgemeinde)" },
      { name: "Kreisverwaltung / kreisfreie Stadt", rolle: "Untere Landesplanungsbehörde (vereinfachte raumordnerische Prüfung), Naturschutz, Bauaufsicht" },
      { name: "SGD Nord (Koblenz) bzw. SGD Süd (Neustadt/Weinstraße)", rolle: "Obere Landesplanungsbehörde, Zielabweichungsverfahren" },
      { name: "Planungsgemeinschaften bzw. Verband Region Rhein-Neckar", rolle: "Regionale Raumordnungspläne, Vorbehalts- und Vorranggebiete Freiflächen-PV" },
      { name: "Dienstleistungszentren Ländlicher Raum / Landwirtschaftskammer", rolle: "Agrarstrukturelle Stellungnahme, Bewertung der Ertragsfähigkeit", url: "https://www.lwk-rlp.de" },
    ],
  },
  agri: [
    "Agri-PV ist in Rheinland-Pfalz vor allem für **Dauerkulturen** interessant. Die Module können Reben und Obst vor Hagel, Starkregen und Sonnenbrand schützen – das untersucht das DLR Rheinpfalz im Interreg-Oberrhein-Projekt zu Photovoltaik im Weinbau mit Pilotanlagen in Rheinland-Pfalz, Baden-Württemberg und der Schweiz. In Grafschaft (Kreis Ahrweiler) wurde mit Landesförderung eine Agri-PV-Versuchsanlage über Apfelbäumen errichtet, die Lichtmanagement, Ertrag und Wirtschaftlichkeit untersucht.",
    "Raumordnerisch ist Agri-PV in einem Vorranggebiet Landwirtschaft nur vereinbar, wenn eine möglichst uneingeschränkte Bewirtschaftung möglich bleibt. Weil die bisherigen Regionalpläne dazu keine Regeln enthielten, verlangt der Leitfaden auch für Agri-PV auf Vorranggebieten ein Zielabweichungsverfahren und empfiehlt die Orientierung an der DIN SPEC 91434. Wichtig: Eine reine Beweidung unter einem konventionellen Solarpark gilt nicht als Agri-PV im Sinne der Vorranggebiete.",
  ],
  netz: {
    uenb: ["Amprion"],
    vnb: ["Westnetz", "Pfalzwerke Netz", "Energienetze Mittelrhein", "Syna", "EWR Netz"],
    hinweis:
      "Die Verteilnetze in Rheinland-Pfalz sind auf viele Betreiber verteilt. Das Umweltministerium stimmt mit der „Datenwerkstatt Rheinland-Pfalz“ Planungsdaten der Netzbetreiber ab; die Anschlussfrage sollte früh beim örtlichen Betreiber geklärt werden.",
    quelle: { titel: "MKUEM RLP – Datenwerkstatt Rheinland-Pfalz", url: "https://mkuem.rlp.de/service/pressemitteilungen/detail/katrin-eder-datenwerkstatt-schafft-erstmals-regionalen-abgleich-von-planungsdaten-fuer-das-stromnetz-im-land" },
  },
  besonderheiten: [
    {
      titel: "Welterbe am Mittelrhein und am Limes",
      text: "Das Obere Mittelrheintal zwischen Bingen und Koblenz sowie der Limes sind für Freiflächen-PV tabu – auch Gewerbe- und Industriegebiete innerhalb der Welterbebereiche. Eigentümer in diesen Räumen sollten das vor jeder Projektanfrage prüfen.",
    },
    {
      titel: "Ertragsmesszahl flurstückgenau abrufbar",
      text: "Rheinland-Pfalz stellt die Bodenschätzungsdaten über einen Geodienst und die Durchschnitts-EMZ je Gemarkung über das Landesamt für Steuern bereit. So lässt sich schon vor dem Gespräch mit der Gemeinde einschätzen, ob eine Fläche als vergleichsweise ertragsschwach gilt.",
    },
    {
      titel: "Regionale Potenzialstudien",
      text: "Die Planungsgemeinschaften arbeiten an der Umsetzung der neuen Vorbehaltsgebiete, etwa mit einer Potenzialstudie Freiflächen-PV der Planungsgemeinschaft Rheinhessen-Nahe; in der Vorderpfalz führt der Verband Region Rhein-Neckar einen eigenen Teilregionalplan Freiflächen-Photovoltaik.",
    },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung:
      "Überdurchschnittliche Einstrahlung im Oberrheingraben und eine rege Ausschreibungsbeteiligung stützen die Pacht; die Ackergrenze, Vorranggebiete Landwirtschaft und kleinteilige Flächen in den Mittelgebirgen wirken dämpfend.",
  },
  faq: [
    {
      q: "Hat Rheinland-Pfalz die benachteiligten Gebiete geöffnet?",
      a: "Ja, bereits 2018 per Landesverordnung, zunächst für Grünland, ab Ende 2021 auch für Ackerland geringer Bodengüte. Seit dem Solarpaket I sind benachteiligte Gebiete bundesweit grundsätzlich zugelassen; die Landesverordnung hat damit an Bedeutung verloren.",
    },
    {
      q: "Was bedeutet die 2-Prozent-Grenze für meine Fläche?",
      a: "Sie ist ein landesweiter Grundsatz: Neue Solarparks sollen zusammen höchstens 2 Prozent der Ackerfläche des Landes beanspruchen. In einzelnen Gemeinden kann mehr möglich sein – bis 5 Prozent der örtlichen Ackerfläche oder außerhalb von Vorranggebieten Landwirtschaft gelten die Belange der Landwirtschaft laut Leitfaden in der Regel als gewahrt.",
    },
    {
      q: "Meine Fläche liegt in einem Vorranggebiet Landwirtschaft – geht trotzdem ein Solarpark?",
      a: "Nur über ein Zielabweichungsverfahren bei der SGD Nord oder Süd. Chancen bestehen, wenn nur ein kleiner Teil des Vorranggebiets betroffen ist, die Anlage befristet wird und die Folgenutzung Landwirtschaft festgelegt ist. Auch Agri-PV braucht dort nach aktuellem Stand eine Zielabweichung.",
    },
    {
      q: "Wie viel Pacht bringt ein Solarpark in Rheinland-Pfalz?",
      a: "Das hängt von Einstrahlung, Netzanschluss, Flächengröße und Ertragsmesszahl ab. Rheinhessen und die Vorderpfalz haben gute Einstrahlungswerte, zugleich sind dort Flächen landwirtschaftlich besonders gefragt. Eine belastbare Einschätzung gibt es erst nach Prüfung der konkreten Fläche.",
    },
    {
      q: "Eignet sich mein Weinberg für Agri-PV?",
      a: "Grundsätzlich wird das erforscht, etwa vom DLR Rheinpfalz. Entscheidend sind Hangneigung, Zeilenabstand, Bewirtschaftung mit Maschinen und der Netzanschluss. Für einen EEG-Zuschlag muss die Anlage die Anforderungen an besondere Solaranlagen erfüllen.",
    },
    {
      q: "Muss die Gemeinde in Rheinland-Pfalz am Solarpark beteiligt werden?",
      a: "Ein Landesgesetz dazu gibt es nach aktuellem Stand nicht. Üblich ist die freiwillige Zahlung nach § 6 EEG von bis zu 0,2 ct/kWh an die Standortgemeinde.",
    },
  ],
  quellen: [
    { titel: "PVGIS v5.3, Joint Research Centre der EU (Worms / Mayen)", url: "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=49.62&lon=8.35&peakpower=1&loss=14&optimalangles=1&outputformat=json", stand: "09/2026" },
    { titel: "MdI RLP – Leitfaden zur Planung und Bewertung von Freiflächen-PV aus raumordnerischer Sicht (26.01.2024)", url: "https://mdi.rlp.de/fileadmin/03/Themen/Landesplanung/Dokumente/Landesentwicklungsprogramm/4.TF/FFPVA_Leitfaden_vom_26.01.2024.pdf", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – Landesverordnung RLP über Gebote für Solaranlagen", url: "https://www.clearingstelle-eeg-kwkg.de/gesetz/4707", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – Förderung auf Acker- und Grünland (Opt-out seit Solarpaket I)", url: "https://www.clearingstelle-eeg-kwkg.de/haeufige-rechtsfrage/169", stand: "09/2026" },
    { titel: "Fachagentur Wind und Solar – Länderinformationen Rheinland-Pfalz (Stand 11/2025)", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/laenderinformationen/rheinland-pfalz", stand: "09/2026" },
    { titel: "Fachagentur Wind und Solar – Analyse Ausschreibungen PV auf Freiflächen 2025", url: "https://www.fachagentur-wind-solar.de/fileadmin/Veroeffentlichungen/Solar/Daten/FA_Wind_Solar_HGP_Ausschreibungen_PV_auf_Freiflaechen_2025.pdf", stand: "09/2026" },
    { titel: "pv magazine – Rheinland-Pfalz: 200 MW jährlich in benachteiligten Gebieten (12/2021)", url: "https://www.pv-magazine.de/2021/12/14/rheinland-pfalz-genehmigt-kuenftig-jaehrlich-200-megawatt-photovoltaik-freiflaechenanlagen-auf-benachteiligten-gebieten/", stand: "09/2026" },
    { titel: "Interreg Oberrhein – Agri-PV im Weinbau", url: "https://www.interreg-oberrhein.eu/projet/agri-pv/", stand: "09/2026" },
    { titel: "pv magazine – Rheinland-Pfalz fördert Agri-Photovoltaik (APV Obstbau, Grafschaft)", url: "https://www.pv-magazine.de/2022/08/11/rheinland-pfalz-foerdert-agri-photovoltaik/", stand: "09/2026" },
    { titel: "Statistikportal – Landwirtschaftlich genutzte Fläche nach Ländern 2025", url: "https://www.statistikportal.de/de/land-und-forstwirtschaft/betriebe-flaeche-viehhaltung-und-arbeitskraefte", stand: "09/2026" },
    { titel: "Statistisches Landesamt Rheinland-Pfalz – Agrarstrukturerhebung 2023", url: "https://www.statistik.rlp.de/fileadmin/dokumente/berichte/C/2083/C2083_202300_1j_K.pdf", stand: "09/2026" },
    { titel: "MKUEM RLP – Datenwerkstatt Rheinland-Pfalz", url: "https://mkuem.rlp.de/service/pressemitteilungen/detail/katrin-eder-datenwerkstatt-schafft-erstmals-regionalen-abgleich-von-planungsdaten-fuer-das-stromnetz-im-land", stand: "09/2026" },
  ],
  unsicher: [
    "Ob Rheinland-Pfalz nach dem Solarpaket I eine Beschränkungsverordnung nach § 37c Abs. 2 EEG erlassen hat, wurde nicht gefunden; Aussage 'Landesverordnung insoweit überholt' stützt sich auf Sekundärquellen (Suchzusammenfassung, Clearingstelle-Übersicht).",
    "Zweite Änderungsverordnung der LVO (Ministerrat 09/2023) inhaltlich nicht verifiziert, daher weggelassen.",
    "Aussage zu Zielabweichung auch für Agri-PV gibt den Leitfadenstand 01/2024 wieder; ob fortgeschriebene Regionalpläne inzwischen eigene Agri-PV-Regeln enthalten, nicht geprüft.",
    "Stand des Teilregionalplans Freiflächen-PV des Verbands Region Rhein-Neckar (Entwurf/rechtskräftig) nicht geprüft; nur Existenz des Verfahrens belegt.",
    "Verteilnetzbetreiber-Liste aus Suchergebnis zu Landtags-/Ministeriumsdokumenten übernommen; Amprion als ÜNB nach allgemeiner Kenntnis.",
    "Waldanteil (gut 40 %) und 'Weinland' mit sechs Anbaugebieten nach Wikipedia; Zuständigkeitsverteilung Orts-/Verbandsgemeinde nach allgemeiner Kenntnis der Kommunalverfassung.",
    "Ausbauziel '100 % Strom aus EE bis 2030' nach Fachagentur-Länderinfo zum Landesklimaschutzgesetz (Novelle 07/2025), Gesetzestext nicht selbst geprüft.",
  ],
};

export default region;
