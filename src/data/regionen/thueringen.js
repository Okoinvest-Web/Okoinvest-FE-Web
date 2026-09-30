// Recherche: 29.09.2026 – PVGIS v5.3 (JRC), Destatis Gemeindeverzeichnis 31.12.2024, Thüringer Landesamt für Statistik (PM 078/2024,
// ASE 2023), Clearingstelle EEG|KWKG (ThürPVFflVO), KNE-Übersicht Länderöffnungsklausel (12/2023), Fachagentur Wind und Solar
// (Länderinfo Thüringen, 11/2024), energie.sachsen.de/Stiftung Umweltenergierecht (Wirkung Solarpaket I), EEG 2023 § 37c, TEN, MITNETZ
const region = {
  slug: "thueringen",
  land: "DE",
  name: "Thüringen",
  inName: "in Thüringen",
  kurz: "TH",
  seoTitel: "Solarpark & Agri-PV Thüringen: Pacht, Recht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht Thüringen: Freiflächen-PV und Agri-PV auf Acker und Grünland – benachteiligte Gebiete, Vorranggebiete Solar im Regionalplan, Netz und Ablauf.",
  lead:
    "Thüringen verbindet fruchtbare Ackerbaulagen im Thüringer Becken mit Mittelgebirgen und Grünland – für Solarparks entscheiden vor allem Kulisse, Regionalplan und der Netzanschluss.",
  akzent: "vom Becken bis zum Kyffhäuser.",
  ertrag: {
    kwhProKwp: 1070,
    ort: "bei Artern (Kyffhäuserkreis)",
    spanne: "rund 1.020 bis 1.070 kWh/kWp",
    hinweis:
      "Ein zweiter PVGIS-Punkt bei Erfurt liegt bei rund 1.020 kWh/kWp; Nordthüringen schneidet besser ab, in Thüringer Wald und Schiefergebirge beeinflussen Höhenlage und Relief den Ertrag.",
  },
  eckdaten: {
    hauptstadt: "Erfurt",
    flaecheKm2: 16202,
    lfHa: 772300,
    lfJahr: 2023,
    einwohner: 2100277,
    quelle: {
      titel: "Thüringer Landesamt für Statistik, PM 078/2024 (ASE 2023); Destatis Gemeindeverzeichnis (31.12.2024)",
      url: "https://statistik.thueringen.de/presse/2024/pr_078_24.pdf",
    },
  },
  einleitung: [
    "In Thüringen bewirtschafteten 2023 rund 3.590 Betriebe eine landwirtschaftlich genutzte Fläche von 772.300 Hektar. Drei Viertel davon sind Pachtland – ein Wert, der für Eigentümer wichtig ist: Wer eine Fläche für einen Solarpark verpachten will, muss fast immer auch die Interessen des bisherigen Pächters berücksichtigen. Landschaftlich reicht das Spektrum von den Lössböden des Thüringer Beckens über die Goldene Aue am Kyffhäuser bis zu Thüringer Wald, Schiefergebirge und Rhön.",
    "Das Land hat Acker- und Grünland in benachteiligten Gebieten 2023 mit der Thüringer Photovoltaik-Freiflächenverordnung für EEG-Ausschreibungen geöffnet. Seit dem Solarpaket I 2024 gilt die bundesweite Öffnung. Planerisch gibt das Landesentwicklungsprogramm den Regionalen Planungsgemeinschaften die Möglichkeit, **Vorranggebiete für großflächige Solaranlagen** festzulegen – ein Instrument, das Standorte absichern kann.",
    "Die ÖKOVOLT Gruppe, zu der ÖkoInvest gehört, betreibt eigene Solarparks in der Kyffhäuser-Region, darunter in Artern im Kyffhäuserkreis.",
  ],
  recht: [
    {
      titel: "Benachteiligte Gebiete: ThürPVFflVO 2023, seit Solarpaket I bundesweit offen",
      text:
        "Die Thüringer Photovoltaik-Freiflächenverordnung vom 04.07.2023 (GVBl. Nr. 10/2023) ließ Gebote für Solarparks auf Acker- und Grünland in benachteiligten Gebieten zu, begrenzt auf 180 MW pro Kalenderjahr. Ausgeschlossen waren unter anderem Natura-2000-Gebiete, Naturschutzgebiete, der Nationalpark Hainich und Nationale Naturmonumente. Mit dem Solarpaket I (16.05.2024) sind benachteiligte Gebiete bundesweit grundsätzlich offen; Länder können nur noch nach § 37c EEG beschränken. Eine Thüringer Beschränkungsverordnung haben wir nicht gefunden.",
      quelle: { titel: "Clearingstelle EEG|KWKG – ThürPVFflVO", url: "https://www.clearingstelle-eeg-kwkg.de/suche/type/gesetz/6757" },
    },
    {
      titel: "Landesentwicklungsprogramm: Vorranggebiete für großflächige Solaranlagen",
      text:
        "Nach dem Landesentwicklungsprogramm können die Regionalen Planungsgemeinschaften Vorranggebiete für großflächige Solaranlagen ausweisen. Bevorzugt sollen bereits vorbelastete Flächen oder Gebiete mit begrenztem Freiraumpotenzial genutzt werden, um den Verbrauch landwirtschaftlicher Nutzflächen zu begrenzen. Liegt Ihre Fläche in einem solchen Vorranggebiet, ist die raumordnerische Hürde weitgehend genommen; außerhalb kommt es auf die übrigen Festlegungen des Regionalplans an.",
      quelle: { titel: "Fachagentur Wind und Solar – Länderinformation Thüringen", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/laenderinformationen/thueringen" },
    },
    {
      titel: "Hinweise des Landesverwaltungsamts zur Planung",
      text:
        "Das Thüringer Landesverwaltungsamt hat 2023 Hinweise zur Planung von Photovoltaik-Freiflächenanlagen veröffentlicht. Sie richten sich an Gemeinden und Planungsbüros und beschreiben, welche Belange im Bebauungsplanverfahren zu prüfen sind. Agri-PV durchläuft nach der Länderübersicht grundsätzlich dieselben Verfahren wie klassische Solarparks, kann aber eigene Beurteilungsmaßstäbe haben.",
      quelle: { titel: "Fachagentur Wind und Solar – Länderinformation Thüringen", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/laenderinformationen/thueringen" },
    },
    {
      titel: "Gemeindebeteiligung: Landesgesetz bisher nur für Wind",
      text:
        "Das Thüringer Gesetz über die Beteiligung von Gemeinden an Windparks (ThürWindBeteilG) von 2024 gilt nicht für Photovoltaik-Freiflächenanlagen. Für Solarparks bleibt damit nach aktuellem Recherchestand die freiwillige Beteiligung der Gemeinde nach § 6 EEG das zentrale Instrument. Eine Ausweitung auf Photovoltaik war politisch angekündigt; ob und wann sie in Kraft tritt, sollten Sie im Einzelfall prüfen.",
      quelle: { titel: "Fachagentur Wind und Solar – Länderinformation Thüringen", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/laenderinformationen/thueringen" },
    },
  ],
  kulisse: {
    text:
      "Thüringen ist kleinräumiger als die nördlichen Nachbarländer. Zu den benachteiligten Gebieten zählen vor allem ertragsschwächere Lagen; in Berichten zur Landesverordnung werden etwa die Hochlagen des Thüringer Waldes genannt. Auf den guten Ackerböden des Thüringer Beckens ist ein klassischer Solarpark schwerer zu begründen; dort kommen eher Agri-PV oder Flächen an Verkehrstrassen in Betracht.",
    gut: [
      "Vorranggebiete für großflächige Solaranlagen im Regionalplan",
      "Vorbelastete Flächen: Konversion, frühere Industrie-, Bergbau- und Militärstandorte",
      "Acker und Grünland in benachteiligten Gebieten mit geringer Bodengüte",
      "Streifen entlang von Autobahnen (etwa A 4, A 9, A 38, A 71) und Schienenwegen",
      "Grünland mit Beweidung, z. B. durch Schafe, als Agri-PV",
    ],
    schwierig: [
      "Natura-2000- und Naturschutzgebiete, Nationalpark Hainich, Biosphärenreservate",
      "Sehr gute Lössböden im Thüringer Becken und in der Goldenen Aue",
      "Wald und Hanglagen im Thüringer Wald und Schiefergebirge",
      "Vorranggebiete Landwirtschaft, Hochwasserschutz oder Freiraumsicherung im Regionalplan",
      "Flächen fern von Umspannwerken mit hohen Anschlusskosten",
    ],
  },
  ablauf: {
    text:
      "Grundlage ist auch in Thüringen fast immer ein Bebauungsplan der Gemeinde. Die Gemeinde fasst den Aufstellungsbeschluss und steuert Standort und Gestaltung; die Hinweise des Landesverwaltungsamts geben dafür den Rahmen. Die zuständige Regionale Planungsgemeinschaft (Nord-, Mittel-, Ost- oder Südwestthüringen) prüft die Vereinbarkeit mit dem Regionalplan, das Landesverwaltungsamt als obere Landesplanungsbehörde die Ziele der Raumordnung. Das Landratsamt ist als Bau-, Naturschutz- und Landwirtschaftsbehörde beteiligt. Wie überall lohnt eine frühe Netzanfrage.",
    behoerden: [
      { name: "Stadt / Gemeinde", rolle: "Flächennutzungs- und Bebauungsplan, Beteiligungsvereinbarung nach § 6 EEG" },
      { name: "Regionale Planungsgemeinschaft", rolle: "Regionalplan, ggf. Vorranggebiete für großflächige Solaranlagen" },
      { name: "Thüringer Landesverwaltungsamt", rolle: "Obere Landesplanungsbehörde, Hinweise zur PV-Freiflächenplanung", url: "https://landesverwaltungsamt.thueringen.de/" },
      { name: "Landratsamt / kreisfreie Stadt", rolle: "Bauaufsicht, Naturschutz, Landwirtschaftsbehörde" },
    ],
  },
  agri: [
    "Thüringen hatte bei der Öffnung der benachteiligten Gebiete ausdrücklich Grünland im Blick: Landwirtschafts- und Energieseite betonten, dass Flächen weiter landwirtschaftlich genutzt werden können, etwa durch Schafbeweidung unter den Modulen, und dass Agri-PV auf Agrarflächen das bevorzugte Modell sein soll. Für Betriebe mit Grünland in Mittelgebirgslagen kann das ein zusätzliches Standbein sein.",
    "Agri-PV durchläuft in Thüringen grundsätzlich dasselbe Planverfahren wie ein klassischer Solarpark. Kleinere Anlagen bis 2,5 Hektar im räumlich-funktionalen Zusammenhang mit einem Hof sind nach § 35 Abs. 1 Nr. 9 BauGB privilegiert. Nach einer in der Länderübersicht zitierten Potenzialstudie ist das rechnerische Agri-PV-Potenzial auf Thüringer Acker- und Grünland sehr groß – begrenzend sind eher Netz, Planung und Akzeptanz als die Fläche.",
  ],
  netz: {
    uenb: ["50Hertz Transmission"],
    vnb: ["TEN Thüringer Energienetze", "MITNETZ STROM"],
    hinweis:
      "TEN Thüringer Energienetze ist nach eigenen Angaben der größte Verteilnetzbetreiber Thüringens; MITNETZ STROM ist in Teilen Ostthüringens aktiv, in Städten kommen kommunale Netzbetreiber hinzu.",
    quelle: { titel: "TEN Thüringer Energienetze – Über uns", url: "https://www.thueringer-energienetze.com/Ueber_uns.aspx" },
  },
  besonderheiten: [
    {
      titel: "Kyffhäuser und Goldene Aue",
      text:
        "Nordthüringen rund um den Kyffhäuser gehört zu den strahlungsreicheren Teilen des Landes, wie der PVGIS-Wert bei Artern zeigt. Die angrenzende Goldene Aue hat dagegen sehr gute Böden. Hier entscheidet die einzelne Fläche: Bodengüte, Lage in der Kulisse und Netzanschluss.",
    },
    {
      titel: "Regionalplanung mit Solar-Vorranggebieten",
      text:
        "Anders als viele Länder erlaubt Thüringen ausdrücklich Vorranggebiete für großflächige Solaranlagen in den Regionalplänen. Wo sie festgelegt sind, sind andere Nutzungen dort zurückgestellt – für Eigentümer innerhalb solcher Gebiete ein klarer Standortvorteil.",
    },
    {
      titel: "Hoher Pachtflächenanteil",
      text:
        "75 % der Thüringer Landwirtschaftsfläche sind Pachtland. Laufende Landpachtverträge, Kündigungsfristen und die Frage, ob der bisherige Pächter über Agri-PV eingebunden werden kann, gehören deshalb früh auf den Tisch.",
    },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung:
      "Die offene EEG-Kulisse und Solar-Vorranggebiete stehen kleinräumigeren Strukturen, guten Böden im Becken und Netzfragen gegenüber; die Spanne hängt stark vom Einzelstandort ab.",
  },
  faq: [
    {
      q: "Hat Thüringen die benachteiligten Gebiete für Solarparks geöffnet?",
      a: "Ja, 2023 mit der Thüringer Photovoltaik-Freiflächenverordnung für Acker und Grünland bis 180 MW pro Jahr. Seit dem Solarpaket I im Mai 2024 gilt die bundesweite Öffnung nach § 37c EEG; eine neue Beschränkung durch das Land haben wir nicht gefunden.",
    },
    {
      q: "Wie viel Pacht zahlt ein Solarpark in Thüringen?",
      a: "Das hängt von Kulisse, Netzanschluss, Bodengüte und Flächengröße ab. Thüringen liegt innerhalb der üblichen Spanne im mittleren Bereich; seriös beziffern lässt sich die Pacht nur für die konkrete Fläche.",
    },
    {
      q: "Was bedeutet ein Vorranggebiet für großflächige Solaranlagen?",
      a: "Die Regionale Planungsgemeinschaft sichert damit Flächen für Solarparks raumordnerisch ab. Die Gemeinde braucht trotzdem einen Bebauungsplan, die regionalplanerische Hürde ist aber weitgehend genommen.",
    },
    {
      q: "Muss ein Solarpark in Thüringen an die Gemeinde zahlen?",
      a: "Eine landesgesetzliche Pflicht wie für Windparks gibt es für Photovoltaik nach unserem Recherchestand nicht. Üblich ist die freiwillige Beteiligung nach § 6 EEG, die der Betreiber trägt.",
    },
    {
      q: "Kann ich Grünland im Mittelgebirge für Solar nutzen?",
      a: "Grundsätzlich ja, wenn es in der Kulisse benachteiligter Gebiete liegt und keine Schutzgebiete oder Regionalplanziele entgegenstehen. Thüringen setzt dabei besonders auf Doppelnutzung, etwa durch Schafbeweidung.",
    },
    {
      q: "Wer ist in Thüringen Netzbetreiber für meine Fläche?",
      a: "In weiten Teilen TEN Thüringer Energienetze, in Teilen Ostthüringens MITNETZ STROM, in Städten teils kommunale Netzbetreiber. Übertragungsnetzbetreiber ist 50Hertz.",
    },
  ],
  quellen: [
    { titel: "PVGIS v5.3 (JRC) – PVcalc, Punkte Artern und Erfurt", url: "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=51.37&lon=11.29&peakpower=1&loss=14&optimalangles=1&outputformat=json", stand: "09/2026" },
    { titel: "Thüringer Landesamt für Statistik – PM 078/2024 Agrarstrukturerhebung 2023", url: "https://statistik.thueringen.de/presse/2024/pr_078_24.pdf", stand: "09/2026" },
    { titel: "Destatis – Bundesländer nach Fläche und Bevölkerung (31.12.2024)", url: "https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Administrativ/02-bundeslaender.html", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – ThürPVFflVO", url: "https://www.clearingstelle-eeg-kwkg.de/suche/type/gesetz/6757", stand: "09/2026" },
    { titel: "KNE – Übersicht Länderöffnungsklausel Solaranlagen (12/2023)", url: "https://www.naturschutz-energiewende.de/wp-content/uploads/Uebersicht_Stand_Laenderoeffnungsklausel_Solaranlagen.pdf", stand: "09/2026" },
    { titel: "top agrar – Thüringen: Mehr Solarenergie in benachteiligten Gebieten", url: "https://www.topagrar.com/energie/news/thueringen-mehr-solarenergie-in-benachteiligten-gebieten-13060009.html", stand: "09/2026" },
    { titel: "EEG 2023 § 37c", url: "https://www.gesetze-im-internet.de/eeg_2014/__37c.html", stand: "09/2026" },
    { titel: "energie.sachsen.de – Wirkung des Solarpakets I auf Landesverordnungen", url: "https://www.energie.sachsen.de/gesetze-verordnungen-3969.html", stand: "09/2026" },
    { titel: "Fachagentur Wind und Solar – Länderinformation Thüringen (11/2024)", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/laenderinformationen/thueringen", stand: "09/2026" },
    { titel: "TEN Thüringer Energienetze – Über uns", url: "https://www.thueringer-energienetze.com/Ueber_uns.aspx", stand: "09/2026" },
    { titel: "enviaM-Gruppe – MITNETZ STROM Netzgebiet (PM 05.03.2025)", url: "https://www.enviam-gruppe.de/media/unternehmensnachrichten/pressemitteilung/erneuerbare-energien-und-neue-verbrauchseinrichtungen-nehmen-im-netzgebiet-von-mitnetz-strom-weiter-deutlich-zu", stand: "09/2026" },
  ],
  unsicher: [
    "Keine Thüringer Opt-out-Verordnung nach § 37c Abs. 2 EEG n. F. gefunden; Websuche-Budget erschöpft – vor Veröffentlichung prüfen.",
    "Überlagerung der ThürPVFflVO durch Solarpaket I nicht aus Thüringer Quelle, sondern aus Systematik § 37c n. F. und sächsischer Amtsquelle abgeleitet.",
    "Angebliche Projektgrößengrenze 90 MW und Geltung bis 31.12.2027 der ThürPVFflVO nur aus Suchtreffer-Zusammenfassung – weggelassen.",
    "Ackerland 2023 (ca. 602.800 ha) nur aus Suchtreffer-Zusammenfassung – ackerHa weggelassen.",
    "LEP-Regelung zu Vorranggebieten Solar nur über Fachagentur (Stand 11/2024) belegt; ob Regionalpläne solche Gebiete bereits festgelegt haben, nicht geprüft.",
    "Hinweise des Landesverwaltungsamts (2023) nicht im Original gelesen; Inhalt nur allgemein beschrieben.",
    "Stand einer PV-Gemeindebeteiligung per Landesgesetz (geplantes Energie-/Klimagesetz) nicht verifiziert – als offen formuliert.",
    "Solar-Invest-Programm nicht recherchierbar (Suchbudget erschöpft) – weggelassen.",
    "MITNETZ-Präsenz in Ostthüringen aus MITNETZ-Angaben (Netzgebiet umfasst Thüringen), genaue Landkreise nicht verifiziert.",
    "Artern-Solarpark der ÖKOVOLT Gruppe: laut Auftrag belegt; keine Leistungsangaben ergänzt.",
  ],
};

export default region;
