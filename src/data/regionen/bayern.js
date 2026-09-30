// Recherche: 29.09.2026 – StMB-Rundschreiben „Bau- und landesplanerische Behandlung von Freiflächen-Photovoltaikanlagen“
// (Stand 10.12.2021), Energie-Atlas Bayern (benachteiligte Gebiete, Regionalplanung), Hinweise Eingriffsregelung
// PV-FFA (12/2024, via pv magazine), § 37c EEG (gesetze-im-internet.de), FA Wind und Solar Analyse Ausschreibungen 2025,
// Planungshilfe Regierung von Unterfranken (5. Fassung 07/2026), Statistikportal (LF 2025, Bevölkerung), PVGIS v5.3.
const region = {
  slug: "bayern",
  land: "DE",
  name: "Bayern",
  inName: "in Bayern",
  kurz: "BY",
  seoTitel: "Solarpark & Agri-PV Bayern: Pacht, Recht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht in Bayern: benachteiligte Gebiete, StMB-Hinweise zur Freiflächen-PV, Regionalplanung, Ausgleich und Agri-PV – was Eigentümer wissen sollten.",
  lead:
    "Bayern ist das Bundesland mit den meisten Zuschlägen für Freiflächen-PV. Wer hier eine Fläche verpachten will, braucht vor allem eines: eine Gemeinde, die mitplant, und einen Standort, der zu den bayerischen Kriterien passt.",
  akzent: "mit Kulisse und Konzept.",
  ertrag: {
    kwhProKwp: 1130,
    ort: "im Gäuboden bei Straubing",
    spanne: "rund 1.110 bis 1.130 kWh/kWp",
    hinweis:
      "Weitere PVGIS-Punkte: Unterfranken bei Würzburg rund 1.120 kWh/kWp, Raum Landshut rund 1.110 kWh/kWp (optimal geneigte, fest aufgeständerte Module, 14 % Systemverluste).",
  },
  eckdaten: {
    hauptstadt: "München",
    flaecheKm2: 70542,
    lfHa: 3088800,
    lfJahr: 2025,
    einwohner: 13245503,
    quelle: {
      titel: "Statistische Ämter des Bundes und der Länder – Statistikportal (Fläche/Bevölkerung, Bodennutzungshaupterhebung 2025)",
      url: "https://www.statistikportal.de/de/land-und-forstwirtschaft/betriebe-flaeche-viehhaltung-und-arbeitskraefte",
    },
  },
  einleitung: [
    "Bayern ist seit Jahren der wichtigste Markt für Freiflächen-Photovoltaik in Deutschland. Nach der Auswertung der Fachagentur Wind und Solar entfielen in den Ausschreibungsrunden 2025 rund **2.197 MW** und damit gut 30 Prozent der bundesweit bezuschlagten Leistung auf Bayern. Der Anteil sinkt zwar, weil andere Länder aufholen, die absolute Menge ist aber seit 2021 deutlich gestiegen. Gründe sind die vergleichsweise hohe Einstrahlung, früh geöffnete Flächenkulissen und eine Verwaltungspraxis, die mit dem Thema seit Langem vertraut ist.",
    "Für Flächeneigentümer heißt das: Die Nachfrage nach geeigneten Acker- und Grünlandflächen ist hoch, aber die Konkurrenz um Netzanschlüsse und die Zustimmung der Gemeinden ebenfalls. Viele Kommunen steuern den Zubau inzwischen über eigene Standortkonzepte oder Kriterienkataloge. Ob Ihre Fläche in eine solche Kulisse passt, entscheidet sich deshalb oft schon lange vor dem ersten Planentwurf.",
    "Rechtlich läuft in Bayern fast jedes größere Projekt über einen Bebauungsplan der Gemeinde. Die maßgebliche Orientierung liefern die gemeinsamen Hinweise der Staatsministerien zur „Bau- und landesplanerischen Behandlung von Freiflächen-Photovoltaikanlagen“ sowie das Landesentwicklungsprogramm (LEP) und die 18 Regionalpläne.",
  ],
  recht: [
    {
      titel: "Benachteiligte Gebiete: seit 2017 geöffnet, seit 2024 bundesweit Standard",
      text: "Bayern hat die Länderöffnungsklausel früh genutzt: Die Freiflächenverordnung gilt seit dem 1. Januar 2017 und wurde zum 1. Juli 2020 auf bis zu **200 Zuschläge pro Kalenderjahr** in benachteiligten Gebieten erweitert. Mit dem Solarpaket I (Mai 2024) sind Acker- und Grünlandflächen in benachteiligten Gebieten bundesweit grundsätzlich förderfähig; die Länder können nur noch per Verordnung ausschließen (Opt-out), und das erst, wenn mehr als 1 Prozent der landwirtschaftlich genutzten Fläche mit Freiflächenanlagen belegt ist (ab 2031: 1,5 Prozent). Eine bayerische Ausschlussverordnung ist nach unserer Recherche nicht bekannt.",
      quelle: {
        titel: "Energie-Atlas Bayern – PV-Freiflächenförderung in benachteiligten Gebieten",
        url: "https://www.energieatlas.bayern.de/erneuerbare-energien/photovoltaik/freiflaechen/benachteiligte_gebiete",
      },
    },
    {
      titel: "StMB-Hinweise: Bauleitplanung ist die Regel",
      text: "Nach den Hinweisen des Bauministeriums sind Freiflächenanlagen grundsätzlich nicht nach § 35 Abs. 1 BauGB privilegiert und als sonstige Vorhaben in aller Regel unzulässig. Ausnahmen gelten für die bundesrechtlich privilegierten Streifen entlang von Autobahnen und zweigleisigen Bahnstrecken. Für alle anderen Standorte braucht es einen Bebauungsplan, meist als vorhabenbezogenen Plan mit Durchführungsvertrag, in dem auch Rückbau und landwirtschaftliche Nachnutzung geregelt werden können.",
      quelle: {
        titel: "StMB – Bau- und landesplanerische Behandlung von Freiflächen-Photovoltaikanlagen (Stand 10.12.2021)",
        url: "https://www.stmb.bayern.de/assets/stmi/buw/baurechtundtechnik/25_rundschreiben_freiflaechen-photovoltaik.pdf",
      },
    },
    {
      titel: "Ausschluss- und Restriktionsflächen nach Anlage zum Rundschreiben",
      text: "Die Hinweise nennen **grundsätzlich ungeeignete Standorte**, darunter Naturschutzgebiete, gesetzlich geschützte Biotope, Wiesenbrütergebiete, Überschwemmungsgebiete, Alpenplan Zone C und **landwirtschaftliche Böden überdurchschnittlicher Bonität**. Als eingeschränkt geeignet gelten unter anderem Landschaftsschutzgebiete (auch ehemalige Schutzzonen in Naturparken), landschaftliche Vorbehaltsgebiete und regionale Grünzüge, weithin einsehbare Kuppen und Hanglagen sowie Bodendenkmäler.",
      quelle: {
        titel: "StMB – Rundschreiben Freiflächen-Photovoltaik, Anlage Ausschluss-/Restriktionsflächen",
        url: "https://www.stmb.bayern.de/assets/stmi/buw/baurechtundtechnik/25_rundschreiben_freiflaechen-photovoltaik.pdf",
      },
    },
    {
      titel: "Landesplanung: vorbelastete Standorte bevorzugt, Prüfung ab 30 ha",
      text: "Das LEP sieht vor, Freiflächen-PV vorzugsweise auf vorbelasteten Standorten zu errichten. Die Regionalpläne können Vorrang- und Vorbehaltsgebiete für Photovoltaik festlegen. In Vorranggebieten für Landwirtschaft sind Freiflächenanlagen nach Darstellung des Energie-Atlas regelmäßig nicht vereinbar, Agri-PV nach DIN SPEC 91434 ausgenommen. Ab rund 30 ha wird regelmäßig geprüft, ob eine Raumverträglichkeitsprüfung nötig ist.",
      quelle: {
        titel: "Energie-Atlas Bayern – Raumordnung und Regionalplanung",
        url: "https://www.energieatlas.bayern.de/erneuerbare-energien/photovoltaik/themenplattform-planen-genehmigen/regionalplanung",
      },
    },
    {
      titel: "Ausgleich: seit Dezember 2024 im Regelfall kein zusätzlicher Bedarf",
      text: "Die überarbeiteten bayerischen Hinweise zur Eingriffsregelung machen Anlagen ohne zusätzlichen Ausgleichsbedarf zum Regelfall, wenn unter anderem die Grundfläche höchstens 25 ha beträgt, weniger als 2,5 Prozent versiegelt werden, die Module auf Rammpfählen stehen und mindestens 80 cm Bodenabstand haben. Werden die Kriterien nicht erfüllt, wird nach dem Bericht ein Ausgleich von 10 Prozent der Fläche angesetzt. Für Eigentümer bedeutet das: weniger zusätzliche Ausgleichsflächen, die sonst oft aus der eigenen Fläche kämen.",
      quelle: {
        titel: "pv magazine – Im Regelfall keine Ausgleichsflächen für Solarparks in Bayern mehr notwendig (12.12.2024)",
        url: "https://www.pv-magazine.de/2024/12/12/im-regelfall-keine-ausgleichsflaechen-fuer-solarparks-in-bayern-mehr-notwendig/",
      },
    },
  ],
  kulisse: {
    text: "Die bayerische Praxis folgt einem Dreischritt: Ausschlussflächen streichen, Restriktionsflächen abwägen, dann die geeigneten Bereiche nach Kriterien wie Bodengüte, Einsehbarkeit und Netzanschluss bewerten. Viele Gemeinden halten das Ergebnis in einem Standortkonzept fest, das sie später bei der Bauleitplanung bindet. Regierungen wie die von Unterfranken stellen zusätzlich Planungshilfen mit Fachkarten bereit; diese legen aber ausdrücklich keine Vorrang- oder Ausschlussgebiete fest.",
    gut: [
      "Acker und Grünland mit unterdurchschnittlicher Bonität, gerne in benachteiligten Gebieten",
      "Vorbelastete Lagen: entlang von Autobahnen, Bahnstrecken, Gewerbe oder Hochspannungstrassen",
      "Flächen ohne Fernwirkung, etwa in Mulden oder hinter Waldrändern",
      "Standorte in Reichweite eines aufnahmefähigen Umspannwerks oder Mittelspannungsnetzes",
      "Flächen innerhalb eines gemeindlichen Standortkonzepts oder regionalen Vorbehaltsgebiets PV",
    ],
    schwierig: [
      "Böden überdurchschnittlicher Bonität (Ausschlusskriterium laut StMB-Hinweisen)",
      "Wiesenbrütergebiete, Überschwemmungsgebiete, Wasserschutzgebiete mit entgegenstehenden Auflagen",
      "Landschaftsschutzgebiete und ehemalige Naturpark-Schutzzonen ohne Zonierungskonzept",
      "Vorranggebiete Landwirtschaft im Regionalplan (außer Agri-PV)",
      "Kuppen, Hanglagen, Alpenplan-Zonen und Bereiche mit Bodendenkmälern",
    ],
  },
  ablauf: {
    text: "Am Anfang steht fast immer ein Gespräch mit Bürgermeister und Gemeinderat. Stimmt die Gemeinde zu, fasst sie einen Aufstellungsbeschluss, ändert parallel den Flächennutzungsplan und stellt einen (meist vorhabenbezogenen) Bebauungsplan auf. Die Regierung als höhere Landesplanungsbehörde und der Regionale Planungsverband prüfen die Vereinbarkeit mit LEP und Regionalplan, das Amt für Ernährung, Landwirtschaft und Forsten bringt die agrarstrukturellen Belange ein. Die Baugenehmigung erteilt anschließend das Landratsamt oder die kreisfreie Stadt. Eine frühe Anfrage beim Netzbetreiber gehört in Bayern zur Standortwahl dazu; das Rundschreiben empfiehlt ausdrücklich, Netzkapazitäten schon im Standortkonzept zu berücksichtigen.",
    behoerden: [
      { name: "Gemeinde / Stadt", rolle: "Planungshoheit: Standortkonzept, Flächennutzungsplan, Bebauungsplan, städtebaulicher Vertrag" },
      { name: "Regionaler Planungsverband (18 Regionen)", rolle: "Regionalplan, ggf. Vorrang-/Vorbehaltsgebiete oder Steuerungskonzepte für Freiflächen-PV" },
      { name: "Regierung (z. B. von Unterfranken) – höhere Landesplanungsbehörde", rolle: "Landesplanerische Stellungnahme, ggf. Raumverträglichkeitsprüfung, Planungshilfen", url: "https://www.regierung.unterfranken.bayern.de/aufgaben/177666/177670/eigene_leistung/el_00860/" },
      { name: "Landratsamt / kreisfreie Stadt", rolle: "Baugenehmigung, untere Naturschutz- und Denkmalschutzbehörde" },
      { name: "Amt für Ernährung, Landwirtschaft und Forsten (AELF)", rolle: "Träger öffentlicher Belange für Landwirtschaft und Agrarstruktur" },
    ],
  },
  agri: [
    "Agri-PV hat in Bayern einen besonderen planerischen Stellenwert: In Vorranggebieten für Landwirtschaft, in denen klassische Freiflächenanlagen regelmäßig ausscheiden, kann eine Agri-PV-Anlage nach DIN SPEC 91434 nach Darstellung des Energie-Atlas vereinbar sein. Das StMB-Rundschreiben weist zudem darauf hin, dass eine Privilegierung als Teil eines landwirtschaftlichen Betriebs nur in Frage kommt, wenn die Stromerzeugung untergeordnet bleibt und dem Betrieb überwiegend zugutekommt. Größere Agri-PV-Projekte laufen daher in der Regel ebenfalls über einen vorhabenbezogenen Bebauungsplan.",
    "Der Freistaat forscht selbst: Auf Flächen der Bayerischen Staatsgüter in Grub betreiben das Technologie- und Förderzentrum (TFZ) und die Landesanstalt für Landwirtschaft (LfL) eine Agri-PV-Versuchsanlage mit rund 940 kW, bestehend aus einer vertikalen und zwei nachgeführten Anlagen. In der Hallertau wird Agri-PV über Hopfen erprobt, die Landesanstalt für Wein- und Gartenbau untersucht Obst- und Gemüsekulturen unter Modulen. Für Betriebe mit Sonderkulturen wie Hopfen, Beerenobst oder Gemüse kann Agri-PV deshalb eine ernsthafte Option sein, die eigene Bewirtschaftung mit einer Pachteinnahme zu verbinden.",
  ],
  netz: {
    uenb: ["TenneT TSO", "Amprion (Teile Bayerisch-Schwabens)"],
    vnb: ["Bayernwerk Netz", "LEW Verteilnetz", "N-ERGIE Netz", "zahlreiche Stadtwerke und Regionalversorger"],
    hinweis:
      "Bayernwerk Netz meldete für 2024 bundesweit die meisten Einspeisepunkte. Mit der „Einspeisesteckdose“ erproben Bayernwerk Netz und LEW Verteilnetz gebündelte Anschlusskapazitäten an Umspannwerken, um Netzanschlüsse schneller und günstiger zu machen.",
    quelle: {
      titel: "LEW Presse – Bayernwerk Netz und LEW Verteilnetz stellen Einspeisesteckdose vor",
      url: "https://presse.lew.de/pressreleases/kosten-sparen-schneller-werden-bayernwerk-netz-und-lew-verteilnetz-stellen-mit-wirtschaftsminister-aiwanger-energiewende-projekt-einspeisesteckdose-vor-3331441",
    },
  },
  besonderheiten: [
    {
      titel: "Standortkonzepte der Gemeinden",
      text: "Das Rundschreiben empfiehlt Gemeinden ausdrücklich, städtebauliche Standortkonzepte für das ganze Gemeindegebiet zu beschließen. Liegt Ihre Fläche in einem solchen Konzept, ist die Alternativenprüfung im Bebauungsplan bereits weitgehend erledigt. Liegt sie außerhalb, wird es deutlich schwerer.",
    },
    {
      titel: "Wiesenbrüter und Moore",
      text: "Wiesenbrütergebiete sind in Bayern ein Ausschlusskriterium. Moorböden mit weitgehend degradierter Bodenstruktur werden dagegen als Restriktionsflächen geführt, sind also nicht von vornherein ausgeschlossen, sondern im Einzelfall abzuwägen.",
    },
    {
      titel: "Landschaftsschutzgebiete mit Zonierung",
      text: "In Landschaftsschutzgebieten empfiehlt das Rundschreiben Zonierungskonzepte der zuständigen Gebietskörperschaft, die geeignete PV-Standorte ausweisen. Eine Herausnahme von Flächen aus dem Schutzgebiet sieht es dagegen in der Regel nicht als geeignetes Mittel an.",
    },
    {
      titel: "Rückkehr zur Landwirtschaft",
      text: "Nach den bayerischen Hinweisen entsteht unter einer reinen PV-Anlage mit Mahd oder Beweidung kein Dauergrünland im Sinne des Umwandlungsverbots. Die Fläche kann nach dem Rückbau grundsätzlich wieder als Acker genutzt werden; erst nach mindestens fünf Jahren Grünlandnutzung danach würde sie zu Dauergrünland.",
    },
  ],
  pacht: {
    tendenz: "oben",
    begruendung:
      "Bayern verbindet gute Einstrahlung mit dem bundesweit größten Zuschlagsvolumen; die Nachfrage von Projektentwicklern nach genehmigungsfähigen Flächen mit Netzanschluss ist entsprechend hoch. Auf guten Böden oder bei fehlender Netzkapazität kann die erzielbare Pacht aber deutlich niedriger liegen oder ein Projekt ganz ausscheiden.",
  },
  faq: [
    {
      q: "Wie viel Pacht bringt ein Solarpark in Bayern?",
      a: "Das hängt vor allem von Netzanschluss, Flächengröße, Bodengüte und Genehmigungschancen ab. Wegen der hohen Nachfrage liegen bayerische Angebote tendenziell im oberen Bereich der üblichen Spanne. Seriöse Angebote nennen einen festen Mindestbetrag pro Hektar und Jahr plus eine klare Laufzeit.",
    },
    {
      q: "Hat Bayern die benachteiligten Gebiete geöffnet?",
      a: "Ja, bereits 2017 mit der Freiflächenverordnung, seit 2020 mit bis zu 200 Zuschlägen pro Jahr. Seit dem Solarpaket I (Mai 2024) sind benachteiligte Gebiete bundesweit grundsätzlich förderfähig; ein Ausschluss durch Bayern ist nach unserer Recherche nicht erfolgt.",
    },
    {
      q: "Brauche ich für einen Solarpark in Bayern einen Bebauungsplan?",
      a: "In aller Regel ja. Ausnahmen sind die privilegierten 200-Meter-Streifen entlang von Autobahnen und zweigleisigen Bahnstrecken sowie kleine, betriebsbezogene Agri-PV-Anlagen. Alles andere läuft über die Bauleitplanung der Gemeinde.",
    },
    {
      q: "Ist meine Fläche mit guten Böden in Bayern geeignet?",
      a: "Eher nicht für eine klassische Freiflächenanlage. Die Hinweise der Staatsministerien führen landwirtschaftliche Böden überdurchschnittlicher Bonität als grundsätzlich ungeeignet. Für solche Flächen kann Agri-PV die bessere Wahl sein.",
    },
    {
      q: "Muss ich in Bayern zusätzliche Ausgleichsflächen abgeben?",
      a: "Seit Dezember 2024 im Regelfall nicht mehr, wenn die Anlage die bayerischen Kriterien erfüllt (unter anderem höchstens 25 ha, geringe Versiegelung, Rammpfähle, 80 cm Bodenabstand und ökologische Pflege). Sonst wird nach dem Bericht ein Ausgleich von etwa 10 Prozent der Fläche angesetzt.",
    },
    {
      q: "Wer entscheidet in Bayern über einen Solarpark?",
      a: "Die Gemeinde über den Bebauungsplan. Die Regierung prüft die landesplanerische Vereinbarkeit, das Landratsamt erteilt die Baugenehmigung. Ohne Zustimmung des Gemeinderats gibt es kein Baurecht.",
    },
  ],
  quellen: [
    { titel: "StMB – Bau- und landesplanerische Behandlung von Freiflächen-Photovoltaikanlagen (Stand 10.12.2021)", url: "https://www.stmb.bayern.de/assets/stmi/buw/baurechtundtechnik/25_rundschreiben_freiflaechen-photovoltaik.pdf", stand: "09/2026" },
    { titel: "Energie-Atlas Bayern – PV-Freiflächenförderung in benachteiligten Gebieten", url: "https://www.energieatlas.bayern.de/erneuerbare-energien/photovoltaik/freiflaechen/benachteiligte_gebiete", stand: "09/2026" },
    { titel: "Energie-Atlas Bayern – Lexikon Freiflächenverordnung", url: "https://www.energieatlas.bayern.de/energieatlas/lexikon/f/freiflaechenverordnung", stand: "09/2026" },
    { titel: "Energie-Atlas Bayern – Raumordnung und Regionalplanung", url: "https://www.energieatlas.bayern.de/erneuerbare-energien/photovoltaik/themenplattform-planen-genehmigen/regionalplanung", stand: "09/2026" },
    { titel: "§ 37c EEG 2023 (gesetze-im-internet.de)", url: "https://www.gesetze-im-internet.de/eeg_2014/__37c.html", stand: "09/2026" },
    { titel: "pv magazine – Im Regelfall keine Ausgleichsflächen für Solarparks in Bayern mehr notwendig", url: "https://www.pv-magazine.de/2024/12/12/im-regelfall-keine-ausgleichsflaechen-fuer-solarparks-in-bayern-mehr-notwendig/", stand: "09/2026" },
    { titel: "Regierung von Unterfranken – Planungshilfe Freiflächen-Photovoltaik", url: "https://www.regierung.unterfranken.bayern.de/aufgaben/177666/177670/eigene_leistung/el_00860/", stand: "09/2026" },
    { titel: "FA Wind und Solar – Ausschreibungen für PV auf Freiflächen, Ergebnisse 2025", url: "https://www.fachagentur-wind-solar.de/fileadmin/Veroeffentlichungen/Solar/Daten/FA_Wind_Solar_HGP_Ausschreibungen_PV_auf_Freiflaechen_2025.pdf", stand: "09/2026" },
    { titel: "pv magazine – Agri-Photovoltaik in Bayern auf sieben Hektar Ackerland", url: "https://www.pv-magazine.de/2024/07/24/agri-photovoltaik-in-bayern-forschung-und-innovation-auf-sieben-hektar-ackerland/", stand: "09/2026" },
    { titel: "LEW Presse – Einspeisesteckdose Bayernwerk Netz und LEW Verteilnetz", url: "https://presse.lew.de/pressreleases/kosten-sparen-schneller-werden-bayernwerk-netz-und-lew-verteilnetz-stellen-mit-wirtschaftsminister-aiwanger-energiewende-projekt-einspeisesteckdose-vor-3331441", stand: "09/2026" },
    { titel: "Statistikportal – Landwirtschaftlich genutzte Fläche / Fläche und Bevölkerung", url: "https://www.statistikportal.de/de/land-und-forstwirtschaft/betriebe-flaeche-viehhaltung-und-arbeitskraefte", stand: "09/2026" },
    { titel: "PVGIS 5.3 (JRC) – PVcalc Straubing/Würzburg/Landshut", url: "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=48.88&lon=12.57&peakpower=1&loss=14&optimalangles=1&outputformat=json", stand: "09/2026" },
  ],
  unsicher: [
    "Ob die bayerische Freiflächenverordnung (AVEn, 200 Zuschläge/Jahr) nach Solarpaket I formal aufgehoben oder nur praktisch gegenstandslos ist, wurde nicht abschließend belegt; eine bayerische Opt-out-Verordnung nach § 37c EEG wurde nicht gefunden (Energie-Atlas erwähnt keine).",
    "StMB-Rundschreiben liegt nur in der Fassung Stand 10.12.2021 vor; ob eine neuere Fassung existiert, wurde nicht geprüft (Suchbudget erschöpft). Eingriffsregelung 12/2024 separat.",
    "Details der Eingriffsregelung 2024 (10 % Ausgleich bei Nichterfüllung, Ost-West-Ausnahme) stammen aus pv magazine, nicht direkt aus dem Originaldokument.",
    "Amprion als ÜNB in Teilen Bayerisch-Schwabens: Allgemeinwissen/Suchzusammenfassung, nicht durch Primärquelle geprüft.",
    "Datum der Vorstellung der Einspeisesteckdose unklar (Pressetext nennt 24. Juni, Jahr uneindeutig) – daher ohne Datum formuliert.",
    "Raumverträglichkeitsprüfung ab 30 ha: laut Energie-Atlas-Zusammenfassung „regelmäßige Prüfung“, keine feste Pflichtschwelle.",
  ],
};

export default region;
