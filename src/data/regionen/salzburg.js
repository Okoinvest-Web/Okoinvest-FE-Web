// Recherche: 29.09.2026 – Salzburger Photovoltaik-Leitfaden (Stand März 2025), e5-Salzburg (Kriterien 11/2023),
// salzburg.ORF.at (02.02.2026), pv magazine (03.02.2026), Salzburg24 (Gemeinden Beschleunigungsgebiete), SN (04.08.2026),
// RIS (§ 33 EAG), Statistik Austria (Agrarstrukturerhebung 2023, Bevölkerung 01.01.2026), BEV/WKO (Fläche 01.01.2025), PVGIS v5.3
import { fristenAT } from "./fristen";

const region = {
  slug: "salzburg",
  land: "AT",
  name: "Salzburg",
  inName: "in Salzburg",
  kurz: "S",
  seoTitel: "Solarpark & Agri-PV Salzburg: Pacht, Recht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht in Salzburg: Kennzeichnung ab 200 m², Punktesystem nach Bodengüte, vorbelastete Flächen, Beschleunigungsgebiete an A1 und A10, Agri-PV-Pflicht.",
  lead:
    "Salzburg lässt Freiflächen-PV nur über eine Kennzeichnung der Gemeinde und ein Punktesystem zu, das gute Böden schützt. Vorbelastete Flächen und Agri-PV haben Vorrang.",
  akzent: "mit Punktesystem.",
  ertrag: {
    kwhProKwp: 1140,
    ort: "im Flachgau nördlich der Stadt Salzburg",
    spanne: "rund 1.140 kWh/kWp im Flachgau bis 1.230 kWh/kWp im Saalfeldner Becken",
    hinweis:
      "Innergebirg liegen die PVGIS-Werte in offenen Becken wie Saalfelden teils über dem Flachgau; in engen Tälern kann die Horizontabschattung den Ertrag deutlich mindern.",
  },
  eckdaten: {
    hauptstadt: "Salzburg",
    flaecheKm2: 7155,
    lfHa: 161466,
    lfJahr: 2023,
    einwohner: 573526,
    quelle: {
      titel: "Statistik Austria – Land- und forstwirtschaftliche Betriebe nach Flächennutzung 2023 nach Bundesland",
      url: "https://www.statistik.at/fileadmin/pages/155/LuFBetriebeNachFlaechennutzung2023nBL.ods",
    },
  },
  einleitung: [
    "Salzburg ist ein Gebirgsland mit wenig ebener Fläche: Nur rund 22 Prozent der Landesfläche zählen zum Dauersiedlungsraum, fast ein Viertel entfällt auf Almen. Die landwirtschaftlich genutzte Fläche von rund 161.000 Hektar ist überwiegend Grünland. Größere, flache Lagen gibt es vor allem im Flachgau nördlich der Landeshauptstadt, im Salzachtal des Tennengaus und in einzelnen Becken wie dem Saalfeldner Becken im Pinzgau.",
    "Die Landespolitik setzt klar auf Dächer. Freiflächenanlagen im Grünland brauchen ab 200 m² Kollektorfläche eine **Kennzeichnung der Gemeinde** nach dem Raumordnungsgesetz, und seit November 2023 entscheidet ein landesweites Punktesystem, ob ein Standort geeignet ist. Ertragreiche Böden sollen von PV frei bleiben, vorbelastete Flächen entlang hochrangiger Straßen und Bahnlinien gelten als günstig.",
    "2026 hat Salzburg zudem die Grundlage für Beschleunigungsgebiete geschaffen – ausschließlich für Photovoltaik und vor allem entlang der Autobahnen. Für Grundeigentümer bleibt Salzburg damit ein Markt mit wenigen, gut begründeten Standorten, in dem Agri-PV und vorbelastete Flächen die besten Chancen haben.",
  ],
  recht: [
    {
      titel: "Kennzeichnung ab 200 m² Kollektorfläche",
      text: "Nach § 36 Abs. 7 ROG 2009 sind frei stehende Solaranlagen mit mehr als 200 m² Kollektorfläche im Grünland nur zulässig, wenn für den Standort eine Kennzeichnung nach § 39b vorliegt. Die Kollektorflächen mehrerer Anlagen in räumlichem Naheverhältnis werden zusammengerechnet. Voraussetzung ist unter anderem, dass das räumliche Entwicklungskonzept nicht entgegensteht und ein Netzanschluss technisch möglich ist.",
      quelle: { titel: "Land Salzburg – Salzburger Photovoltaik-Leitfaden (Stand März 2025)", url: "https://www.salzburg.gv.at/fileadmin/Dateien/Energie/Erneuerbare_Energien/Leitfaden_Photovoltaik.pdf" },
    },
    {
      titel: "Punktesystem der Photovoltaik-Kennzeichnungsverordnung",
      text: "Auf unbelasteten Grünlandflächen braucht es eine Standorteignung nach der Photovoltaik-Kennzeichnungsverordnung 2023. Je nach Kategorie der Bodenfunktionsbewertung (Produktionsfunktion) sind Mindestpunkte zu erreichen: 20 Punkte bei Böden der Kategorien 1 bis 3, 30 Punkte bei Kategorie 4, 40 Punkte bei Kategorie 5. Punkte gibt es für Lage, Flächeneffizienz, Art und Größe der Anlage.",
      quelle: { titel: "Land Salzburg – Photovoltaik-Leitfaden, Kapitel ROG 2009", url: "https://www.salzburg.gv.at/fileadmin/Dateien/Energie/Erneuerbare_Energien/Leitfaden_Photovoltaik.pdf" },
    },
    {
      titel: "Vorbelastete Flächen: vereinfachtes Verfahren",
      text: "Als vorbelastet gelten nach § 5 Z 15a ROG unter anderem Materialgewinnungsstätten, Lager- und Ablagerungsplätze, Immissionsschutzstreifen, Sportanlagen, Campingplätze und Schipisten im Bereich der Aufstiegshilfen. Dort gelten dieselben Kriterien wie im Bauland, und die Kennzeichnung braucht keine aufsichtsbehördliche Kenntnisnahme, sondern nur eine Mitteilung an das Land.",
      quelle: { titel: "Land Salzburg – Photovoltaik-Leitfaden", url: "https://www.salzburg.gv.at/fileadmin/Dateien/Energie/Erneuerbare_Energien/Leitfaden_Photovoltaik.pdf" },
    },
    {
      titel: "Landeselektrizitätsgesetz: keine Bewilligung bei Fachfirma",
      text: "PV-Anlagen sind nach § 45 Abs. 3 Landeselektrizitätsgesetz 1999 unabhängig von ihrer Leistung weder anzeige- noch bewilligungspflichtig, wenn sie von einem befugten Unternehmen errichtet werden. Nur sonst gilt die Staffel: unter 150 kW frei, 150 bis 500 kW Anzeige, über 500 kW Bewilligung.",
      quelle: { titel: "Land Salzburg – Photovoltaik-Leitfaden, Kapitel LEG", url: "https://www.salzburg.gv.at/fileadmin/Dateien/Energie/Erneuerbare_Energien/Leitfaden_Photovoltaik.pdf" },
    },
    {
      titel: "Naturschutz: nur in Schutzgebieten und Lebensräumen",
      text: "Das Salzburger Naturschutzgesetz kennt keine allgemeine Bewilligungspflicht für PV. Bewilligungspflichtig sind Anlagen in Schutzgebieten und geschützten Lebensräumen nach § 24 (etwa Moore, Feuchtwiesen, Magerstandorte über 2.000 m², Uferbereiche) sowie Geländeveränderungen über 5.000 m². PV-Anlagen samt Zufahrt, Netzanschluss und Speicher liegen nach § 50a im besonderen öffentlichen Interesse.",
      quelle: { titel: "Land Salzburg – Photovoltaik-Leitfaden, Kapitel Naturschutz", url: "https://www.salzburg.gv.at/fileadmin/Dateien/Energie/Erneuerbare_Energien/Leitfaden_Photovoltaik.pdf" },
    },
    {
      titel: "Beschleunigungsgebiete nur für PV, entlang A1 und A10",
      text: "Mit einer Novelle des Raumordnungsgesetzes (Februar 2026) hat Salzburg die Grundlage für RED-III-Beschleunigungsgebiete geschaffen – ausschließlich für Photovoltaik. Vorgesehen sind rund 135 ha entlang der West- und Tauernautobahn in acht Gemeinden; auf bisher unversiegelten Flächen ist nur Agri-PV geplant. Die Verordnung mit den konkreten Flächen war nach Medienberichten im August 2026 noch ein Entwurf.",
      quelle: { titel: "salzburg.ORF.at – Land bestimmt nur Gebiete für Photovoltaik-Projekte (02.02.2026)", url: "https://salzburg.orf.at/stories/3340307/" },
    },
    ...fristenAT(),
  ],
  kulisse: {
    text: "Die Flächenkulisse in Salzburg ist schmal. Große Freiflächen gibt es kaum, und das Punktesystem bevorzugt Standorte mit Vorbelastung und geringer Bodenfunktion. Realistisch sind vor allem Projekte im Flachgau und Tennengau entlang der Autobahn, auf Abbau- und Lagerflächen sowie Agri-PV auf Grünland mit weiterer Bewirtschaftung.",
    gut: [
      "Flächen entlang der A1 und A10 (geplante Beschleunigungsgebiete)",
      "vorbelastete Flächen: Materialgewinnungsstätten, Lager- und Ablagerungsplätze, Immissionsschutzstreifen",
      "Schipisten im Bereich der Aufstiegshilfen und Sportanlagen",
      "Böden der unteren Kategorien der Bodenfunktionsbewertung",
      "Agri-PV mit fortgesetzter Grünlandnutzung",
    ],
    schwierig: [
      "ertragreiche Böden der Kategorien 4 und 5 (hohe Mindestpunktzahl)",
      "Nationalpark Hohe Tauern, Natur-, Landschafts- und Europaschutzgebiete",
      "Moore, Feuchtwiesen, Uferbereiche und andere geschützte Lebensräume",
      "30-jährliche Hochwasserabflussgebiete und Trinkwasserschutzgebiete",
      "enge, stark abgeschattete Tallagen",
    ],
  },
  ablauf: {
    text: "In Salzburg läuft ein Solarpark über die Gemeinde: Steht das räumliche Entwicklungskonzept (REK) der Kennzeichnung entgegen, muss es zuerst geändert werden – mit Umwelterheblichkeitsprüfung, sechswöchiger Auflage und aufsichtsbehördlicher Genehmigung durch die Landesregierung. Danach beschließt die Gemeinde die Kennzeichnung im Flächenwidmungsplan; auf vorbelasteten Flächen genügt eine Mitteilung an das Land. Die zentrale Anlaufstelle „Erneuerbare Energie“ des Landes berät während des gesamten Verfahrens und koordiniert Zeitpläne der Behörden.",
    behoerden: [
      { name: "Gemeinde (Gemeindevertretung)", rolle: "räumliches Entwicklungskonzept, Kennzeichnung für frei stehende Solaranlagen nach § 39b ROG" },
      { name: "Salzburger Landesregierung (Aufsichtsbehörde)", rolle: "aufsichtsbehördliche Genehmigung bzw. Kenntnisnahme der Planänderung" },
      { name: "Anlaufstelle „Erneuerbare Energie“ (Amt der Landesregierung, Referat 4/04)", rolle: "Beratung, Koordination, Verfahrenshandbuch", url: "https://www.salzburg.gv.at/fileadmin/Dateien/Energie/Erneuerbare_Energien/Leitfaden_Photovoltaik.pdf" },
      { name: "Bezirkshauptmannschaft", rolle: "Naturschutz, Wasserrecht und Forstrecht, soweit berührt" },
      { name: "Salzburg Netz", rolle: "Netzzugang und Anschlusspunkt" },
    ],
  },
  agri: [
    "Agri-PV hat in Salzburg eine besondere Stellung: In den geplanten Beschleunigungsgebieten sieht das Land auf bislang unversiegelten Flächen ausschließlich Agri-PV vor, um Bodenversiegelung zu vermeiden und die landwirtschaftliche Nutzung zu erhalten. Landesrat Martin Zauner begründete das mit dem Grundsatz, Photovoltaik gehöre primär auf die Dächer.",
    "Da Salzburg ein Grünlandland ist, geht es meist um Anlagen, unter denen gemäht oder beweidet werden kann – etwa vertikale Modulreihen oder hoch aufgeständerte Systeme. Im Punktesystem der Kennzeichnungsverordnung zählt die Art der Anlage mit; eine echte Doppelnutzung verbessert die Chancen. Förderrechtlich kann bei qualifizierter Agri-PV der 25-%-Abschlag der EAG-Marktprämie entfallen.",
  ],
  netz: {
    uenb: ["APG (Austrian Power Grid)"],
    vnb: ["Salzburg Netz"],
    hinweis:
      "Wie alle österreichischen Netzbetreiber veröffentlicht auch Salzburg Netz die verfügbaren Einspeisekapazitäten je Umspannwerk quartalsweise auf ebutilities.at.",
    quelle: { titel: "EbUtilities – Verfügbare Netzanschlusskapazitäten", url: "https://www.ebutilities.at/verfuegbare-netzanschlusskapazitaeten" },
  },
  besonderheiten: [
    {
      titel: "Nur 135 Hektar Beschleunigungsgebiete",
      text: "Die geplanten Beschleunigungsgebiete liegen in Eugendorf, Wals-Siezenheim und Hallwang (Flachgau), Golling und Kuchl (Tennengau), Flachau und Werfen (Pongau) sowie Zederhaus (Lungau) – rund 0,18 Prozent der Landesfläche. Ausgenommen sind unter anderem Schutzgebiete, der Nationalpark Hohe Tauern, Vogelzugkorridore, Wald, Moore, hochwertige Böden und Naturgefahrenzonen. Die PV-Branche kritisiert die Kulisse als zu klein.",
    },
    {
      titel: "Ausbauziel und Kritik",
      text: "Nach Angaben von PV Austria liegt Salzburg mit rund 470 MW installierter PV-Leistung auf Rang sieben der Bundesländer; das Landesziel von 600 MW bewertet der Verband als zu niedrig. Das deutet auf weiterhin knappe Freiflächen hin, aber auch auf politischen Druck, geeignete Standorte zu erschließen.",
    },
    {
      titel: "Tourismus, Pisten und Landschaftsbild",
      text: "Schipisten im Bereich der Aufstiegshilfen zählen in Salzburg zu den vorbelasteten Flächen. Gleichzeitig wiegt das Orts- und Landschaftsbild in Tourismusregionen schwer; eine Kennzeichnung setzt voraus, dass es nicht wesentlich beeinträchtigt wird.",
    },
  ],
  pacht: {
    tendenz: "unten",
    begruendung:
      "Wenige kennzeichnungsfähige Flächen, meist kleine Anlagengrößen und die Agri-PV-Pflicht auf unversiegelten Flächen erhöhen die Projektkosten. Gut gelegene, vorbelastete Flächen an der Autobahn können darüber liegen.",
  },
  faq: [
    {
      q: "Wie viel Pacht bekomme ich in Salzburg für einen Solarpark?",
      a: "In Salzburg bestimmen vor allem Kennzeichnungsfähigkeit, Anlagengröße und die Frage, ob nur Agri-PV zulässig ist, was ein Projekt tragen kann. Da viele Anlagen kleiner und aufwendiger sind als im Flachland, liegt die Pacht eher im unteren Bereich; den Rahmen zeigt der Pachtrechner.",
    },
    {
      q: "Ab welcher Größe braucht eine PV-Anlage im Grünland in Salzburg eine Kennzeichnung?",
      a: "Ab mehr als 200 m² Kollektorfläche, wobei benachbarte Anlagen zusammengerechnet werden. Die Kennzeichnung beschließt die Gemeinde im Flächenwidmungsplan.",
    },
    {
      q: "Wie funktioniert das Punktesystem in Salzburg?",
      a: "Die Photovoltaik-Kennzeichnungsverordnung 2023 verlangt je nach Bodenfunktionsbewertung eine Mindestpunktzahl: 20 Punkte bei Böden der Kategorien 1 bis 3, 30 bei Kategorie 4 und 40 bei Kategorie 5. Punkte gibt es für Lage, Flächeneffizienz, Art und Größe der Anlage – gute Böden sind damit kaum nutzbar.",
    },
    {
      q: "Wo liegen die Beschleunigungsgebiete in Salzburg?",
      a: "Geplant sind rund 135 ha entlang der A1 und A10 in Eugendorf, Wals-Siezenheim, Hallwang, Golling, Kuchl, Flachau, Werfen und Zederhaus. Auf unversiegelten Flächen ist dort nur Agri-PV vorgesehen. Die Verordnung war im Sommer 2026 noch nicht beschlossen.",
    },
    {
      q: "Braucht ein Solarpark in Salzburg eine elektrizitätsrechtliche Bewilligung?",
      a: "Wird die Anlage von einem befugten Unternehmen errichtet, ist sie nach dem Landeselektrizitätsgesetz unabhängig von der Leistung weder anzeige- noch bewilligungspflichtig. Naturschutz, Wasser- und Forstrecht können trotzdem Bewilligungen verlangen.",
    },
    {
      q: "Gibt es in Salzburg eine Anlaufstelle für PV-Projekte?",
      a: "Ja. Die Anlaufstelle „Erneuerbare Energie“ im Amt der Landesregierung berät Antragsteller juristisch und technisch und wirkt auf eine zügige Verfahrensabwicklung hin.",
    },
  ],
  quellen: [
    { titel: "Land Salzburg – Salzburger Photovoltaik-Leitfaden, Rechtliche Rahmenbedingungen (Stand März 2025)", url: "https://www.salzburg.gv.at/fileadmin/Dateien/Energie/Erneuerbare_Energien/Leitfaden_Photovoltaik.pdf", stand: "09/2026" },
    { titel: "e5-Salzburg – Kriterien für Photovoltaik auf Freiflächen festgelegt (11/2023)", url: "https://e5-salzburg.at/news/2023/11/pv-freiflaechen-kennzeichnung.php", stand: "09/2026" },
    { titel: "salzburg.ORF.at – Land bestimmt nur Gebiete für Photovoltaik-Projekte (02.02.2026)", url: "https://salzburg.orf.at/stories/3340307/", stand: "09/2026" },
    { titel: "pv magazine – Bundesland Salzburg weist Beschleunigungsgebiete für Freiflächen-Photovoltaik aus (03.02.2026)", url: "https://www.pv-magazine.de/2026/02/03/bundesland-salzburg-weist-beschleunigungsgebiete-fuer-freiflaechen-photovoltaik-aus/", stand: "09/2026" },
    { titel: "Salzburg24 – Beschleunigungsgebiete in Salzburg nur für PV-Anlagen: Diese acht Gemeinden sind betroffen", url: "https://www.salzburg24.at/news/salzburg/beschleunigungsgebiete-in-salzburg-nur-fuer-pv-anlagen-diese-acht-gemeinden-sind-betroffen-art-315711", stand: "09/2026" },
    { titel: "Salzburger Nachrichten – Salzburgs Beschleunigungs-Verordnung als Bremse für Flächen-Photovoltaik (04.08.2026)", url: "https://www.sn.at/wirtschaft/oesterreich/salzburgs-beschleunigungs-verordnung-als-bremse-fuer-flaechen-photovoltaik-art-665635", stand: "09/2026" },
    { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790", stand: "09/2026" },
    { titel: "Statistik Austria – Betriebe nach Flächennutzung 2023 nach Bundesland", url: "https://www.statistik.at/fileadmin/pages/155/LuFBetriebeNachFlaechennutzung2023nBL.ods", stand: "09/2026" },
    { titel: "WKO Statistik – Fläche und Benützungsarten (BEV/Statistik Austria, Stand 01.01.2025)", url: "https://www.wko.at/statistik/bundesland/flaecheben.pdf", stand: "09/2026" },
    { titel: "Statistik Austria – Bevölkerung zu Jahres-/Quartalsanfang", url: "https://www.statistik.at/statistiken/bevoelkerung-und-soziales/bevoelkerung/bevoelkerungsstand/bevoelkerung-zu-jahres-/-quartalsanfang", stand: "09/2026" },
    { titel: "JRC PVGIS 5.3 – Ertragsberechnung (Flachgau, Saalfeldner Becken)", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/", stand: "09/2026" },
  ],
  unsicher: [
    "Status der Salzburger Beschleunigungsgebiete-Verordnung zum 29.09.2026 unklar: SN vom 04.08.2026 spricht von Entwurf; Eugendorf sah sich laut SN nicht mehr verpflichtet – ob die Gemeindeliste final ist, offen.",
    "Ratgeber nennt „auf vorbelasteten Flächen seit 12/2022 keine eigene Widmung“; der Landes-Leitfaden (03/2025) beschreibt dagegen eine Kennzeichnung im vereinfachten Verfahren – im Text nach Leitfaden formuliert.",
    "Richtung der Bodenfunktions-Kategorien (5 = höchste Produktionsfunktion) aus der steigenden Mindestpunktzahl abgeleitet, nicht im Verordnungstext geprüft.",
    "Punktevergabe im Detail (§§ 2–4 PKV 2023), insbesondere Punkte für Agri-PV, nicht geprüft – nur allgemein erwähnt.",
    "Keine Netzengpass-Informationen für Salzburg Netz gefunden; keine Landesförderung für Agri-PV gefunden.",
    "PVGIS-Punkte: Flachgau 47,93/13,00 (1.144), Saalfelden 47,43/12,85 (1.235).",
  ],
};

export default region;
