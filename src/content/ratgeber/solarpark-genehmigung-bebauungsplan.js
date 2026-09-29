// Ratgeber: Solarpark-Genehmigung über den Bebauungsplan (Deutschland)
// Recht: BauGB §§ 1, 2, 3, 4, 6, 8, 10, 11, 35 (gesetze-im-internet.de, geprüft 09/2026),
// EEG 2023 §§ 2, 6, 37, BNatSchG § 44. Zeitrahmen aus PHASEN (markt.js).

import { PHASEN, phaseById, FREIFLAECHE, KOMMUNE, AGRI, BAUART, regionById } from "@/lib/invest/markt";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";

// Gesetzliche Eckwerte (BauGB, Stand 09/2026 geprüft)
const PRIV_KORRIDOR_M = 200; // § 35 Abs. 1 Nr. 8 b BauGB
const EEG_RANDSTREIFEN_M = 500; // § 37 Abs. 1 Nr. 2 c EEG
const VEROEFFENTLICHUNG_TAGE = 30; // § 3 Abs. 2 BauGB: ein Monat, mindestens 30 Tage
const FNP_GENEHMIGUNG_MONATE = 1; // § 6 Abs. 4 BauGB

const monate = (id) => phaseById(id).monateBisRtb;

// Rechenbeispiel: 10-MWp-Projekt in Süddeutschland
const MWP = 10;
const KWP = MWP * 1000;
const REGION = regionById("de-sued");
const HA = MWP * FREIFLAECHE.haProMwp;
const ENTW_MIN = KWP * FREIFLAECHE.entwicklungProKwp.min;
const ENTW_MAX = KWP * FREIFLAECHE.entwicklungProKwp.max;
const JAHRESERTRAG_KWH = KWP * REGION.ertrag;
const KOMMUNAL_EUR = (JAHRESERTRAG_KWH * KOMMUNE.beteiligungCt) / 100;

const artikel = {
  slug: "solarpark-genehmigung-bebauungsplan",
  title: "Solarpark-Genehmigung: Der Bebauungsplan Schritt für Schritt",
  seoTitle: "Solarpark-Genehmigung & Bebauungsplan | ÖkoInvest",
  kurzTitel: "Solarpark-Genehmigung",
  description:
    "Solarpark-Genehmigung in Deutschland: B-Plan vom Aufstellungs- bis zum Satzungsbeschluss, Privilegierung nach § 35 BauGB, Zeitrahmen und typische Stolpersteine.",
  excerpt:
    "Wie aus einem Acker Baurecht für einen Solarpark wird: alle Schritte des Bebauungsplanverfahrens, wann die Privilegierung im Außenbereich hilft, wie lange es dauert und woran Projekte scheitern.",
  hauptKeyword: "solarpark genehmigung",
  keywords: [
    "Solarpark Genehmigung",
    "Bebauungsplan Solarpark",
    "Freiflächen-PV Genehmigungsverfahren",
    "Aufstellungsbeschluss Solarpark",
    "Privilegierung Photovoltaik § 35 BauGB",
    "Solarpark Baurecht Dauer",
    "städtebaulicher Vertrag Solarpark",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Recht & Genehmigung",
  bild: "/img/planer-tablet.jpg",
  bildAlt: "Ingenieur mit weißem Schutzhelm prüft Unterlagen auf einem Tablet vor einer Reihe von Solarmodulen",
  badge: { wert: `~${monate("aufstellung")} Monate`, text: "vom Aufstellungsbeschluss bis zur Baureife (Orientierung)" },

  kurzFazit: [
    "**Ein Solarpark im Außenbereich braucht in Deutschland fast immer einen Bebauungsplan.** Die Gemeinde entscheidet als Planungsträgerin – ohne ihren Willen gibt es kein Baurecht.",
    `Das Verfahren läuft vom **Aufstellungsbeschluss** über zwei Beteiligungsrunden, Umweltbericht und Abwägung bis zum **Satzungsbeschluss**. Ab Aufstellungsbeschluss vergehen bis zur Baureife in der Regel rund **${monate("aufstellung")} Monate**, ab Flächensicherung eher **${monate("flaeche")} Monate**.`,
    `Ohne B-Plan geht es nur in Sonderfällen: im **${PRIV_KORRIDOR_M}-m-Korridor** an Autobahnen und zweigleisigen Hauptbahnstrecken (§ 35 Abs. 1 Nr. 8 b BauGB) und bei hofnaher **Agri-PV bis ${fmt(AGRI.privilegierungHa, 1)} ha** (Nr. 9).`,
    "Die häufigsten Stolpersteine sind nicht die Paragrafen, sondern **Netzanschluss, Artenschutz, Raumordnung und die Akzeptanz im Gemeinderat**.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Braucht ein Solarpark einen Bebauungsplan?",
      tocLabel: "Braucht es einen B-Plan?",
      bloecke: [
        {
          typ: "p",
          text: "**Ja, in aller Regel: Freiflächen-Photovoltaik ist im Außenbereich grundsätzlich nicht privilegiert, deshalb schafft erst ein Bebauungsplan der Gemeinde das nötige Baurecht.** Auf Grundlage dieses Plans erteilt anschließend die Baugenehmigungsbehörde – je nach Bundesland Landratsamt, Kreis oder kreisfreie Stadt – die Baugenehmigung für die konkrete Anlage.",
        },
        {
          typ: "p",
          text: "Der [Bebauungsplan](/wissen/lexikon#bebauungsplan) ist eine Satzung der Gemeinde. Er setzt ein „Sondergebiet Photovoltaik“ fest und regelt, wo Modultische stehen dürfen, wie hoch sie sein dürfen, wie eingegrünt wird und welche Ausgleichsflächen nötig sind. Weil die Gemeinde Planungshoheit hat, ist der Gemeinderat die wichtigste Adresse jedes Projekts: Einen Anspruch auf einen Bebauungsplan gibt es nicht.",
        },
        {
          typ: "p",
          text: `Für Flächeneigentümer heißt das: Ein [Pachtvertrag](/ratgeber/pachtvertrag-solarpark) sichert die Fläche, aber noch kein Baurecht. Erst mit dem Satzungsbeschluss steigt der Wert eines Projekts deutlich – das zeigt sich auch in den Preisen, die auf der [Projektbörse](/projektboerse) je Entwicklungsphase gezahlt werden.`,
        },
        {
          typ: "kennzahl",
          wert: `~${monate("flaeche")} Monate`,
          titel: "von der Flächensicherung bis zur Baureife",
          text: `Orientierungswert aus unserer Phasenbewertung. Ab Aufstellungsbeschluss rechnen wir mit rund ${monate("aufstellung")}, ab Satzungsbeschluss mit rund ${monate("satzung")} Monaten bis zum Status „Ready-to-Build“. Einzelfälle weichen deutlich ab.`,
        },
      ],
    },
    {
      id: "ablauf",
      titel: "Das Bebauungsplanverfahren Schritt für Schritt",
      tocLabel: "Ablauf B-Plan",
      bloecke: [
        {
          typ: "p",
          text: "**Das Regelverfahren nach Baugesetzbuch besteht aus zehn Schritten, von denen einige parallel laufen.** Die Dauer ergibt sich weniger aus gesetzlichen Fristen als aus Sitzungsterminen des Gemeinderats, Kartierzeiten für den Artenschutz und der Qualität der Unterlagen.",
        },
        {
          typ: "tabelle",
          caption: "Verfahrensschritte des Bebauungsplans für einen Solarpark und typische Dauer (Deutschland, Stand September 2026)",
          kopf: ["Schritt", "Rechtsgrundlage", "Was passiert", "Typische Dauer"],
          zeilen: [
            ["1. Vorgespräch & Flächensicherung", "–", "Projekt im Rathaus vorstellen, Pacht- oder Optionsverträge, Netzanfrage", "2–6 Monate"],
            ["2. Aufstellungsbeschluss", "§ 2 Abs. 1 BauGB", "Gemeinderat beschließt, einen B-Plan aufzustellen; ortsübliche Bekanntmachung", "1 Sitzung"],
            ["3. Frühzeitige Beteiligung", "§ 3 Abs. 1, § 4 Abs. 1 BauGB", "Öffentlichkeit und Behörden werden über Ziele informiert, Umfang der Umweltprüfung wird abgestimmt", "1–2 Monate"],
            ["4. Gutachten & Umweltbericht", "§ 2 Abs. 4, § 2a BauGB; § 44 BNatSchG", "Artenschutz-Kartierung, Eingriffs-/Ausgleichsbilanz, Blendgutachten, ggf. Boden und Wasser", "4–12 Monate (Kartierung saisonal)"],
            ["5. Entwurf mit Begründung", "§ 9 BauGB", "Festsetzungen: Sondergebiet, Baugrenzen, Höhen, Eingrünung, Ausgleich", "1–3 Monate"],
            ["6. Veröffentlichung & Behördenbeteiligung", "§ 3 Abs. 2, § 4 Abs. 2 BauGB", `Entwurf im Internet für einen Monat, mindestens ${VEROEFFENTLICHUNG_TAGE} Tage; Stellungnahmen`, "1–2 Monate"],
            ["7. Abwägung", "§ 1 Abs. 7 BauGB", "Gemeinderat wägt alle Stellungnahmen ab; ggf. erneute Veröffentlichung", "1–3 Monate"],
            ["8. Satzungsbeschluss", "§ 10 Abs. 1 BauGB", "Gemeinderat beschließt den B-Plan als Satzung", "1 Sitzung"],
            ["9. FNP-Änderung / Genehmigung", "§ 6, § 8 Abs. 3, § 10 Abs. 2 BauGB", `Parallel geänderter Flächennutzungsplan wird von der höheren Verwaltungsbehörde genehmigt (Frist grundsätzlich ${FNP_GENEHMIGUNG_MONATE} Monat, verlängerbar)`, "1–3 Monate"],
            ["10. Bekanntmachung", "§ 10 Abs. 3 BauGB", "Mit der ortsüblichen Bekanntmachung tritt der B-Plan in Kraft", "wenige Wochen"],
          ],
          minBreite: 760,
          fussnote: `Dauer: Erfahrungswerte, keine gesetzlichen Fristen. Summiert ergeben sich ab Aufstellungsbeschluss meist 12 bis 24 Monate bis zum Satzungsbeschluss. Danach folgen Baugenehmigung, Netzanschlussvertrag und Finanzierung – in unserer Phasenbewertung rund ${monate("satzung")} Monate bis zur Baureife.`,
        },
        { typ: "h3", text: "Aufstellungsbeschluss: der erste formale Meilenstein" },
        {
          typ: "p",
          text: "Mit dem [Aufstellungsbeschluss](/wissen/lexikon#aufstellungsbeschluss) signalisiert die Gemeinde, dass sie das Projekt grundsätzlich planen will. Er ist auch für die Förderung wichtig: Ein Gebot in der [EEG-Ausschreibung](/ratgeber/eeg-ausschreibung-freiflaeche) für Freiflächenanlagen setzt nach Angaben der Bundesnetzagentur mindestens einen Aufstellungsbeschluss voraus. Liegt bereits ein beschlossener B-Plan vor, halbiert sich zudem die zu hinterlegende Sicherheit.",
        },
        { typ: "h3", text: "Frühzeitige Beteiligung und Umweltbericht" },
        {
          typ: "p",
          text: "In der [frühzeitigen Beteiligung](/wissen/lexikon#fruehzeitige-beteiligung) erfahren Bürger, Naturschutzbehörde, Landwirtschaftsamt, Wasserbehörde, Netzbetreiber und Nachbargemeinden erstmals von den Planungszielen. Parallel legt die Gemeinde fest, wie tief die Umweltprüfung gehen muss. Das Ergebnis ist der [Umweltbericht](/wissen/lexikon#umweltbericht) als Teil der Begründung. Er bewertet Boden, Wasser, Landschaftsbild, Tiere und Pflanzen und bilanziert, welcher [Ausgleich](/wissen/lexikon#ausgleichsflaechen) nötig ist. Bei Solarparks lässt sich der Ausgleich häufig innerhalb der Anlage erbringen, etwa durch extensives Grünland unter den Modulen und Heckenpflanzungen am Rand.",
        },
        { typ: "h3", text: "Artenschutz: der größte Zeitfaktor" },
        {
          typ: "p",
          text: "Die artenschutzrechtliche Prüfung klärt, ob Zugriffsverbote nach § 44 BNatSchG berührt sind – bei Freiflächen geht es meist um Feldlerche, Rebhuhn, Wiesenbrüter, Feldhamster oder Zauneidechse. Kartierungen sind an die Brut- und Aktivitätszeiten gebunden. Wer den Aufstellungsbeschluss im Sommer fasst, verliert unter Umständen eine ganze Saison. Deshalb lohnt es sich, eine Potenzialabschätzung schon vor dem Aufstellungsbeschluss beauftragen zu lassen.",
        },
        { typ: "h3", text: "Veröffentlichung, Abwägung und Satzungsbeschluss" },
        {
          typ: "p",
          text: `Seit der BauGB-Änderung 2023 wird der Entwurf **im Internet veröffentlicht** – für die Dauer eines Monats, mindestens aber ${VEROEFFENTLICHUNG_TAGE} Tage (§ 3 Abs. 2 BauGB). Zusätzlich sind in der Regel andere leicht zu erreichende Zugangsmöglichkeiten anzubieten. Danach wägt der Gemeinderat alle Stellungnahmen gerecht gegeneinander ab. Dabei hilft § 2 EEG: Errichtung und Betrieb von Anlagen erneuerbarer Energien liegen im **überragenden öffentlichen Interesse**. Ändert sich der Entwurf in wesentlichen Punkten, wird er erneut veröffentlicht. Am Ende steht der [Satzungsbeschluss](/wissen/lexikon#satzungsbeschluss).`,
        },
        { typ: "h3", text: "Flächennutzungsplan: Parallelverfahren ist die Regel" },
        {
          typ: "p",
          text: `Bebauungspläne sind aus dem [Flächennutzungsplan](/wissen/lexikon#flaechennutzungsplan) zu entwickeln (§ 8 Abs. 2 BauGB). Weil Äcker dort als Fläche für die Landwirtschaft dargestellt sind, ändert die Gemeinde den FNP meist im **Parallelverfahren** nach § 8 Abs. 3 BauGB. Die FNP-Änderung muss die höhere Verwaltungsbehörde genehmigen; über die Genehmigung ist grundsätzlich binnen eines Monats zu entscheiden (§ 6 Abs. 4 BauGB). In Gemeinden mit gemeinsamem FNP, etwa in Verwaltungsgemeinschaften, entscheidet ein anderes Gremium – das kostet zusätzliche Sitzungstermine.`,
        },
      ],
    },
    {
      id: "privilegierung",
      titel: "Wann ein Solarpark ohne Bebauungsplan zulässig ist",
      tocLabel: "Privilegierung § 35",
      bloecke: [
        {
          typ: "p",
          text: `**Ohne Bebauungsplan sind Solaranlagen im Außenbereich nur in zwei Fällen privilegiert: entlang von Autobahnen und bestimmten Bahnstrecken bis ${PRIV_KORRIDOR_M} m Abstand sowie als hofnahe Agri-PV bis ${fmt(AGRI.privilegierungHa, 1)} ha Grundfläche.** Dann genügt eine Baugenehmigung, sofern öffentliche Belange nicht entgegenstehen.`,
        },
        {
          typ: "tabelle",
          caption: "Privilegierte Solaranlagen im Außenbereich nach § 35 Abs. 1 BauGB (Stand September 2026)",
          kopf: ["Tatbestand", "Voraussetzungen", "Praxis"],
          zeilen: [
            [
              "Nr. 8 b: Korridor an Verkehrswegen",
              `Fläche längs von Autobahnen oder Schienenwegen des übergeordneten Netzes mit mindestens zwei Hauptgleisen, bis ${PRIV_KORRIDOR_M} m Entfernung`,
              "Baugenehmigung statt B-Plan; öffentliche Belange (Naturschutz, Landschaftsbild, Wasser) werden trotzdem geprüft",
            ],
            [
              "Nr. 9: besondere Solaranlage (Agri-PV)",
              `Räumlich-funktionaler Zusammenhang mit einem land- oder forstwirtschaftlichen Betrieb, Grundfläche höchstens ${fmt(AGRI.privilegierungHa * 10000)} m², je Hofstelle oder Betriebsstandort nur eine Anlage`,
              `Für Landwirte interessant, die selbst investieren; Größe reicht je nach Bauart für rund ${fmt(AGRI.privilegierungHa / BAUART.agriVertikal.haProMwp, 1)} bis ${fmt(AGRI.privilegierungHa / BAUART.agriHoch.haProMwp, 1)} MWp`,
            ],
            [
              "Alle übrigen Freiflächen",
              "keine Privilegierung",
              "Bebauungsplan erforderlich",
            ],
          ],
          minBreite: 680,
          fussnote: "Quelle: § 35 Abs. 1 Nr. 8 und 9 BauGB (gesetze-im-internet.de, abgerufen 09/2026). Auch privilegierte Vorhaben brauchen eine Rückbauverpflichtung nach § 35 Abs. 5 BauGB. Die Privilegierung sagt nichts über die EEG-Förderfähigkeit aus.",
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: `Nicht verwechseln: ${PRIV_KORRIDOR_M} m im Baurecht, ${EEG_RANDSTREIFEN_M} m im EEG`,
          text: `Die baurechtliche Privilegierung reicht nur ${PRIV_KORRIDOR_M} m weit. Die EEG-Förderkulisse für [Randstreifen](/wissen/lexikon#randstreifen) umfasst dagegen Flächen bis ${EEG_RANDSTREIFEN_M} m an Autobahnen und Schienenwegen (§ 37 Abs. 1 Nr. 2 c EEG). Eine Fläche in 350 m Abstand ist also förderfähig, braucht aber einen Bebauungsplan. Details zur [Privilegierung im Außenbereich](/wissen/lexikon#privilegierung-aussenbereich) im Lexikon. Diese Übersicht ersetzt keine Rechtsberatung im Einzelfall.`,
        },
        {
          typ: "p",
          text: "Auch im Korridor wählen viele Gemeinden und Projektierer bewusst einen Bebauungsplan: Er schafft Rechtssicherheit gegenüber Nachbarn, regelt Ausgleich und Eingrünung verbindlich und erleichtert die Finanzierung. Für hofnahe [Agri-PV](/agri-pv) nach DIN SPEC 91434 ist die Privilegierung dagegen oft der schnellere Weg – mehr dazu im Ratgeber [DIN SPEC 91434](/ratgeber/agri-pv-din-spec-91434).",
        },
      ],
    },
    {
      id: "rahmen",
      titel: "Raumordnung, Regionalplan und städtebaulicher Vertrag",
      tocLabel: "Raumordnung & Vertrag",
      bloecke: [
        {
          typ: "p",
          text: "**Bauleitpläne müssen an die Ziele der Raumordnung angepasst werden (§ 1 Abs. 4 BauGB) – ein Vorranggebiet für Landwirtschaft oder Rohstoffabbau im Regionalplan kann einen Solarpark deshalb blockieren.** Viele Regionalpläne weisen inzwischen Vorbehalts- oder Vorranggebiete für Freiflächen-PV aus oder enthalten Kriterien, etwa zur Bodengüte oder zur maximalen Flächengröße.",
        },
        {
          typ: "liste",
          punkte: [
            "**Ziel der Raumordnung steht entgegen:** Dann ist ein Zielabweichungsverfahren bei der Landes- oder Regionalplanungsbehörde nötig. Es dauert oft mehrere Monate und ist nicht immer erfolgreich.",
            "**Grundsatz der Raumordnung:** Muss in der Abwägung berücksichtigt werden, blockiert aber nicht zwingend.",
            "**Landesrecht:** Einige Länder haben Leitfäden oder Erlasse zur Standortwahl, zu Bodenpunkten oder zur Größe von Freiflächenanlagen. Diese sind rechtlich unterschiedlich verbindlich – der Blick in den Landesentwicklungsplan gehört an den Anfang.",
          ],
        },
        { typ: "h3", text: "Städtebaulicher Vertrag nach § 11 BauGB" },
        {
          typ: "p",
          text: "Die Gemeinde trägt die Planungskosten nicht selbst. Im **städtebaulichen Vertrag** übernimmt der Projektierer die Kosten für Planungsbüro, Gutachten und Ausgleichsmaßnahmen, verpflichtet sich zur Umsetzung von Eingrünung und Ausgleich und häufig auch zum Rückbau. Der Vertrag braucht Schriftform, und die vereinbarten Leistungen müssen den gesamten Umständen nach angemessen sein. Oft wird er vor oder kurz nach dem Aufstellungsbeschluss geschlossen.",
        },
        {
          typ: "p",
          text: `Davon zu trennen ist die **Kommunalbeteiligung nach § 6 EEG**: Betreiber dürfen der Gemeinde bis zu ${fmt(KOMMUNE.beteiligungCt, 1)} ct je eingespeister Kilowattstunde zahlen. Bei einem 10-MWp-Park in Süddeutschland mit rund ${fmt(REGION.ertrag)} kWh/kWp wären das etwa **${fmtEur(KOMMUNAL_EUR)} pro Jahr**. Hinzu kommt die Gewerbesteuer, die bei Solaranlagen zu ${fmt(KOMMUNE.gewerbesteuerStandort * 100)} % der Standortgemeinde zusteht. Wie Gemeinden profitieren, zeigt die Seite für [Kommunen](/kommunen) und der [Kommunal-Rechner](/rechner/kommune).`,
        },
      ],
    },
    {
      id: "beispiel",
      titel: "Praxisbeispiel: Zeitplan und Kosten für 10 MWp",
      tocLabel: "Praxisbeispiel",
      bloecke: [
        {
          typ: "p",
          text: `**Für einen typischen 10-MWp-Solarpark auf rund ${fmt(HA, 0)} ha Acker in Süddeutschland sollten Sie bis zur Baureife mit etwa ${fmt(monate("flaeche") / 12, 1)} Jahren und Entwicklungskosten von ${fmtEur(ENTW_MIN)} bis ${fmtEur(ENTW_MAX)} rechnen.** Die Spanne ergibt sich aus unseren Annahmen von ${FREIFLAECHE.entwicklungProKwp.min} bis ${FREIFLAECHE.entwicklungProKwp.max} € je kWp für Planung, Gutachten, B-Plan und Netzplanung.`,
        },
        {
          typ: "tabelle",
          caption: "Beispielzeitplan eines 10-MWp-Projekts nach Entwicklungsphasen (Orientierungswerte)",
          kopf: ["Phase", "Monate bis Baureife", "Risiko", "Typischer Projektwert €/kWp"],
          zeilen: PHASEN.filter((p) => p.id !== "cod").map((p) => [
            p.label,
            p.monateBisRtb === 0 ? "erreicht" : `~${p.monateBisRtb}`,
            p.risiko,
            `${p.preisProKwp.min}–${p.preisProKwp.max} €`,
          ]),
          hervorheben: 1,
          minBreite: 620,
          fussnote: "Orientierungswerte der ÖkoInvest-Phasenbewertung (DACH 2025/26), breite Spannen je nach Netzanschluss, Größe, Standort und Vermarktung. Keine Bewertung eines konkreten Projekts.",
        },
        {
          typ: "p",
          text: "Die Tabelle zeigt, warum der Satzungsbeschluss ein so wichtiger Meilenstein ist: Mit Baurecht sinkt das Risiko deutlich, und der Wert der [Projektrechte](/wissen/lexikon#projektrechte) steigt. Wer ein Projekt vor der Baureife verkaufen oder zukaufen will, sollte die Verfahrensakte genau prüfen – worauf es ankommt, beschreibt der Ratgeber [Projektrechte kaufen: Due Diligence](/ratgeber/projektrechte-kaufen-due-diligence).",
        },
        {
          typ: "tool",
          href: "/rechner/projektbewertung",
          titel: "Was ist Ihr Projekt in der jeweiligen Phase wert?",
          text: "Leistung, Entwicklungsstand und Netzsituation eingeben – der Rechner zeigt eine Wertspanne je kWp.",
          label: "Zur Projektbewertung",
        },
      ],
    },
    {
      id: "stolpersteine",
      titel: "Typische Stolpersteine im Genehmigungsverfahren",
      tocLabel: "Stolpersteine",
      bloecke: [
        { typ: "p", text: "**Die meisten Solarparks scheitern oder verzögern sich an wenigen, gut bekannten Punkten.** Wer sie früh prüft, spart Monate:" },
        {
          typ: "checkliste",
          punkte: [
            "**Kein Netzanschluss in Reichweite:** Ohne belastbare [Netzanschlusszusage](/wissen/lexikon#netzanschlusszusage) ist Baurecht wenig wert. Die Netzanfrage gehört an den Anfang, nicht ans Ende.",
            "**Gemeinderat nicht mitgenommen:** Ein Aufstellungsbeschluss, der knapp zustande kommt, kann in der Abwägung kippen. Frühzeitige Information, Bürgerabende und ein klares Beteiligungsangebot helfen.",
            "**Artenschutz zu spät kartiert:** Eine verpasste Brutsaison verschiebt den Satzungsbeschluss um bis zu ein Jahr.",
            "**Raumordnung übersehen:** Vorranggebiete im Regionalplan erfordern ein Zielabweichungsverfahren.",
            "**Unvollständige Flächensicherung:** Fehlt ein Flurstück in der Mitte oder die Leitungstrasse zum Einspeisepunkt, wird es teuer. Dienstbarkeiten für die Kabeltrasse früh sichern.",
            "**Formfehler bei Bekanntmachung oder Veröffentlichung:** Sie können den B-Plan angreifbar machen. Erfahrene Planungsbüros vermeiden das.",
            "**Blendwirkung und Wasserschutz:** An Straßen, Bahnlinien und Flugplätzen sind Blendgutachten Standard; in Wasserschutzgebieten gelten Auflagen.",
          ],
        },
        {
          typ: "kasten",
          variant: "info",
          titel: "Österreich und Schweiz funktionieren anders",
          text: "In Österreich entscheidet die Flächenwidmung „Grünland-Photovoltaik“ nach Landesraumordnungsrecht, ab bestimmten Größen kommt eine UVP hinzu – siehe [Freiflächen-PV in Österreich](/ratgeber/freiflaechen-pv-oesterreich). In der Schweiz sind Freiflächenanlagen außerhalb der Bauzonen nur eng begrenzt möglich; mehr unter [Freiflächen-PV in der Schweiz](/ratgeber/freiflaechen-pv-schweiz).",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So gehen Sie als Flächeneigentümer oder Projektierer vor",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Fläche vorprüfen", "Größe, Zuschnitt, Bodengüte, Schutzgebiete, Abstand zu Autobahn/Bahn und Netz. Eine erste Einschätzung liefert der [Flächencheck](/flaechencheck)."],
            ["Netz und Raumordnung klären", "Netzanfrage beim Netzbetreiber stellen und den Regionalplan auf Vorrang- oder Ausschlussgebiete prüfen."],
            ["Gemeinde früh einbinden", "Projekt im Rathaus vorstellen, Beteiligungsmodell und Kommunalbeteiligung skizzieren, städtebaulichen Vertrag vorbereiten."],
            ["Aufstellungsbeschluss und Kartierung", "Aufstellungsbeschluss erwirken und die Artenschutzkartierung saisonal passend starten."],
            ["Entwurf, Veröffentlichung, Abwägung", "Planungsbüro erstellt Entwurf und Umweltbericht; Stellungnahmen sauber abarbeiten."],
            ["Satzungsbeschluss und Baugenehmigung", "Nach Bekanntmachung Bauantrag stellen, Netzanschlussvertrag und Finanzierung abschließen – damit ist das Projekt baureif (RTB)."],
          ],
        },
        {
          typ: "p",
          text: "Wie ÖkoInvest Projekte entlang dieser Schritte entwickelt und wann Flächeneigentümer welche Entscheidungen treffen, zeigt die Seite zum [Projektablauf](/prozess). Wer seine Fläche lieber verpachtet, findet unter [Fläche verpachten](/flaeche-verpachten) den Einstieg.",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Wie lange dauert die Genehmigung eines Solarparks?",
      a: `Vom Aufstellungsbeschluss bis zum Satzungsbeschluss vergehen meist 12 bis 24 Monate. Bis zur vollständigen Baureife rechnen wir ab Aufstellungsbeschluss mit rund ${monate("aufstellung")} Monaten, ab Flächensicherung mit rund ${monate("flaeche")} Monaten. Artenschutzkartierungen und Sitzungstermine bestimmen das Tempo.`,
    },
    {
      q: "Kann die Gemeinde einen Solarpark ablehnen?",
      a: "Ja. Die Gemeinde hat Planungshoheit, und es gibt keinen Anspruch auf einen Bebauungsplan. Außerhalb des privilegierten 200-m-Korridors und der hofnahen Agri-PV kann ein Solarpark ohne Zustimmung des Gemeinderats nicht entstehen.",
    },
    {
      q: "Wer bezahlt den Bebauungsplan für einen Solarpark?",
      a: "In der Praxis der Projektierer. Er übernimmt über einen städtebaulichen Vertrag nach § 11 BauGB die Kosten für Planungsbüro, Gutachten und Ausgleich. Für Flächeneigentümer, die nur verpachten, entstehen in der Regel keine Planungskosten.",
    },
    {
      q: "Ist Photovoltaik an der Autobahn genehmigungsfrei?",
      a: `Nein. Im Korridor bis ${PRIV_KORRIDOR_M} m an Autobahnen und zweigleisigen Hauptbahnstrecken ist die Anlage im Außenbereich privilegiert, braucht also keinen Bebauungsplan – eine Baugenehmigung ist aber weiterhin nötig, und öffentliche Belange werden geprüft.`,
    },
    {
      q: "Was ist der Unterschied zwischen Aufstellungs- und Satzungsbeschluss?",
      a: "Der [Aufstellungsbeschluss](/wissen/lexikon#aufstellungsbeschluss) startet das Verfahren, der [Satzungsbeschluss](/wissen/lexikon#satzungsbeschluss) beendet es. Rechtskräftig wird der Bebauungsplan erst mit der Bekanntmachung nach § 10 Abs. 3 BauGB.",
    },
    {
      q: "Brauche ich für einen Solarpark eine Umweltverträglichkeitsprüfung?",
      a: "Im Bebauungsplanverfahren ist grundsätzlich eine Umweltprüfung mit Umweltbericht vorgesehen. Eine gesonderte UVP nach UVPG ist für Freiflächen-PV in Deutschland nach aktuellem Stand in der Regel nicht vorgeschrieben; Landesrecht und Einzelfall können abweichen.",
    },
  ],

  passend: [
    { href: "/ratgeber/eeg-ausschreibung-freiflaeche", titel: "EEG-Ausschreibung Freifläche", text: "Gebotstermine, Zuschlagswerte und Sicherheiten." },
    { href: "/ratgeber/pachtvertrag-solarpark", titel: "Pachtvertrag Solarpark", text: "Welche Klauseln Flächeneigentümer kennen sollten." },
    { href: "/ratgeber/projektrechte-kaufen-due-diligence", titel: "Projektrechte kaufen", text: "Due Diligence vor dem Erwerb eines Projekts." },
    { href: "/flaechencheck", titel: "Flächencheck", text: "Eignet sich Ihre Fläche für einen Solarpark?" },
  ],

  quellen: [
    { titel: "Baugesetzbuch § 35 – Bauen im Außenbereich", url: "https://www.gesetze-im-internet.de/bbaug/__35.html", stand: "09/2026" },
    { titel: "Baugesetzbuch § 3 – Beteiligung der Öffentlichkeit", url: "https://www.gesetze-im-internet.de/bbaug/__3.html", stand: "09/2026" },
    { titel: "Baugesetzbuch § 8 – Zweck des Bebauungsplans (Parallelverfahren)", url: "https://www.gesetze-im-internet.de/bbaug/__8.html", stand: "09/2026" },
    { titel: "Baugesetzbuch § 10 – Beschluss, Genehmigung und Inkrafttreten", url: "https://www.gesetze-im-internet.de/bbaug/__10.html", stand: "09/2026" },
    { titel: "Baugesetzbuch § 11 – Städtebaulicher Vertrag", url: "https://www.gesetze-im-internet.de/bbaug/__11.html", stand: "09/2026" },
    { titel: "Bundesnaturschutzgesetz § 44 – Vorschriften für besonders geschützte Arten", url: "https://www.gesetze-im-internet.de/bnatschg_2009/__44.html", stand: "09/2026" },
    { titel: "EEG 2023 § 37 – Gebote für Solaranlagen des ersten Segments", url: "https://www.gesetze-im-internet.de/eeg_2014/__37.html", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Ausschreibungsverfahren Solaranlagen erstes Segment", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/Ausschreibungsverfahren/start.html", stand: "09/2026" },
  ],

  seitenCta: { titel: "Eignet sich Ihre Fläche?", text: "Größe, Lage, Netz und Planungsrecht in wenigen Minuten vorprüfen.", href: "/flaechencheck", label: "Zum Flächencheck" },
  cta: {
    title: "Ihre Fläche, unser Planungsweg.",
    text: "Wir prüfen Planungsrecht, Netz und Raumordnung Ihrer Fläche und sagen offen, ob und wann ein Solarpark realistisch ist.",
    primary: { label: "Fläche prüfen lassen", href: "/flaechencheck" },
    secondary: { label: "Projektablauf ansehen", href: "/prozess" },
  },
};

export default artikel;
