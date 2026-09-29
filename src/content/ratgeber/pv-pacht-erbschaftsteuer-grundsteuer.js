// Ratgeber: Erbschaft-/Schenkungsteuer und Grundsteuer bei verpachteten PV-Flächen
// Recherchestand 29.09.2026. Primärquellen: BewG §§ 158, 159, 265 (gesetze-im-internet.de),
// ErbStG §§ 13a, 16; gleich lautende Ländererlasse v. 15.07.2022 (BStBl I 2022 S. 1226) und
// v. 06.03.2024 (BStBl I 2024 S. 378); Art. 9 Abs. 3 BayGrStG; BDEW-Positionspapier 04.06.2026.
//
// WICHTIG (Recherchebefund): Das Jahressteuergesetz 2024 (BGBl. 2024 I Nr. 387) hat § 158 Abs. 2
// Satz 3 und 4 BewG eingefügt (Nutzungsüberlassung zur Erzeugung von Pflanzen und Tieren,
// Stückländereien; anwendbar auf Bewertungsstichtage nach dem 06.12.2024, § 265 Abs. 15 BewG).
// Eine Sonderregel für Flächen unter klassischen Freiflächen-PV-Anlagen enthält es nach unserer
// Recherche NICHT; der BDEW fordert eine solche Regelung im Juni 2026 weiterhin.
// Text bewusst vorsichtig – keine Steuerberatung, keine Gestaltungsversprechen.

import { PACHT, AGRI, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtPct } from "@/lib/rechner/annahmen";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
// ErbStG § 13a Abs. 1 und Abs. 10: Regelverschonung 85 %, Optionsverschonung 100 %.
const VERSCHONUNG = { regel: 0.85, option: 1.0, behaltensfristRegel: 5, behaltensfristOption: 7 };
// ErbStG § 16 Abs. 1 Nr. 2: persönlicher Freibetrag für Kinder.
const FREIBETRAG_KIND = 400000;

/* Rein illustratives Beispiel (fiktive Annahmen, kein Steuerbescheid) */
const HA = 10;
const BODENWERT_ANNAHME = 5; // €/m², frei angenommen – der tatsächliche Wert hängt vom Gutachterausschuss ab
const GRUNDBESITZWERT_BEISPIEL = HA * 10000 * BODENWERT_ANNAHME;
const PACHT_30_JAHRE = PACHT.freiflaecheProHa.mittel * HA * PACHT.laufzeit;

const artikel = {
  slug: "pv-pacht-erbschaftsteuer-grundsteuer",
  title: "PV-Pacht: Erbschaftsteuer und Grundsteuer bei Solarpark-Flächen",
  seoTitle: "PV-Pacht: Erbschaftsteuer & Grundsteuer | ÖkoInvest",
  kurzTitel: "Erbschaft- und Grundsteuer bei PV-Pacht",
  description:
    "Erbschaftsteuer und Grundsteuer bei verpachteten PV-Flächen: Warum Solarpark-Flächen zu Grundvermögen werden, was das JStG 2024 geändert hat und was nicht.",
  excerpt:
    "Wer Ackerland für einen Solarpark verpachtet, riskiert in Deutschland die erbschaftsteuerliche Verschonung und eine höhere Grundsteuer. Rechtsstand September 2026, Agri-PV-Ausnahme, Bayern-Sonderweg und Hinweise für Österreich und die Schweiz.",
  hauptKeyword: "pv pacht erbschaftsteuer",
  keywords: [
    "PV-Pacht Erbschaftsteuer",
    "Solarpark Fläche Erbschaftsteuer",
    "Freiflächen-PV Grundsteuer B",
    "Verpachtung Photovoltaik land- und forstwirtschaftliches Vermögen",
    "Jahressteuergesetz 2024 Photovoltaik Bewertungsgesetz",
    "Agri-PV Erbschaftsteuer",
    "Grundsteuer Solarpark Bayern",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Fläche & Pacht",
  bild: "/img/solarpark-baeume.jpg",
  bildAlt: "Photovoltaikmodule im Vordergrund, dahinter eine Baumreihe unter blauem Himmel",
  badge: { wert: "Grundvermögen", text: "statt Land- und Forstwirtschaft: die Folge klassischer PV-Pacht" },

  kurzFazit: [
    "**Flächen unter einer klassischen Freiflächen-PV-Anlage gelten nach Auffassung der Finanzverwaltung in Deutschland in der Regel als Grundvermögen**, nicht mehr als land- und forstwirtschaftliches Vermögen.",
    `Folge: Bewertung nach Bodenrichtwerten statt niedrigem Ertragswert, und die erbschaftsteuerliche **Verschonung von ${fmtPct(VERSCHONUNG.regel, 0)} bzw. ${fmtPct(VERSCHONUNG.option, 0)}** für land- und forstwirtschaftliches Vermögen greift für diese Flächen in der Regel nicht.`,
    "**Das Jahressteuergesetz 2024 hat daran für klassische Solarparks nach unserer Recherche nichts geändert.** Es hat § 158 Abs. 2 BewG ergänzt, betrifft aber die Überlassung zur landwirtschaftlichen Erzeugung. Verbände fordern im Juni 2026 weiter eine gesetzliche Lösung.",
    "**Agri-PV** der Kategorien I und II nach DIN SPEC 91434 bleibt nach den Ländererlassen vom 15.07.2022 land- und forstwirtschaftliches Vermögen – auch für die Grundsteuer.",
    "Bei der Grundsteuer droht außerhalb Bayerns der Wechsel von Grundsteuer A zu B. Lassen Sie die Folgen **vor Vertragsunterzeichnung** steuerlich prüfen.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Was passiert steuerlich, wenn ich Land für einen Solarpark verpachte?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Verpachten Sie in Deutschland Acker- oder Grünland für eine klassische Freiflächen-Photovoltaikanlage, wird die Fläche nach Auffassung der Finanzverwaltung in der Regel dem Grundvermögen zugerechnet.** Die Nutzung ist dann nicht mehr land- und forstwirtschaftlich, sondern Energieerzeugung. Das hat Folgen für drei Steuern: die Erbschaft- und Schenkungsteuer, die Grundsteuer und – wenn die Fläche zu einem Betrieb gehört – unter Umständen auch die Einkommensteuer.",
        },
        {
          typ: "p",
          text: `Für die Erbschaft- und Schenkungsteuer ist das besonders wichtig. Land- und forstwirtschaftliches Vermögen wird mit vergleichsweise niedrigen Ertragswerten angesetzt und kann bei der Hofübergabe zu ${fmtPct(VERSCHONUNG.regel, 0)} oder sogar ${fmtPct(VERSCHONUNG.option, 0)} steuerfrei bleiben. Grundvermögen wird dagegen mit dem Bodenwert angesetzt und ist nicht begünstigt. Der Branchenverband BDEW weist im Juni 2026 darauf hin, dass die Steuerlast im Erbfall im ungünstigen Fall **höher sein kann als die gesamten Pachteinnahmen** über die Laufzeit eines Solarparks.`,
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Keine Steuerberatung",
          text: "Dieser Ratgeber beschreibt die allgemeine Rechtslage nach unserem Recherchestand September 2026. Ob und in welcher Höhe Steuern entstehen, hängt von Ihrem Betrieb, der Nachfolgeplanung, dem Bundesland und dem Vertrag ab. Bitte lassen Sie Ihren Fall vor der Unterschrift unter einen Pachtvertrag von einer Steuerberatung mit Erfahrung in Land- und Forstwirtschaft prüfen.",
        },
      ],
    },
    {
      id: "hintergrund",
      titel: "Warum die Fläche zu Grundvermögen wird",
      tocLabel: "Hintergrund",
      bloecke: [
        {
          typ: "p",
          text: "**Entscheidend ist, dass die Fläche einem Betrieb der Land- und Forstwirtschaft „dauernd zu dienen bestimmt“ ist.** Das Bewertungsgesetz (§§ 158 ff. BewG) grenzt land- und forstwirtschaftliches Vermögen nach der tatsächlichen Nutzung ab. Nach § 159 Abs. 1 BewG sind Flächen dem Grundvermögen zuzurechnen, wenn anzunehmen ist, dass sie in absehbarer Zeit anderen als land- und forstwirtschaftlichen Zwecken dienen werden. Eine Fläche, die 30 Jahre eingezäunt Strom erzeugt, erfüllt das nach Verwaltungsauffassung nicht mehr.",
        },
        {
          typ: "p",
          text: "Die Länder haben das in **gleich lautenden Erlassen vom 15. Juli 2022** (BStBl I 2022 S. 1226) festgehalten: Flächen mit Freiflächen-PV gehören zum Grundvermögen; maßgeblich ist die gesamte Fläche, die dem Betrieb der Anlage dient. Die Anlage selbst ist als Betriebsvorrichtung nicht Teil des Grundstückswerts. Ergänzend regeln **gleich lautende Erlasse vom 6. März 2024** (BStBl I 2024 S. 378) die Bewertung von Flächen mit Windkraft- und Freiflächen-PV-Anlagen: vorrangig über Bodenrichtwerte für die entsprechende Nutzung, hilfsweise über andere Daten der Gutachterausschüsse oder kapitalisierte Nutzungsentgelte.",
        },
        {
          typ: "tabelle",
          caption: `Land- und forstwirtschaftliches Vermögen und Grundvermögen im Vergleich, Stand ${STAND}`,
          kopf: ["", "Land- und forstwirtschaftliches Vermögen", "Grundvermögen (klassische PV-Pacht)"],
          zeilen: [
            ["Bewertung", "Ertragswert bzw. Mindestwert (§§ 163, 164 BewG), meist niedrig", "Bodenwert nach Bodenrichtwerten bzw. Ersatzverfahren, oft ein Vielfaches"],
            ["Erbschaft- / Schenkungsteuer", `Verschonung ${fmtPct(VERSCHONUNG.regel, 0)} (Regel) oder ${fmtPct(VERSCHONUNG.option, 0)} (Option) nach §§ 13a, 13b ErbStG möglich`, "keine Verschonung für land- und forstwirtschaftliches Vermögen; nur persönliche Freibeträge"],
            ["Behaltensfrist", `${VERSCHONUNG.behaltensfristRegel} bzw. ${VERSCHONUNG.behaltensfristOption} Jahre – Verstöße können zur Nachversteuerung führen`, "–"],
            ["Grundsteuer (Bundesmodell)", "Grundsteuer A", "Grundsteuer B (unbebautes Grundstück)"],
          ],
          hervorheben: 2,
          minBreite: 720,
          fussnote: "Vereinfachte Darstellung. Ob die Verschonung im Einzelfall greift, hängt von weiteren Voraussetzungen ab (u. a. Lohnsumme, Verwaltungsvermögen, Behaltensfrist).",
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Achtung Behaltensfrist nach einer Hofübergabe",
          text: `Wurde ein Betrieb in den letzten ${VERSCHONUNG.behaltensfristRegel} bzw. ${VERSCHONUNG.behaltensfristOption} Jahren verschont übertragen, ist besondere Vorsicht geboten: Nach § 13a Abs. 6 Nr. 2 ErbStG entfällt der Verschonungsabschlag, soweit land- und forstwirtschaftliches Vermögen einem Betrieb „nicht mehr dauernd zu dienen bestimmt ist“. Eine PV-Verpachtung innerhalb der Frist kann deshalb eine (zeitanteilige) Nachversteuerung auslösen. Das sollte vor jeder Zusage geprüft werden.`,
        },
      ],
    },
    {
      id: "jstg-2024",
      titel: "Was das Jahressteuergesetz 2024 geändert hat – und was nicht",
      tocLabel: "JStG 2024",
      bloecke: [
        {
          typ: "p",
          text: "**Das Jahressteuergesetz 2024 hat die Lage für klassische Freiflächen-PV nach unserer Recherche nicht entschärft.** In Veröffentlichungen ist gelegentlich zu lesen, verpachtete PV-Flächen blieben seit dem JStG 2024 land- und forstwirtschaftliches Vermögen. Das deckt sich nicht mit dem Gesetzestext.",
        },
        {
          typ: "p",
          text: "Mit Artikel 35 des Gesetzes vom 2. Dezember 2024 (BGBl. 2024 I Nr. 387) wurden in **§ 158 Abs. 2 BewG die Sätze 3 und 4** eingefügt. Satz 3 bestimmt: Wird ein Betrieb oder werden Teile davon einem anderen „zur Erzeugung von Pflanzen und Tieren sowie zur Verwertung der dadurch selbst gewonnenen Erzeugnisse überlassen“, gilt das als Fortsetzung der land- und forstwirtschaftlichen Tätigkeit des Überlassenden. Satz 4 stellt klar, dass auch einzelne Flächen ohne eigene Gebäude oder Betriebsmittel (sogenannte Stückländereien) einen Betrieb bilden können. Beides gilt nach **§ 265 Abs. 15 BewG** für Bewertungsstichtage nach dem 6. Dezember 2024.",
        },
        {
          typ: "p",
          text: "Die Neuregelung hilft also Eigentümern, die Flächen **an andere Landwirte** verpachten. Eine Verpachtung an einen Solarparkbetreiber dient aber nicht der Erzeugung von Pflanzen und Tieren. Eine eigene Regel für PV-Flächen enthält das Gesetz nicht. Der BDEW hat am 4. Juni 2026 eine gesetzliche Neuregelung im Bewertungsgesetz gefordert, etwa einen pauschalen Bewertungsabschlag für befristete PV-Nutzungen – ein Hinweis darauf, dass das Problem fortbesteht. Ob und wann der Gesetzgeber reagiert, ist offen.",
        },
        {
          typ: "kasten",
          variant: "info",
          titel: "Beobachten Sie die Rechtsentwicklung",
          text: "Die Diskussion ist in Bewegung, und Finanzgerichte entscheiden Einzelfälle zur Abgrenzung land- und forstwirtschaftlicher Nutzung laufend neu. Bevor Sie sich auf eine bestimmte Rechtslage verlassen, sollte Ihre Steuerberatung den aktuellen Stand prüfen. Wir aktualisieren diesen Artikel, sobald sich die Rechtslage ändert.",
        },
      ],
    },
    {
      id: "agri-pv",
      titel: "Die Ausnahme: Agri-PV bleibt Landwirtschaft",
      tocLabel: "Ausnahme Agri-PV",
      bloecke: [
        {
          typ: "p",
          text: `**Flächen mit [Agri-PV](/agri-pv) der Kategorien I oder II nach [DIN SPEC 91434](/wissen/lexikon#din-spec-91434) bleiben nach den gleich lautenden Ländererlassen vom 15. Juli 2022 land- und forstwirtschaftliches Vermögen** – für Erbschaft-, Schenkung- und Grundsteuer. Voraussetzung ist, dass die landwirtschaftliche Nutzung prägend bleibt; die DIN SPEC begrenzt den Flächenverlust durch Aufbauten auf ${fmtPct(AGRI.flaechenverlustMaxKat1, 0)} (Kategorie I) bzw. ${fmtPct(AGRI.flaechenverlustMaxKat2, 0)} (Kategorie II) und verlangt mindestens ${fmtPct(AGRI.mindestErtrag, 0)} des Referenzertrags.`,
        },
        {
          typ: "p",
          text: `Dafür ist die Pacht bei Agri-PV niedriger – typischerweise ${fmt(PACHT.agriProHa.min)}–${fmt(PACHT.agriProHa.max)} € je Hektar statt ${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} € bei klassischer Freifläche –, weil die Bewirtschaftung weiterläuft. Ob sich das für Sie rechnet, zeigen der [Agri-PV-Rechner](/rechner/agri-pv) und die Ratgeber [Agri-PV nach DIN SPEC 91434](/ratgeber/agri-pv-din-spec-91434) und [Agri-PV-Wirtschaftlichkeit](/ratgeber/agri-pv-wirtschaftlichkeit).`,
        },
      ],
    },
    {
      id: "beispiel",
      titel: "Illustration: Wie groß kann der Unterschied sein?",
      tocLabel: "Illustration",
      bloecke: [
        {
          typ: "p",
          text: `**Die Größenordnung hängt fast vollständig vom angesetzten Bodenwert ab – und der ist regional sehr unterschiedlich.** Zur Veranschaulichung eine rein fiktive Annahme: Setzt der Gutachterausschuss für PV-Flächen ${fmt(BODENWERT_ANNAHME)} € je m² an, ergibt sich für ${HA} Hektar ein Grundbesitzwert von **${fmtEur(GRUNDBESITZWERT_BEISPIEL)}**. Als land- und forstwirtschaftliches Vermögen läge der Wert derselben Fläche in aller Regel nur bei einem Bruchteil davon, und er könnte zusätzlich verschont sein.`,
        },
        {
          typ: "p",
          text: `Ob daraus tatsächlich Steuer entsteht, hängt von den persönlichen Freibeträgen (für Kinder ${fmtEur(FREIBETRAG_KIND)} nach § 16 ErbStG, alle zehn Jahre), vom übrigen Vermögen und von der Steuerklasse ab. Zum Vergleich: Die Pacht für dieselbe Fläche summiert sich bei ${fmt(PACHT.freiflaecheProHa.mittel)} € je Hektar über ${PACHT.laufzeit} Jahre nominal und ohne Indexierung auf rund ${fmtEur(PACHT_30_JAHRE)} – vor Einkommensteuer. Die Zahlen sind kein Rechenmodell für Ihren Fall, sondern zeigen, warum die Frage vor Vertragsabschluss geklärt werden muss.`,
        },
      ],
    },
    {
      id: "grundsteuer",
      titel: "Grundsteuer: Grundsteuer A oder B?",
      tocLabel: "Grundsteuer",
      bloecke: [
        {
          typ: "p",
          text: "**Seit der Grundsteuerreform (Zahlung nach neuen Werten ab 1. Januar 2025) werden Flächen unter klassischer Freiflächen-PV in den meisten Ländern als Grundvermögen mit Grundsteuer B belastet, Agri-PV-Flächen bleiben bei Grundsteuer A.** Die Grundsteuer B für eine unbebaute Fläche kann je nach Bodenwert, Landesmodell und Hebesatz deutlich höher sein als die Grundsteuer A; Praktiker sprechen von Mehrbelastungen von mehreren hundert Euro je Hektar und Jahr.",
        },
        {
          typ: "tabelle",
          caption: `Grundsteuerliche Einordnung von PV-Flächen in Deutschland, Stand ${STAND}`,
          kopf: ["Fall", "Grundsteuer", "Grundlage"],
          zeilen: [
            ["Acker verpachtet an Landwirt", "A", "land- und forstwirtschaftliches Vermögen"],
            ["Klassische Freiflächen-PV (Bundesmodell und meisten Landesmodelle)", "**B**", "Grundvermögen, gleich lautende Erlasse v. 15.07.2022"],
            ["Agri-PV Kategorie I/II nach DIN SPEC 91434", "A", "gleich lautende Erlasse v. 15.07.2022"],
            ["Freiflächen-PV in Bayern auf zuvor landwirtschaftlich genutzter Fläche", "**A**", "Art. 9 Abs. 3 BayGrStG, wenn nach dem Rückbau wieder landwirtschaftliche Nutzung vorgesehen ist"],
          ],
          minBreite: 680,
          fussnote: "Bayern hat die Regel mit Gesetz vom 23.12.2022 eingeführt, rückwirkend auf den Hauptveranlagungszeitpunkt 1. Januar 2022. Sie gilt nur für die Grundsteuer, nicht für die Erbschaftsteuer. Die anderen Länder mit eigenem Grundsteuermodell (u. a. Baden-Württemberg, Hamburg, Hessen, Niedersachsen) können im Detail abweichen.",
        },
        {
          typ: "p",
          text: "Schuldner der Grundsteuer bleibt der Eigentümer. Ob der Betreiber die Mehrbelastung übernimmt, ist Verhandlungssache – eine entsprechende Klausel gehört in jeden [Pachtvertrag für einen Solarpark](/ratgeber/pachtvertrag-solarpark).",
        },
      ],
    },
    {
      id: "oesterreich-schweiz",
      titel: "Österreich und Schweiz: kurze Einordnung",
      tocLabel: "Österreich & Schweiz",
      bloecke: [
        {
          typ: "p",
          text: "**In Österreich gibt es seit 2008 keine Erbschafts- und Schenkungssteuer mehr – relevant sind vor allem Einheitswert, Grundsteuer und Grunderwerbsteuer.** Nach Auffassung der Finanzverwaltung scheiden Flächen, die an einen PV-Betreiber verpachtet werden, in der Regel aus dem land- und forstwirtschaftlichen Vermögen aus und werden als Grundvermögen bewertet. Das kann die Grundsteuer erhöhen und bei einer späteren Übergabe zu einer höheren Grunderwerbsteuer führen, weil Grundvermögen nicht mehr mit dem begünstigten Einheitswert angesetzt wird. Die Landwirtschaftskammern nennen Ausnahmen für Konzepte mit fortgesetzter landwirtschaftlicher Nutzung; Details sind im Einzelfall mit der Kammer oder Steuerberatung zu klären. Weitere Hinweise im Ratgeber [Freiflächen-PV in Österreich](/ratgeber/freiflaechen-pv-oesterreich).",
        },
        {
          typ: "p",
          text: "**In der Schweiz sind Erbschafts- und Schenkungssteuern Sache der Kantone.** Direkte Nachkommen sind nach der Übersicht der Eidgenössischen Steuerverwaltung in den meisten Kantonen befreit, Ehegatten in allen. Für landwirtschaftliche Grundstücke gelten zudem besondere Regeln des bäuerlichen Bodenrechts. Da klassische Solarparks auf Landwirtschaftsland in der Schweiz selten sind, empfehlen wir hier ausdrücklich eine kantonale Steuer- und Rechtsberatung. Mehr unter [Freiflächen-PV in der Schweiz](/ratgeber/freiflaechen-pv-schweiz).",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So gehen Sie vor",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "p",
          text: "**Die wichtigste Regel: Klären Sie die steuerlichen Folgen, bevor Sie einen Pachtvertrag oder eine Absichtserklärung unterschreiben.** Nachträglich lassen sich viele Dinge nicht mehr ändern.",
        },
        {
          typ: "ablauf",
          schritte: [
            ["Ausgangslage klären", "Gehört die Fläche zu einem land- und forstwirtschaftlichen Betrieb? Gab es in den letzten Jahren eine Übergabe mit Verschonung? Ist eine Nachfolge geplant?"],
            ["Steuerberatung einbinden", "Mit einer auf Land- und Forstwirtschaft spezialisierten Steuerberatung Erbschaft-, Grund- und Einkommensteuer für Ihren Fall durchrechnen lassen."],
            ["Alternativen prüfen", "Kommt [Agri-PV](/agri-pv) infrage? Welche Pacht und welcher Aufwand stehen dem gegenüber? Hinweise für Betriebe unter [Landwirte](/landwirte)."],
            ["Vertrag verhandeln", "Regelung zur Grundsteuer und ggf. zum Ausgleich steuerlicher Mehrbelastungen in den Vertrag aufnehmen; Vertrag anwaltlich prüfen lassen."],
            ["Rechtslage beobachten", "Die Diskussion um eine gesetzliche Lösung läuft. Lassen Sie den Stand vor der Unterschrift und bei einer späteren Übergabe erneut prüfen."],
          ],
        },
        {
          typ: "tool",
          href: "/rechner/pacht",
          titel: "Pacht und Steuerfrage ins Verhältnis setzen",
          text: "Der Pachtrechner zeigt, welche Einnahmen über die Laufzeit zu erwarten sind – als Grundlage für das Gespräch mit Ihrer Steuerberatung.",
          label: "Zum Pachtrechner",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Fällt Erbschaftsteuer an, wenn ich eine Solarpark-Fläche vererbe?",
      a: "Möglich. Die Fläche gilt in der Regel als Grundvermögen, wird mit dem Bodenwert angesetzt und ist nicht wie land- und forstwirtschaftliches Vermögen verschont. Ob tatsächlich Steuer entsteht, hängt von Freibeträgen, übrigem Vermögen und Steuerklasse ab – das muss eine Steuerberatung im Einzelfall berechnen.",
    },
    {
      q: "Hat das Jahressteuergesetz 2024 das Problem gelöst?",
      a: "Nach unserer Recherche nicht für klassische Freiflächen-PV. Das JStG 2024 hat § 158 Abs. 2 BewG um die Überlassung zur Erzeugung von Pflanzen und Tieren sowie um Stückländereien ergänzt. Eine Sonderregel für PV-Flächen fehlt; Verbände fordern sie im Jahr 2026 weiterhin.",
    },
    {
      q: "Ist Agri-PV steuerlich besser gestellt?",
      a: "Ja. Agri-PV der Kategorien I und II nach DIN SPEC 91434 bleibt nach den Ländererlassen vom 15. Juli 2022 land- und forstwirtschaftliches Vermögen – für Erbschaft-, Schenkung- und Grundsteuer. Dafür ist die Pacht meist niedriger. Mehr unter [Agri-PV](/agri-pv).",
    },
    {
      q: "Muss ich für eine Solarpark-Fläche Grundsteuer B zahlen?",
      a: "In den meisten Bundesländern ja, weil die Fläche Grundvermögen wird. In Bayern bleibt es nach Art. 9 Abs. 3 BayGrStG bei Grundsteuer A, wenn die Fläche vorher landwirtschaftlich genutzt wurde und danach wieder genutzt werden soll. Wer die Mehrbelastung trägt, regelt der Pachtvertrag.",
    },
    {
      q: "Was passiert, wenn ich kurz nach einer Hofübergabe verpachte?",
      a: `Dann ist Vorsicht geboten: Innerhalb der Behaltensfrist von ${VERSCHONUNG.behaltensfristRegel} bzw. ${VERSCHONUNG.behaltensfristOption} Jahren kann die Verpachtung für einen Solarpark nach § 13a Abs. 6 ErbStG zu einer Nachversteuerung führen. Lassen Sie das unbedingt vorher prüfen.`,
    },
    {
      q: "Gibt es in Österreich eine Erbschaftssteuer auf PV-Flächen?",
      a: "Nein, die Erbschafts- und Schenkungssteuer wurde 2008 abgeschafft. Die Umstufung zu Grundvermögen kann aber die Grundsteuer und bei einer Übergabe die Grunderwerbsteuer erhöhen. Die Landwirtschaftskammern beraten dazu.",
    },
  ],

  passend: [
    { href: "/ratgeber/pachtvertrag-solarpark", titel: "Pachtvertrag Solarpark", text: "Klauseln, Grundbuch, Rückbau und Checkliste." },
    { href: "/ratgeber/solarpark-pacht-pro-hektar", titel: "Pacht pro Hektar für Solarparks", text: "Spannen und Rechnung über 30 Jahre." },
    { href: "/ratgeber/agri-pv-din-spec-91434", titel: "Agri-PV nach DIN SPEC 91434", text: "Die Voraussetzungen für die steuerliche Ausnahme." },
    { href: "/landwirte", titel: "Für Landwirte", text: "Verpachten, selbst investieren oder beteiligen." },
  ],

  quellen: [
    { titel: "Bewertungsgesetz § 158 – Begriff des land- und forstwirtschaftlichen Vermögens", url: "https://www.gesetze-im-internet.de/bewg/__158.html", stand: "09/2026" },
    { titel: "Eidgenössische Steuerverwaltung – Erbschafts- und Schenkungssteuern (Stand der Gesetzgebung 1. Januar 2025)", url: "https://www.estv2.admin.ch/stp/ds/d-erbschaft-schenkung-de.pdf", stand: "09/2026" },
    { titel: "Bewertungsgesetz § 265 – Anwendungsvorschriften (Abs. 15 zu JStG 2024)", url: "https://www.gesetze-im-internet.de/bewg/__265.html", stand: "09/2026" },
    { titel: "ErbStG § 13a – Steuerbefreiung für Betriebsvermögen, land- und forstwirtschaftliches Vermögen", url: "https://www.gesetze-im-internet.de/erbstg_1974/__13a.html", stand: "09/2026" },
    { titel: "NWB – Gleich lautende Erlasse der obersten Finanzbehörden der Länder v. 15.07.2022 (BStBl I 2022 S. 1226), Fotovoltaikanlagen", url: "https://datenbank.nwb.de/Dokument/998557/", stand: "09/2026" },
    { titel: "NWB – Gleich lautende Erlasse v. 06.03.2024 (BStBl I 2024 S. 378), Flächen mit Windkraft- und Freiflächen-PV", url: "https://datenbank.nwb.de/Dokument/1042763/", stand: "09/2026" },
    { titel: "BDEW – Erbschaftsteuer bei Photovoltaik (Positionspapier 04.06.2026)", url: "https://www.bdew.de/service/erbschaftsteuer-bei-photovoltaik/", stand: "09/2026" },
    { titel: "Landwirtschaftskammer Kärnten – PV auf Freiflächen: Steuerbombe bei Planung vermeiden", url: "https://ktn.lko.at/pv-auf-freifl%C3%A4chen-steuerbombe-bei-planung-vermeiden+2400+4265377", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Ist Ihre Fläche geeignet?",
    text: "Klären Sie Lage und Netzanschluss – parallel zur steuerlichen Prüfung.",
    href: "/flaechencheck",
    label: "Zum Flächencheck",
  },
  cta: {
    title: "Klassische Freifläche oder Agri-PV?",
    text: "Wir prüfen Ihre Fläche kostenfrei und zeigen, welche Nutzungsform in Frage kommt. Die steuerliche Bewertung übernimmt Ihre Steuerberatung – wir liefern die Projektdaten dafür.",
    primary: { label: "Zum Flächencheck", href: "/flaechencheck" },
    secondary: { label: "Agri-PV rechnen", href: "/rechner/agri-pv" },
  },
};

export default artikel;
