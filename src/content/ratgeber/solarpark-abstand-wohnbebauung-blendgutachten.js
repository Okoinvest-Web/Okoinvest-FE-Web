// Ratgeber: Solarpark – Abstand zur Wohnbebauung, Blendgutachten, Lärm, Eingrünung
// Recherchestand 29.09.2026 (LAI-Hinweise Lichtimmissionen 2012 mit Anhang 2 vom 03.11.2015;
// TA Lärm Nr. 6.1; BImSchG § 22; BauGB §§ 1, 35; FStrG § 9; Arbeitshilfe Solarplanung
// Niedersachsen 10/2022). Keine Rechtsberatung – Text bewusst vorsichtig formuliert.

import { FREIFLAECHE, STAND } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
// LAI, Hinweise zur Messung, Beurteilung und Minderung von Lichtimmissionen, Anhang 2 (Stand 03.11.2015):
// erhebliche Belästigung möglich ab 30 min/Tag oder 30 h/Kalenderjahr astronomisch möglicher Blenddauer;
// kritische Immissionsorte meist westlich/östlich und näher als ca. 100 m; Differenzwinkel ≥ 10°.
const LAI_MIN_TAG = 30;
const LAI_STD_JAHR = 30;
const LAI_ABSTAND_M = 100;
const LAI_DIFFERENZWINKEL = 10;
// Arbeitshilfe Niedersachsen (10/2022): in Kriterienkatalogen anzutreffende pauschale Mindestabstände 50–2.000 m.
const KATALOG_ABSTAND = { min: 50, max: 2000 };
// TA Lärm Nr. 6.1: Immissionsrichtwerte außen in dB(A), tags / nachts.
const TA_LAERM = [
  { gebiet: "Gewerbegebiet", tag: 65, nacht: 50 },
  { gebiet: "Kern-, Dorf- und Mischgebiet", tag: 60, nacht: 45 },
  { gebiet: "Allgemeines Wohngebiet, Kleinsiedlungsgebiet", tag: 55, nacht: 40 },
  { gebiet: "Reines Wohngebiet", tag: 50, nacht: 35 },
  { gebiet: "Kurgebiet, Krankenhäuser, Pflegeanstalten", tag: 45, nacht: 35 },
];

const MWP_BEISPIEL = 10;
const HA_BEISPIEL = MWP_BEISPIEL * FREIFLAECHE.haProMwp;
const mischgebiet = TA_LAERM[1];
const wa = TA_LAERM[2];

const artikel = {
  slug: "solarpark-abstand-wohnbebauung-blendgutachten",
  title: "Solarpark: Abstand zur Wohnbebauung, Blendgutachten und Lärm",
  seoTitle: "Solarpark Abstand Wohnbebauung & Blendung | ÖkoInvest",
  kurzTitel: "Abstand und Blendgutachten",
  description:
    "Solarpark Abstand zur Wohnbebauung: warum es keinen Pauschalabstand gibt, wann ein Blendgutachten nötig ist, was die TA Lärm verlangt und wie Eingrünung hilft.",
  excerpt:
    "Wie nah darf ein Solarpark an Häuser heranrücken? Was Gemeinden prüfen, wie Blendgutachten nach den LAI-Hinweisen funktionieren, wie laut Wechselrichter sind und wie man Konflikte früh vermeidet.",
  hauptKeyword: "solarpark abstand wohnbebauung",
  keywords: [
    "Solarpark Abstand Wohnbebauung",
    "Blendgutachten Photovoltaik",
    "Blendung Solarpark Straße",
    "LAI Lichtleitlinie Photovoltaik",
    "Solarpark Lärm Wechselrichter",
    "Mindestabstand Freiflächen-PV",
    "Eingrünung Solarpark Sichtschutz",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Recht & Genehmigung",
  bild: "/img/solarpark-baeume.jpg",
  bildAlt: "Solarmodule im Vordergrund, dahinter eine Reihe grüner Laubbäume und zwei Funkmasten unter blauem Himmel",
  badge: { wert: `ca. ${LAI_ABSTAND_M} m`, text: "Bereich, in dem Blendung an Wohnhäusern nach LAI kritisch sein kann" },

  kurzFazit: [
    "**Einen gesetzlichen Mindestabstand zwischen Solarpark und Wohnhaus gibt es in Deutschland nicht.** Maßgeblich sind das Rücksichtnahmegebot, die Abwägung im Bebauungsplan und oft kommunale Kriterienkataloge.",
    `Kommunale Kataloge nennen sehr unterschiedliche Pauschalabstände – laut einer niedersächsischen Arbeitshilfe zwischen ${fmt(KATALOG_ABSTAND.min)} und ${fmt(KATALOG_ABSTAND.max)} m. Sachgerechter ist die Prüfung von Sichtbeziehungen, Blendung und Lärm im Einzelfall.`,
    `Nach den LAI-Hinweisen sind **Wohnhäuser westlich oder östlich eines Parks und näher als etwa ${LAI_ABSTAND_M} m** blendkritisch. Eine erhebliche Belästigung kann ab ${LAI_MIN_TAG} Minuten am Tag oder ${LAI_STD_JAHR} Stunden im Jahr vorliegen.`,
    `Lärm entsteht fast nur an Wechselrichtern und Trafostationen und überwiegend tagsüber. Maßstab sind die Immissionsrichtwerte der TA Lärm, etwa ${wa.tag}/${wa.nacht} dB(A) tags/nachts im allgemeinen Wohngebiet.`,
    "Hecken in Höhe der Moduloberkante, angepasste Ausrichtung und gut platzierte Stationen lösen die meisten Konflikte – wenn sie früh geplant werden.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Welcher Abstand zur Wohnbebauung gilt für Solarparks?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Für Freiflächen-Solarparks schreibt in Deutschland kein Gesetz einen festen Mindestabstand zur Wohnbebauung vor – anders als bei der Windenergie, für die Länder Abstandsregeln kennen.** Der Abstand ergibt sich aus der Prüfung, ob der Park für Nachbarn unzumutbar wird: durch Blendung, Lärm oder eine erdrückende Wirkung auf das Wohnumfeld.",
        },
        {
          typ: "p",
          text: "Rechtlich läuft das über zwei Wege. Für privilegierte Anlagen im Außenbereich dürfen öffentliche Belange nicht entgegenstehen; dazu gehört, dass das Vorhaben keine schädlichen Umwelteinwirkungen hervorruft (§ 35 Abs. 3 Satz 1 Nr. 3 BauGB) – das Rücksichtnahmegebot. Im [Bebauungsplan](/wissen/lexikon#bebauungsplan) muss die Gemeinde die Belange der Nachbarschaft gerecht abwägen (§ 1 Abs. 7 BauGB), und hier setzen viele Gemeinden eigene Kriterien.",
        },
        {
          typ: "kennzahl",
          wert: `${fmt(KATALOG_ABSTAND.min)}–${fmt(KATALOG_ABSTAND.max)} m`,
          titel: "Spanne pauschaler Abstände in kommunalen Kriterienkatalogen",
          text: "Laut Arbeitshilfe der niedersächsischen Kommunalverbände (2022). Sie hält solche Pauschalen für der Unterschiedlichkeit der Einzelfälle „kaum gerecht“.",
        },
      ],
    },
    {
      id: "kriterien",
      titel: "Wie Gemeinden den Abstand festlegen",
      tocLabel: "Kommunale Kriterien",
      bloecke: [
        {
          typ: "p",
          text: "**Die meisten Gemeinden entscheiden über den Abstand im Rahmen eines Kriterienkatalogs oder direkt in der Abwägung des Bebauungsplans – mit großem Spielraum.** Weil ohne Bebauungsplan in der Regel kein Solarpark entsteht, sind diese Kriterien für Flächeneigentümer und Projektierer faktisch verbindlich.",
        },
        {
          typ: "p",
          text: `Die niedersächsische Arbeitshilfe zur Solarplanung beschreibt das Dilemma gut: Ein geringer Abstand kann unproblematisch sein, wenn Topografie oder Bewuchs keine Sichtbeziehung zulassen. Wo Wohnhäuser und Gärten klar zur geplanten Fläche ausgerichtet sind, kann die Schutzbedürftigkeit höher sein. Gleichzeitig ist aus städtebaulicher Sicht eine Anbindung an den Siedlungsrand oft erwünscht, um die freie Landschaft zu schonen. Pauschale Abstände zwischen ${fmt(KATALOG_ABSTAND.min)} und ${fmt(KATALOG_ABSTAND.max)} m, wie sie in Katalogen vorkommen, bilden das nicht ab.`,
        },
        {
          typ: "tabelle",
          caption: `Belange der Nachbarschaft und wie sie geprüft werden, Stand ${STAND}`,
          kopf: ["Belang", "Grundlage", "Prüfmaßstab", "Typische Lösung"],
          zeilen: [
            ["Blendung", "BImSchG, LAI-Hinweise Lichtimmissionen", `astronomisch mögliche Blenddauer; kritisch ab ${LAI_MIN_TAG} min/Tag oder ${LAI_STD_JAHR} h/Jahr`, "Sichtschutz, Ausrichtung, reflexionsarme Module"],
            ["Betriebslärm", "TA Lärm, § 22 BImSchG", "Immissionsrichtwerte je Gebietsart, tags und nachts", "Standort von Wechselrichtern und Trafos, Einhausung"],
            ["Baulärm", "AVV Baulärm", "Richtwerte und Arbeitszeiten während der Bauphase", "Rammzeiten begrenzen, Anwohner informieren"],
            ["Optische Wirkung", "Rücksichtnahmegebot, Abwägung", "Sichtbeziehungen, Höhe, Nähe zum Garten", "Abstandsstreifen, Hecken, niedrige Modultische"],
            ["Landschaftsbild und Erholung", "Umweltbericht, Eingriffsregelung", "Sichtachsen, Wegebeziehungen", "Eingrünung, Wege offen halten"],
          ],
          minBreite: 760,
          fussnote: "Einen Rechtsanspruch auf freie Aussicht oder auf Ausgleich einer befürchteten Wertminderung gibt es in der Regel nicht; relevant sind nur unzumutbare Beeinträchtigungen.",
        },
        {
          typ: "p",
          text: "Für Flächeneigentümer heißt das: Den Kriterienkatalog der Gemeinde vor Vertragsunterzeichnung anzusehen, spart Enttäuschungen. Eine erste Einschätzung zur Lage liefert der [Flächencheck](/flaechencheck); wie das Planverfahren abläuft, erklärt der Ratgeber [Genehmigung und Bebauungsplan](/ratgeber/solarpark-genehmigung-bebauungsplan). Gemeinden finden Hinweise zur Steuerung auf der Seite für [Kommunen](/kommunen).",
        },
      ],
    },
    {
      id: "blendgutachten",
      titel: "Wann ist ein Blendgutachten für einen Solarpark nötig?",
      tocLabel: "Blendgutachten",
      bloecke: [
        {
          typ: "p",
          text: `**Ein [Blendgutachten](/wissen/lexikon#blendgutachten) ist nötig, wenn Wohnhäuser, Straßen, Bahnstrecken oder Flugplätze so liegen, dass reflektiertes Sonnenlicht sie erreichen kann – bei Wohnhäusern vor allem westlich oder östlich der Anlage und näher als etwa ${LAI_ABSTAND_M} m.** Im Bebauungsplanverfahren gehört es an Verkehrswegen inzwischen fast immer zu den Unterlagen, oft als Anlage zum [Umweltbericht](/wissen/lexikon#umweltbericht).`,
        },
        {
          typ: "p",
          text: "Maßstab ist in Deutschland Anhang 2 der „Hinweise zur Messung, Beurteilung und Minderung von Lichtimmissionen“ der Bund/Länder-Arbeitsgemeinschaft Immissionsschutz (LAI), Stand 3. November 2015. Die Hinweise sind keine Rechtsnorm, werden von Behörden und Gerichten aber als Orientierung herangezogen. Sie erlauben es, viele Immissionsorte schon vorab auszuklammern:",
        },
        {
          typ: "tabelle",
          caption: "Blendrelevanz von Wohnhäusern nach Lage zur Anlage (LAI-Hinweise, Anhang 2)",
          kopf: ["Lage des Wohnhauses", "Einschätzung nach LAI", "Folge für das Gutachten"],
          zeilen: [
            [`weiter als ca. ${LAI_ABSTAND_M} m entfernt`, "erfahrungsgemäß nur kurzzeitige Blendung; bei sehr ausgedehnten Parks ggf. relevant", "meist keine Detailprüfung"],
            ["überwiegend nördlich der Anlage", "meist unproblematisch", "Prüfung nur bei hoch liegenden Immissionsorten oder sehr flachen Modulen"],
            ["überwiegend südlich der Anlage", "nur bei senkrechten Modulen (Fassaden) relevant", "bei Freiflächen in der Regel keine Prüfung; Ausnahme: vertikale Agri-PV prüfen"],
            [`**westlich oder östlich, näher als ca. ${LAI_ABSTAND_M} m**`, "**kritisch** – ausgedehnte Blendzeiträume im Jahresverlauf möglich", "Berechnung der Blenddauer, ggf. Minderungsmaßnahmen"],
          ],
          hervorheben: 1,
          markierteZeile: 3,
          minBreite: 680,
          fussnote: `Quelle: LAI, Hinweise zur Messung, Beurteilung und Minderung von Lichtimmissionen (08.10.2012), Anhang 2 (03.11.2015). Berechnet wird mit idealisierten Annahmen: punktförmige Sonne, ideal spiegelnde Module, Sonnenschein von Auf- bis Untergang.`,
        },
        {
          typ: "h3",
          text: "So rechnet ein Blendgutachten",
        },
        {
          typ: "p",
          text: `Module und Immissionsorte werden in einem gemeinsamen Koordinatensystem modelliert, und für jede Minute des Jahres wird geprüft, ob die Reflexion den Punkt trifft. Liegen Sonne und Blendquelle aus Sicht des Betrachters sehr nah beieinander, dominiert ohnehin der Blick in die Sonne; die LAI berücksichtigt deshalb nur Konstellationen mit einem Differenzwinkel von mindestens ${LAI_DIFFERENZWINKEL}°. Eine erhebliche Belästigung kann vorliegen, wenn die maximal mögliche Blenddauer unter Berücksichtigung aller umliegenden Anlagen **mindestens ${LAI_MIN_TAG} Minuten am Tag oder ${LAI_STD_JAHR} Stunden pro Kalenderjahr** beträgt.`,
        },
        {
          typ: "h3",
          text: "Straßen, Bahnstrecken und Flugplätze",
        },
        {
          typ: "p",
          text: "Für Verkehrsteilnehmer gibt es keine vergleichbar festen Minutenwerte. Gutachter prüfen, ob Reflexionen im relevanten Blickfeld von Autofahrern, Triebfahrzeugführern oder Piloten liegen und ob Signale überstrahlt werden können. Straßenbaubehörden und Bahn verlangen in ihren Stellungnahmen regelmäßig, dass Blendung ausgeschlossen oder nachträglich durch Sichtschutz beseitigt wird. In der Nähe von Flugplätzen wird die Luftfahrtbehörde beteiligt. Die Besonderheiten entlang von Autobahnen und Schienen beschreibt der Ratgeber [Solarpark an Autobahn und Bahn](/ratgeber/solarpark-autobahn-bahn-privilegierung).",
        },
        {
          typ: "kasten",
          variant: "tipp",
          titel: "Gutachten früh beauftragen",
          text: "Ein Blendgutachten ist vergleichsweise schnell erstellt, kann aber das Layout verändern: andere Neigung, Ost-West-Aufständerung statt Süd oder ein Abstandsstreifen am Rand. Wer es erst nach der Auslegung beauftragt, riskiert eine erneute Beteiligung. Sinnvoll ist es parallel zum Vorentwurf, vor der [frühzeitigen Beteiligung](/wissen/lexikon#fruehzeitige-beteiligung).",
        },
      ],
    },
    {
      id: "minderung",
      titel: "Maßnahmen gegen Blendung",
      tocLabel: "Minderung",
      bloecke: [
        {
          typ: "p",
          text: "**Die LAI-Hinweise nennen drei Hebel: Sicht unterbinden, Aufstellung optimieren und reflexionsarme Module einsetzen.** Welche Maßnahme passt, hängt immer vom Standort ab; nachträgliche Änderungen sind teuer.",
        },
        {
          typ: "karten",
          cols: 3,
          items: [
            { titel: "Sichtschutz", text: "Wälle oder blickdichter Bewuchs in Höhe der Moduloberkante. Eine Hecke braucht einige Jahre; bis dahin helfen Sichtschutzzäune oder größere Pflanzqualitäten." },
            { titel: "Aufstellung", text: "Andere Neigung, Ausrichtung oder ein Randstreifen ohne Module auf der kritischen Seite. Ost-West-Anlagen verändern die Blendzeiten gegenüber Süd-Anlagen." },
            { titel: "Moduloberfläche", text: "Module mit strukturiertem Glas oder Antireflexbeschichtung streuen das Licht stärker. Das mindert die Leuchtdichte, ersetzt aber keine Berechnung." },
          ],
        },
        {
          typ: "p",
          text: "Wichtig ist, die Maßnahme im Bebauungsplan oder in der Baugenehmigung verbindlich festzuschreiben und im städtebaulichen Vertrag die Pflege der Hecke zu regeln. Sonst wird aus dem Sichtschutz nach zehn Jahren eine Lücke.",
        },
      ],
    },
    {
      id: "laerm",
      titel: "Wie laut ist ein Solarpark? Lärm nach TA Lärm",
      tocLabel: "Lärm",
      bloecke: [
        {
          typ: "p",
          text: "**Ein Solarpark ist im Betrieb leise; hörbar sind vor allem Wechselrichter mit Lüftern und Trafostationen, und zwar überwiegend tagsüber, wenn Strom erzeugt wird.** Rechtlich sind Solarparks nicht genehmigungsbedürftige Anlagen im Sinne des Immissionsschutzrechts: Sie müssen so betrieben werden, dass vermeidbare schädliche Umwelteinwirkungen verhindert werden (§ 22 BImSchG). Maßstab für Geräusche ist die TA Lärm.",
        },
        {
          typ: "tabelle",
          caption: "Immissionsrichtwerte außerhalb von Gebäuden nach TA Lärm Nr. 6.1 (Auswahl)",
          kopf: ["Gebietsart am Wohnhaus", "tags (6–22 Uhr)", "nachts (22–6 Uhr)"],
          zeilen: TA_LAERM.map((z) => [z.gebiet, `${z.tag} dB(A)`, `${z.nacht} dB(A)`]),
          hervorheben: 2,
          minBreite: 520,
          fussnote: `Quelle: TA Lärm, Nr. 6.1. Einzelne Wohnhäuser im Außenbereich werden in der Praxis häufig wie Dorf- oder Mischgebiete (${mischgebiet.tag}/${mischgebiet.nacht} dB(A)) beurteilt; maßgeblich ist die Einstufung durch die Behörde.`,
        },
        {
          typ: "p",
          text: "Kritisch ist meist nicht der Tag, sondern die Nacht: Trafostationen können auch ohne Einspeisung ein leises Brummen erzeugen, und Speicher mit Klimatisierung laufen rund um die Uhr. Bei einem Park mit Batteriespeicher gehört deshalb eine Schallprognose zu den Unterlagen. Die einfachste Lösung ist Abstand: Stationen auf die dem Wohnhaus abgewandte Seite legen und nicht direkt an die Grundstücksgrenze setzen. Zum Thema Speicher siehe [Großspeicher](/grossspeicher).",
        },
        {
          typ: "kasten",
          variant: "info",
          titel: "Bauphase: Rammen ist laut, aber kurz",
          text: `Beim Bau werden Stahlpfosten in den Boden gerammt. Das ist deutlich hörbar, dauert bei einem Park mit ${MWP_BEISPIEL} MWp auf rund ${fmt(HA_BEISPIEL)} ha aber in der Regel nur einige Wochen. Maßgeblich sind hier die Regeln zum Baulärm; bewährt haben sich feste Arbeitszeiten und eine frühe Information der Nachbarn.`,
        },
      ],
    },
    {
      id: "bauarten",
      titel: "Blendung je nach Bauart: Süd, Ost-West, Tracker, vertikale Agri-PV",
      tocLabel: "Bauarten",
      bloecke: [
        {
          typ: "p",
          text: "**Die Bauart verändert, wann und wohin ein Solarpark reflektiert – deshalb muss das Blendgutachten zum tatsächlich geplanten Layout passen.** Ein Gutachten für eine Süd-Anlage lässt sich nicht einfach auf eine Ost-West-Planung übertragen.",
        },
        {
          typ: "liste",
          punkte: [
            "**Süd, fest aufgeständert:** Reflexionen treten vor allem morgens und abends in flachem Winkel auf. Kritisch sind deshalb die Seiten im Westen und Osten, wie die LAI-Hinweise beschreiben.",
            "**Ost-West:** Die Module sind flacher geneigt und zeigen zu beiden Seiten. Das kann Blendzeiten verschieben; Immissionsorte im Norden verdienen bei flachen Neigungen mehr Aufmerksamkeit.",
            "**Nachgeführte Anlagen (Tracker):** Die Neigung ändert sich im Tagesverlauf. Gutachter müssen die Steuerung, einschließlich der Parkposition bei Wind oder am Abend, modellieren.",
            "**Vertikale Agri-PV:** Senkrechte Module wirken wie eine Fassade. Nach den LAI-Hinweisen sind dann auch Immissionsorte im Süden zu prüfen. Mehr zur Bauweise unter [Agri-PV](/agri-pv).",
          ],
        },
        {
          typ: "p",
          text: "Auch in Österreich und der Schweiz werden Blendgutachten für Freiflächenanlagen an Straßen und in Siedlungsnähe verlangt; die Anforderungen ergeben sich dort aus Landes- bzw. Kantonsrecht und den jeweiligen Bewilligungsverfahren. Die Rechenmethode ist im Grundsatz dieselbe.",
        },
      ],
    },
    {
      id: "eingruenung",
      titel: "Sichtschutz und Eingrünung richtig planen",
      tocLabel: "Eingrünung",
      bloecke: [
        {
          typ: "p",
          text: "**Eine standortgerechte Hecke am Rand des Parks ist das wirksamste Mittel gegen Blendung und optische Wirkung zugleich – und sie zählt oft zum naturschutzrechtlichen Ausgleich.** Gemeinden setzen Eingrünungen deshalb häufig im Bebauungsplan fest.",
        },
        {
          typ: "checkliste",
          punkte: [
            "**Höhe:** Die Hecke sollte mindestens die Moduloberkante erreichen, sonst bleibt die Blendwirkung.",
            "**Arten:** Heimische, standortgerechte Sträucher; keine Arten, die später die Module verschatten.",
            "**Lage:** Eingrünung auf der Seite der Wohnbebauung und der Verkehrswege zuerst, mit ausreichend Abstand zu den ersten Modulreihen.",
            "**Offenlandarten beachten:** In weiten Feldfluren können hohe Gehölze Bodenbrüter wie die Feldlerche vertreiben. Mehr dazu im Ratgeber [Artenschutz und Biodiversität](/ratgeber/solarpark-artenschutz-biodiversitaet).",
            "**Pflege sichern:** Anwachspflege, Nachpflanzung und Rückschnitt im städtebaulichen Vertrag regeln.",
            "**Rückbau mitdenken:** Ob die Hecke nach Betriebsende bleibt oder entfernt wird, sollte früh mit Eigentümer und Naturschutzbehörde geklärt werden.",
          ],
        },
      ],
    },
    {
      id: "akzeptanz",
      titel: "Konflikte mit Nachbarn früh vermeiden",
      tocLabel: "Akzeptanz",
      bloecke: [
        {
          typ: "p",
          text: "**Die meisten Einwände gegen Solarparks betreffen nicht Paragrafen, sondern Sichtachsen aus Gärten und Fenstern – und lassen sich im Layout lösen, wenn sie früh bekannt sind.** Wer Anwohner vor dem Aufstellungsbeschluss informiert, erfährt, wo die sensiblen Stellen liegen.",
        },
        {
          typ: "ablauf",
          schritte: [
            ["Sensible Punkte kartieren", "Wohnhäuser, Gärten, Spazierwege, Straßen und Bahnlinien im Umkreis erfassen; Lage (Himmelsrichtung) und Höhe notieren."],
            ["Blend- und Schallprüfung", `Häuser westlich oder östlich und näher als etwa ${LAI_ABSTAND_M} m sowie Stationen in Hausnähe zuerst prüfen.`],
            ["Layout anpassen", "Abstandsstreifen, Eingrünung und Stationen dort planen, wo Konflikte drohen – bevor der Vorentwurf ausgelegt wird."],
            ["Informieren und beteiligen", "Infoabend, Visualisierungen und gegebenenfalls finanzielle Beteiligung von Gemeinde und Bürgern."],
            ["Verbindlich festschreiben", "Maßnahmen in Bebauungsplan und städtebaulichem Vertrag verankern."],
          ],
        },
        {
          typ: "p",
          text: "Finanzielle Teilhabe kann die Akzeptanz zusätzlich stärken, etwa über die [Kommunalbeteiligung nach § 6 EEG](/ratgeber/kommunale-beteiligung-6-eeg) oder Bürgerbeteiligungsmodelle, die der Ratgeber [Bürgerenergie und Akzeptanz](/ratgeber/buergerenergie-solarpark-akzeptanz) vorstellt. Was eine Gemeinde konkret erhält, zeigt der [Kommunal-Rechner](/rechner/kommune).",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Wie weit muss ein Solarpark vom Wohnhaus entfernt sein?",
      a: "Einen gesetzlichen Mindestabstand gibt es nicht. Entscheidend ist, ob Blendung, Lärm oder die optische Wirkung für Nachbarn unzumutbar sind. Viele Gemeinden legen in Kriterienkatalogen eigene Abstände fest, die sehr unterschiedlich ausfallen.",
    },
    {
      q: "Blenden Solarmodule die Nachbarn?",
      a: `Das ist möglich, aber meist auf wenige Situationen begrenzt. Nach den LAI-Hinweisen sind vor allem Häuser westlich oder östlich einer Anlage und näher als etwa ${LAI_ABSTAND_M} m betroffen. Ein Blendgutachten klärt, ob die Schwelle von ${LAI_MIN_TAG} Minuten am Tag oder ${LAI_STD_JAHR} Stunden im Jahr erreicht wird.`,
    },
    {
      q: "Was kostet ein Blendgutachten?",
      a: "Die Kosten hängen von Zahl der Immissionsorte, Verkehrswegen und Anlagengröße ab und werden vom Projektierer getragen, meist als Teil der Planungskosten im städtebaulichen Vertrag. Für Flächeneigentümer entstehen in seriösen Projekten keine Kosten.",
    },
    {
      q: "Ist ein Solarpark nachts laut?",
      a: "In der Regel nicht. Wechselrichter arbeiten nur bei Tageslicht. Trafostationen können leise brummen; bei Parks mit Batteriespeicher läuft die Klimatisierung auch nachts. Deshalb sollten Stationen nicht direkt an Wohnhäusern stehen.",
    },
    {
      q: "Kann ich als Nachbar einen Solarpark verhindern?",
      a: "Sie können sich im Bebauungsplanverfahren mit Stellungnahmen beteiligen und später gegebenenfalls rechtlich vorgehen. Erfolgreich ist das in der Regel nur bei unzumutbaren Beeinträchtigungen, etwa erheblicher Blendung. Eine bloße Veränderung der Aussicht reicht meist nicht.",
    },
    {
      q: "Hilft eine Hecke gegen Blendung?",
      a: "Ja, wenn sie mindestens bis zur Moduloberkante reicht und dicht genug ist. Die LAI-Hinweise nennen blickdichten Bewuchs ausdrücklich als Minderungsmaßnahme. Bis die Hecke hoch genug ist, kann ein Sichtschutzzaun die Lücke schließen.",
    },
  ],

  passend: [
    { href: "/ratgeber/solarpark-genehmigung-bebauungsplan", titel: "Genehmigung und Bebauungsplan", text: "Alle Schritte des Verfahrens und die nötigen Gutachten." },
    { href: "/ratgeber/solarpark-autobahn-bahn-privilegierung", titel: "Solarpark an Autobahn und Bahn", text: "Privilegierung, Förderkorridor und Anbauzonen." },
    { href: "/ratgeber/buergerenergie-solarpark-akzeptanz", titel: "Bürgerenergie und Akzeptanz", text: "Wie Beteiligung Konflikte entschärft." },
    { href: "/flaechencheck", titel: "Flächencheck", text: "Lage, Netz und Planungsrecht Ihrer Fläche prüfen." },
  ],

  quellen: [
    { titel: "Bund/Länder-Arbeitsgemeinschaft Immissionsschutz (LAI) – Hinweise zur Messung, Beurteilung und Minderung von Lichtimmissionen, Anhang 2: Blendwirkung von Photovoltaikanlagen", url: "https://www.lai-immissionsschutz.de/documents/lichthinweise-2015-11-03mit-formelkorrektur_aus_03_2018_1520588339.pdf", stand: "09/2026" },
    { titel: "Technische Anleitung zum Schutz gegen Lärm (TA Lärm)", url: "https://www.verwaltungsvorschriften-im-internet.de/bsvwvbund_26081998_IG19980826.htm", stand: "09/2026" },
    { titel: "Bundes-Immissionsschutzgesetz – § 22 BImSchG (Pflichten der Betreiber nicht genehmigungsbedürftiger Anlagen)", url: "https://www.gesetze-im-internet.de/bimschg/__22.html", stand: "09/2026" },
    { titel: "Baugesetzbuch – § 35 BauGB (Bauen im Außenbereich)", url: "https://www.gesetze-im-internet.de/bbaug/__35.html", stand: "09/2026" },
    { titel: "Baugesetzbuch – § 1 BauGB (Aufgabe, Begriff und Grundsätze der Bauleitplanung, Abwägungsgebot)", url: "https://www.gesetze-im-internet.de/bbaug/__1.html", stand: "09/2026" },
    { titel: "Niedersächsischer Landkreistag, NSGB, ML und MU – Arbeitshilfe: Planung von Freiflächen-Photovoltaikanlagen in Niedersachsen (10/2022)", url: "https://www.ml.niedersachsen.de/download/189442/Arbeitshilfe_Solarplanung_nicht_vollstaendig_barrierefrei_.pdf", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Passt Ihre Fläche?",
    text: "Lage, Abstände, Netz und Planungsrecht vorab prüfen.",
    href: "/flaechencheck",
    label: "Zum Flächencheck",
  },
  cta: {
    title: "Konflikte erkennen, bevor sie das Projekt kosten.",
    text: "Im Flächencheck schätzen wir Lage, Umfeld, Netzanschluss und Planungsrecht Ihrer Fläche ein. Für Flächeneigentümer ist die Plattform von ÖkoInvest kostenfrei.",
    primary: { label: "Zum Flächencheck", href: "/flaechencheck" },
    secondary: { label: "Ablauf der Entwicklung", href: "/prozess" },
  },
};

export default artikel;
