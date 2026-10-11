// Ratgeber: Dienstbarkeit und Grundbuch bei PV-Pacht – beschränkte persönliche Dienstbarkeit vs.
// Grunddienstbarkeit, Übertragbarkeit (§ 1092 Abs. 3 BGB n. F.), Rang, Kabeltrassen, Vormerkung,
// Kosten (GNotKG), Löschung, Bankeintrittsrecht, AT/CH.
// Recherchestand 29.09.2026 (BGB §§ 879, 880, 883, 1018, 1090–1092; GNotKG § 52, KV 14121/14143;
// ZVG §§ 52, 91; ABGB §§ 472, 481; ZGB Art. 730 ff., 779 ff.). Vertieft den Abschnitt
// „Dienstbarkeit, Rangrücktritt und Eintrittsrecht der Bank“ in pachtvertrag-solarpark.js.

import { PACHT, FREIFLAECHE, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
// GNotKG § 52 Abs. 2: Bei befristeten Nutzungsrechten zählt der auf die Dauer entfallende Wert,
// höchstens der Wert der ersten 20 Jahre.
const GNOTKG_HOECHSTJAHRE = 20;
// GNotKG, Kostenverzeichnis Nr. 14121: Eintragung einer Dienstbarkeit = 1,0-Gebühr (Tabelle B).
const GNOTKG_EINTRAGUNG_SATZ = 1.0;
// GNotKG, Kostenverzeichnis Nr. 14143: Löschung in Abteilung II = Festgebühr je Grundstück.
const GNOTKG_LOESCHUNG_EUR = 25;
// ZGB Art. 779l: Höchstdauer des Baurechts in der Schweiz (Jahre); Art. 779 Abs. 3: ab 30 Jahren selbständig und dauernd.
const CH_BAURECHT_MAX_JAHRE = 100;
const CH_BAURECHT_DAUERND_JAHRE = 30;

/* Beispiel: Geschäftswert der Dienstbarkeit für 10 ha */
const HA = 10;
const JAHRESWERT = PACHT.freiflaecheProHa.mittel * HA;
const GESCHAEFTSWERT = JAHRESWERT * Math.min(PACHT.laufzeit, GNOTKG_HOECHSTJAHRE);
const MWP = HA / FREIFLAECHE.haProMwp;

const artikel = {
  slug: "dienstbarkeit-grundbuch-pv-pacht",
  title: "Dienstbarkeit im Grundbuch bei PV-Pacht: Rang, Kosten, Löschung",
  seoTitle: "Dienstbarkeit Grundbuch bei PV-Pacht | ÖkoInvest",
  kurzTitel: "Dienstbarkeit & Grundbuch",
  description:
    "Dienstbarkeit im Grundbuch bei PV-Pacht: persönliche vs. Grunddienstbarkeit, Übertragbarkeit seit 2024, Rangrücktritt, Kabeltrassen, Notarkosten und Löschung.",
  excerpt:
    "Warum jede Solarpark-Finanzierung eine Dienstbarkeit verlangt, was sich 2024 bei der Übertragbarkeit geändert hat, wie Rangrücktritt und Eintrittsrecht der Bank funktionieren – und wie Sie als Eigentümer die Löschung nach dem Rückbau absichern.",
  hauptKeyword: "dienstbarkeit grundbuch pv pacht",
  keywords: [
    "Dienstbarkeit Solarpark Grundbuch",
    "beschränkte persönliche Dienstbarkeit Photovoltaik",
    "Grunddienstbarkeit Kabeltrasse",
    "Rangrücktritt Grundschuld Solarpark",
    "§ 1092 Abs. 3 BGB Solar",
    "Löschung Dienstbarkeit nach Rückbau",
    "Notarkosten Dienstbarkeit Solarpark",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Fläche & Pacht",
  bild: "/img/investoren-vor-ort.jpg",
  bildAlt: "Drei Personen mit weißen Schutzhelmen und Plänen gehen zwischen aufgeständerten Solarmodulen über eine Wiese",
  badge: { wert: "Abt. II", text: "Grundbuch-Abteilung für die Solarpark-Dienstbarkeit" },

  kurzFazit: [
    "**Ohne dingliche Sicherung im Grundbuch finanziert keine Bank einen Solarpark.** In Deutschland ist das in aller Regel eine beschränkte persönliche Dienstbarkeit nach § 1090 BGB zugunsten der Betreibergesellschaft, eingetragen in Abteilung II.",
    "**Seit Oktober 2024 sind solche Dienstbarkeiten für Solaranlagen übertragbar** (§ 1092 Abs. 3 BGB), wenn Berechtigter eine juristische Person oder rechtsfähige Personengesellschaft ist. Für ältere Bewilligungen gilt das nicht.",
    "Die Bank verlangt fast immer die **erste Rangstelle** vor bestehenden Grundschulden. Dafür muss Ihr Grundpfandgläubiger einen Rangrücktritt nach § 880 BGB erklären – sonst könnte die Dienstbarkeit in einer Zwangsversteigerung erlöschen.",
    `Notar- und Grundbuchkosten richten sich nach dem GNotKG; Geschäftswert ist der Jahreswert des Rechts, höchstens für ${GNOTKG_HOECHSTJAHRE} Jahre. Üblich und fair ist, dass der Betreiber alle Kosten trägt – auch die der Löschung.`,
    "Weil die Dienstbarkeit rechtlich vom Pachtvertrag unabhängig ist, braucht es eine **klare Löschungspflicht** nach Vertragsende und Rückbau, am besten mit vorab hinterlegter Löschungsbewilligung.",
  ],

  abschnitte: [
    {
      id: "warum",
      titel: "Warum braucht ein Solarpark eine Dienstbarkeit im Grundbuch?",
      tocLabel: "Warum Dienstbarkeit?",
      bloecke: [
        {
          typ: "p",
          text: "**Ein Solarpark braucht eine Dienstbarkeit, weil ein Pachtvertrag nur zwischen den Vertragspartnern wirkt, die finanzierende Bank aber ein Nutzungsrecht verlangt, das auch bei Verkauf, Erbfall, Insolvenz oder Zwangsversteigerung des Grundstücks bestehen bleibt.** Dieses Recht entsteht erst mit der Eintragung im Grundbuch. Es sichert, dass die Anlage über die gesamte Laufzeit stehen, betrieben, gewartet und erreicht werden darf.",
        },
        {
          typ: "p",
          text: `Für den Eigentümer ist die Dienstbarkeit zunächst eine Belastung: Sie steht in Abteilung II des Grundbuchs, mindert den Beleihungsspielraum und überdauert jeden Eigentümerwechsel. Umgekehrt ist sie die Voraussetzung dafür, dass ein Projekt von rund ${fmt(MWP, 0)} MWp auf ${fmt(HA)} ha überhaupt gebaut wird und die vereinbarte Pacht über ${PACHT.laufzeit} Jahre fließt. Die Grundzüge des Pachtvertrags erklärt der Ratgeber [Pachtvertrag für Solarparks](/ratgeber/pachtvertrag-solarpark); dieser Beitrag geht in die Tiefe des Grundbuchrechts.`,
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Keine Rechtsberatung",
          text: "Dieser Beitrag erläutert die Rechtslage in Deutschland, Österreich und der Schweiz nach aktuellem Stand (September 2026) allgemein. Die konkrete Gestaltung gehört in die Hände eines Notars oder einer auf Grundstücksrecht spezialisierten Kanzlei.",
        },
      ],
    },
    {
      id: "arten",
      titel: "Beschränkte persönliche Dienstbarkeit oder Grunddienstbarkeit?",
      tocLabel: "Arten der Dienstbarkeit",
      bloecke: [
        {
          typ: "p",
          text: "**Für den Solarpark selbst wird in der Praxis fast immer eine beschränkte persönliche Dienstbarkeit (§§ 1090–1092 BGB) bestellt, eine Grunddienstbarkeit (§ 1018 BGB) kommt vor allem für Zuwegungen und Leitungen in Betracht.** Der Unterschied liegt darin, wer berechtigt ist: bei der persönlichen Dienstbarkeit eine bestimmte Person oder Gesellschaft, bei der Grunddienstbarkeit der jeweilige Eigentümer eines anderen, „herrschenden“ Grundstücks.",
        },
        {
          typ: "tabelle",
          caption: "Dienstbarkeitsarten im Vergleich, Deutschland, Stand " + STAND,
          kopf: ["Merkmal", "Beschränkte persönliche Dienstbarkeit", "Grunddienstbarkeit"],
          zeilen: [
            ["Rechtsgrundlage", "§§ 1090–1092 BGB", "§§ 1018–1029 BGB"],
            ["Berechtigt ist", "eine bestimmte natürliche oder juristische Person, z. B. die Projektgesellschaft", "der jeweilige Eigentümer eines herrschenden Grundstücks"],
            ["Typischer Einsatz", "Errichtung und Betrieb des Solarparks, Sicherungsdienstbarkeit der Bank", "Zufahrt oder Leitungsrecht zugunsten eines Grundstücks, etwa mit Umspannwerk oder Übergabestation"],
            ["Übertragbarkeit", "grundsätzlich nein; für Solaranlagen seit Oktober 2024 ja, wenn Berechtigter eine Gesellschaft ist (§ 1092 Abs. 3)", "geht automatisch mit dem herrschenden Grundstück über"],
            ["Voraussetzung", "keine weitere", "muss dem herrschenden Grundstück einen Vorteil bieten (§ 1019 BGB)"],
            ["Eintragung", "Abteilung II des belasteten Grundstücks", "Abteilung II des belasteten Grundstücks, auf Antrag Vermerk beim herrschenden Grundstück"],
          ],
          hervorheben: 1,
          minBreite: 720,
          fussnote: "Vereinfachte Darstellung. Im Solarpark-Alltag werden häufig mehrere Dienstbarkeiten kombiniert: eine für die Anlagenfläche, eine für Kabel und Zuwegung und eine inhaltsgleiche zugunsten der finanzierenden Bank.",
        },
        {
          typ: "p",
          text: "Eine Grunddienstbarkeit setzt voraus, dass der Betreiber selbst Eigentümer eines Grundstücks ist, dem das Recht dienen kann – bei Solarparks auf gepachteten Flächen ist das selten. Sie ist aber sinnvoll, wenn etwa das Grundstück mit der Übergabestation gekauft wurde und die Leitung über Nachbarflächen dorthin gesichert werden soll. Mehr zum Begriff im Lexikon unter [Grunddienstbarkeit](/wissen/lexikon#grunddienstbarkeit) und [Dienstbarkeit](/wissen/lexikon#dienstbarkeit).",
        },
        { typ: "h3", text: "Was gehört in den Inhalt der Dienstbarkeit?" },
        {
          typ: "checkliste",
          punkte: [
            "**Recht zur Errichtung, zum Betrieb, zur Wartung und zur Erneuerung** der Photovoltaikanlage samt Nebenanlagen (Wechselrichter, Trafostation, Zaun, Kameramasten).",
            "**Ausübungsbereich** mit Lageplan: nur die tatsächlich benötigten Flurstücke oder Teilflächen, nicht pauschal der gesamte Grundbesitz.",
            "**Geh-, Fahr- und Leitungsrecht** für Zufahrt und Kabel, möglichst mit festgelegter Trasse.",
            "**Unterlassungspflichten des Eigentümers**, etwa keine Bebauung oder Bepflanzung, die verschattet. Diese sollten eng und konkret gefasst sein.",
            "**Befristung** auf Laufzeit plus Verlängerungsoptionen, soweit die finanzierende Bank das akzeptiert.",
          ],
        },
      ],
    },
    {
      id: "uebertragbarkeit",
      titel: "Übertragbarkeit seit 2024: Was § 1092 Abs. 3 BGB jetzt erlaubt",
      tocLabel: "Übertragbarkeit",
      bloecke: [
        {
          typ: "p",
          text: "**Seit Oktober 2024 kann eine beschränkte persönliche Dienstbarkeit für eine Solaranlage auf einen Erwerber übertragen werden, wenn sie einer juristischen Person oder einer rechtsfähigen Personengesellschaft zusteht.** Der Gesetzgeber hat dazu den Katalog in § 1092 Abs. 3 BGB unter anderem um Anlagen zur Nutzung von Wasserkraft, Windenergie, solarer Strahlungsenergie, Geothermie und Biomasse sowie zur Wasserstofferzeugung erweitert. Vorher galt für Solarparks der Grundsatz des § 1092 Abs. 1 BGB: Die Dienstbarkeit ist nicht übertragbar.",
        },
        {
          typ: "p",
          text: "In der Praxis hatte das komplizierte Konstruktionen zur Folge: Neben der Betreiber-Dienstbarkeit wurde eine inhaltsgleiche Dienstbarkeit für die Bank eingetragen, oder der Eigentümer verpflichtete sich, bei einem Verkauf des Parks eine neue Dienstbarkeit für den Käufer zu bestellen – häufig abgesichert durch eine Vormerkung. Heute kann der Käufer eines Solarparks die bestehende Dienstbarkeit einfach übernehmen. Das erleichtert den Handel mit Projekten und Bestandsanlagen, wie er etwa über die [Projektbörse](/projektboerse) läuft.",
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Drei Grenzen der Neuregelung",
          text: "Erstens gilt sie nicht für Altfälle: Wurde die Eintragungsbewilligung vor Inkrafttreten beurkundet oder beglaubigt, bleibt es bei der alten Rechtslage. Zweitens ist eine Teilung der Dienstbarkeit ausgeschlossen. Drittens profitieren nur Gesellschaften, nicht natürliche Personen als Berechtigte. Speicher, Umspannwerke und Kabel sind nicht ausdrücklich genannt; ob sie als Nebenanlagen mitgedeckt sind, ist in der Literatur nicht abschließend geklärt.",
        },
        {
          typ: "p",
          text: "Für Eigentümer bedeutet die Übertragbarkeit: Die Dienstbarkeit kann ohne Ihre Zustimmung auf eine andere Gesellschaft übergehen. Der Pachtvertrag geht aber nicht automatisch mit. Achten Sie deshalb darauf, dass der Vertrag die Übertragung der Dienstbarkeit nur zusammen mit dem Pachtvertrag erlaubt, dass Sie informiert werden und dass der Erwerber alle Pflichten übernimmt – insbesondere Pacht, Haftung und [Rückbau](/ratgeber/solarpark-rueckbau-rueckbaubuergschaft).",
        },
      ],
    },
    {
      id: "rang",
      titel: "Rang im Grundbuch: Abteilung II, Abteilung III und Rangrücktritt",
      tocLabel: "Rang und Rangrücktritt",
      bloecke: [
        {
          typ: "p",
          text: "**Die Dienstbarkeit steht in Abteilung II, Grundschulden und Hypotheken in Abteilung III – und welches Recht vorgeht, entscheidet über den Fortbestand der Dienstbarkeit in einer Zwangsversteigerung.** Zwischen den Abteilungen richtet sich der Rang nach dem Tag der Eintragung (§ 879 BGB). Ist Ihr Grundstück bereits mit einer Grundschuld belastet, stünde eine neue Dienstbarkeit also im Rang dahinter.",
        },
        {
          typ: "p",
          text: "Das ist für die Bank des Solarparks nicht akzeptabel. Betreibt der vorrangige Grundschuldgläubiger die Zwangsversteigerung, erlöschen die ihm nachrangigen Rechte in der Regel mit dem Zuschlag (§§ 52, 91 ZVG) – der Park stünde ohne Nutzungsrecht da. Deshalb wird verlangt, dass die Dienstbarkeit an **erster Rangstelle** steht. Das geht nur mit einem **Rangrücktritt** nach § 880 BGB: Ihr Grundpfandgläubiger erklärt, dass seine Grundschuld hinter die Dienstbarkeit zurücktritt.",
        },
        {
          typ: "tabelle",
          caption: "Aufbau des Grundbuchs in Deutschland und Bedeutung für den Solarpark",
          kopf: ["Teil", "Inhalt", "Relevanz für PV-Pacht"],
          zeilen: [
            ["Bestandsverzeichnis", "Flurstücke, Lage, Größe", "legt fest, welche Flurstücke belastet werden; bei Teilflächen Lageplan nötig"],
            ["Abteilung I", "Eigentümer", "alle Miteigentümer oder Erben müssen die Dienstbarkeit bewilligen"],
            ["Abteilung II", "Lasten und Beschränkungen: Dienstbarkeiten, Vormerkungen, Vorkaufsrechte", "**hier steht die Solarpark-Dienstbarkeit**, idealerweise an erster Stelle"],
            ["Abteilung III", "Grundschulden, Hypotheken", "bestehende Grundpfandrechte müssen im Rang zurücktreten"],
          ],
          hervorheben: 2,
          minBreite: 640,
          fussnote: "Bereits eingetragene Rechte in Abteilung II (etwa alte Leitungsrechte eines Netzbetreibers) bleiben vorrangig. Sie werden bei der Due Diligence des Investors geprüft.",
        },
        {
          typ: "h3",
          text: "So verläuft der Rangrücktritt in der Praxis",
        },
        {
          typ: "ablauf",
          schritte: [
            ["Grundbuchauszug prüfen", "Welche Rechte stehen in Abteilung II und III, zu wessen Gunsten? Bei Hofübergaben stehen oft auch Altenteil oder Wohnrechte eingetragen."],
            ["Früh mit der eigenen Bank sprechen", "Die Hausbank muss zustimmen. Manche Banken prüfen, ob der Wert ihrer Sicherheit durch die Dienstbarkeit sinkt, und verlangen eine Bewertung oder Gegenleistung."],
            ["Erklärungen beglaubigen lassen", "Rangrücktritt des Gläubigers und Zustimmung des Eigentümers müssen in öffentlich beglaubigter Form beim Grundbuchamt vorliegen."],
            ["Kosten beim Betreiber lassen", "Gebühren der Bank, Notar und Grundbuchamt sollte der Pachtvertrag ausdrücklich dem Betreiber zuweisen."],
          ],
        },
        {
          typ: "p",
          text: "Aus Sicht Ihrer Bank ist ein Rangrücktritt meist verkraftbar: Die Pachteinnahmen verbessern oft sogar Ihre Kapitaldienstfähigkeit. Trotzdem kann das Gespräch Wochen dauern – planen Sie es vor dem Baubeginn ein, nicht erst kurz vor Finanzierungsabschluss. Einordnung im Lexikon unter [Rangrücktritt](/wissen/lexikon#rangruecktritt).",
        },
      ],
    },
    {
      id: "bank",
      titel: "Eintrittsrecht der Bank und Sicherungsdienstbarkeit",
      tocLabel: "Eintrittsrecht der Bank",
      bloecke: [
        {
          typ: "p",
          text: "**Die finanzierende Bank will im Krisenfall den Park selbst weiterführen oder an einen Dritten übergeben können – deshalb verlangt sie ein Eintrittsrecht in den Pachtvertrag und oft eine eigene Dienstbarkeit.** Umgesetzt wird das über eine dreiseitige Vereinbarung zwischen Eigentümer, Betreiber und Bank (Direktvereinbarung) und eine zweite, inhaltsgleiche beschränkte persönliche Dienstbarkeit zugunsten der Bank, die erst ausgeübt werden darf, wenn der Sicherungsfall eintritt.",
        },
        {
          typ: "p",
          text: "Seit der Neuregelung in § 1092 Abs. 3 BGB könnte die Bank die Betreiber-Dienstbarkeit grundsätzlich auch übertragen bekommen. Viele Finanzierer bestehen nach Praxisberichten dennoch auf der eigenen Sicherungsdienstbarkeit, weil sie unabhängig von Streitigkeiten mit dem Betreiber wirkt. Für Sie als Eigentümer ist das in der Regel kein Nachteil: Die Pacht läuft bei einer Insolvenz des Betreibers eher weiter. Wichtig ist, dass jeder Eintretende auch alle Pflichten übernimmt – einschließlich Rückbau und Rückbausicherheit.",
        },
        {
          typ: "checkliste",
          punkte: [
            "Die Bank-Dienstbarkeit darf nur **ausgeübt werden, wenn die Betreiber-Dienstbarkeit nicht mehr genutzt wird** – nie beide gleichzeitig.",
            "Eintretende müssen **Pachtzahlungen ab Eintritt** übernehmen; rückständige Pacht sollte ebenfalls geregelt sein.",
            "**Kündigungsrechte** des Eigentümers wegen Zahlungsverzugs werden meist zugunsten der Bank eingeschränkt – dafür sollten Sie eine Heilungsfrist mit klarem Enddatum verlangen.",
            "Die Bank-Dienstbarkeit wird **zusammen mit der Betreiber-Dienstbarkeit gelöscht**, sobald der Kredit zurückgezahlt ist oder die Anlage zurückgebaut wurde.",
          ],
        },
      ],
    },
    {
      id: "kabeltrassen",
      titel: "Kabeltrassen über Nachbarflächen richtig sichern",
      tocLabel: "Kabeltrassen",
      bloecke: [
        {
          typ: "p",
          text: "**Die Kabeltrasse vom Solarpark zum Netzverknüpfungspunkt braucht auf jedem fremden Grundstück eine eigene Leitungsdienstbarkeit – sonst ist der Park nicht finanzierbar.** Jeder Eigentümer entlang der Trasse muss sie bewilligen. Fehlt ein einziges Flurstück, droht ein Umweg, der schnell teuer wird: Mittelspannungstrassen kosten im Mittel rund " + fmt(FREIFLAECHE.kabelProMeter) + " € je Meter.",
        },
        {
          typ: "p",
          text: "Für Eigentümer von Trassengrundstücken ist die Dienstbarkeit meist weniger belastend als für die Parkfläche: Das Kabel liegt im Boden, die Fläche bleibt bewirtschaftbar. Regeln sollten Sie dennoch Verlegetiefe, Breite des Schutzstreifens, Entschädigung für Flurschäden und die Wiederherstellung von Drainagen. Üblich ist eine Einmalzahlung je laufendem Meter oder ein jährliches Entgelt. Wer mehrere Flächen besitzt, sollte die Trasse gesondert verhandeln, statt sie im Pachtvertrag der Parkfläche „mitlaufen“ zu lassen. Mehr zum technischen Hintergrund im Ratgeber [Netzanschluss für Solarparks](/ratgeber/netzanschluss-solarpark).",
        },
        {
          typ: "kasten",
          variant: "tipp",
          titel: "Tipp für Nachbarn ohne eigene Parkfläche",
          text: "Wird Ihr Grundstück nur für die Trasse gebraucht, haben Sie Verhandlungsspielraum – eine Enteignung ist für private Solarparks nicht vorgesehen. Bleiben Sie trotzdem fair: Ein Projekt, das an einer Trasse scheitert, bringt auch der Gemeinde keine Gewerbesteuer und keine Beteiligung nach § 6 EEG.",
        },
      ],
    },
    {
      id: "vormerkung",
      titel: "Vormerkung: Sicherung schon vor dem Baubeginn",
      tocLabel: "Vormerkung",
      bloecke: [
        {
          typ: "p",
          text: "**Mit einer Vormerkung (§ 883 BGB) lässt sich der Anspruch auf Bestellung einer Dienstbarkeit bereits im Grundbuch sichern, bevor die Dienstbarkeit selbst eingetragen wird.** Das nutzen Entwickler in der Planungsphase: Der Pachtvertrag ist unterschrieben, gebaut wird aber erst nach Bebauungsplan und Netzzusage. Die Vormerkung schützt den Entwickler davor, dass die Fläche zwischenzeitlich verkauft oder anderweitig belastet wird.",
        },
        {
          typ: "p",
          text: "Für Eigentümer ist wichtig, dass die Vormerkung wieder verschwindet, wenn das Projekt scheitert. Lange Reservierungen mit Vormerkung, aber ohne Entgelt, binden die Fläche ohne Gegenleistung. Faire Verträge sehen ein Reservierungsentgelt von etwa [" + fmt(PACHT.reservierungProHa.min) + " bis " + fmt(PACHT.reservierungProHa.max) + " € je Hektar](/quellen#fakt-de-pacht.reservierungProHa) vor und verpflichten den Entwickler, die Löschung der Vormerkung zu bewilligen, sobald er vom Vertrag zurücktritt oder eine Frist verstreicht. Wie der Weg bis zur Baureife abläuft, zeigt der [Projektablauf](/prozess).",
        },
      ],
    },
    {
      id: "kosten",
      titel: "Was kostet die Eintragung? Notar und Grundbuchamt nach GNotKG",
      tocLabel: "Kosten",
      bloecke: [
        {
          typ: "p",
          text: `**Die Kosten für Notar und Grundbuchamt richten sich nach dem Gerichts- und Notarkostengesetz (GNotKG) und hängen vom Geschäftswert ab – bei einem Solarpark ist das der Jahreswert des Nutzungsrechts, bei befristeten Rechten höchstens für ${GNOTKG_HOECHSTJAHRE} Jahre (§ 52 GNotKG).** Als Anhaltspunkt für den Jahreswert dient in der Praxis häufig das vereinbarte Nutzungsentgelt.`,
        },
        {
          typ: "p",
          text: `Ein Beispiel: Bei ${fmt(HA)} ha und einer Pacht von ${fmt(PACHT.freiflaecheProHa.mittel)} € je Hektar liegt der Jahreswert bei ${fmtEur(JAHRESWERT)}. Über ${GNOTKG_HOECHSTJAHRE} Jahre ergibt sich ein Geschäftswert von rund ${fmtEur(GESCHAEFTSWERT)}. Auf dieser Basis fallen die Notargebühr für Entwurf und Beglaubigung der Bewilligung sowie beim Grundbuchamt eine ${fmt(GNOTKG_EINTRAGUNG_SATZ, 1)}-Gebühr für die Eintragung an (Kostenverzeichnis Nr. 14121). Hinzu kommen gegebenenfalls Kosten für Rangrücktritt, Vormerkung, Bank-Dienstbarkeit und Lagepläne. Die Löschung einer Dienstbarkeit in Abteilung II kostet beim Grundbuchamt nach aktuellem Stand eine Festgebühr von ${fmtEur(GNOTKG_LOESCHUNG_EUR)} je Grundstück (Nr. 14143), zuzüglich Notarkosten für die Beglaubigung.`,
        },
        {
          typ: "kasten",
          variant: "info",
          titel: "Wer zahlt?",
          text: "Marktüblich trägt der Betreiber sämtliche Kosten der Bestellung, Eintragung, Rangänderung und späteren Löschung. Lassen Sie sich die voraussichtlichen Gebühren vom Notar vor der Beurkundung beziffern – die genaue Höhe hängt davon ab, wie viele Rechte eingetragen werden und ob der Notar den Entwurf fertigt.",
        },
      ],
    },
    {
      id: "loeschung",
      titel: "Löschung nach Rückbau: So stellen Sie sicher, dass das Grundbuch wieder frei wird",
      tocLabel: "Löschung",
      bloecke: [
        {
          typ: "p",
          text: "**Endet der Pachtvertrag, bleibt die Dienstbarkeit trotzdem im Grundbuch stehen, bis der Berechtigte ihre Löschung bewilligt.** Das liegt am Abstraktionsprinzip: Die Dienstbarkeit ist rechtlich vom Pachtvertrag getrennt. Für die Löschung braucht das Grundbuchamt eine Löschungsbewilligung des Berechtigten in öffentlich beglaubigter Form (§§ 19, 29 GBO).",
        },
        {
          typ: "p",
          text: "Problematisch wird es, wenn die Betreibergesellschaft nach 30 Jahren nicht mehr existiert, insolvent ist oder nicht reagiert. Dann drohen aufwendige Verfahren, bis das Grundbuch wieder frei ist. Vorbeugen lässt sich mit einigen Klauseln:",
        },
        {
          typ: "checkliste",
          punkte: [
            "**Schuldrechtliche Löschungspflicht** im Pachtvertrag: Nach Vertragsende und vollständigem Rückbau bewilligt der Betreiber unverzüglich die Löschung aller Rechte, auch der Bank-Dienstbarkeit und von Vormerkungen.",
            "**Befristung** der Dienstbarkeit auf die maximale Laufzeit einschließlich Verlängerungen – danach ist sie ohne weiteres Zutun erloschen und lässt sich leichter löschen.",
            "**Hinterlegte Löschungsbewilligung** beim Notar mit Treuhandauftrag, die bei Nachweis von Vertragsende und Rückbau eingereicht wird.",
            "**Rückbausicherheit** (Bürgschaft oder Rücklage) so bemessen, dass auch die Kosten der Löschung abgedeckt sind.",
            "**Rechtsnachfolgeklausel**: Jeder Erwerber der Dienstbarkeit übernimmt die Löschungspflicht ausdrücklich.",
          ],
        },
        {
          typ: "p",
          text: `Die Kosten des Rückbaus selbst sind mit rund ${fmt(FREIFLAECHE.rueckbauProKwp)} € je kWp überschaubar, entscheidend ist die Absicherung gegen den Ausfall des Betreibers. Worauf es bei der Bürgschaft ankommt, erklärt der Ratgeber [Rückbau und Rückbaubürgschaft](/ratgeber/solarpark-rueckbau-rueckbaubuergschaft).`,
        },
      ],
    },
    {
      id: "at-ch",
      titel: "Österreich und Schweiz: Servitut, Baurecht und Grundbuch",
      tocLabel: "Österreich & Schweiz",
      bloecke: [
        {
          typ: "p",
          text: "**In Österreich wird das Nutzungsrecht als Dienstbarkeit (Servitut) nach §§ 472 ff. ABGB vereinbart; bei verbücherten Grundstücken entsteht es erst mit der Eintragung im Grundbuch (§ 481 ABGB).** Die Last steht im Lastenblatt (C-Blatt), der Rang richtet sich nach dem Eingang beim Grundbuchgericht. Auch hier verlangen Banken den Vorrang vor bestehenden Pfandrechten. Die Landwirtschaftskammern empfehlen, dass der Betreiber Verbücherung und spätere Löschung bezahlt. Als Alternative zur Servitut kommt ein Baurecht nach dem Baurechtsgesetz in Betracht, das in der Praxis bei Freiflächenanlagen seltener genutzt wird. Zur Widmung und zum Förderrahmen siehe [Freiflächen-PV in Österreich](/ratgeber/freiflaechen-pv-oesterreich).",
        },
        {
          typ: "p",
          text: `**In der Schweiz werden Nutzungsrechte je nach Gestaltung als Dienstbarkeit (Art. 730 ff. bzw. Art. 781 ZGB) oder als Baurecht (Art. 779 ff. ZGB) im Grundbuch gesichert.** Ein Baurecht, das für mindestens ${CH_BAURECHT_DAUERND_JAHRE} Jahre eingeräumt wird, kann als selbständiges und dauerndes Recht ein eigenes Grundbuchblatt erhalten; die Höchstdauer beträgt ${CH_BAURECHT_MAX_JAHRE} Jahre. Für die Begründung ist nach aktuellem Stand in der Regel eine öffentliche Beurkundung erforderlich. Weil Freiflächenanlagen in der Schweiz raumplanerisch stark eingeschränkt sind, betrifft das vor allem alpine Anlagen und Sonderstandorte – Einordnung unter [Freiflächen-PV in der Schweiz](/ratgeber/freiflaechen-pv-schweiz).`,
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "Checkliste für Eigentümer vor der Beurkundung",
      tocLabel: "Checkliste",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Grundbuchauszug und Flurkarte besorgen", "Aktuellen Auszug anfordern, eingetragene Rechte und Miteigentümer prüfen. Erste Einschätzung der Fläche im [Flächencheck](/flaechencheck)."],
            ["Pacht und Dienstbarkeit zusammen verhandeln", "Umfang, Ausübungsbereich, Befristung und Löschungspflicht gehören in denselben Verhandlungsschritt wie die Pachthöhe. Größenordnung der Pacht im [Pachtrechner](/rechner/pacht)."],
            ["Hausbank informieren", "Rangrücktritt früh anfragen und Kosten dem Betreiber zuweisen."],
            ["Trassen und Zufahrt klären", "Welche Nachbarflächen betroffen sind und wer sie sichert, sollte vor Baubeginn feststehen."],
            ["Steuerliche Folgen prüfen lassen", "Die Verpachtung kann Erbschaft- und Grundsteuer verändern – siehe [Erbschaft- und Grundsteuer bei PV-Pacht](/ratgeber/pv-pacht-erbschaftsteuer-grundsteuer) und [Steuern für Landwirte mit PV](/ratgeber/photovoltaik-landwirt-steuern)."],
            ["Beurkunden oder beglaubigen", "Bewilligung beim Notar unterzeichnen, Vollzug durch den Notar überwachen lassen, Eintragungsnachricht aufbewahren."],
          ],
        },
        {
          typ: "tool",
          href: pfad("/flaeche-verpachten"),
          titel: "Fläche für einen Solarpark verpachten",
          text: "Ablauf, Voraussetzungen und worauf Eigentümer bei Vertrag und Grundbuch achten sollten.",
          label: "Zum Überblick für Eigentümer",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Muss ich für einen Solarpark eine Dienstbarkeit eintragen lassen?",
      a: "Praktisch ja. Banken finanzieren nur, wenn das Nutzungsrecht dinglich gesichert ist. In Deutschland geschieht das über eine beschränkte persönliche Dienstbarkeit in Abteilung II, oft ergänzt um eine Dienstbarkeit zugunsten der Bank.",
    },
    {
      q: "Kann der Betreiber die Dienstbarkeit ohne meine Zustimmung verkaufen?",
      a: "Seit Oktober 2024 ja, wenn der Berechtigte eine Gesellschaft ist und die Bewilligung nach Inkrafttreten der Neuregelung beurkundet oder beglaubigt wurde (§ 1092 Abs. 3 BGB). Regeln Sie im Pachtvertrag, dass Dienstbarkeit und Vertrag nur gemeinsam übergehen dürfen und der Erwerber alle Pflichten übernimmt.",
    },
    {
      q: "Was passiert mit der Dienstbarkeit, wenn ich das Grundstück verkaufe oder vererbe?",
      a: "Sie bleibt bestehen und belastet den neuen Eigentümer. Der Pachtvertrag geht bei einem Verkauf in der Regel mit über, beim Erbfall sowieso. Steuerlich kann die Vererbung verpachteter PV-Flächen teuer werden – siehe [Erbschaft- und Grundsteuer bei PV-Pacht](/ratgeber/pv-pacht-erbschaftsteuer-grundsteuer).",
    },
    {
      q: "Muss meine Bank einem Rangrücktritt zustimmen?",
      a: "Sie ist dazu nicht verpflichtet, stimmt aber in der Praxis meist zu, weil die Pacht die Kapitaldienstfähigkeit verbessert. Manche Banken verlangen eine Bewertung oder ein Entgelt. Diese Kosten sollte der Betreiber übernehmen.",
    },
    {
      q: "Wer trägt die Notar- und Grundbuchkosten?",
      a: "Üblich ist, dass der Betreiber alle Kosten für Bestellung, Eintragung, Rangänderung und Löschung trägt. Der Geschäftswert richtet sich nach § 52 GNotKG, bei befristeten Rechten höchstens nach dem Wert von 20 Jahren.",
    },
    {
      q: "Wie werde ich die Dienstbarkeit nach dem Rückbau wieder los?",
      a: "Mit einer Löschungsbewilligung des Berechtigten in beglaubigter Form. Sichern Sie das vorab ab: Löschungspflicht im Vertrag, Befristung der Dienstbarkeit und am besten eine beim Notar hinterlegte Löschungsbewilligung. Mehr unter [Rückbau und Rückbaubürgschaft](/ratgeber/solarpark-rueckbau-rueckbaubuergschaft).",
    },
    {
      q: "Brauche ich für die Kabeltrasse auf dem Nachbargrundstück auch eine Dienstbarkeit?",
      a: "Ja, jede fremde Fläche entlang der Trasse muss durch eine Leitungsdienstbarkeit gesichert werden. Die Eigentümer erhalten dafür üblicherweise ein gesondertes Entgelt und eine Entschädigung für Flurschäden.",
    },
  ],

  passend: [
    { href: "/ratgeber/pachtvertrag-solarpark", titel: "Pachtvertrag Solarpark", text: "Laufzeit, Rücktrittsrechte, Haftung und Checkliste." },
    { href: "/ratgeber/solarpark-rueckbau-rueckbaubuergschaft", titel: "Rückbau und Rückbaubürgschaft", text: "Wie Eigentümer das Vertragsende absichern." },
    { href: "/ratgeber/solarpark-pacht-pro-hektar", titel: "Pacht pro Hektar", text: "Spannen, Einflussfaktoren und Rechnung über 30 Jahre." },
    { href: pfad("/flaeche-verpachten"), titel: "Fläche verpachten", text: "Ablauf und Voraussetzungen für Eigentümer." },
  ],

  quellen: [
    { titel: "BGB § 1092 – Unübertragbarkeit; Überlassung der Ausübung (Abs. 3 mit Solaranlagen)", url: "https://www.gesetze-im-internet.de/bgb/__1092.html", stand: "09/2026" },
    { titel: "BGB § 1090 – Gesetzlicher Inhalt der beschränkten persönlichen Dienstbarkeit", url: "https://www.gesetze-im-internet.de/bgb/__1090.html", stand: "09/2026" },
    { titel: "BGB § 880 – Rangänderung", url: "https://www.gesetze-im-internet.de/bgb/__880.html", stand: "09/2026" },
    { titel: "GNotKG § 52 – Nutzungs- und Leistungsrechte", url: "https://www.gesetze-im-internet.de/gnotkg/__52.html", stand: "09/2026" },
    { titel: "Deutscher Bundestag – Drucksache 20/9890: Gesetzentwurf zur Übertragbarkeit beschränkter persönlicher Dienstbarkeiten für Erneuerbare-Energien-Anlagen", url: "https://www.bundestag.de/resource/blob/986938/b262d5271cecd15b8e8cdf4b8ebabf3f/Gesetzentwurf-BReg.pdf", stand: "09/2026" },
    { titel: "CBH Rechtsanwälte – Neues Gesetz erleichtert Übertragbarkeit beschränkter persönlicher Dienstbarkeiten für EE-Anlagen", url: "https://www.cbh.de/news/verwaltung-wirtschaft/neues-gesetz-erleichtert-uebertragbarkeit-beschraenkter-persoenlicher-dienstbarkeiten-fuer-erneuerbare-energien-anlagen/", stand: "09/2026" },
    { titel: "RIS – ABGB § 472 (Dienstbarkeit)", url: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001622&Paragraf=472", stand: "09/2026" },
    { titel: "Landwirtschaftskammer Oberösterreich – Photovoltaik-Freiflächenanlagen: Checkliste über wesentliche Vertragspunkte", url: "https://ooe.lko.at/photovoltaik-freifl%C3%A4chenanlagen-checkliste-%C3%BCber-wesentliche-vertragspunkte+2400+4125534", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Was bringt Ihre Fläche?",
    text: "Pacht über die gesamte Laufzeit berechnen – Grundlage für die Verhandlung.",
    href: pfad("/rechner/pacht"),
    label: "Zum Pachtrechner",
  },
  cta: {
    title: "Lassen Sie Ihre Fläche kostenfrei einschätzen.",
    text: "Im Flächencheck prüfen wir Lage, Netzanschluss und Planungsrecht Ihrer Fläche. Für Flächeneigentümer ist die Plattform von ÖkoInvest kostenfrei.",
    primary: { label: "Zum Flächencheck", href: pfad("/flaechencheck") },
    secondary: { label: "Pacht berechnen", href: pfad("/rechner/pacht") },
  },
};

export default artikel;
