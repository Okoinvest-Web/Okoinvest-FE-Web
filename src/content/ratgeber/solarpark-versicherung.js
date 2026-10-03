// Ratgeber: Solarpark-Versicherung – Bau, Allgefahren, Betriebsunterbrechung, Haftpflicht, Sicherheitskonzept, Schadenfall
// Recherchestand 29.09.2026 (VdS 3145 Photovoltaikanlagen, GDV/VDE, Ausgabe 2025-06 und Entwurf 2025-04;
// VVG §§ 28, 81, 82; Umweltschadensgesetz; EEG 2023 § 51). Investitionswerte aus src/lib/invest/markt.js
// über den Rechenkern src/lib/rechner/solarpark.js.

import { FREIFLAECHE, FINANZIERUNG, ERLOESE, STAND } from "@/lib/invest/markt";
import { rechneSolarpark, STANDARD } from "@/lib/rechner/solarpark";
import { fmt, fmtEur, fmtMio, fmtPct, fmtCt } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
// Jahresprämie Sach-/Allgefahren- inkl. Ertragsausfallversicherung für Freiflächenparks als Anteil der
// Investitionssumme. Orientierung aus Makler- und Marktangaben (häufig genannt: unter 0,2 % bis rund 0,3 %),
// stark abhängig von Diebstahlrisiko, Sicherheitskonzept, Selbstbehalt und Schadenhistorie. Eigene Einordnung.
const PRAEMIE_ANTEIL = { min: 0.0015, max: 0.003 };
// VdS 3145 (2025): empfohlene Prüffristen – jährliche Sichtprüfung, wiederkehrende Prüfung nach DIN EN 62446-1
const PRUEF_JAHRE = 4;
// Beispiel Betriebsunterbrechung: Ausfall eines Parkteils (z. B. Trafostation) über 6 Wochen
const AUSFALL_TAGE = 42;
const AUSFALL_ANTEIL = 0.5;

/* ---------- Rechenbeispiel 10 MWp ---------- */
const BASIS = rechneSolarpark();
const KWP = STANDARD.mwp * 1000;
const INV = BASIS.investition.summe;
const PR_MIN = INV * PRAEMIE_ANTEIL.min;
const PR_MAX = INV * PRAEMIE_ANTEIL.max;
const PR_KWP_MIN = PR_MIN / KWP;
const PR_KWP_MAX = PR_MAX / KWP;
const ERLOES_1 = BASIS.jahre[0].erloes;
const ERLOES_TAG = ERLOES_1 / 365;
const BU_SCHADEN = ERLOES_TAG * AUSFALL_TAGE * AUSFALL_ANTEIL;
const promille = (x) => `${fmt(x * 1000, 1)} ‰`;

const artikel = {
  slug: "solarpark-versicherung",
  title: "Solarpark-Versicherung: Deckungen, Kosten und Bankanforderungen",
  seoTitle: "Solarpark-Versicherung: Deckung & Kosten | ÖkoInvest",
  kurzTitel: "Solarpark-Versicherung",
  description:
    "Solarpark-Versicherung: Montageversicherung, Allgefahren, Ertragsausfall, Haftpflicht, Schutz vor Diebstahl und Hagel, Prämien und was Banken verlangen.",
  excerpt:
    "Welche Policen ein Freiflächen-Solarpark in Bau und Betrieb braucht, was sie ungefähr kosten, welche Sicherheitsauflagen Versicherer stellen und wie Sie im Schadenfall richtig vorgehen.",
  hauptKeyword: "solarpark versicherung",
  keywords: [
    "Solarpark Versicherung",
    "Photovoltaik Freiflächenanlage versichern",
    "Allgefahrenversicherung PV",
    "Ertragsausfallversicherung Solarpark",
    "Montageversicherung Photovoltaik",
    "Kabeldiebstahl Solarpark",
    "Betreiberhaftpflicht Photovoltaik",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Investieren & Projektbörse",
  bild: "/img/solarpark-reihen.jpg",
  bildAlt: "Luftaufnahme eng stehender Modulreihen eines Solarparks mit zwei Wechselrichter- und Verteilerkästen in der Mitte",
  badge: { wert: `${promille(PRAEMIE_ANTEIL.min)}–${promille(PRAEMIE_ANTEIL.max)}`, text: "Jahresprämie Sach- und Ertragsausfall, Anteil an der Investition (Orientierung)" },

  kurzFazit: [
    "**Ein Solarpark braucht zwei Versicherungsphasen:** im Bau eine Bauleistungs- oder Montageversicherung, im Betrieb eine Allgefahren- bzw. Elektronikversicherung mit Ertragsausfall sowie eine Betreiber- und Umwelthaftpflicht.",
    `**Die Jahresprämie für Sach- und Ertragsausfalldeckung liegt nach Marktangaben grob bei ${promille(PRAEMIE_ANTEIL.min)} bis ${promille(PRAEMIE_ANTEIL.max)} der Investition** – im 10-MWp-Beispiel ${fmt(PR_KWP_MIN, 1)} bis ${fmt(PR_KWP_MAX, 1)} €/kWp und Jahr. Diebstahlrisiko und Sicherheitskonzept verschieben den Preis stark.`,
    "**Kabel- und Moduldiebstahl ist das Thema, das Versicherer derzeit am meisten beschäftigt.** Ohne abgestimmtes Sicherheitskonzept aus Zaun, Detektion und Videoüberwachung gibt es oft keine oder nur teure Deckung.",
    "**Banken finanzieren nur mit Versicherungsnachweis:** Die Bank wird Sicherungsgläubigerin, Ansprüche werden abgetreten, und die Ertragsausfallversicherung muss den Schuldendienst über eine ausreichende Haftzeit absichern.",
    "Im Schadenfall zählen Schadenminderung, sofortige Anzeige und lückenlose Dokumentation. Verletzte Obliegenheiten können die Leistung kürzen (§§ 28, 82 VVG).",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Welche Versicherungen braucht ein Solarpark?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Ein Freiflächen-Solarpark wird in der Regel über vier Bausteine versichert: eine Bauleistungs- oder Montageversicherung für die Errichtung, eine Allgefahren- bzw. Elektronikversicherung für die Sachschäden im Betrieb, eine Ertragsausfall- bzw. Betriebsunterbrechungsversicherung für entgangene Erlöse und eine Betreiberhaftpflicht mit Umweltbausteinen.** Die ersten drei schützen das Vermögen der Projektgesellschaft, die letzte schützt vor Ansprüchen Dritter – etwa des Verpächters, von Nachbarn oder Behörden.",
        },
        {
          typ: "p",
          text: "Anders als bei einer Dachanlage auf dem Wohnhaus gibt es für Solarparks keine Standardpolice von der Stange. Die Deckung wird individuell verhandelt, oft über spezialisierte Makler, und hängt eng an technischen Unterlagen: Ertragsgutachten, Anlagenbeschreibung, Sicherheitskonzept, Wartungsvertrag. Wer einen Park kauft oder finanziert, prüft die Versicherung deshalb als Teil der [Due Diligence](/wissen/lexikon#due-diligence).",
        },
        {
          typ: "kennzahl",
          wert: `${fmt(PR_KWP_MIN, 1)}–${fmt(PR_KWP_MAX, 1)} €/kWp`,
          titel: "Jahresprämie Sach und Ertragsausfall, Beispiel 10 MWp",
          text: `Bei ${fmtMio(INV)} Investition und ${promille(PRAEMIE_ANTEIL.min)}–${promille(PRAEMIE_ANTEIL.max)} Prämiensatz. Zum Vergleich: Die gesamten Betriebskosten ohne Pacht liegen bei rund ${fmt(FREIFLAECHE.opexProKwp)} €/kWp und Jahr.`,
        },
      ],
    },
    {
      id: "bausteine",
      titel: "Die Versicherungsbausteine im Überblick",
      tocLabel: "Bausteine",
      bloecke: [
        {
          typ: "p",
          text: "**Welche Police greift, hängt von der Projektphase und der Art des Schadens ab.** Die folgende Übersicht zeigt, was die einzelnen Bausteine typischerweise abdecken. Der genaue Umfang steht immer in den Bedingungen und Klauseln des Vertrags.",
        },
        {
          typ: "tabelle",
          caption: `Versicherungsbausteine für Freiflächen-Solarparks, Stand ${STAND}`,
          kopf: ["Baustein", "Phase", "Was typischerweise gedeckt ist", "Worauf achten"],
          zeilen: [
            ["Bauleistungs- bzw. Montageversicherung", "Bau bis Abnahme", "Sachschäden an der entstehenden Anlage, Material auf der Baustelle, oft Diebstahl", "Wer versichert – Bauherr oder [EPC](/wissen/lexikon#epc)-Unternehmer? Lücken beim Übergang zum Betrieb vermeiden"],
            ["Allgefahren- bzw. Elektronikversicherung", "Betrieb", "unvorhergesehene Sachschäden: Brand, Blitz, Überspannung, Sturm, Hagel, Schneedruck, Diebstahl, Vandalismus, Tierverbiss, Bedienfehler", "Ausschlüsse (Verschleiß, Serienschäden, Krieg), Selbstbehalt, Diebstahlauflagen"],
            ["Ertragsausfall bzw. Betriebsunterbrechung", "Betrieb, teils schon im Bau", "entgangene Erlöse nach einem versicherten Sachschaden", "Haftzeit, zeitlicher Selbstbehalt, Berechnungsbasis (Ertragsgutachten, Monitoring)"],
            ["Betreiberhaftpflicht", "Bau und Betrieb", "Personen- und Sachschäden Dritter, z. B. Brand greift auf Nachbarfläche über", "Deckungssumme, Freistellung des Verpächters, Mitversicherung von Dienstleistern"],
            ["Umwelthaftpflicht und Umweltschaden", "Bau und Betrieb", "Schäden an Boden, Wasser und geschützten Arten, auch öffentlich-rechtliche Sanierungspflichten", "Trafoöl, Löschwasser, Anforderungen aus dem Umweltschadensgesetz"],
          ],
          hervorheben: 2,
          minBreite: 820,
          fussnote: "Bezeichnungen und Zuschnitt unterscheiden sich je Versicherer. In Österreich und der Schweiz sind die Bausteine vergleichbar, Bedingungen und Pflichtversicherungen richten sich nach nationalem Recht.",
        },
        {
          typ: "h3",
          text: "Bau: Übergang zwischen EPC und Betreiber",
        },
        {
          typ: "p",
          text: "Während des Baus versichert häufig der Generalunternehmer die Montage, weil er bis zur Abnahme die Gefahr trägt. Für den Investor ist entscheidend, dass zwischen Ende der Bauphase und Beginn der Betriebspolice **kein Tag ohne Deckung** bleibt – etwa bei Teilinbetriebnahmen einzelner Bauabschnitte. Sinnvoll ist außerdem eine Deckung für verzögerte Inbetriebnahme (Advance Loss of Profit), wenn ein Bauschaden den [COD](/wissen/lexikon#cod) verschiebt und dadurch Erlöse entfallen.",
        },
        {
          typ: "h3",
          text: "Betrieb: Allgefahren statt Einzelgefahren",
        },
        {
          typ: "p",
          text: "Im Betrieb hat sich die Allgefahrendeckung durchgesetzt: Versichert ist jeder unvorhergesehene Sachschaden, soweit er nicht ausdrücklich ausgeschlossen ist. Das kehrt die Beweislast praktisch um – nicht der Betreiber muss eine versicherte Gefahr nachweisen, sondern der Versicherer einen Ausschluss. Typisch ausgeschlossen sind Verschleiß, allmähliche Degradation, Mängel, für die der Hersteller haftet, und Serienschäden ab einer bestimmten Quote. Leistungsgarantien der Modulhersteller ersetzen die Versicherung nicht, sondern ergänzen sie.",
        },
      ],
    },
    {
      id: "ertragsausfall",
      titel: "Ertragsausfall: Wie die Betriebsunterbrechungsversicherung rechnet",
      tocLabel: "Ertragsausfall",
      bloecke: [
        {
          typ: "p",
          text: `**Die [Betriebsunterbrechungsversicherung](/wissen/lexikon#betriebsunterbrechungsversicherung) ersetzt die Erlöse, die nach einem versicherten Sachschaden entgehen, bis die Anlage wieder produziert – begrenzt durch die vereinbarte Haftzeit.** Im Beispiel eines 10-MWp-Parks in Süddeutschland mit einem Zuschlag von ${fmtCt(ERLOESE.eegFreiflaecheCt)} liegen die Stromerlöse im ersten Jahr bei rund ${fmtEur(Math.round(ERLOES_1 / 1000) * 1000)}, im Jahresmittel also bei gut ${fmtEur(Math.round(ERLOES_TAG / 10) * 10)} pro Tag.`,
        },
        {
          typ: "p",
          text: `Fällt nach einem Brand in einer Trafostation die Hälfte des Parks für ${fmt(AUSFALL_TAGE)} Tage aus, entgehen im Jahresmittel rund ${fmtEur(Math.round(BU_SCHADEN / 1000) * 1000)} – im Sommer deutlich mehr, im Winter weniger, weil ein Großteil des Jahresertrags zwischen April und September entsteht. Gute Policen rechnen den Ausfall deshalb nicht pauschal, sondern mit der Einstrahlung im Ausfallzeitraum und den Monitoringdaten vergleichbarer Parkteile. Grundlage ist oft das [Ertragsgutachten mit P50/P90](/wissen/ratgeber/ertragsgutachten-p50-p90).`,
        },
        {
          typ: "checkliste",
          punkte: [
            "**Haftzeit:** so lang, dass auch die Lieferung großer Komponenten (Transformator, Mittelspannungsschaltanlage) abgedeckt ist – Lieferzeiten von vielen Monaten sind keine Seltenheit.",
            "**Zeitlicher Selbstbehalt:** wie viele Tage der Betreiber selbst trägt, bevor die Versicherung zahlt.",
            "**Berechnungsbasis:** Vergütung nach EEG oder PPA-Preis, Umgang mit [Redispatch](/wissen/lexikon#redispatch) und Zeiten negativer Preise, in denen ohnehin keine Marktprämie gezahlt wird (§ 51 EEG).",
            "**Rückwirkungsschäden:** Ausfall durch Schäden außerhalb des Parks, etwa am Umspannwerk des Netzbetreibers – nur mit ausdrücklicher Klausel versichert.",
            "**Mehrkosten:** Kosten für provisorische Lösungen, Mietgeräte und Eilfracht, die den Ausfall verkürzen.",
          ],
        },
        {
          typ: "kasten",
          variant: "info",
          titel: "Abregelung ist kein Versicherungsfall",
          text: "Wenn der Netzbetreiber die Einspeisung wegen Netzengpässen reduziert, handelt es sich nicht um einen Sachschaden. Die Entschädigung ist im Energierecht geregelt, nicht in der Versicherung. Ähnliches gilt für Zeiten mit [negativen Strompreisen](/wissen/ratgeber/negative-strompreise-solarspitzengesetz). Wie Anschluss und Kapazität zustande kommen, erklärt der Ratgeber [Netzanschluss für Solarparks](/wissen/ratgeber/netzanschluss-solarpark).",
        },
      ],
    },
    {
      id: "gefahren",
      titel: "Diebstahl, Hagel, Brand, Tierverbiss: Die typischen Schäden",
      tocLabel: "Typische Schäden",
      bloecke: [
        {
          typ: "p",
          text: "**Die meisten Schäden an Freiflächenanlagen entstehen durch Diebstahl, Naturgefahren, Überspannung und Tiere – und fast alle lassen sich durch Planung und Betrieb spürbar reduzieren.** Der Leitfaden VdS 3145 von GDV und VDE nennt für Freiflächenanlagen unter anderem Diebstahl und Vandalismus, Wald- und Wiesenbrände, Hagel und Tierverbiss als besonders zu berücksichtigende Gefahren.",
        },
        {
          typ: "tabelle",
          caption: "Typische Gefahren im Solarpark und wirksame Gegenmaßnahmen",
          kopf: ["Gefahr", "Typischer Schaden", "Vorbeugung"],
          zeilen: [
            ["Diebstahl", "Kupferkabel, Module, Wechselrichter; oft mit hohem Folgeschaden durch Stillstand und Neuverkabelung", "abgestimmtes Sicherheitskonzept (siehe unten), gesicherte Kabelwege, Sicherheitsverschraubung der Module, keine öffentlichen Detailangaben zur Anlage"],
            ["Hagel", "Glasbruch, Mikrorisse, Ertragsverlust erst später sichtbar", "Module mit hoher Hagelwiderstandsklasse (z. B. Hagelregister), dickeres Glas, bei Trackern Schutzstellung bei Hagelwarnung"],
            ["Brand", "Brand an Wechselrichter, Trafo oder Steckverbindern; Übergreifen auf trockenen Bewuchs", "fachgerechte Installation und Inbetriebnahmeprüfung, Thermografie, kurz gehaltener Bewuchs, Brandschutzstreifen, Zufahrt für die Feuerwehr"],
            ["Blitz und Überspannung", "Defekte an Wechselrichtern, Überwachungs- und Kommunikationstechnik", "Erdungs- und Blitzschutzkonzept, Überspannungsschutz, wiederkehrende Prüfung"],
            ["Tierverbiss", "Nager und Marder an Kabeln; bei Beweidung auch Schäden durch Weidetiere", "Kabel in Schutzrohren oder unzugänglich führen, geeignete Weidetierarten und Kabelführung"],
            ["Sturm und Schneedruck", "verbogene Unterkonstruktion, abgerissene Module", "Statik nach Normlasten des Standorts, Prüfung nach Sturmereignissen"],
          ],
          hervorheben: 2,
          minBreite: 780,
          fussnote: "Qualitative Einordnung auf Basis von VdS 3145 (GDV/VDE) und Versicherungspraxis. Welche Maßnahmen verbindlich sind, legt der jeweilige Versicherer fest.",
        },
        {
          typ: "p",
          text: `Für den Betrieb empfiehlt die VdS 3145 eine jährliche Sichtprüfung durch einen Fachbetrieb und mindestens alle ${fmt(PRUEF_JAHRE)} Jahre eine wiederkehrende Prüfung nach DIN EN 62446-1; ergänzend kann eine Thermografie durch zertifizierte Fachleute Wärmequellen an Zellen und Verbindungen sichtbar machen. Viele Versicherer machen solche Prüfungen zur Obliegenheit – sie gehören deshalb in den [O&M-Vertrag](/wissen/lexikon#o-und-m). Wer seinen Park beweiden lässt, sollte Kabelführung und Tierart früh abstimmen; Details im Ratgeber [Beweidung mit Schafen](/wissen/ratgeber/solarpark-beweidung-schafe).`,
        },
      ],
    },
    {
      id: "sicherheitskonzept",
      titel: "Sicherheitskonzept: Zaun, Detektion und Videoüberwachung",
      tocLabel: "Sicherheitskonzept",
      bloecke: [
        {
          typ: "p",
          text: "**Das Diebstahlschutzkonzept sollte laut VdS 3145 bereits in der Planungsphase mit dem Versicherer abgestimmt werden – im Nachhinein ist es teurer und oft weniger wirksam.** In der Praxis verlangen Versicherer gerade bei abgelegenen Parks ein mehrstufiges Konzept, das Eindringen erschwert, früh erkennt und schnell eine Reaktion auslöst.",
        },
        {
          typ: "ablauf",
          schritte: [
            ["Erschweren", "Stabile Einfriedung mit Übersteigschutz, gesicherte Tore, verdeckt oder geschützt verlegte Kabel, gesicherte Modulbefestigung."],
            ["Erkennen", "Zaun- oder Bewegungsdetektion und Kameras mit Wärmebild, deren Alarm auf eine ständig besetzte Leitstelle aufgeschaltet ist."],
            ["Reagieren", "Festgelegter Interventionsplan mit Sicherheitsdienst und Polizei, Beleuchtung oder akustische Warnung bei Alarm."],
            ["Nachweisen", "Dokumentierte Wartung der Sicherheitstechnik, Protokolle der Leitstelle, regelmäßige Funktionsprüfung."],
          ],
        },
        {
          typ: "p",
          text: "Wichtig ist, dass das Konzept mit Planung und Genehmigung zusammenpasst: Zaunhöhe, Durchlässe für Kleintiere und Beleuchtung sind oft auch Thema im Bebauungsplan und beim Artenschutz – dazu der Ratgeber [Artenschutz und Biodiversität](/wissen/ratgeber/solarpark-artenschutz-biodiversitaet). Kameras müssen datenschutzkonform ausgerichtet sein, insbesondere an öffentlichen Wegen. Die laufenden Kosten für Überwachung und Sicherheitsdienst sind in den Betriebskosten der Website-Rechner (rund " + fmt(FREIFLAECHE.opexProKwp) + " €/kWp und Jahr ohne Pacht) enthalten; bei hohem Risiko können sie darüber liegen.",
        },
      ],
    },
    {
      id: "kosten",
      titel: "Was kostet die Versicherung eines Solarparks?",
      tocLabel: "Kosten",
      bloecke: [
        {
          typ: "p",
          text: `**Für die Sach- und Ertragsausfallversicherung eines Freiflächenparks werden nach Makler- und Marktangaben in der Regel etwa ${promille(PRAEMIE_ANTEIL.min)} bis ${promille(PRAEMIE_ANTEIL.max)} der Investitionssumme pro Jahr fällig; die Haftpflicht kommt vergleichsweise günstig hinzu.** Belastbare veröffentlichte Marktstatistiken gibt es nicht – die Spanne ist eine Orientierung, kein Angebot.`,
        },
        {
          typ: "tabelle",
          caption: `Prämienbeispiel für ${fmt(STANDARD.mwp)} MWp in Süddeutschland (Investition ${fmtMio(INV)})`,
          kopf: ["Kennzahl", "Unteres Ende", "Oberes Ende"],
          zeilen: [
            ["Prämiensatz (Anteil an der Investition)", promille(PRAEMIE_ANTEIL.min), promille(PRAEMIE_ANTEIL.max)],
            ["**Jahresprämie Sach und Ertragsausfall**", `**${fmtEur(Math.round(PR_MIN / 100) * 100)}**`, `**${fmtEur(Math.round(PR_MAX / 100) * 100)}**`],
            ["je kWp und Jahr", `${fmt(PR_KWP_MIN, 2)} €`, `${fmt(PR_KWP_MAX, 2)} €`],
            ["Anteil an den Betriebskosten (" + fmt(FREIFLAECHE.opexProKwp) + " €/kWp)", fmtPct(PR_KWP_MIN / FREIFLAECHE.opexProKwp, 0), fmtPct(PR_KWP_MAX / FREIFLAECHE.opexProKwp, 0)],
            ["Anteil an den Stromerlösen im ersten Jahr", fmtPct(PR_MIN / ERLOES_1, 1), fmtPct(PR_MAX / ERLOES_1, 1)],
          ],
          hervorheben: 2,
          markierteZeile: 1,
          minBreite: 560,
          fussnote: "Orientierungswerte, keine Angebote, zuzüglich Versicherungsteuer. Die Prämie hängt vor allem von Diebstahlrisiko der Region, Sicherheitskonzept, Selbstbehalt, Haftzeit, Hagelrisiko und Schadenhistorie ab.",
        },
        {
          typ: "p",
          text: "Die Prämie selbst entscheidet selten über die Wirtschaftlichkeit eines Parks – der Selbstbehalt und die Frage, ob Diebstahl überhaupt gedeckt ist, oft schon. Nach mehreren Diebstahlserien haben Versicherer die Bedingungen für Freiflächenanlagen verschärft: höhere Selbstbehalte, Sublimits für Diebstahl und strengere Sicherheitsauflagen. Rechnen Sie im [Solarpark-Rechner](/de/rechner/solarpark) durch, was höhere Betriebskosten für Rendite und DSCR bedeuten.",
        },
      ],
    },
    {
      id: "banken",
      titel: "Was Banken und Investoren von der Versicherung verlangen",
      tocLabel: "Bankanforderungen",
      bloecke: [
        {
          typ: "p",
          text: `**Ohne Versicherungskonzept, das die Bank akzeptiert, gibt es keine Projektfinanzierung.** Die Bank will sicherstellen, dass nach einem Schaden entweder die Anlage wiederhergestellt oder das Darlehen bedient wird – und dass der Schuldendienstdeckungsgrad ([DSCR](/wissen/lexikon#dscr)) von mindestens ${fmt(FINANZIERUNG.dscrZiel, 2)}, mit dem die Rechner kalkulieren, auch im Schadenjahr nicht einbricht.`,
        },
        {
          typ: "checkliste",
          punkte: [
            "**Sicherungsschein bzw. Abtretung:** Die Bank wird als Sicherungsgläubigerin eingetragen, Entschädigungen fließen zunächst an sie.",
            "**Mindestdeckung:** Sachversicherung zum Neuwert, Ertragsausfall mit ausreichender Haftzeit, Haftpflicht mit festgelegter Mindestsumme.",
            "**Qualität des Versicherers:** Anforderungen an Bonität bzw. Rating, bei großen Finanzierungen Prüfung durch einen unabhängigen Versicherungsberater der Bank.",
            "**Kündigungs- und Änderungsschutz:** Der Versicherer informiert die Bank vor Kündigung oder Deckungsänderung.",
            "**Jährlicher Nachweis:** Bestätigung, dass Prämien gezahlt und Obliegenheiten erfüllt sind.",
          ],
        },
        {
          typ: "p",
          text: "Beim Kauf eines Bestandsparks gehören Policen, Schadenhistorie der letzten Jahre und laufende Schadenfälle in den Datenraum. Eine hohe Schadenquote kann die Prämie nach dem Eigentümerwechsel deutlich erhöhen – ein Punkt, der in die Bewertung einfließt. Mehr dazu im Ratgeber [Wert einer Bestandsanlage](/wissen/ratgeber/solarpark-bestandsanlage-wert) und in der Checkliste zum [Projektkauf](/wissen/ratgeber/projektrechte-kaufen-due-diligence).",
        },
      ],
    },
    {
      id: "haftung",
      titel: "Haftpflicht und Umwelthaftung: Verpächter und Behörden",
      tocLabel: "Haftung",
      bloecke: [
        {
          typ: "p",
          text: "**Der Betreiber haftet für Schäden, die vom Park ausgehen – gegenüber Nachbarn, Besuchern, Dienstleistern und dem Verpächter.** Der Pachtvertrag verlangt deshalb in der Regel eine Betreiberhaftpflicht und eine Freistellung des Eigentümers; die typischen Klauseln erklärt der Ratgeber [Pachtvertrag für Solarparks](/wissen/ratgeber/pachtvertrag-solarpark).",
        },
        {
          typ: "p",
          text: "Eigene Aufmerksamkeit verdienen Umweltschäden. Nach dem Umweltschadensgesetz müssen Verantwortliche Schäden an Boden, Gewässern und geschützten Arten auf eigene Kosten vermeiden und sanieren – unabhängig davon, ob ein Dritter Ansprüche stellt. Relevant sind etwa auslaufendes Transformatoröl oder belastetes Löschwasser nach einem Brand. Eine Umweltschadensversicherung deckt diese öffentlich-rechtlichen Pflichten ab, die klassische Haftpflicht oft nicht. Auch die Pflichten zum Rückbau am Ende der Laufzeit sind nicht versicherbar, sondern werden über Bürgschaften abgesichert – siehe [Rückbau und Rückbaubürgschaft](/wissen/ratgeber/solarpark-rueckbau-rueckbaubuergschaft).",
        },
      ],
    },
    {
      id: "schadenfall",
      titel: "Schadenmanagement: So gehen Sie im Schadenfall vor",
      tocLabel: "Schadenfall",
      bloecke: [
        {
          typ: "p",
          text: "**Im Schadenfall gilt: Schaden begrenzen, sofort melden, alles dokumentieren – und nichts endgültig verändern, bevor der Versicherer zugestimmt hat.** Das Versicherungsvertragsgesetz verpflichtet zur Schadenminderung (§ 82 VVG); wer Obliegenheiten verletzt, riskiert je nach Verschulden eine Kürzung der Leistung (§ 28 VVG), bei grob fahrlässiger Herbeiführung des Schadens ebenfalls (§ 81 VVG).",
        },
        {
          typ: "ablauf",
          schritte: [
            ["Sichern und mindern", "Gefahr beseitigen, betroffene Stränge freischalten lassen, Folgeschäden verhindern – nur durch Elektrofachkräfte."],
            ["Melden", "Versicherer bzw. Makler unverzüglich informieren; bei Diebstahl und Vandalismus Anzeige bei der Polizei, Stehlgutliste erstellen."],
            ["Dokumentieren", "Fotos, Monitoringdaten, Alarmprotokolle, Wetterdaten und betroffene Seriennummern sichern."],
            ["Begutachten", "Termin mit dem Sachverständigen des Versicherers abstimmen, vorher keine Beweise entfernen, außer zur Schadenminderung."],
            ["Wiederherstellen und abrechnen", "Reparatur beauftragen, Ertragsausfall anhand von Einstrahlung und Monitoring nachweisen, Bank informieren."],
          ],
        },
        {
          typ: "p",
          text: "Gutes Schadenmanagement beginnt vor dem Schaden: mit einem Betriebsführer, der Monitoring und Alarmierung rund um die Uhr im Blick hat, einem Ersatzteillager für kritische Komponenten und klaren Zuständigkeiten. Investoren, die Bestandsparks oder baureife Projekte suchen, finden in der [Projektbörse](/projektboerse) Angebote mit Datenraum; mehr zum Einstieg auf der Seite [Investoren](/investoren).",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Was kostet die Versicherung für einen Solarpark?",
      a: `Für Sach- und Ertragsausfalldeckung werden nach Marktangaben grob ${promille(PRAEMIE_ANTEIL.min)} bis ${promille(PRAEMIE_ANTEIL.max)} der Investition pro Jahr genannt – bei 10 MWp etwa ${fmtEur(Math.round(PR_MIN / 1000) * 1000)} bis ${fmtEur(Math.round(PR_MAX / 1000) * 1000)}. Diebstahlrisiko, Sicherheitskonzept und Selbstbehalt verschieben den Preis deutlich.`,
    },
    {
      q: "Ist Kabeldiebstahl im Solarpark versichert?",
      a: "In der Allgefahrenversicherung meist ja, oft aber mit Sublimit, höherem Selbstbehalt und Auflagen an Zaun, Detektion und Videoüberwachung. Werden vereinbarte Sicherheitsmaßnahmen nicht eingehalten, kann der Versicherer die Leistung kürzen.",
    },
    {
      q: "Was ist der Unterschied zwischen Montage- und Allgefahrenversicherung?",
      a: "Die Montage- oder Bauleistungsversicherung deckt Schäden während der Errichtung bis zur Abnahme. Die Allgefahren- bzw. Elektronikversicherung übernimmt danach im Betrieb. Wichtig ist ein lückenloser Übergang, auch bei Teilinbetriebnahmen.",
    },
    {
      q: "Zahlt die Versicherung, wenn der Netzbetreiber abregelt?",
      a: "Nein. Abregelung wegen Netzengpässen ist kein Sachschaden; die Entschädigung ist energierechtlich geregelt. Versichert ist Ertragsausfall nur nach einem versicherten Sachschaden, bei Schäden außerhalb des Parks nur mit Rückwirkungsklausel.",
    },
    {
      q: "Brauche ich als Verpächter eine eigene Versicherung?",
      a: "In der Regel nicht für den Park selbst. Der Pachtvertrag sollte den Betreiber verpflichten, eine Haftpflichtversicherung nachzuweisen und Sie von Ansprüchen Dritter freizustellen. Prüfen Sie, ob Ihre eigene Betriebs- oder Grundbesitzerhaftpflicht die verpachtete Fläche noch abdeckt.",
    },
    {
      q: "Welche Versicherungen verlangen Banken für die Finanzierung?",
      a: "Üblich sind Sachversicherung zum Neuwert, Ertragsausfall mit ausreichender Haftzeit und Betreiberhaftpflicht. Die Bank wird Sicherungsgläubigerin, lässt sich Ansprüche abtreten und verlangt jährliche Nachweise.",
    },
  ],

  passend: [
    { href: "/wissen/ratgeber/ertragsgutachten-p50-p90", titel: "Ertragsgutachten P50/P90", text: "Grundlage für Finanzierung und Ertragsausfalldeckung." },
    { href: "/wissen/ratgeber/pachtvertrag-solarpark", titel: "Pachtvertrag Solarpark", text: "Haftung, Freistellung und Versicherungspflichten im Vertrag." },
    { href: "/wissen/ratgeber/solarpark-investment-rendite", titel: "Solarpark als Investment", text: "Wie Betriebskosten auf Rendite und Finanzierung wirken." },
    { href: pfad("/rechner/solarpark"), titel: "Solarpark-Rechner", text: "Betriebskosten, DSCR und Rendite mit eigenen Werten." },
  ],

  quellen: [
    { titel: "VdS 3145:2025-06 – Photovoltaikanlagen, Technischer Leitfaden (GDV/VDE)", url: "https://shop.vds.de/download/vds-3145", stand: "09/2026" },
    { titel: "VdS 3145 – Entwurf 2025-04, Konsultationsfassung (GDV)", url: "https://vds.de/fileadmin/publikationen/konsultation/gdv/3145/3145Entwurf_Andruck05.pdf", stand: "09/2026" },
    { titel: "Versicherungsvertragsgesetz (VVG), § 28 – Verletzung einer vertraglichen Obliegenheit", url: "https://www.gesetze-im-internet.de/vvg_2008/__28.html", stand: "09/2026" },
    { titel: "Versicherungsvertragsgesetz (VVG), § 81 – Herbeiführung des Versicherungsfalles", url: "https://www.gesetze-im-internet.de/vvg_2008/__81.html", stand: "09/2026" },
    { titel: "Versicherungsvertragsgesetz (VVG), § 82 – Abwendung und Minderung des Schadens", url: "https://www.gesetze-im-internet.de/vvg_2008/__82.html", stand: "09/2026" },
    { titel: "Umweltschadensgesetz (USchadG)", url: "https://www.gesetze-im-internet.de/uschadg/", stand: "09/2026" },
    { titel: "EEG 2023, § 51 – Verringerung des Zahlungsanspruchs bei negativen Preisen", url: "https://www.gesetze-im-internet.de/eeg_2014/__51.html", stand: "09/2026" },
    { titel: "Hagelregister (VKF/Schweiz) – Hagelwiderstand von Bauteilen", url: "https://www.hagelregister.ch/", stand: "09/2026" },
  ],

  seitenCta: { titel: "Betriebskosten durchrechnen", text: "Was Versicherung und Sicherheit für Rendite und DSCR bedeuten.", href: pfad("/rechner/solarpark"), label: "Zum Solarpark-Rechner" },
  cta: {
    title: "Solarparks mit vollständigen Unterlagen finden.",
    text: "In der Projektbörse sehen Investoren nach NDA Policen, Gutachten und Betriebsdaten im Datenraum. Für Käufer ist die Plattform kostenfrei.",
    primary: { label: "Zur Projektbörse", href: "/projektboerse" },
    secondary: { label: "Für Investoren", href: "/investoren" },
  },
};

export default artikel;
