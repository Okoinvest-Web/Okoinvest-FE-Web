// Recherche: 29.09.2026 – saarland.de (MWIDE): Photovoltaik auf Agrarflächen / VOEPV, Fakten Photovoltaik (MaStR bis 03/2026),
// AG Netze; VOEPV-Text (umwelt-online), pv magazine 15.05.2024 (Saarländisches Solarpaket), Amprion Netzerweiterung Saarland,
// § 37c EEG, Statistikportal (LF 2025, Bevölkerung), PVGIS v5.3.
const region = {
  slug: "saarland",
  land: "DE",
  name: "Saarland",
  inName: "im Saarland",
  kurz: "SL",
  seoTitel: "Solarpark & Agri-PV Saarland: Pacht, Recht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht im Saarland: VOEPV-Kulisse, benachteiligte Gebiete nach Solarpaket I, Landesplanung und Netzanschluss – Freiflächen-PV kompakt erklärt.",
  lead:
    "Das Saarland hat pro Quadratkilometer so viel Photovoltaik installiert wie kaum ein anderes Land. Für Freiflächen gibt es eine vorab geprüfte Angebotskulisse, doch Netzkapazität und Landesplanung setzen die Grenzen.",
  akzent: "mit geprüfter Angebotskulisse.",
  ertrag: {
    kwhProKwp: 1080,
    ort: "bei Saarlouis",
    spanne: "rund 1.070 bis 1.080 kWh/kWp",
    hinweis:
      "Weiterer PVGIS-Punkt: nördliches Saarland bei St. Wendel rund 1.070 kWh/kWp (optimal geneigte, fest aufgeständerte Module, 14 % Systemverluste).",
  },
  eckdaten: {
    hauptstadt: "Saarbrücken",
    flaecheKm2: 2572,
    lfHa: 71600,
    lfJahr: 2025,
    einwohner: 1007342,
    quelle: {
      titel: "Statistische Ämter des Bundes und der Länder – Statistikportal (Fläche/Bevölkerung, Bodennutzungshaupterhebung 2025)",
      url: "https://www.statistikportal.de/de/land-und-forstwirtschaft/betriebe-flaeche-viehhaltung-und-arbeitskraefte",
    },
  },
  einleitung: [
    "Das Saarland ist klein, aber bei der Photovoltaik weit vorne. Nach der Auswertung des Energieministeriums waren bis Ende März 2026 rund **1.222 MW** PV-Leistung installiert, das entspricht **465,9 kW pro Quadratkilometer** und liegt deutlich über dem Bundesschnitt von 327,7 kW/km². Rund 485 MW davon entfallen auf Freiflächenanlagen, also fast 40 Prozent. Die meiste Freiflächenleistung steht in den Landkreisen St. Wendel und Merzig-Wadern, gefolgt vom Landkreis Saarlouis.",
    "Grundlage dafür war eine früh und sorgfältig vorbereitete Flächenöffnung: Ende 2018 hat das Land mit der Verordnung zur Errichtung von PV auf Agrarflächen (VOEPV) benachteiligte Gebiete für Solarparks freigegeben, allerdings nicht pauschal, sondern über eine an einem runden Tisch abgestimmte **Angebotskulisse**. Seit dem Solarpaket I sind benachteiligte Gebiete bundesweit förderfähig. Für Eigentümer im Saarland bleibt die alte Kulisse trotzdem ein wichtiger Hinweis darauf, welche Flächen aus Sicht von Landesplanung und Naturschutz als geeignet gelten.",
  ],
  recht: [
    {
      titel: "VOEPV: Angebotskulisse seit 2018, bis Ende 2025 befristet",
      text: "Mit der VOEPV (Dezember 2018) hat das Saarland benachteiligte Gebiete für EEG-Ausschreibungen geöffnet, zunächst mit einem Volumen von 100 MWp, nach einer Änderung um weitere 250 MWp auf insgesamt **350 MWp**. Von ursprünglich rund 57.000 ha benachteiligter Gebiete blieb nach Abzug von Ausschlussflächen etwa ein Siebtel in der Kulisse. Die Verordnung trat mit Ablauf des Jahres 2025 außer Kraft; Gebote, die bis zum 31. Dezember 2025 bei der Bundesnetzagentur eingegangen sind, bleiben berücksichtigungsfähig.",
      quelle: {
        titel: "saarland.de (MWIDE) – Photovoltaik auf Agrarflächen",
        url: "https://www.saarland.de/mwide/DE/portale/energie/energiewende/photovoltaik_ordner/photovoltaik_agrarflaechen",
      },
    },
    {
      titel: "Seit Solarpaket I: benachteiligte Gebiete grundsätzlich förderfähig",
      text: "Seit dem 16. Mai 2024 gilt das Opt-out-Modell: Benachteiligte Acker- und Grünlandflächen sind bundesweit EEG-fähig, solange ein Land sie nicht per Verordnung ausschließt. Das ist nach § 37c EEG erst zulässig, wenn mehr als 1 Prozent der landwirtschaftlich genutzten Fläche mit Freiflächenanlagen belegt ist (ab 2031: 1,5 Prozent), oder für Landschaftsschutzgebiete und Naturparke. Das Ministerium hat mitgeteilt, eine Anpassung bzw. Neuregelung zu prüfen, und verweist bis dahin auf das Bundesrecht.",
      quelle: {
        titel: "§ 37c EEG 2023 (gesetze-im-internet.de)",
        url: "https://www.gesetze-im-internet.de/eeg_2014/__37c.html",
      },
    },
    {
      titel: "Was die VOEPV-Kulisse ausgeschlossen hat",
      text: "Ausgeschlossen wurden unter anderem Naturschutz-, FFH- und Vogelschutzgebiete, Landschaftsschutzgebiete, Wald, Kern- und Pflegezonen des Biosphärenreservats Bliesgau, Kerngebiete des Naturschutzgroßprojekts „Landschaft der Industriekultur Nord“ sowie im Landesentwicklungsplan festgelegte Vorranggebiete, darunter für Landwirtschaft, Freiraumschutz, Naturschutz, Grundwasserschutz und Hochwasserschutz. Das Land betont, dass die Flächen der Kulisse weiterhin als landesplanerisch und naturschutzrechtlich geprüft geeignet gelten.",
      quelle: {
        titel: "saarland.de (MWIDE) – FAQ zur Flächenkulisse der VOEPV",
        url: "https://www.saarland.de/mwide/DE/portale/energie/energiewende/photovoltaik_ordner/photovoltaik_agrarflaechen",
      },
    },
    {
      titel: "Saarländisches Solarpaket 2024",
      text: "Im Mai 2024 hat die Landesregierung ein Solarpaket angekündigt. Für Freiflächen sind darin unter anderem vorgesehen: Agri-PV auch in Vorranggebieten für Landwirtschaft, schnellere Verfahren für Anlagen an Autobahnen und Bahnstrecken, eine Beteiligung der Kommunen an Erträgen aus Solarparks sowie rund 25 ha ehemalige Bergbauflächen in Zusammenarbeit mit der RAG. Welche Punkte inzwischen in Kraft sind, sollte im Einzelfall geprüft werden.",
      quelle: {
        titel: "pv magazine – Saarland plant umfassendes Solarpaket (15.05.2024)",
        url: "https://www.pv-magazine.de/2024/05/15/saarland-plant-umfassendes-solarpaket/",
      },
    },
  ],
  kulisse: {
    text: "Im Saarland lässt sich die Eignung einer Fläche gut vorprüfen: Die VOEPV-Angebotskulisse ist im Geoportal des Landes einsehbar und bildet ab, wo Landwirtschaft, Natur- und Landschaftsschutz, Denkmalschutz und Trinkwasserschutz bereits abgewogen wurden. Flächen außerhalb dieser Kulisse, aber in einem benachteiligten Gebiet, sind nach Solarpaket I zwar EEG-fähig, müssen aber im Bebauungsplan und gegenüber der Landesplanung stärker begründet werden. Die genaue Eignung prüft in jedem Fall die Gemeinde im Bauleitplanverfahren.",
    gut: [
      "Acker und Grünland innerhalb der früheren VOEPV-Angebotskulisse",
      "Privilegierte Streifen entlang von Autobahnen und zweigleisigen Bahnstrecken",
      "Konversions- und Bergbaufolgeflächen",
      "Standorte nahe Umspannanlagen mit freier Kapazität (Datenbereitstellung der Netzbetreiber im Geoportal)",
    ],
    schwierig: [
      "Vorranggebiete des Landesentwicklungsplans, etwa für Landwirtschaft, Freiraumschutz oder Grundwasserschutz",
      "Landschaftsschutzgebiete, Wald, Natura-2000- und Naturschutzgebiete",
      "Kern- und Pflegezonen des Biosphärenreservats Bliesgau",
      "Flächen mit seltenen Ackerwildkrautgesellschaften oder geschützten Biotopen",
      "Standorte in Netzgebieten, die an ihre Aufnahmegrenze stoßen",
    ],
  },
  ablauf: {
    text: "Auch im Saarland braucht ein Solarpark außerhalb der privilegierten Korridore einen Bebauungsplan der Gemeinde, in der Regel mit paralleler Änderung des Flächennutzungsplans. Maßstab für die Raumordnung ist der Landesentwicklungsplan; liegt eine Fläche in einem seiner Vorranggebiete, ist ein Zielabweichungsverfahren nötig, wie es die VOEPV-Kulisse in Einzelfällen bereits berücksichtigt hat. Die Baugenehmigung erteilt die untere Bauaufsichtsbehörde. Fragen zur Förderkulisse beantwortet das Referat Grundsatzfragen der Energiepolitik im Energieministerium.",
    behoerden: [
      { name: "Gemeinde / Stadt", rolle: "Flächennutzungsplan, Bebauungsplan, Prüfung der konkreten Flächeneignung" },
      { name: "Landesplanungsbehörde des Saarlandes", rolle: "Vereinbarkeit mit dem Landesentwicklungsplan, ggf. Zielabweichungsverfahren" },
      { name: "Ministerium für Wirtschaft, Innovation, Digitales und Energie (MWIDE)", rolle: "Energiepolitik, VOEPV-Kulisse, AG Netze", url: "https://www.saarland.de/mwide/DE/portale/energie/energiewende/photovoltaik_ordner/photovoltaik_agrarflaechen" },
      { name: "Untere Bauaufsicht (Landkreis / Regionalverband Saarbrücken)", rolle: "Baugenehmigung, Beteiligung der Fachbehörden" },
    ],
  },
  agri: [
    "Weil Vorranggebiete für Landwirtschaft des Landesentwicklungsplans aus der VOEPV-Kulisse herausgefallen sind, ist Agri-PV im Saarland vor allem für Flächen interessant, auf denen ein klassischer Solarpark raumordnerisch nicht passt. Die Landesregierung hat im Solarpaket 2024 angekündigt, Agri-PV-Anlagen auch in Vorranggebieten für Landwirtschaft zu ermöglichen und damit an die EEG-Regeln für besondere Solaranlagen anzuknüpfen.",
    "Für Betriebe mit Grünland und Weidehaltung kommen neben hoch aufgeständerten auch vertikale Anlagen in Frage, die eine Beweidung zwischen den Modulreihen erlauben. Technische Anforderungen ergeben sich aus DIN SPEC 91434 (Ackerbau) und DIN SPEC 91492 (Weide). Wie der Landesentwicklungsplan Agri-PV im Einzelfall behandelt, sollte vor einer Pachtvereinbarung mit Gemeinde und Landesplanung abgestimmt werden.",
  ],
  netz: {
    uenb: ["Amprion"],
    vnb: ["VSE Verteilnetz", "energis-Netzgesellschaft", "Stadtwerke Saarbrücken Netz", "Pfalzwerke Netz", "weitere Stadt- und Gemeindewerke"],
    hinweis:
      "Nach Angaben des Energieministeriums stoßen die Verteilnetze im Saarland zunehmend an ihre Aufnahmegrenzen. In der AG Netze haben Land, Übertragungs- und Verteilnetzbetreiber im November 2024 eine gemeinsame Interessenbekundung unterzeichnet; die Kapazitäten der Umspannanlagen werden im Geoportal bereitgestellt.",
    quelle: {
      titel: "saarland.de (MWIDE) – AG Netze",
      url: "https://www.saarland.de/mwide/DE/portale/energie/energiewende/ag_netze_netzbetreiber",
    },
  },
  besonderheiten: [
    {
      titel: "PV-Dichte an der Spitze",
      text: "Mit 465,9 kW je Quadratkilometer liegt das Saarland unter den Bundesländern mit an der Spitze. Das zeigt die Akzeptanz, heißt aber auch: In manchen Gemeinden und Netzgebieten ist bereits viel Leistung angeschlossen.",
    },
    {
      titel: "Bergbau- und Industriefolgeflächen",
      text: "Das Erbe von Kohle und Stahl bietet Konversionsflächen, die für Solarparks in Frage kommen. Im Solarpaket 2024 hat das Land angekündigt, rund 25 ha ehemalige Bergbauflächen gemeinsam mit der RAG für Solarnutzung bereitzustellen.",
    },
    {
      titel: "Biosphärenreservat Bliesgau",
      text: "Im Südosten des Landes liegt das Biosphärenreservat Bliesgau. Seine Kern- und Pflegezonen waren aus der VOEPV-Kulisse ausgenommen; in der Entwicklungszone ist im Einzelfall zu prüfen.",
    },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung:
      "Die Einstrahlung ist solide, die Flächen sind aber kleinräumig, und begrenzte Netzkapazität kann Projekte verzögern. Innerhalb der geprüften Kulisse und mit gesichertem Netzanschluss ist die Nachfrage gut.",
  },
  faq: [
    {
      q: "Wie viel Pacht bringt ein Solarpark im Saarland?",
      a: "Das hängt vor allem von Netzanschluss, Flächengröße und Lage zur früheren VOEPV-Kulisse ab. Flächen mit vorab geprüfter Eignung und Anschluss in der Nähe sind für Projektentwickler am interessantesten. Vereinbaren Sie einen festen Mindestbetrag pro Hektar und Jahr.",
    },
    {
      q: "Hat das Saarland die benachteiligten Gebiete geöffnet?",
      a: "Ja, Ende 2018 mit der VOEPV, allerdings nur für eine abgestimmte Angebotskulisse von rund einem Siebtel der benachteiligten Gebiete. Seit dem Solarpaket I sind benachteiligte Gebiete bundesweit grundsätzlich förderfähig; die VOEPV ist Ende 2025 ausgelaufen.",
    },
    {
      q: "Wo sehe ich, ob meine Fläche in der VOEPV-Kulisse liegt?",
      a: "Das Land stellt die Flächen der Verordnung im Geoportal Saarland dar. Die Kulisse ist eine Angebotskulisse; die endgültige Eignung prüft die Gemeinde im Bebauungsplanverfahren.",
    },
    {
      q: "Brauche ich im Saarland einen Bebauungsplan für einen Solarpark?",
      a: "In der Regel ja. Ausnahmen gelten für die bundesrechtlich privilegierten Streifen an Autobahnen und zweigleisigen Bahnstrecken sowie für kleine, betriebsbezogene Agri-PV-Anlagen.",
    },
    {
      q: "Gibt es im Saarland Probleme mit dem Netzanschluss?",
      a: "Das Energieministerium weist darauf hin, dass die Verteilnetze zunehmend an ihre Grenzen stoßen. Klären Sie deshalb vor einer Zusage, bei welchem Netzbetreiber und welcher Umspannanlage Kapazität verfügbar ist.",
    },
    {
      q: "Ist Agri-PV im Saarland möglich?",
      a: "Ja. Die Landesregierung hat 2024 angekündigt, Agri-PV auch in Vorranggebieten für Landwirtschaft zu ermöglichen. Wie das im Landesentwicklungsplan umgesetzt ist, sollte vor Vertragsabschluss mit der Landesplanung geklärt werden.",
    },
  ],
  quellen: [
    { titel: "saarland.de (MWIDE) – Photovoltaik auf Agrarflächen / VOEPV", url: "https://www.saarland.de/mwide/DE/portale/energie/energiewende/photovoltaik_ordner/photovoltaik_agrarflaechen", stand: "09/2026" },
    { titel: "saarland.de (MWIDE) – Fakten zum Stand der erneuerbaren Energien: Photovoltaik", url: "https://www.saarland.de/mwide/DE/portale/energie/energiewende/fakten_erneuerbare_energien/_documents/dos02_photovoltaik", stand: "09/2026" },
    { titel: "saarland.de (MWIDE) – AG Netze", url: "https://www.saarland.de/mwide/DE/portale/energie/energiewende/ag_netze_netzbetreiber", stand: "09/2026" },
    { titel: "umwelt-online – VOEPV Saarland (Verordnungstext)", url: "https://www.umwelt-online.de/recht/energie/laender/srl/voepv18.htm", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – SL VOEPV", url: "https://www.clearingstelle-eeg-kwkg.de/gesetz/4671", stand: "09/2026" },
    { titel: "pv magazine – Saarland plant umfassendes Solarpaket (15.05.2024)", url: "https://www.pv-magazine.de/2024/05/15/saarland-plant-umfassendes-solarpaket/", stand: "09/2026" },
    { titel: "§ 37c EEG 2023 (gesetze-im-internet.de)", url: "https://www.gesetze-im-internet.de/eeg_2014/__37c.html", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – Häufige Rechtsfrage 169 (benachteiligte Gebiete)", url: "https://www.clearingstelle-eeg-kwkg.de/haeufige-rechtsfrage/169", stand: "09/2026" },
    { titel: "Amprion – Netzerweiterung Saarland", url: "https://www.amprion.net/Netzausbau/Aktuelle-Projekte/Netzerweiterung-Saarland/", stand: "09/2026" },
    { titel: "Statistikportal – Landwirtschaftlich genutzte Fläche / Fläche und Bevölkerung", url: "https://www.statistikportal.de/de/land-und-forstwirtschaft/betriebe-flaeche-viehhaltung-und-arbeitskraefte", stand: "09/2026" },
  ],
  unsicher: [
    "Ob das Saarland nach Solarpaket I eine Neuregelung/Opt-out-Verordnung erlassen hat, ist offen: Das MWIDE schreibt nur, es „prüft“ eine Änderung; keine Verordnung gefunden (Suchbudget erschöpft).",
    "Umsetzungsstand des Solarpakets 2024 (Agri-PV in LEP-Vorranggebieten Landwirtschaft, kommunale Ertragsbeteiligung, 25 ha RAG-Flächen) nicht geprüft – nur als Ankündigung formuliert.",
    "Größe der VOEPV-Kulisse: saarland.de nennt einmal 8.300 ha, an anderer Stelle 7.470 ha Acker-/Grünland – daher nur „etwa ein Siebtel“ von 57.000 ha.",
    "Dass es im Saarland keine eigene Regionalplanungsebene gibt und der LEP unmittelbar gilt, wurde nicht explizit belegt; Text verweist daher nur auf den LEP. Zuständiges Ministerium der Landesplanung nicht namentlich genannt.",
    "Freiflächen-Zuschläge 2025 je Land aus FA-Wind-und-Solar-Tabelle für das Saarland nicht eindeutig extrahierbar – weggelassen.",
    "Pfalzwerke Netz und Stadtwerke Saarbrücken Netz als VNB aus Partnerliste der AG Netze; Größenrangfolge nicht geprüft.",
    "Hinweis zu Grünland/Weide in Mittelgebirgslagen ist allgemein gehalten, keine Landesstatistik dazu geprüft.",
  ],
};

export default region;
