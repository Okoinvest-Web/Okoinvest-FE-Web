// Recherche: 29.09.2026 – UM BW (PV-Freiflächenanlagen, Handlungsleitfaden Freiflächensolaranlagen 09/2019),
// KEA-BW (§§ 20/21 KlimaG BW), Energieatlas BW (benachteiligte Gebiete), Verband Region Stuttgart (Beschluss 04.12.2025),
// LEL Schwäbisch Gmünd (Flurbilanz 2022), MLR/UM (Modellregion Agri-PV), § 37c EEG, FA Wind und Solar 2025,
// Statistikportal (LF 2025, Bevölkerung), PVGIS v5.3.
const region = {
  slug: "baden-wuerttemberg",
  land: "DE",
  name: "Baden-Württemberg",
  inName: "in Baden-Württemberg",
  kurz: "BW",
  seoTitel: "Solarpark & Agri-PV Baden-Württemberg | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht in Baden-Württemberg: 0,2-%-Flächenziel, Flurbilanz, benachteiligte Gebiete und Agri-PV im Obstbau – Freiflächen-PV kompakt erklärt.",
  lead:
    "Baden-Württemberg hat Freiflächen-PV lange zögerlich ausgebaut und steuert jetzt über Regionalpläne mit festem Flächenziel nach. Für Eigentümer zählen vor allem die Einstufung in der Flurbilanz und die neuen PV-Gebiete der Regionalverbände.",
  akzent: "mit Regionalplan und Flurbilanz.",
  ertrag: {
    kwhProKwp: 1130,
    ort: "im Kraichgau bei Sinsheim",
    spanne: "rund 1.130 bis 1.160 kWh/kWp",
    hinweis:
      "Weitere PVGIS-Punkte: Oberschwaben bei Biberach rund 1.130 kWh/kWp, Hegau nahe dem Bodensee rund 1.160 kWh/kWp (optimal geneigte, fest aufgeständerte Module, 14 % Systemverluste).",
  },
  eckdaten: {
    hauptstadt: "Stuttgart",
    flaecheKm2: 35748,
    lfHa: 1395400,
    lfJahr: 2025,
    einwohner: 11238761,
    quelle: {
      titel: "Statistische Ämter des Bundes und der Länder – Statistikportal (Fläche/Bevölkerung, Bodennutzungshaupterhebung 2025)",
      url: "https://www.statistikportal.de/de/land-und-forstwirtschaft/betriebe-flaeche-viehhaltung-und-arbeitskraefte",
    },
  },
  einleitung: [
    "Im Südwesten spielte Freiflächen-Photovoltaik lange eine Nebenrolle. Nach dem Handlungsleitfaden des Umweltministeriums lag der Anteil der Freiflächenanlagen Ende 2018 bei nur rund 8 Prozent der installierten PV-Leistung im Land, bundesweit waren es damals rund 25 Prozent. Seitdem hat das Land mehrere Hebel umgelegt: höhere Obergrenzen in benachteiligten Gebieten, ein gesetzliches Flächenziel für die Regionalplanung und Verfahrenserleichterungen in der Landesbauordnung. In den Ausschreibungen 2025 entfielen nach der Auswertung der Fachagentur Wind und Solar rund 534 MW Zuschläge auf Baden-Württemberg, 2021 waren es erst rund 75 MW.",
    "Gleichzeitig ist die Landwirtschaft im Land kleinteilig, die Böden in Gäulandschaften, Kraichgau oder Oberrheinebene sind vielfach hochwertig, und Sonderkulturen wie Obst und Wein prägen ganze Landstriche. Genau deshalb achten Regionalverbände und Landwirtschaftsverwaltung stark darauf, welche Flächen für Solarparks in Frage kommen. Für Sie als Eigentümer lohnt sich ein früher Blick in die Flurbilanz und in den Regionalplan Ihrer Region.",
  ],
  recht: [
    {
      titel: "Benachteiligte Gebiete: seit 2017 geöffnet, seit 2024 bundesweit Standard",
      text: "Die Freiflächenöffnungsverordnung (FFÖ-VO) vom 7. März 2017 erlaubte zunächst bis zu 100 MW pro Jahr auf Acker- und Grünland in benachteiligten Gebieten; 2022 wurde die Grenze auf **500 MW pro Jahr** angehoben. Mit dem Solarpaket I (Frühjahr 2024) sind benachteiligte Gebiete bundesweit grundsätzlich förderfähig; die FFÖ-VO verliert damit nach Angaben des Umweltministeriums ihren Anwendungsbereich. Ein Opt-out nach § 37c EEG ist erst möglich, wenn mehr als 1 Prozent der landwirtschaftlich genutzten Landesfläche mit Freiflächenanlagen belegt ist.",
      quelle: {
        titel: "UM BW – Photovoltaik-Freiflächenanlagen",
        url: "https://um.baden-wuerttemberg.de/de/klima-energie/energiewende/erneuerbare-energien/sonnenenergie/photovoltaik/photovoltaik-freiflaechenanlagen",
      },
    },
    {
      titel: "KlimaG BW: mindestens 0,2 Prozent der Regionsfläche für Freiflächen-PV",
      text: "Nach § 21 des Klimaschutz- und Klimawandelanpassungsgesetzes müssen die zwölf Regionalverbände mindestens **0,2 Prozent ihrer Fläche** für Freiflächen-PV festlegen, zusammen mit 1,8 Prozent für Windenergie (§ 20). Die Frist war der 30. September 2025. Die Regionen können wählen, ob sie Vorrang- oder Vorbehaltsgebiete ausweisen. Anders als bei der Windenergie haben die PV-Gebiete **keine Ausschlusswirkung**: Gemeinden können auch außerhalb planen.",
      quelle: {
        titel: "KEA-BW – §§ 20/21 KlimaG BW: Flächenziele",
        url: "https://www.kea-bw.de/erneuerbare-bw/20-21klimag-bw-2025-flaechenziele-windkraftausbau",
      },
    },
    {
      titel: "Landesbauordnung: Freiflächen-PV seit Juni 2025 verfahrensfrei",
      text: "Mit der LBO-Reform „Schnelles Bauen“ sind Freiflächen-PV-Anlagen seit dem 28. Juni 2025 baugenehmigungsfrei, seit März 2026 auch zugehörige Einfriedungen und technische Nebenanlagen. Das ersetzt aber weder das Planungsrecht noch das Fachrecht: Im Außenbereich braucht es außerhalb der privilegierten Streifen weiterhin einen Bebauungsplan, und Natur-, Denkmal-, Wasser- und Bodenschutz gelten je nach Standort unverändert.",
      quelle: {
        titel: "UM BW – Photovoltaik-Freiflächenanlagen (Verfahrensfreiheit)",
        url: "https://um.baden-wuerttemberg.de/de/klima-energie/energiewende/erneuerbare-energien/sonnenenergie/photovoltaik/photovoltaik-freiflaechenanlagen",
      },
    },
    {
      titel: "Flurbilanz 2022: Vorrangflur möglichst freihalten",
      text: "Die digitale Flurbilanz der Landwirtschaftsverwaltung teilt die Agrarflächen in Vorrangflur sowie Vorbehaltsflur I und II ein. Diese Flächen sollen langfristig der Landwirtschaft vorbehalten bleiben. Regionalverbände nutzen für ihre Solar-Teilpläne als Ausgangskulisse vor allem die Grenz- und Untergrenzflächen der Flurbilanz. Wie Ihre Fläche eingestuft ist, gehört deshalb zu den ersten Fragen jeder Standortprüfung.",
      quelle: {
        titel: "LEL Schwäbisch Gmünd – Flurbilanz",
        url: "https://lel.landwirtschaft-bw.de/,Lde/Startseite/Unsere+Themen/Flurbilanz",
      },
    },
    {
      titel: "Handlungsleitfaden Freiflächensolaranlagen",
      text: "Das Umweltministerium hat im Februar 2018 ein Hinweisschreiben an die kommunalen Planungsträger versandt und im September 2019 den Handlungsleitfaden Freiflächensolaranlagen veröffentlicht. Er richtet sich an Kommunen, Planer und Projektierer und behandelt Standortwahl, Wirtschaftlichkeit und vor allem die ökologische Gestaltung, einschließlich solarthermischer Freiflächenanlagen für Wärmenetze.",
      quelle: {
        titel: "UM BW – Handlungsleitfaden Freiflächensolaranlagen (1. Auflage 09/2019)",
        url: "https://um.baden-wuerttemberg.de/fileadmin/redaktion/m-um/intern/Dateien/Dokumente/2_Presse_und_Service/Publikationen/Energie/Handlungsleitfaden_Freiflaechensolaranlagen.pdf",
      },
    },
  ],
  kulisse: {
    text: "In Baden-Württemberg gibt es rund 2.508 Gemarkungen, die ganz oder teilweise als benachteiligtes Gebiet eingestuft sind. Das ist die Förderkulisse des EEG, aber noch keine Aussage über die Genehmigungsfähigkeit. Entscheidend sind die Regionalpläne mit ihren neuen PV-Gebieten, die Flurbilanz und die Schutzgebiete. Die Region Stuttgart etwa hat im Dezember 2025 rund 0,7 Prozent ihrer Fläche als Vorranggebiete für Freiflächen-PV beschlossen und dabei Wälder, Kernflächen des Biotopverbunds und hochwertige Landschaften ausgespart.",
    gut: [
      "Flächen in den neuen Vorrang- oder Vorbehaltsgebieten PV des Regionalplans",
      "Grenz- und Untergrenzflur nach Flurbilanz, oft in benachteiligten Gebieten",
      "Privilegierte 200-Meter-Streifen entlang von Autobahnen und zweigleisigen Bahnstrecken",
      "Vorbelastete Lagen nahe Gewerbe, Umspannwerken oder Verkehrstrassen",
    ],
    schwierig: [
      "Vorrangflur der Flurbilanz und hochwertige Böden, etwa in Gäulandschaften und Kraichgau",
      "Naturschutzgebiete, geschützte Biotope, Kernflächen des Biotopverbunds, Wald",
      "Landschaftsschutzgebiete (nach Energieatlas eher „bedingt geeignet“)",
      "Einsehbare Hanglagen und Landschaften mit hoher Bedeutung für das Landschaftsbild",
    ],
  },
  ablauf: {
    text: "Das Verfahren beginnt bei der Gemeinde: Aufstellungsbeschluss, Änderung des Flächennutzungsplans (in vielen Orten über einen Gemeindeverwaltungsverband oder eine vereinbarte Verwaltungsgemeinschaft) und Bebauungsplan. Liegt die Fläche in einem regionalplanerischen PV-Gebiet, ist die raumordnerische Abstimmung weitgehend vorweggenommen. Außerhalb prüfen Regionalverband und Regierungspräsidium, ob Ziele des Regionalplans, etwa regionale Grünzüge, entgegenstehen. Weil Freiflächen-PV seit Juni 2025 verfahrensfrei ist, endet das Verfahren mit dem rechtskräftigen Bebauungsplan und den nötigen fachrechtlichen Erlaubnissen; eine gesonderte Baugenehmigung entfällt.",
    behoerden: [
      { name: "Gemeinde / Gemeindeverwaltungsverband", rolle: "Flächennutzungsplan, Bebauungsplan, städtebaulicher Vertrag" },
      { name: "Regionalverband (12 Regionen, z. B. Verband Region Stuttgart)", rolle: "Regionalplan mit PV-Gebieten nach § 21 KlimaG BW, Stellungnahme im Verfahren", url: "https://www.region-stuttgart.org/de/informationen-downloads/news/detail/regionalversammlung-beschliesst-flaechenausweisung-fuer-windenergie-und-photovoltaik/" },
      { name: "Regierungspräsidium (Stuttgart, Karlsruhe, Freiburg, Tübingen)", rolle: "Höhere Raumordnungsbehörde, ggf. Zielabweichung, Genehmigung von Flächennutzungsplänen", url: "https://rp.baden-wuerttemberg.de/themen/energie/seiten/solarenergie/" },
      { name: "Landratsamt", rolle: "Untere Naturschutz-, Wasser- und Landwirtschaftsbehörde; Fachstellungnahmen" },
    ],
  },
  agri: [
    "Baden-Württemberg setzt bei Agri-PV auf Sonderkulturen. 2021 haben Landwirtschafts- und Umweltministerium gemeinsam mit dem Fraunhofer ISE die „Modellregion Agri-PV Baden-Württemberg“ gestartet und fünf Pilotanlagen mit rund 2,5 Millionen Euro gefördert, mit Schwerpunkt Kern- und Beerenobst. Standorte sind Ravensburg, Weinsberg, Karlsruhe, Kressbronn am Bodensee und Nußbach. Ziel ist, Agri-PV gerade im Sonderkulturanbau praxistauglich zu machen und die Wechselwirkungen zwischen Modulen und Kultur zu untersuchen.",
    "Für Obst- und Beerenbetriebe am Bodensee, im Raum Heilbronn oder in der Ortenau kann Agri-PV daher mehr sein als eine Pachtfläche, weil die Anlage mit der Dauerkultur zusammen geplant wird und die Bewirtschaftung weiterläuft. Weil Regionalverbände bei ihren PV-Kulissen agrarstrukturelle Belange stark gewichten, hat eine Agri-PV-Planung nach DIN SPEC 91434 auch auf besseren Böden eher Aussicht als ein klassischer Solarpark. Ob sie im Einzelfall in einem Vorranggebiet für Landwirtschaft zulässig ist, klärt der jeweilige Regionalverband.",
  ],
  netz: {
    uenb: ["TransnetBW"],
    vnb: ["Netze BW", "naturenergie netze (Südbaden)", "zahlreiche Stadtwerke und kommunale Netzbetreiber"],
    hinweis:
      "Netze BW ist der größte Verteilnetzbetreiber im Land und arbeitet mit dem Übertragungsnetzbetreiber TransnetBW an einer gemeinsamen Zielnetzplanung über die Spannungsebenen hinweg.",
    quelle: {
      titel: "TransnetBW – Gemeinsame Zielnetzplanung mit Netze BW",
      url: "https://www.transnetbw.de/de/newsroom/presseinformationen/neuer-ansatz-von-transnetbw-und-netze-bw-die-gemeinsame-zielnetzplanung",
    },
  },
  besonderheiten: [
    {
      titel: "Regionalpläne mit PV-Gebieten",
      text: "Baden-Württemberg ist eines der wenigen Länder mit einem gesetzlichen Mindestflächenziel für Freiflächen-PV in der Regionalplanung. Nach einer ersten Auswertung planen alle zwölf Regionen über dem Mindestwert. Weil die Gebiete keine Ausschlusswirkung haben, bleibt die Gemeinde aber auch außerhalb handlungsfähig.",
    },
    {
      titel: "Kein Bauantrag mehr, aber Bebauungsplan bleibt",
      text: "Die Verfahrensfreiheit nach der LBO spart einen Verfahrensschritt. Die eigentliche Hürde, die Bauleitplanung der Gemeinde mit Umweltbericht und Beteiligung, bleibt bestehen.",
    },
    {
      titel: "Solarthermie auf der Freifläche",
      text: "Der Handlungsleitfaden des Landes behandelt ausdrücklich auch solarthermische Freiflächenanlagen, die Wärmenetze von Städten und Gemeinden speisen. Für Flächen in Ortsnähe kann das eine Alternative zur Photovoltaik sein.",
    },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung:
      "Gute Einstrahlung und wachsende Zuschlagsmengen stehen kleinteiligen Flächen, hochwertigen Böden und strenger agrarstruktureller Prüfung gegenüber. Im Einzelfall entscheiden Flurbilanz-Einstufung, Regionalplan und Netzanschluss.",
  },
  faq: [
    {
      q: "Wie viel Pacht bringt ein Solarpark in Baden-Württemberg?",
      a: "Die Pacht hängt von Größe, Netzanschluss und Genehmigungschancen ab. Flächen in einem regionalplanerischen PV-Gebiet mit Anschluss in der Nähe sind besonders gefragt. Achten Sie auf einen festen Mindestbetrag pro Hektar, Indexierung und eine Rückbausicherheit.",
    },
    {
      q: "Hat Baden-Württemberg die benachteiligten Gebiete geöffnet?",
      a: "Ja, 2017 mit der Freiflächenöffnungsverordnung, seit 2022 mit bis zu 500 MW pro Jahr. Seit dem Solarpaket I sind benachteiligte Gebiete bundesweit grundsätzlich förderfähig; die Landesverordnung hat damit nach Angaben des Umweltministeriums ihren Anwendungsbereich verloren.",
    },
    {
      q: "Liegt meine Fläche in einem PV-Gebiet des Regionalplans?",
      a: "Das zeigen die Regionalpläne der zwölf Regionalverbände, die bis Ende September 2025 mindestens 0,2 Prozent ihrer Fläche für Freiflächen-PV festlegen sollten. Die Karten veröffentlicht der jeweilige Regionalverband; die benachteiligten Gebiete zeigt der Energieatlas BW.",
    },
    {
      q: "Kann ein Solarpark auch außerhalb der Regionalplan-Gebiete entstehen?",
      a: "Grundsätzlich ja. Die PV-Gebiete nach § 21 KlimaG BW haben keine Ausschlusswirkung. Außerhalb muss die Gemeinde aber besonders sorgfältig begründen, warum der Standort geeignet ist, und andere Ziele des Regionalplans beachten.",
    },
    {
      q: "Brauche ich in Baden-Württemberg noch eine Baugenehmigung?",
      a: "Seit dem 28. Juni 2025 nicht mehr: Freiflächen-PV ist nach der Landesbauordnung verfahrensfrei. Einen Bebauungsplan braucht es im Außenbereich trotzdem in der Regel, ebenso naturschutz- oder wasserrechtliche Erlaubnisse je nach Standort.",
    },
    {
      q: "Ist Agri-PV im Obstbau in Baden-Württemberg erprobt?",
      a: "Ja. In der Modellregion Agri-PV laufen seit 2021 fünf geförderte Pilotanlagen, vor allem über Äpfeln und Beeren, unter anderem in Kressbronn am Bodensee und in Weinsberg.",
    },
  ],
  quellen: [
    { titel: "UM BW – Photovoltaik-Freiflächenanlagen", url: "https://um.baden-wuerttemberg.de/de/klima-energie/energiewende/erneuerbare-energien/sonnenenergie/photovoltaik/photovoltaik-freiflaechenanlagen", stand: "09/2026" },
    { titel: "UM BW – Handlungsleitfaden Freiflächensolaranlagen (09/2019)", url: "https://um.baden-wuerttemberg.de/fileadmin/redaktion/m-um/intern/Dateien/Dokumente/2_Presse_und_Service/Publikationen/Energie/Handlungsleitfaden_Freiflaechensolaranlagen.pdf", stand: "09/2026" },
    { titel: "KEA-BW – §§ 20/21 KlimaG BW: Flächenziele", url: "https://www.kea-bw.de/erneuerbare-bw/20-21klimag-bw-2025-flaechenziele-windkraftausbau", stand: "09/2026" },
    { titel: "Energieatlas BW – Benachteiligte Gebiete in Baden-Württemberg", url: "https://www.energieatlas-bw.de/sonne/freiflachen/benachteiligte-gebiete-in-baden-wurttemberg", stand: "09/2026" },
    { titel: "pv magazine – BW will bis zu 500 MW PV-Freiflächen auf benachteiligten Flächen erlauben (01.06.2022)", url: "https://www.pv-magazine.de/2022/06/01/baden-wuerttemberg-will-bis-zu-500-megawatt-photovoltaik-freiflaechenanlagen-auf-benachteiligten-ackerflaechen-erlauben/", stand: "09/2026" },
    { titel: "Verband Region Stuttgart – Regionalversammlung beschließt Flächenausweisung Wind und PV (04.12.2025)", url: "https://www.region-stuttgart.org/de/informationen-downloads/news/detail/regionalversammlung-beschliesst-flaechenausweisung-fuer-windenergie-und-photovoltaik/", stand: "09/2026" },
    { titel: "LEL Schwäbisch Gmünd – Flurbilanz", url: "https://lel.landwirtschaft-bw.de/,Lde/Startseite/Unsere+Themen/Flurbilanz", stand: "09/2026" },
    { titel: "MLR BW – Landesregierung fördert fünf Modellanlagen zur Agri-PV", url: "https://mlr.baden-wuerttemberg.de/de/unser-service/presse-und-oeffentlichkeitsarbeit/pressemitteilungen/pressemitteilung/pid/landesregierung-foerdert-fuenf-modellanlagen-zur-agri-pv-mit-rund-25-millionen-euro-1/", stand: "09/2026" },
    { titel: "Fraunhofer ISE – Modellregion Agri-PV BaWü", url: "https://www.ise.fraunhofer.de/en/research-projects/agri-pv-bawue.html", stand: "09/2026" },
    { titel: "§ 37c EEG 2023 (gesetze-im-internet.de)", url: "https://www.gesetze-im-internet.de/eeg_2014/__37c.html", stand: "09/2026" },
    { titel: "FA Wind und Solar – Ausschreibungen für PV auf Freiflächen, Ergebnisse 2025", url: "https://www.fachagentur-wind-solar.de/fileadmin/Veroeffentlichungen/Solar/Daten/FA_Wind_Solar_HGP_Ausschreibungen_PV_auf_Freiflaechen_2025.pdf", stand: "09/2026" },
    { titel: "Statistikportal – Landwirtschaftlich genutzte Fläche / Fläche und Bevölkerung", url: "https://www.statistikportal.de/de/land-und-forstwirtschaft/betriebe-flaeche-viehhaltung-und-arbeitskraefte", stand: "09/2026" },
  ],
  unsicher: [
    "Stand der Regionalpläne außerhalb der Region Stuttgart (Satzungsbeschlüsse, Verbindlichkeit) nicht einzeln geprüft; „alle zwölf Regionen planen über dem Mindestwert“ stammt aus einer Zwischenauswertung (KEA/Suchzusammenfassung).",
    "Aussage, Regionalverbände nutzten Grenz-/Untergrenzflur als Ausgangskulisse, beruht auf Suchzusammenfassung (Beispiel Nordschwarzwald), nicht landesweit verifiziert.",
    "Umfang der Verfahrensfreiheit nach LBO (ab 28.06.2025, Nebenanlagen ab 03/2026) nur aus UM-Seite, nicht aus LBO-Wortlaut geprüft.",
    "BW-Zuschlagsmengen 2021/2025 (75 bzw. 534 MW) aus FA-Wind-und-Solar-Tabelle; Tabellenextraktion teils verschoben, BW-Werte aber mit Diagramm konsistent.",
    "Anteil benachteiligter Gebiete „rund 900.000 ha / zwei Drittel“ (agrarheute 2022) bewusst nicht übernommen.",
    "Zulässigkeit von Agri-PV in Vorranggebieten Landwirtschaft ist je Regionalverband unterschiedlich; keine landesweite Regel gefunden.",
    "Ergebnisse der Modellanlagen (z. B. Pflanzenschutzeinsparung Kressbronn) nicht aus Primärquelle geprüft – daher nicht genannt.",
  ],
};

export default region;
