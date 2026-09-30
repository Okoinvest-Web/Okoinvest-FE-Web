// Recherche: 29.09.2026 – Photovoltaikstrategie für Hamburg (BUKEA, Stand 06–07/2025), hamburg.de Agri-PV und PV-Pflicht,
// Fraunhofer ISE Projekt „AgriChance“ (11/2022–08/2025), Statistikamt Nord (LF 2023), Destatis (31.12.2024),
// § 13 ROG, Hamburger Energienetze (Fusion 09/2024), Energieberg Georgswerder, PVGIS v5.3

const region = {
  slug: "hamburg",
  land: "DE",
  name: "Hamburg",
  inName: "in Hamburg",
  kurz: "HH",
  seoTitel: "Solarpark & Agri-PV Hamburg: Flächen, Recht | ÖkoInvest",
  beschreibung:
    "Freiflächen-PV und Agri-PV in Hamburg: warum große Solarparks kaum möglich sind, was in Vier- und Marschlande, Altem Land, auf Deponien und Parkplätzen geht.",
  lead:
    "Hamburg ist Stadtstaat, und die Stadt sagt es selbst: Für klassische Solarparks gibt es kaum Flächen. Chancen liegen in Agri-PV auf den Gartenbau- und Obstflächen, auf Deponien und über Parkplätzen.",
  akzent: "klein, aber nicht chancenlos.",
  ertrag: {
    kwhProKwp: 1010,
    ort: "in Kirchwerder (Vierlande)",
    spanne: "rund 970 bis 1.010 kWh/kWp",
    hinweis: "Im Norden des Stadtgebiets liefert PVGIS rund 970 kWh/kWp, in den Vier- und Marschlanden rund 1.010 kWh/kWp.",
  },
  eckdaten: {
    hauptstadt: "Hamburg",
    flaecheKm2: 755,
    lfHa: 14000,
    lfJahr: 2023,
    einwohner: 1862565,
    quelle: {
      titel: "Statistikamt Nord – Landwirtschaft in Zahlen (Agrarstrukturerhebung 2023); Destatis Gemeindeverzeichnis 31.12.2024",
      url: "https://www.statistik-nord.de/zahlen-fakten/landwirtschaft",
    },
  },
  einleitung: [
    "Hamburg hat rund 14.000 Hektar landwirtschaftlich genutzte Fläche und gut 500 landwirtschaftliche Betriebe. Das ist für eine Millionenstadt viel, für Solarparks aber wenig. Die Behörde für Umwelt, Klima, Energie und Agrarwirtschaft (BUKEA) schreibt selbst, dass sich das Bundesziel, den Solarausbau je zur Hälfte auf Dächern und Freiflächen zu verteilen, nicht auf Hamburg übertragen lässt. Die Flächenkonkurrenz ist groß, und es gibt nur wenige Flächen, die infrage kommen und nicht unter Naturschutz stehen.",
    "Die **Photovoltaikstrategie für Hamburg** setzt deshalb auf Dächer, bezieht Agrar- und Freiflächen aber ausdrücklich ein. Bis 2030 sollen in der Stadt 500 bis 800 MWp installiert sein, bis 2035 1 bis 1,5 GWp. Im Juli 2025 waren es gut 220 MWp. Nach den Dächern bildet **Agri-PV das zweitgrößte Solarpotenzial** Hamburgs. Klassische Freiflächen-PV hält die Strategie dagegen für eher gering verfügbar, weil Naturschutz, Landschaftsschutz, Erholung und landwirtschaftliche Nutzung zu berücksichtigen sind.",
    "Für Eigentümer landwirtschaftlicher Flächen in Hamburg heißt das: Ein großer Solarpark auf dem Acker ist die Ausnahme. Realistischer sind Agri-PV auf Gemüse-, Obst- und Gartenbauflächen, Anlagen auf Deponien und Konversionsflächen sowie Stellplatz-PV. Wer größere Flächen im Umland der Metropolregion besitzt, fällt unter das Planungsrecht Schleswig-Holsteins oder Niedersachsens.",
  ],
  recht: [
    {
      titel: "Flächennutzungsplan statt Regionalplan",
      text: "In Berlin, Bremen und Hamburg kann der Flächennutzungsplan die Funktion des landesweiten Raumordnungsplans übernehmen (§ 13 Abs. 1 ROG). In Hamburg gibt es deshalb keine eigene Regionalplanung mit Solar-Vorranggebieten. Ob eine Fläche infrage kommt, entscheidet sich an Flächennutzungsplan, Landschaftsprogramm, Schutzgebieten und am Bebauungsplan.",
      quelle: { titel: "§ 13 Raumordnungsgesetz", url: "https://www.gesetze-im-internet.de/rog_2008/__13.html" },
    },
    {
      titel: "PV-Pflicht auf Dächern und über Stellplätzen",
      text: "Nach § 16 und § 16a Hamburgisches Klimaschutzgesetz gilt seit 1. Januar 2024 eine PV-Pflicht bei Neubauten und bei Dachsanierungen, in der Regel für mindestens 30 Prozent der Dachfläche. Bei neuen oder erweiterten Parkplätzen mit mehr als 35 Stellplätzen müssen 40 Prozent der geeigneten Fläche mit PV überdacht werden. Ab 2027 kommt eine Pflicht für Solargründächer hinzu.",
      quelle: { titel: "hamburg.de – FAQ PV-Pflicht in Hamburg", url: "https://www.hamburg.de/politik-und-verwaltung/behoerden/bukea/themen/energie/erneuerbare-energien/photovoltaik/faq-pv-pflicht-in-hamburg-956122" },
    },
    {
      titel: "Photovoltaikstrategie: Außenbereich als eigenes Handlungsfeld",
      text: "Die PV-Strategie des Senats behandelt „Photovoltaik im Außenbereich“ als eigenes Handlungsfeld. Aufbauend auf dem Forschungsprojekt AgriChance sollen konkrete Umsetzungsmöglichkeiten für Agri-PV aufgezeigt und weniger geeignete Flächen durch technische, rechtliche und ökonomische Maßnahmen nutzbar gemacht werden. Bei klassischen Solarparks sollen biodiversitätsfördernde Maßnahmen geprüft werden.",
      quelle: { titel: "BUKEA – Photovoltaikstrategie für Hamburg", url: "https://www.hamburg.de/politik-und-verwaltung/behoerden/bukea/themen/energie/erneuerbare-energien/photovoltaik/photovoltaikstrategie-fuer-hamburg-955320" },
    },
    {
      titel: "Städtische Flächen und Vertrag für Hamburgs Stadtgrün",
      text: "Die Stadt will Flächen öffentlicher Unternehmen auf eine möglichst weitgehende PV-Belegung prüfen. Dabei berücksichtigt sie Vereinbarungen wie den Vertrag für Hamburgs Stadtgrün. Grünflächen stehen damit nur eingeschränkt für Solarparks zur Verfügung.",
      quelle: { titel: "BUKEA – Photovoltaikstrategie für Hamburg (PDF)", url: "https://www.hamburg.de/resource/blob/1105300/c2cdd188e207b17a7167580cb805933f/bukea-a4-photovoltaikstrategie-hamburg-web-barr-data.pdf" },
    },
  ],
  kulisse: {
    text: "Das Fraunhofer ISE hat im Auftrag der BUKEA untersucht, wo Agri-PV in Hamburg möglich ist. Im Fokus standen die traditionellen Kulturlandschaften: die Vier- und Marschlande, die Elbinseln Wilhelmsburg und Finkenwerder und der hamburgische Teil des Alten Landes. Neben Freilandflächen wurden ausdrücklich auch Flächen des Unterglasgartenbaus betrachtet. Klassische Solarparks bleiben die Ausnahme.",
    gut: [
      "Gemüse-, Zierpflanzen- und Obstbauflächen für Agri-PV mit Schutzfunktion gegen Hagel, Sturm und Starkregen",
      "Deponien und Altablagerungen – Beispiel Energieberg Georgswerder mit Wind und PV",
      "Große Park- und Stellplatzflächen, auch Bestandsanlagen",
      "Versiegelte Gewerbeflächen und Flächen öffentlicher Unternehmen",
    ],
    schwierig: [
      "Naturschutzgebiete, Natura-2000-Gebiete und gesetzlich geschützte Biotope",
      "Landschaftsschutzgebiete und Erholungsflächen mit hohem Nutzungsdruck",
      "Wiesen- und Grünlandflächen in den Elbmarschen mit Bedeutung für Wiesenvögel",
      "Kleine, zersplitterte Flurstücke und Flächenkonkurrenz mit Wohnungsbau und Gewerbe",
    ],
  },
  ablauf: {
    text: "Weil Hamburg Stadt und Land zugleich ist, laufen Planung und Genehmigung weitgehend innerhalb der Stadtverwaltung. Für Anlagen im Außenbereich, die nicht privilegiert sind, braucht es eine Änderung des Flächennutzungsplans und einen Bebauungsplan. Bebauungspläne werden in Hamburg in der Regel von den Bezirksämtern vorbereitet und festgestellt, die Fachbehörden werden beteiligt. Hofnahe Agri-PV bis 2,5 Hektar kann nach § 35 Abs. 1 Nr. 9 BauGB ohne Bebauungsplan zulässig sein. Agrar- und Energiethemen liegen bei der BUKEA, die auch die Ansprechstelle für die PV-Strategie stellt.",
    behoerden: [
      { name: "Bezirksamt (z. B. Bergedorf, Harburg)", rolle: "Bebauungsplanverfahren, Baugenehmigung, bezirkliche Naturschutzbelange" },
      { name: "Behörde für Umwelt, Klima, Energie und Agrarwirtschaft (BUKEA)", rolle: "PV-Strategie, Agri-PV, Naturschutz- und Agrarbelange, PV-Pflicht", url: "https://www.hamburg.de/politik-und-verwaltung/behoerden/bukea/themen/energie/erneuerbare-energien/photovoltaik" },
      { name: "Behörde für Stadtentwicklung und Wohnen", rolle: "Flächennutzungsplan und Landschaftsprogramm auf gesamtstädtischer Ebene" },
      { name: "Hamburger Energienetze", rolle: "Netzanschluss im Verteilnetz" },
    ],
  },
  agri: [
    "Agri-PV ist in Hamburg keine Randidee, sondern Teil der Senatsstrategie. Das Forschungsprojekt **AgriChance** des Fraunhofer ISE lief von November 2022 bis August 2025 im Auftrag des Amtes Agrarwirtschaft der BUKEA. Es untersuchte per GIS-Analyse, welche Flächen für Agri-PV geeignet sind, und bezog die Freilandflächen von Gartenbau und Landwirtschaft sowie den Unterglasgartenbau ein. Ziel war auch, Einkommensperspektiven für junge Betriebsleiterinnen und Betriebsleiter aufzuzeigen. Der Abschlussbericht ist bei der Stadt abrufbar.",
    "Für Hamburger Betriebe liegen die Stärken dort, wo Kulturen ohnehin Schutz brauchen: Obst im Alten Land, Gemüse und Zierpflanzen in den Vier- und Marschlanden. Die Stadt nennt Schutz vor zu viel Sonne, Austrocknung, Starkregen und Sturm, die Nutzung von Regenwasser zur Bewässerung und alternativ Tierhaltung unter den Modulen. Weil die Flächen klein sind, kommen oft hofnahe Anlagen bis 2,5 Hektar oder Kombinationen mit bestehenden Gewächshausstrukturen infrage.",
  ],
  netz: {
    uenb: ["50Hertz Transmission"],
    vnb: ["Hamburger Energienetze"],
    hinweis:
      "Seit 1. September 2024 sind Stromnetz Hamburg und Gasnetz Hamburg zur Hamburger Energienetze GmbH verschmolzen, einem vollständig städtischen Netzbetreiber. Das Stromverteilnetz ist über 30.000 Kilometer lang.",
    quelle: { titel: "hamburg.de – Fusion von Stromnetz Hamburg und Gasnetz Hamburg", url: "https://www.hamburg.de/politik-und-verwaltung/behoerden/bukea/aktuelles/pressemeldungen/2024-08-29-bukea-fusion-stromnet-und-gasnetz-hamburg-960578" },
  },
  besonderheiten: [
    {
      titel: "Energieberg Georgswerder",
      text: "Die ehemalige Deponie in Wilhelmsburg (rund 45 Hektar, 40 Meter hoch) trägt seit 2009 und 2011 Photovoltaik mit zusammen rund 900 kW am Südhang sowie Windenergieanlagen. Sie zeigt, dass Deponien in Hamburg zu den wenigen größeren Freiflächen für Solarenergie gehören, meist in städtischer Hand.",
    },
    {
      titel: "Stellplatz-PV als Freiflächen-Ersatz",
      text: "Mit der Pflicht für neue Parkplätze ab mehr als 35 Stellplätzen und dem erklärten Ziel, auch Bestandsparkplätze einzubeziehen, sind große Stellplatzanlagen in Hamburg eine der wichtigsten Freiflächen für Solarstrom. Für Eigentümer von Gewerbe- und Handelsflächen kann eine Überdachung verpachtet oder selbst betrieben werden.",
    },
    {
      titel: "Metropolregion statt Stadtgebiet",
      text: "Wer als Hamburger Betrieb oder Eigentümer größere Flächen im Umland besitzt, plant dort nach dem Recht des jeweiligen Landes, etwa nach dem Solar-Erlass in Schleswig-Holstein oder den niedersächsischen Vorgaben. Das Fraunhofer ISE betont, dass sich die Hamburger Erkenntnisse zu Agri-PV auf vergleichbare Lagen in der Metropolregion übertragen lassen.",
    },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung:
      "Flächen sind knapp und Projekte meist klein. Für die seltenen geeigneten Flächen hängt die Pacht stark vom Einzelfall ab, etwa von Netzanschluss, Agri-PV-Konzept und Nutzungskonkurrenz.",
  },
  faq: [
    {
      q: "Kann man in Hamburg einen Solarpark auf einer Freifläche bauen?",
      a: "Grundsätzlich ja, aber nur selten. Die Stadt stuft die Verfügbarkeit klassischer Freiflächen als eher gering ein, weil Natur- und Landschaftsschutz, Erholung und Landwirtschaft berücksichtigt werden müssen. Realistisch sind vor allem Deponien, versiegelte Flächen, Parkplätze und Agri-PV auf landwirtschaftlichen Flächen.",
    },
    {
      q: "Lohnt sich Agri-PV in den Vier- und Marschlanden oder im Alten Land?",
      a: "Das hängt von Kultur, Flächengröße und Netzanschluss ab. Die Stadt sieht in Agri-PV nach den Dächern das zweitgrößte Solarpotenzial Hamburgs. Das Fraunhofer ISE hat diese Kulturlandschaften als Untersuchungsschwerpunkt für mögliche Pilotanlagen genannt. Besonders interessant ist die Schutzfunktion für Obst und Gemüse.",
    },
    {
      q: "Wie viel Pacht gibt es für eine Solarfläche in Hamburg?",
      a: "Für Hamburg gibt es wegen der wenigen Projekte keine belastbaren Vergleichswerte. Die Pacht hängt vom Einzelfall ab, besonders von Netzanschluss, Größe und davon, ob die landwirtschaftliche Nutzung weiterläuft. Konkrete Werte berechnen wir auf dieser Seite aus zentralen Marktdaten.",
    },
    {
      q: "Gilt in Hamburg eine Solarpflicht für Parkplätze?",
      a: "Ja. Bei neuen oder erweiterten Stellplatzanlagen mit mehr als 35 Stellplätzen müssen 40 Prozent der geeigneten Fläche mit Photovoltaik überdacht werden (§ 16a HmbKliSchG). Es gibt Ausnahmen, etwa bei unverhältnismäßigen Kosten.",
    },
    {
      q: "Welche Behörde ist in Hamburg für Solarparks zuständig?",
      a: "Für Bebauungspläne und Baugenehmigungen in der Regel das Bezirksamt, für Energie-, Agrar- und Naturschutzfragen die BUKEA. Den Netzanschluss prüft Hamburger Energienetze.",
    },
  ],
  quellen: [
    { titel: "BUKEA – Photovoltaikstrategie für Hamburg (Webseite)", url: "https://www.hamburg.de/politik-und-verwaltung/behoerden/bukea/themen/energie/erneuerbare-energien/photovoltaik/photovoltaikstrategie-fuer-hamburg-955320", stand: "09/2026" },
    { titel: "BUKEA – Photovoltaikstrategie für Hamburg (PDF)", url: "https://www.hamburg.de/resource/blob/1105300/c2cdd188e207b17a7167580cb805933f/bukea-a4-photovoltaikstrategie-hamburg-web-barr-data.pdf", stand: "09/2026" },
    { titel: "hamburg.de – Agri-Photovoltaik und Photovoltaik im Außenbereich", url: "https://www.hamburg.de/politik-und-verwaltung/behoerden/bukea/themen/energie/erneuerbare-energien/photovoltaik/agri-pv-959398", stand: "09/2026" },
    { titel: "Fraunhofer ISE – Forschungsprojekt AgriChance", url: "https://www.ise.fraunhofer.de/de/forschungsprojekte/agrichance.html", stand: "09/2026" },
    { titel: "hamburg.de – FAQ PV-Pflicht in Hamburg", url: "https://www.hamburg.de/politik-und-verwaltung/behoerden/bukea/themen/energie/erneuerbare-energien/photovoltaik/faq-pv-pflicht-in-hamburg-956122", stand: "09/2026" },
    { titel: "hamburg.de – Fusion von Stromnetz Hamburg und Gasnetz Hamburg", url: "https://www.hamburg.de/politik-und-verwaltung/behoerden/bukea/aktuelles/pressemeldungen/2024-08-29-bukea-fusion-stromnet-und-gasnetz-hamburg-960578", stand: "09/2026" },
    { titel: "Wikipedia – Energieberg Georgswerder", url: "https://de.wikipedia.org/wiki/Energieberg_Georgswerder", stand: "09/2026" },
    { titel: "§ 13 Raumordnungsgesetz", url: "https://www.gesetze-im-internet.de/rog_2008/__13.html", stand: "09/2026" },
    { titel: "Statistikamt Nord – Landwirtschaft in Zahlen", url: "https://www.statistik-nord.de/zahlen-fakten/landwirtschaft", stand: "09/2026" },
    { titel: "PVGIS 5.3 – Europäische Kommission, JRC", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/", stand: "09/2026" },
  ],
  unsicher: [
    "Ergebnisse des AgriChance-Abschlussberichts (Potenzialzahlen in ha/MWp) nicht ausgewertet, nur Projektbeschreibung Fraunhofer ISE und Stadtseite genutzt.",
    "Zuständigkeit für B-Pläne (Bezirksämter) und F-Plan/Landschaftsprogramm (BSW) aus allgemeiner Kenntnis der Hamburger Verwaltungsstruktur, nicht für Solar-Einzelfälle belegt. Bezirke Bergedorf/Harburg nur als Beispiel (Vier- und Marschlande, Neuenfelde/Altes Land).",
    "PV-Pflicht Neubau/Dachsanierung: Stadtseite nennt 1.1.2024 als Beginn. Die Staffelung (Neubau evtl. schon ab 2023) nicht geprüft. 30-%-Anteil laut FAQ (Neubau brutto, Sanierung netto).",
    "Keine Angaben zu benachteiligten Gebieten in Hamburg gefunden, daher nicht erwähnt.",
    "Anteil der Naturschutz-/Natura-2000-Flächen am Außenbereich nicht quantifiziert. Wiesenvogel-Hinweis für Elbmarschen allgemein formuliert, nicht mit Hamburger Kulisse belegt.",
    "Energieberg Georgswerder nur über Wikipedia belegt (PV 497 kW 2009 + 405 kW 2011, Betreiber Hamburg Energie).",
    "Aussage „Erkenntnisse übertragbar auf Metropolregion“ sinngemäß aus Projektbeschreibung Fraunhofer ISE.",
  ],
};

export default region;
