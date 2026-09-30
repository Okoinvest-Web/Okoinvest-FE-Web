// Recherche: 29.09.2026 – Land OÖ: Leitfaden 2026 Photovoltaik (Stand Juni 2026), Kriterienkatalog PV-FFA (259165.htm),
// OÖ PV-Strategie 2030 (259164.htm), Netz OÖ Netzentwicklungsplan 2026, tips.at (12/2023), RIS (§ 33 EAG),
// Statistik Austria (Agrarstrukturerhebung 2023, Bevölkerung 01.01.2026), BEV/WKO (Fläche 01.01.2025), PVGIS v5.3
const region = {
  slug: "oberoesterreich",
  land: "AT",
  name: "Oberösterreich",
  inName: "in Oberösterreich",
  kurz: "OÖ",
  seoTitel: "Solarpark & Agri-PV Oberösterreich: Pacht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht in Oberösterreich: Sonderausweisung im Grünland ab 50 m², Kriterienkatalog zur Bodenfruchtbarkeit, Agri-PV-Pflicht und Netz OÖ im Überblick.",
  lead:
    "In Oberösterreich entscheidet ein landesweiter Kriterienkatalog, ob eine Fläche für Freiflächen-PV gewidmet werden kann. Bodenfruchtbarkeit und Nähe zum Umspannwerk sind die Schlüssel.",
  akzent: "mit Kriterienkatalog.",
  ertrag: {
    kwhProKwp: 1130,
    ort: "in der Welser Heide bei Marchtrenk",
    spanne: "rund 1.130 kWh/kWp (Welser Heide) bis 1.140 kWh/kWp (Innviertel bei Ried)",
    hinweis:
      "Das Alpenvorland zwischen Innviertel und Hausruckviertel liegt nach PVGIS beim Ertrag recht einheitlich; Tallagen im Süden können durch Horizontabschattung darunter liegen.",
  },
  eckdaten: {
    hauptstadt: "Linz",
    flaecheKm2: 11983,
    lfHa: 499012,
    lfJahr: 2023,
    einwohner: 1537159,
    quelle: {
      titel: "Statistik Austria – Land- und forstwirtschaftliche Betriebe nach Flächennutzung 2023 nach Bundesland",
      url: "https://www.statistik.at/fileadmin/pages/155/LuFBetriebeNachFlaechennutzung2023nBL.ods",
    },
  },
  einleitung: [
    "Oberösterreich ist ein Agrar- und Industrieland zugleich: Knapp 500.000 Hektar werden landwirtschaftlich genutzt, der Dauersiedlungsraum umfasst rund 57 Prozent der Landesfläche. Das Alpenvorland mit Innviertel, Hausruckviertel, Traunviertel und dem Linzer Raum bietet sanft geneigte, gut erschlossene Flächen. Zugleich ist der Flächendruck durch Siedlung, Betriebe und Verkehr hoch, und die Böden im Zentralraum zählen zu den ertragreichsten des Landes.",
    "Das Land hat seine Linie in der **Oö. Photovoltaik-Strategie 2030** festgelegt: Dächer und vorbelastete Flächen haben oberste Priorität. Freiflächenanlagen auf land- und forstwirtschaftlichen Flächen sind möglich, werden im Widmungsverfahren aber nach einem Kriterienkatalog geprüft, der sich vor allem an der natürlichen Bodenfruchtbarkeit und der Entfernung zum nächsten Umspannwerk orientiert. Auf mittleren Böden ist nur noch Agri-PV mit echter landwirtschaftlicher Doppelnutzung vorgesehen.",
    "Für Grundeigentümer heißt das: Nicht jede ebene, sonnige Wiese ist widmungsfähig. Wer die Bodenfruchtbarkeitsstufe seiner Fläche und die Lage zum Umspannwerk kennt, kann die Chancen gut einschätzen – die Daten dazu stellt das Land im Geoinformationssystem DORIS bereit.",
  ],
  recht: [
    {
      titel: "Sonderausweisung im Grünland ab 50 m² Modulfläche",
      text: "Frei stehende PV-Anlagen mit mehr als 50 m² Modulfläche dürfen im Grünland nur errichtet werden, wenn der Flächenwidmungsplan eine Sonderausweisung vorsieht (§ 30a Abs. 3 Oö. ROG 1994). Ausgenommen sind Anlagen für den landwirtschaftlichen Eigenbedarf. Bis 50 m² sind frei stehende Anlagen im Grünland und in allen Baulandkategorien zulässig.",
      quelle: { titel: "Land OÖ – Leitfaden 2026 Photovoltaik (Stand Juni 2026)", url: "https://www.land-oberoesterreich.gv.at/Mediendateien/Formulare/Dokumente%20UWD%20Abt_US/Photovoltaik_Leitfaden.pdf" },
    },
    {
      titel: "Kriterienkatalog: Bodenfruchtbarkeit entscheidet",
      text: "Der Kriterienkatalog der Oö. PV-Strategie 2030 gilt vorrangig im Widmungsverfahren. Böden mit hoher bis sehr hoher natürlicher Bodenfruchtbarkeit (Stufe 4 und 5) sowie die beiden höchsten Kategorien je Gemeinde scheiden aus. Reine Freiflächenanlagen ohne landwirtschaftliche Doppelnutzung sollen nur auf Böden der niedrigsten Stufe 1 entstehen; auf den Stufen 2 und 3 ist Agri-PV vorgesehen.",
      quelle: { titel: "Land OÖ – Leitfaden zur Anwendung des Kriterienkatalogs für PV-Freiflächenanlagen", url: "https://www.land-oberoesterreich.gv.at/259165.htm" },
    },
    {
      titel: "Energiewirtschaftliche Priorität rund um Umspannwerke",
      text: "Im Radius von 5 km um bestehende Umspannwerke gilt „energiewirtschaftliche Priorität 1“, bis 7,5 km „Priorität 2“. In diesen Bereichen ist Doppelnutzung auch auf Böden der Stufen 3 und 4 möglich; Böden der höchsten Stufe 5 bleiben ausgeschlossen. Nähe zum Netz verbessert in Oberösterreich also nicht nur die Anschlusskosten, sondern auch die Widmungschancen.",
      quelle: { titel: "Land OÖ – Kriterienkatalog PV-FFA", url: "https://www.land-oberoesterreich.gv.at/259165.htm" },
    },
    {
      titel: "Elektrizitätsrecht über 1.000 kW, Naturschutz über 500 m²",
      text: "Anlagen über 1.000 kW Engpassleistung, die nicht auf künstlichen Strukturen stehen, brauchen eine Bewilligung nach § 6 Oö. ElWOG 2006 beim Amt der Landesregierung. Naturschutzrechtlich sind frei stehende Anlagen im Grünland außerhalb geschlossener Ortschaften ab mehr als 500 m² Kollektorfläche bewilligungspflichtig (§ 5 Z 21 Oö. NSchG 2001), von 2 bis 500 m² anzeigepflichtig. Baurechtlich sind PV-Anlagen bewilligungs- und anzeigefrei.",
      quelle: { titel: "Land OÖ – Leitfaden 2026 Photovoltaik", url: "https://www.land-oberoesterreich.gv.at/Mediendateien/Formulare/Dokumente%20UWD%20Abt_US/Photovoltaik_Leitfaden.pdf" },
    },
    {
      titel: "Beschleunigungsgebiete: Widmung entfällt, Verordnung in Arbeit",
      text: "Oberösterreich hat bereits gesetzlich geregelt, dass frei stehende PV-Anlagen samt Nebenanlagen und Batteriespeichern in verordneten Beschleunigungsgebieten (§ 11 Abs. 3b Oö. ROG) als widmungsneutrale Bauwerke gelten – das Widmungserfordernis entfällt. Die Verordnungen für Beschleunigungsgebiete und für PV-Ausschlusszonen wurden laut Land im Juni 2026 noch erarbeitet, ein Beschluss war für 2026 geplant.",
      quelle: { titel: "Land OÖ – Leitfaden 2026 Photovoltaik", url: "https://www.land-oberoesterreich.gv.at/Mediendateien/Formulare/Dokumente%20UWD%20Abt_US/Photovoltaik_Leitfaden.pdf" },
    },
    {
      titel: "EAG-Abschlag 25 % – Agri-PV kann ausgenommen sein",
      text: "Für Freiflächenanlagen auf landwirtschaftlich genutzten Flächen oder im Grünland sinkt der Zuschlagswert der EAG-Marktprämie um 25 % (§ 33 EAG), beim Investitionszuschuss ebenso. Für bestimmte Agri-PV-Anlagen, Deponien, Altlasten und Infrastrukturstandorte entfällt der Abschlag; beim Investitionszuschuss gibt es für bestimmte Agri-PV-Anlagen zusätzlich 30 % Zuschlag.",
      quelle: { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790" },
    },
  ],
  kulisse: {
    text: "Die Flächenkulisse in Oberösterreich ergibt sich weniger aus festen Zonen als aus dem Zusammenspiel von Bodenfruchtbarkeit, Landschaftssensibilität und Netznähe. Das Land stellt die Kriterien als Kartenebenen im DORIS-System bereit, sodass sich eine erste Einschätzung für jedes Grundstück machen lässt.",
    gut: [
      "Böden der niedrigsten Fruchtbarkeitsstufe 1 (auch für reine Freiflächen-PV)",
      "Flächen im Radius von 5 km um ein Umspannwerk (Priorität 1), dort Agri-PV auch auf Stufe 3 und 4",
      "vorbelastete Flächen wie Deponien, Altlasten und Abbauflächen",
      "Agri-PV-Konzepte mit mindestens 75 % landwirtschaftlich genutzter Fläche",
    ],
    schwierig: [
      "hoch fruchtbare Böden (Stufe 4 und 5) und die zwei besten Kategorien je Gemeinde",
      "regionale Grünzonen in den Raumordnungsprogrammen Eferding und Linz-Umland",
      "vielfältige Kultur- und Naturlandschaften mit hoher Dichte an Landschaftselementen",
      "30-jährliche Hochwasserabflussbereiche, Wald und Waldrand (mindestens 30 m Abstand)",
      "500-m-Seeuferschutzzone im Salzkammergut und an den übrigen Seen",
    ],
  },
  ablauf: {
    text: "In Oberösterreich widmet die Gemeinde eine Grünland-Sonderausweisung für PV im Flächenwidmungsplan; das Land prüft als Aufsichtsbehörde nach dem Kriterienkatalog. Vorher lohnt ein Blick auf Fruchtbarkeitsstufe, Landschaftsbewertung, Wald- und Gewässerabstände und die Entfernung zum Umspannwerk. Anschließend folgen die naturschutzrechtliche Bewilligung bei der Bezirkshauptmannschaft, bei über 1.000 kW die elektrizitätsrechtliche Bewilligung beim Land (mit Stellungnahme des Netzbetreibers) und gegebenenfalls Wasser-, Forst- und Straßenrecht – Anlagen innerhalb von 8 m neben öffentlichen Straßen nach dem Oö. Straßengesetz brauchen die Zustimmung der Straßenverwaltung.",
    behoerden: [
      { name: "Gemeinde (Gemeinderat)", rolle: "Grünland-Sonderausweisung für PV im Flächenwidmungsplan" },
      { name: "Amt der Oö. Landesregierung – Abteilung Raumordnung", rolle: "Aufsicht über die Widmung, Anwendung des Kriterienkatalogs", url: "https://www.land-oberoesterreich.gv.at/259165.htm" },
      { name: "Amt der Oö. Landesregierung – Abteilung Anlagen-, Umwelt- und Wasserrecht", rolle: "elektrizitätsrechtliche Bewilligung nach Oö. ElWOG 2006 über 1.000 kW" },
      { name: "Bezirkshauptmannschaft / Magistrat", rolle: "Naturschutz (Bewilligung über 500 m² Kollektorfläche), Wasser- und Forstrecht" },
      { name: "Netz Oberösterreich / Linz Netz", rolle: "Netzzugang und Stellungnahme im Bewilligungsverfahren" },
    ],
  },
  agri: [
    "In Oberösterreich ist Agri-PV kein Zusatz, sondern oft die einzige Möglichkeit: Auf Böden der mittleren Fruchtbarkeitsstufen 2 und 3 – und in Umspannwerksnähe auch auf Stufe 4 – lässt der Kriterienkatalog nur Anlagen mit landwirtschaftlicher Doppelnutzung zu. Das Land definiert sie so, dass mindestens 75 % der gewidmeten Fläche mit ortsüblichen Kulturen landwirtschaftlich genutzt und mit herkömmlichen Maschinen bewirtschaftet werden.",
    "Für die Förderung gelten zusätzlich die EAG-Vorgaben: Anlagen auf Agrarflächen müssen rückstandslos rückbaubar sein, die Modulunterkante muss mindestens 80 cm über dem Boden liegen und die Reihenabstände müssen mindestens zwei Meter betragen (außer bei innovativen und nachgeführten Anlagen). Für Grünland- und Ackerbaubetriebe im Innviertel und Hausruckviertel kommen damit vor allem vertikale Anlagen oder weit gestellte Reihen mit Grünlandnutzung infrage.",
  ],
  netz: {
    uenb: ["APG (Austrian Power Grid)"],
    vnb: ["Netz Oberösterreich", "Linz Netz"],
    hinweis:
      "Ende 2023 konnte Netz OÖ in sieben Umspannwerksbereichen vorübergehend keinen zusätzlichen Solarstrom aufnehmen; seither wird ausgebaut. Die verfügbaren Kapazitäten je Umspannwerk werden quartalsweise veröffentlicht, das Netz umfasst 62 Umspann- und Schaltwerke (Stand 10/2025).",
    quelle: { titel: "Netz Oberösterreich – Netzentwicklungsplan 2026", url: "https://www.ebutilities.at/documents/2026/07/V-NEP_2026_Netz_Ober%C3%B6sterreich.pdf" },
  },
  besonderheiten: [
    {
      titel: "Bodenfruchtbarkeit als Leitfunktion",
      text: "Anders als Niederösterreich arbeitet Oberösterreich nicht mit verordneten Zonen, sondern mit einer Bewertung der natürlichen Bodenfruchtbarkeit in fünf Stufen. Die besten Böden jeder Gemeinde bleiben unabhängig von der PV-Nutzung ausgeschlossen – das schützt gerade im Zentralraum und im Eferdinger Becken die Gemüse- und Ackerbauflächen.",
    },
    {
      titel: "Seen und Salzkammergut",
      text: "An allen Seen samt Ufern kann bis 500 m landeinwärts für jede maßgebliche Veränderung des Landschaftsbildes eine Naturschutzbewilligung nötig sein, an Flüssen und Bächen gelten Schutzbereiche von 50 bzw. 200 m. Im Salzkammergut mit Attersee, Traunsee und Mondsee sind Freiflächenanlagen daher kaum realistisch.",
    },
    {
      titel: "Nähe zum Umspannwerk zählt doppelt",
      text: "Die Priorität 1 im Umkreis von 5 km um Umspannwerke öffnet Doppelnutzung auch auf besseren Böden. Wer eine Fläche nahe einem Umspannwerk mit freier Kapazität hat, ist in Oberösterreich klar im Vorteil.",
    },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung:
      "Hohe Bodenwerte und Flächenkonkurrenz im Alpenvorland stehen der Agri-PV-Pflicht auf mittleren Böden und dem EAG-Abschlag gegenüber. Die Pacht liegt daher meist im mittleren Bereich; Flächen nahe freier Umspannwerke sind gefragter.",
  },
  faq: [
    {
      q: "Wie viel Pacht zahlt ein Solarpark in Oberösterreich?",
      a: "Die Pacht hängt in Oberösterreich stark davon ab, ob auf der Fläche eine reine Freiflächenanlage oder nur Agri-PV zulässig ist, und wie nah das nächste Umspannwerk mit freier Kapazität liegt. Den Rahmen für Ihre Fläche zeigt der Pachtrechner, die Widmungsfähigkeit klärt erst die Prüfung nach dem Kriterienkatalog.",
    },
    {
      q: "Ab wann braucht eine PV-Anlage im Grünland in Oberösterreich eine Widmung?",
      a: "Ab mehr als 50 m² Modulfläche ist eine Grünland-Sonderausweisung im Flächenwidmungsplan nötig. Ausgenommen sind Anlagen für den landwirtschaftlichen Eigenbedarf. In künftig verordneten Beschleunigungsgebieten entfällt das Widmungserfordernis.",
    },
    {
      q: "Wie erfahre ich die Bodenfruchtbarkeit meiner Fläche?",
      a: "Das Land stellt die Kriterien des Katalogs, darunter die natürliche Bodenfruchtbarkeit, im Geoinformationssystem DORIS dar. Stufe 1 erlaubt reine Freiflächenanlagen, Stufe 2 und 3 nur Agri-PV, Stufe 4 und 5 sind grundsätzlich ausgeschlossen – mit Ausnahmen in Umspannwerksnähe für Stufe 3 und 4.",
    },
    {
      q: "Was gilt in Oberösterreich als Agri-PV?",
      a: "Nach dem Kriterienkatalog muss mindestens 75 % der gewidmeten Fläche mit ortsüblichen Kulturen landwirtschaftlich genutzt und maschinell bewirtschaftbar bleiben. Für die EAG-Förderung kommen technische Vorgaben wie 80 cm Mindesthöhe der Modulunterkante und zwei Meter Reihenabstand hinzu.",
    },
    {
      q: "Braucht ein Solarpark in Oberösterreich eine Naturschutzbewilligung?",
      a: "Im Grünland außerhalb geschlossener Ortschaften ab mehr als 500 m² Kollektorfläche ja. Zuständig ist die Bezirkshauptmannschaft oder der Magistrat. In Seeufer- und Gewässerschutzbereichen gelten eigene Regeln.",
    },
    {
      q: "Gibt es in Oberösterreich Zonen für Solarparks?",
      a: "Feste Eignungszonen wie in Niederösterreich gibt es derzeit nicht. Das Land arbeitet an Verordnungen für Beschleunigungsgebiete und Ausschlusszonen, ein Beschluss war für 2026 geplant. Bis dahin entscheidet der Kriterienkatalog im Widmungsverfahren.",
    },
  ],
  quellen: [
    { titel: "Land Oberösterreich – Leitfaden 2026 für die Errichtung und Förderung von Photovoltaikanlagen (Stand Juni 2026)", url: "https://www.land-oberoesterreich.gv.at/Mediendateien/Formulare/Dokumente%20UWD%20Abt_US/Photovoltaik_Leitfaden.pdf", stand: "09/2026" },
    { titel: "Land Oberösterreich – Leitfaden für die Anwendung des Kriterienkatalogs für PV-Freiflächenanlagen", url: "https://www.land-oberoesterreich.gv.at/259165.htm", stand: "09/2026" },
    { titel: "Land Oberösterreich – Oö. Photovoltaik-Strategie 2030", url: "https://www.land-oberoesterreich.gv.at/259164.htm", stand: "09/2026" },
    { titel: "Netz Oberösterreich – Netzentwicklungsplan 2026", url: "https://www.ebutilities.at/documents/2026/07/V-NEP_2026_Netz_Ober%C3%B6sterreich.pdf", stand: "09/2026" },
    { titel: "Tips – Photovoltaik: Einspeisestopp in sieben Regionen in Oberösterreich (05.12.2023)", url: "https://www.tips.at/nachrichten/ooe/wirtschaft-politik/628429-photovoltaik-einspeisestopp-in-sieben-regionen-in-oberoesterreich", stand: "09/2026" },
    { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790", stand: "09/2026" },
    { titel: "Statistik Austria – Betriebe nach Flächennutzung 2023 nach Bundesland", url: "https://www.statistik.at/fileadmin/pages/155/LuFBetriebeNachFlaechennutzung2023nBL.ods", stand: "09/2026" },
    { titel: "WKO Statistik – Fläche und Benützungsarten (BEV/Statistik Austria, Stand 01.01.2025)", url: "https://www.wko.at/statistik/bundesland/flaecheben.pdf", stand: "09/2026" },
    { titel: "Statistik Austria – Bevölkerung zu Jahres-/Quartalsanfang", url: "https://www.statistik.at/statistiken/bevoelkerung-und-soziales/bevoelkerung/bevoelkerungsstand/bevoelkerung-zu-jahres-/-quartalsanfang", stand: "09/2026" },
    { titel: "JRC PVGIS 5.3 – Ertragsberechnung (Welser Heide, Innviertel)", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/", stand: "09/2026" },
  ],
  unsicher: [
    "Ob die Oö. Verordnungen zu Beschleunigungsgebieten und Ausschlusszonen bis 29.09.2026 beschlossen wurden, war nicht belegbar (Leitfaden Juni 2026: „Beschluss 2026 geplant“).",
    "Einspeisestopp in sieben UW-Bereichen stammt aus 12/2023; aktueller Stand je UW nur über ebutilities-Liste, nicht einzeln ausgewertet.",
    "Konkrete Zahlenziele der Oö. PV-Strategie 2030 (GWh/MW) nicht aus Primärquelle verifiziert – weggelassen.",
    "Keine eigene Landesförderung für Agri-PV in OÖ gefunden – weggelassen.",
    "PVGIS-Punkte: Welser Heide 48,24/14,10 (1.128), Innviertel bei Ried 48,21/13,49 (1.144).",
  ],
};

export default region;
