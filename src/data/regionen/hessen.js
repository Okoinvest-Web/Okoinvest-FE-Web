// Recherche: 29.09.2026 – Hessische Freiflächensolaranlagenverordnung (FSV) 19.11.2018 (Clearingstelle EEG|KWKG),
// pv magazine 12/2018, RP Gießen Grundsatzpapier PV-FFA Mittelhessen (27.06.2025), RP Kassel Freiflächenphotovoltaik,
// Landesplanung Hessen Erlass Zielabweichung (15.04.2025), LEA Hessen Solarenergie, FA Wind und Solar Länderinfo Hessen,
// Hessischer Landtag Drs. 21/660 (Agri-PV), § 37c EEG, Statistikportal (LF 2025, Bevölkerung), PVGIS v5.3.
const region = {
  slug: "hessen",
  land: "DE",
  name: "Hessen",
  inName: "in Hessen",
  kurz: "HE",
  seoTitel: "Solarpark & Agri-PV Hessen: Pacht, Recht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht in Hessen: Freiflächenverordnung, Regionalpläne mit Bodenwert-Grenzen, Zielabweichung und Agri-PV – Freiflächen-PV für Eigentümer erklärt.",
  lead:
    "In Hessen entscheidet die Regionalplanung stärker als anderswo, ob ein Solarpark auf Ackerland möglich ist. Bodenwertzahlen, Vorranggebiete Landwirtschaft und kommunale Obergrenzen setzen den Rahmen.",
  akzent: "mit Bodenwert und Regionalplan.",
  ertrag: {
    kwhProKwp: 1090,
    ort: "in der Wetterau bei Friedberg",
    spanne: "rund 1.040 bis 1.090 kWh/kWp",
    hinweis:
      "Weitere PVGIS-Punkte: Hessisches Ried bei Groß-Gerau rund 1.090 kWh/kWp, Nordhessen bei Fritzlar rund 1.040 kWh/kWp (optimal geneigte, fest aufgeständerte Module, 14 % Systemverluste).",
  },
  eckdaten: {
    hauptstadt: "Wiesbaden",
    flaecheKm2: 21116,
    lfHa: 777000,
    lfJahr: 2025,
    einwohner: 6278594,
    quelle: {
      titel: "Statistische Ämter des Bundes und der Länder – Statistikportal (Fläche/Bevölkerung, Bodennutzungshaupterhebung 2025)",
      url: "https://www.statistikportal.de/de/land-und-forstwirtschaft/betriebe-flaeche-viehhaltung-und-arbeitskraefte",
    },
  },
  einleitung: [
    "Hessen hat Ende 2018, wie zuvor Bayern und Baden-Württemberg, Acker- und Grünland in benachteiligten Gebieten für Solarparks geöffnet, allerdings zunächst vorsichtig mit 35 MW pro Jahr. Heute gelten nach Angaben der LandesEnergieAgentur rund **530.000 ha** landwirtschaftlicher Fläche in Hessen als benachteiligt. Ende 2024 waren im Land über 320.000 PV-Anlagen mit zusammen rund 4,7 GW installiert, der Großteil davon auf Dächern. Die Landesregierung strebt laut Fachagentur Wind und Solar an, 1 Prozent der Landesfläche für Photovoltaik bereitzustellen, wobei mindestens die Hälfte der Leistung auf Dächern entstehen soll.",
    "Für Freiflächen ist in Hessen vor allem die Regionalplanung der drei Regierungspräsidien in Kassel, Gießen und Darmstadt maßgeblich. Sie arbeitet mit konkreten Bodenwert-Grenzen und schützt Flächen mit hohem Ertragspotenzial deutlich. Wer eine Fläche mit mittleren oder schwächeren Böden besitzt, hat damit oft gute Karten, wer auf Spitzenböden wirtschaftet, eher nicht.",
  ],
  recht: [
    {
      titel: "Benachteiligte Gebiete: seit 2018 geöffnet, seit 2024 bundesweit Standard",
      text: "Die Hessische Freiflächensolaranlagenverordnung (FSV) vom 19. November 2018 ließ Gebote auf Acker- und Grünland in benachteiligten Gebieten mit zunächst **35 MW pro Kalenderjahr** zu. Mit dem Solarpaket I (Mai 2024) sind diese Flächen bundesweit grundsätzlich förderfähig; Länder können nur per Verordnung ausschließen, wenn mehr als 1 Prozent der landwirtschaftlich genutzten Fläche belegt ist. Eine hessische Ausschlussverordnung ist nach unserer Recherche nicht bekannt.",
      quelle: {
        titel: "Clearingstelle EEG|KWKG – HE FSV",
        url: "https://www.clearingstelle-eeg-kwkg.de/gesetz/4668",
      },
    },
    {
      titel: "Mittelhessen: Grundsatzpapier mit Bodenzahl-Grenzen (Juni 2025)",
      text: "Das Regierungspräsidium Gießen hat die Anforderungen im Grundsatzpapier vom 27. Juni 2025 gebündelt. Es verlangt eine Alternativenprüfung und nennt eine Reihenfolge: zuerst Restflächen in Gewerbegebieten, dann Vorbehaltsgebiete für PV-Freiflächenanlagen, dann Vorbehaltsgebiete Landwirtschaft. In Vorranggebieten Landwirtschaft ist ein Zielabweichungsverfahren zu prüfen; Böden mit Bodenzahlen überwiegend **über 60**, in benachteiligten Gebieten schon **über 50**, sind dort in der Regel ausgeschlossen.",
      quelle: {
        titel: "RP Gießen – Grundsatzpapier Regionalplanerische Steuerung von PV-FFA in Mittelhessen (27.06.2025)",
        url: "https://rp-giessen.hessen.de/sites/rp-giessen.hessen.de/files/2025-07/grundsatzpapier_regionalplanerische_steuerung_von_pv-ffa_in_mittelhessen_bf.pdf",
      },
    },
    {
      titel: "Mittelhessen: höchstens 2 Prozent der Landwirtschaftsflächen je Kommune",
      text: "Der Teilregionalplan Energie Mittelhessen begrenzt die Flächeninanspruchnahme durch Freiflächen-PV je Kommune auf **2 Prozent** der Vorrang- und Vorbehaltsgebiete Landwirtschaft. Das RP Gießen sieht darin einen Grundzug der Planung, von dem keine Zielabweichung möglich ist. Angerechnet werden auch privilegierte Anlagen an Autobahnen und Bahnstrecken sowie Anlagen unter 5 ha; bei Agri-PV zählt nur der tatsächlich entzogene Flächenanteil, in der Regel etwa 10 bis 15 Prozent.",
      quelle: {
        titel: "RP Gießen – Grundsatzpapier PV-FFA Mittelhessen, Abschnitt 2-%-Limit",
        url: "https://rp-giessen.hessen.de/sites/rp-giessen.hessen.de/files/2025-07/grundsatzpapier_regionalplanerische_steuerung_von_pv-ffa_in_mittelhessen_bf.pdf",
      },
    },
    {
      titel: "Nordosthessen: Richtwert Ertragsmesszahl 45",
      text: "Das Regierungspräsidium Kassel lenkt Freiflächen-PV auf landwirtschaftliche Flächen mit geringerer Bodengüte; als Schwelle dient eine durchschnittliche **Ertragsmesszahl von 45** je Ar. Für die privilegierten 200-Meter-Korridore an Autobahnen und zweigleisigen Bahnstrecken stellt das RP Potenzialkarten je Landkreis bereit. Ein neuer Regionalplan Nordosthessen lag von Oktober bis November 2024 im Entwurf öffentlich aus.",
      quelle: {
        titel: "RP Kassel – Freiflächenphotovoltaik",
        url: "https://rp-kassel.hessen.de/landesentwicklung/erneuerbare-energien/solarenergienutzung",
      },
    },
    {
      titel: "Erlass vom April 2025: Zielabweichung für privilegierte Korridore",
      text: "Die oberste Landesplanungsbehörde hat am 15. April 2025 einen Erlass herausgegeben, der für Anlagen in den privilegierten Streifen nach § 35 Abs. 1 Nr. 8 b BauGB, die in Vorranggebieten Landwirtschaft liegen, Erleichterungen beim Zielabweichungsverfahren regelt. Die genauen Voraussetzungen ergeben sich aus dem Erlasstext; im Einzelfall gibt das zuständige Regierungspräsidium Auskunft.",
      quelle: {
        titel: "Landesplanung Hessen – Neuer Erlass Zielabweichungsverfahren / Freiflächen-Photovoltaikanlagen",
        url: "https://landesplanung.hessen.de/aktuelles/neuer-erlass-zielabweichungsverfahren-freiflaechen-photovoltaikanlagen",
      },
    },
  ],
  kulisse: {
    text: "Die hessische Kulisse lässt sich gut an den Regionalplänen ablesen: Vorbehaltsgebiete für PV-Freiflächenanlagen sind raumordnerisch abgestimmt, Vorbehaltsgebiete Landwirtschaft kommen bei guter Begründung in Frage, Vorranggebiete Landwirtschaft nur ausnahmsweise und nur ohne Spitzenböden. Zusätzlich deckelt Mittelhessen den Zubau je Kommune. Für Eigentümer lohnt sich deshalb vor jeder Verhandlung ein Blick auf die Bodenwertzahlen der eigenen Flurstücke und auf die Festlegungen des Regionalplans.",
    gut: [
      "Vorbehaltsgebiete für PV-Freiflächenanlagen im Regionalplan (z. B. Teilregionalplan Energie Mittelhessen)",
      "Vorbehaltsgebiete Landwirtschaft mit unterdurchschnittlichen Bodenwertzahlen",
      "Flächen unter der Ertragsmesszahl 45 (Nordosthessen) bzw. mit Bodenzahl unter 50 bis 60 (Mittelhessen)",
      "Privilegierte 200-Meter-Korridore an Autobahnen und zweigleisigen Bahnstrecken",
    ],
    schwierig: [
      "Vorranggebiete Landwirtschaft mit hohem bis sehr hohem Ertragspotenzial (Standorteignung A1/G1)",
      "Kommunen, die das 2-%-Limit in Mittelhessen bereits ausschöpfen",
      "Natura-2000-Gebiete, Naturschutzgebiete, geschützte Biotope",
      "Standorte ohne nachvollziehbare Alternativenprüfung im Gemeindegebiet",
    ],
  },
  ablauf: {
    text: "Die Gemeinde fasst den Aufstellungsbeschluss, ändert den Flächennutzungsplan und stellt einen Bebauungsplan auf. Parallel prüft das Regierungspräsidium als obere Landesplanungsbehörde die Vereinbarkeit mit dem Regionalplan. Liegt die Fläche in einem Vorranggebiet Landwirtschaft, ist vor dem Bebauungsplan ein Zielabweichungsverfahren nötig, über das die Regionalversammlung entscheidet. Die Baugenehmigung erteilt anschließend die untere Bauaufsicht beim Landkreis oder bei der Sonderstatusstadt. Weil die Kriterien je Regierungsbezirk unterschiedlich sind, lohnt sich eine frühe Abstimmung mit dem zuständigen RP.",
    behoerden: [
      { name: "Gemeinde / Stadt", rolle: "Flächennutzungsplan, Bebauungsplan, Alternativenprüfung im Gemeindegebiet" },
      { name: "Regierungspräsidium Kassel (Nordosthessen)", rolle: "Obere Landesplanungsbehörde, Regionalplan Nordosthessen, Zielabweichung", url: "https://rp-kassel.hessen.de/landesentwicklung/erneuerbare-energien/solarenergienutzung" },
      { name: "Regierungspräsidium Gießen (Mittelhessen)", rolle: "Obere Landesplanungsbehörde, Teilregionalplan Energie, Grundsatzpapier PV-FFA", url: "https://rp-giessen.hessen.de/sites/rp-giessen.hessen.de/files/2025-07/grundsatzpapier_regionalplanerische_steuerung_von_pv-ffa_in_mittelhessen_bf.pdf" },
      { name: "Regierungspräsidium Darmstadt (Südhessen)", rolle: "Obere Landesplanungsbehörde für Südhessen" },
      { name: "Landkreis – untere Bauaufsicht und Naturschutzbehörde", rolle: "Baugenehmigung, naturschutzrechtliche Belange" },
    ],
  },
  agri: [
    "Agri-PV ist in Hessen vor allem ein Instrument, um in landwirtschaftlich wertvollen Lagen überhaupt planen zu können. In Mittelhessen sind Agri-PV-Anlagen in Vorranggebieten Landwirtschaft ohne Zielabweichungsverfahren raumordnerisch vereinbar, wenn auf mindestens **80 Prozent der Planungsfläche** eine möglichst uneingeschränkte Bewirtschaftung nachgewiesen wird und keine Böden mit hoher Ertragssicherheit betroffen sind. Beim 2-%-Limit zählt nur der Flächenanteil, der der Landwirtschaft entzogen wird. Das RP Gießen verweist dabei auf DIN SPEC 91434 für Ackerbau und DIN SPEC 91492 für Weidenutzung.",
    "Im Weinbau ist Hessen Pionier: An der Hochschule Geisenheim im Rheingau steht nach Angaben des Landes die erste Agri-PV-Anlage Deutschlands über Reben im Weinberg, das Umweltministerium fördert das Projekt „VitiVoltaic“ von 2020 bis 2026 mit bis zu 300.000 Euro. Eine investive Landesförderung für Agri-PV ist über das EFRE-Programm „Innovative Energievorhaben“ grundsätzlich möglich, allerdings nur bei Verzicht auf die EEG-Förderung und mit ausreichend innovativem Ansatz. Die LandesEnergieAgentur berät zu Agri-PV.",
  ],
  netz: {
    uenb: ["TenneT TSO", "Amprion"],
    vnb: ["Syna", "EAM Netz", "e-netz Südhessen", "ovag Netz", "NRM Netzdienste Rhein-Main"],
    hinweis:
      "Das Verteilnetz ist in Hessen auf viele regionale Betreiber verteilt. Welcher Netzbetreiber für Ihre Fläche zuständig ist und wo Einspeisekapazität besteht, sollte vor jeder Pachtzusage geklärt werden.",
    quelle: {
      titel: "Verteilnetzstudie Hessen (BearingPoint/Fraunhofer IEE) – beteiligte Verteilnetzbetreiber",
      url: "https://www.iee.fraunhofer.de/content/dam/iee/energiesystemtechnik/de/Dokumente/gf/npb/Verteilnetzstudie_Hessen_2024_bis_2034_Kurzfassung.pdf",
    },
  },
  besonderheiten: [
    {
      titel: "Drei Regierungsbezirke, drei Maßstäbe",
      text: "Ob eine Fläche in Frage kommt, hängt in Hessen spürbar vom Regierungsbezirk ab: Nordosthessen arbeitet mit dem Richtwert Ertragsmesszahl 45, Mittelhessen mit Bodenzahl-Grenzen und einem 2-%-Deckel je Kommune. Nach Darstellung des RP Kassel konnten Anlagen in Vorranggebieten Landwirtschaft in Nordosthessen Anfang 2024 nur mit Zielabweichung entstehen, in Süd- und Mittelhessen nach Einzelfallprüfung.",
    },
    {
      titel: "Pflicht zur Alternativenprüfung",
      text: "Das RP Gießen verlangt bei jedem Bauleitplanverfahren für Freiflächen-PV eine Alternativenprüfung, idealerweise als gesamträumliches Konzept für das ganze Gemeindegebiet. Gemeinden mit einem solchen Konzept können Anfragen schneller und rechtssicherer beantworten.",
    },
    {
      titel: "Weinbau und Sonderkulturen",
      text: "Rheingau und Bergstraße sind Weinbauregionen. Mit dem Geisenheimer Versuch über Reben gibt es in Hessen praktische Erfahrungen, wie sich Agri-PV mit Dauerkulturen verbinden lässt.",
    },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung:
      "Die Einstrahlung liegt etwas unter Süddeutschland, und die Regionalplanung schließt gute Böden häufig aus. Auf geeigneten Flächen mit Netzanschluss ist die Nachfrage dennoch vorhanden; im Einzelfall entscheiden Bodenwertzahl, Regionalplan und Netz.",
  },
  faq: [
    {
      q: "Wie viel Pacht bringt ein Solarpark in Hessen?",
      a: "Das hängt von Fläche, Netzanschluss und Genehmigungsaussichten ab. Weil in Hessen die Bodengüte über die Genehmigungsfähigkeit mitentscheidet, sind gerade mittlere und schwächere Standorte für Projektentwickler interessant. Lassen Sie sich einen festen Mindestbetrag pro Hektar und Jahr zusichern.",
    },
    {
      q: "Hat Hessen die benachteiligten Gebiete geöffnet?",
      a: "Ja, mit der Freiflächensolaranlagenverordnung vom November 2018, zunächst mit 35 MW pro Jahr. Seit dem Solarpaket I sind benachteiligte Gebiete bundesweit grundsätzlich förderfähig; eine hessische Ausschlussverordnung ist nicht bekannt.",
    },
    {
      q: "Welche Bodenwerte sind in Hessen für einen Solarpark noch möglich?",
      a: "Das RP Kassel orientiert sich an einer durchschnittlichen Ertragsmesszahl von 45 je Ar. In Mittelhessen sind in Vorranggebieten Landwirtschaft Böden mit Bodenzahl überwiegend über 60, in benachteiligten Gebieten über 50, in der Regel ausgeschlossen.",
    },
    {
      q: "Was bedeutet das 2-%-Limit in Mittelhessen?",
      a: "In jeder Kommune darf Freiflächen-PV höchstens 2 Prozent der Vorrang- und Vorbehaltsgebiete Landwirtschaft beanspruchen. Ist das Kontingent ausgeschöpft, ist eine weitere Anlage regionalplanerisch nicht möglich; eine Zielabweichung schließt das RP Gießen hier aus.",
    },
    {
      q: "Brauche ich in Hessen ein Zielabweichungsverfahren?",
      a: "Wenn die Fläche in einem Vorranggebiet Landwirtschaft liegt und kein Vorbehaltsgebiet PV überlagert, in der Regel ja. Für privilegierte Korridore an Autobahnen und Bahnstrecken gibt es seit April 2025 einen Erlass mit Erleichterungen; für Agri-PV gelten in Mittelhessen eigene Regeln.",
    },
    {
      q: "Wird Agri-PV in Hessen gefördert?",
      a: "Über das EFRE-Programm „Innovative Energievorhaben“ ist eine investive Förderung grundsätzlich möglich, wenn auf die EEG-Förderung verzichtet wird. Daneben fördert das Land Forschung wie das Weinbau-Projekt an der Hochschule Geisenheim.",
    },
  ],
  quellen: [
    { titel: "Clearingstelle EEG|KWKG – Hessische Freiflächensolaranlagenverordnung (FSV)", url: "https://www.clearingstelle-eeg-kwkg.de/gesetz/4668", stand: "09/2026" },
    { titel: "pv magazine – Hessen gibt ebenfalls Ackerflächen für PV-Ausschreibungen frei (04.12.2018)", url: "https://www.pv-magazine.de/2018/12/04/hessen-gibt-ebenfalls-ackerflaechen-fuer-photovoltaik-ausschreibungen-frei/", stand: "09/2026" },
    { titel: "RP Gießen – Grundsatzpapier Regionalplanerische Steuerung von PV-FFA in Mittelhessen (27.06.2025)", url: "https://rp-giessen.hessen.de/sites/rp-giessen.hessen.de/files/2025-07/grundsatzpapier_regionalplanerische_steuerung_von_pv-ffa_in_mittelhessen_bf.pdf", stand: "09/2026" },
    { titel: "RP Kassel – Freiflächenphotovoltaik", url: "https://rp-kassel.hessen.de/landesentwicklung/erneuerbare-energien/solarenergienutzung", stand: "09/2026" },
    { titel: "Landesplanung Hessen – Neuer Erlass Zielabweichungsverfahren / Freiflächen-PV (15.04.2025)", url: "https://landesplanung.hessen.de/aktuelles/neuer-erlass-zielabweichungsverfahren-freiflaechen-photovoltaikanlagen", stand: "09/2026" },
    { titel: "LEA Hessen – Solarenergie", url: "https://www.lea-hessen.de/energiewende-in-hessen/solarenergie/", stand: "09/2026" },
    { titel: "FA Wind und Solar – Länderinformationen Hessen", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/laenderinformationen/hessen", stand: "09/2026" },
    { titel: "Hessischer Landtag – Drucksache 21/660 (Agri-PV)", url: "https://starweb.hessen.de/cache/DRS/21/0/00660.pdf", stand: "09/2026" },
    { titel: "§ 37c EEG 2023 (gesetze-im-internet.de)", url: "https://www.gesetze-im-internet.de/eeg_2014/__37c.html", stand: "09/2026" },
    { titel: "Verteilnetzstudie Hessen (Kurzfassung)", url: "https://www.iee.fraunhofer.de/content/dam/iee/energiesystemtechnik/de/Dokumente/gf/npb/Verteilnetzstudie_Hessen_2024_bis_2034_Kurzfassung.pdf", stand: "09/2026" },
    { titel: "Statistikportal – Landwirtschaftlich genutzte Fläche / Fläche und Bevölkerung", url: "https://www.statistikportal.de/de/land-und-forstwirtschaft/betriebe-flaeche-viehhaltung-und-arbeitskraefte", stand: "09/2026" },
  ],
  unsicher: [
    "Inhalt des Erlasses vom 15.04.2025 nur aus der Ankündigungsseite; Detailvoraussetzungen (Umfang der Erleichterung) nicht aus dem PDF geprüft – daher allgemein formuliert.",
    "Keine hessische Opt-out-Verordnung nach § 37c EEG gefunden; nicht durch eine explizite amtliche Negativaussage belegt.",
    "Kriterien des RP Darmstadt (Südhessen) und Stand Regionalplan Südhessen nicht recherchiert.",
    "Stand des Regionalplans Nordosthessen nach der Offenlage 10–11/2024 (Beschluss/Rechtskraft) nicht geprüft.",
    "Aussage RP Kassel zu Nordost- vs. Süd-/Mittelhessen (Stand 01/2024) stammt aus Suchzusammenfassung.",
    "LF 2025 (777.000 ha) weicht von ASE-2023-Wert (759.700 ha) ab; Statistikportal-Wert 2025 übernommen.",
    "Die VNB-Liste stammt aus dem Konsortium der Verteilnetzstudie Hessen (2018); aktuelle Rangfolge nach Größe nicht geprüft. Ob Avacon, EnergieNetz Mitte, OsthessenNetz heute noch in dieser Form bestehen, nicht geprüft.",
    "Ziel „1 % der Landesfläche für PV“ stammt aus Koalitionsvertrag 2024–2029 laut FA Wind und Solar; nicht im Original geprüft.",
  ],
};

export default region;
