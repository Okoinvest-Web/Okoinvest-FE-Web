// Ratgeber: Rückbau von Solarparks – Rückbauverpflichtung, Rückbaubürgschaft, Kosten, Recycling
// Recherchestand 29.09.2026 (BauGB §§ 11, 35 Abs. 5; BGB §§ 771, 773; ElektroG §§ 19, 22;
// Arbeitshilfe Solarplanung Niedersachsen 10/2022; EnG CH Art. 71a). Zahlen aus src/lib/invest/markt.js.
// Keine Rechtsberatung – Text bewusst vorsichtig formuliert. Vertieft den Rückbau-Abschnitt
// im Ratgeber pachtvertrag-solarpark.

import { FREIFLAECHE, PACHT, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtPct } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
// ElektroG § 22 Abs. 1 Nr. 1 (Kategorie 4, Großgeräte – dazu zählen PV-Module):
// Verwertung mind. 85 %, Vorbereitung zur Wiederverwendung und Recycling mind. 80 %.
const ELEKTROG_VERWERTUNG = 0.85;
const ELEKTROG_RECYCLING = 0.8;
// Übliche Überprüfungsintervalle für die Höhe der Rückbausicherheit (Vertragspraxis, eigene Einordnung).
const ANPASSUNG_JAHRE = 5;

/* ------------------------------------------------------------------ */
/* Rechenbeispiel: 10-MWp-Park                                         */
/* ------------------------------------------------------------------ */

const MWP = 10;
const KWP = MWP * 1000;
const HA = MWP * FREIFLAECHE.haProMwp;
const JAHRE = FREIFLAECHE.laufzeit;
const RUECKBAU_HEUTE = KWP * FREIFLAECHE.rueckbauProKwp;
const faktor = (jahre) => Math.pow(1 + FREIFLAECHE.inflation, jahre);
const RUECKBAU_ENDE = RUECKBAU_HEUTE * faktor(JAHRE);
const CAPEX = KWP * FREIFLAECHE.capexProKwp.mittel;
const ANTEIL_CAPEX = RUECKBAU_HEUTE / CAPEX;
const rund = (n) => Math.round(n / 1000) * 1000;

const artikel = {
  slug: "solarpark-rueckbau-rueckbaubuergschaft",
  title: "Solarpark-Rückbau: Pflicht, Rückbaubürgschaft und echte Kosten",
  seoTitle: "Solarpark Rückbau & Rückbaubürgschaft | ÖkoInvest",
  kurzTitel: "Rückbau und Rückbaubürgschaft",
  description:
    "Solarpark-Rückbau: Wer zum Rückbau verpflichtet ist, wie hoch die Rückbaubürgschaft sein sollte, was bei Insolvenz passiert und was Recycling kostet.",
  excerpt:
    "Nach 30 Jahren muss die Fläche wieder frei sein. Wer den Rückbau schuldet, welche Sicherheit wirklich trägt, wie sich die Kosten entwickeln und was mit den Modulen passiert.",
  hauptKeyword: "solarpark rückbau",
  keywords: [
    "Solarpark Rückbau",
    "Rückbaubürgschaft Solarpark",
    "Rückbauverpflichtung Photovoltaik",
    "Rückbaukosten Freiflächenanlage",
    "Rückbausicherheit § 35 Abs. 5 BauGB",
    "PV-Module Recycling ElektroG",
    "Solarpark Insolvenz Rückbau",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Recht & Genehmigung",
  bild: "/img/montage-freiflaeche.jpg",
  bildAlt: "Monteur mit weißem Schutzhelm verschraubt mit einem Akkuschrauber Module an einer aufgeständerten Reihe im Solarpark",
  badge: { wert: `ca. ${fmt(FREIFLAECHE.rueckbauProKwp)} €/kWp`, text: "vorsichtige Rückbau-Kalkulation, heutiger Preisstand" },

  kurzFazit: [
    "**Den Rückbau schuldet der Betreiber** – im Außenbereich als Zulässigkeitsvoraussetzung nach § 35 Abs. 5 BauGB, beim Bebauungsplan meist über den städtebaulichen Vertrag und gegenüber dem Eigentümer über den Pachtvertrag.",
    `Wir kalkulieren den Rückbau vorsichtig mit rund **${fmt(FREIFLAECHE.rueckbauProKwp)} € je kWp** zum heutigen Preisstand – für einen ${MWP}-MWp-Park also etwa ${fmtEur(RUECKBAU_HEUTE)}, grob ${fmtPct(ANTEIL_CAPEX, 0)} der Errichtungskosten.`,
    `Ohne Anpassung verliert die Sicherheit an Wert: Bei ${fmtPct(FREIFLAECHE.inflation, 0)} Kostensteigerung pro Jahr wären nach ${JAHRE} Jahren rund **${fmtEur(rund(RUECKBAU_ENDE))}** nötig. Eine Indexierung oder regelmäßige Neubewertung gehört deshalb in jeden Vertrag.`,
    "Die beste Absicherung gegen die **Insolvenz des Betreibers** ist eine unbefristete, selbstschuldnerische Bürgschaft eines Kreditinstituts oder Versicherers, gestellt vor Baubeginn – nicht eine Rücklage in der Projektgesellschaft.",
    "PV-Module fallen unter das **ElektroG**: Hersteller müssen gewerblichen Nutzern eine Rückgabemöglichkeit bieten. Gestelle, Kabel und Trafos bringen Schrotterlöse, die die Kosten senken, aber nicht sicher planbar sind.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Wer muss einen Solarpark zurückbauen?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Zurückbauen muss der Betreiber der Anlage – und zwar vollständig, einschließlich Rammpfosten, Kabeln, Fundamenten und Zaun, sobald die Nutzung dauerhaft endet oder der Pachtvertrag ausläuft.** Diese Pflicht hat in Deutschland in der Regel drei Rechtsquellen, die nebeneinander bestehen: das Baurecht gegenüber der Genehmigungsbehörde, den städtebaulichen Vertrag gegenüber der Gemeinde und den Pacht- oder Nutzungsvertrag gegenüber dem Flächeneigentümer.",
        },
        {
          typ: "p",
          text: `Die Pflicht allein nützt wenig, wenn beim Betreiber nach ${JAHRE} Jahren kein Geld mehr da ist. Entscheidend ist deshalb die **Sicherheit**: eine Bürgschaft oder ein vergleichbares Instrument, auf das Behörde, Gemeinde oder Eigentümer notfalls zugreifen können. Die Grundzüge der Rückbauklausel im Pachtvertrag erklärt der Ratgeber [Pachtvertrag für Solarparks](/wissen/ratgeber/pachtvertrag-solarpark). Hier geht es um die Details: Höhe, Form, Anpassung, Insolvenz, Kosten und Recycling.`,
        },
        {
          typ: "kennzahl",
          wert: fmtEur(RUECKBAU_HEUTE),
          titel: `Rückbau-Kalkulation für einen ${MWP}-MWp-Park (heutiger Preisstand)`,
          text: `Rund ${fmt(FREIFLAECHE.rueckbauProKwp)} €/kWp, Fläche etwa ${fmt(HA)} ha. Nach ${JAHRE} Jahren mit ${fmtPct(FREIFLAECHE.inflation, 0)} Kostensteigerung pro Jahr: etwa ${fmtEur(rund(RUECKBAU_ENDE))}.`,
        },
      ],
    },
    {
      id: "rechtsgrundlagen",
      titel: "Die drei Rechtsgrundlagen der Rückbauverpflichtung",
      tocLabel: "Rechtsgrundlagen",
      bloecke: [
        {
          typ: "p",
          text: "**Welche Rückbaupflicht greift, hängt vom Genehmigungsweg ab: Privilegierte Anlagen im Außenbereich trifft sie kraft Gesetzes, Anlagen im Bebauungsplan in der Regel über Verträge.** Für Flächeneigentümer ist wichtig: Die öffentlich-rechtliche Pflicht schützt zuerst die Allgemeinheit, nicht automatisch Ihre Fläche.",
        },
        {
          typ: "tabelle",
          caption: `Rückbauverpflichtung nach Rechtsgrundlage, Deutschland, Stand ${STAND}`,
          kopf: ["Grundlage", "Gilt für", "Begünstigter", "Typische Sicherung"],
          zeilen: [
            [
              "§ 35 Abs. 5 Satz 2 und 3 BauGB",
              "privilegierte Vorhaben im Außenbereich, u. a. Solaranlagen im 200-m-Korridor (Nr. 8 b) und hofnahe Agri-PV (Nr. 9)",
              "Baugenehmigungsbehörde",
              "Verpflichtungserklärung, gesichert durch Baulast oder „in anderer Weise“ (meist Bürgschaft)",
            ],
            [
              "Städtebaulicher Vertrag (§ 11 BauGB)",
              "Anlagen mit Bebauungsplan",
              "Gemeinde",
              "Rückbauklausel mit Bürgschaft; häufig Voraussetzung für den Satzungsbeschluss",
            ],
            [
              "Pacht- bzw. Nutzungsvertrag",
              "jede Anlage auf fremdem Grund",
              "Flächeneigentümer",
              "Bankbürgschaft, Kautionsversicherung oder Treuhandkonto",
            ],
            [
              "Festsetzungen im Bebauungsplan",
              "Anlagen mit befristetem Baurecht oder Folgenutzung",
              "Allgemeinheit",
              "befristete Festsetzung mit Folgenutzung Landwirtschaft (§ 9 Abs. 2 BauGB), ergänzt durch Vertrag",
            ],
          ],
          hervorheben: 3,
          minBreite: 760,
          fussnote: "Quelle: BauGB §§ 9, 11, 35 (gesetze-im-internet.de, abgerufen 09/2026). Diese Übersicht ersetzt keine Rechtsberatung im Einzelfall.",
        },
        {
          typ: "h3",
          text: "Privilegierte Anlagen: Pflicht als Zulässigkeitsvoraussetzung",
        },
        {
          typ: "p",
          text: "Für Vorhaben nach § 35 Abs. 1 Nr. 8 b und Nr. 9 BauGB ist eine Verpflichtungserklärung abzugeben, das Vorhaben nach dauerhafter Aufgabe der Nutzung zurückzubauen und Bodenversiegelungen zu beseitigen. Die Baugenehmigungsbehörde soll die Einhaltung durch eine nach Landesrecht vorgesehene [Baulast](/wissen/lexikon#baulast) oder in anderer Weise sicherstellen. In der Praxis verlangen viele Behörden dafür eine Bürgschaft; Bayern etwa kennt keine Baulast, dort ist die Bürgschaft der übliche Weg. Mehr zur [Privilegierung im Außenbereich](/wissen/lexikon#privilegierung-aussenbereich) und zum Korridor an Verkehrswegen im Ratgeber [Solarpark an Autobahn und Bahn](/wissen/ratgeber/solarpark-autobahn-bahn-privilegierung).",
        },
        {
          typ: "h3",
          text: "Bebauungsplan: Gemeinde regelt den Rückbau im Vertrag",
        },
        {
          typ: "p",
          text: "Beim [Bebauungsplan](/wissen/lexikon#bebauungsplan) gilt § 35 Abs. 5 BauGB nicht unmittelbar. Gemeinden sichern den Rückbau deshalb im städtebaulichen Vertrag ab, oft kombiniert mit einer befristeten Festsetzung und der Folgenutzung Landwirtschaft. Die Arbeitshilfe der niedersächsischen Kommunalverbände empfiehlt ausdrücklich, dass kommunale Kriterienkataloge auch Anforderungen an den Rückbau einschließlich der Stellung einer Rückbausicherheit enthalten. Wie das Verfahren insgesamt abläuft, zeigt der Ratgeber [Genehmigung und Bebauungsplan](/wissen/ratgeber/solarpark-genehmigung-bebauungsplan).",
        },
      ],
    },
    {
      id: "hoehe",
      titel: "Wie hoch sollte die Rückbaubürgschaft sein?",
      tocLabel: "Höhe der Sicherheit",
      bloecke: [
        {
          typ: "p",
          text: `**Die Rückbaubürgschaft sollte die realistischen Brutto-Rückbaukosten zum Zeitpunkt des Rückbaus abdecken – ohne eingerechnete Schrotterlöse und mit einer Regel zur Anpassung über die Laufzeit.** Wir rechnen auf der Website vorsichtig mit rund ${fmt(FREIFLAECHE.rueckbauProKwp)} € je kWp zum heutigen Preisstand. Behörden und Gemeinden setzen teils eigene Pauschalen oder verlangen ein Kostengutachten; eine bundeseinheitliche Vorgabe für Solarparks gibt es nach aktuellem Stand nicht.`,
        },
        {
          typ: "p",
          text: "Warum ohne Schrotterlöse? Weil die Sicherheit genau dann gebraucht wird, wenn etwas schiefgeht: Der Betreiber ist insolvent, die Anlage wurde nicht gewartet, Kupferkabel sind vielleicht schon ausgebaut, und die Metallpreise stehen im ungünstigen Moment tief. Eine Kalkulation, die den Rückbau durch Materialverkauf „kostenneutral“ rechnet, ist für den Sicherungszweck ungeeignet.",
        },
        {
          typ: "tabelle",
          caption: `Beispiel: Rückbausicherheit für ${MWP} MWp bei ${fmtPct(FREIFLAECHE.inflation, 0)} Kostensteigerung pro Jahr`,
          kopf: ["Zeitpunkt", "Rückbaukosten (Schätzung)", "Sicherheit ohne Anpassung", "Deckungslücke"],
          zeilen: [0, 10, 20, JAHRE].map((j) => {
            const kosten = RUECKBAU_HEUTE * faktor(j);
            return [
              j === 0 ? "Baubeginn" : `nach ${j} Jahren`,
              fmtEur(rund(kosten)),
              fmtEur(RUECKBAU_HEUTE),
              j === 0 ? "keine" : fmtEur(rund(kosten - RUECKBAU_HEUTE)),
            ];
          }),
          hervorheben: 3,
          markierteZeile: 3,
          minBreite: 620,
          fussnote: `Annahmen: ${fmt(FREIFLAECHE.rueckbauProKwp)} €/kWp zum heutigen Preisstand, jährliche Kostensteigerung ${fmtPct(FREIFLAECHE.inflation, 0)} (Opex-Annahme der Website). Orientierungswerte, kein Kostengutachten.`,
        },
        {
          typ: "p",
          text: `Die Tabelle zeigt das Kernproblem: Eine feste Bürgschaft über ${fmtEur(RUECKBAU_HEUTE)} deckt nach ${JAHRE} Jahren nur noch gut die Hälfte des Bedarfs. Üblich sind deshalb zwei Wege: eine **Indexierung** am Baupreisindex des Statistischen Bundesamts oder eine **Neubewertung** etwa alle ${ANPASSUNG_JAHRE} Jahre durch ein Gutachten, verbunden mit der Pflicht, die Bürgschaft aufzustocken. Welche Rückbaukosten in die Wirtschaftlichkeit eines Parks einfließen, sehen Sie im [Solarpark-Rechner](/de/rechner/solarpark).`,
        },
        {
          typ: "tool",
          href: pfad("/rechner/solarpark"),
          titel: "Rückbau in der Projektrechnung",
          text: "Der Solarpark-Rechner berücksichtigt Errichtung, Betrieb, Pacht und Rückbau-Rücklage über die Laufzeit.",
          label: "Zum Solarpark-Rechner",
        },
      ],
    },
    {
      id: "formen",
      titel: "Bürgschaft, Kaution oder Rücklage: Welche Sicherheit trägt?",
      tocLabel: "Formen der Sicherheit",
      bloecke: [
        {
          typ: "p",
          text: "**Am belastbarsten ist eine unbefristete, selbstschuldnerische Bürgschaft eines in der EU zugelassenen Kreditinstituts oder Kautionsversicherers, die vor Baubeginn übergeben wird.** „Selbstschuldnerisch“ heißt, dass der Bürge auf die Einrede der Vorausklage verzichtet (§ 773 BGB): Der Begünstigte muss nicht erst erfolglos gegen den Betreiber vollstrecken, bevor er die Bürgschaft ziehen kann.",
        },
        {
          typ: "tabelle",
          caption: "Formen der Rückbausicherheit im Vergleich",
          kopf: ["Form", "Schutz bei Insolvenz", "Kosten für den Betreiber", "Einordnung"],
          zeilen: [
            ["Bankbürgschaft (selbstschuldnerisch, unbefristet)", "**hoch** – Anspruch gegen die Bank, unabhängig vom Betreiber", "jährliche Avalprovision, belastet Kreditlinie", "Standard, von Behörden und Gemeinden meist akzeptiert"],
            ["Bürgschaft eines Kautionsversicherers", "hoch, wenn Versicherer solide", "Avalprämie, schont die Bankkreditlinie", "gleichwertig, wenn Vertrag dies zulässt"],
            ["Barhinterlegung / Treuhandkonto", "hoch, wenn insolvenzfest getrennt", "bindet Liquidität", "selten, eher bei kleinen Anlagen"],
            ["Konzernbürgschaft / Patronatserklärung", "nur so gut wie die Muttergesellschaft", "gering", "nur mit Bonitätsprüfung, Nachbesicherung bei Verkauf"],
            ["Ansparrücklage in der Projektgesellschaft", "**gering** – fällt in die Insolvenzmasse", "keine", "als alleinige Sicherheit ungeeignet"],
          ],
          hervorheben: 1,
          minBreite: 720,
          fussnote: "Vereinfachte Einordnung. Welche Formen die Behörde akzeptiert, regelt der Bescheid bzw. der städtebauliche Vertrag. Die Höhe der Avalprovision hängt von Bonität und Laufzeit ab.",
        },
        {
          typ: "checkliste",
          punkte: [
            "**Unbefristet** oder mindestens bis zur Abnahme des Rückbaus – keine Bürgschaft, die vor Vertragsende ausläuft.",
            "**Verzicht auf die Einreden** der Vorausklage, Anfechtbarkeit und Aufrechenbarkeit (soweit rechtlich zulässig).",
            "**Übergabe vor Baubeginn**, nicht erst bei Inbetriebnahme.",
            "**Begünstigter klar benannt:** Eigentümer, Gemeinde oder Behörde – oder mehrere getrennte Sicherheiten, damit nicht zwei Gläubiger um dieselbe Bürgschaft streiten.",
            "**Anpassungsklausel** mit Index oder Neubewertung und Pflicht zur Aufstockung.",
            "**Fortbestand bei Betreiberwechsel:** Beim Verkauf der Projektgesellschaft muss der Käufer eine gleichwertige Sicherheit stellen, bevor die alte zurückgegeben wird.",
          ],
        },
        {
          typ: "p",
          text: "Beim Kauf von Bestandsanlagen gehört die Rückbausicherheit in jede Prüfung: Wer eine Projektgesellschaft übernimmt, übernimmt auch die Rückbaupflicht. Worauf Käufer achten, erklären die Ratgeber [Projektrechte kaufen](/wissen/ratgeber/projektrechte-kaufen-due-diligence) und [Wert einer Bestandsanlage](/wissen/ratgeber/solarpark-bestandsanlage-wert).",
        },
      ],
    },
    {
      id: "insolvenz",
      titel: "Was passiert beim Rückbau, wenn der Betreiber insolvent ist?",
      tocLabel: "Insolvenz des Betreibers",
      bloecke: [
        {
          typ: "p",
          text: "**Bei einer Insolvenz des Betreibers wird der Rückbauanspruch in der Regel nur zu einer Forderung gegen die Insolvenzmasse – deshalb zählt dann allein die Sicherheit eines Dritten.** Rücklagen in der Projektgesellschaft stehen dann meist allen Gläubigern zur Verfügung, nicht bevorzugt dem Eigentümer.",
        },
        {
          typ: "p",
          text: "In der Praxis ist die Insolvenz eines laufenden Solarparks selten das Ende: Die finanzierende Bank hat ein Interesse daran, den Park weiterzubetreiben oder zu verkaufen, und nutzt dafür ihr Eintrittsrecht. Kritisch wird es am Ende der Nutzungsdauer, wenn die Anlage kaum noch Erlöse bringt und niemand sie übernehmen will. Genau für diesen Fall ist die Bürgschaft da.",
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Risiko für Eigentümer: Zustandsverantwortung",
          text: "Bleibt eine Anlage nach Aufgabe der Nutzung stehen, kann die Bauaufsicht nach Landesbauordnungsrecht unter Umständen auch den Grundstückseigentümer als Zustandsverantwortlichen heranziehen. Wie weit das im Einzelfall reicht, ist eine Frage des Landesrechts und der Umstände. Umso wichtiger ist eine Sicherheit, die Sie selbst ziehen dürfen, und ein vertragliches Recht, bei Verzug selbst zurückbauen zu lassen.",
        },
        {
          typ: "p",
          text: "Absichern lässt sich zusätzlich über das Grundbuch: Die [Dienstbarkeit](/wissen/lexikon#dienstbarkeit) für den Betreiber sollte eine Löschungspflicht nach Rückbau vorsehen, und die Rückbaupflicht sollte gegenüber Rechtsnachfolgern fortgelten. Details im Ratgeber [Dienstbarkeit im Grundbuch](/wissen/ratgeber/dienstbarkeit-grundbuch-pv-pacht).",
        },
      ],
    },
    {
      id: "kosten",
      titel: "Was kostet der Rückbau eines Solarparks?",
      tocLabel: "Kosten und Erlöse",
      bloecke: [
        {
          typ: "p",
          text: `**Die Brutto-Rückbaukosten liegen nach unserer vorsichtigen Annahme bei rund ${fmt(FREIFLAECHE.rueckbauProKwp)} € je kWp zum heutigen Preisstand; Schrotterlöse aus Stahl, Aluminium und Kupfer können den Nettoaufwand deutlich senken.** Für den ${MWP}-MWp-Beispielpark auf rund ${fmt(HA)} ha entspricht das etwa ${fmtEur(RUECKBAU_HEUTE)} oder rund ${fmtPct(ANTEIL_CAPEX, 0)} der schlüsselfertigen Errichtung von durchschnittlich ${fmt(FREIFLAECHE.capexProKwp.mittel)} €/kWp.`,
        },
        {
          typ: "tabelle",
          caption: "Kostentreiber und Erlöspositionen beim Rückbau",
          kopf: ["Bauteil", "Aufwand", "Möglicher Erlös", "Hinweis"],
          zeilen: [
            ["Module", "Demontage, Transport, Übergabe an Rücknahmesystem", "gering; Weiterverkauf funktionsfähiger Module möglich", "ElektroG: Rückgabemöglichkeit beim Hersteller"],
            ["Unterkonstruktion (Stahl, Aluminium)", "Abbau der Tische", "Schrottwert Stahl/Aluminium", "Erlös schwankt mit Metallpreisen"],
            ["Rammpfosten", "Ziehen mit Spezialgerät, Löcher verfüllen", "Stahlschrott", "Korrosion kann das Ziehen erschweren"],
            ["Kabel (DC, AC, Mittelspannung)", "Aufgraben und Bergen, Trasse wiederherstellen", "Kupfer und Aluminium", "vollständige Entfernung vertraglich festlegen"],
            ["Wechselrichter, Trafostationen", "Kranarbeiten, Fundamente abbrechen", "Wiederverwendung oder Schrott", "Isolieröl fachgerecht entsorgen"],
            ["Zaun, Wege, Tore", "Abbau, Schotter aufnehmen", "gering", "Wege ggf. auf Wunsch des Eigentümers belassen"],
            ["Rekultivierung", "Tiefenlockerung, Einsaat, ggf. Bodenuntersuchung", "keiner", "Abnahme mit Protokoll"],
          ],
          minBreite: 760,
          fussnote: "Qualitative Übersicht. Tatsächliche Kosten hängen von Anlagengröße, Bauweise, Bodenverhältnissen, Kabellängen und Entsorgungspreisen zum Rückbauzeitpunkt ab.",
        },
        {
          typ: "p",
          text: "Ein oft unterschätzter Posten sind die **Kabel im Boden**. Manche Verträge erlauben, tief liegende Kabel zu belassen – das spart dem Betreiber Geld, kann aber spätere Drainagen, Tiefenlockerung oder Bebauung behindern. Wer seine Fläche wieder uneingeschränkt landwirtschaftlich nutzen will, sollte die vollständige Entfernung vereinbaren und die Lage der Trassen dokumentieren lassen.",
        },
        {
          typ: "p",
          text: "Nicht jeder Rückbau ist ein Ende: Häufig wird ein Park nach 25 bis 30 Jahren mit neuen Modulen weiterbetrieben. Dann entfällt der Rückbau zunächst, die Rückbaupflicht wandert mit. Mehr dazu im Ratgeber [Repowering von Solarparks](/wissen/ratgeber/repowering-solarpark).",
        },
      ],
    },
    {
      id: "recycling",
      titel: "Recycling: Was mit Modulen, Stahl und Kabeln passiert",
      tocLabel: "Recycling und ElektroG",
      bloecke: [
        {
          typ: "p",
          text: "**PV-Module sind in Deutschland Elektrogeräte im Sinne des ElektroG; ihre Hersteller müssen auch gewerblichen Nutzern eine zumutbare Möglichkeit zur Rückgabe schaffen (§ 19 ElektroG) und tragen grundsätzlich die Entsorgungskosten, soweit nichts anderes vereinbart ist.** Betreiber eines Solarparks sind in diesem Sinn „andere Nutzer als private Haushalte“.",
        },
        {
          typ: "p",
          text: `Für die Behandlung schreibt das Gesetz Quoten vor: Bei Großgeräten der Kategorie 4, zu der PV-Module gehören, müssen mindestens ${fmtPct(ELEKTROG_VERWERTUNG, 0)} verwertet und mindestens ${fmtPct(ELEKTROG_RECYCLING, 0)} zur Wiederverwendung vorbereitet oder recycelt werden (§ 22 ElektroG). Den Großteil des Modulgewichts machen Glas und Aluminiumrahmen aus; die Rückgewinnung von Silizium und Silber ist technisch möglich, aber bisher weniger verbreitet.`,
        },
        {
          typ: "liste",
          punkte: [
            "**Herstellerrisiko:** Nach 30 Jahren gibt es manche Hersteller nicht mehr. Dann trägt der Betreiber die Entsorgungskosten selbst – ein Grund mehr, sie in der Sicherheit zu berücksichtigen.",
            "**Abweichende Vereinbarungen:** Hersteller und gewerbliche Abnehmer dürfen die Kostentragung abweichend regeln. Ein Blick in die Liefer- und Garantieverträge lohnt.",
            "**Weiterverwendung:** Funktionsfähige Altmodule werden teils als Gebrauchtware verkauft. Das kann den Aufwand senken, ist aber nicht planbar.",
            "**Wechselrichter, Trafos und Kabel** unterliegen je nach Bauteil ebenfalls Elektro- oder Abfallrecht; Transformatoröl ist als gefährlicher Abfall zu behandeln.",
          ],
        },
        {
          typ: "kasten",
          variant: "info",
          titel: "Bruch und Hagelschaden",
          text: "Beschädigte Module sollten nicht unter freiem Himmel gelagert werden, weil aus Bruchstellen Stoffe ausgewaschen werden können. Sammeln, abdecken und zeitnah an ein zertifiziertes Rücknahmesystem übergeben. Wie Schäden während der Laufzeit abgesichert werden, erklärt der Ratgeber [Solarpark-Versicherung](/wissen/ratgeber/solarpark-versicherung).",
        },
      ],
    },
    {
      id: "at-ch",
      titel: "Rückbau in Österreich und der Schweiz",
      tocLabel: "Österreich und Schweiz",
      bloecke: [
        {
          typ: "p",
          text: "**In Österreich und der Schweiz ist der Rückbau ebenfalls Pflicht, die Rechtsgrundlagen liegen aber überwiegend im Landes- bzw. Kantonsrecht und im Vertrag.** Ein bundesweites Pendant zu § 35 Abs. 5 BauGB gibt es in Österreich nicht.",
        },
        {
          typ: "karten",
          cols: 2,
          items: [
            {
              titel: "Österreich",
              text: "Freiflächenanlagen brauchen je nach Bundesland eine Widmung als Grünland-Photovoltaik oder eine Vorrangzone. Rückbau- und Wiederherstellungspflichten ergeben sich aus Raumordnungs-, Bau- und Elektrizitätsrecht der Länder sowie aus dem Pachtvertrag; teils verlangen Behörden Sicherheitsleistungen. Module fallen unter die Elektroaltgeräteverordnung. Einstieg im Ratgeber [Freiflächen-PV in Österreich](/wissen/ratgeber/freiflaechen-pv-oesterreich).",
            },
            {
              titel: "Schweiz",
              text: "Für Photovoltaik-Großanlagen nach Art. 71a EnG (Solarexpress) schreibt das Gesetz vor, dass die Anlagen bei endgültiger Ausserbetriebnahme vollständig zurückzubauen sind und die Ausgangslage wiederherzustellen ist. Im Übrigen regeln Kantone und Bewilligungen die Details. Mehr im Ratgeber [Freiflächen-PV in der Schweiz](/wissen/ratgeber/freiflaechen-pv-schweiz).",
            },
          ],
        },
        {
          typ: "p",
          text: "In beiden Ländern gilt dieselbe Faustregel wie in Deutschland: Die öffentlich-rechtliche Pflicht ersetzt keine eigene vertragliche Sicherheit für den Grundeigentümer. Lassen Sie Vertrag und Sicherheit von lokal zugelassenen Fachleuten prüfen.",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "Checkliste: So sichern Sie den Rückbau richtig ab",
      tocLabel: "Checkliste",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Umfang festlegen", "Alle Bauteile inklusive Rammpfosten, Kabeln und Fundamenten; Wiederherstellung der landwirtschaftlichen Nutzbarkeit; Frist von etwa 6 bis 12 Monaten."],
            ["Ausgangszustand dokumentieren", "Fotos, Bodenproben und Drainagepläne vor Baubeginn – das ist später die Grundlage der Abnahme."],
            ["Höhe bestimmen", `Brutto-Rückbaukosten ohne Schrotterlöse, als Orientierung rund ${fmt(FREIFLAECHE.rueckbauProKwp)} €/kWp zum heutigen Preisstand, besser mit Kostenschätzung des Betreibers.`],
            ["Form und Zeitpunkt vereinbaren", "Unbefristete, selbstschuldnerische Bürgschaft eines Kreditinstituts oder Versicherers, Übergabe vor Baubeginn."],
            ["Anpassung regeln", `Indexierung oder Neubewertung etwa alle ${ANPASSUNG_JAHRE} Jahre, mit Pflicht zur Aufstockung.`],
            ["Übertragung absichern", "Rückgabe der Sicherheit nur gegen gleichwertige Ersatzsicherheit des neuen Betreibers."],
          ],
        },
        {
          typ: "p",
          text: `Die Pacht läuft in der Regel ${PACHT.laufzeit} Jahre plus Verlängerungsoptionen (${PACHT.verlaengerung}); die Sicherheit muss diesen gesamten Zeitraum und die Rückbauphase abdecken. Hintergrund zum Vorgehen als Eigentümer finden Sie unter [Fläche verpachten](/de/flaeche-verpachten), für Gemeinden unter [Kommunen](/de/kommunen).`,
        },
      ],
    },
  ],

  faq: [
    {
      q: "Wer zahlt den Rückbau eines Solarparks?",
      a: "Der Betreiber. Er ist gegenüber Behörde, Gemeinde und Eigentümer zum Rückbau verpflichtet. Fällt er aus, greift die Rückbausicherheit – deshalb sollte sie von einem Dritten stammen, etwa einer Bank.",
    },
    {
      q: "Wie hoch ist eine übliche Rückbaubürgschaft?",
      a: `Eine einheitliche Vorgabe gibt es nicht. Wir rechnen vorsichtig mit rund ${fmt(FREIFLAECHE.rueckbauProKwp)} € je kWp zum heutigen Preisstand, also etwa ${fmtEur(RUECKBAU_HEUTE)} für ${MWP} MWp. Wichtig ist eine Anpassung über die Laufzeit, sonst entsteht eine Deckungslücke.`,
    },
    {
      q: "Reicht eine Rücklage des Betreibers als Sicherheit?",
      a: "In der Regel nicht. Eine Rücklage in der Projektgesellschaft fällt bei Insolvenz in die Masse und steht allen Gläubigern zu. Als Sicherheit taugt sie nur, wenn sie insolvenzfest auf einem Treuhand- oder Sperrkonto zugunsten des Begünstigten liegt.",
    },
    {
      q: "Dürfen Kabel nach dem Rückbau im Boden bleiben?",
      a: "Nur, wenn Sie das vereinbaren. Ohne Regel ist der vollständige Rückbau geschuldet. Wer die Fläche wieder uneingeschränkt nutzen will, sollte die Entfernung aller Kabel ausdrücklich festschreiben.",
    },
    {
      q: "Was passiert mit alten Solarmodulen?",
      a: "Sie werden als Elektroaltgeräte über Rücknahmesysteme der Hersteller verwertet. Glas und Aluminium werden überwiegend recycelt; nach § 22 ElektroG sind Mindestquoten für Verwertung und Recycling vorgeschrieben. Funktionsfähige Module werden teils weiterverkauft.",
    },
    {
      q: "Gilt die Rückbaupflicht auch für Anlagen mit Bebauungsplan?",
      a: "§ 35 Abs. 5 BauGB gilt nur für privilegierte Vorhaben im Außenbereich. Bei Bebauungsplänen regeln Gemeinden den Rückbau in der Regel im städtebaulichen Vertrag, oft mit Bürgschaft. Unabhängig davon brauchen Eigentümer eine eigene Regel im [Pachtvertrag](/wissen/ratgeber/pachtvertrag-solarpark).",
    },
  ],

  passend: [
    { href: "/wissen/ratgeber/pachtvertrag-solarpark", titel: "Pachtvertrag Solarpark", text: "Alle wichtigen Klauseln und eine Checkliste für Eigentümer." },
    { href: "/wissen/ratgeber/solarpark-genehmigung-bebauungsplan", titel: "Genehmigung und Bebauungsplan", text: "Vom Aufstellungsbeschluss zum städtebaulichen Vertrag." },
    { href: "/wissen/ratgeber/repowering-solarpark", titel: "Repowering von Solarparks", text: "Weiterbetrieb mit neuen Modulen statt Rückbau." },
    { href: pfad("/flaeche-verpachten"), titel: "Fläche verpachten", text: "Ablauf und Voraussetzungen für Flächeneigentümer." },
  ],

  quellen: [
    { titel: "Baugesetzbuch – § 35 BauGB (Bauen im Außenbereich, Rückbauverpflichtung Abs. 5)", url: "https://www.gesetze-im-internet.de/bbaug/__35.html", stand: "09/2026" },
    { titel: "Baugesetzbuch – § 11 BauGB (Städtebaulicher Vertrag)", url: "https://www.gesetze-im-internet.de/bbaug/__11.html", stand: "09/2026" },
    { titel: "Bürgerliches Gesetzbuch – § 773 BGB (Ausschluss der Einrede der Vorausklage)", url: "https://www.gesetze-im-internet.de/bgb/__773.html", stand: "09/2026" },
    { titel: "Elektro- und Elektronikgerätegesetz – § 19 ElektroG (Rücknahme durch den Hersteller)", url: "https://www.gesetze-im-internet.de/elektrog_2015/__19.html", stand: "09/2026" },
    { titel: "Elektro- und Elektronikgerätegesetz – § 22 ElektroG (Verwertungsquoten)", url: "https://www.gesetze-im-internet.de/elektrog_2015/__22.html", stand: "09/2026" },
    { titel: "Niedersächsischer Landkreistag, NSGB, ML und MU – Arbeitshilfe: Planung von Freiflächen-Photovoltaikanlagen in Niedersachsen (10/2022)", url: "https://www.ml.niedersachsen.de/download/189442/Arbeitshilfe_Solarplanung_nicht_vollstaendig_barrierefrei_.pdf", stand: "09/2026" },
    { titel: "Fedlex – Energiegesetz der Schweiz (EnG), Art. 71a Photovoltaik-Grossanlagen", url: "https://www.fedlex.admin.ch/eli/cc/2017/762/de", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Rückbau in der Projektrechnung",
    text: "Errichtung, Betrieb, Pacht und Rückbau über die Laufzeit rechnen.",
    href: pfad("/rechner/solarpark"),
    label: "Zum Solarpark-Rechner",
  },
  cta: {
    title: "Lassen Sie Ihre Fläche und Ihr Vertragsangebot einordnen.",
    text: "Im Flächencheck prüfen wir Lage, Netzanschluss und Planungsrecht Ihrer Fläche. Für Flächeneigentümer ist die Plattform von ÖkoInvest kostenfrei.",
    primary: { label: "Zum Flächencheck", href: pfad("/flaechencheck") },
    secondary: { label: "Pachtvertrag verstehen", href: "/wissen/ratgeber/pachtvertrag-solarpark" },
  },
};

export default artikel;
