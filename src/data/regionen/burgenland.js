// Recherche: 29.09.2026 – RIS: Bgld. RPG 2019 §§ 22d, 22e, 22g (Fassung 29.09.2026), Bgld. Eignungszonenverordnung
// PV/Solar (LGBl. Nr. 60/2021 idF LGBl. Nr. 55/2026, Anlage 1 mit 95 Zonen), VO Bemessungsgrundlage Windkraft- und
// Photovoltaikabgabe (LGBl. Nr. 47/2023 idF 58/2026), Bgld. ElWG 2006 § 5; Land Burgenland FAQ Eignungszonen;
// energynewsmagazine (13.02.2026); Statistik Austria Agrarstrukturerhebung 2023; WKO Fläche 2025; RIS EAG § 33; PVGIS v5.3.
import { fristenAT } from "./fristen";

const region = {
  slug: "burgenland",
  land: "AT",
  name: "Burgenland",
  inName: "im Burgenland",
  kurz: "B",
  seoTitel: "Solarpark & Agri-PV Burgenland: Pacht, Recht | ÖkoInvest",
  beschreibung:
    "Solarpark Pacht Burgenland: Freiflächen-PV nur in Eignungszonen, 19 Beschleunigungsgebiete, Photovoltaikabgabe, Agri-PV-Auflagen und Netz Burgenland.",
  lead: "Im Burgenland sind Freiflächenanlagen jenseits kleiner Hausanlagen nur in Eignungszonen zulässig, die das Land per Verordnung festlegt – derzeit 95 Zonen, 19 davon gelten zusätzlich als Beschleunigungsgebiete.",
  akzent: "nur in der Eignungszone.",
  ertrag: {
    kwhProKwp: 1210,
    ort: "auf der Parndorfer Platte",
    spanne: "rund 1.210 kWh/kWp im Nord- und im Südburgenland",
    hinweis: "Zweiter PVGIS-Punkt bei Oberwart; die Werte im Norden und Süden des Landes liegen nahezu gleichauf.",
  },
  eckdaten: {
    hauptstadt: "Eisenstadt",
    flaecheKm2: 3965,
    lfHa: 177285,
    lfJahr: 2023,
    quelle: {
      titel: "Statistik Austria – Agrarstrukturerhebung 2023 (Pressemitteilung 26.06.2025); Fläche: WKO/Statistik Austria, Stand 01.01.2025",
      url: "https://www.statistik.at/fileadmin/announcement/2025/06/20250626AS2023.pdf",
    },
  },
  einleitung: [
    "Das Burgenland steuert Freiflächen-PV strenger über die Landesebene als jedes andere Bundesland. Nach § 22d des Burgenländischen Raumplanungsgesetzes 2019 (Bgld. RPG 2019) sind Photovoltaikanlagen vorrangig auf Dächern oder gebäudeintegriert zu errichten. Ohne Eignungszone sind auf Freiflächen nur kleine Anlagen für den Eigenbedarf eines Gebäudes zulässig – bis 35 m² Modulfläche, auf Betriebs- und Industriegebieten bis 200 m². Alles darüber ist nur in **Eignungszonen** möglich, die die Landesregierung per Verordnung festlegt.",
    "Diese Zonen stehen in der Burgenländischen Eignungszonenverordnung für Photovoltaik- und Solar-Freiflächenanlagen. Seit ihrer Erlassung 2021 wurde sie mehrfach erweitert; in der Fassung LGBl. Nr. 55/2026 (seit 11.07.2026) umfasst Anlage 1 **95 Eignungszonen** in Gemeinden vom Seewinkel über die Parndorfer Platte bis ins Südburgenland. Jede Zone hat eigene Auflagen, etwa zu Biodiversität, Wildkorridoren oder Landschaftsbild.",
    "Mit rund 177.000 ha landwirtschaftlich genutzter Fläche (Agrarstrukturerhebung 2023) ist das Burgenland zugleich ein Land des Acker- und Weinbaus. Dazu kommen die Windparks im Norden – das Raumplanungsgesetz nennt die kombinierte Netznutzung mit Windkraft ausdrücklich als Kriterium für eine „qualifizierte Nutzung“ von PV-Flächen.",
  ],
  recht: [
    {
      titel: "Freiflächen-PV nur in Eignungszonen",
      text: "Anlagen, die die Grenzen von 35 m² (bzw. 200 m² auf Betriebs- und Industriegebieten) übersteigen, sind nur in Eignungszonen zulässig. Bei der Festlegung berücksichtigt das Land Ausschluss- und Konfliktkriterien, meteorologische Gegebenheiten und die Netzeinspeisung. Bevorzugt werden Konzepte mit „qualifizierter Nutzung“: Betrieb durch eine Bürger- oder Erneuerbare-Energie-Gemeinschaft, Bürgerbeteiligung, weiterlaufende Landwirtschaft, kombinierte Netznutzung mit Windkraft, Speicher oder Direktleitung zu Betrieben im Burgenland (§ 22d Abs. 3 Bgld. RPG 2019).",
      quelle: { titel: "RIS – Bgld. RPG 2019 § 22d", url: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=LrBgld&Gesetzesnummer=20001224&Paragraf=22d" },
    },
    {
      titel: "Widmung zusätzlich unter 10 ha",
      text: "Die Eignungszone wird im Flächenwidmungsplan ersichtlich gemacht. Anlagen mit mehr als 10 ha Flächeninanspruchnahme dürfen nur bewilligt werden, wenn sie der Verordnung nicht widersprechen. Anlagen unter 10 ha brauchen innerhalb der Zone zusätzlich eine Widmung als Grünfläche mit gesonderter Ausweisung für Photovoltaik (§ 40 Abs. 2 Bgld. RPG 2019). Das Land zoniert nach eigenen Angaben nur fachlich geeignete Flächen mit grundsätzlich mindestens 10 ha; einen Rechtsanspruch auf eine Zone gibt es nicht.",
      quelle: { titel: "Land Burgenland – Häufig gestellte Fragen Eignungszonen PV-Freiflächenanlagen", url: "https://www.burgenland.at/verwaltung/landesverwaltung-im-ueberblick/gruppe-3/abteilung-2-landesplanung-gemeinden-und-wirtschaft/hauptreferat-landesplanung/referat-ueberoertliche-raumplanung/haeufig-gestellte-fragen-eignungszonen-pv-freiflaechenanlagen-1/" },
    },
    {
      titel: "19 Eignungszonen sind Beschleunigungsgebiete",
      text: "Mit der Novelle LGBl. Nr. 106/2025 hat das Land Beschleunigungsgebiete nach der EU-Richtlinie RED III in das Raumplanungsgesetz aufgenommen (§ 22g). Seit der Verordnungsänderung LGBl. Nr. 26/2026 (März 2026) gelten die Eignungszonen Nr. 5, 31 bis 34, 41, 64, 73, 76, 81, 82 und 85 bis 92 als Beschleunigungsgebiete – ohne Änderung der Zonengrenzen oder Auflagen.",
      quelle: { titel: "RIS – Bgld. Eignungszonenverordnung PV/Solar, § 3a", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=LrBgld&Gesetzesnummer=20001332" },
    },
    {
      titel: "Photovoltaikabgabe je Megawatt",
      text: "Als Ausgleich für die Belastung des Landschaftsbildes erhebt das Land eine jährliche **Photovoltaikabgabe**, bemessen nach der installierten Leistung (Euro je Megawatt), nicht nach der Fläche. Der Grundbetrag steht in der Verordnung über die Bemessungsgrundlage und wird marktpreisabhängig erhöht, für 2025 etwa um 36,61 %. Ein fester Anteil je Megawatt fließt der Standortgemeinde zu, der Rest dem Klima- und Sozialfonds des Landes. Abgabepflichtig ist der Inhaber der Genehmigung, also in der Regel der Betreiber – nicht der Verpächter.",
      quelle: { titel: "RIS – Bgld. RPG 2019 § 22e und VO Bemessungsgrundlage Windkraft- und Photovoltaikabgabe", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=LrBgld&Gesetzesnummer=20001418" },
    },
    {
      titel: "Elektrizitätsrecht: Genehmigung über 500 kWp",
      text: "Nach § 5 des Burgenländischen Elektrizitätswesengesetzes 2006 bedürfen Photovoltaikanlagen mit mehr als 500 kWpeak einer elektrizitätsrechtlichen Anlagengenehmigung, Energiespeicher ab mehr als 1 MWh Kapazität ebenso.",
      quelle: { titel: "RIS – Bgld. ElWG 2006 § 5", url: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=LrBgld&Gesetzesnummer=20000597&Paragraf=5" },
    },
    {
      titel: "EAG: 25 % Abschlag, Agri-PV kann ausgenommen sein",
      text: "Auf landwirtschaftlich genutzten Flächen und im Grünland verringert sich der Zuschlagswert der EAG-Marktprämie um 25 %. Agri-PV mit nicht oder nur gering beeinträchtigter Hauptnutzung kann ausgenommen sein – im Burgenland oft relevant, weil Zonen auf guten Böden ohnehin eine landwirtschaftliche Nutzung verlangen.",
      quelle: { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790" },
    },
    ...fristenAT(),
  ],
  kulisse: {
    text: "Die entscheidende Frage ist schlicht: Liegt die Fläche in einer der 95 Eignungszonen? Die Zonen sind in Plänen im Maßstab 1:15.000 festgelegt und im Flächenwidmungsplan der Gemeinde ersichtlich. Außerhalb davon ist eine Freiflächenanlage über Hausgartengröße nicht zulässig. Wer eine geeignete Fläche von mindestens 10 ha außerhalb der Zonen hat, kann Unterlagen bei der Landesplanung einreichen – ob sie in eine künftige Änderung der Verordnung aufgenommen wird, entscheidet das Land.",
    gut: [
      "Flächen innerhalb einer Eignungszone, besonders in den 19 Beschleunigungsgebieten",
      "Projekte mit Bürger- oder Energiegemeinschaftsbeteiligung",
      "Flächen nahe bestehender Windparks mit gemeinsamer Netznutzung",
      "Kombination mit Speicher oder Direktleitung zu einem burgenländischen Betrieb",
      "Agri-PV oder extensive Grünlandnutzung auf besseren Böden",
    ],
    schwierig: [
      "alle Flächen außerhalb der Eignungszonen",
      "Natura-2000-Gebiete, Nationalpark Neusiedler See – Seewinkel und Hauptvogelzugrouten",
      "Umfeld des Welterbes Fertő/Neusiedler See (Auflagen in einzelnen Zonen)",
      "HQ30- und HQ100-Zonen an Bächen",
      "Flächen unter 10 ha, die nicht an eine Zone anschließen",
    ],
  },
  ablauf: {
    text: "Ist die Fläche Teil einer Eignungszone, folgt bei Anlagen unter 10 ha die Widmung durch die Gemeinde, darüber genügt die Übereinstimmung mit der Verordnung. Anschließend sind die elektrizitätsrechtliche Genehmigung über 500 kWp, die naturschutzrechtlichen Prüfungen und gegebenenfalls Wasser- und Forstrecht einzuholen; dabei sind die zonenspezifischen Auflagen aus Anlage 1 umzusetzen. Parallel sollte früh die Netzanfrage bei Netz Burgenland laufen. Nach Inbetriebnahme wird jährlich die Photovoltaikabgabe fällig.",
    behoerden: [
      { name: "Amt der Burgenländischen Landesregierung, Abteilung 2 – Landesplanung", rolle: "Eignungszonen und Beschleunigungsgebiete, Einreichung neuer Zonenvorschläge", url: "https://www.burgenland.at/verwaltung/landesverwaltung-im-ueberblick/gruppe-3/abteilung-2-landesplanung-gemeinden-und-wirtschaft/hauptreferat-landesplanung/referat-ueberoertliche-raumplanung/haeufig-gestellte-fragen-eignungszonen-pv-freiflaechenanlagen-1/" },
      { name: "Gemeinde (Gemeinderat)", rolle: "Widmung Grünfläche mit gesonderter Ausweisung für Photovoltaik bei Anlagen unter 10 ha" },
      { name: "Burgenländische Landesregierung (Elektrizitätsrecht)", rolle: "Anlagengenehmigung über 500 kWp nach Bgld. ElWG 2006" },
      { name: "Bezirkshauptmannschaft / Naturschutzbehörde", rolle: "Naturschutz, ökologisches Monitoring nach Zonenauflagen" },
    ],
  },
  agri: [
    "Das Land sieht eine landwirtschaftliche Nebennutzung durch Agri-PV oder extensive Grünlandnutzung als erwünscht an und schreibt sie in Zonen mit hoher Bodenbonität verpflichtend vor. Die Auflagen in Anlage 1 der Verordnung unterscheiden sich je Zone: In manchen ist die Ackernutzung durch extensive Wiesen oder Blühflächen mit Mahd oder Beweidung zu ersetzen, in anderen ist die landwirtschaftliche Nutzung – etwa als ökologischer Landbau – weiterzuführen.",
    "Typische Vorgaben für das Anlagenlayout sind Arbeitsgänge von mindestens 3 m zwischen den Reihen und eine Modulunterkante von mindestens 0,8 m, damit die Flächen als Lebensraum für Wiesenbrüter erhalten bleiben. Neu versiegelte Flächen dürfen 0,5 % der Zonenfläche nicht überschreiten, auf Zäune soll grundsätzlich verzichtet werden, und über die gesamte Betriebsdauer ist ein ökologisches Monitoring mit jährlichem Bericht vorgesehen. Für Landwirte heißt das: Eine Weiterbewirtschaftung ist oft Teil des Konzepts – und sollte im Pachtvertrag geregelt werden.",
  ],
  netz: {
    uenb: ["APG (Austrian Power Grid)"],
    vnb: ["Netz Burgenland"],
    hinweis: "Das Raumplanungsgesetz verlangt, bei der Zonierung aktuelle und künftige Einspeisemöglichkeiten zu berücksichtigen, und bewertet die gemeinsame Netznutzung mit Windkraft sowie Speicher positiv.",
    quelle: { titel: "RIS – Bgld. RPG 2019 § 22d", url: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=LrBgld&Gesetzesnummer=20001224&Paragraf=22d" },
  },
  besonderheiten: [
    { titel: "Kombination mit Windkraft", text: "Im Nordburgenland stehen viele Windparks. Eine kombinierte Netznutzung von PV und Wind ist im Gesetz ausdrücklich als qualifizierte Nutzung genannt – Flächen im Umfeld bestehender Windparks können dadurch bei der Zonierung Vorteile haben." },
    { titel: "Neusiedler See und Vogelzug", text: "Seewinkel und Neusiedler See sind Nationalpark, Natura-2000-Gebiet und Welterbe. Für Zonen in der Nähe verlangt die Verordnung teils Abstimmungen mit ICOMOS, Wildkorridore oder Schutzabstände; Hauptvogelzugrouten sind von Beschleunigungsgebieten ausgeschlossen." },
    { titel: "Abgabe als Kostenfaktor", text: "Die jährliche Photovoltaikabgabe trifft den Betreiber und fließt in seine Kalkulation ein. Für Verpächter ist wichtig, dass sie im Pachtvertrag nicht auf den Grundeigentümer überwälzt wird." },
  ],
  pacht: {
    tendenz: "mitte",
    begruendung: "Innerhalb der Eignungszonen treffen gute Einstrahlung und große zusammenhängende Flächen auf zusätzliche Kosten durch Landesabgabe, Biodiversitätsauflagen und den EAG-Abschlag; außerhalb der Zonen ist keine Verpachtung für Freiflächen-PV möglich.",
  },
  faq: [
    { q: "Kann ich meine Fläche im Burgenland für einen Solarpark verpachten?", a: "Nur, wenn sie in einer der Eignungszonen der Burgenländischen Eignungszonenverordnung liegt oder künftig aufgenommen wird. Außerhalb der Zonen sind Freiflächenanlagen nur bis 35 m² Modulfläche für den Eigenbedarf eines Gebäudes zulässig." },
    { q: "Wie viele Eignungszonen für PV gibt es im Burgenland?", a: "In der Fassung LGBl. Nr. 55/2026 listet Anlage 1 der Verordnung 95 Eignungszonen. 19 davon gelten seit März 2026 zusätzlich als Beschleunigungsgebiete nach der EU-Richtlinie RED III." },
    { q: "Kann ich eine neue Eignungszone beantragen?", a: "Einen Rechtsanspruch gibt es nicht. Das Land zoniert nur fachlich geeignete Flächen mit grundsätzlich mindestens 10 ha; Unterlagen können bei der Landesplanung eingereicht werden." },
    { q: "Muss ich als Verpächter die Photovoltaikabgabe zahlen?", a: "Abgabepflichtig ist nach dem Raumplanungsgesetz der Inhaber der elektrizitätsrechtlichen Genehmigung bzw. der Baubewilligung, also in der Regel der Betreiber. Das sollte der Pachtvertrag klarstellen." },
    { q: "Ist Agri-PV im Burgenland Pflicht?", a: "In Eignungszonen mit hoher Bodenbonität schreibt das Land eine landwirtschaftliche Nebennutzung durch Agri-PV oder extensive Grünlandnutzung vor. In anderen Zonen gelten zonenspezifische Biodiversitätsauflagen." },
    { q: "Ab welcher Größe braucht ein Solarpark eine elektrizitätsrechtliche Genehmigung?", a: "Nach dem Burgenländischen Elektrizitätswesengesetz 2006 ab mehr als 500 kWpeak; Energiespeicher ab mehr als 1 MWh Kapazität." },
  ],
  quellen: [
    { titel: "RIS – Burgenländische Eignungszonenverordnung für Photovoltaik- und Solar-Freiflächenanlagen (LGBl. Nr. 60/2021 idF LGBl. Nr. 55/2026)", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=LrBgld&Gesetzesnummer=20001332", stand: "09/2026" },
    { titel: "RIS – Anlage 1 zur Bgld. EZVO PV/Solar (LGBl. Nr. 55/2026)", url: "https://www.ris.bka.gv.at/Dokumente/Landesnormen/LBG40029559/LGBl_55-2026_Anlage_1_sig.pdf", stand: "09/2026" },
    { titel: "RIS – Burgenländisches Raumplanungsgesetz 2019 § 22d (Photovoltaikanlagen)", url: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=LrBgld&Gesetzesnummer=20001224&Paragraf=22d", stand: "09/2026" },
    { titel: "RIS – Burgenländisches Raumplanungsgesetz 2019 § 22e (Windkraft- und Photovoltaikabgabe)", url: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=LrBgld&Gesetzesnummer=20001224&Paragraf=22e", stand: "09/2026" },
    { titel: "RIS – Burgenländisches Raumplanungsgesetz 2019 § 22g (Beschleunigungsgebiete)", url: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=LrBgld&Gesetzesnummer=20001224&Paragraf=22g", stand: "09/2026" },
    { titel: "RIS – Verordnung Bemessungsgrundlage Windkraft- und Photovoltaikabgabe (LGBl. Nr. 47/2023 idF LGBl. Nr. 58/2026)", url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=LrBgld&Gesetzesnummer=20001418", stand: "09/2026" },
    { titel: "RIS – Burgenländisches Elektrizitätswesengesetz 2006 § 5", url: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=LrBgld&Gesetzesnummer=20000597&Paragraf=5", stand: "09/2026" },
    { titel: "Land Burgenland – Häufig gestellte Fragen Eignungszonen PV-Freiflächenanlagen", url: "https://www.burgenland.at/verwaltung/landesverwaltung-im-ueberblick/gruppe-3/abteilung-2-landesplanung-gemeinden-und-wirtschaft/hauptreferat-landesplanung/referat-ueberoertliche-raumplanung/haeufig-gestellte-fragen-eignungszonen-pv-freiflaechenanlagen-1/", stand: "09/2026" },
    { titel: "Statistik Austria – Agrarstrukturerhebung 2023 (Pressemitteilung 26.06.2025)", url: "https://www.statistik.at/fileadmin/announcement/2025/06/20250626AS2023.pdf", stand: "09/2026" },
    { titel: "RIS – Erneuerbaren-Ausbau-Gesetz § 33", url: "https://www.ris.bka.gv.at/eli/bgbl/i/2021/150/P33/NOR40236790", stand: "09/2026" },
    { titel: "PVGIS 5.3 (JRC) – PVcalc, 47,99° N / 16,86° O und 47,29° N / 16,20° O", url: "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=47.99&lon=16.86&peakpower=1&loss=14&optimalangles=1&outputformat=json", stand: "09/2026" },
  ],
  unsicher: [
    "Abgabe: RIS weist sie je Megawatt aus (Grundbetrag laut VO 1.400 €/MW·a, Gemeindeanteil 700 €/MW·a); der Ratgeber spricht von „je ha“ – dort ggf. korrigieren. €-Beträge bewusst nicht in den Text übernommen.",
    "Gesamtfläche aller 95 Eignungszonen in ha nicht ermittelt.",
    "Naturschutzrechtliche Bewilligungsschwellen nach dem Bgld. NG 1990 nicht geprüft; nur allgemein erwähnt.",
    "Anteil Ackerland/Weinbau nicht beziffert (WKO-Tabelle nicht sauber lesbar).",
    "Ob das Burgenland als erstes Land PV-Beschleunigungsgebiete ausgewiesen hat, nicht belegt (Salzburg ebenfalls 2026) – weggelassen.",
    "Welche Bodenbonität konkret die Agri-PV-Pflicht auslöst, nicht gefunden (nur FAQ-Aussage „hohe Bodenbonitäten“).",
    "Netzengpässe bei Netz Burgenland nicht belegt.",
  ],
};

export default region;
