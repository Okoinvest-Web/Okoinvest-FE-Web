// Recherche: 29.09.2026 – PVGIS v5.3 (JRC), Destatis Gemeindeverzeichnis (31.12.2024), Statistikportal (BHE 2025),
// IT.NRW (ASE 2023, Pachtpreise), LEP NRW 2. Änderung (GV. NRW. 2024 S. 230, Synopse MWIKE), Clearingstelle EEG|KWKG,
// Fachagentur Wind und Solar (Länderinfo NRW 11/2025, Analyse Ausschreibungen 2025), NRW.Energy4Climate, land.nrw (progres.nrw)
const region = {
  slug: "nordrhein-westfalen",
  land: "DE",
  name: "Nordrhein-Westfalen",
  inName: "in Nordrhein-Westfalen",
  kurz: "NW",
  seoTitel: "Solarpark & Agri-PV NRW: Pacht und Recht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht in NRW: Was der LEP 2024 für Freiflächen-PV regelt, warum Böden ab Bodenwertzahl 55 nur für Agri-PV infrage kommen und wie das Verfahren läuft.",
  lead:
    "Nordrhein-Westfalen hat 2024 seinen Landesentwicklungsplan für Freiflächen-Solaranlagen geöffnet – mit klaren Grenzen für gute Ackerböden. Für Flächeneigentümer heißt das: Die Bodenwertzahl entscheidet mit, ob ein klassischer Solarpark oder nur Agri-PV möglich ist.",
  akzent: "mit LEP-Kulisse und Bodenwertzahl.",
  ertrag: {
    kwhProKwp: 1060,
    ort: "in der Soester Börde",
    spanne: "rund 1.050 bis 1.060 kWh/kWp",
    hinweis:
      "Ein zweiter PVGIS-Punkt in der Jülicher Börde (Rheinisches Revier) ergibt rund 1.050 kWh/kWp; NRW liegt damit im bundesweiten Mittelfeld.",
  },
  eckdaten: {
    hauptstadt: "Düsseldorf",
    flaecheKm2: 34113,
    lfHa: 1499500,
    lfJahr: 2025,
    einwohner: 18034454,
    quelle: {
      titel: "Statistikportal des Bundes und der Länder (Bodennutzungshaupterhebung 2025); Destatis, Gemeindeverzeichnis, Stand 31.12.2024",
      url: "https://www.statistikportal.de/de/land-und-forstwirtschaft/betriebe-flaeche-viehhaltung-und-arbeitskraefte",
    },
  },
  einleitung: [
    "Nordrhein-Westfalen ist das bevölkerungsreichste Bundesland und zugleich stark landwirtschaftlich geprägt: Nach der Agrarstrukturerhebung 2023 von IT.NRW bewirtschaften rund 33.600 Betriebe etwa 1,49 Millionen Hektar, davon rund 1,07 Millionen Hektar Ackerland und gut 400.000 Hektar Dauergrünland. Gleichzeitig ist der Druck auf Flächen hoch – NRW hatte 2023 laut IT.NRW die **höchsten durchschnittlichen Pachtpreise aller Bundesländer**, mit Spitzenwerten im Regierungsbezirk Münster.",
    "Freiflächen-Photovoltaik spielt in NRW bisher eine kleinere Rolle als in Süd- oder Ostdeutschland. Nach der Länderübersicht der Fachagentur Wind und Solar waren Ende 2023 rund 357 Freiflächenanlagen mit etwa 526 MW in Betrieb, 2024 kamen rund 198 MW hinzu. In den EEG-Ausschreibungen 2025 erhielten Projekte aus NRW nach Auswertung der Fachagentur Zuschläge über rund 366 MW. Das Land strebt bis 2030 mindestens 21 GW Photovoltaik insgesamt an.",
    "Den rechtlichen Rahmen hat NRW mit der **2. Änderung des Landesentwicklungsplans (LEP)** neu gesetzt, die am 1. Mai 2024 in Kraft trat. Sie erweitert die Flächenkulisse für raumbedeutsame Freiflächen-Solaranlagen deutlich, schützt aber hochwertige Ackerböden und landwirtschaftliche Kernräume. Wer eine Fläche anbietet, sollte deshalb früh die Bodenwertzahl, die Festlegungen im Regionalplan und die EEG-Kulisse prüfen lassen.",
  ],
  recht: [
    {
      titel: "LEP NRW 2024: Solaranlagen im Freiraum grundsätzlich möglich",
      text: "Nach Ziel 10.2-14 des geänderten LEP ist Regional- oder Bauleitplanung für raumbedeutsame Freiflächen-Solaranlagen im Freiraum möglich, wenn der Standort mit der Schutz- und Nutzfunktion der jeweiligen Festlegung im Regionalplan vereinbar ist. **Ausgeschlossen sind regionalplanerische Waldbereiche und Bereiche zum Schutz der Natur (BSN).** In Regionalen Grünzügen, Landschaftsschutzbereichen, landwirtschaftlichen Kernräumen oder Grundwasserschutzbereichen ist eine Einzelfallprüfung vorgesehen; in Überschwemmungsbereichen sind Anlagen in der Regel nicht mit den Zielen der Raumordnung vereinbar.",
      quelle: { titel: "LEP NRW, Synopse der Änderungen Erneuerbare Energien (MWIKE NRW)", url: "https://www.wirtschaft.nrw/system/files/media/document/file/lep-nrw-anderung-erneuerbare-energien-synopse-der-anderungen.pdf" },
    },
    {
      titel: "Bodenwertzahl ab 55: nur Agri-PV",
      text: "Ziel 10.2-15 legt fest, dass Planungen für raumbedeutsame Freiflächen-Solaranlagen auf **hochwertigen Ackerböden nur für Agri-PV** erfolgen dürfen. Als hochwertig gelten Ackerböden mit einer **Bodenwertzahl von 55 und mehr**; maßgeblich ist die Boden- oder Ackerzahl der Bodenschätzung, bei gemischten Flächen kann der Mittelwert herangezogen werden. Die Agri-PV-Anlage muss sich an der DIN SPEC 91434 orientieren, u. a. muss der landwirtschaftliche Ertrag mindestens 66 Prozent des Referenzertrags erreichen. Nach Grundsatz 10.2-16 sollen auch landwirtschaftliche Kernräume nur für Agri-PV genutzt werden.",
      quelle: { titel: "GV. NRW. 2024 S. 230 – 2. Änderung der Verordnung über den LEP NRW", url: "https://recht.nrw.de/gvnrw/2024-s230/" },
    },
    {
      titel: "Bevorzugte Standorte laut LEP",
      text: "Grundsatz 10.2-17 nennt Standorte, die vorzugsweise genutzt werden sollen: geeignete Brachflächen, Halden und Deponien, geeignete Flächen in landwirtschaftlich benachteiligten Gebieten, künstliche und erheblich veränderte Gewässer sowie Bereiche bis 500 Meter entlang von Bundesfernstraßen, Landesstraßen und überregionalen Schienenwegen (sonst bis 200 Meter). Auch Windenergiebereiche sollen bevorzugt in Anspruch genommen werden, soweit die Windnutzung nicht beeinträchtigt wird.",
      quelle: { titel: "LEP NRW, Synopse der Änderungen Erneuerbare Energien (MWIKE NRW)", url: "https://www.wirtschaft.nrw/system/files/media/document/file/lep-nrw-anderung-erneuerbare-energien-synopse-der-anderungen.pdf" },
    },
    {
      titel: "Benachteiligte Gebiete: seit 2022 geöffnet, seit Solarpaket I Bundesrecht",
      text: "NRW hatte 2022 per Photovoltaik-Freiflächenverordnung Acker- und Grünland in benachteiligten Gebieten für EEG-Gebote geöffnet – beschränkt auf Böden mit einer Bodenwertzahl unter 55 und ohne Natura-2000-Gebiete. Laut Landesregierung umfassen die benachteiligten Gebiete in NRW rund 136.100 Hektar Acker- und 174.600 Hektar Grünland. Seit dem Solarpaket I (Mai 2024) sind benachteiligte Gebiete bundesweit grundsätzlich offen; Länder können nur noch per Verordnung beschränken, etwa wenn mehr als 1 Prozent der landwirtschaftlichen Fläche mit Freiflächenanlagen belegt ist.",
      quelle: { titel: "Clearingstelle EEG|KWKG – NRW PVFVO", url: "https://www.clearingstelle-eeg-kwkg.de/gesetz/6499" },
    },
    {
      titel: "Keine Pflicht-Beteiligung für Solarparks nach Landesrecht",
      text: "Das Bürgerenergiegesetz NRW von Ende 2023 schreibt eine finanzielle Beteiligung von Bürgern und Kommunen nur für Windenergieanlagen vor, **nicht für Freiflächen-Photovoltaik**. Für Solarparks gilt die freiwillige Kommunalbeteiligung nach § 6 EEG (bis 0,2 ct/kWh), die viele Gemeinden in der Praxis erwarten.",
      quelle: { titel: "Fachagentur Wind und Solar – Länderinformationen NRW", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/laenderinformationen/nordrhein-westfalen" },
    },
  ],
  kulisse: {
    text: "Die Flächenkulisse in NRW ergibt sich aus drei Ebenen: EEG-Förderkulisse, LEP-Vorgaben und Regionalplan. Besonders günstig sind Flächen, die mehrere Kriterien zugleich erfüllen – etwa ein Acker mit Bodenwertzahl unter 55 im 500-Meter-Streifen an einer Autobahn. Das Solarkataster im Energieatlas NRW weist seit 2024 zusätzlich Suchflächen für Freiflächen-PV aus, die als erste Orientierung dienen können.",
    gut: [
      "Acker- und Grünland mit Bodenwertzahl unter 55, vor allem in landwirtschaftlich benachteiligten Gebieten",
      "Streifen bis 500 m an Autobahnen, Bundes- und Landesstraßen sowie überregionalen Bahnstrecken",
      "Brachflächen, Halden, Deponien und frühere Bergbauflächen",
      "Flächen in Windenergiebereichen, soweit die Windnutzung nicht eingeschränkt wird",
      "Baggerseen und andere künstliche Gewässer für Floating-PV",
    ],
    schwierig: [
      "Ackerböden ab Bodenwertzahl 55 – dort nur Agri-PV (typisch in Börden wie Soester, Jülicher und Zülpicher Börde)",
      "Landwirtschaftliche Kernräume, etwa mit Sonderkulturen wie Gemüse oder Spargel",
      "Regionalplanerische Waldbereiche und Bereiche zum Schutz der Natur",
      "Überschwemmungsbereiche an Rhein, Ruhr, Lippe und anderen Flüssen",
      "Rekultivierungsflächen im Rheinischen Revier, die der Landwirtschaft vorbehalten sind",
    ],
  },
  ablauf: {
    text: "Ein Solarpark im Außenbereich braucht in NRW in der Regel einen Bebauungsplan der Gemeinde und eine passende Darstellung im Flächennutzungsplan. Dieser muss mit den Zielen der Raumordnung vereinbar sein; zuständig für die Regionalplanung sind die fünf Bezirksregierungen sowie im Ruhrgebiet der Regionalverband Ruhr. Nach dem LEP gelten Anlagen unter 2 Hektar in der Regel als nicht raumbedeutsam, zwischen 2 und 10 Hektar ist der Einzelfall zu prüfen, ab etwa 10 Hektar ist regelmäßig von Raumbedeutsamkeit auszugehen. Parallel prüfen die Kreise bzw. kreisfreien Städte Naturschutz, Artenschutz und Wasserrecht. Ausnahmen bestehen für bundesrechtlich privilegierte Anlagen, etwa im 200-Meter-Streifen an Autobahnen und Bahnstrecken oder bei hofnaher Agri-PV bis 2,5 Hektar.",
    behoerden: [
      { name: "Gemeinde / Stadt", rolle: "Aufstellungsbeschluss, Flächennutzungs- und Bebauungsplan, städtebaulicher Vertrag" },
      { name: "Bezirksregierung bzw. Regionalverband Ruhr", rolle: "Regionalplanungsbehörde: Anpassung an die Ziele der Raumordnung (§ 34 LPlG), Regionalplan" },
      { name: "Kreis / kreisfreie Stadt", rolle: "Untere Naturschutz- und Wasserbehörde, Bauaufsicht, Stellungnahmen im Verfahren" },
      { name: "Landwirtschaftskammer NRW", rolle: "Agrarstruktureller Fachbeitrag, Einschätzung zu Kernräumen und Bodenqualität", url: "https://www.landwirtschaftskammer.de" },
    ],
  },
  agri: [
    "Agri-PV hat in NRW durch den LEP 2024 eine besondere Rolle: Auf Ackerböden ab Bodenwertzahl 55 und in landwirtschaftlichen Kernräumen ist sie der einzige planerisch zulässige Weg zur Solarnutzung. Das Land verlangt dabei eine Ausrichtung an der DIN SPEC 91434 – die Landwirtschaft muss also Hauptnutzung bleiben. Für die EEG-Ausschreibung gilt Agri-PV zudem als besondere Solaranlage, die auch außerhalb der benachteiligten Gebiete geboten werden kann.",
    "Das Land fördert Agri-PV und Floating-PV über das Programm **progres.nrw**, das im Mai 2025 wieder geöffnet wurde: bis zu 25 Prozent der förderfähigen Investitionskosten, höchstens 1 Million Euro je Anlage. Demonstrationsanlagen im Rheinischen Revier, etwa bei Morschenich-Alt (Merzenich) und auf einer Rekultivierungsfläche in Titz-Jackerath, werden vom Forschungszentrum Jülich und dem Fraunhofer ISE wissenschaftlich begleitet. Ob Förderaufrufe aktuell offen sind, sollte vor Projektstart geprüft werden.",
  ],
  netz: {
    uenb: ["Amprion"],
    vnb: ["Westnetz", "Westfalen Weser Netz", "Rheinische NETZGesellschaft"],
    hinweis:
      "NRW gehört überwiegend zur Regelzone von Amprion; im Verteilnetz ist Westnetz der größte Betreiber. Die Netzanschlussfrage sollte früh mit dem zuständigen Verteilnetzbetreiber geklärt werden.",
  },
  besonderheiten: [
    {
      titel: "Rheinisches Revier",
      text: "Im Braunkohlerevier zwischen Köln, Aachen und Mönchengladbach entstehen auf Tagebaurandflächen und Halden neue Solarprojekte, darunter geförderte Agri-PV-Demonstratoren. Der LEP stellt aber klar: Zur landwirtschaftlichen Rekultivierung vorgesehene oder bereits rekultivierte Flächen zählen nicht zu den bevorzugten Brachflächen.",
    },
    {
      titel: "Hohe Flächenkonkurrenz im Münsterland und am Niederrhein",
      text: "In viehstarken und gemüsebaulich geprägten Regionen sind Flächen knapp und die landwirtschaftlichen Pachten hoch. Solarparks konkurrieren hier mit Tierhaltung (Flächenbindung für Wirtschaftsdünger) und Sonderkulturen – oft ein Argument für Agri-PV oder für Standorte an Verkehrswegen.",
    },
    {
      titel: "Floating-PV auf Baggerseen",
      text: "Der LEP nennt künstliche und erheblich veränderte Gewässer ausdrücklich als bevorzugte Standorte. Ende 2023 waren nach Angaben der Fachagentur Wind und Solar vier Floating-Anlagen in NRW in Betrieb; für Kiesgrubenbetreiber und Eigentümer von Abgrabungsgewässern ist das eine eigene Option.",
    },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung:
      "Die hohe Flächenkonkurrenz und die bundesweit höchsten Landpachten in NRW stützen die Solarpacht, die mittlere Einstrahlung und die Beschränkung guter Böden auf Agri-PV begrenzen sie. Entscheidend sind Bodenwertzahl, Netzanschluss und EEG-Kulisse der konkreten Fläche.",
  },
  faq: [
    {
      q: "Darf ich in NRW auf meinem Acker einen Solarpark bauen lassen?",
      a: "Grundsätzlich ja, wenn Gemeinde und Regionalplanung mitgehen. Liegt die Bodenwertzahl bei 55 oder höher, lässt der LEP für raumbedeutsame Anlagen aber nur Agri-PV zu. Ausgeschlossen sind Waldbereiche und Bereiche zum Schutz der Natur im Regionalplan.",
    },
    {
      q: "Hat NRW die benachteiligten Gebiete für Solarparks geöffnet?",
      a: "Ja. NRW hat sie 2022 per Verordnung für EEG-Gebote geöffnet (Bodenwertzahl unter 55, ohne Natura 2000). Seit dem Solarpaket I sind benachteiligte Gebiete bundesweit grundsätzlich zugelassen; ob Ihre Fläche in der Kulisse liegt, lässt sich flurstückgenau prüfen.",
    },
    {
      q: "Wie viel Pacht zahlt ein Solarpark in NRW?",
      a: "Das hängt von Fläche, Netzanschluss, Größe und Vermarktung ab. In NRW sorgt die starke Nachfrage nach landwirtschaftlichen Flächen dafür, dass Solarpachten konkurrenzfähig sein müssen; eine seriöse Aussage ist erst nach Prüfung der konkreten Fläche möglich.",
    },
    {
      q: "Welche Rolle spielt die Bezirksregierung?",
      a: "Die Bezirksregierung (im Ruhrgebiet der Regionalverband Ruhr) ist Regionalplanungsbehörde. Sie prüft im Bebauungsplanverfahren, ob der Standort mit den Zielen der Raumordnung vereinbar ist – etwa mit Grünzügen oder Freiraumfestlegungen.",
    },
    {
      q: "Muss der Solarpark-Betreiber in NRW die Gemeinde beteiligen?",
      a: "Eine landesrechtliche Pflicht gibt es für Solarparks nicht; das Bürgerenergiegesetz NRW gilt nur für Windenergie. Üblich ist die freiwillige Zahlung an die Gemeinde nach § 6 EEG von bis zu 0,2 ct/kWh.",
    },
    {
      q: "Gibt es in NRW Förderung für Agri-PV?",
      a: "Das Landesprogramm progres.nrw fördert Agri-PV und Floating-PV mit bis zu 25 Prozent der Investitionskosten, maximal 1 Million Euro je Anlage. Die Förderaufrufe sind zeitlich begrenzt, der aktuelle Stand sollte vorab geprüft werden.",
    },
  ],
  quellen: [
    { titel: "PVGIS v5.3, Joint Research Centre der EU (Soest / Jülicher Börde)", url: "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=51.57&lon=8.11&peakpower=1&loss=14&optimalangles=1&outputformat=json", stand: "09/2026" },
    { titel: "GV. NRW. 2024 S. 230 – 2. Änderung des LEP NRW", url: "https://recht.nrw.de/gvnrw/2024-s230/", stand: "09/2026" },
    { titel: "LEP NRW Erneuerbare Energien – Synopse der Änderungen (MWIKE)", url: "https://www.wirtschaft.nrw/system/files/media/document/file/lep-nrw-anderung-erneuerbare-energien-synopse-der-anderungen.pdf", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – NRW Photovoltaik-Freiflächenverordnung", url: "https://www.clearingstelle-eeg-kwkg.de/gesetz/6499", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – Förderung auf Acker- und Grünland (Opt-out seit Solarpaket I)", url: "https://www.clearingstelle-eeg-kwkg.de/haeufige-rechtsfrage/169", stand: "09/2026" },
    { titel: "Fachagentur Wind und Solar – Länderinformationen Nordrhein-Westfalen (Stand 11/2025)", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/laenderinformationen/nordrhein-westfalen", stand: "09/2026" },
    { titel: "Fachagentur Wind und Solar – Analyse Ausschreibungen PV auf Freiflächen 2025", url: "https://www.fachagentur-wind-solar.de/fileadmin/Veroeffentlichungen/Solar/Daten/FA_Wind_Solar_HGP_Ausschreibungen_PV_auf_Freiflaechen_2025.pdf", stand: "09/2026" },
    { titel: "IT.NRW – Pachtpreise 2023 und Agrarstrukturerhebung 2023", url: "https://www.it.nrw/nrw-hatte-2023-bundesweit-die-hoechsten-pachtpreise-fuer-landwirtschaftliche-flaechen-126571", stand: "09/2026" },
    { titel: "Statistikportal – Landwirtschaftlich genutzte Fläche nach Ländern 2025", url: "https://www.statistikportal.de/de/land-und-forstwirtschaft/betriebe-flaeche-viehhaltung-und-arbeitskraefte", stand: "09/2026" },
    { titel: "Land NRW – Förderung Agri- und Floating-PV (progres.nrw)", url: "https://www.land.nrw/pressemitteilung/solarenergie-clever-nutzen-land-foerdert-wieder-ausbau-von-agri-und-floating-pv", stand: "09/2026" },
    { titel: "Energieatlas NRW – Solarkataster mit Suchflächen Freiflächen-PV", url: "https://energieatlas.nrw.de/site/aktuelles/solarkataster-suchflaechen", stand: "09/2026" },
  ],
  unsicher: [
    "Ob NRW nach dem Solarpaket I eine Beschränkungsverordnung nach § 37c Abs. 2 EEG erlassen hat, wurde nicht gefunden; nach den Ausbauzahlen dürfte die 1-%-Schwelle nicht erreicht sein (eigene Schlussfolgerung, nicht amtlich belegt).",
    "Jährliches MW-Kontingent der NRW-Verordnung 2022 (Angaben 300 MW/Jahr bzw. 'schrittweise 300 MW') weggelassen, da seit Solarpaket I ohnehin überholt und Quellen uneinheitlich.",
    "Zuschlagsmenge NRW 2025 (rund 366 MW) aus einer schwer lesbaren Tabelle/Grafik der Fachagentur-Analyse abgelesen.",
    "Aktueller Status der progres.nrw-Förderaufrufe (offen/geschlossen) im September 2026 nicht verifiziert.",
    "Verteilnetzbetreiber-Liste nach allgemeiner Kenntnis, ohne eigene amtliche Quelle; TenneT-Anteile in NRW nicht geprüft und daher weggelassen.",
    "Börden (Soester, Jülicher, Zülpicher) als typische Standorte mit Bodenwertzahl ab 55 nach allgemeiner bodenkundlicher Kenntnis genannt, nicht einzeln belegt.",
    "Raumbedeutsamkeitsschwellen (2 ha / 10 ha) stammen aus der Begründung zum LEP (Synopse), sind Regelvermutungen, keine starren Grenzen.",
  ],
};

export default region;
