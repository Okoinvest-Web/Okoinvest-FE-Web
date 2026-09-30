// Recherche: 29.09.2026 – PVGIS v5.3 (JRC), Destatis Gemeindeverzeichnis (31.12.2024), Statistikportal (BHE 2025),
// LSN (ASE 2023), NKlimaG § 3, NWindPVBetG (Nds. GVBl. 2024 Nr. 31), Arbeitshilfe „Planung von Freiflächen-PV in
// Niedersachsen“ (NLT/ML 10/2022), Staatskanzlei (NFSVO 2021/2023), Fachagentur Wind und Solar, KEAN/topagrar (MaStR 02/2026)
const region = {
  slug: "niedersachsen",
  land: "DE",
  name: "Niedersachsen",
  inName: "in Niedersachsen",
  kurz: "NI",
  seoTitel: "Solarpark & Agri-PV Niedersachsen: Pacht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht in Niedersachsen: Flächenziel 0,5 %, LROP-Regeln, Akzeptanzabgabe nach NWindPVBetG, Moor-PV und Agri-PV für Freiflächen-PV erklärt.",
  lead:
    "Niedersachsen will bis 2033 Solarstrom auf mindestens 0,5 Prozent der Landesfläche erzeugen und hat als eines der ersten Länder eine Pflichtabgabe für Solarparks an die Gemeinden eingeführt. Für Eigentümer von Geest-, Marsch- und Moorflächen eröffnet das eigene Chancen.",
  akzent: "mit Flächenziel und Moorboden.",
  ertrag: {
    kwhProKwp: 980,
    ort: "bei Walsrode (Lüneburger Heide)",
    spanne: "rund 980 bis 1.000 kWh/kWp",
    hinweis:
      "Weitere PVGIS-Punkte: Ostfriesland bei Aurich rund 990, Leinetal bei Göttingen rund 1.000 kWh/kWp – geringere Einstrahlung als im Süden, dafür kühlere Modultemperaturen.",
  },
  eckdaten: {
    hauptstadt: "Hannover",
    flaecheKm2: 47710,
    lfHa: 2608100,
    lfJahr: 2025,
    einwohner: 8004489,
    quelle: {
      titel: "Statistikportal des Bundes und der Länder (Bodennutzungshaupterhebung 2025); Destatis, Gemeindeverzeichnis, Stand 31.12.2024",
      url: "https://www.statistikportal.de/de/land-und-forstwirtschaft/betriebe-flaeche-viehhaltung-und-arbeitskraefte",
    },
  },
  einleitung: [
    "Niedersachsen ist nach Fläche das zweitgrößte Bundesland und ein Agrarland: Rund 33.300 Betriebe bewirtschafteten 2023 laut Landesamt für Statistik etwa 2,6 Millionen Hektar, davon rund 1,9 Millionen Hektar Ackerland und knapp 690.000 Hektar Grünland. Die Böden reichen von armen Sandböden der Geest über Marschen und Moore im Nordwesten bis zu den fruchtbaren Lössbörden im Südosten – für die Solarplanung ist diese Spreizung zentral.",
    "Bei Freiflächen-PV holt das Land deutlich auf. Nach Auswertung der Klimaschutz- und Energieagentur Niedersachsen (KEAN) waren Ende 2025 rund 1,7 GW Freiflächenanlagen installiert, ein Plus von etwa 40 Prozent binnen eines Jahres. In den EEG-Ausschreibungen 2025 lag Niedersachsen laut Fachagentur Wind und Solar mit 701 MW Zuschlägen auf Platz drei der Länder.",
    "Das **Niedersächsische Klimagesetz (NKlimaG)** gibt die Richtung vor: 65 GW Photovoltaik bis 2035, davon mindestens 50 GW auf Dächern und anderen Flächen, und Solarstrom aus Freiflächenanlagen auf **mindestens 0,5 Prozent der Landesfläche bis 2033**. Umgesetzt wird das über die Bauleitplanung der Gemeinden und die Regionalplanung der Landkreise.",
  ],
  recht: [
    {
      titel: "Flächenziel 0,5 Prozent bis 2033",
      text: "§ 3 NKlimaG verlangt die Erzeugung von Strom durch Freiflächenanlagen auf mindestens 0,5 Prozent der Landesfläche bis 2033 (ursprünglich 0,47 Prozent). Nach der Arbeitshilfe des Landes gibt es dafür keine verbindlichen Teilflächenziele je Landkreis oder Gemeinde – die Kommunen entscheiden selbst, wie viel sie beitragen.",
      quelle: { titel: "§ 3 NKlimaG (voris)", url: "https://voris.wolterskluwer-online.de/browse/document/1ee6e79a-94e4-3a2e-ad72-52e87c6b76d3" },
    },
    {
      titel: "LROP 2022: Vorbehaltsgebiete Landwirtschaft nur noch Grundsatz",
      text: "Seit der Änderung des Landes-Raumordnungsprogramms im September 2022 **sollen** Vorbehaltsgebiete Landwirtschaft nicht für Freiflächen-PV genutzt werden, können aber für raumverträgliche Agri-PV vorgesehen werden (Kap. 4.2.1 Ziffer 03 LROP). Als Grundsatz ist das der Abwägung zugänglich, wenn die Gemeinde gewichtige Gründe darlegt. **Vorranggebiete Landwirtschaft** stehen konventionellen Solarparks dagegen klar entgegen.",
      quelle: { titel: "Arbeitshilfe „Planung von Freiflächen-PV in Niedersachsen“ (NLT/ML, 10/2022)", url: "https://www.nlt.de/wp-content/uploads/2022/11/2022_10_24_Arbeitshilfe-Solarplanung.pdf" },
    },
    {
      titel: "Akzeptanzabgabe nach NWindPVBetG",
      text: "Seit April 2024 müssen Betreiber neuer Freiflächenanlagen ab 1 MW der Standortgemeinde eine **Akzeptanzabgabe von 0,2 ct/kWh** zahlen und Anwohnern sowie Kommunen im Umkreis von 2.500 Metern ein weiteres Beteiligungsangebot machen, etwa mindestens 0,1 ct/kWh Überschussbeteiligung oder 20 Prozent an der Projektgesellschaft. **Ausgenommen sind Agri-PV und Moor-PV** als besondere Solaranlagen sowie Vorhaben, die vor dem 19. April 2024 genehmigt wurden.",
      quelle: { titel: "NWindPVBetG (umwelt-online)", url: "https://www.umwelt-online.de/regelwerk/cgi-bin/suchausgabe.cgi?pfad=%2Fenergie%2Flaender%2Fnds%2Fwindpvbetg24.htm&such=Gesetz" },
    },
    {
      titel: "Benachteiligte Gebiete: Landesverordnung seit 2021, heute Bundesrecht",
      text: "Niedersachsen öffnete 2021 mit der Freiflächensolaranlagenverordnung benachteiligte Gebiete für EEG-Gebote mit zunächst 150 MW pro Jahr; 2023 wurde das Kontingent auf 500 MW angehoben, mit Fokus auf sehr trockene, wiedervernässbare Flächen und Böden geringer Güte. Seit dem Solarpaket I (Mai 2024) sind benachteiligte Gebiete bundesweit grundsätzlich zugelassen. Nach der Neuabgrenzung gehören vor allem grünland- und waldreiche Regionen im Osten, an der Küste und im Süden des Landes dazu.",
      quelle: { titel: "Staatskanzlei Niedersachsen – Änderung der Freiflächensolar-Verordnung (08/2023)", url: "https://www.stk.niedersachsen.de/startseite/presseinformationen/mehr-flachen-fur-solaranlagen-landesregierung-andert-verordnung-vorschlag-der-taskforce-energiewende-fur-sehr-trockene-flachen-und-boden-geringer-gute-224740.html" },
    },
    {
      titel: "Baugenehmigung: seit 2025 verfahrensfrei, Bebauungsplan bleibt",
      text: "Nach der Länderübersicht der Fachagentur Wind und Solar sind Freiflächenanlagen in Niedersachsen seit Juli 2025 unter bestimmten Voraussetzungen nach der Niedersächsischen Bauordnung verfahrensfrei. Das ersetzt nicht den Bebauungsplan und nicht die Prüfung von Natur- und Artenschutz – es entfällt nur der gesonderte Bauantrag.",
      quelle: { titel: "Fachagentur Wind und Solar – Länderinformationen Niedersachsen", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/laenderinformationen/niedersachsen" },
    },
  ],
  kulisse: {
    text: "Die Landes-Arbeitshilfe empfiehlt den Kommunen eine Standortbewertung nach Bodenfruchtbarkeit, Schutzgebieten und Raumordnung. Böden mit hohem bis sehr hohem natürlichem Ertragspotenzial – typisch für die Börden zwischen Hannover, Hildesheim und Braunschweig – gelten dort als Ausschlussflächen, mit Ausnahme von Agri-PV. Umgekehrt nennt die Arbeitshilfe ertragsschwache Standorte, erosionsgefährdete Äcker und entwässerte Moorböden als besonders geeignet.",
    gut: [
      "Böden mit sehr geringem Ertragspotenzial, etwa trockene Sandböden der Geest",
      "Entwässerte, intensiv genutzte Moorböden in Vorranggebieten Torferhaltung, wenn die Anlage mit Wiedervernässung einhergeht",
      "Stark wind- oder wassererosionsgefährdete Ackerflächen",
      "500-m-Streifen an Autobahnen und Schienenwegen sowie Konversions- und Altlastenflächen",
      "Flächen in benachteiligten Gebieten ohne besondere naturschutzfachliche Wertigkeit",
    ],
    schwierig: [
      "Vorranggebiete Landwirtschaft und Böden mit hohem Ertragspotenzial (außer Agri-PV)",
      "Vorbehaltsgebiete Landwirtschaft, wenn im Gemeindegebiet andere geeignete Flächen verfügbar sind",
      "Für Renaturierung vorgesehene Teile der Vorranggebiete Torferhaltung",
      "Überschwemmungsgebiete, Wasserschutzgebiete (engere Zonen) und Feuchtgebiete internationaler Bedeutung wie Dümmer oder Diepholzer Moorniederung",
      "Regionen mit hoher Tierhaltungsdichte im Westen, in denen auch schwache Böden für die Gülleausbringung gebraucht werden",
    ],
  },
  ablauf: {
    text: "In Niedersachsen sind die Landkreise, die Region Hannover und der Regionalverband Großraum Braunschweig Träger der Regionalplanung; viele erarbeiten eigene Energie- oder Standortkonzepte für Freiflächen-PV. Den Bebauungsplan stellt die Gemeinde bzw. Samtgemeinde auf, meist mit paralleler Änderung des Flächennutzungsplans. Das LROP sieht vor, dass die Regionalplanung bei solchen Konzepten die landwirtschaftlichen Fachbehörden einbindet. Die Landkreise sind zugleich untere Naturschutzbehörde; für naturverträgliche Planung haben NLWKN, Umweltministerium und Landkreistag 2023 eigene Hinweise veröffentlicht.",
    behoerden: [
      { name: "Gemeinde / Samtgemeinde / Stadt", rolle: "Flächennutzungs- und Bebauungsplan, städtebaulicher Vertrag, Empfänger der Akzeptanzabgabe" },
      { name: "Landkreis bzw. Region Hannover", rolle: "Träger der Regionalplanung (RROP), untere Naturschutz- und Wasserbehörde" },
      { name: "Landwirtschaftskammer Niedersachsen", rolle: "Landwirtschaftliche Fachbehörde, agrarstrukturelle Stellungnahmen", url: "https://www.lwk-niedersachsen.de" },
      { name: "Niedersächsisches Landwirtschaftsministerium (ML)", rolle: "Oberste Landesplanungsbehörde, Landes-Raumordnungsprogramm", url: "https://www.ml.niedersachsen.de" },
    ],
  },
  agri: [
    "Agri-PV ist in Niedersachsen raumordnerisch privilegiert: Sie darf in Vorbehaltsgebieten Landwirtschaft ausdrücklich vorgesehen werden und kann laut Arbeitshilfe im Einzelfall sogar mit einem Vorranggebiet Landwirtschaft vereinbar sein, abhängig von Standort und Kultur. Auf Böden mit hohem Ertragspotenzial ist Agri-PV der realistische Weg zur Solarnutzung. Hinzu kommt ein wirtschaftlicher Vorteil: Agri-PV-Anlagen sind von der Akzeptanzabgabe nach NWindPVBetG ausgenommen.",
    "Für **Moor-PV** ist Niedersachsen ein Schwerpunktland: Etwa 38 Prozent der deutschen Moorflächen liegen hier, viele davon entwässert und landwirtschaftlich genutzt. Die Arbeitshilfe sieht Solarparks in Vorranggebieten Torferhaltung als vereinbar an, wenn Torfkörper und Stauschichten nicht wesentlich beeinträchtigt werden, und empfiehlt, sie mit einer Anhebung der Wasserstände zu verbinden. Wiedervernässte Standorte stellen allerdings höhere Anforderungen an Gründung und Kabeltrassen – und können sich zu wertvollen Lebensräumen entwickeln.",
  ],
  netz: {
    uenb: ["TenneT TSO", "Amprion"],
    vnb: ["Avacon Netz", "EWE NETZ", "enercity Netz"],
    hinweis:
      "Der Großteil Niedersachsens gehört zur Regelzone von TenneT. Wegen des starken Wind- und Solarzubaus im Norden empfiehlt sich eine frühe Netzanschlussanfrage beim zuständigen Verteilnetzbetreiber.",
  },
  besonderheiten: [
    {
      titel: "Pflichtbeteiligung der Gemeinden",
      text: "Mit dem NWindPVBetG gehört Niedersachsen zu den Ländern mit einer gesetzlichen Zahlung an die Standortgemeinde. Für Eigentümer bedeutet das: Gemeinden profitieren planbar von einem Solarpark, was die Bereitschaft zur Bauleitplanung erhöhen kann.",
    },
    {
      titel: "Torfabbau- und Moorflächen",
      text: "Frühere Torfabbauflächen werden in Niedersachsen schon lange für Solarparks genutzt – der Solarpark Georgsdorf in der Grafschaft Bentheim war 2011 die größte Freiflächenanlage des Landes. Heute kommt die Kombination aus Solarpark und Wiedervernässung hinzu.",
    },
    {
      titel: "Regionale Schwerpunkte des Zubaus",
      text: "2025 entfiel laut KEAN rund ein Drittel des Photovoltaik-Zubaus auf den Landkreis Göttingen, die Region Hannover sowie die Landkreise Emsland, Rotenburg (Wümme) und Friesland.",
    },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung:
      "Große, zusammenhängende Flächen auf schwächeren Böden und ein starker Ausschreibungsmarkt stützen die Pacht; die geringere Einstrahlung, die Akzeptanzabgabe und die Flächenkonkurrenz durch Tierhaltung im Westen wirken dämpfend.",
  },
  faq: [
    {
      q: "Hat Niedersachsen die benachteiligten Gebiete für Solarparks geöffnet?",
      a: "Ja, 2021 per Landesverordnung, 2023 mit auf 500 MW pro Jahr erhöhtem Kontingent. Seit dem Solarpaket I sind benachteiligte Gebiete bundesweit grundsätzlich zugelassen. Ob Ihre Fläche in der Kulisse liegt, lässt sich flurstückgenau prüfen.",
    },
    {
      q: "Was ist die Akzeptanzabgabe und wer zahlt sie?",
      a: "Der Betreiber eines neuen Solarparks ab 1 MW zahlt der Standortgemeinde 0,2 ct je eingespeister Kilowattstunde. Für Sie als Verpächter entsteht daraus keine Zahlungspflicht; Agri-PV und Moor-PV sind von der Abgabe ausgenommen.",
    },
    {
      q: "Meine Fläche liegt in einem Vorbehaltsgebiet Landwirtschaft – geht ein Solarpark?",
      a: "Möglich, aber begründungsbedürftig: Das LROP sieht vor, dass solche Gebiete nicht für konventionelle Solarparks genutzt werden sollen. Die Gemeinde kann abweichen, wenn gewichtige Gründe vorliegen. Agri-PV ist dort ausdrücklich vorgesehen.",
    },
    {
      q: "Eignet sich meine Moorfläche für Photovoltaik?",
      a: "Entwässerte, intensiv genutzte Moorböden können sich eignen, besonders wenn der Solarpark mit einer Wiedervernässung verbunden wird. Für Renaturierung vorgesehene Moorbereiche sind in der Regel ungeeignet. Moor-PV kann als besondere Solaranlage an der EEG-Ausschreibung teilnehmen.",
    },
    {
      q: "Wie viel Pacht zahlt ein Solarpark in Niedersachsen?",
      a: "Das hängt von Größe, Netzanschluss, Boden und Vermarktung ab. Die Einstrahlung ist etwas niedriger als in Süddeutschland, dafür gibt es oft größere zusammenhängende Flächen. Eine seriöse Einschätzung ist erst nach Prüfung der konkreten Fläche möglich.",
    },
    {
      q: "Wer entscheidet in Niedersachsen über einen Solarpark?",
      a: "Die Gemeinde bzw. Samtgemeinde über den Bebauungsplan. Der Landkreis prüft als Träger der Regionalplanung und Naturschutzbehörde; die Landwirtschaftskammer gibt eine agrarstrukturelle Stellungnahme ab.",
    },
  ],
  quellen: [
    { titel: "PVGIS v5.3, Joint Research Centre der EU (Walsrode / Aurich / Göttingen)", url: "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=52.85&lon=9.6&peakpower=1&loss=14&optimalangles=1&outputformat=json", stand: "09/2026" },
    { titel: "§ 3 Niedersächsisches Klimagesetz (voris)", url: "https://voris.wolterskluwer-online.de/browse/document/1ee6e79a-94e4-3a2e-ad72-52e87c6b76d3", stand: "09/2026" },
    { titel: "NWindPVBetG – Niedersächsisches Wind- und PV-Beteiligungsgesetz (umwelt-online)", url: "https://www.umwelt-online.de/regelwerk/cgi-bin/suchausgabe.cgi?pfad=%2Fenergie%2Flaender%2Fnds%2Fwindpvbetg24.htm&such=Gesetz", stand: "09/2026" },
    { titel: "KEAN – NWindPVBetG", url: "https://www.klimaschutz-niedersachsen.de/Gesetze/Nds-Beteiligungsgesetz_Wind-PV.php", stand: "09/2026" },
    { titel: "Arbeitshilfe „Planung von Freiflächen-Photovoltaikanlagen in Niedersachsen“ (NLT/ML, 10/2022)", url: "https://www.nlt.de/wp-content/uploads/2022/11/2022_10_24_Arbeitshilfe-Solarplanung.pdf", stand: "09/2026" },
    { titel: "Staatskanzlei Niedersachsen – Freiflächensolar-Verordnung 500 MW (08/2023)", url: "https://www.stk.niedersachsen.de/startseite/presseinformationen/mehr-flachen-fur-solaranlagen-landesregierung-andert-verordnung-vorschlag-der-taskforce-energiewende-fur-sehr-trockene-flachen-und-boden-geringer-gute-224740.html", stand: "09/2026" },
    { titel: "ML Niedersachsen – Von der Natur benachteiligte Gebiete in Niedersachsen und Bremen", url: "https://www.ml.niedersachsen.de/startseite/themen/landwirtschaft/agrarforderung/ausgleichszulage_agz/agz-131797.html", stand: "09/2026" },
    { titel: "Fachagentur Wind und Solar – Länderinformationen Niedersachsen (Stand 11/2024)", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/laenderinformationen/niedersachsen", stand: "09/2026" },
    { titel: "Fachagentur Wind und Solar – Analyse Ausschreibungen PV auf Freiflächen 2025", url: "https://www.fachagentur-wind-solar.de/fileadmin/Veroeffentlichungen/Solar/Daten/FA_Wind_Solar_HGP_Ausschreibungen_PV_auf_Freiflaechen_2025.pdf", stand: "09/2026" },
    { titel: "top agrar – Photovoltaikboom in Niedersachsen (KEAN-Auswertung MaStR, 02/2026)", url: "https://www.topagrar.com/energie/news/photovoltaikboom-in-niedersachsen-wachstum-in-richtung-freiflachen-20025668.html", stand: "09/2026" },
    { titel: "LSN – Ergebnisse der Agrarstrukturerhebung Niedersachsen 2023", url: "https://www.statistik.niedersachsen.de/landwirtschaft_forstwirtschaft_fischerei/landwirtschaft_in_niedersachsen/agrarstrukturerhebung_landwirtschaftliche_betriebe/ergebnisse-der-agrarstrukturerhebung-niedersachsen-2023-232819.html", stand: "09/2026" },
    { titel: "Wikipedia – Moorschutz (Anteil Niedersachsens an den Moorflächen)", url: "https://de.wikipedia.org/wiki/Moorschutz", stand: "09/2026" },
  ],
  unsicher: [
    "Anfang 2026 gab es offenbar eine Debatte über zusätzliche Steuerungsregeln für Freiflächen-PV (LEE-Pressemitteilung 18.02.2026 gegen 'neue Hürden'); konkrete Pläne der Landesregierung (Erlass/LROP-Änderung) konnten nicht verifiziert werden – vor Veröffentlichung prüfen.",
    "Fachagentur-Länderinfo nennt eine Regel 'Acker-/Grünlandzahl ab 50 grundsätzlich tabu, außer Agri-PV'; Rechtsgrundlage nicht verifiziert, daher nicht übernommen.",
    "Verfahrensfreiheit nach NBauO seit 07/2025 nur aus Fachagentur-Übersicht; genaue Voraussetzungen (Anhang Ziff. 2.3) nicht geprüft.",
    "Ob Niedersachsen nach dem Solarpaket I eine Beschränkungsverordnung nach § 37c Abs. 2 EEG erlassen hat, wurde nicht gefunden; Status der NFSVO seit 05/2024 nicht amtlich geprüft.",
    "Amprion als ÜNB für Teile West-Niedersachsens und die VNB-Liste nach allgemeiner Kenntnis, nicht mit Quelle belegt; ohne belastbare Engpassdaten nur allgemeiner Netzhinweis.",
    "Anteil von 38 % an den deutschen Moorflächen nur aus Wikipedia belegt.",
    "Schwelle '< 5 MW ausgenommen vom Beteiligungsangebot' (KEAN-Seite) nicht im Gesetzestext bestätigt, daher weggelassen.",
    "Börden-Beschreibung (Hannover–Hildesheim–Braunschweig) nach allgemeiner Landeskunde; Wikipedia belegt nur 'Lössbördenzone im mittleren Osten und Südosten'.",
  ],
};

export default region;
