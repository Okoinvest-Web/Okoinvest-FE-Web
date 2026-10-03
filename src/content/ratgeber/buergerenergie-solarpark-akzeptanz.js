// Ratgeber: Bürgerenergie und Akzeptanz bei Solarparks – Bürgerenergiegesellschaft, Beteiligungsmodelle,
// Umfragen, Kommunikationsfahrplan, Förderung, AT/CH. Recherchestand 29.09.2026: EEG 2023 § 3 Nr. 15,
// § 22 Abs. 3, § 22b; FA Wind und Solar – Umfrage zur Akzeptanz der Solarenergie Frühjahr 2026 (forsa);
// AEE-Akzeptanzumfrage 2025 (YouGov); BAFA-Förderprogramm Bürgerenergiegesellschaften (nur Wind an Land).

import { FREIFLAECHE, FINANZIERUNG, KOMMUNE, REGIONEN, GEMEINSCHAFTEN, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtPct, fmtMio } from "@/lib/rechner/annahmen";

/* ------------------------------------------------------------------ */
/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
/* ------------------------------------------------------------------ */

// § 22 Abs. 3 EEG 2023: ausschreibungsfrei für Solaranlagen des ersten Segments von Bürgerenergiegesellschaften bis einschließlich 6 MW (sonst 1 MW)
const BEG_SOLAR_MW = 6;
const AUSSCHREIBUNGSFREI_MW = 1;
// § 3 Nr. 15 EEG 2023: Kriterien der Bürgerenergiegesellschaft
const BEG = { mitglieder: 50, stimmrechteRegional: 0.75, umkreisKm: 50, maxStimmrecht: 0.1 };
// § 22b Abs. 5 EEG 2023: Sperrfrist für weitere geförderte Anlagen derselben Technologie
const BEG_SPERRE_JAHRE = 3;
// FA Wind und Solar, Umfrage Frühjahr 2026 (forsa, 1.001 Befragte, März 2026)
const FA_2026 = {
  wohnumfeld: 0.65, wichtig: 0.69, mitAnlagen: 0.65, ohneAnlagen: 0.68,
  mitAnlagen2025: 0.7, ohneAnlagen2025: 0.62, keineAgrarflaeche: 0.85, landschaftsbild: 0.71,
  kommuneProfitiert: 0.68, selbstProfitieren: 0.41, demoDagegen: 0.1, n: 1001,
};
// AEE-Akzeptanzumfrage 2025 (YouGov, 24.–27.10.2025, 1.044 Befragte ab 16 Jahren)
const AEE_2025 = { solarparkUmgebung: 0.58, mitVorerfahrung: 0.7, ausbauEE: 0.81, n: 1044 };
// BAFA-Förderprogramm Bürgerenergiegesellschaften (Wind an Land): Förderquote und Höchstbetrag
const BAFA = { quote: 0.7, max: 300000 };

/* ------------------------------------------------------------------ */
/* Beispiel: Bürgerenergiegesellschaft mit 6 MW in Ostdeutschland       */
/* ------------------------------------------------------------------ */

const REGION = REGIONEN.find((r) => r.id === "de-ost");
const KWP = BEG_SOLAR_MW * 1000;
const INVEST = KWP * (FREIFLAECHE.capexProKwp.mittel + FREIFLAECHE.entwicklungProKwp.min);
const EK_QUOTE = 1 - FINANZIERUNG.fremdkapitalQuote;
const EK = INVEST * EK_QUOTE;
const ANTEIL_EUR = 1000;
const ANTEILE = EK / ANTEIL_EUR;
const MWH = KWP * REGION.ertrag / 1000;
const P6 = (MWH * 1000 * KOMMUNE.beteiligungCt) / 100;
const HA = BEG_SOLAR_MW * FREIFLAECHE.haProMwp;

const artikel = {
  slug: "buergerenergie-solarpark-akzeptanz",
  title: "Bürgerenergie und Akzeptanz: Solarparks mit der Region planen",
  seoTitle: "Bürgerenergie & Akzeptanz Solarpark | ÖkoInvest",
  kurzTitel: "Bürgerenergie & Akzeptanz",
  description:
    "Bürgerenergie bei Solarparks: Bürgerenergiegesellschaft bis 6 MW ohne Ausschreibung, Beteiligungsmodelle, aktuelle Akzeptanzumfragen und ein Fahrplan.",
  excerpt:
    "Wie Bürgerinnen und Bürger an einem Solarpark beteiligt werden können, welche Vorteile das EEG Bürgerenergiegesellschaften gibt und was Umfragen über die Akzeptanz vor Ort wirklich sagen.",
  hauptKeyword: "bürgerenergie solarpark",
  keywords: [
    "Bürgerenergie Solarpark",
    "Bürgerenergiegesellschaft EEG",
    "Bürgerbeteiligung Solarpark",
    "Akzeptanz Solarpark Umfrage",
    "Energiegenossenschaft Solarpark",
    "Nachrangdarlehen Solarpark",
    "§ 22b EEG Bürgerenergie",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-10-03", // Rechtsstand nachgeprüft (Welle 1, Paket G)
  kategorie: "Strom, Markt & Gemeinschaft",
  bild: "/img/solarpark-baeume.jpg",
  bildAlt: "Reihen von Solarmodulen unter blauem Himmel, im Hintergrund grüne Laubbäume",
  badge: { wert: `bis ${BEG_SOLAR_MW} MW`, text: "ohne Ausschreibung für Bürgerenergiegesellschaften" },

  kurzFazit: [
    `**Bürgerenergiegesellschaften dürfen Freiflächen-Solarparks bis einschließlich ${BEG_SOLAR_MW} MW ohne Ausschreibung bauen und trotzdem die EEG-Förderung erhalten** (§ 22 Abs. 3, § 22b EEG) – alle anderen nur bis ${AUSSCHREIBUNGSFREI_MW} MW.`,
    `Voraussetzung sind mindestens **${BEG.mitglieder} natürliche Personen** als stimmberechtigte Mitglieder, davon ${fmtPct(BEG.stimmrechteRegional, 0)} der Stimmrechte aus dem Umkreis von ${BEG.umkreisKm} km, und kein Mitglied mit mehr als ${fmtPct(BEG.maxStimmrecht, 0)}.`,
    `Die Akzeptanz ist hoch: **${fmtPct(FA_2026.wohnumfeld, 0)} sind mit einem Solarpark im eigenen Wohnumfeld einverstanden** (FA Wind und Solar, Frühjahr 2026). Wichtiger als eigener Gewinn ist den Befragten, dass die Gemeinde profitiert.`,
    "Übliche Beteiligungsformen sind **Genossenschaft, Nachrangdarlehen, Kommanditbeteiligung und Bürgerstromtarif** – mit sehr unterschiedlichem Mitspracherecht, Risiko und Aufwand.",
    "Das BAFA-Förderprogramm für Bürgerenergiegesellschaften gilt nach aktuellem Stand **nur für Windenergie an Land**, nicht für Solarparks.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Was ist Bürgerenergie bei Solarparks?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Bürgerenergie bedeutet, dass Menschen aus der Region einen Solarpark mit besitzen, mitfinanzieren oder günstig Strom daraus beziehen – statt nur Nachbarn einer Anlage zu sein.** Rechtlich gibt es dafür im EEG die Bürgerenergiegesellschaft mit eigenen Vorteilen; wirtschaftlich reicht das Spektrum vom Genossenschaftsanteil bis zum regionalen Stromtarif.",
        },
        {
          typ: "p",
          text: `Für Projektentwickler ist Beteiligung kein Selbstzweck: Ohne [Bebauungsplan](/wissen/lexikon#bebauungsplan) gibt es keinen Solarpark, und über den entscheidet der Gemeinderat. Wo Bürger und Gemeinde sichtbar profitieren, fällt diese Entscheidung leichter. Die Zahlung an die Gemeinde nach § 6 EEG erklärt der Ratgeber [kommunale Beteiligung](/ratgeber/kommunale-beteiligung-6-eeg); hier geht es um die Beteiligung der Bürgerinnen und Bürger selbst.`,
        },
        {
          typ: "kennzahl",
          wert: `${BEG_SOLAR_MW} MW`,
          titel: "Grenze für Solarparks von Bürgerenergiegesellschaften ohne Ausschreibung",
          text: `Das entspricht bei fester Süd-Aufständerung rund ${fmt(HA, 1)} ha Fläche. Für alle übrigen Betreiber liegt die Grenze bei ${AUSSCHREIBUNGSFREI_MW} MW.`,
        },
      ],
    },
    {
      id: "buergerenergiegesellschaft",
      titel: "Bürgerenergiegesellschaft nach EEG: Voraussetzungen und Vorteile",
      tocLabel: "Bürgerenergiegesellschaft",
      bloecke: [
        {
          typ: "p",
          text: `**Eine [Bürgerenergiegesellschaft](/wissen/lexikon#buergerenergiegesellschaft) ist nach § 3 Nr. 15 EEG jede Genossenschaft oder sonstige Gesellschaft, die von vielen Menschen aus der Region getragen wird und in der kein einzelnes Mitglied dominiert.** Die Rechtsform ist frei; in der Praxis ist es meist eine eingetragene Genossenschaft oder eine GmbH & Co. KG.`,
        },
        {
          typ: "tabelle",
          caption: "Kriterien der Bürgerenergiegesellschaft nach § 3 Nr. 15 EEG 2023",
          kopf: ["Kriterium", "Anforderung"],
          zeilen: [
            ["Mitglieder", `mindestens **${BEG.mitglieder} natürliche Personen** als stimmberechtigte Mitglieder oder Anteilseigner`],
            ["Regionale Verankerung", `mindestens **${fmtPct(BEG.stimmrechteRegional, 0)} der Stimmrechte** bei natürlichen Personen, die in einem Postleitzahlgebiet ganz oder teilweise im Umkreis von ${BEG.umkreisKm} km um die Anlage gemeldet sind (bei Solar gemessen vom äußeren Rand der Anlage)`],
            ["Übrige Stimmrechte", "nur bei kleinen und mittleren Unternehmen (KMU) oder Kommunen und ihren Zusammenschlüssen"],
            ["Keine Dominanz", `kein Mitglied mit mehr als **${fmtPct(BEG.maxStimmrecht, 0)} der Stimmrechte**`],
            ["Sonderregeln Solar (§ 22b Abs. 2)", `u. a. Mitteilung an die Bundesnetzagentur; Gesellschaft und stimmberechtigte Mitglieder dürfen in den vorangegangenen ${BEG_SPERRE_JAHRE} Jahren keine weitere geförderte Solaranlage desselben Segments realisiert haben`],
          ],
          hervorheben: 1,
          minBreite: 620,
          fussnote: "Stand September 2026, vereinfachte Wiedergabe. Maßgeblich ist der Gesetzestext; Details der Nachweise regelt die Bundesnetzagentur.",
        },
        {
          typ: "p",
          text: `Der wichtigste Vorteil: Ein Solarpark bis ${BEG_SOLAR_MW} MW braucht keinen Zuschlag in der [EEG-Ausschreibung](/ratgeber/eeg-ausschreibung-freiflaeche). Die Gesellschaft spart Gebotsrisiko, Sicherheiten und Wartezeit und erhält den gesetzlich bestimmten anzulegenden Wert, der nach §§ 48 und 49 EEG vom Inbetriebnahmezeitpunkt abhängt. Die Kehrseite: Nach der Mitteilung darf die Gesellschaft ${BEG_SPERRE_JAHRE} Jahre lang keine Förderung für weitere Anlagen derselben Technologie in Anspruch nehmen. Auch bei einer Bürgerenergiegesellschaft muss die Fläche in der Förderkulisse liegen und der Strom ab 100 kW direkt vermarktet werden.`,
        },
        {
          typ: "p",
          text: `Größenordnung für ${BEG_SOLAR_MW} MWp in Ostdeutschland: Die Investition liegt nach unseren Marktannahmen bei rund ${fmtMio(INVEST)} inklusive Entwicklung, davon bei ${fmtPct(EK_QUOTE, 0)} Eigenkapital etwa ${fmtMio(EK)}. Mit Anteilen zu ${fmtEur(ANTEIL_EUR)} wären das rund ${fmt(Math.round(ANTEILE / 10) * 10)} Anteile – die Mindestzahl von ${BEG.mitglieder} Mitgliedern ist damit eher die leichtere Hürde. Die Standortgemeinde könnte zusätzlich rund ${fmtEur(P6)} im Jahr nach § 6 EEG erhalten.`,
        },
      ],
    },
    {
      id: "modelle",
      titel: "Beteiligungsmodelle im Vergleich",
      tocLabel: "Beteiligungsmodelle",
      bloecke: [
        {
          typ: "p",
          text: "**Welches Modell passt, hängt davon ab, ob Bürger mitentscheiden, nur mitverdienen oder vor allem günstigen Strom beziehen sollen.** Je mehr Mitsprache, desto höher der Organisationsaufwand; je höher die Zinsversprechen, desto genauer sollten Anleger das Risiko prüfen.",
        },
        {
          typ: "tabelle",
          caption: "Beteiligungsmodelle für Bürgerinnen und Bürger an Solarparks",
          kopf: ["Modell", "So funktioniert es", "Mitsprache", "Risiko für Anleger", "Aufwand"],
          zeilen: [
            ["**Energiegenossenschaft**", "Mitglieder zeichnen Geschäftsanteile; die Genossenschaft betreibt den Park oder beteiligt sich daran", "hoch: ein Mitglied, eine Stimme", "Verlust der Einlage möglich, Nachschusspflicht meist ausgeschlossen", "Gründung, Prüfungsverband, Gremien"],
            ["Nachrangdarlehen", "Bürger leihen der Projektgesellschaft Geld zu festem Zins und fester Laufzeit", "keine", "nachrangig hinter der Bank; im Krisenfall Totalverlust möglich", "gering bis mittel; Vorgaben des Vermögensanlagenrechts beachten"],
            ["Kommanditbeteiligung", "Bürger werden Kommanditisten der Betreiber-KG und erhalten Ausschüttungen", "eingeschränkt, nach Gesellschaftsvertrag", "Einlage haftet; unternehmerisches Risiko", "hoch: Prospekt- bzw. Aufsichtsrecht, Handelsregister"],
            ["Bürgerstromtarif", "vergünstigter Stromtarif für Anwohner, oft über einen Partner-Versorger", "keine", "kein Kapitalrisiko", "gering; Tarif muss dauerhaft angeboten werden"],
            ["Kommunale Mitbeteiligung", "Gemeinde oder Stadtwerk hält Anteile an der Projektgesellschaft", "über die Gemeinde", "trägt die Gemeinde", "Kommunalrecht, Beschlüsse"],
          ],
          minBreite: 820,
          fussnote: "Überblick ohne Anlageberatung. Für öffentliche Angebote von Vermögensanlagen gelten in Deutschland Prospekt- und Informationspflichten mit Ausnahmen; lassen Sie die Struktur rechtlich prüfen.",
        },
        {
          typ: "p",
          text: `Für Landwirte, die ihre Fläche einbringen, gibt es zusätzlich die Kombination aus Pacht und Mitgliedschaft in der Betreibergenossenschaft – etwa bei [Agri-PV](/agri-pv). Wie eine Beteiligung über eine Genossenschaft aussehen kann, zeigt die Seite [Genossenschaft](/genossenschaft). Die Grundbegriffe erklärt das Lexikon unter [Energiegenossenschaft](/wissen/lexikon#energiegenossenschaft).`,
        },
      ],
    },
    {
      id: "faires-angebot",
      titel: "Woran Sie ein faires Beteiligungsangebot erkennen",
      tocLabel: "Faires Angebot",
      bloecke: [
        {
          typ: "p",
          text: "**Ein faires Angebot richtet sich zuerst an die Menschen vor Ort, legt Risiken offen und ist so gestaltet, dass auch kleine Beträge möglich sind.** Ob Genossenschaft oder Darlehen: Die folgenden Punkte helfen Gemeinden und Bürgern bei der Einordnung.",
        },
        {
          typ: "checkliste",
          punkte: [
            "**Vorrang für die Region:** Zeichnungsfrist zuerst für Anwohner der Standortgemeinde und der Nachbarorte, erst danach offen für alle.",
            "**Niedrige Einstiegshürde:** Mindestbeträge, die sich auch Haushalte ohne großes Vermögen leisten können.",
            "**Klare Unterlagen:** Laufzeit, Zins oder Ausschüttungslogik, Rangfolge gegenüber der Bank, Kündigungsrechte und Kosten verständlich dargestellt.",
            "**Realistische Erträge:** Prognosen mit vorsichtigen Strompreisen, Ertragsminderungen und Szenarien – keine garantierten Renditen.",
            "**Transparenz im Betrieb:** jährlicher Bericht über Erzeugung, Erlöse und Zahlungen an die Gemeinde.",
            "**Verbindung zur Gemeinde:** Beteiligungsangebot und § 6-Zahlung gemeinsam kommuniziert, damit sichtbar wird, was im Ort bleibt.",
          ],
        },
      ],
    },
    {
      id: "akzeptanz",
      titel: "Was Umfragen über die Akzeptanz von Solarparks sagen",
      tocLabel: "Akzeptanzumfragen",
      bloecke: [
        {
          typ: "p",
          text: `**Solarparks haben in Deutschland eine stabile Mehrheit: Laut FA Wind und Solar sind ${fmtPct(FA_2026.wohnumfeld, 0)} der Befragten mit einem Solarpark im eigenen Wohnumfeld einverstanden, laut AEE ${fmtPct(AEE_2025.solarparkUmgebung, 0)} – bei Menschen mit Vorerfahrung ${fmtPct(AEE_2025.mitVorerfahrung, 0)}.** Ein ausgeprägtes „Nicht vor meiner Haustür“ ist in den Daten nicht erkennbar.`,
        },
        {
          typ: "tabelle",
          caption: "Aktuelle Akzeptanzumfragen zu Freiflächen-Solaranlagen",
          kopf: ["Aussage", "Wert", "Umfrage"],
          zeilen: [
            ["Einverstanden mit Solarpark im eigenen Wohnumfeld", `**${fmtPct(FA_2026.wohnumfeld, 0)}**`, "FA Wind und Solar / forsa, März 2026"],
            ["… davon Befragte mit bzw. ohne Solarpark im Wohnumfeld", `${fmtPct(FA_2026.mitAnlagen, 0)} / ${fmtPct(FA_2026.ohneAnlagen, 0)} (2025: ${fmtPct(FA_2026.mitAnlagen2025, 0)} / ${fmtPct(FA_2026.ohneAnlagen2025, 0)})`, "FA Wind und Solar / forsa"],
            ["Wichtig: keine landwirtschaftlichen Flächen verlieren", fmtPct(FA_2026.keineAgrarflaeche, 0), "FA Wind und Solar / forsa"],
            ["Wichtig: Landschaftsbild möglichst wenig beeinträchtigen", fmtPct(FA_2026.landschaftsbild, 0), "FA Wind und Solar / forsa"],
            ["Wichtig: Kommune profitiert finanziell", fmtPct(FA_2026.kommuneProfitiert, 0), "FA Wind und Solar / forsa"],
            ["Wichtig: selbst finanziell profitieren", fmtPct(FA_2026.selbstProfitieren, 0), "FA Wind und Solar / forsa"],
            ["Würden gegen einen Solarpark im Umfeld demonstrieren", fmtPct(FA_2026.demoDagegen, 0), "FA Wind und Solar / forsa"],
            ["Zustimmung zu Solarparks in der Umgebung (mit Vorerfahrung)", `${fmtPct(AEE_2025.solarparkUmgebung, 0)} (${fmtPct(AEE_2025.mitVorerfahrung, 0)})`, "AEE / YouGov, Oktober 2025"],
            ["Ausbau erneuerbarer Energien wichtig", fmtPct(AEE_2025.ausbauEE, 0), "AEE / YouGov, Oktober 2025"],
          ],
          hervorheben: 1,
          markierteZeile: 0,
          minBreite: 680,
          fussnote: `Stichproben: FA Wind und Solar ${fmt(FA_2026.n)} Befragte ab 18 Jahren (Fehlertoleranz rund ± 3 Prozentpunkte), AEE ${fmt(AEE_2025.n)} Befragte ab 16 Jahren. Unterschiedliche Frageformulierungen erklären die Abweichungen zwischen den Umfragen.`,
        },
        {
          typ: "p",
          text: "Zwei Befunde sind für die Praxis wichtiger als die Gesamtzustimmung. Erstens: Die Sorge um landwirtschaftliche Flächen und das Landschaftsbild steht weit vorn – Standortwahl, Eingrünung und Doppelnutzung wie Beweidung oder Agri-PV adressieren genau das. Zweitens: Dass die **Gemeinde** profitiert, ist deutlich mehr Menschen wichtig als ein eigener Gewinn. Transparente Zahlungen an die Gemeinde wirken also oft stärker als ein Renditeangebot an Einzelne.",
        },
      ],
    },
    {
      id: "fahrplan",
      titel: "Kommunikationsfahrplan: Wann Sie wen einbinden",
      tocLabel: "Kommunikationsfahrplan",
      bloecke: [
        {
          typ: "p",
          text: "**Akzeptanz entsteht, bevor der Gemeinderat abstimmt – nicht bei der Auslegung des Planentwurfs.** Bewährt hat sich ein Ablauf, der die formalen Schritte des Bauleitplanverfahrens mit eigenen Informationsangeboten verbindet.",
        },
        {
          typ: "ablauf",
          schritte: [
            ["Vor dem Aufstellungsbeschluss", "Gespräch mit Bürgermeister und Fraktionen, erste Visualisierung, Eckpunkte zu Fläche, Netzanschluss, Rückbau, § 6-Zahlung und Beteiligungsangebot – unterschrieben wird eine § 6-Vereinbarung erst nach dem Beschluss des Bebauungsplans (§ 6 Abs. 4 EEG), und keine Zusage darf an das Abstimmungsverhalten geknüpft sein. Hintergrund: [Aufstellungsbeschluss](/wissen/lexikon#aufstellungsbeschluss)."],
            ["Frühzeitige Beteiligung", "Informationsabend und Sprechstunden parallel zur [frühzeitigen Beteiligung](/wissen/lexikon#fruehzeitige-beteiligung) nach § 3 Abs. 1 BauGB; Fragen sammeln und öffentlich beantworten."],
            ["Gutachten offenlegen", "Ergebnisse zu Blendung, Abständen und Artenschutz verständlich aufbereiten – siehe [Abstand und Blendgutachten](/ratgeber/solarpark-abstand-wohnbebauung-blendgutachten) und [Artenschutz und Biodiversität](/ratgeber/solarpark-artenschutz-biodiversitaet)."],
            ["Beteiligungsmodell konkretisieren", "Genossenschaft, Darlehen oder Stromtarif mit klaren Konditionen anbieten, bevor der Satzungsbeschluss ansteht."],
            ["Bau und Betrieb", "Baustellenkommunikation, Tag der offenen Tür, jährlicher Bericht über Erzeugung, Zahlungen an die Gemeinde und Pflegemaßnahmen."],
          ],
        },
        {
          typ: "kasten",
          variant: "tipp",
          titel: "Häufige Fehler",
          text: "Information erst nach dem Aufstellungsbeschluss, Renditeversprechen ohne Risikohinweis, Beteiligung nur für Auswärtige, fehlende Ansprechperson vor Ort und Zusagen, die später nicht eingehalten werden. Wer Flächen anbietet, sollte die Gemeinde von Anfang an einbinden – der [Flächencheck](/flaechencheck) klärt vorab, ob eine Fläche überhaupt planbar ist.",
        },
      ],
    },
    {
      id: "foerderung",
      titel: "Förderung für Bürgerenergie: Was es gibt – und was nicht",
      tocLabel: "Förderung",
      bloecke: [
        {
          typ: "p",
          text: `**Das Bundesprogramm für Bürgerenergiegesellschaften beim BAFA fördert nach aktuellem Stand nur Windenergie an Land: bis zu ${fmtPct(BAFA.quote, 0)} der Planungs- und Genehmigungskosten, höchstens ${fmtEur(BAFA.max)} je Projekt.** Für Solarparks ist der wichtigste Vorteil der Bürgerenergiegesellschaft deshalb die Ausnahme von der Ausschreibung bis ${BEG_SOLAR_MW} MW.`,
        },
        {
          typ: "p",
          text: "Einzelne Länder unterstützen Bürgerenergie mit eigenen Programmen oder Beratungsangeboten der Landesenergieagenturen. Einige Landesgesetze zur Beteiligung behandeln Bürgerenergiegesellschaften zudem günstiger – Mecklenburg-Vorpommern nimmt sie etwa ganz von der Pflichtbeteiligung aus. Fragen Sie vor der Gründung bei der Energieagentur Ihres Landes nach dem aktuellen Stand.",
        },
      ],
    },
    {
      id: "dach",
      titel: "Österreich und Schweiz: Energiegemeinschaften statt Bürgerenergiegesellschaft",
      tocLabel: "Österreich & Schweiz",
      bloecke: [
        {
          typ: "p",
          text: "**In Österreich und der Schweiz läuft Bürgerbeteiligung vor allem über Energiegemeinschaften, in denen Strom lokal geteilt wird, und über klassische Genossenschaften.** Eine Ausnahme von Ausschreibungen wie in Deutschland gibt es dort in dieser Form nicht.",
        },
        {
          typ: "karten",
          cols: 2,
          items: [
            { titel: `Österreich: ${GEMEINSCHAFTEN.at.titel}`, text: `${GEMEINSCHAFTEN.at.text} Siehe [Erneuerbare-Energie-Gemeinschaft](/wissen/lexikon#eeg-gemeinschaft) und [Bürgerenergiegemeinschaft](/wissen/lexikon#buergerenergiegemeinschaft).` },
            { titel: `Schweiz: ${GEMEINSCHAFTEN.ch.titel}`, text: `${GEMEINSCHAFTEN.ch.text} Siehe [LEG](/wissen/lexikon#leg).` },
          ],
        },
        {
          typ: "p",
          text: `Für Solarparks bedeutet das: Anwohner können über eine Energiegemeinschaft Strom aus dem Park beziehen, wenn die Netzebene passt. Wie das in allen drei Ländern funktioniert, erklären der Ratgeber [Energy Sharing und Energiegemeinschaften](/ratgeber/energy-sharing-energiegemeinschaften) und die Seite [Energiegemeinschaften](/energiegemeinschaften). Stand der Angaben: ${STAND}.`,
        },
      ],
    },
  ],

  faq: [
    {
      q: "Was ist eine Bürgerenergiegesellschaft?",
      a: `Eine Genossenschaft oder Gesellschaft mit mindestens ${BEG.mitglieder} natürlichen Personen als stimmberechtigten Mitgliedern, bei der ${fmtPct(BEG.stimmrechteRegional, 0)} der Stimmrechte bei Menschen aus dem ${BEG.umkreisKm}-km-Umkreis liegen und niemand mehr als ${fmtPct(BEG.maxStimmrecht, 0)} hält (§ 3 Nr. 15 EEG).`,
    },
    {
      q: "Bis zu welcher Größe braucht ein Bürgersolarpark keine Ausschreibung?",
      a: `Bis einschließlich ${BEG_SOLAR_MW} MW, wenn eine Bürgerenergiegesellschaft die Anlage betreibt und die Voraussetzungen des § 22b EEG erfüllt. Für andere Betreiber liegt die Grenze bei ${AUSSCHREIBUNGSFREI_MW} MW.`,
    },
    {
      q: "Welche Beteiligungsform ist für Bürger am sichersten?",
      a: "Ohne Kapitalrisiko ist nur ein Bürgerstromtarif. Genossenschaftsanteile, Nachrangdarlehen und Kommanditbeteiligungen sind unternehmerische Beteiligungen, bei denen ein Verlust möglich ist. Prüfen Sie Laufzeit, Rangfolge und Informationsunterlagen.",
    },
    {
      q: "Wie hoch ist die Akzeptanz für Solarparks?",
      a: `In der Umfrage der FA Wind und Solar vom Frühjahr 2026 waren ${fmtPct(FA_2026.wohnumfeld, 0)} mit einem Solarpark im eigenen Wohnumfeld einverstanden, in der AEE-Umfrage 2025 ${fmtPct(AEE_2025.solarparkUmgebung, 0)}, bei Menschen mit Vorerfahrung ${fmtPct(AEE_2025.mitVorerfahrung, 0)}.`,
    },
    {
      q: "Gibt es eine Förderung für Bürgersolarparks?",
      a: "Das BAFA-Programm für Bürgerenergiegesellschaften gilt nach aktuellem Stand nur für Windenergie an Land. Für Solar ist der Vorteil die Befreiung von der Ausschreibung bis 6 MW; daneben gibt es teils Landesprogramme.",
    },
    {
      q: "Können sich auch Gemeinden an einer Bürgerenergiegesellschaft beteiligen?",
      a: `Ja. Stimmrechte, die nicht bei natürlichen Personen liegen, dürfen Kommunen und kleine und mittlere Unternehmen halten. Kein einzelnes Mitglied darf aber mehr als ${fmtPct(BEG.maxStimmrecht, 0)} der Stimmrechte haben. Mehr für Gemeinden unter [Kommunen](/kommunen).`,
    },
  ],

  passend: [
    { href: "/genossenschaft", titel: "Genossenschaft", text: "Beteiligung an Solarprojekten in der Region." },
    { href: "/energiegemeinschaften", titel: "Energiegemeinschaften", text: "Solarstrom gemeinsam nutzen in DE, AT und CH." },
    { href: "/ratgeber/kommunale-beteiligung-6-eeg", titel: "Kommunale Beteiligung § 6 EEG", text: "Was die Gemeinde erhält und wie der Vertrag aussieht." },
    { href: "/kommunen", titel: "Für Kommunen", text: "Planung, Beteiligung und Einnahmen im Überblick." },
    { href: "/rechner/beteiligung", titel: "Beteiligungsrechner", text: "Wie die Ausschüttung einer Energiegenossenschaft entsteht." },
    { href: "/rechner/kommune", titel: "Kommunal-Rechner", text: "Was ein Solarpark der Gemeinde pro Jahr bringt." },
  ],

  quellen: [
    { titel: "EEG 2023, § 3 – Begriffsbestimmungen (Nr. 15 Bürgerenergiegesellschaft)", url: "https://www.gesetze-im-internet.de/eeg_2014/__3.html", stand: "09/2026" },
    { titel: "EEG 2023, § 22 – Wettbewerbliche Ermittlung der Marktprämie (Abs. 3: Ausnahmen bis 1 MW bzw. 6 MW)", url: "https://www.gesetze-im-internet.de/eeg_2014/__22.html", stand: "09/2026" },
    { titel: "EEG 2023, § 22b – Bürgerenergiegesellschaften", url: "https://www.gesetze-im-internet.de/eeg_2014/__22b.html", stand: "09/2026" },
    { titel: "FA Wind und Solar – Umfrage zur Akzeptanz der Solarenergie Frühjahr 2026", url: "https://www.fachagentur-wind-solar.de/veroeffentlichungen/mediathek/detail/umfrage-zur-akzeptanz-der-solarenergie-fruehjahr-2026", stand: "09/2026" },
    { titel: "Agentur für Erneuerbare Energien – Akzeptanzumfrage 2025", url: "https://www.unendlich-viel-energie.de/themen/akzeptanz-erneuerbarer/akzeptanzumfrage-2025", stand: "09/2026" },
    { titel: "BAFA – Förderprogramm Bürgerenergiegesellschaften (Windenergie an Land)", url: "https://www.bafa.de/DE/Wirtschaft/Beratung_Finanzierung/Buergerenergiegesellschaften/buergerenergiegesellschaften_node.html", stand: "09/2026" },
    { titel: "FA Wind und Solar – Finanzielle Teilhabe bei PV-Freiflächenanlagen", url: "https://www.fachagentur-wind-solar.de/solar/finanzielle-teilhabe", stand: "09/2026" },
    { titel: "Österreichische Koordinationsstelle für Energiegemeinschaften – Rechtliche Grundlagen ElWG", url: "https://energiegemeinschaften.gv.at/rechtliche-grundlagen-elwg/", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Mitmachen statt zuschauen",
    text: "Wie Bürger und Landwirte sich an Solarparks beteiligen können.",
    href: "/genossenschaft",
    label: "Zur Genossenschaft",
  },
  cta: {
    title: "Solarpark mit Beteiligung vor Ort planen.",
    text: "Ob Gemeinde, Landwirt oder Bürgerin: Sprechen Sie uns an, wie Fläche, Planung und Beteiligung zusammenpassen.",
    primary: { label: "Für Kommunen", href: "/kommunen" },
    secondary: { label: "Genossenschaft", href: "/genossenschaft" },
  },
};

export default artikel;
