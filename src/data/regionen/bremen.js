// Recherche: 29.09.2026 – PVGIS v5.3 (JRC), Destatis Gemeindeverzeichnis (31.12.2024), Statistikportal (BHE 2025),
// Fachagentur Wind und Solar (Länderinfo Bremen 12/2025), BSW-Solar Übersicht Solarpflichten (05/2024, BremSolarG),
// Clearingstelle EEG|KWKG, Wikipedia (Blockland, Luneplate, Freie Hansestadt Bremen, Liste Solarkraftwerke)
const region = {
  slug: "bremen",
  land: "DE",
  name: "Bremen",
  inName: "in Bremen",
  kurz: "HB",
  seoTitel: "Solarpark & Agri-PV Bremen: Flächen, Recht | ÖkoInvest",
  beschreibung:
    "Freiflächen-PV in Bremen: Warum der Stadtstaat kaum Solarpark-Flächen hat, welche Rolle Brachen, Häfen und Grünland spielen und was für Solarpark Pacht gilt.",
  lead:
    "Bremen ist ein Stadtstaat mit wenig Agrarfläche und viel Grünland unter Naturschutz. Große Solarparks sind hier die Ausnahme – realistische Chancen liegen auf Brachen, Bahn- und Hafenflächen oder im niedersächsischen Umland.",
  akzent: "ehrlich eingeordnet.",
  ertrag: {
    kwhProKwp: 1000,
    ort: "im Blockland (Bremen-Nord/West)",
    hinweis:
      "Der PVGIS-Wert liegt auf dem Niveau des nordwestdeutschen Tieflands und etwas unter süddeutschen Standorten.",
  },
  eckdaten: {
    hauptstadt: "Bremen",
    flaecheKm2: 420,
    lfHa: 7800,
    lfJahr: 2025,
    einwohner: 704881,
    quelle: {
      titel: "Statistikportal des Bundes und der Länder (Bodennutzungshaupterhebung 2025); Destatis, Gemeindeverzeichnis, Stand 31.12.2024",
      url: "https://www.statistikportal.de/de/land-und-forstwirtschaft/betriebe-flaeche-viehhaltung-und-arbeitskraefte",
    },
  },
  einleitung: [
    "Das Land Bremen besteht aus den Städten Bremen und Bremerhaven und umfasst rund 420 Quadratkilometer. Landwirtschaftlich genutzt werden nach der Bodennutzungshaupterhebung 2025 nur etwa 7.800 Hektar, bewirtschaftet von rund 130 Betrieben. Allein die Häfen belegen mehr als 30 Quadratkilometer. Für klassische Solarparks auf Ackerland, wie sie in Flächenländern entstehen, ist Bremen deshalb kaum der richtige Ort.",
    "Das heißt nicht, dass Freiflächen-PV in Bremen keine Rolle spielt. Die **Klimaschutzstrategie 2038** sieht 500 MW Photovoltaik bis 2030 und 1.000 MW bis 2038 vor; Ende 2024 waren nach Angaben der Fachagentur Wind und Solar rund 135 MW installiert. Der Großteil soll auf Dächern entstehen, doch laut Koalitionsvertrag 2023–2027 sollen zusätzlich Vorrangflächen für Solar identifiziert werden – mit Priorität für bereits versiegelte Flächen und Brachen.",
  ],
  recht: [
    {
      titel: "Solarpflicht nach BremSolarG",
      text: "Das Bremische Solargesetz verpflichtet seit 1. Juli 2024 bei grundlegender Dachsanierung zur Installation einer PV-Anlage, seit 1. Juli 2025 gilt die Pflicht für alle Neubauten; bei Neubauten müssen mindestens 50 Prozent der Bruttodachfläche belegt werden. Ersatzweise ist eine Anlage auf **Außenflächen** möglich. Die Pflicht zeigt die Stoßrichtung des Landes: Solar zuerst auf Gebäuden und versiegelten Flächen.",
      quelle: { titel: "BSW-Solar – Übersicht Solarpflichten der Bundesländer (05/2024)", url: "https://www.solarwirtschaft.de/wp-content/uploads/2024/05/Uebersicht_Solarpflichten_Bundeslaender_Langfassungen.pdf" },
    },
    {
      titel: "Klimaschutz- und Energiegesetz und Ausbauziele",
      text: "Das Bremische Klimaschutz- und Energiegesetz (BremKEG) ist seit April 2023 in Kraft. Die Klimaschutzstrategie 2038 vom November 2022 nennt als Solarziele 500 MW bis 2030 und 1.000 MW bis 2038. Ein eigenes Flächenziel speziell für Freiflächenanlagen wurde nicht gefunden.",
      quelle: { titel: "Fachagentur Wind und Solar – Länderinformationen Bremen (Stand 12/2025)", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/laenderinformationen/bremen" },
    },
    {
      titel: "Flächennutzungsplan: Solar kombiniert mit Grün",
      text: "Nach der Länderübersicht der Fachagentur Wind und Solar sieht der Bremer Flächennutzungsplan vor, Photovoltaik mit Grünflächen und Biotopen zu kombinieren, insbesondere auf **ehemaligen Bahnflächen**. Der Koalitionsvertrag nennt außerdem ein Agri-PV-Modellprojekt und eine Freiflächenanlage am Flughafen.",
      quelle: { titel: "Fachagentur Wind und Solar – Länderinformationen Bremen (Stand 12/2025)", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/laenderinformationen/bremen" },
    },
    {
      titel: "Benachteiligte Gebiete: kein Landesrecht, Bundesrecht gilt",
      text: "Bremen gehörte nicht zu den Ländern, die vor 2024 per Verordnung benachteiligte Gebiete für EEG-Gebote geöffnet hatten. Seit dem Solarpaket I sind solche Flächen bundesweit grundsätzlich zugelassen. Ob einzelne Bremer Flächen in der Kulisse liegen, muss im Einzelfall geprüft werden.",
      quelle: { titel: "Clearingstelle EEG|KWKG – Förderung auf Acker- und Grünland", url: "https://www.clearingstelle-eeg-kwkg.de/haeufige-rechtsfrage/169" },
    },
  ],
  kulisse: {
    text: "Die wenigen Außenbereichsflächen Bremens sind überwiegend Grünland in feuchten Marschen, oft mit Schutzstatus und großer Bedeutung für Wiesenvögel. Das Blockland im Nordwesten der Stadt etwa ist flaches Marschland auf 0,7 bis 1,8 Metern über Normalnull und wird fast ausschließlich als Grünland für Milchviehhaltung genutzt; hier liegen die Naturschutzgebiete Untere Wümme und Kuhgrabensee. In Bremerhaven ist die Luneplate (rund 1.470 Hektar) größtenteils Vogelschutzgebiet und ökologische Ausgleichsfläche für den Containerhafen. Realistische Standorte finden sich daher eher im Siedlungs- und Hafenbereich.",
    gut: [
      "Ehemalige Bahn- und Gewerbebrachen, wie im Flächennutzungsplan angelegt",
      "Versiegelte Flächen, Parkplätze und Lagerflächen in Häfen und Gewerbegebieten",
      "Flughafen- und Infrastrukturflächen, soweit Betrieb und Sicherheit es zulassen",
      "500-m-Streifen an Autobahnen und Schienenwegen, soweit dort Freiflächen verfügbar sind",
    ],
    schwierig: [
      "Feuchtgrünland im Blockland, Werderland und Niedervieland mit Wiesenvogel- und Naturschutzfunktion",
      "Naturschutz- und EU-Vogelschutzgebiete, etwa Untere Wümme oder Luneplate",
      "Ausgleichsflächen für Hafen- und Infrastrukturprojekte",
      "Überschwemmungs- und Deichvorland an Weser, Lesum und Wümme",
      "Kleinteilige Flächen unter wenigen Hektar, die für einen wirtschaftlichen Solarpark oft zu klein sind",
    ],
  },
  ablauf: {
    text: "In Bremen gibt es keine Landkreise und keine eigene Regionalplanung wie in Flächenländern: Stadt und Land fallen zusammen. Den Flächennutzungsplan und die Bebauungspläne für die Stadt Bremen erarbeitet das zuständige Senatsressort für Stadtentwicklung, beschlossen werden sie von der Stadtbürgerschaft; in Bremerhaven liegt die Bauleitplanung beim Magistrat und der Stadtverordnetenversammlung. Naturschutz- und Wasserrecht prüfen die jeweiligen städtischen bzw. senatorischen Fachbehörden. Für Grundstücke am Stadtrand lohnt oft der Blick über die Landesgrenze, weil dort andere Regeln gelten.",
    behoerden: [
      { name: "Senatsressort für Stadtentwicklung / Stadtbürgerschaft (Stadt Bremen)", rolle: "Flächennutzungsplan, Bebauungspläne, Beschluss" },
      { name: "Magistrat Bremerhaven / Stadtverordnetenversammlung", rolle: "Bauleitplanung in Bremerhaven" },
      { name: "Senatorin für Umwelt, Klima und Wissenschaft", rolle: "Klimaschutzstrategie, Solarportal, Naturschutz und Wasserrecht" },
      { name: "Landwirtschaftskammer Bremen", rolle: "Agrarstrukturelle Belange der Grünlandbetriebe" },
    ],
  },
  agri: [
    "Weil Bremens Landwirtschaft fast ausschließlich aus Grünland- und Milchviehbetrieben besteht, ist klassische Agri-PV über Ackerkulturen kaum ein Thema. Denkbar sind Anlagen auf Grünland mit weiterer Mahd oder Beweidung, etwa mit vertikal aufgeständerten Modulen – allerdings nur dort, wo kein Wiesenvogelschutz und keine Schutzgebietsverordnung entgegensteht. Der Koalitionsvertrag 2023–2027 nennt ausdrücklich ein Agri-PV-Modellprojekt; ob und wo es umgesetzt wird, ist nach aktuellem Recherchestand offen.",
    "Für Landwirte mit Flächen im Bremer Umland ist die Lage anders: Die angrenzenden niedersächsischen Landkreise wie Osterholz, Verden, Diepholz, Wesermarsch und Cuxhaven unterliegen dem niedersächsischen Landes-Raumordnungsprogramm, der Akzeptanzabgabe nach NWindPVBetG und dem Flächenziel des Niedersächsischen Klimagesetzes. Wer Flächen auf beiden Seiten der Landesgrenze bewirtschaftet, sollte sie getrennt prüfen lassen.",
  ],
  netz: {
    uenb: ["TenneT TSO"],
    vnb: ["wesernetz Bremen", "wesernetz Bremerhaven"],
    hinweis:
      "Im Stadtgebiet liegen Netzanschlusspunkte meist näher als in ländlichen Regionen; entscheidend ist die freie Kapazität am jeweiligen Umspannwerk.",
  },
  besonderheiten: [
    {
      titel: "Häfen und Logistik als Solarstandorte",
      text: "Mit über 30 Quadratkilometern Hafenfläche hat Bremen große versiegelte Areale. Ein Beispiel für die Nutzung ist die Dachanlage des C3-Logistikcenters der BLG mit rund 9 MW, die 2023 in Betrieb ging. Freiflächenähnliche Anlagen auf Lager- und Stellflächen folgen derselben Logik.",
    },
    {
      titel: "Luneplate: Naturschutz statt Solarpark",
      text: "Die frühere Weserinsel Luneplate kam 2010 zu Bremerhaven. Rund 940 Hektar sind EU-Vogelschutzgebiet und Naturschutzgebiet, große Teile werden seit 2003/2004 als Ausgleichsfläche wiedervernässt; nur ein Bereich von etwa 2 Quadratkilometern im Norden ist für Gewerbe vorgesehen.",
    },
    {
      titel: "Umland Niedersachsen",
      text: "Die meisten Freiflächenprojekte rund um Bremen entstehen jenseits der Landesgrenze. Dort gelten das niedersächsische Planungsrecht und die Pflichtabgabe an die Gemeinden – ein anderer Rahmen als im Stadtstaat.",
    },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung:
      "In Bremen gibt es nur sehr wenige geeignete Freiflächen, sodass sich keine eigene Marktlage ableiten lässt; Pachtangebote richten sich nach Größe, Netzanschluss und Vorbelastung der einzelnen Fläche.",
  },
  faq: [
    {
      q: "Kann ich in Bremen meine Wiese für einen Solarpark verpachten?",
      a: "In Einzelfällen ja, oft aber schwierig: Viele Grünlandflächen liegen in Schutzgebieten oder sind für Wiesenvögel bedeutsam. Zudem braucht es einen Bebauungsplan der Stadt. Chancen bestehen am ehesten bei vorbelasteten Flächen nahe Verkehrswegen oder Gewerbe.",
    },
    {
      q: "Hat Bremen die benachteiligten Gebiete geöffnet?",
      a: "Bremen hatte keine eigene Öffnungsverordnung. Seit dem Solarpaket I 2024 sind benachteiligte Gebiete bundesweit grundsätzlich für EEG-Gebote zugelassen; ob eine Bremer Fläche dazugehört, ist im Einzelfall zu prüfen.",
    },
    {
      q: "Welche Flächen hält Bremen selbst für Solar geeignet?",
      a: "Vorrangig versiegelte Flächen und Brachen. Der Flächennutzungsplan sieht Solar in Kombination mit Grünflächen besonders auf früheren Bahnflächen vor, der Koalitionsvertrag nennt zusätzlich eine Anlage am Flughafen.",
    },
    {
      q: "Wie viel Pacht bringt eine Solarfläche in Bremen?",
      a: "Wegen der geringen Zahl vergleichbarer Projekte gibt es keinen Bremer Richtwert. Maßgeblich sind Flächengröße, Netzanschluss und ob die Fläche in der EEG-Kulisse liegt. Eine Einschätzung ist nur nach Prüfung der konkreten Fläche möglich.",
    },
    {
      q: "Ich habe Flächen im niedersächsischen Umland – was gilt dort?",
      a: "Dort gilt niedersächsisches Recht: das Landes-Raumordnungsprogramm, die Regionalplanung des Landkreises und die Akzeptanzabgabe von 0,2 ct/kWh an die Standortgemeinde nach dem NWindPVBetG.",
    },
  ],
  quellen: [
    { titel: "PVGIS v5.3, Joint Research Centre der EU (Blockland)", url: "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=53.13&lon=8.75&peakpower=1&loss=14&optimalangles=1&outputformat=json", stand: "09/2026" },
    { titel: "Fachagentur Wind und Solar – Länderinformationen Bremen (Stand 12/2025)", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/laenderinformationen/bremen", stand: "09/2026" },
    { titel: "BSW-Solar – Übersicht Solarpflichten der Bundesländer (05/2024)", url: "https://www.solarwirtschaft.de/wp-content/uploads/2024/05/Uebersicht_Solarpflichten_Bundeslaender_Langfassungen.pdf", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – Förderung auf Acker- und Grünland (Opt-out seit Solarpaket I)", url: "https://www.clearingstelle-eeg-kwkg.de/haeufige-rechtsfrage/169", stand: "09/2026" },
    { titel: "Statistikportal – Landwirtschaftlich genutzte Fläche nach Ländern 2025", url: "https://www.statistikportal.de/de/land-und-forstwirtschaft/betriebe-flaeche-viehhaltung-und-arbeitskraefte", stand: "09/2026" },
    { titel: "Wikipedia – Blockland", url: "https://de.wikipedia.org/wiki/Blockland", stand: "09/2026" },
    { titel: "Wikipedia – Luneplate", url: "https://de.wikipedia.org/wiki/Luneplate", stand: "09/2026" },
    { titel: "Wikipedia – Freie Hansestadt Bremen (Fläche, Häfen)", url: "https://de.wikipedia.org/wiki/Freie_Hansestadt_Bremen", stand: "09/2026" },
    { titel: "Wikipedia – Liste von Solarkraftwerken in Deutschland (C3 Logistikcenter Bremen)", url: "https://de.wikipedia.org/wiki/Liste_von_Solarkraftwerken_in_Deutschland", stand: "09/2026" },
  ],
  unsicher: [
    "Ob und welche Bremer Flächen zur EU-Kulisse der benachteiligten Gebiete gehören, nicht verifiziert (ML-Seite 'Niedersachsen und Bremen' ohne Bremer Details).",
    "Laut schwer lesbarer Tabelle der Fachagentur-Analyse 2025 evtl. rund 19 MW EEG-Zuschläge in Bremen 2025 – nicht übernommen, da Zuordnung unsicher.",
    "Konkrete Freiflächen-PV-Projekte auf Deponien in Bremen (z. B. Deponie Blockland) nicht belegt und daher nicht genannt.",
    "Umsetzungsstand von Agri-PV-Modellprojekt und Flughafen-PV (nur Koalitionsvertrag laut Fachagentur) nicht geprüft.",
    "Behördenzuständigkeiten (Senatsressort Stadtentwicklung, Magistrat, Landwirtschaftskammer Bremen) und wesernetz als VNB nach allgemeiner Kenntnis, nicht mit eigener Quelle belegt.",
    "Blockland/Werderland/Niedervieland als Feuchtgrünland mit Wiesenvogelfunktion: für Blockland per Wikipedia belegt, für Werderland/Niedervieland nur allgemeine Kenntnis.",
    "Umland-Landkreise (Osterholz, Verden, Diepholz, Wesermarsch, Cuxhaven) nach Geografie, nicht gesondert belegt.",
  ],
};

export default region;
