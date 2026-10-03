// Ratgeber: Solarpark – Umweltprüfung, Artenschutz, Biodiversitätskriterien im EEG, Zaun, Wild und Jagd
// Recherchestand 29.09.2026 (BauGB §§ 1a, 2 Abs. 4; BNatSchG § 44; EEG 2023 § 37 Abs. 1a;
// BJagdG § 6; NABU-Metakurzstudie Solarparks und Vögel des Offenlands 03/2022;
// DJV-Broschüre „Wildtierverträgliche Freiflächen-Photovoltaikanlagen“ 01/2026).
// Keine Rechtsberatung – Text bewusst vorsichtig formuliert.

import { FREIFLAECHE, STAND } from "@/lib/invest/markt";
import { fmt, fmtPct } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
// EEG 2023 § 37 Abs. 1a: mind. 3 von 5 Kriterien; Modulgrundfläche höchstens 60 %,
// Biotopelemente auf mind. 10 %, Wanderkorridore für Großsäuger ab Seitenlänge > 500 m.
const EEG_KRITERIEN_MIN = 3;
const EEG_MODULFLAECHE_MAX = 0.6;
const EEG_BIOTOP_MIN = 0.1;
const EEG_SEITENLAENGE_M = 500;
// DJV-Broschüre (01/2026): Zaun-Bodenabstand 15–20 cm; Niederwilddurchlässe mind. 15 × 15 cm alle 10–15 m;
// Wildtierkorridore i. d. R. 50 m breit (bei Längen < 100 m oft 30 m ausreichend).
const DJV_BODENABSTAND_CM = { min: 15, max: 20 };
const DJV_DURCHLASS_CM = 15;
const DJV_DURCHLASS_ABSTAND_M = { min: 10, max: 15 };
const DJV_KORRIDOR_BREITE_M = 50;
const DJV_KORRIDOR_KURZ_M = 30;
// NABU-Metakurzstudie (03/2022): Beispiel „Grünfenster“ im Modulfeld von mind. 30 m × 30 m.
const NABU_GRUENFENSTER_M = 30;

const MWP = 20;
const HA = MWP * FREIFLAECHE.haProMwp;

const artikel = {
  slug: "solarpark-artenschutz-biodiversitaet",
  title: "Solarpark und Artenschutz: Feldlerche, Biodiversität und Zaun",
  seoTitle: "Solarpark Artenschutz & Biodiversität | ÖkoInvest",
  kurzTitel: "Artenschutz und Biodiversität",
  description:
    "Solarpark und Artenschutz: Umweltbericht, § 44 BNatSchG, Feldlerche und CEF-Maßnahmen, die EEG-Biodiversitätskriterien sowie Zaun, Wildkorridore und Jagd.",
  excerpt:
    "Welche Naturschutzprüfungen ein Solarpark durchläuft, wie Bodenbrüter geschützt werden, welche drei von fünf Biodiversitätskriterien das EEG verlangt und was Zaun, Wild und Jagd betrifft.",
  hauptKeyword: "solarpark artenschutz",
  keywords: [
    "Solarpark Artenschutz",
    "Biodiversität Solarpark",
    "Feldlerche Solarpark",
    "CEF-Maßnahmen Photovoltaik",
    "§ 37 Abs. 1a EEG Biodiversität",
    "Solarpark Zaun Kleintierdurchlass",
    "Solarpark Jagd befriedeter Bezirk",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Recht & Genehmigung",
  bild: "/img/solarpark-himmel.jpg",
  bildAlt: "Lange Reihen aufgeständerter Solarmodule auf einer Wiesenfläche unter blauem Himmel mit Schleierwolken",
  badge: { wert: `${EEG_KRITERIEN_MIN} von 5`, text: "Biodiversitätskriterien für EEG-Gebote auf Freiflächen" },

  kurzFazit: [
    "**Jeder Solarpark mit Bebauungsplan durchläuft eine Umweltprüfung mit Umweltbericht, die Eingriffsregelung und eine artenschutzrechtliche Prüfung nach § 44 BNatSchG.** Die Kartierung ist an Brutzeiten gebunden und bestimmt oft den Zeitplan.",
    "Auf Äckern ist die **Feldlerche** die häufigste Konfliktart. Sie besiedelt manche Solarparks, andere meidet sie; breite besonnte Reihenabstände, offene Teilflächen und vorgezogene Ausgleichsmaßnahmen (CEF) sind die gängigen Lösungen.",
    `Für EEG-Gebote auf Freiflächen verlangt § 37 Abs. 1a EEG, dass die Anlage **mindestens ${EEG_KRITERIEN_MIN} von 5 naturschutzfachlichen Kriterien** erfüllen soll – etwa höchstens ${fmtPct(EEG_MODULFLAECHE_MAX, 0)} Modulgrundfläche oder Biotopelemente auf mindestens ${fmtPct(EEG_BIOTOP_MIN, 0)} der Fläche.`,
    `Zäune mit **${DJV_BODENABSTAND_CM.min}–${DJV_BODENABSTAND_CM.max} cm Bodenabstand** oder Durchlässen halten den Park für Kleintiere offen; bei Seitenlängen über ${EEG_SEITENLAENGE_M} m sind Wanderkorridore für Großsäuger ein EEG-Kriterium.`,
    "Eingezäunte Solarparks können **befriedete Bezirke** werden, in denen die Jagd ruht. Das regeln die Länder unterschiedlich – Jagdgenossenschaft und Jagdpächter früh einbinden.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Welche Naturschutzprüfungen braucht ein Solarpark?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Ein Solarpark mit Bebauungsplan braucht in Deutschland eine Umweltprüfung mit [Umweltbericht](/wissen/lexikon#umweltbericht), die Bilanzierung von Eingriff und Ausgleich und eine artenschutzrechtliche Prüfung; in oder nahe Natura-2000-Gebieten kommt eine Verträglichkeitsprüfung hinzu.** Wer an der EEG-Ausschreibung teilnehmen will, muss zusätzlich die Biodiversitätskriterien des § 37 Abs. 1a EEG einplanen.",
        },
        {
          typ: "p",
          text: "Diese Prüfungen sind kein Selbstzweck: Intensiv genutzte Äcker sind oft artenarm, und ein extensiv gepflegter Solarpark kann sie ökologisch aufwerten. Gleichzeitig können Offenlandarten wie Feldlerche oder Kiebitz Lebensraum verlieren. Die Kunst liegt darin, beides zu erkennen und das Layout danach auszurichten. Wie die Gutachten in das Planverfahren eingebettet sind, zeigt der Ratgeber [Genehmigung und Bebauungsplan](/wissen/ratgeber/solarpark-genehmigung-bebauungsplan).",
        },
        {
          typ: "tabelle",
          caption: `Naturschutzfachliche Prüfungen für Freiflächen-Solarparks in Deutschland, Stand ${STAND}`,
          kopf: ["Instrument", "Rechtsgrundlage", "Leitfrage", "Ergebnis"],
          zeilen: [
            ["Umweltprüfung und Umweltbericht", "§ 2 Abs. 4, § 2a BauGB", "Welche Auswirkungen hat der Plan auf Boden, Wasser, Tiere, Pflanzen, Landschaft, Menschen?", "Umweltbericht als Teil der Planbegründung"],
            ["Eingriffsregelung", "§ 1a Abs. 3 BauGB, BNatSchG", "Wie stark wird der Naturhaushalt beeinträchtigt, wie wird ausgeglichen?", "Bilanz und Ausgleichsmaßnahmen, oft innerhalb des Parks"],
            ["Artenschutzrechtliche Prüfung", "§ 44 BNatSchG", "Werden Tiere getötet, erheblich gestört oder Fortpflanzungsstätten zerstört?", "Vermeidung, Bauzeitenregelung, CEF-Maßnahmen"],
            ["Natura-2000-Verträglichkeit", "§ 34 BNatSchG, § 1a Abs. 4 BauGB", "Werden Erhaltungsziele eines Schutzgebiets erheblich beeinträchtigt?", "Vorprüfung, ggf. Verträglichkeitsprüfung"],
            ["EEG-Biodiversitätskriterien", "§ 37 Abs. 1a EEG", "Erfüllt die Anlage mindestens drei von fünf Kriterien?", "Voraussetzung für Gebote in der Ausschreibung"],
          ],
          minBreite: 760,
          fussnote: "Für große Vorhaben kann nach dem UVPG zusätzlich eine UVP-Vorprüfung oder UVP erforderlich sein; im Bebauungsplanverfahren wird sie in der Regel über die Umweltprüfung abgedeckt. Siehe [UVP](/wissen/lexikon#uvp) im Lexikon.",
        },
      ],
    },
    {
      id: "artenschutz",
      titel: "Artenschutz nach § 44 BNatSchG: Was geprüft wird",
      tocLabel: "Artenschutz § 44",
      bloecke: [
        {
          typ: "p",
          text: "**§ 44 Abs. 1 BNatSchG verbietet, besonders geschützte Tiere zu töten, streng geschützte Arten und europäische Vogelarten während sensibler Zeiten erheblich zu stören und ihre Fortpflanzungs- oder Ruhestätten zu beschädigen oder zu zerstören.** Diese Verbote gelten unabhängig von der Abwägung der Gemeinde – ein Bebauungsplan, dessen Umsetzung zwangsläufig gegen sie verstößt, ist nicht vollziehbar.",
        },
        {
          typ: "p",
          text: "Für zulässige Eingriffe und Vorhaben im Bebauungsplan enthält § 44 Abs. 5 BNatSchG eine wichtige Erleichterung: Ein Verstoß gegen das Verbot, Fortpflanzungs- und Ruhestätten zu beschädigen, liegt nicht vor, soweit deren ökologische Funktion im räumlichen Zusammenhang weiterhin erfüllt wird. Dafür können **vorgezogene Ausgleichsmaßnahmen** festgesetzt werden – die sogenannten [CEF-Maßnahmen](/wissen/lexikon#cef-massnahme). Sie müssen wirksam sein, bevor der Eingriff beginnt.",
        },
        {
          typ: "h3",
          text: "Welche Arten auf Freiflächen typisch sind",
        },
        {
          typ: "karten",
          cols: 3,
          items: [
            { titel: "Feldlerche und Bodenbrüter", text: "Feldlerche, Kiebitz, Rebhuhn, Wachtel und Schafstelze brüten am Boden in offener Feldflur. Sie reagieren auf Vertikalstrukturen und Beschattung." },
            { titel: "Reptilien und Amphibien", text: "Zauneidechse an Böschungen und Bahndämmen, Amphibien an Gräben und Senken. Sie brauchen Versteck- und Sonnenplätze und durchlässige Zäune." },
            { titel: "Säugetiere", text: "Feldhamster auf fruchtbaren Lössböden, Feldhase, Reh- und Rotwild. Relevant sind Wanderbeziehungen und die Durchlässigkeit der Einzäunung." },
          ],
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Kartierung bestimmt den Zeitplan",
          text: "Brutvögel werden in der Regel von etwa März bis Juli an mehreren Terminen kartiert, Reptilien und Amphibien in eigenen Zeitfenstern. Wer den Aufstellungsbeschluss im Sommer fasst, wartet unter Umständen fast ein Jahr auf verwertbare Daten. Die Baufeldfreimachung wird üblicherweise außerhalb der Brutzeit geplant oder durch Vergrämungsmaßnahmen abgesichert.",
        },
      ],
    },
    {
      id: "feldlerche",
      titel: "Feldlerche im Solarpark: Was die Praxis zeigt",
      tocLabel: "Feldlerche",
      bloecke: [
        {
          typ: "p",
          text: "**Ob die Feldlerche einen Solarpark besiedelt, hängt stark von Reihenabstand, Pflege und Größe offener Teilflächen ab – die Befunde reichen von deutlich höheren bis zu deutlich geringeren Dichten als vorher.** Die Art gilt in Deutschland als gefährdet und ist deshalb in fast jedem Artenschutzgutachten auf Ackerstandorten Thema.",
        },
        {
          typ: "p",
          text: `Eine Metakurzstudie des NABU (2022), die Monitoringberichte von Genehmigungsbehörden auswertete, dokumentiert beides: Parks, in denen Feldlerchen im Modulbereich häufiger waren als auf dem umliegenden Maisacker, und Parks, in denen die Häufigkeit stark zurückging oder die Art fehlte. Positiv wirkten extensive Pflege, späte Mahd nach der Brutzeit und unbebaute „Grünfenster“ von mindestens ${NABU_GRUENFENSTER_M} × ${NABU_GRUENFENSTER_M} m im Modulfeld. Enge Reihen mit dauerhaft verschatteten Streifen sind dagegen ungünstig.`,
        },
        {
          typ: "tabelle",
          caption: "Maßnahmen für Feldlerche und andere Bodenbrüter im Überblick",
          kopf: ["Maßnahme", "Wirkung", "Zielkonflikt"],
          zeilen: [
            ["Breitere, besonnte Reihenabstände", "Brut- und Nahrungsflächen zwischen den Modulreihen", "weniger Leistung je Hektar, höhere Pacht- und Netzkosten je kWp"],
            [`Grünfenster ohne Module (z. B. ${NABU_GRUENFENSTER_M} × ${NABU_GRUENFENSTER_M} m)`, "offene Flächen innerhalb des Parks", "Flächenverlust, Kabelführung um die Fenster"],
            ["Späte Mahd bzw. angepasste Beweidung", "keine Gelegeverluste in der Brutzeit", "Pflegekosten, Futterqualität"],
            ["CEF-Maßnahmen außerhalb (Blühstreifen, Lerchenfenster, Brache)", "Ersatzlebensraum vor Baubeginn", "zusätzliche Fläche, Sicherung über 30 Jahre nötig"],
            ["Keine hohen Gehölze in offener Feldflur", "vermeidet Meideverhalten gegenüber Vertikalstrukturen", "weniger Sichtschutz zu Wohnhäusern"],
          ],
          hervorheben: 1,
          minBreite: 700,
          fussnote: "Welche Maßnahme im Einzelfall anerkannt wird, entscheidet die Naturschutzbehörde auf Grundlage des Gutachtens. Die Wirksamkeit von CEF-Maßnahmen wird häufig durch ein Monitoring belegt.",
        },
        {
          typ: "p",
          text: "Der Zielkonflikt mit dem Sichtschutz ist real: Die Hecke, die Anwohner vor Blendung schützt, kann Feldlerchen vergrämen. Wie man beides abwägt, zeigt der Ratgeber [Abstand zur Wohnbebauung und Blendgutachten](/wissen/ratgeber/solarpark-abstand-wohnbebauung-blendgutachten).",
        },
      ],
    },
    {
      id: "eeg-kriterien",
      titel: "Biodiversitäts-PV: Die fünf Kriterien des § 37 Abs. 1a EEG",
      tocLabel: "EEG-Kriterien",
      bloecke: [
        {
          typ: "p",
          text: `**Gebote für Freiflächenanlagen und Anlagen auf sonstigen baulichen Anlagen dürfen in der EEG-Ausschreibung nur abgegeben werden, wenn die Anlagen mindestens ${EEG_KRITERIEN_MIN} von 5 naturschutzfachlichen Kriterien erfüllen sollen (§ 37 Abs. 1a EEG).** Die Regel wurde mit dem Solarpaket I eingeführt und gilt für das erste Segment der Solarausschreibungen.`,
        },
        {
          typ: "tabelle",
          caption: "Naturschutzfachliche Mindestkriterien nach § 37 Abs. 1a EEG (mindestens drei sind zu erfüllen)",
          kopf: ["Nr.", "Kriterium", "Anforderung laut Gesetz", "Praxis"],
          zeilen: [
            ["1", "Modulgrundfläche", `höchstens ${fmtPct(EEG_MODULFLAECHE_MAX, 0)} der Grundfläche des Gesamtvorhabens`, "durch Reihenabstände und Randflächen oft erreichbar; Layout prüfen"],
            ["2", "Pflegekonzept", "Mahd höchstens zweischürig mit Abräumen des Mahdguts oder Portionsweide mit angepasster Besatzdichte", "Schafbeweidung oder Mahd nach Brutzeit"],
            ["3", "Durchgängigkeit für Tiere", `Wanderkorridore für Großsäuger bei mehr als ${EEG_SEITENLAENGE_M} m Seitenlänge und Durchgängigkeit für kleinere Arten`, "Zaun mit Bodenabstand, Korridore zwischen Teilflächen"],
            ["4", "Biotopelemente", `standortangepasste Biotopelemente auf mindestens ${fmtPct(EEG_BIOTOP_MIN, 0)} der Anlagenfläche`, "Hecken, Blühflächen, Stein- und Totholzhaufen, Kleingewässer"],
            ["5", "Bodenschonender Betrieb", "keine Pflanzenschutz- oder Düngemittel; Reinigungsmittel nur biologisch abbaubar und nur wenn nötig", "bei den meisten Parks ohnehin üblich"],
          ],
          hervorheben: 2,
          minBreite: 760,
          fussnote: "Quelle: § 37 Abs. 1a EEG 2023 (gesetze-im-internet.de, abgerufen 09/2026). Die gewählten Kriterien sollten im Bebauungsplan oder im städtebaulichen Vertrag verbindlich festgeschrieben werden, damit sie über die Laufzeit nachweisbar sind.",
        },
        {
          typ: "p",
          text: `Der Begriff **Biodiversitäts-PV** wird in der Praxis für Parks verwendet, die deutlich über diese Mindestkriterien hinausgehen – etwa mit großen Biotopflächen, Kleingewässern und einem langfristigen Monitoring. Für die Wirtschaftlichkeit ist vor allem Kriterium 1 relevant: Bei einer üblichen Belegung von rund ${fmt(FREIFLAECHE.haProMwp, 1)} ha je MWp bleibt meist Spielraum, bei sehr dichter Ost-West-Belegung kann es eng werden. Wie die Ausschreibung insgesamt funktioniert, erklärt der Ratgeber [EEG-Ausschreibung für Freiflächen](/wissen/ratgeber/eeg-ausschreibung-freiflaeche); welche Flächen überhaupt bieten dürfen, regelt die [Flächenkulisse](/wissen/lexikon#flaechenkulisse).`,
        },
      ],
    },
    {
      id: "ausgleich",
      titel: "Eingriffsregelung: Ausgleich im Park oder außerhalb",
      tocLabel: "Ausgleich",
      bloecke: [
        {
          typ: "p",
          text: "**Weil ein Solarpark den Boden kaum versiegelt und Acker häufig in extensives Grünland umwandelt, lässt sich der naturschutzrechtliche Ausgleich in vielen Fällen ganz oder überwiegend innerhalb der Anlagenfläche erbringen.** Wie der Eingriff bilanziert wird, regeln die Länder und oft die Kreise mit eigenen Leitfäden und Bewertungsverfahren.",
        },
        {
          typ: "p",
          text: "Typische Maßnahmen sind die Einsaat mit regionalem Saatgut, Blühstreifen, Hecken am Rand und Kleinstrukturen für Reptilien. Reicht das nicht, kommen externe [Ausgleichsflächen](/wissen/lexikon#ausgleichsflaechen) hinzu, die für die Laufzeit gesichert werden müssen – oft über eine Dienstbarkeit. Für Flächeneigentümer ist wichtig: Werden Ausgleichsflächen auf Ihrem Grund festgelegt, sollte der Pachtvertrag regeln, wie lange sie nach dem Rückbau bestehen bleiben. Mehr dazu im Ratgeber [Rückbau und Rückbaubürgschaft](/wissen/ratgeber/solarpark-rueckbau-rueckbaubuergschaft).",
        },
        {
          typ: "p",
          text: "Die Pflege entscheidet über den Erfolg. Neben der Mahd ist die Beweidung mit Schafen verbreitet; Hinweise zu Besatz, Zaun und Verträgen gibt der Ratgeber [Beweidung mit Schafen](/wissen/ratgeber/solarpark-beweidung-schafe). Auf entwässerten Moorböden gelten im EEG eigene Regeln – dazu der Ratgeber [Moor-PV](/wissen/ratgeber/moor-pv).",
        },
      ],
    },
    {
      id: "zaun-wild",
      titel: "Zaun, Kleintierdurchlässe und Wildkorridore",
      tocLabel: "Zaun und Wild",
      bloecke: [
        {
          typ: "p",
          text: `**Solarparks werden aus Versicherungs- und Sicherheitsgründen fast immer eingezäunt; damit sie keine Barriere werden, braucht der Zaun Bodenabstand oder Durchlässe, und große Parks brauchen Wildkorridore.** Das EEG verlangt Wanderkorridore für Großsäuger als eines der fünf Kriterien, wenn eine Seite länger als ${EEG_SEITENLAENGE_M} m ist.`,
        },
        {
          typ: "tabelle",
          caption: "Orientierungswerte für wildtierverträgliche Einzäunung (Deutscher Jagdverband, 2026)",
          kopf: ["Element", "Orientierung", "Zweck"],
          zeilen: [
            ["Bodenabstand des Zauns", `${DJV_BODENABSTAND_CM.min}–${DJV_BODENABSTAND_CM.max} cm`, "Durchlass für Kleinsäuger, Amphibien und Reptilien"],
            ["Niederwilddurchlässe (z. B. bei wolfsicheren Zäunen)", `mind. ${DJV_DURCHLASS_CM} × ${DJV_DURCHLASS_CM} cm, alle ${DJV_DURCHLASS_ABSTAND_M.min}–${DJV_DURCHLASS_ABSTAND_M.max} m`, "Durchgängigkeit trotz dichtem Zaun"],
            ["Wildtierkorridor Breite", `in der Regel ${DJV_KORRIDOR_BREITE_M} m, bei Korridorlängen unter 100 m oft ${DJV_KORRIDOR_KURZ_M} m`, "Wechsel von Reh-, Schwarz- und Niederwild"],
            ["Abstand zwischen Korridoren", "je nach Landschaft unter 250 m bis 500 oder 750 m", "Verbund zwischen Lebensräumen erhalten"],
            ["Gestaltung", "strukturreich, trichterförmige Einläufe; Gehölzanteil je nach Umgebung", "Wild in den Korridor lenken, nicht an Straßen"],
          ],
          hervorheben: 1,
          minBreite: 640,
          fussnote: "Quelle: DJV, Wildtierverträgliche Freiflächen-Photovoltaikanlagen (01/2026). Empfehlungen eines Verbands, keine Rechtsnormen; maßgeblich sind Festsetzungen im Bebauungsplan und Auflagen der Behörden.",
        },
        {
          typ: "p",
          text: `Für einen Park mit ${MWP} MWp auf rund ${fmt(HA)} ha kann das bedeuten, die Fläche in zwei oder drei eingezäunte Teilfelder zu gliedern, zwischen denen ein Korridor offen bleibt. Das kostet Zaunmeter und etwas Fläche, erleichtert aber oft die Zustimmung von Naturschutzbehörde, Jägerschaft und Gemeinde. Bei Beweidung mit wolfsicheren Zäunen sind Durchlässe für kleinere Tiere besonders wichtig.`,
        },
      ],
    },
    {
      id: "jagd",
      titel: "Jagd im Solarpark: Befriedeter Bezirk und Jagdpacht",
      tocLabel: "Jagdrecht",
      bloecke: [
        {
          typ: "p",
          text: "**In befriedeten Bezirken ruht nach § 6 BJagdG die Jagd; ob ein eingezäunter Solarpark dazu zählt, bestimmt das jeweilige Landesjagdgesetz.** Mecklenburg-Vorpommern hat umzäunte Anlagen der Energiegewinnung wie Photovoltaikanlagen ausdrücklich als befriedete Bezirke eingestuft; andere Länder regeln das unterschiedlich, teils nur auf Antrag oder nach Einzelfallprüfung.",
        },
        {
          typ: "liste",
          punkte: [
            "**Jagdpacht:** Fällt eine größere Fläche aus dem Jagdbezirk, kann der Jagdpächter unter Umständen eine Anpassung der Jagdpacht verlangen. Unterschreitet ein Eigenjagdbezirk dadurch die Mindestgröße, kann er seinen Status verlieren.",
            "**Betreten:** Das Hausrecht in eingezäunten Anlagen liegt beim Betreiber. Für Nachsuchen verletzten Wildes und für die Regulierung von Raubwild sollten Absprachen oder eine Wildfolgevereinbarung getroffen werden.",
            "**Wildschaden und Wildwechsel:** Zäune verlagern Wildwechsel; ohne Korridore kann sich der Druck auf angrenzende Flächen und Straßen erhöhen.",
            "**Frühe Beteiligung:** Jagdgenossenschaft und Jagdpächter kennen Wechsel und Einstände – ihr Wissen verbessert das Layout.",
          ],
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Rechtslage vorsichtig einordnen",
          text: "Die Einstufung als befriedeter Bezirk und die Folgen für bestehende Jagdpachtverträge sind Landesrecht und hängen vom Einzelfall ab, etwa davon, ob die Anlage vollständig oder nur teilweise eingezäunt ist. Klären Sie die Frage mit der unteren Jagdbehörde, bevor Pacht- und Jagdverträge angepasst werden. Diese Übersicht ersetzt keine Rechtsberatung.",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "Vorgehen: Naturschutz von Anfang an einplanen",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Vorprüfung", "Schutzgebiete, Biotope, bekannte Artvorkommen und Wildkorridore abfragen. Eine erste Einschätzung zur Fläche liefert der [Flächencheck](/de/flaechencheck)."],
            ["Kartierung terminieren", "Brutvogel- und Reptilienkartierung so beauftragen, dass die Saison nicht verpasst wird."],
            ["Layout anpassen", "Reihenabstände, Grünfenster, Korridore und Zaun nach den Ergebnissen planen; EEG-Kriterien auswählen."],
            ["Ausgleich sichern", "CEF- und Ausgleichsmaßnahmen festlegen, Flächen vertraglich sichern, vor Baubeginn umsetzen."],
            ["Pflege und Monitoring", "Pflegekonzept, Mahdzeitpunkte oder Beweidung und Monitoring im städtebaulichen Vertrag festschreiben."],
          ],
        },
        {
          typ: "p",
          text: "Mehr zur technischen Seite von Solarparks finden Sie unter [Freiflächen-PV](/de/freiflaeche), für landwirtschaftliche Betriebe unter [Landwirte](/de/landwirte). Wer die Fläche weiter landwirtschaftlich nutzen möchte, findet mit [Agri-PV nach DIN SPEC 91434](/wissen/ratgeber/agri-pv-din-spec-91434) eine Alternative.",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Brauche ich für einen Solarpark ein Artenschutzgutachten?",
      a: "In aller Regel ja. Im Bebauungsplanverfahren prüft ein Fachbüro, ob Zugriffsverbote nach § 44 BNatSchG berührt sind, und kartiert dafür Brutvögel, Reptilien oder andere Arten. Die Kosten trägt der Projektierer.",
    },
    {
      q: "Verdrängt ein Solarpark die Feldlerche?",
      a: "Nicht zwangsläufig. Monitoringberichte zeigen sowohl Parks mit mehr als auch mit weniger Feldlerchen als vorher. Breite besonnte Reihenabstände, offene Teilflächen und späte Mahd verbessern die Chancen; wo das nicht reicht, sind CEF-Maßnahmen außerhalb nötig.",
    },
    {
      q: "Was sind CEF-Maßnahmen?",
      a: "Vorgezogene Ausgleichsmaßnahmen nach § 44 Abs. 5 BNatSchG. Sie schaffen Ersatzlebensraum, bevor der Eingriff beginnt, damit die ökologische Funktion der betroffenen Fortpflanzungsstätten erhalten bleibt – etwa Blühstreifen oder Lerchenfenster auf benachbarten Äckern.",
    },
    {
      q: "Welche Biodiversitätskriterien verlangt das EEG?",
      a: `Für Gebote in der Ausschreibung muss die Anlage mindestens ${EEG_KRITERIEN_MIN} von 5 Kriterien erfüllen sollen: höchstens ${fmtPct(EEG_MODULFLAECHE_MAX, 0)} Modulgrundfläche, biodiversitätsförderndes Pflegekonzept, Durchgängigkeit für Tiere, Biotopelemente auf mindestens ${fmtPct(EEG_BIOTOP_MIN, 0)} der Fläche und bodenschonender Betrieb.`,
    },
    {
      q: "Wie hoch muss der Zaun über dem Boden sein?",
      a: `Eine gesetzliche Einheitsvorgabe gibt es nicht. Der Deutsche Jagdverband nennt ${DJV_BODENABSTAND_CM.min} bis ${DJV_BODENABSTAND_CM.max} cm Bodenabstand als übliche Lösung für Kleintiere; maßgeblich sind die Festsetzungen im Bebauungsplan.`,
    },
    {
      q: "Darf im Solarpark gejagt werden?",
      a: "Das hängt vom Landesjagdrecht ab. Eingezäunte Anlagen können befriedete Bezirke sein, in denen die Jagd ruht und nur mit Ausnahmegenehmigung gejagt werden darf. Für Nachsuchen und Raubwildregulierung sollten Absprachen mit dem Betreiber getroffen werden.",
    },
  ],

  passend: [
    { href: "/wissen/ratgeber/solarpark-genehmigung-bebauungsplan", titel: "Genehmigung und Bebauungsplan", text: "Wo Umweltbericht und Kartierung im Verfahren stehen." },
    { href: "/wissen/ratgeber/eeg-ausschreibung-freiflaeche", titel: "EEG-Ausschreibung Freifläche", text: "Flächenkulisse, Höchstwerte und Zuschläge." },
    { href: "/wissen/ratgeber/solarpark-beweidung-schafe", titel: "Beweidung mit Schafen", text: "Pflegekonzept mit Tieren statt Mähwerk." },
    { href: pfad("/freiflaeche"), titel: "Freiflächen-PV", text: "Wie Solarparks geplant und gebaut werden." },
  ],

  quellen: [
    { titel: "Bundesnaturschutzgesetz – § 44 BNatSchG (Vorschriften für besonders geschützte Tier- und Pflanzenarten)", url: "https://www.gesetze-im-internet.de/bnatschg_2009/__44.html", stand: "09/2026" },
    { titel: "Baugesetzbuch – § 1a BauGB (Ergänzende Vorschriften zum Umweltschutz, Eingriffsregelung)", url: "https://www.gesetze-im-internet.de/bbaug/__1a.html", stand: "09/2026" },
    { titel: "Baugesetzbuch – § 2 BauGB (Aufstellung der Bauleitpläne, Umweltprüfung Abs. 4)", url: "https://www.gesetze-im-internet.de/bbaug/__2.html", stand: "09/2026" },
    { titel: "EEG 2023 – § 37 Gebote für Solaranlagen des ersten Segments (Abs. 1a Biodiversitätskriterien)", url: "https://www.gesetze-im-internet.de/eeg_2014/__37.html", stand: "09/2026" },
    { titel: "NABU – Metakurzstudie zu Solarparks und Vögeln des Offenlands (Zaplata, Stöfer, Stand 18.03.2022)", url: "https://www.nabu.de/imperia/md/content/nabude/energie/solarenergie/220318_solarpark-vogelstudie_offenland.pdf", stand: "09/2026" },
    { titel: "Deutscher Jagdverband – Wildtierverträgliche Freiflächen-Photovoltaikanlagen: Beteiligung, Planung, Praxis (01/2026)", url: "https://www.jagdverband.de/sites/default/files/2026-01/2026-01_DJV_Broschuere_Photovoltaik-Anlagen.pdf", stand: "09/2026" },
    { titel: "Bundesjagdgesetz – § 6 BJagdG (Befriedete Bezirke, Ruhen der Jagd)", url: "https://www.gesetze-im-internet.de/bjagdg/__6.html", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Schutzgebiete und Lage prüfen",
    text: "Erste Einschätzung zu Fläche, Netz und Planungsrecht.",
    href: pfad("/flaechencheck"),
    label: "Zum Flächencheck",
  },
  cta: {
    title: "Naturschutz früh klären, Zeit im Verfahren sparen.",
    text: "Im Flächencheck schätzen wir Lage, Schutzgebiete, Netzanschluss und Planungsrecht Ihrer Fläche ein. Für Flächeneigentümer ist die Plattform von ÖkoInvest kostenfrei.",
    primary: { label: "Zum Flächencheck", href: pfad("/flaechencheck") },
    secondary: { label: "Freiflächen-PV verstehen", href: pfad("/freiflaeche") },
  },
};

export default artikel;
