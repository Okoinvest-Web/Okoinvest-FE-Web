// Recherche: 29.09.2026 – RIS Landesrecht Vorarlberg: Raumplanungsgesetz (§§ 9, 10, 18; LGBl. Nr. 21/2025),
// Elektrizitätswirtschaftsgesetz (§§ 5, 19b), Gesetz über Naturschutz und Landschaftsentwicklung (§§ 24, 33, 56d, 56g),
// VO überörtliche Freiflächen Rheintal/Walgau, Studie PV-Freiflächenpotenzial Tirol 2022 (Länderüberblick), RIS (§ 33 EAG),
// Statistik Austria (Agrarstrukturerhebung 2023, Bevölkerung 01.01.2026), BEV/WKO (Fläche 01.01.2025), PVGIS v5.3
import { fristenAT } from "./fristen";

const region = {
  slug: "vorarlberg",
  land: "AT",
  name: "Vorarlberg",
  inName: "in Vorarlberg",
  kurz: "V",
  seoTitel: "Solarpark & Agri-PV Vorarlberg: Pacht, Recht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht in Vorarlberg: Freiflächen-PV nur als Sondergebiet, Landesgrünzone Rheintal/Walgau, Bewilligung über 500 kWp, Beschleunigungsgebiete.",
  lead:
    "Vorarlberg hat wenig freien Talboden und schützt ihn mit Landesgrünzonen. Freiflächen-PV ist deshalb die Ausnahme – mit Chancen auf vorbelasteten Flächen und an Infrastruktur.",
  akzent: "mit Grünzone und Grenzen.",
  ertrag: {
    kwhProKwp: 1130,
    ort: "im Rheintal bei Hohenems",
    spanne: "rund 1.130 kWh/kWp im Rheintal bis 1.200 kWh/kWp im Walgau",
    hinweis:
      "Nach PVGIS liegt der Walgau beim Ertrag etwas über dem Rheintal. In Seitentälern wie Montafon oder Bregenzerwald hängt der Ertrag stark von der Horizontabschattung ab.",
  },
  eckdaten: {
    hauptstadt: "Bregenz",
    flaecheKm2: 2602,
    lfHa: 69902,
    lfJahr: 2023,
    einwohner: 412307,
    quelle: {
      titel: "Statistik Austria – Land- und forstwirtschaftliche Betriebe nach Flächennutzung 2023 nach Bundesland",
      url: "https://www.statistik.at/fileadmin/pages/155/LuFBetriebeNachFlaechennutzung2023nBL.ods",
    },
  },
  einleitung: [
    "Vorarlberg ist nach Wien das kleinste Bundesland, aber dicht besiedelt: Auf rund 2.600 km² leben gut 412.000 Menschen, der Dauersiedlungsraum umfasst nur etwa 22 Prozent der Landesfläche. Die landwirtschaftlich genutzte Fläche liegt bei rund 70.000 Hektar, überwiegend Grünland und Alpen. Ebene Flächen konzentrieren sich im Rheintal und im Walgau – genau dort, wo auch Siedlung, Industrie, Verkehr und Landwirtschaft um jeden Quadratmeter konkurrieren.",
    "Seit den 1970er-Jahren schützt das Land die verbliebenen Freiräume in den Talsohlen mit **überörtlichen Freiflächen**, der sogenannten Landesgrünzone im Rheintal und im Walgau. Die Landesregierung hatte in ihrem Arbeitsprogramm 2019–2024 zudem festgehalten, dass auf Grün- und Ackerflächen auch weiterhin keine PV-Anlagen errichtet werden sollen. **Klassische Solarparks auf landwirtschaftlichen Flächen sind in Vorarlberg daher praktisch nicht vorgesehen.**",
    "Das heißt nicht, dass Freiflächen-PV ausgeschlossen ist. Mit der Novelle LGBl. Nr. 21/2025 hat Vorarlberg im April 2025 Beschleunigungsgebiete, verkürzte Entscheidungsfristen und Verfahrenserleichterungen eingeführt, die ausdrücklich künstliche, versiegelte und vorbelastete Flächen bevorzugen. Für Eigentümer von Deponien, Abbauflächen, Lagerplätzen oder Flächen entlang von Autobahn und Bahn kann das interessant sein.",
  ],
  recht: [
    {
      titel: "Widmung als Sondergebiet in der Freifläche",
      text: "Das Vorarlberger Raumplanungsgesetz kennt keine eigene PV-Widmung. Nach § 18 Abs. 4 RPG können als Sondergebiete unter anderem Flächen für Anlagen zur Erzeugung von Energie aus erneuerbaren Quellen, Umspannwerke und Trafostationen gewidmet werden. Im Landwirtschaftsgebiet ist eine Bebauung dagegen nur zulässig, soweit sie für die bodenabhängige land- und forstwirtschaftliche Nutzung erforderlich ist.",
      quelle: { titel: "RIS – Raumplanungsgesetz Vorarlberg § 18", url: "https://www.ris.bka.gv.at/Dokumente/Landesnormen/LVB40043688/LVB40043688.html" },
    },
    {
      titel: "Landesgrünzone in Rheintal und Walgau",
      text: "Die Verordnungen über überörtliche Freiflächen in der Talsohle des Rheintales und des Walgaues sichern Flächen für einen funktionsfähigen Naturhaushalt, das Landschaftsbild, die Naherholung und eine leistungsfähige Landwirtschaft. In diesen Gebieten dürfen die Gemeinden nur Freiflächen, Verkehrsflächen oder Vorbehaltsflächen widmen. Dazu kommen überörtliche Freiflächen zum Hochwasserschutz im Rheintal.",
      quelle: { titel: "RIS – VO über überörtliche Freiflächen in der Talsohle des Rheintales § 2", url: "https://www.ris.bka.gv.at/Dokumente/Landesnormen/LVB40009150/LVB40009150.html" },
    },
    {
      titel: "Elektrizitätsrecht: Bewilligung über 500 kWp",
      text: "Nach § 5 Elektrizitätswirtschaftsgesetz sind Erzeugungsanlagen über 100 kW bewilligungspflichtig, für Photovoltaik gilt eine höhere Schwelle von mehr als 500 kWpeak. Bei Vorhaben der Energiewende muss die Behörde die Vollständigkeit des Antrags innerhalb von 30 Tagen bestätigen, außerhalb von Beschleunigungsgebieten innerhalb von 45 Tagen (§ 19b).",
      quelle: { titel: "RIS – Elektrizitätswirtschaftsgesetz Vorarlberg § 5", url: "https://www.ris.bka.gv.at/eli/lgbl/VO/2003/59/P5/LVB40044973" },
    },
    {
      titel: "Naturschutz: freie Landschaft und Uferschutz",
      text: "Nach § 33 des Gesetzes über Naturschutz und Landschaftsentwicklung sind in der freien Landschaft unter anderem Bauwerke mit mehr als 800 m² überbauter Fläche bewilligungspflichtig. Der Uferschutz nach § 24 umfasst am Bodensee einen 500 m breiten Uferstreifen, an anderen stehenden Gewässern 50 m und an Fließgewässern außerhalb bebauter Bereiche 20 m.",
      quelle: { titel: "RIS – Gesetz über Naturschutz und Landschaftsentwicklung § 24", url: "https://www.ris.bka.gv.at/eli/lgbl/VO/1997/22/P24/LVB40006432" },
    },
    {
      titel: "Beschleunigungsgebiete und kurze Fristen seit April 2025",
      text: "Seit 3. April 2025 kann die Landesregierung nach § 9 RPG in einem Landesraumplan Beschleunigungsgebiete für erneuerbare Energien ausweisen – vorrangig auf künstlichen, versiegelten oder vorbelasteten Flächen, ohne Schutzgebiete und Vogelzugrouten. Dort gelten naturschutzrechtliche Verfahrenserleichterungen (§ 56d). Für PV auf Bauwerken und künstlichen Strukturen gelten Entscheidungsfristen von drei Monaten, bis 100 kW von einem Monat mit Bewilligungsfiktion (§ 56g).",
      quelle: { titel: "RIS – Raumplanungsgesetz Vorarlberg § 9 (Beschleunigungsgebiete)", url: "https://www.ris.bka.gv.at/Dokumente/Landesnormen/LVB40045013/LVB40045013.html" },
    },
    {
      titel: "EAG-Abschlag 25 % auf Grünland",
      text: "Auf landwirtschaftlich genutzten Flächen und im Grünland sinkt der Zuschlagswert der EAG-Marktprämie um 25 % (§ 33 EAG). Ausgenommen sind unter anderem Deponien, Altlasten, Bergbau- und Infrastrukturstandorte sowie qualifizierte Agri-PV-Anlagen – das passt zur Vorarlberger Linie, Freiflächen-PV auf vorbelastete Flächen zu lenken.",
      quelle: { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790" },
    },
    ...fristenAT(),
  ],
  kulisse: {
    text: "Die Vorarlberger Kulisse für Freiflächen-PV ist sehr eng. In den Talsohlen von Rheintal und Walgau liegt ein großer Teil der ebenen Flächen in der Landesgrünzone, dazu kommen Hochwasser-Freiflächen, Riedflächen und Schutzgebiete. Außerhalb der Täler sind Hanglagen, Wald und Alpen prägend. Realistisch sind vor allem Standorte mit Vorbelastung.",
    gut: [
      "Deponien, Abbau- und Lagerflächen außerhalb der Grünzone",
      "Flächen entlang von Autobahn, Schnellstraße und Bahn",
      "künstliche Strukturen, Parkplätze und Gewerbeflächen",
      "künftige Beschleunigungsgebiete nach § 9 RPG",
    ],
    schwierig: [
      "überörtliche Freiflächen (Landesgrünzone) in Rheintal und Walgau",
      "überörtliche Freiflächen zum Hochwasserschutz im Rheintal",
      "500-m-Uferstreifen am Bodensee und Schutzstreifen an Gewässern",
      "Landwirtschaftsgebiet und Alpflächen",
      "Schutzgebiete, Riede und Wald",
    ],
  },
  ablauf: {
    text: "Ein Freiflächenprojekt in Vorarlberg beginnt mit der Frage, ob die Fläche in einer überörtlichen Freifläche liegt. Ist das nicht der Fall, kann die Gemeinde im Flächenwidmungsplan ein Sondergebiet für die Energieerzeugung widmen; das Land prüft als Aufsichtsbehörde. Parallel sind die naturschutzrechtliche Bewilligung, bei mehr als 500 kWp die elektrizitätsrechtliche Bewilligung und gegebenenfalls Wasser- und Forstrecht zu klären. In künftigen Beschleunigungsgebieten sollen verkürzte Fristen und eine vereinfachte naturschutzrechtliche Prüfung gelten.",
    behoerden: [
      { name: "Gemeinde (Gemeindevertretung)", rolle: "Flächenwidmungsplan, Widmung als Sondergebiet" },
      { name: "Vorarlberger Landesregierung", rolle: "Aufsicht über die Widmung, Landesraumpläne (Landesgrünzone, Beschleunigungsgebiete)", url: "https://vorarlberg.at" },
      { name: "Bezirkshauptmannschaft", rolle: "Naturschutzverfahren nach dem Gesetz über Naturschutz und Landschaftsentwicklung" },
      { name: "Vorarlberger Energienetze", rolle: "Netzzugang und Anschlusspunkt" },
    ],
  },
  agri: [
    "Eine eigene Vorarlberger Regelung oder Förderung für Agri-PV war nicht zu finden. Rechtlich bleibt eine Agri-PV-Anlage eine Erzeugungsanlage, die eine passende Widmung braucht; im Landwirtschaftsgebiet sind nur Bauten für die bodenabhängige Landwirtschaft zulässig, und in der Landesgrünzone ist der Spielraum der Gemeinden begrenzt. Agri-PV ist damit in Vorarlberg kein Hebel, um die Grünzone zu umgehen.",
    "Wo eine Widmung möglich ist, kann Agri-PV dennoch Sinn ergeben: Bei qualifizierten Anlagen, die die landwirtschaftliche Hauptnutzung nicht oder nur gering beeinträchtigen, kann der 25-%-Abschlag der EAG-Marktprämie entfallen. In einem Grünlandland wie Vorarlberg kommen dafür vor allem Konzepte infrage, bei denen unter den Modulen weiter gemäht oder beweidet wird, etwa vertikale Modulreihen.",
  ],
  netz: {
    uenb: ["APG (Austrian Power Grid)"],
    vnb: ["Vorarlberger Energienetze"],
    hinweis:
      "Wie alle österreichischen Netzbetreiber veröffentlichen die Vorarlberger Energienetze ihre verfügbaren Einspeisekapazitäten je Umspannwerk quartalsweise auf ebutilities.at.",
    quelle: { titel: "EbUtilities – Verfügbare Netzanschlusskapazitäten", url: "https://www.ebutilities.at/verfuegbare-netzanschlusskapazitaeten" },
  },
  besonderheiten: [
    {
      titel: "Landesgrünzone seit 1977",
      text: "Die überörtlichen Freiflächen in der Talsohle des Rheintales wurden 1977 festgelegt, um Naturhaushalt, Landschaftsbild, Naherholung und eine leistungsfähige Landwirtschaft zu sichern. Sie sind seither ein zentrales Instrument der Vorarlberger Raumplanung und schränken großflächige Anlagen in den Tälern stark ein.",
    },
    {
      titel: "Bodensee und Uferschutz",
      text: "Am Bodensee gilt ein 500 m breiter Uferschutzstreifen außerhalb bebauter Bereiche, an anderen Seen 50 m und an Fließgewässern 20 m. Am Seeufer sind Freiflächenanlagen damit kaum denkbar.",
    },
    {
      titel: "Vorrang für Dächer und Infrastruktur",
      text: "Vorarlberg verkürzt seit 2025 vor allem Verfahren für PV auf Bauwerken und künstlichen Strukturen und setzt bei Beschleunigungsgebieten auf versiegelte und vorbelastete Flächen. Für Grundeigentümer mit solchen Flächen können sich dadurch schnellere Verfahren ergeben.",
    },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung:
      "Für Vorarlberg gibt es wegen der sehr wenigen Freiflächenprojekte keine belastbare regionale Tendenz. Maßgeblich sind im Einzelfall Widmungsfähigkeit, Vorbelastung und Netzanschluss.",
  },
  faq: [
    {
      q: "Kann ich in Vorarlberg eine landwirtschaftliche Fläche für einen Solarpark verpachten?",
      a: "Nur selten. In der Landesgrünzone von Rheintal und Walgau dürfen Gemeinden nur Freiflächen, Verkehrsflächen oder Vorbehaltsflächen widmen, und im Landwirtschaftsgebiet sind nur Bauten für die Landwirtschaft zulässig. Chancen haben vor allem vorbelastete Flächen außerhalb der Grünzone.",
    },
    {
      q: "Wie viel Pacht ist in Vorarlberg möglich?",
      a: "Eine regionale Tendenz lässt sich wegen der wenigen Projekte nicht seriös angeben. Entscheidend sind Widmungsfähigkeit, Größe, Vorbelastung und Netzanschluss; eine Orientierung gibt der Pachtrechner.",
    },
    {
      q: "Ab wann braucht eine PV-Anlage in Vorarlberg eine elektrizitätsrechtliche Bewilligung?",
      a: "Für Photovoltaik ab mehr als 500 kWpeak. Für andere Erzeugungsanlagen liegt die Schwelle bei 100 kW.",
    },
    {
      q: "Gibt es in Vorarlberg Beschleunigungsgebiete für Photovoltaik?",
      a: "Die gesetzliche Grundlage besteht seit April 2025: Die Landesregierung kann Beschleunigungsgebiete in einem Landesraumplan ausweisen, vorrangig auf künstlichen, versiegelten oder vorbelasteten Flächen. Ein solcher Landesraumplan war zum Recherchestand im Rechtsinformationssystem nicht auffindbar.",
    },
    {
      q: "Welche Naturschutzregeln gelten für PV-Freiflächen in Vorarlberg?",
      a: "In der freien Landschaft sind unter anderem Bauwerke mit mehr als 800 m² überbauter Fläche bewilligungspflichtig. Am Bodensee gilt ein 500 m breiter Uferschutzstreifen, an anderen Seen 50 m und an Fließgewässern 20 m außerhalb bebauter Bereiche.",
    },
  ],
  quellen: [
    { titel: "RIS – Raumplanungsgesetz Vorarlberg § 18 (Freiflächen, Sondergebiete)", url: "https://www.ris.bka.gv.at/Dokumente/Landesnormen/LVB40043688/LVB40043688.html", stand: "09/2026" },
    { titel: "RIS – Raumplanungsgesetz Vorarlberg § 9 (Beschleunigungsgebiete)", url: "https://www.ris.bka.gv.at/Dokumente/Landesnormen/LVB40045013/LVB40045013.html", stand: "09/2026" },
    { titel: "RIS – Verordnung über überörtliche Freiflächen in der Talsohle des Rheintales § 2", url: "https://www.ris.bka.gv.at/Dokumente/Landesnormen/LVB40009150/LVB40009150.html", stand: "09/2026" },
    { titel: "RIS – Elektrizitätswirtschaftsgesetz Vorarlberg § 5 (Bewilligungspflicht)", url: "https://www.ris.bka.gv.at/eli/lgbl/VO/2003/59/P5/LVB40044973", stand: "09/2026" },
    { titel: "RIS – Gesetz über Naturschutz und Landschaftsentwicklung § 33 (Bewilligungspflichtige Vorhaben)", url: "https://www.ris.bka.gv.at/eli/lgbl/VO/1997/22/P33/LVB40045079", stand: "09/2026" },
    { titel: "RIS – Gesetz über Naturschutz und Landschaftsentwicklung § 24 (Uferschutz)", url: "https://www.ris.bka.gv.at/eli/lgbl/VO/1997/22/P24/LVB40006432", stand: "09/2026" },
    { titel: "RIS – Gesetz über Naturschutz und Landschaftsentwicklung § 56g (Solar- und Photovoltaikanlagen)", url: "https://www.ris.bka.gv.at/eli/lgbl/VO/2025/21/P56g/LVB40044969", stand: "09/2026" },
    { titel: "Wasser Tirol – Photovoltaik-Freiflächenpotenzial in Tirol (2022), Länderüberblick inkl. Arbeitsprogramm Vorarlberg 2019–2024", url: "https://www.tirol.gv.at/fileadmin/themen/umwelt/wasser_wasserrecht/PV-FREIFLAECHEN-Bericht-fi.pdf", stand: "09/2026" },
    { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790", stand: "09/2026" },
    { titel: "Statistik Austria – Betriebe nach Flächennutzung 2023 nach Bundesland", url: "https://www.statistik.at/fileadmin/pages/155/LuFBetriebeNachFlaechennutzung2023nBL.ods", stand: "09/2026" },
    { titel: "WKO Statistik – Fläche und Benützungsarten (BEV/Statistik Austria, Stand 01.01.2025)", url: "https://www.wko.at/statistik/bundesland/flaecheben.pdf", stand: "09/2026" },
    { titel: "JRC PVGIS 5.3 – Ertragsberechnung (Rheintal, Walgau)", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/", stand: "09/2026" },
  ],
  unsicher: [
    "Websuche-Budget war bei Vorarlberg erschöpft; Recht daher nur aus RIS-Normtexten (per WebFetch) belegt, keine Landesleitfäden, keine Presse, keine Projektbeispiele.",
    "Ob in der Landesgrünzone ein Sondergebiet für Energieerzeugung als Unterkategorie der Freifläche widmungsfähig ist, bleibt offen (VO-Text von 1999 verweist auf alte RPG-Paragraphen) – im Text nur die Aufzählung Freiflächen/Verkehrsflächen/Vorbehaltsflächen wiedergegeben.",
    "Ob eine PV-Freiflächenanlage als „Bauwerk“ im Sinne § 33 GNL (über 800 m²) gilt, nicht belegt – im Text neutral als Tatbestand zitiert, keine Aussage zur Anwendung.",
    "Kein Landesraumplan mit konkreten Beschleunigungsgebieten im RIS gefunden (Suche „Beschleunigungsgebiet*“, Stand 29.09.2026) – Aussage beruht auf negativer Suche.",
    "Arbeitsprogramm 2019–2024 zitiert aus Tiroler Potenzialstudie; Haltung der aktuellen Landesregierung (ab 2024) nicht geprüft.",
    "Zuständige Behörde für elektrizitätsrechtliche Bewilligung in Vorarlberg nicht geprüft – im Ablauf nicht benannt. Rolle des Landes als Aufsichtsbehörde über Flächenwidmungspläne aus allgemeiner Rechtslage, nicht einzeln belegt.",
    "PVGIS-Punkte: Rheintal 47,38/9,67 (1.128), Walgau 47,19/9,75 (1.202).",
  ],
};

export default region;
