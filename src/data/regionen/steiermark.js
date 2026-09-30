// Recherche: 29.09.2026 – Land Steiermark (Entwicklungsprogramm Solarenergie, 1. Änderung LGBl. Nr. 12/2026),
// Steiermärkisches Verfahrenshandbuch Erneuerbare Energien PV (A13, Stand August 2025), A17-Vortrag RED III /
// StROG-Novelle LGBl. Nr. 20/2026 (04.03.2026), Statistik Austria Agrarstrukturerhebung 2023, WKO Fläche 2025,
// ORF Steiermark (Agri-PV Haidegg, 17.03.2024), RIS EAG § 33, Parlament EABG, PVGIS v5.3.
const region = {
  slug: "steiermark",
  land: "AT",
  name: "Steiermark",
  inName: "in der Steiermark",
  kurz: "St",
  seoTitel: "Solarpark & Agri-PV Steiermark: Pacht, Recht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht Steiermark: Vorrangzonen des Sachprogramms Solarenergie, Widmung im Freiland, Agri-PV-Regeln und Netz – Freiflächen-PV für Flächeneigentümer.",
  lead: "In der Steiermark entscheidet das Sachprogramm Solarenergie, wo große Freiflächenanlagen entstehen dürfen: 36 Vorrangzonen für Parks über 10 ha, außerhalb davon deutlich kleinere Widmungen durch die Gemeinde.",
  akzent: "mit Vorrangzone und Widmung.",
  ertrag: {
    kwhProKwp: 1220,
    ort: "bei Leibnitz (Südsteiermark)",
    spanne: "rund 1.220 bis 1.230 kWh/kWp",
    hinweis: "Zweiter PVGIS-Punkt bei Feldbach im steirischen Vulkanland; im alpinen Norden des Landes spielt Freiflächen-PV kaum eine Rolle.",
  },
  eckdaten: {
    hauptstadt: "Graz",
    flaecheKm2: 16400,
    lfHa: 346351,
    lfJahr: 2023,
    quelle: {
      titel: "Statistik Austria – Agrarstrukturerhebung 2023 (Pressemitteilung 26.06.2025); Fläche: WKO/Statistik Austria, Stand 01.01.2025",
      url: "https://www.statistik.at/fileadmin/announcement/2025/06/20250626AS2023.pdf",
    },
  },
  einleitung: [
    "Die Steiermark hat als eines der ersten Bundesländer die Standortfrage für große Solarparks landesweit vorab entschieden. Mit dem **Entwicklungsprogramm für den Sachbereich Erneuerbare Energie – Solarenergie** (kurz SAPRO Solarenergie, LGBl. Nr. 52/2023, wirksam seit 07.06.2023) hat das Land 36 Vorrangzonen für Photovoltaik-Freiflächenanlagen mit mehr als 10 ha Flächenbedarf festgelegt. Gleichzeitig schützen Ausschlusszonen hochwertige landwirtschaftliche Produktionsflächen sowie wertvolle Natur- und Landschaftsräume. Die 1. Änderung des Programms wurde mit LGBl. Nr. 12/2026 kundgemacht und ist seit 13.02.2026 in Kraft.",
    "Für Flächeneigentümer heißt das: Liegt Ihre Fläche in einer Vorrangzone, ist sie für einen großen Park bereits „reserviert“, ein eigenes Widmungsverfahren der Gemeinde entfällt. Außerhalb der Vorrangzonen bleibt die Gemeinde zuständig – und sie darf nur deutlich kleinere Flächen ausweisen, in der Regel bis 2 ha und höchstens 10 ha. Das ist der wichtigste Unterschied zu Bundesländern, in denen die Gemeinde allein über die Größe entscheidet.",
    "Landwirtschaftlich prägen die Steiermark kleine Betriebsstrukturen, Grünland im Norden und Westen sowie Acker-, Obst- und Weinbau im Süden und Osten. Laut Agrarstrukturerhebung 2023 bewirtschafteten 19.549 Betriebe rund 346.000 ha landwirtschaftlich genutzte Fläche. Für Freiflächen-PV kommen vor allem das Grazer Feld, das Leibnitzer Feld, das Vulkanland und die Täler von Mur, Raab und Feistritz infrage – Hanglagen, Sonderkulturen und Hagel sind dabei eigene Themen.",
  ],
  recht: [
    {
      titel: "Sachprogramm Solarenergie: 36 Vorrangzonen, Ausschlusszonen",
      text: "Für Freiflächenanlagen mit mehr als 10 ha Flächenbedarf legt das SAPRO Solarenergie landesweit 36 Vorrangzonen im öffentlichen Interesse fest, nach Angaben des Landes rund 780 ha. In den Vorrangzonen dürfen PV-Freiflächenanlagen ohne eigenes örtliches Raumordnungsverfahren errichtet werden; eine Pflicht zur Umsetzung besteht nicht. In Ausschlusszonen sind Festlegungen im Flächenwidmungsplan und im örtlichen Entwicklungskonzept für Freiflächenanlagen unzulässig.",
      quelle: { titel: "Land Steiermark – Entwicklungsprogramm Erneuerbare Energie – Solarenergie", url: "https://www.landesentwicklung.steiermark.at/cms/beitrag/12916430/145230171/" },
    },
    {
      titel: "Widmung außerhalb der Zonen: ab 400 m² Sondernutzung",
      text: "Nach dem Steiermärkischen Raumordnungsgesetz (StROG) dürfen Anlagen bis 400 m² Brutto-Modulfläche im Freiland ohne eigene Widmung errichtet werden (nicht in Freihaltegebieten). Darüber ist eine **Sondernutzung im Freiland für Energieerzeugungsanlagen** nötig. Ab einer Widmungsfläche von mehr als 3.000 m² braucht es zusätzlich eine Festlegung als Eignungszone im örtlichen Entwicklungskonzept (ÖEK). Auf örtlicher Ebene gelten die Obergrenzen von 2 ha bzw. höchstens 10 ha.",
      quelle: { titel: "Land Steiermark – Verfahrenshandbuch Erneuerbare Energien: PV und Solaranlagen (Stand August 2025)", url: "https://www.verwaltung.steiermark.at/cms/dokumente/12898224_173036325/f51050a9/Verfahrenshandbuch%20Erneuerbare%20Energie%20PV%20und%20Solaranlagen.pdf" },
    },
    {
      titel: "Elektrizitätsrecht: Landesgenehmigung über 1.000 kW",
      text: "Anlagen mit mehr als 1.000 kW brauchen eine Genehmigung der Landesregierung nach § 5 Stmk. ElWOG 2005; ein eigenes Bauverfahren bei der Gemeinde entfällt dann. Darunter ist das Steiermärkische Baugesetz maßgeblich: je nach Größe Meldung, vereinfachtes oder ordentliches Baubewilligungsverfahren bei der Gemeinde. In Vorrangzonen läuft das Verfahren nach Angaben des Landes konzentriert nach dem ElWOG.",
      quelle: { titel: "Land Steiermark – Verfahrenshandbuch Erneuerbare Energien: PV und Solaranlagen (Stand August 2025)", url: "https://www.verwaltung.steiermark.at/cms/dokumente/12898224_173036325/f51050a9/Verfahrenshandbuch%20Erneuerbare%20Energie%20PV%20und%20Solaranlagen.pdf" },
    },
    {
      titel: "Naturschutz und Artenschutz ab 2.500 m²",
      text: "In Schutzgebieten und in deren relevantem Nahbereich ist eine naturschutzrechtliche Bewilligung nach dem StNSchG 2017 nötig, in Landschaftsschutzgebieten auch für Anlagen außerhalb geschlossener Ortschaften. Unabhängig davon sind bei Freiflächenanlagen ab 2.500 m² spätestens drei Monate vor Baubeginn Unterlagen zur artenschutzrechtlichen Prüfung vorzulegen – in der Regel ein ökologisches Gutachten, das oft eine Vegetationsperiode an Erhebungen braucht.",
      quelle: { titel: "Land Steiermark – Verfahrenshandbuch Erneuerbare Energien: PV und Solaranlagen (Stand August 2025)", url: "https://www.verwaltung.steiermark.at/cms/dokumente/12898224_173036325/f51050a9/Verfahrenshandbuch%20Erneuerbare%20Energie%20PV%20und%20Solaranlagen.pdf" },
    },
    {
      titel: "Beschleunigungsgebiete: StROG-Novelle 2026",
      text: "Mit der Novelle LGBl. Nr. 20/2026 (in Kraft seit 28.02.2026) hat die Steiermark Beschleunigungsgebiete nach der EU-Richtlinie RED III in das Raumordnungsgesetz aufgenommen (§ 13b StROG). Natura-2000- und Naturschutzgebiete, Nationalparke und Hauptvogelzugrouten sind ausgeschlossen, künstliche und versiegelte Flächen sind vorrangig zu berücksichtigen. Das Land sieht die Vorrangzonen des Sachprogramms als bereits etabliertes Steuerungsinstrument. Welche Flächen konkret per Verordnung zu Beschleunigungsgebieten werden, war zum Recherchestand noch offen.",
      quelle: { titel: "Land Steiermark, A17 – EU-Richtlinie RED III: Beschleunigungsgebiete (Vortrag 04.03.2026)", url: "https://www.verwaltung.steiermark.at/cms/dokumente/11680519_75777056/7ba0ab9f/2_20260304_REDIII_Seebacher.pdf" },
    },
    {
      titel: "EAG: 25 % Abschlag auf Agrar- und Grünlandflächen",
      text: "Wie in ganz Österreich verringert sich der Zuschlagswert der EAG-Marktprämie für Anlagen auf landwirtschaftlich genutzten Flächen oder im Grünland um 25 %. Ausgenommen sein können unter anderem Agri-PV-Anlagen, bei denen die landwirtschaftliche Hauptnutzung nicht oder nur gering beeinträchtigt wird, sowie vorbelastete Flächen.",
      quelle: { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790" },
    },
  ],
  kulisse: {
    text: "Beispiele, die das Land selbst nennt, sind die Vorrangzone Dornau in Halbenrain und der Solarpark Dobl-Zwaring südwestlich von Graz; die Zonen umfassen nach Angaben des Landes weitgehend homogene Gebiete. Kriterien bei der Auswahl waren unter anderem eine Mindestgröße von 10 ha und die Nähe zu einem Netzanschlusspunkt. Außerhalb der Zonen entscheidet die Gemeinde im Rahmen von 2 bzw. 10 ha. Ob eine Fläche in einer Vorrang- oder Ausschlusszone liegt, zeigt der Digitale Atlas des Landes (GIS Steiermark).",
    gut: [
      "Flächen innerhalb einer der 36 Vorrangzonen",
      "vorbelastete Flächen wie ehemalige Schottergruben, Deponien oder Flächen entlang von Verkehrsinfrastruktur",
      "ebene oder leicht geneigte Acker- und Grünlandflächen im Grazer und Leibnitzer Feld sowie im Vulkanland",
      "Flächen bis 2 ha in Gemeinden mit ÖEK-Eignungszone für Energieerzeugung",
      "Agri-PV im Obstbau oder mit Beweidung bei weiterlaufender Bewirtschaftung",
    ],
    schwierig: [
      "Ausschlusszonen für hochwertige Agrarböden und Landschaftsräume",
      "Freihaltegebiete im Flächenwidmungsplan",
      "Natura-2000-, Natur- und Landschaftsschutzgebiete sowie deren Nahbereich",
      "steile Hanglagen und rutschungsanfällige Standorte",
      "Hochwasserabflussgebiete an Mur, Raab und Feistritz (wasserrechtliche Bewilligung)",
    ],
  },
  ablauf: {
    text: "In einer Vorrangzone läuft ein großer Park ohne örtliches Widmungsverfahren direkt in die elektrizitätsrechtliche Genehmigung beim Land, das Naturschutz- und Artenschutzaspekte mitprüft. Außerhalb der Zonen braucht es zuerst die Gemeinde: Ab 3.000 m² ist eine Eignungszone im ÖEK festzulegen und der Flächenwidmungsplan um die Sondernutzung zu ändern, beides mit Gemeinderatsbeschluss und Prüfung durch das Land. Danach folgen je nach Leistung das Bauverfahren der Gemeinde oder die ElWOG-Genehmigung, dazu Naturschutz, Wasser- und Forstrecht. Anlaufstelle für Fragen zu Verfahren ist die Anlaufstelle „Erneuerbare Energie“ des Landes.",
    behoerden: [
      { name: "Gemeinde (Gemeinderat, Bürgermeister)", rolle: "ÖEK-Eignungszone, Sondernutzung im Flächenwidmungsplan, Baubewilligung bis 1.000 kW" },
      { name: "Amt der Steiermärkischen Landesregierung, A17 Landes- und Regionalentwicklung", rolle: "Sachprogramm Solarenergie, Vorrangzonen, Beschleunigungsgebiete", url: "https://www.landesentwicklung.steiermark.at/cms/beitrag/12916430/145230171/" },
      { name: "Steiermärkische Landesregierung (Energierecht)", rolle: "Genehmigung nach Stmk. ElWOG über 1.000 kW" },
      { name: "Bezirkshauptmannschaft", rolle: "Naturschutz, Artenschutz, Wasser- und Forstrecht (in Graz der Magistrat)" },
    ],
  },
  agri: [
    "Das StROG definiert Agri-PV eigenständig: Die landwirtschaftliche Produktion muss Hauptnutzung bleiben, die Module sind gleichmäßig über die Fläche zu verteilen, und mindestens 75 % der Gesamtfläche müssen weiter der pflanzlichen oder tierischen Produktion dienen. Ein land- und forstwirtschaftlicher Betrieb darf eine Agri-PV-Anlage auf bis zu 0,5 ha bewirtschafteter Fläche **einmal je Betrieb** ohne eigene Widmung errichten. Größere Agri-PV-Anlagen brauchen die Sondernutzung „Energieerzeugungs- und Energieversorgungsanlage“ im Flächenwidmungsplan.",
    "Praktische Erfahrungen gibt es aus dem Obstbau: An der Versuchsstation Haidegg in Graz läuft auf rund 5.000 m² eine Agri-PV-Anlage über Obstbäumen. Die Versuchsanstalt berichtete 2024 von weniger Pflanzenschutzbedarf unter den Modulen, aber auch davon, dass die Module Hagel nur begrenzt abhalten – Hagelkörner prallten in die Nachbarreihen, weshalb Hagelnetze ergänzt werden sollten. Für Obst- und Weinbaubetriebe im Süden und Osten des Landes kann Agri-PV damit eine Option sein, ersetzt aber nicht automatisch den Hagelschutz.",
  ],
  netz: {
    uenb: ["APG (Austrian Power Grid)"],
    vnb: ["Energienetze Steiermark", "Stromnetz Graz"],
    hinweis: "Der Netzbetreiber legt die zulässige Einspeiseleistung fest; laut Verfahrenshandbuch des Landes ist sie je nach Netzausbau regional sehr unterschiedlich. Die Vorrangzonen wurden unter anderem nach der Entfernung zum Netzanschlusspunkt ausgewählt.",
    quelle: { titel: "Land Steiermark – Verfahrenshandbuch Erneuerbare Energien: PV und Solaranlagen", url: "https://www.verwaltung.steiermark.at/cms/dokumente/12898224_173036325/f51050a9/Verfahrenshandbuch%20Erneuerbare%20Energie%20PV%20und%20Solaranlagen.pdf" },
  },
  besonderheiten: [
    { titel: "Hagel und Obstbau", text: "Die Süd- und Oststeiermark ist ein Zentrum des österreichischen Obstbaus. Hagelereignisse haben an der Versuchsstation Haidegg in den Jahren 2023 und 2024 sowohl Module als auch Bäume beschädigt. Für Parks und Agri-PV gehören Hagelfestigkeit der Module und Versicherung in jede Planung." },
    { titel: "Hanglagen und Rutschungen", text: "Viele Flächen im Hügelland sind geneigt. Hangstabilität, Erosion und Oberflächenwasser sind im Verfahren eigene Prüfpunkte; ebene Talflächen liegen dagegen oft in Hochwasserzonen oder zählen zu den geschützten Agrarböden." },
    { titel: "Kleine Widmungsgrößen", text: "Außerhalb der Vorrangzonen sind Parks auf wenige Hektar begrenzt. Für Flächeneigentümer mit größeren zusammenhängenden Flächen lohnt deshalb zuerst der Blick auf die Zonenkarte und die ÖEK-Festlegungen der eigenen Gemeinde." },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung: "Gute Einstrahlung und klare Vorrangzonen stehen kleinen Widmungsgrößen außerhalb der Zonen und dem EAG-Abschlag gegenüber; in Vorrangzonen mit Netznähe sind bessere Konditionen eher möglich.",
  },
  faq: [
    { q: "Wie groß darf ein Solarpark in der Steiermark sein?", a: "Außerhalb der Vorrangzonen dürfen Gemeinden in der Regel bis 2 ha und höchstens 10 ha ausweisen. Anlagen mit mehr als 10 ha Flächenbedarf sind grundsätzlich den 36 Vorrangzonen des Sachprogramms Solarenergie vorbehalten." },
    { q: "Brauche ich in einer Vorrangzone noch eine Widmung der Gemeinde?", a: "Nein. In den Vorrangzonen dürfen PV-Freiflächenanlagen ohne eigenes örtliches Widmungsverfahren errichtet werden. Die Genehmigung läuft über das Elektrizitätsrecht beim Land, Naturschutz und Artenschutz bleiben zu prüfen." },
    { q: "Ab wann braucht eine Freiflächenanlage in der Steiermark eine Widmung?", a: "Ab mehr als 400 m² Brutto-Modulfläche im Freiland ist eine Sondernutzung für Energieerzeugungsanlagen nötig, ab 3.000 m² Widmungsfläche zusätzlich eine Eignungszone im örtlichen Entwicklungskonzept." },
    { q: "Was gilt für Agri-PV in der Steiermark?", a: "Mindestens 75 % der Fläche müssen weiter landwirtschaftlich genutzt werden. Bis 0,5 ha darf ein Betrieb einmal ohne eigene Widmung bauen, darüber ist eine Sondernutzung im Flächenwidmungsplan erforderlich." },
    { q: "Was hat sich 2026 geändert?", a: "Am 13.02.2026 trat die 1. Änderung des Sachprogramms Solarenergie in Kraft, am 28.02.2026 eine StROG-Novelle, die Beschleunigungsgebiete nach der EU-Richtlinie RED III einführt. Welche Gebiete konkret ausgewiesen werden, war zum Recherchestand noch offen." },
    { q: "Wie viel Pacht ist in der Steiermark für einen Solarpark realistisch?", a: "Entscheidend sind Zonenlage, Netzanschluss und Förderfähigkeit. Flächen in Vorrangzonen mit Netznähe sind für Projektierer am wertvollsten; auf Agrarflächen drückt der 25-%-Abschlag bei der EAG-Marktprämie auf die Wirtschaftlichkeit. Eine Orientierung gibt der Pachtrechner." },
  ],
  quellen: [
    { titel: "Land Steiermark – Entwicklungsprogramm für den Sachbereich Erneuerbare Energie – Solarenergie", url: "https://www.landesentwicklung.steiermark.at/cms/beitrag/12916430/145230171/", stand: "09/2026" },
    { titel: "Land Steiermark – 1. Änderung des Entwicklungsprogramms Solarenergie (LGBl. Nr. 12/2026)", url: "https://www.landesentwicklung.steiermark.at/cms/beitrag/12916430/154267170/", stand: "09/2026" },
    { titel: "Land Steiermark, A13 – Steiermärkisches Verfahrenshandbuch für Erneuerbare Energien: PV und Solaranlagen (Stand August 2025)", url: "https://www.verwaltung.steiermark.at/cms/dokumente/12898224_173036325/f51050a9/Verfahrenshandbuch%20Erneuerbare%20Energie%20PV%20und%20Solaranlagen.pdf", stand: "09/2026" },
    { titel: "Land Steiermark, A17 – EU-Richtlinie RED III: Beschleunigungsgebiete, StROG-Novelle LGBl. Nr. 20/2026 (Vortrag 04.03.2026)", url: "https://www.verwaltung.steiermark.at/cms/dokumente/11680519_75777056/7ba0ab9f/2_20260304_REDIII_Seebacher.pdf", stand: "09/2026" },
    { titel: "Land Steiermark – Meilenstein für den Photovoltaik-Ausbau (Begutachtungsentwurf SAPRO, Auswahlkriterien Vorrangzonen)", url: "https://www.news.steiermark.at/cms/beitrag/12901035/154271055/", stand: "09/2026" },
    { titel: "ORF Steiermark – Gute Erfahrung mit PV-Anlagen im Obstbau (17.03.2024)", url: "https://steiermark.orf.at/stories/3249267/", stand: "09/2026" },
    { titel: "Landwirtschaftskammer Österreich – Agri-PV-Anlagen im Obstbau: Schutz vor Extremwetter?", url: "https://www.lko.at/agri-pv-anlagen-im-obstbau-schutz-vor-extremwetter+2400+4406964", stand: "09/2026" },
    { titel: "Statistik Austria – Agrarstrukturerhebung 2023 (Pressemitteilung 26.06.2025)", url: "https://www.statistik.at/fileadmin/announcement/2025/06/20250626AS2023.pdf", stand: "09/2026" },
    { titel: "WKO Statistik – Fläche und Benützungsarten, Stand 1. Jänner 2025", url: "https://www.wko.at/statistik/bundesland/flaecheben.pdf", stand: "09/2026" },
    { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790", stand: "09/2026" },
    { titel: "PVGIS 5.3 (JRC) – PVcalc, 46,78° N / 15,54° O und 46,95° N / 15,89° O", url: "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=46.78&lon=15.54&peakpower=1&loss=14&optimalangles=1&outputformat=json", stand: "09/2026" },
  ],
  unsicher: [
    "Inhalt der 1. Änderung des SAPRO Solarenergie (LGBl. Nr. 12/2026) im Detail nicht gefunden; Land nennt weiterhin 36 Vorrangzonen, Fläche rund 778–780 ha (Ratgeber: 778 ha, A17-Vortrag: ca. 780 ha).",
    "Die 2-ha-/10-ha-Regel ist laut Land eine Obergrenze für örtliche Festlegungen; genaue Voraussetzungen, wann Gemeinden über 2 ha bis 10 ha gehen dürfen, nicht im Wortlaut geprüft.",
    "Mindestgröße 1 ha innerhalb von Vorrangzonen nur aus Suchzusammenfassung, nicht im Verordnungstext geprüft – daher im Text weggelassen.",
    "Ob und welche Beschleunigungsgebiete für PV per Verordnung nach § 13b StROG bereits ausgewiesen wurden: offen.",
    "Genaue Lage aller Vorrangzonen (Bezirke) nicht einzeln geprüft; genannt nur Dornau/Halbenrain und Dobl-Zwaring aus dem A17-Vortrag.",
    "Keine belastbaren Angaben zu Netzengpässen einzelner Umspannwerke gefunden.",
  ],
};

export default region;
