// Ratgeber: Parkplatz-Solarpflicht nach Bundesland
// Landesrecht geprüft 09/2026 (Primärquellen, soweit abrufbar): KlimaG BW/PVPf-VO (UM BW),
// § 16a HmbKliSchG (hamburg.de), § 32a NBauO (NI-VORIS), § 48 Abs. 1a BauO NRW + SAN-VO NRW (recht.nrw.de),
// § 25 EWKG SH (schleswig-holstein.de), § 32a BbgBO aufgehoben (MIL Brandenburg, Haufe),
// LBO Saarland §§ 12a/12b, HEG Hessen, LSolarG RLP, Art. 44a BayBO (gesetze-bayern.de),
// GModG § 106 (KEAN), GEIG §§ 7, 10 (gesetze-im-internet.de), KEnG Bern (weu.be.ch).
// Wirtschaftlichkeit aus CARPORT/STROM/ERLOESE (markt.js).

import { CARPORT, STROM, ERLOESE, FREIFLAECHE, regionById, irr } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtPct } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

// Rechenbeispiel: neuer Kundenparkplatz mit 60 Stellplätzen in NRW/Hessen (Region West)
const STELLPLAETZE = 60;
const UEBERDACHT = 0.6; // Anteil überdachter Stellplätze (z. B. BW/RLP/Saarland: 60 %)
const REGION = regionById("de-west");
const KWP = Math.round(STELLPLAETZE * UEBERDACHT * CARPORT.kwpProStellplatz * 10) / 10;
const CAPEX = KWP * CARPORT.capexProKwp.mittel;
const ERTRAG = KWP * REGION.ertrag * CARPORT.ertragFaktor;
const EIGEN = 0.7; // Annahme: 70 % Eigenverbrauch im Markt/Gebäude tagsüber
const BEZUG_CT = STROM.bestandteile.reduce((s, b) => s + b.ct, 0);
const NUTZEN_JAHR = ERTRAG * (EIGEN * BEZUG_CT + (1 - EIGEN) * ERLOESE.merchantCt) / 100 - KWP * CARPORT.opexProKwp;
const LAUFZEIT = 25;
const CASHFLOWS = [-CAPEX, ...Array.from({ length: LAUFZEIT }, (_, t) => NUTZEN_JAHR * Math.pow(1 - FREIFLAECHE.degradation, t))];
const RENDITE = irr(CASHFLOWS);
const AMORT = CAPEX / NUTZEN_JAHR;
const LADE_AC = 4;

const artikel = {
  slug: "parkplatz-solarpflicht-bundeslaender",
  title: "Parkplatz-Solarpflicht 2026: Was in jedem Bundesland gilt",
  seoTitle: "Parkplatz-Solarpflicht nach Bundesland 2026 | ÖkoInvest",
  kurzTitel: "Parkplatz-Solarpflicht",
  description:
    "Parkplatz-Solarpflicht 2026: alle Bundesländer mit Schwellen, Stichtagen und Rechtsgrundlagen, Ausnahmen, Bundesregel ab 2030 und Kosten eines Solarcarports.",
  excerpt:
    "Acht Bundesländer schreiben für neue Parkplätze Photovoltaik vor, Brandenburg hat seine Pflicht 2026 wieder gestrichen. Schwellen, Stichtage, Ausnahmen und was ein Solarcarport wirtschaftlich bringt.",
  hauptKeyword: "parkplatz solarpflicht",
  keywords: [
    "Parkplatz Solarpflicht",
    "Solarpflicht Parkplätze Bundesländer",
    "PV-Pflicht Parkplatz",
    "Photovoltaik Pflicht Stellplätze",
    "Solarcarport Pflicht",
    "Parkplatz-PV Kosten",
    "GModG Solarpflicht",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Recht & Genehmigung",
  bild: "/img/gewerbedach.jpg",
  bildAlt: "Techniker mit gelbem Schutzhelm und Warnjacke kniet mit Funkgerät zwischen Solarmodulen auf einem Gewerbedach",
  badge: { wert: "8 von 16", text: "Bundesländern mit PV-Pflicht für neue Parkplätze (Stand 09/2026)" },

  kurzFazit: [
    "**In acht Bundesländern gilt für neue, größere Parkplätze eine Solarpflicht:** Baden-Württemberg, Hamburg, Hessen, Niedersachsen, Nordrhein-Westfalen, Rheinland-Pfalz, Saarland und Schleswig-Holstein.",
    "Die Schwellen reichen von **mehr als 25 Stellplätzen (Niedersachsen)** bis **mehr als 70 Stellplätzen (Schleswig-Holstein)**. Meist müssen 30 bis 60 % der geeigneten Stellplatzfläche überdacht werden.",
    "**Brandenburg hat seine Pflicht (§ 32a BbgBO) zum 30. Juni 2026 wieder aufgehoben.** Bayern, Berlin, Bremen, Mecklenburg-Vorpommern, Sachsen, Sachsen-Anhalt und Thüringen kennen keine Parkplatzpflicht.",
    `Ab 2030 kommt bundesweit eine Pflicht für neue **überdachte Parkplätze an Gebäuden** (§ 106 GModG). Wirtschaftlich rechnet sich Parkplatz-PV vor allem mit hohem Eigenverbrauch: im Beispiel rund **${fmt(AMORT, 0)} Jahre** Amortisation.`,
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Wo gilt eine Solarpflicht für Parkplätze?",
      tocLabel: "Wo gilt die Pflicht?",
      bloecke: [
        {
          typ: "p",
          text: "**Eine Solarpflicht für neue Parkplätze gilt nach aktuellem Stand in Baden-Württemberg, Hamburg, Hessen, Niedersachsen, Nordrhein-Westfalen, Rheinland-Pfalz, im Saarland und in Schleswig-Holstein.** Sie greift jeweils erst ab einer Mindestzahl an Stellplätzen und in der Regel nur beim Neubau oder bei großen Erweiterungen, nicht für bestehende Parkplätze.",
        },
        {
          typ: "p",
          text: "Die [Parkplatz-Solarpflicht](/wissen/lexikon#parkplatz-solarpflicht) ist Landesrecht und steht mal in der Bauordnung, mal im Klimaschutz- oder Energiegesetz. Deshalb unterscheiden sich nicht nur die Schwellen, sondern auch die Details: Wer ist verpflichtet? Zählen Stellplätze für Wohnungen mit? Darf die Pflicht auf einem Dach statt über dem Parkplatz erfüllt werden? Die folgende Übersicht fasst das zusammen – für ein konkretes Bauvorhaben ersetzt sie nicht den Blick in den aktuellen Gesetzestext und die Abstimmung mit der Bauaufsicht.",
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Landesrecht ändert sich laufend",
          text: "Brandenburg hat seine Parkplatzpflicht zum 30. Juni 2026 wieder gestrichen, Niedersachsen und Schleswig-Holstein haben ihre Schwellen verschärft. Viele Übersichten im Netz sind deshalb veraltet. Maßgeblich ist immer der Gesetzesstand zum Eingang Ihres Bauantrags.",
        },
      ],
    },
    {
      id: "uebersicht",
      titel: "Übersicht: Parkplatz-Solarpflicht in allen 16 Bundesländern",
      tocLabel: "Tabelle Bundesländer",
      bloecke: [
        {
          typ: "p",
          text: "**Die Tabelle zeigt für jedes Land die Schwelle, den Stichtag, die Rechtsgrundlage und den geforderten Umfang.** Angaben „mehr als 35“ bedeuten: Die Pflicht beginnt ab dem 36. Stellplatz.",
        },
        {
          typ: "tabelle",
          caption: "Solarpflicht für neue Parkplätze nach Bundesland (Stand September 2026)",
          kopf: ["Bundesland", "Pflicht", "Schwelle", "Seit", "Rechtsgrundlage", "Umfang / Besonderheit"],
          zeilen: [
            ["Baden-Württemberg", "ja", "mehr als 35 Stellplätze", "01.01.2022", "§ 23 KlimaG BW, PVPf-VO", "60 % der Eignungsfläche; Ersatz auf neuem Gebäude in der Nähe möglich"],
            ["Bayern", "nein", "–", "–", "Art. 44a BayBO nur Dächer", "keine Parkplatzpflicht"],
            ["Berlin", "nein", "–", "–", "Solargesetz Berlin nur Gebäude", "keine Parkplatzpflicht"],
            ["Brandenburg", "aufgehoben", "war: mehr als 35 (Nichtwohngebäude)", "01.06.2024 bis 29.06.2026", "§ 32a BbgBO (aufgehoben)", "durch 4. Änderungsgesetz zur BbgBO gestrichen"],
            ["Bremen", "nein", "–", "–", "BremSolarG nur Gebäude", "keine Parkplatzpflicht"],
            ["Hamburg", "ja", "mehr als 35 neue Stellplätze (auch Erweiterung)", "01.01.2024", "§ 16a HmbKliSchG, PVUmsVO", "40 % der geeigneten Fläche; Ersatz auf Dächern desselben Grundstücks"],
            ["Hessen", "ja", "mehr als 50 (landeseigen: mehr als 35)", "Bauantrag nach 29.11.2023", "Hessisches Energiegesetz (HEG)", "Anlage über der Stellplatzfläche"],
            ["Mecklenburg-Vorpommern", "nein", "–", "–", "–", "keine Parkplatzpflicht"],
            ["Niedersachsen", "ja", "mehr als 25 Einstellplätze", "01.01.2025 (vorher mehr als 50)", "§ 32a Abs. 3 NBauO", "auch bei Erneuerung von mind. 50 % eines bestehenden Parkplatzes"],
            ["Nordrhein-Westfalen", "ja", "mehr als 35 notwendige Stellplätze eines Nichtwohngebäudes", "01.01.2022", "§ 48 Abs. 1a BauO NRW, SAN-VO NRW", "30 % der geeigneten Fläche; alternativ ein Laubbaum je 5 Stellplätze"],
            ["Rheinland-Pfalz", "ja", "ab 50 Stellplätzen (gewerblich, öffentlich)", "01.01.2023 (öffentlich 2024)", "Landessolargesetz (LSolarG)", "60 % der geeigneten Fläche; Ersatz in unmittelbarer Nähe"],
            ["Saarland", "ja", "ab 35 gewerblich genutzten Stellplätzen, öffentliche Parkplätze", "2025", "§§ 12a, 12b LBO Saarland", "60 % der geeigneten Fläche; Ersatz auf Dach desselben Grundstücks"],
            ["Sachsen", "nein", "–", "–", "–", "keine Parkplatzpflicht"],
            ["Sachsen-Anhalt", "nein", "–", "–", "–", "keine Parkplatzpflicht"],
            ["Schleswig-Holstein", "ja", "mehr als 70 Stellplätze (vorher mehr als 100)", "Novelle 2025, Übergangsjahr", "§ 25 EWKG", "Neubau und grundlegende Sanierung; geeignete Stellplatzfläche"],
            ["Thüringen", "nein", "–", "–", "–", "keine Parkplatzpflicht"],
          ],
          hervorheben: 2,
          minBreite: 900,
          fussnote: "Eigene Zusammenstellung aus Landesrecht und Angaben der Landesministerien, abgerufen September 2026. Stichtage beziehen sich meist auf den Eingang des Bauantrags. Saarland: Gesetz in Kraft seit 26.04.2025, einzelne Pflichten mit späterem Anwendungsbeginn. Schleswig-Holstein: keine Pflicht, wenn der Bauantrag innerhalb eines Jahres nach Inkrafttreten der Novelle gestellt wurde. Landesrecht ändert sich häufig – vor der Planung den aktuellen Stand prüfen.",
        },
        {
          typ: "p",
          text: "Parkplätze, die unmittelbar an öffentlichen Straßen liegen, sind in mehreren Ländern ausgenommen. In Baden-Württemberg zählen nur Flächen, auf denen mindestens vier Stellplätze zusammenhängend für Pkw angeordnet sind; über Fahrgassen müssen keine Module stehen.",
        },
      ],
    },
    {
      id: "ausnahmen",
      titel: "Ausnahmen und Ersatzerfüllung",
      tocLabel: "Ausnahmen",
      bloecke: [
        {
          typ: "p",
          text: "**Alle Länder sehen Ausnahmen vor, wenn die Pflicht technisch unmöglich, wirtschaftlich unzumutbar oder mit anderem öffentlichem Recht unvereinbar ist.** Wie „unzumutbar“ definiert wird, unterscheidet sich erheblich.",
        },
        {
          typ: "liste",
          punkte: [
            "**Hamburg:** Ausnahme u. a., wenn die Kosten der PV-Anlage 20 % der Baukosten der Stellplatzanlage übersteigen, bei nur vorübergehend genutzten Stellplätzen oder wenn kein Netzanschluss möglich ist.",
            "**Nordrhein-Westfalen:** Die SAN-VO nennt eine Amortisationszeit von über 25 Jahren als Grenze; Stellplätze direkt an öffentlichen Straßen sind ausgenommen. Alternativ kann ein Laubbaum je fünf Stellplätze gepflanzt werden.",
            "**Baden-Württemberg:** Ausnahme u. a., wenn kein Netzanschluss möglich ist oder verweigert wird.",
            "**Schleswig-Holstein:** Befreiung bei unangemessenem Aufwand oder Unvereinbarkeit mit der Parkplatznutzung, z. B. Feuerwehrzufahrten oder regelmäßige Veranstaltungen.",
            "**Ersatzerfüllung:** In den meisten Ländern darf die geforderte Leistung ganz oder teilweise auf Dächern oder anderen Flächen in unmittelbarer Nähe errichtet werden; in einigen Ländern zählen auch Solarthermieanlagen.",
          ],
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Bundesweit ab 2030: § 106 GModG und EU-Gebäuderichtlinie",
          text: "Das Gebäudemodernisierungsgesetz (GModG), seit 29. Juli 2026 Nachfolger des GEG, setzt die EU-Gebäuderichtlinie (EPBD) um. Nach § 106 GModG müssen ab dem 1. Januar 2030 auch auf **neuen überdachten Parkplätzen, die physisch an ein Gebäude angrenzen**, Solaranlagen errichtet werden. Offene Parkplätze erfasst die Bundesregel nicht; strengere Landesregeln bleiben zulässig. Diese Darstellung ist keine Rechtsberatung – lassen Sie konkrete Vorhaben von Architekt oder Fachanwalt prüfen.",
        },
      ],
    },
    {
      id: "wirtschaftlichkeit",
      titel: "Lohnt sich ein Solarcarport auf dem Parkplatz?",
      tocLabel: "Wirtschaftlichkeit",
      bloecke: [
        {
          typ: "p",
          text: `**Ein Solarcarport kostet je kWp deutlich mehr als ein Solarpark, rechnet sich aber, wenn der Strom im angrenzenden Gebäude verbraucht wird.** Wir rechnen mit ${fmt(CARPORT.capexProKwp.min)} bis ${fmt(CARPORT.capexProKwp.max)} €/kWp inklusive Stahlbau, Fundamenten und Entwässerung – gegenüber rund ${fmt(FREIFLAECHE.capexProKwp.mittel)} €/kWp bei Freiflächenanlagen. Je Stellplatz passen etwa ${fmt(CARPORT.kwpProStellplatz, 1)} kWp.`,
        },
        {
          typ: "tabelle",
          caption: `Rechenbeispiel: Kundenparkplatz mit ${STELLPLAETZE} Stellplätzen, ${fmt(UEBERDACHT * 100)} % überdacht (West-/Mitteldeutschland)`,
          kopf: ["Kennzahl", "Wert", "Annahme"],
          zeilen: [
            ["Überdachte Stellplätze", `${fmt(STELLPLAETZE * UEBERDACHT)}`, `${fmt(UEBERDACHT * 100)} % von ${STELLPLAETZE}`],
            ["Anlagenleistung", `${fmt(KWP, 1)} kWp`, `${fmt(CARPORT.kwpProStellplatz, 1)} kWp je Stellplatz`],
            ["Investition", fmtEur(CAPEX), `${fmt(CARPORT.capexProKwp.mittel)} €/kWp (Mittelwert)`],
            ["Jahresertrag", `${fmt(ERTRAG / 1000, 1)} MWh`, `${fmt(REGION.ertrag)} kWh/kWp × ${fmt(CARPORT.ertragFaktor, 2)} (flache Neigung)`],
            ["Wert je selbst genutzter kWh", `${fmt(BEZUG_CT, 1)} ct`, "vermiedener Strombezug netto (Gewerbe 2026)"],
            ["Vorteil pro Jahr", fmtEur(NUTZEN_JAHR), `${fmt(EIGEN * 100)} % Eigenverbrauch, Rest zu ${fmt(ERLOESE.merchantCt, 1)} ct, abzüglich ${CARPORT.opexProKwp} €/kWp Betriebskosten`],
            ["Einfache Amortisation", `~${fmt(AMORT, 1)} Jahre`, "ohne Finanzierung und Förderung"],
            ["Projektrendite (IRR)", RENDITE != null ? fmtPct(RENDITE) : "–", `${LAUFZEIT} Jahre, ${fmt(FREIFLAECHE.degradation * 100, 1)} % Degradation p. a.`],
          ],
          hervorheben: 1,
          minBreite: 640,
          fussnote: "Orientierungswerte aus den zentralen Annahmen dieser Website (CARPORT, STROM, ERLOESE), keine Angebote. Nicht enthalten: Kosten des Parkplatzes selbst, Netzanschlussverstärkung, Ladeinfrastruktur, Steuern. Bei geringem Eigenverbrauch verschlechtert sich die Rechnung deutlich.",
        },
        {
          typ: "p",
          text: "Entscheidend ist der **Eigenverbrauch**: Ein Supermarkt, ein Logistikstandort oder ein Bürogebäude mit Tageslast nutzt den Strom direkt und spart den vollen Bezugspreis. Wer den Strom nur einspeist, erreicht mit Carport-Kosten kaum eine tragfähige Rendite. Große Parkplatzanlagen ab 1 MW können als besondere Solaranlage auch an der [EEG-Ausschreibung](/wissen/ratgeber/eeg-ausschreibung-freiflaeche) teilnehmen; alternativ kommt ein [PPA](/wissen/ratgeber/ppa-fuer-unternehmen) mit einem Abnehmer vor Ort in Frage.",
        },
        {
          typ: "tool",
          href: pfad("/rechner/solarcarport"),
          titel: "Rechnen Sie Ihren Parkplatz durch",
          text: "Stellplätze, Überdachungsgrad, Eigenverbrauch und Ladepunkte eingeben – mit Investition, Ertrag und Rendite.",
          label: "Zum Solarcarport-Rechner",
        },
      ],
    },
    {
      id: "laden",
      titel: "Ladeinfrastruktur: Was das GEIG zusätzlich verlangt",
      tocLabel: "Ladeinfrastruktur",
      bloecke: [
        {
          typ: "p",
          text: "**Neben der Solarpflicht gilt bundesweit das Gebäude-Elektromobilitätsinfrastruktur-Gesetz (GEIG): Neue Nichtwohngebäude mit mehr als sechs Stellplätzen brauchen Leitungsinfrastruktur für mindestens jeden dritten Stellplatz und mindestens einen Ladepunkt (§ 7 GEIG).** Bestehende Nichtwohngebäude mit mehr als 20 Stellplätzen müssen seit dem 1. Januar 2025 mindestens einen Ladepunkt haben (§ 10 GEIG).",
        },
        {
          typ: "p",
          text: `Solarcarport und Ladepunkte ergänzen sich: Leerrohre und Kabeltrassen lassen sich beim Bau der Fundamente gleich mitverlegen, und ein Teil des Solarstroms fließt direkt in die Fahrzeuge. Wir rechnen mit rund ${fmtEur(CARPORT.ladepunktAc)} je AC-Ladepunkt (11/22 kW) und rund ${fmtEur(CARPORT.ladepunktDc)} je DC-Schnelllader ohne Netzausbau. ${LADE_AC} AC-Ladepunkte im Beispiel kosten also etwa ${fmtEur(LADE_AC * CARPORT.ladepunktAc)} zusätzlich.`,
        },
        {
          typ: "kasten",
          variant: "tipp",
          titel: "Planungstipp",
          text: "Planen Sie Carport, Ladepunkte, Netzanschluss und gegebenenfalls einen [Großspeicher](/de/grossspeicher) gemeinsam. Ein Speicher kann Lastspitzen der Schnelllader abfangen und so eine teure Netzverstärkung vermeiden oder verkleinern.",
        },
      ],
    },
    {
      id: "dach",
      titel: "Österreich und Schweiz im Kurzüberblick",
      tocLabel: "Österreich & Schweiz",
      bloecke: [
        {
          typ: "p",
          text: "**In Österreich gibt es nach unserem Recherchestand keine flächendeckende Solarpflicht für offene Parkplätze; die Bauordnungen der Länder regeln PV-Pflichten vor allem für Gebäude.** Als EU-Mitglied muss Österreich die EU-Gebäuderichtlinie aber ebenfalls umsetzen, die bis Ende 2029 Solaranlagen auf neuen überdachten Parkplätzen an Gebäuden verlangt. Prüfen Sie im Einzelfall die Bauordnung des jeweiligen Bundeslandes.",
        },
        {
          typ: "p",
          text: "**In der Schweiz sind Energievorschriften für Gebäude Sache der Kantone.** Der Kanton Bern verlangt seit 1. Januar 2026 eine solaraktive Überdachung für neue, öffentlich zugängliche und kostenpflichtige Parkplätze im Freien ab 80 Abstellplätzen sowie für Park-and-Ride-Anlagen mit mehr als 50 Plätzen (Art. 39a–39e KEnG). Andere Kantone haben eigene Regeln oder keine. Mehr zur Lage in der Schweiz im Ratgeber [Freiflächen-PV in der Schweiz](/wissen/ratgeber/freiflaechen-pv-schweiz).",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So gehen Sie bei einem neuen Parkplatz vor",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Pflicht prüfen", "Landesrecht, Stellplatzzahl, Nutzung (gewerblich, öffentlich, Wohnen) und Stichtag des Bauantrags klären."],
            ["Geeignete Fläche ermitteln", "Verschattung durch Bäume und Gebäude, Fahrgassen, Feuerwehrzufahrten und Leitungen berücksichtigen."],
            ["Eigenverbrauch und Netz klären", "Lastgang des Gebäudes, Netzanschlusskapazität und Ladeinfrastruktur nach GEIG zusammen planen."],
            ["Wirtschaftlichkeit rechnen", "Mit dem [Solarcarport-Rechner](/de/rechner/solarcarport) Investition, Ertrag und Rendite abschätzen."],
            ["Betreibermodell wählen", "Selbst investieren, Dach bzw. Parkplatz verpachten oder Strom per PPA von einem Betreiber beziehen."],
            ["Bauantrag stellen", "PV-Überdachung in den Bauantrag aufnehmen oder Ausnahme bzw. Ersatzerfüllung begründen."],
          ],
        },
        {
          typ: "p",
          text: "Mehr zu Bauarten, Betreibermodellen und Ladeinfrastruktur finden Sie auf der Seite [Solarcarports und Parkflächen](/de/solarcarport). Unternehmen, die den verbleibenden Strombedarf günstiger decken wollen, finden Informationen zum [Reststrom-Pool](/de/reststrom).",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Ab wie vielen Stellplätzen gilt die Solarpflicht für Parkplätze?",
      a: "Das hängt vom Bundesland ab: in Niedersachsen ab mehr als 25 Stellplätzen, in Baden-Württemberg, Hamburg und NRW ab mehr als 35, im Saarland ab 35 gewerblich genutzten, in Hessen ab mehr als 50, in Rheinland-Pfalz ab 50 und in Schleswig-Holstein ab mehr als 70 Stellplätzen.",
    },
    {
      q: "Gilt die Parkplatz-Solarpflicht auch für bestehende Parkplätze?",
      a: "In der Regel nicht. Die Pflicht greift beim Neubau oder bei größeren Erweiterungen. Ausnahmen: Niedersachsen, wenn mindestens 50 % eines bestehenden Parkplatzes erneuert werden, und Schleswig-Holstein bei grundlegender Sanierung.",
    },
    {
      q: "Gibt es in Bayern eine Solarpflicht für Parkplätze?",
      a: "Nein. Art. 44a BayBO regelt nur Solaranlagen auf Dächern, vor allem von Nichtwohngebäuden. Für Parkplätze gibt es in Bayern nach aktuellem Stand keine landesrechtliche Pflicht; ab 2030 greift aber die Bundesregel für überdachte Parkplätze an Gebäuden.",
    },
    {
      q: "Gilt in Brandenburg noch eine Solarpflicht für Parkplätze?",
      a: "Nein. § 32a BbgBO, der seit Juni 2024 für Parkplätze von Nichtwohngebäuden mit mehr als 35 Stellplätzen galt, wurde mit dem Vierten Gesetz zur Änderung der Brandenburgischen Bauordnung aufgehoben; die Neufassung gilt seit dem 30. Juni 2026.",
    },
    {
      q: "Wie viel kostet ein Solarcarport je Stellplatz?",
      a: `Bei rund ${fmt(CARPORT.kwpProStellplatz, 1)} kWp je Stellplatz und ${fmt(CARPORT.capexProKwp.min)} bis ${fmt(CARPORT.capexProKwp.max)} €/kWp ergeben sich etwa ${fmtEur(CARPORT.kwpProStellplatz * CARPORT.capexProKwp.min)} bis ${fmtEur(CARPORT.kwpProStellplatz * CARPORT.capexProKwp.max)} je überdachtem Stellplatz, ohne Ladepunkte und Netzverstärkung.`,
    },
    {
      q: "Kann ich die Pflicht auch auf dem Dach erfüllen?",
      a: "In den meisten Ländern ja: Die geforderte Leistung darf ganz oder teilweise auf Dächern oder anderen Flächen in unmittelbarer Nähe errichtet werden. In Baden-Württemberg etwa auf einem gleichzeitig neu errichteten Gebäude, allerdings nicht auf Flächen, die ohnehin der Dachpflicht unterliegen.",
    },
    {
      q: "Wer muss die Solaranlage betreiben?",
      a: "Verpflichtet ist der Bauherr bzw. Eigentümer. Er kann die Anlage aber durch Dritte errichten und betreiben lassen, etwa per Pacht- oder Contracting-Modell. Das entlastet die Bilanz und verlagert das Betriebsrisiko.",
    },
  ],

  passend: [
    { href: pfad("/rechner/solarcarport"), titel: "Solarcarport-Rechner", text: "Investition, Ertrag und Rendite Ihres Parkplatzes." },
    { href: pfad("/solarcarport"), titel: "Solarcarports & Parkflächen", text: "Bauarten, Betreibermodelle, Ladeinfrastruktur." },
    { href: "/wissen/ratgeber/ppa-fuer-unternehmen", titel: "PPA für Unternehmen", text: "Solarstrom vom Parkplatz langfristig beziehen." },
    { href: "/wissen/ratgeber/solarpark-genehmigung-bebauungsplan", titel: "Solarpark-Genehmigung", text: "Baurecht für Freiflächenanlagen." },
  ],

  quellen: [
    { titel: "Umweltministerium Baden-Württemberg – FAQ Photovoltaikpflicht", url: "https://um.baden-wuerttemberg.de/de/klima-energie/energiewende/erneuerbare-energien/sonnenenergie/photovoltaik/photovoltaikpflicht/faq-photovoltaikpflicht", stand: "09/2026" },
    { titel: "Freie und Hansestadt Hamburg – FAQ PV-Pflicht in Hamburg", url: "https://www.hamburg.de/politik-und-verwaltung/behoerden/bukea/themen/energie/erneuerbare-energien/photovoltaik/faq-pv-pflicht-in-hamburg-956122", stand: "09/2026" },
    { titel: "NI-VORIS – § 32a NBauO Solarenergieanlagen zur Stromerzeugung", url: "https://voris.wolterskluwer-online.de/browse/document/f056c189-2143-307d-9a85-eb5d10b7fa52", stand: "09/2026" },
    { titel: "recht.nrw.de – Solaranlagen-Verordnung Nordrhein-Westfalen (SAN-VO NRW)", url: "https://recht.nrw.de/lrgv/rechtsverordnung/19062024-verordnung-zur-umsetzung-der-solaranlagen-pflicht-nach-ss-42a-und-ss/", stand: "09/2026" },
    { titel: "Land Schleswig-Holstein – FAQ EWKG: Photovoltaik auf Parkplätzen", url: "https://www.schleswig-holstein.de/DE/fachinhalte/E/energiewende/_faqs_ewkg/faq_ewkg_pv/faq_ewkg_pv_parkplaetze/akkordeon_faq_ewkg_PV_parkplaetze", stand: "09/2026" },
    { titel: "Ministerium für Infrastruktur und Landesplanung Brandenburg – Viertes Gesetz zur Änderung der BbgBO", url: "https://mil.brandenburg.de/mil/de/presse/detail/~19-06-2026-viertes-gesetz-zur-aenderung-der-bbgbo", stand: "09/2026" },
    { titel: "Klimaschutz- und Energieagentur Niedersachsen – Neues Gebäudemodernisierungsgesetz: Solarpflicht", url: "https://www.klimaschutz-niedersachsen.de/aktuelles/Neues-Gebaeudemodernisierungsgesetz-Solarpflicht-fuer-verschiedene-Gebaeude-5178", stand: "09/2026" },
    { titel: "Gebäude-Elektromobilitätsinfrastruktur-Gesetz (GEIG) § 7", url: "https://www.gesetze-im-internet.de/geig/__7.html", stand: "09/2026" },
  ],

  seitenCta: { titel: "Was bringt Ihr Parkplatz?", text: "Leistung, Kosten und Rendite eines Solarcarports berechnen.", href: pfad("/rechner/solarcarport"), label: "Zum Solarcarport-Rechner" },
  cta: {
    title: "Parkplatz-PV planen – mit oder ohne Pflicht.",
    text: "Wir prüfen, welche Pflicht für Ihren Parkplatz gilt, und rechnen Eigenverbrauch, Ladepunkte und Betreibermodell ehrlich durch.",
    primary: { label: "Solarcarport rechnen", href: pfad("/rechner/solarcarport") },
    secondary: { label: "Kontakt aufnehmen", href: "/kontakt" },
  },
};

export default artikel;
