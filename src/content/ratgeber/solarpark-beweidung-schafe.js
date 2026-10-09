// Ratgeber: Beweidung im Solarpark mit Schafen (und Geflügel) – Pflegekonzept, Technik, Besatz,
// Vertragsmodelle, GAP-Förderfähigkeit (§ 12 GAPDZV), Tierschutz, Biodiversität, Abgrenzung Agri-PV.
// Recherchestand 29.09.2026 (LfL-Information „Beweidung von PV-Anlagen mit Schafen“, 2. Aufl. 2019,
// KNE „Artenreiches Grünland im Solarpark etablieren“ 07/2025, GAPDZV § 12, Fraunhofer ISE
// Agri-PV-Leitfaden 4. Aufl. 06/2025, DIN SPEC 91434/91492).

import { AGRI, PACHT, FREIFLAECHE, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtPct } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
// LfL Bayern / LELF Brandenburg / LWK Niedersachsen (2019): Mindesthöhe Modulunterkante bei Wirtschaftsrassen.
const UNTERKANTE_LFL_CM = 80;
// KNE (2025) nach Wichelhaus und Hopf (2024): Unterkante sollte 90 cm nicht unterschreiten.
const UNTERKANTE_KNE_CM = 90;
// LfL (2019): stromführende Litze 20 cm über dem Boden und 20 cm Abstand zum Zaun.
const LITZE_CM = 20;
// LfL (2019): Anlagen unter 5 ha meist als Standweide.
const STANDWEIDE_BIS_HA = 5;
// KNE (2025): 1 bis max. 3 Beweidungsgänge je Jahr, Ruhe mindestens 8 Wochen.
const GAENGE_MAX = 3;
const RUHE_WOCHEN = 8;
// LfL (2019), Kalkulationsbeispiel: 240 Mutterschafe, 60 ha, 180 Futtertage, 3 Durchgänge.
const LFL_BSP = { schafe: 240, ha: 60, tage: 180 };
// LfL (2019), Kap. 4.1: Pflegeentgelte in der Literatur (€/ha und Jahr).
const PFLEGE_GRUNDPREIS = { min: 150, max: 400 }; // Hanisch 2010
const PFLEGE_MIN_SCHAEFER = 300; // Rebitzer 2010
const PFLEGE_KTBL = { min: 801, max: 855 }; // Schroers & Piekart-Müller 2014 (KTBL)
const PFLEGE_SPITZE = 1000; // Schalow 2013
// LfL (2019), Tabelle 6: erforderliches Pflegeentgelt im Beispiel (€/ha): Mehrkosten, gleichwertig ohne / mit KULAP.
const LFL_ENTGELT = { mehrkosten: 249.91, gleichwertig: 559.91, mitKulap: 728.91 };

const besatzProHa = LFL_BSP.schafe / LFL_BSP.ha;

const artikel = {
  slug: "solarpark-beweidung-schafe",
  title: "Schafe im Solarpark: Beweidung, Technik, Verträge und Förderung",
  seoTitle: "Solarpark Beweidung mit Schafen | ÖkoInvest",
  kurzTitel: "Beweidung im Solarpark",
  description:
    "Beweidung im Solarpark mit Schafen: Modulhöhe, Kabelschutz, Besatz, Pflegeentgelt, GAP-Förderfähigkeit und der Unterschied zu Agri-PV auf der Weide erklärt.",
  excerpt:
    "Schafe statt Mulcher: Was eine Anlage für die Beweidung können muss, wie Schäfer und Betreiber den Vertrag gestalten, warum die Fläche meist keine Direktzahlungen bringt und wann aus dem Solarpark eine Agri-PV-Weide wird.",
  hauptKeyword: "solarpark beweidung schafe",
  keywords: [
    "Schafe im Solarpark",
    "Beweidung Photovoltaik-Anlage",
    "Solarbeweidung Vertrag Schäfer",
    "Pflegeentgelt Schafbeweidung PV",
    "Solarpark Mulchen oder Beweidung",
    "Hühner unter Solarmodulen",
    "Agri-PV Weide DIN SPEC 91492",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Agri-PV & Landwirtschaft",
  bild: "/img/freiflaeche-begehung.jpg",
  bildAlt: "Zwei Fachkräfte mit Schutzhelm und Warnweste gehen zwischen aufgeständerten Solarmodulreihen über eine Wiese",
  badge: { wert: `≥ ${UNTERKANTE_LFL_CM} cm`, text: "Modulunterkante für Schafbeweidung (LfL)" },

  kurzFazit: [
    `**Schafe sind in vielen Solarparks die schonendste Grünpflege:** kein Steinschlag, kein Mulchgut, weniger Mäuse und Maulwurfshügel. Voraussetzung ist eine Modulunterkante von mindestens ${UNTERKANTE_LFL_CM} cm, besser ${UNTERKANTE_KNE_CM} cm, und schafsicher verlegte Kabel.`,
    `Eine pauschale Besatzdichte gibt es nicht. Bewährt hat sich **„kurze Beweidung, lange Ruhepause“**: ein bis ${GAENGE_MAX} Durchgänge im Jahr mit mindestens ${RUHE_WOCHEN} Wochen Pause, in größeren Anlagen als Umtriebsweide.`,
    `Der Schäfer erbringt eine **Dienstleistung**. In der Fachliteratur werden Pflegeentgelte von grob ${fmt(PFLEGE_GRUNDPREIS.min)} bis über ${fmt(PFLEGE_KTBL.min)} € je Hektar und Jahr genannt – abhängig von Aufwuchs, Entfernung, Wasser und Nachmahd.`,
    "**Klassische Solarparks sind nach § 12 GAPDZV nicht förderfähig**, auch wenn Schafe darauf weiden. Direktzahlungen gibt es nur, wenn die Anlage als Agri-PV-Anlage nachgewiesen wird.",
    "Seit November 2023 erlaubt das EU-Recht auch **Freiland-Legehennen unter PV-Modulen**, sofern die Tierschutzvorgaben eingehalten werden. Praxiserfahrungen werden gerade gesammelt.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Lohnt sich die Beweidung eines Solarparks mit Schafen?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: `**Für den Betreiber ist die Schafbeweidung oft die günstigste und schonendste Art, den Aufwuchs unter den Modulen kurz zu halten – für den Schäfer lohnt sie sich, wenn Entgelt, Fahrwege und Futterqualität zusammenpassen.** Beide Seiten profitieren: Die Anlage bleibt frei von Verschattung, die regelmäßige Kontrolle durch den Schäfer senkt das Risiko von Diebstahl und Vandalismus, und die Tiere finden eine eingezäunte, wolfssichere Weide mit Schatten.`,
        },
        {
          typ: "p",
          text: `In Deutschland ist die Doppelnutzung von Freiflächenanlagen mit Schafen nach Einschätzung des Fraunhofer ISE gängige Praxis. Die Anlagen sind dabei allerdings meist rein auf den Stromertrag optimiert – die landwirtschaftliche Wertschöpfung je Hektar ist gering. Im [Agri-PV-Rechner](/rechner/agri-pv) setzen wir für Weidenutzung einen Deckungsbeitrag von rund ${fmtEur(AGRI.kulturen.find((k) => k.id === "weide").db)} je Hektar an, zum Vergleich: Die Pacht für einen Solarpark liegt bei ${fmt(PACHT.freiflaecheProHa.min)} bis ${fmt(PACHT.freiflaecheProHa.max)} € je Hektar. Die Beweidung ist also eine Ergänzung, kein Ersatz für die Pacht.`,
        },
        {
          typ: "kennzahl",
          wert: `${fmt(besatzProHa, 0)} Schafe/ha`,
          titel: "Besatz im Kalkulationsbeispiel der LfL",
          text: `${fmt(LFL_BSP.schafe)} Mutterschafe auf ${fmt(LFL_BSP.ha)} ha über ${fmt(LFL_BSP.tage)} Futtertage auf einem ertragsschwachen Standort. Kein Richtwert – der Besatz muss sich nach dem Aufwuchs richten.`,
        },
      ],
    },
    {
      id: "pflegekonzept",
      titel: "Pflegekonzept statt Mulchen: Was Beweidung für Fläche und Artenvielfalt bringt",
      tocLabel: "Beweidung statt Mulchen",
      bloecke: [
        {
          typ: "p",
          text: "**Ein Großteil der Solarparks wird heute regelmäßig gemulcht – das ist bequem, aber für Boden und Artenvielfalt die schlechteste Pflegeform.** Das Kompetenzzentrum Naturschutz und Energiewende (KNE) beschreibt, dass liegenbleibendes Mulchgut den Boden beschattet und mit Nährstoffen anreichert. Davon profitieren schnellwüchsige Gräser, während Kräuter verdrängt werden. Zudem werden beim Mulchen Insekten, Mäuse und Amphibien getötet.",
        },
        {
          typ: "p",
          text: "Schafe dagegen schaffen mit ihren Klauen offene Bodenstellen, in denen konkurrenzschwache Pflanzen keimen und Wildbienen nisten können. Sie verbreiten Samen über Fell, Klauen und Kot, und das Blütenangebot bleibt länger erhalten, weil nie die ganze Fläche auf einmal abgeräumt wird. Weil die Tiere unter den Modulen ruhen und zwischen den Reihen fressen, entsteht eine abwechslungsreiche Grasnarbe. Wie Solarparks gezielt für Artenschutz geplant werden, lesen Sie im Ratgeber [Artenschutz und Biodiversität im Solarpark](/ratgeber/solarpark-artenschutz-biodiversitaet).",
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Beweidung ist nicht automatisch Naturschutz",
          text: "Bleiben die Schafe zu lange oder ist der Besatz zu gering, selektieren die Tiere stark. Unter den Modulen reichern sich Nährstoffe an, weniger geschützte Bereiche verbrachen. Für artenreiches Grünland empfiehlt das KNE eine kurze, intensive Beweidung mit hoher Besatzdichte, zeitlich gestaffelt auf Teilflächen und mit Säumen, die stehen bleiben. Entwurmungsmittel sollten während der Beweidung möglichst vermieden werden.",
        },
        {
          typ: "p",
          text: "Die untere Naturschutzbehörde kann Beweidung als Maßnahme zur Minderung des Eingriffs anstelle der Mahd empfehlen. Wer das Pflegekonzept schon im Bebauungsplan festschreibt, sollte den Schäfer frühzeitig einbeziehen – etwa bei der Wahl der Ansaatmischung. Wie das Genehmigungsverfahren abläuft, beschreibt der Ratgeber [Solarpark-Genehmigung und Bebauungsplan](/ratgeber/solarpark-genehmigung-bebauungsplan).",
        },
      ],
    },
    {
      id: "technik",
      titel: "Welche technischen Voraussetzungen muss die Anlage erfüllen?",
      tocLabel: "Technik",
      bloecke: [
        {
          typ: "p",
          text: `**Entscheidend sind Modulhöhe, Kabelführung und Zaun – und das muss vor dem Bau feststehen, denn Nachrüsten ist teuer.** Die Landesanstalten und Kammern aus Bayern, Brandenburg und Niedersachsen nennen als Mindesthöhe der Modulunterkante ${UNTERKANTE_LFL_CM} cm bei Wirtschaftsrassen, und zwar überall in der Anlage, auch bei unebenem Gelände. Das KNE empfiehlt, ${UNTERKANTE_KNE_CM} cm nicht zu unterschreiten.`,
        },
        {
          typ: "tabelle",
          caption: `Anforderungen an einen beweidbaren Solarpark, Stand ${STAND}`,
          kopf: ["Bauteil", "Anforderung", "Warum"],
          zeilen: [
            ["Modulunterkante", `mind. ${UNTERKANTE_LFL_CM} cm (LfL), besser ${UNTERKANTE_KNE_CM} cm (KNE); sonst kleine Rassen wie Ouessant`, "Verletzungen an Rücken und Brustkorb, Modulschäden, Lämmer werden von Mutterschafen getrennt"],
            ["Kabel", "fest unter den Modulen, mit Kabelbindern fixiert, im Ständerprofil oder in Leerrohren; keine Schlaufen", "Schafe verbeißen Kabel oder verfangen sich; hohe Ausfallkosten"],
            ["Außenzaun", `Bodenabschluss; sonst stromführende Litze ${LITZE_CM} cm über dem Boden und ${LITZE_CM} cm vom Zaun`, "Lämmer schlüpfen durch, Füchse und Wölfe dringen ein"],
            ["Wechselrichter, Trafo", "zusätzlich einzäunen oder vergittern", "Verbiss und Beschädigung empfindlicher Technik"],
            ["Unterkonstruktion", "keine vorstehenden Flacheisen, keine offenen Rohre", "Verletzungsgefahr für Tiere, Hunde und Menschen"],
            ["Wasser und Zufahrt", "Tränke mit Wasserversorgung, Zufahrt für Tiertransport und Notfälle", "Tiere müssen jederzeit Zugang zu sauberem Wasser haben"],
          ],
          hervorheben: 1,
          minBreite: 720,
          fussnote: "Quellen: LfL-Information „Beweidung von Photovoltaik-Anlagen mit Schafen“ (2. Aufl. 2019), KNE (2025). Ziegen sind wegen ihrer Kletterfreude nur für hohe, nachgeführte Anlagen geeignet.",
        },
        {
          typ: "p",
          text: "Nachgeführte Anlagen ([Tracker](/wissen/lexikon#tracker)) sind in der Regel ohnehin höher und damit gut beweidbar. Bei festen Süd-Anlagen mit tiefer Unterkante bleiben Bereiche, die der Schäfer mit dem Freischneider nachpflegen muss. Das sollte der Betreiber bei der Planung bedenken: Wenige Zentimeter mehr Gestellhöhe kosten beim Bau wenig, sparen aber über 30 Jahre Pflegekosten.",
        },
      ],
    },
    {
      id: "besatz",
      titel: "Besatzdichte und Weideführung: Wie viele Schafe braucht ein Solarpark?",
      tocLabel: "Besatz und Weideführung",
      bloecke: [
        {
          typ: "p",
          text: `**Eine feste Zahl von Schafen je Hektar gibt es nicht – der Besatz richtet sich nach dem Aufwuchs, der Jahreszeit und dem Pflegeziel.** Im ersten Beweidungsjahr müssen Schäfer und Betreiber Erfahrungen sammeln. Anlagen unter etwa ${STANDWEIDE_BIS_HA} ha werden häufig als Standweide geführt, größere Anlagen oder solche mit sehr unterschiedlichem Bewuchs als Umtriebs- oder Portionsweide.`,
        },
        {
          typ: "liste",
          punkte: [
            "**Umtriebsweide:** Die Fläche wird sauberer und gleichmäßiger abgefressen, der Parasitendruck sinkt, und der Schäfer behält den Überblick über die Herde.",
            "**Standweide mit geringem Besatz:** einfach, aber die Schafe verwildern leicht, bilden Kleingruppen und fressen selektiv – Nachmahd wird nötig.",
            `**Beweidungsgänge:** je nach Wüchsigkeit ein- bis ${GAENGE_MAX}-mal im Jahr, dazwischen mindestens ${RUHE_WOCHEN} Wochen Ruhe (KNE).`,
            "**Nachmahd:** zeitnah nach der Beweidung, damit ungefressene Pflanzen nicht aussamen. Idealerweise übernimmt sie der Schäfer selbst.",
            "**Saison:** meist Frühjahr bis Herbst. Ganzjährige Beweidung ist möglich, braucht aber einen Unterstand und einen festen Pferch für Scheren, Impfen und Entwurmen.",
          ],
        },
        {
          typ: "p",
          text: `Günstig ist es, wenn der Solarpark nahe an den übrigen Weiden des Schäfers liegt: Dann kann er den Besatz kurzfristig an Wachstumsspitzen anpassen. Liegt die Anlage weit entfernt, steigen Fahr-, Kontroll- und Transportkosten. Im Kalkulationsbeispiel der LfL (${fmt(LFL_BSP.ha)} ha, 25 km vom Hof) verdoppelt sich der Arbeitsaufwand gegenüber eigenen Weiden nahezu.`,
        },
      ],
    },
    {
      id: "tierschutz",
      titel: "Tierschutz, Wasser, Schatten und ungeeignete Standorte",
      tocLabel: "Tierschutz",
      bloecke: [
        {
          typ: "p",
          text: "**Die Schafhaltung im Solarpark folgt denselben Regeln wie auf jeder anderen Weide: gute fachliche Praxis, jederzeit sauberes Trinkwasser, tägliche Kontrolle.** Schatten ist dagegen kein Problem – die Module schützen vor Sonne, Wind und Regen, ein zusätzlicher Unterstand ist in der Weidesaison meist nicht nötig. Weil es in vielen Anlagen keinen Wasseranschluss gibt, muss die Wasserversorgung vertraglich geregelt werden.",
        },
        {
          typ: "checkliste",
          punkte: [
            "**Parasiten:** Unter den Modulen ruhen und koten die Tiere bevorzugt, dort steigt der Wurmdruck. Kotproben und Umtrieb helfen. Außenparasiten führen zum Wetzen an Gestellen und Modulen.",
            "**Ablammen:** in der Anlage möglich, wenn Füchse sicher ausgeschlossen sind und der Wurmdruck gering ist.",
            "**Kontrolle:** Verfangen in Kabeln, Verletzungen an Panelkanten und Beinen gehören zur täglichen Tierkontrolle.",
            "**Kontaminierte Flächen:** Deponien, Rieselfelder und belastete Konversionsflächen sind in der Regel ungeeignet; im Zweifel Bodenproben.",
            "**Flughäfen und Wasserschutzgebiet Zone II:** Beweidung ist dort in der Regel unzulässig (Vogelschlag bzw. Schutzgebietsverordnung).",
          ],
        },
      ],
    },
    {
      id: "vertrag",
      titel: "Vertragsmodelle mit Schäfern: Entgelt, Pflichten, Haftung",
      tocLabel: "Vertrag mit dem Schäfer",
      bloecke: [
        {
          typ: "p",
          text: "**Der übliche Weg ist ein Beweidungs- oder Pflegevertrag zwischen Betreiber und Schafhalter mit einer jährlichen Pflegepauschale je Hektar – der Schäfer erbringt eine Dienstleistung, er pachtet die Fläche nicht.** Das Pflegeziel sollte messbar formuliert sein: „Keine Verschattung der Module“ ist für beide Seiten besser kontrollierbar als „Beweidung der Fläche“. Die LfL hat dazu einen Mustervertrag veröffentlicht, der Pflichten beider Seiten auflistet.",
        },
        {
          typ: "tabelle",
          caption: "Pflegeentgelte für Schafbeweidung in Solarparks laut Fachliteratur (€ je Hektar und Jahr)",
          kopf: ["Quelle / Einordnung", "Wert", "Hinweis"],
          zeilen: [
            ["Branchenübliche Grundpreise (Hanisch 2010)", `${fmt(PFLEGE_GRUNDPREIS.min)}–${fmt(PFLEGE_GRUNDPREIS.max)} €`, "ältere Marktbeobachtung, ohne Nachmahd"],
            ["Mindestens aus Schäfersicht (Rebitzer 2010)", `${fmt(PFLEGE_MIN_SCHAEFER)} €`, "Untergrenze für einen kostendeckenden Betrieb"],
            ["KTBL-Kalkulation (Schroers & Piekart-Müller 2014)", `${fmt(PFLEGE_KTBL.min)}–${fmt(PFLEGE_KTBL.max)} €`, "je nach Koppelgröße"],
            ["Einzelne Fälle (Schalow 2013)", `bis ${fmt(PFLEGE_SPITZE)} €`, "schwierige Standorte, hoher Pflegeanspruch"],
            ["**LfL-Beispiel: Ausgleich der Mehrkosten**", `**${fmt(LFL_ENTGELT.mehrkosten, 2)} €**`, `60 ha, 25 km Entfernung, ertragsschwach`],
            ["LfL-Beispiel: gleich wirtschaftlich wie eigene Weide", `${fmt(LFL_ENTGELT.gleichwertig, 2)} € bzw. ${fmt(LFL_ENTGELT.mitKulap, 2)} € mit KULAP`, "berücksichtigt entgangene Betriebsprämie und Agrarumweltzahlungen"],
          ],
          hervorheben: 1,
          markierteZeile: 4,
          minBreite: 680,
          fussnote: "Zusammengestellt in: LfL-Information „Beweidung von Photovoltaik-Anlagen mit Schafen“, 2. Aufl. 2019, Kap. 4. Die Werte sind ausdrücklich keine Empfehlung, sondern zeigen die Spanne. Aktuelle Preise können durch Inflation und Lohnkosten höher liegen.",
        },
        {
          typ: "p",
          text: "Gelegentlich wird eine **kostenneutrale Beweidung** vereinbart: Der Schäfer nutzt das Futter, der Betreiber zahlt nichts. Das kann auf wüchsigen ehemaligen Ackerflächen in Hofnähe aufgehen. Auf mageren oder entfernten Flächen trägt der Schäfer damit aber Kosten, die ihm niemand ersetzt – die LfL rät, Mehrkosten und entgangene Förderung ehrlich zu kalkulieren. In jedem Fall sollten folgende Punkte geregelt sein:",
        },
        {
          typ: "checkliste",
          punkte: [
            "Pflichten des Betreibers: schafsicherer Außenzaun und Kabel, Zufahrt, Schlüssel, Sicherheitsunterweisung, Ankündigung von Wartungsarbeiten einige Tage im Voraus.",
            "Pflichten des Schafhalters: Pflegeziel erreichen, Schäden an der Anlage kurzfristig melden, Zugang zu allen technischen Bereichen freihalten.",
            "Haftung und Versicherung: Deckt die Betriebshaftpflicht die Pflege gewerblicher PV-Anlagen? Eine schriftliche Bestätigung des Versicherers ist ratsam; Haftungshöchstgrenzen vereinbaren.",
            "Vergütung von Nachmahd und Sonderaufwand nach Stunden; Weiterzahlung, wenn die Beweidung wegen Wartung unterbrochen werden muss.",
            "Laufzeit mit Verlängerung und Kündigungsfrist; Regelung für Öko-Betriebe (kein chemischer Pflanzenschutz auf der Fläche).",
          ],
        },
        {
          typ: "kasten",
          variant: "info",
          titel: "Steuern: Beweidung als Dienstleistung",
          text: "Das Pflegeentgelt ist in der Regel Entgelt für eine Dienstleistung und umsatzsteuerlich wie ertragsteuerlich gesondert zu beurteilen – bei pauschalierenden Landwirten greift die Durchschnittssatzbesteuerung dafür nach verbreiteter Auffassung nicht. Ob die Tätigkeit noch zur Landwirtschaft zählt, hängt von den Grenzen der Einkommensteuer-Richtlinien ab. Details im Ratgeber [Steuern für Landwirte mit Photovoltaik](/ratgeber/photovoltaik-landwirt-steuern).",
        },
      ],
    },
    {
      id: "gap",
      titel: "Bekommt der Schäfer für die Fläche GAP-Direktzahlungen?",
      tocLabel: "GAP-Förderfähigkeit",
      bloecke: [
        {
          typ: "p",
          text: "**Nein, in aller Regel nicht: Flächen mit Solaranlagen gelten nach § 12 Abs. 4 Nr. 6 GAPDZV als hauptsächlich nichtlandwirtschaftlich genutzt – auch wenn darauf Schafe weiden.** Die einzige Ausnahme ist nach § 12 Abs. 5 GAPDZV eine Agri-PV-Anlage, die die Bearbeitung mit üblichen landwirtschaftlichen Methoden, Maschinen und Geräten nicht ausschließt und die landwirtschaftlich nutzbare Fläche nach DIN SPEC 91434 um höchstens 15 % verringert. Dann bleiben " + fmtPct(AGRI.gapFoerderfaehig, 0) + " der Fläche förderfähig.",
        },
        {
          typ: "p",
          text: `Für den Schäfer heißt das: Auf der Anlagenfläche entfallen Einkommensgrundstützung und Umverteilungsprämie, die wir grob mit ${fmtEur(AGRI.direktzahlungProHa)} je Hektar ansetzen, und in der Regel auch Agrarumweltzahlungen. Anders kann es bei Ausgleichsflächen außerhalb des Zauns aussehen, die er mitpflegt – ob diese förderfähig sind, hängt von ihrer Nutzung und den Auflagen ab und sollte mit der Landwirtschaftsbehörde geklärt werden. Genauer erklärt der Ratgeber [Agri-PV Förderung und GAP](/ratgeber/agri-pv-foerderung-gap) die Regeln.`,
        },
      ],
    },
    {
      id: "abgrenzung",
      titel: "Beweideter Solarpark oder Agri-PV auf der Weide?",
      tocLabel: "Abgrenzung Agri-PV",
      bloecke: [
        {
          typ: "p",
          text: "**Ein beweideter Solarpark bleibt rechtlich eine Freiflächenanlage – zur Agri-PV-Anlage wird er nur, wenn die Weidenutzung die Hauptnutzung ist und die Anforderungen der DIN SPEC 91434 und 91492 erfüllt werden.** Die DIN SPEC 91434 führt Dauergrünland mit Weidenutzung als Kategorie 1D (hoch aufgeständert) und 2D (bodennah), überlässt die Anforderungen an die Tierhaltung aber der DIN SPEC 91492 von 2024. Wichtig: Die Norm verbietet, eine Ackerfläche mit dem Bau der Anlage zur Weide umzuwidmen.",
        },
        {
          typ: "tabelle",
          caption: `Beweideter Solarpark und Agri-PV mit Weidenutzung im Vergleich, Stand ${STAND}`,
          kopf: ["Kriterium", "Solarpark mit Schafbeweidung", "Agri-PV, Kategorie Weide"],
          zeilen: [
            ["Hauptnutzung", "Stromerzeugung, Beweidung als Pflege", "Landwirtschaft (Tierhaltung), Strom als Zweitnutzung"],
            ["Norm", "keine; Empfehlungen von LfL und KNE", "DIN SPEC 91434 (Kategorie 1D/2D) mit DIN SPEC 91492"],
            ["Flächenverlust", "nicht begrenzt", `höchstens ${fmtPct(1 - AGRI.gapFoerderfaehig, 0)}, Flächenbesatz nach DIN SPEC 91492 mind. 85 % der Referenz`],
            ["GAP-Direktzahlungen", "entfallen (§ 12 Abs. 4 Nr. 6 GAPDZV)", `möglich für ${fmtPct(AGRI.gapFoerderfaehig, 0)} der Fläche – Anerkennung vorab klären, da die GAPDZV nur auf DIN SPEC 91434 verweist`],
            ["Typische Pacht", `${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €/ha`, `${fmt(PACHT.agriProHa.min)}–${fmt(PACHT.agriProHa.max)} €/ha`],
            ["Vertragsverhältnis", "Pflegevertrag Betreiber – Schäfer", "Landwirt bewirtschaftet selbst, Nutzungskonzept verpflichtend"],
          ],
          hervorheben: 2,
          minBreite: 720,
          fussnote: "Vereinfachte Darstellung. Bei Grünland-Agri-PV gelten im EEG zusätzliche Ausschlüsse, etwa für Natura-2000-Gebiete und geschützte Lebensraumtypen.",
        },
        {
          typ: "p",
          text: "Welche Anforderungen die Normen im Detail stellen und wie der Nachweis gegenüber Netzbetreiber und Landwirtschaftsbehörde funktioniert, erklärt der Ratgeber [DIN SPEC 91434](/ratgeber/agri-pv-din-spec-91434). Einen Überblick über Systeme und Modelle bietet die Seite [Agri-PV](/agri-pv); was sich für Landwirte rechnet, zeigt der Beitrag [Agri-PV Wirtschaftlichkeit](/ratgeber/agri-pv-wirtschaftlichkeit). Den Begriff fasst das Lexikon unter [Solarbeweidung](/wissen/lexikon#solarbeweidung) zusammen.",
        },
      ],
    },
    {
      id: "gefluegel",
      titel: "Geflügel unter Solarmodulen: Legehennen im Solarpark",
      tocLabel: "Geflügel",
      bloecke: [
        {
          typ: "p",
          text: "**Seit November 2023 erlaubt die EU ausdrücklich, Freiland-Legehennen auf Flächen mit Solaranlagen zu halten, sofern die Tierschutzvorgaben eingehalten werden und die Bewegungsfreiheit der Tiere nicht eingeschränkt wird** (Anhang II der Delegierten Verordnung (EU) 2023/2465). Die Module schützen die Hennen vor Witterung und Greifvögeln – Hühner nutzen einen Auslauf deutlich besser, wenn er Deckung bietet.",
        },
        {
          typ: "p",
          text: "In Baden-Württemberg werden im Rahmen der Modellregion Agri-PV zwei Praxisanlagen mit Legehennen wissenschaftlich begleitet (Schöntal 2023 und Uttenweiler 2024, jeweils gut 1 MWp). Offene Fragen betreffen laut Fraunhofer ISE das Auslaufverhalten der Tiere, ihre Verteilung unter der Anlage und die Folgen für die Grasnarbe. Für Geflügel gilt bei der Technik dasselbe wie bei Schafen: Kabel außer Reichweite, keine scharfen Kanten, Reinigung der Module ohne Chemikalien. Hinzu kommen die Hygiene- und Seuchenschutzanforderungen der Geflügelhaltung.",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So kommen Betreiber, Eigentümer und Schäfer zusammen",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Beweidung in die Planung aufnehmen", "Modulhöhe, Kabelführung, Zaun und Wasser vor der Ausschreibung des Baus festlegen – nachträglich wird es teuer."],
            ["Schäfer früh einbinden", "Anlage gemeinsam besichtigen, Ansaatmischung und Pflegeziel abstimmen. Ansprechpartner sind Landesschafzuchtverbände und Landwirtschaftskammern."],
            ["Pflegevertrag schließen", "Messbares Pflegeziel, Pauschale je Hektar, Nachmahd, Haftung, Versicherung und Laufzeit regeln."],
            ["Im Pachtvertrag verankern", "Wer verpachtet und selbst Schafe hält, kann sich im [Pachtvertrag](/ratgeber/pachtvertrag-solarpark) ein Vorrecht auf den Pflegeauftrag sichern."],
            ["Erfolg jährlich prüfen", "Bestand nach der Saison begutachten und Besatz, Termine und Nachpflege anpassen."],
          ],
        },
        {
          typ: "tool",
          href: pfad("/rechner/agri-pv"),
          titel: "Agri-PV oder Solarpark mit Beweidung?",
          text: "Vergleichen Sie Pacht, Eigeninvestition und Beteiligung für Ihre Fläche – auch mit Weidenutzung.",
          label: "Zum Agri-PV-Rechner",
        },
        {
          typ: "p",
          text: `Für Landwirte, die eine Fläche einbringen und zugleich die Pflege übernehmen möchten, bietet die Seite [Landwirte](/landwirte) einen Überblick über die Wege Verpachten, Selbstinvestieren und Beteiligen. Die Grünpflege ist Teil der Betriebskosten des Parks, die wir insgesamt mit rund ${fmt(FREIFLAECHE.opexProKwp)} € je kWp und Jahr ansetzen.`,
        },
      ],
    },
  ],

  faq: [
    {
      q: "Wie hoch müssen die Module für Schafe sein?",
      a: `Die Landesanstalten und Kammern aus Bayern, Brandenburg und Niedersachsen empfehlen mindestens ${UNTERKANTE_LFL_CM} cm Abstand zwischen Boden und Modulunterkante bei Wirtschaftsrassen, das KNE rät zu mindestens ${UNTERKANTE_KNE_CM} cm. Bei niedrigeren Anlagen kommen nur kleine Rassen wie Ouessantschafe in Frage.`,
    },
    {
      q: "Wie viele Schafe braucht man pro Hektar Solarpark?",
      a: `Eine pauschale Zahl gibt es nicht, der Besatz richtet sich nach dem Aufwuchs. Im Kalkulationsbeispiel der LfL weiden ${fmt(LFL_BSP.schafe)} Mutterschafe auf ${fmt(LFL_BSP.ha)} ha, also rund ${fmt(besatzProHa, 0)} je Hektar über die Saison. Bewährt hat sich eine kurze, intensive Beweidung mit langen Ruhepausen.`,
    },
    {
      q: "Was zahlt ein Solarparkbetreiber dem Schäfer?",
      a: `Die Vergütung ist frei verhandelbar. In der Fachliteratur reichen die Werte von ${fmt(PFLEGE_GRUNDPREIS.min)}–${fmt(PFLEGE_GRUNDPREIS.max)} € bis über ${fmt(PFLEGE_KTBL.min)} € je Hektar und Jahr. Entscheidend sind Entfernung, Wasser, Aufwuchs und der Umfang der Nachmahd.`,
    },
    {
      q: "Gibt es für beweidete Solarparks Agrarförderung?",
      a: "In Deutschland in der Regel nicht. Flächen mit Solaranlagen gelten nach § 12 GAPDZV als nichtlandwirtschaftlich, es sei denn, es handelt sich um eine nachgewiesene Agri-PV-Anlage. Mehr unter [Agri-PV Förderung und GAP](/ratgeber/agri-pv-foerderung-gap).",
    },
    {
      q: "Dürfen Ziegen in einem Solarpark weiden?",
      a: "Nur mit Vorsicht. Ziegen stellen sich auf die Hinterbeine, klettern und können Module beschädigen. Die LfL empfiehlt sie nur für hohe, nachgeführte Anlagen.",
    },
    {
      q: "Können Hühner unter Solarmodulen gehalten werden?",
      a: "Ja. Seit November 2023 erlaubt das EU-Recht Freiland-Legehennen auf Flächen mit Solaranlagen, wenn die Tierschutzvorgaben erfüllt sind. In Baden-Württemberg werden dazu Praxisanlagen wissenschaftlich begleitet.",
    },
    {
      q: "Ist ein beweideter Solarpark schon Agri-PV?",
      a: "Nein. Agri-PV setzt voraus, dass die landwirtschaftliche Nutzung Hauptnutzung bleibt und die DIN SPEC 91434 bzw. 91492 erfüllt ist. Ein normaler Solarpark mit Schafen bleibt eine Freiflächenanlage – siehe [DIN SPEC 91434](/ratgeber/agri-pv-din-spec-91434).",
    },
  ],

  passend: [
    { href: "/ratgeber/solarpark-artenschutz-biodiversitaet", titel: "Artenschutz im Solarpark", text: "Wie Solarparks zur Biodiversität beitragen." },
    { href: "/ratgeber/agri-pv-din-spec-91434", titel: "DIN SPEC 91434 erklärt", text: "Kategorien, Flächenverlust und Nachweise." },
    { href: "/ratgeber/agri-pv-foerderung-gap", titel: "Agri-PV Förderung & GAP", text: "Direktzahlungen, EEG und Baurecht." },
    { href: pfad("/landwirte"), titel: "Für Landwirte", text: "Verpachten, selbst investieren oder beteiligen." },
  ],

  quellen: [
    { titel: "LfL Bayern, LELF Brandenburg, LWK Niedersachsen – Beweidung von Photovoltaik-Anlagen mit Schafen (LfL-Information, 2. Auflage 2019)", url: "https://www.lfl.bayern.de/mam/cms07/publikationen/daten/informationen/beweidung-pv-anlagen-schafe_lfl-information.pdf", stand: "09/2026" },
    { titel: "Kompetenzzentrum Naturschutz und Energiewende – Artenreiches Grünland im Solarpark etablieren – aber wie? (Juli 2025)", url: "https://www.naturschutz-energiewende.de/wp-content/uploads/2025/07/KNE_Artenreiches-Gruenland-im-Solarpark.pdf", stand: "09/2026" },
    { titel: "GAP-Direktzahlungen-Verordnung (GAPDZV), § 12", url: "https://www.gesetze-im-internet.de/gapdzv/__12.html", stand: "09/2026" },
    { titel: "Fraunhofer ISE – Agri-Photovoltaik: Chance für Landwirtschaft und Energiewende (Leitfaden, 4. Auflage Juni 2025)", url: "https://www.ise.fraunhofer.de/content/dam/ise/de/documents/publications/studies/APV-Leitfaden.pdf", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – DIN SPEC 91492, Agri-Photovoltaik-Anlagen – Anforderungen an die Nutztierhaltung", url: "https://www.clearingstelle-eeg-kwkg.de/suche/type/technische-norm/6962", stand: "09/2026" },
    { titel: "LELF Brandenburg – Schafbeweidung", url: "https://lelf.brandenburg.de/lelf/de/landwirtschaft/tierzucht-und-tierhaltung/schafe-und-ziegen/schafbeweidung/", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Agri-PV auf Ihrer Weide?",
    text: "Pacht, Eigeninvestition und Beteiligung im Vergleich.",
    href: pfad("/rechner/agri-pv"),
    label: "Zum Agri-PV-Rechner",
  },
  cta: {
    title: "Passt Ihre Fläche zu Solarpark oder Agri-PV?",
    text: "Im Flächencheck prüfen wir Lage, Netzanschluss und Planungsrecht – für Flächeneigentümer und Landwirte kostenfrei.",
    primary: { label: "Zum Flächencheck", href: pfad("/flaechencheck") },
    secondary: { label: "Agri-PV entdecken", href: pfad("/agri-pv") },
  },
};

export default artikel;
