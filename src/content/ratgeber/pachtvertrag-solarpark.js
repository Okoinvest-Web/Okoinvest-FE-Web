// Ratgeber: Pachtvertrag Solarpark – wichtige Klauseln, Dienstbarkeit, Rückbau, Checkliste
// Recherchestand 29.09.2026 (BGB §§ 550, 581, 1090; BauGB § 35 Abs. 5; ABGB §§ 472, 481;
// LK Oberösterreich Vertragscheckliste 06/2026). Zahlen aus src/lib/invest/markt.js.
// Keine Rechtsberatung – Text bewusst vorsichtig formuliert.

import { PACHT, FREIFLAECHE, PHASEN, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtPct } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

const HA = 10;
const MWP = HA / FREIFLAECHE.haProMwp;
const RUECKBAU = MWP * 1000 * FREIFLAECHE.rueckbauProKwp;
const MONATE_BIS_BAU = PHASEN[0].monateBisRtb;
const eurHa = (n) => `${fmt(n)} €/ha`;

const artikel = {
  slug: "pachtvertrag-solarpark",
  title: "Pachtvertrag Solarpark: Die wichtigsten Klauseln für Eigentümer",
  seoTitle: "Pachtvertrag Solarpark: Klauseln & Checkliste | ÖkoInvest",
  kurzTitel: "Pachtvertrag Solarpark",
  description:
    "Pachtvertrag Solarpark: Laufzeit, Rücktrittsrechte, Dienstbarkeit, Eintrittsrecht der Bank, Rückbaubürgschaft und Haftung – mit Checkliste für Eigentümer.",
  excerpt:
    "Ein Solarpark bindet Ihre Fläche für eine Generation. Welche Klauseln wirklich zählen, wie die Absicherung im Grundbuch funktioniert und woran Sie einseitige Verträge erkennen.",
  hauptKeyword: "pachtvertrag solarpark",
  keywords: [
    "Pachtvertrag Solarpark",
    "Pachtvertrag Freiflächen-PV",
    "Nutzungsvertrag Photovoltaik Fläche",
    "Dienstbarkeit Solarpark Grundbuch",
    "Rückbaubürgschaft Solarpark",
    "Eintrittsrecht Bank Solarpark",
    "Checkliste Pachtvertrag Photovoltaik",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Fläche & Pacht",
  bild: "/img/planer-tablet.jpg",
  bildAlt: "Ingenieur mit weißem Schutzhelm prüft Unterlagen auf einem Tablet vor den Modulreihen eines Solarparks",
  badge: { wert: `${PACHT.laufzeit} Jahre`, text: `übliche Grundlaufzeit, plus ${PACHT.verlaengerung}` },

  kurzFazit: [
    `**Ein Solarpark-Pachtvertrag läuft in der Regel ${PACHT.laufzeit} Jahre ab Inbetriebnahme** plus Verlängerungsoptionen (häufig ${PACHT.verlaengerung}) – mit Planungsphase und Rückbau ist die Fläche oft 35 Jahre und länger gebunden.`,
    "Die Finanzierung verlangt fast immer eine **beschränkte persönliche Dienstbarkeit im Grundbuch** (DE) bzw. eine eingetragene Servitut (AT) – oft zusätzlich zugunsten der finanzierenden Bank und mit Rangrücktritt bestehender Grundschulden.",
    `Kernpunkte für Eigentümer: **bezahlte Reservierungsphase, klare Rücktrittsfristen, Wertsicherung der Pacht und eine Rückbausicherheit** – im Beispiel für 10 ha rund ${fmtEur(Math.round(RUECKBAU / 10000) * 10000)}.`,
    "Einseitige Rücktrittsrechte, fehlende Sicherheiten und frei übertragbare Verträge sind die häufigsten Schwachstellen.",
    "Lassen Sie den Vertrag vor der Unterschrift von Anwalt oder Notar und die steuerlichen Folgen von Steuerberatung prüfen.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Worauf kommt es beim Pachtvertrag für einen Solarpark an?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Ein guter Solarpark-Pachtvertrag verteilt die Risiken der langen Planungs-, Betriebs- und Rückbauphase fair zwischen Eigentümer und Betreiber – und macht die Absicherung für die finanzierende Bank möglich, ohne den Eigentümer zu überfordern.** Die Pachthöhe ist wichtig, aber sie ist nur eine von rund einem Dutzend Stellschrauben. Häufig entscheiden Details wie Reservierungsentgelt, Rücktrittsfristen oder die Rückbausicherheit darüber, ob ein Vertrag gut oder schlecht ist.",
        },
        {
          typ: "p",
          text: `Die Vertragsbezeichnungen variieren: Nutzungsvertrag, Gestattungsvertrag, Pachtvertrag. Rechtlich handelt es sich in Deutschland meist um einen Pacht- oder Mietvertrag nach BGB, in der Regel aber **nicht um einen Landpachtvertrag**, weil die Fläche nicht mehr landwirtschaftlich genutzt wird. Welche Pacht marktüblich ist, zeigt der Ratgeber [Pacht pro Hektar für Solarparks](/wissen/ratgeber/solarpark-pacht-pro-hektar); die übliche Spanne liegt derzeit bei ${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} € je Hektar und Jahr.`,
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Kein Ersatz für Rechtsberatung",
          text: "Dieser Ratgeber erklärt typische Klauseln und Fragen, er ersetzt keine Prüfung Ihres konkreten Vertrags. Wegen der langen Laufzeit, der Grundbucheintragung und der steuerlichen Wirkung empfehlen wir dringend, einen im Energierecht erfahrenen Anwalt oder Notar und eine Steuerberatung einzubinden. Landwirtschaftskammern und Bauernverbände bieten teils Musterverträge und Beratung an.",
        },
      ],
    },
    {
      id: "laufzeit",
      titel: "Laufzeit, Pachtbeginn und Reservierungsphase",
      tocLabel: "Laufzeit & Pachtbeginn",
      bloecke: [
        {
          typ: "p",
          text: `**Ein Solarpark-Vertrag hat in der Regel drei Phasen: Planung (Reservierung), Betrieb und Rückbau.** Zwischen Unterschrift und Baubeginn liegen bei einer reinen Flächensicherung erfahrungsgemäß ${fmt(MONATE_BIS_BAU / 12, 1)} Jahre und mehr – für Bebauungsplan, [Netzanschlusszusage](/wissen/lexikon#netzanschlusszusage), Ausschreibung und Finanzierung. Die Betriebsphase läuft meist ${PACHT.laufzeit} Jahre ab Inbetriebnahme, häufig mit Verlängerungsoptionen des Betreibers.`,
        },
        {
          typ: "tabelle",
          caption: "Typische Vertragsphasen eines Solarpark-Pachtvertrags",
          kopf: ["Phase", "Dauer (typisch)", "Zahlung an den Eigentümer", "Worauf achten"],
          zeilen: [
            ["Planung / Reservierung", "2–5 Jahre", `Reservierungsentgelt, oft ${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} €/ha`, "Höchstdauer (Long-Stop-Datum), Bewirtschaftung bis Baubeginn, Ersatz von Ernteausfällen bei Gutachten"],
            ["Bau", "3–9 Monate", "volle Pacht ab Baubeginn oder anteilig", "Zeitpunkt des Pachtbeginns eindeutig definieren, Flurschäden regeln"],
            ["Betrieb", `${PACHT.laufzeit} Jahre + Optionen`, `Fest- oder Umsatzpacht, indexiert (z. B. ${fmtPct(PACHT.indexierung)}/Jahr)`, "Wertsicherung, Fälligkeit, Verzugsregeln, Einsichtsrechte bei Umsatzpacht"],
            ["Rückbau", "6–12 Monate", "Pacht bis zur Rückgabe der Fläche", "Frist, Umfang der Wiederherstellung, Sicherheit, Abnahmeprotokoll"],
          ],
          minBreite: 760,
          fussnote: "Orientierungswerte. Die Verlängerungsoptionen liegen meist einseitig beim Betreiber – eine Anpassung der Pacht bei Verlängerung sollte vereinbart sein.",
        },
        {
          typ: "p",
          text: "Achten Sie auf ein **Long-Stop-Datum**: Wird der Park bis zu einem festen Zeitpunkt nicht gebaut, endet der Vertrag automatisch oder Sie erhalten ein Kündigungsrecht. Ohne diese Klausel kann eine Fläche viele Jahre blockiert sein, ohne dass nennenswert gezahlt wird. Bis zum Baubeginn sollte die landwirtschaftliche Nutzung ausdrücklich bei Ihnen bleiben.",
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Schriftform bei langen Laufzeiten (Deutschland)",
          text: "Auf Pachtverträge sind nach § 581 Abs. 2 BGB die Mietvorschriften entsprechend anzuwenden. Nach § 550 BGB gilt ein Vertrag, der für länger als ein Jahr nicht in schriftlicher Form geschlossen wird, als auf unbestimmte Zeit geschlossen – er wäre dann vorzeitig kündbar. Alle Anlagen (Lagepläne, Flurstücksliste) und Nachträge sollten deshalb fest mit dem Vertrag verbunden und unterschrieben sein. Häufig enthalten Verträge eine sogenannte Schriftformheilungsklausel; deren Wirksamkeit ist rechtlich umstritten.",
        },
      ],
    },
    {
      id: "ruecktritt",
      titel: "Rücktrittsrechte, Pachtanpassung und Umsatzbeteiligung",
      tocLabel: "Rücktritt & Pachtanpassung",
      bloecke: [
        {
          typ: "p",
          text: "**Rücktrittsrechte des Entwicklers sind in der Planungsphase üblich und legitim – sie müssen aber an klare Bedingungen und Fristen gebunden sein.** Typische Gründe: Der Bebauungsplan wird nicht beschlossen, der Netzbetreiber sagt keinen Anschluss zu, das Projekt erhält keinen Zuschlag. Problematisch sind Klauseln, die einen Rücktritt jederzeit und ohne Grund erlauben, während Sie selbst gebunden bleiben.",
        },
        {
          typ: "liste",
          punkte: [
            "**Rücktrittsgründe abschließend benennen** und an Fristen koppeln, danach erlischt das Rücktrittsrecht.",
            "**Reservierungsentgelt bleibt beim Eigentümer**, auch wenn der Entwickler zurücktritt.",
            "**Eigene Kündigungsrechte** bei Zahlungsverzug, Insolvenz des Betreibers oder Überschreiten des Long-Stop-Datums.",
            "**Wertsicherung** der Pacht an einen offiziellen Verbraucherpreisindex, mit Basisjahr und Anpassungsrhythmus.",
            `**Umsatzpacht** (marktüblich ${fmtPct(PACHT.umsatzbeteiligung.min, 0)}–${fmtPct(PACHT.umsatzbeteiligung.max, 0)} der Erlöse) nur mit Mindestpacht, klarer Erlösdefinition und Recht auf Einsicht in die Abrechnungen.`,
          ],
        },
        {
          typ: "p",
          text: "Auch die **Übertragbarkeit** gehört hierher: Solarprojekte wechseln häufig den Eigentümer, etwa vom Entwickler zum Investor – über die [Projektbörse](/projektboerse) oder direkt. Das ist normal. Sinnvoll ist aber, dass der Vertrag auf eine Projektgesellschaft übergehen darf, die den Vertrag vollständig übernimmt, und dass Sie über jeden Wechsel informiert werden. Wie Käufer solche Verträge prüfen, zeigt der Ratgeber [Projektrechte kaufen: Due Diligence](/wissen/ratgeber/projektrechte-kaufen-due-diligence).",
        },
      ],
    },
    {
      id: "grundbuch",
      titel: "Dienstbarkeit, Rangrücktritt und Eintrittsrecht der Bank",
      tocLabel: "Grundbuch & Bank",
      bloecke: [
        {
          typ: "p",
          text: "**Ohne Eintrag im Grundbuch finanziert keine Bank einen Solarpark.** In Deutschland wird das Nutzungsrecht deshalb über eine [beschränkte persönliche Dienstbarkeit](/wissen/lexikon#dienstbarkeit) nach § 1090 BGB gesichert: Der Betreiber darf das Grundstück „in einzelnen Beziehungen“ benutzen – Errichtung, Betrieb, Zufahrt, Leitungen. Die Dienstbarkeit wirkt auch gegenüber einem späteren Käufer oder Erben. Die Eintragung erfolgt über den Notar; die Kosten trägt üblicherweise der Betreiber.",
        },
        {
          typ: "h3",
          text: "Rangrücktritt bestehender Grundschulden",
        },
        {
          typ: "p",
          text: "Ist Ihr Grundstück mit einer Grundschuld belastet, verlangt die finanzierende Bank des Solarparks meist, dass die Dienstbarkeit **an erster Rangstelle** oder zumindest vor den Grundpfandrechten steht. Dafür muss Ihre Bank einen Rangrücktritt erklären. Sprechen Sie früh mit ihr – manche Banken verlangen dafür eine Bewertung oder eine Gegenleistung. Die Kosten dieses Schritts sollte der Betreiber übernehmen.",
        },
        {
          typ: "h3",
          text: "Eintrittsrecht der finanzierenden Bank",
        },
        {
          typ: "p",
          text: "Üblich ist zusätzlich ein **Eintrittsrecht der Bank**: Gerät der Betreiber in Schwierigkeiten, kann die Bank oder ein von ihr benannter Dritter in den Vertrag eintreten und den Park weiterbetreiben. Häufig wird dafür eine zweite, inhaltsgleiche Dienstbarkeit zugunsten der Bank eingetragen oder eine dreiseitige Vereinbarung geschlossen. Für Eigentümer ist das kein Nachteil, im Gegenteil: Die Pacht läuft auch bei einer Insolvenz des ursprünglichen Betreibers eher weiter. Wichtig ist, dass der Eintretende alle Pflichten übernimmt – auch den Rückbau.",
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Österreich und Schweiz",
          text: "In **Österreich** wird das Nutzungsrecht in der Regel als Dienstbarkeit (Servitut) vereinbart: Nach § 472 ABGB wird der Eigentümer verpflichtet, zum Vorteil eines anderen „etwas zu dulden oder zu unterlassen“; bei verbücherten Grundstücken entsteht die Dienstbarkeit erst mit der Eintragung im Grundbuch (§ 481 ABGB). Die Landwirtschaftskammer Oberösterreich empfiehlt, dass der Betreiber die Kosten der Verbücherung und der späteren Löschung trägt. In der **Schweiz** werden Nutzungsrechte je nach Gestaltung über eine Dienstbarkeit oder ein Baurecht im Grundbuch gesichert – hier ist eine notarielle Beratung besonders wichtig.",
        },
      ],
    },
    {
      id: "rueckbau",
      titel: "Rückbauverpflichtung und Rückbausicherheit",
      tocLabel: "Rückbau & Sicherheit",
      bloecke: [
        {
          typ: "p",
          text: "**Der Betreiber muss sich verpflichten, die Anlage nach Vertragsende vollständig zurückzubauen und die Fläche landwirtschaftlich nutzbar zurückzugeben – abgesichert durch eine Bürgschaft oder eine vergleichbare Sicherheit.** Bei Vorhaben im Außenbereich verlangt schon das Baurecht eine [Rückbauverpflichtung](/wissen/lexikon#rueckbauverpflichtung) (§ 35 Abs. 5 Satz 2 BauGB), bei Bebauungsplänen regeln Gemeinden das oft in einem städtebaulichen Vertrag. Diese öffentlich-rechtlichen Pflichten schützen aber vor allem die Allgemeinheit – Sie brauchen eine eigene Regelung im Pachtvertrag.",
        },
        {
          typ: "p",
          text: `Die Kosten für den Rückbau werden je nach Annahmen zum Schrottwert der Module und Gestelle unterschiedlich geschätzt. Wir rechnen vorsichtig mit rund ${fmt(FREIFLAECHE.rueckbauProKwp)} € je kWp. Für einen Park auf ${HA} ha mit rund ${fmt(MWP, 1)} MWp ergibt das etwa **${fmtEur(RUECKBAU)}**. Die Sicherheit sollte spätestens vor Baubeginn gestellt und über die Laufzeit an die Preisentwicklung angepasst werden.`,
        },
        {
          typ: "checkliste",
          punkte: [
            "**Umfang:** Module, Gestelle, Rammpfosten, Fundamente, Wechselrichter, Trafostationen, Zaun, Wege und **alle Kabel im Boden** entfernen.",
            "**Wiederherstellung:** Bodenlockerung, Verfüllung, Rekultivierung, damit die Fläche wieder ackerfähig ist.",
            "**Beweissicherung:** Bodenzustand bei Vertragsbeginn protokollieren (Fotos, ggf. Bodenproben) – das erleichtert die Abnahme.",
            "**Frist:** Rückbau innerhalb von etwa 6–12 Monaten nach Vertragsende; Pacht bis zur Rückgabe.",
            "**Sicherheit:** unbefristete, selbstschuldnerische Bankbürgschaft eines Kreditinstituts; Konzernbürgschaften nur mit Bonitätsprüfung.",
            "**Erfüllung:** Recht des Eigentümers, bei Verzug selbst zurückbauen zu lassen und die Sicherheit zu ziehen.",
          ],
        },
      ],
    },
    {
      id: "haftung",
      titel: "Haftung, Versicherung, Zufahrt und Kabeltrassen",
      tocLabel: "Haftung & Zufahrt",
      bloecke: [
        {
          typ: "p",
          text: "**Der Betreiber sollte alle Risiken aus Bau und Betrieb tragen und Sie von Ansprüchen Dritter freistellen.** Dazu gehören eine Betriebshaftpflichtversicherung mit ausreichender Deckungssumme, die Verkehrssicherungspflicht für die eingezäunte Fläche und die Haftung für Schäden an Nachbarflächen, Drainagen oder Wegen.",
        },
        {
          typ: "tabelle",
          caption: "Weitere Klauseln im Überblick",
          kopf: ["Klausel", "Faire Regelung", "Warnsignal"],
          zeilen: [
            ["Haftung & Versicherung", "Betreiber haftet, Haftpflichtversicherung wird nachgewiesen, Freistellung des Eigentümers", "Haftung des Eigentümers für den Zustand der Fläche bleibt unbegrenzt"],
            ["Zufahrt", "Nutzung bestimmter Wege, Wiederherstellung nach der Bauphase", "Pauschales Wegerecht über alle Flächen des Eigentümers"],
            ["Kabeltrassen", "Eigene Dienstbarkeit mit gesondertem Entgelt je laufendem Meter, Tiefe und Lage festgelegt", "Trassenrecht über weitere Grundstücke ohne Vergütung"],
            ["Pflege der Fläche", "Mahd oder Schafbeweidung durch den Betreiber, Beteiligung des Eigentümers möglich", "Pflegepflicht beim Eigentümer ohne Entgelt"],
            ["Grundsteuer & Abgaben", "Mehrbelastung durch die Nutzung trägt der Betreiber", "Keine Regelung – alle Mehrkosten bleiben beim Eigentümer"],
            ["Übertragung", "Nur auf Gesellschaften, die alle Pflichten übernehmen, mit Mitteilung", "Freie Übertragung ohne Information und ohne Sicherheit"],
          ],
          minBreite: 740,
          fussnote: "Beispiele typischer Regelungen, keine Musterformulierungen.",
        },
        {
          typ: "p",
          text: "Die Trasse vom Park zum [Netzverknüpfungspunkt](/wissen/lexikon#netzverknuepfungspunkt) verläuft oft über Grundstücke anderer Eigentümer. Liegen weitere eigene Flächen auf der Strecke, sollte die Leitungsdienstbarkeit dafür gesondert vergütet werden. Denken Sie auch an Jagd, Drainagen und die Erreichbarkeit angrenzender Felder.",
        },
      ],
    },
    {
      id: "steuern",
      titel: "Steuern: Unbedingt vor der Unterschrift klären",
      tocLabel: "Steuern",
      bloecke: [
        {
          typ: "p",
          text: "**Die Verpachtung für einen Solarpark kann in Deutschland dazu führen, dass die Fläche ihren Status als land- und forstwirtschaftliches Vermögen verliert** – mit möglichen Folgen für Erbschaft-, Schenkung- und Grundsteuer und bei Betriebsvermögen auch für die Einkommensteuer. Das gilt nach Verwaltungsauffassung nicht für Agri-PV nach DIN SPEC 91434, für klassische Freiflächenanlagen aber in der Regel schon. Alle Details im Ratgeber [Erbschaft- und Grundsteuer bei PV-Pacht](/wissen/ratgeber/pv-pacht-erbschaftsteuer-grundsteuer).",
        },
        {
          typ: "p",
          text: "Einige Verträge enthalten eine Klausel, nach der der Betreiber steuerliche Mehrbelastungen ganz oder teilweise ausgleicht. Ob und wie das sinnvoll ist, sollte Ihre Steuerberatung beurteilen. Wer seine Fläche lieber weiter bewirtschaften möchte, findet unter [Agri-PV](/de/agri-pv) eine Alternative.",
        },
      ],
    },
    {
      id: "checkliste",
      titel: "Checkliste für Eigentümer",
      tocLabel: "Checkliste",
      bloecke: [
        {
          typ: "checkliste",
          punkte: [
            "Vertragspartner, Bonität und Referenzen des Betreibers geprüft",
            `Pacht marktüblich (${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €/ha) und wertgesichert`,
            "Reservierungsentgelt für die Planungsphase vereinbart, nicht rückzahlbar",
            "Long-Stop-Datum und abschließende Rücktrittsgründe mit Fristen",
            "Landwirtschaftliche Nutzung bis Baubeginn gesichert, Ernteausfälle werden ersetzt",
            "Dienstbarkeit beschränkt auf die tatsächlich benötigten Flurstücke und Nutzungen",
            "Kosten für Notar, Grundbuch, Rangrücktritt und Löschung trägt der Betreiber",
            "Rückbauumfang, Frist und Bankbürgschaft vor Baubeginn geregelt",
            "Haftung, Versicherung und Freistellung des Eigentümers geregelt",
            "Kabeltrassen und Zufahrten gesondert vergütet und genau beschrieben",
            "Steuerliche Folgen von Steuerberatung geprüft, Ausgleichsklausel verhandelt",
            "Vertrag vollständig schriftlich, alle Anlagen fest verbunden, anwaltlich geprüft",
          ],
        },
        {
          typ: "tool",
          href: pfad("/flaechencheck"),
          titel: "Eignet sich Ihre Fläche überhaupt?",
          text: "Bevor Sie über Klauseln verhandeln: Der Flächencheck klärt Lage, Netzanschluss und Planungsrecht.",
          label: "Zum Flächencheck",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "Vom ersten Angebot zur Unterschrift",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Fläche einschätzen", "Lage, Netzanschluss und Planungsrecht mit dem [Flächencheck](/de/flaechencheck) prüfen, Pachtgröße mit dem [Pachtrechner](/de/rechner/pacht) überschlagen."],
            ["Angebote vergleichen", "Nicht nur die Pacht je Hektar, sondern Reservierung, Rücktrittsrechte, Sicherheiten und Übertragbarkeit nebeneinanderlegen."],
            ["Absichtserklärung statt Vorvertrag", "Eine unverbindliche Absichtserklärung genügt oft für den Start; eine lange Exklusivbindung ohne Entgelt vermeiden."],
            ["Prüfen lassen", "Vertragsentwurf von Anwalt oder Notar, steuerliche Folgen von Steuerberatung, Rangrücktritt mit der eigenen Bank klären."],
            ["Beurkunden und eintragen", "Dienstbarkeit notariell bewilligen und im Grundbuch eintragen lassen; Bodenzustand dokumentieren."],
          ],
        },
        {
          typ: "p",
          text: "Wie ein Projekt nach der Unterschrift weiterläuft, von der Planung bis zum Bau, beschreibt die Seite [Prozess](/de/prozess). Grundsätzliches für Eigentümer finden Sie unter [Fläche verpachten](/de/flaeche-verpachten).",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Wie lange läuft ein Pachtvertrag für einen Solarpark?",
      a: `In der Regel ${PACHT.laufzeit} Jahre ab Inbetriebnahme, oft mit Verlängerungsoptionen (${PACHT.verlaengerung}). Dazu kommen die Planungsphase von meist zwei bis fünf Jahren und der Rückbau.`,
    },
    {
      q: "Muss ich eine Dienstbarkeit ins Grundbuch eintragen lassen?",
      a: "Praktisch ja. Banken finanzieren Solarparks nur, wenn das Nutzungsrecht dinglich gesichert ist – in Deutschland über eine beschränkte persönliche Dienstbarkeit, in Österreich über eine verbücherte Servitut. Die Kosten sollte der Betreiber tragen.",
    },
    {
      q: "Was passiert, wenn der Betreiber insolvent wird?",
      a: "Dann greifen Eintrittsrecht der Bank und Rückbausicherheit. Die finanzierende Bank hat ein Interesse daran, den Park weiterzubetreiben, und kann einen neuen Betreiber eintreten lassen. Für den Fall, dass niemand übernimmt, sichert die Bürgschaft den Rückbau.",
    },
    {
      q: "Kann ich die Fläche während der Laufzeit verkaufen oder vererben?",
      a: "Ja. Die Dienstbarkeit und der Pachtvertrag gehen auf den Käufer oder Erben über, der dann die Pacht erhält. Steuerlich kann die Vererbung verpachteter PV-Flächen aber teuer werden – siehe [Erbschaft- und Grundsteuer bei PV-Pacht](/wissen/ratgeber/pv-pacht-erbschaftsteuer-grundsteuer).",
    },
    {
      q: "Wie hoch sollte die Rückbaubürgschaft sein?",
      a: `Sie sollte die realistischen Rückbaukosten abdecken. Wir rechnen vorsichtig mit rund ${fmt(FREIFLAECHE.rueckbauProKwp)} € je kWp, also etwa ${fmtEur(RUECKBAU)} für einen Park auf ${HA} ha. Wichtig sind eine Anpassung an die Preisentwicklung und eine Bankbürgschaft vor Baubeginn.`,
    },
    {
      q: "Darf der Entwickler vom Vertrag zurücktreten?",
      a: "In der Planungsphase ist das üblich, etwa wenn der Bebauungsplan scheitert oder kein Netzanschluss möglich ist. Die Gründe sollten aber abschließend benannt und an Fristen gebunden sein, und ein gezahltes Reservierungsentgelt sollte bei Ihnen bleiben.",
    },
  ],

  passend: [
    { href: "/wissen/ratgeber/solarpark-pacht-pro-hektar", titel: "Pacht pro Hektar für Solarparks", text: "Spannen, Einflussfaktoren und Rechnung über 30 Jahre." },
    { href: "/wissen/ratgeber/pv-pacht-erbschaftsteuer-grundsteuer", titel: "Erbschaft- und Grundsteuer bei PV-Pacht", text: "Steuerliche Folgen der Verpachtung." },
    { href: pfad("/flaeche-verpachten"), titel: "Fläche verpachten", text: "Ablauf und Voraussetzungen für Eigentümer." },
    { href: pfad("/rechner/pacht"), titel: "Pachtrechner", text: "Jahres- und Gesamtpacht berechnen." },
  ],

  quellen: [
    { titel: "BGB § 1090 – Gesetzlicher Inhalt der beschränkten persönlichen Dienstbarkeit", url: "https://www.gesetze-im-internet.de/bgb/__1090.html", stand: "09/2026" },
    { titel: "BGB § 550 – Form des Mietvertrags", url: "https://www.gesetze-im-internet.de/bgb/__550.html", stand: "09/2026" },
    { titel: "Baugesetzbuch § 35 (Bauen im Außenbereich, Rückbauverpflichtung Abs. 5)", url: "https://www.gesetze-im-internet.de/bbaug/__35.html", stand: "09/2026" },
    { titel: "Wissenschaftliche Dienste des Bundestages – WD 7 - 3000 - 017/25: Privilegierung von Freiflächen-PV an Autobahnen (u. a. Rückbauverpflichtung)", url: "https://www.bundestag.de/resource/blob/1097610/WD-7-017-25.pdf", stand: "09/2026" },
    { titel: "RIS – ABGB § 472 (Dienstbarkeit)", url: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001622&Paragraf=472", stand: "09/2026" },
    { titel: "Landwirtschaftskammer Oberösterreich – Photovoltaik-Freiflächenanlagen: Checkliste über wesentliche Vertragspunkte", url: "https://ooe.lko.at/photovoltaik-freifl%C3%A4chenanlagen-checkliste-%C3%BCber-wesentliche-vertragspunkte+2400+4125534", stand: "09/2026" },
    { titel: "Landwirtschaftskammer Steiermark – Photovoltaik auf Freiflächen: Nicht alles ist Gold, was glänzt", url: "https://stmk.lko.at/photovoltaik-auf-freifl%C3%A4chen-nicht-alles-ist-gold-was-gl%C3%A4nzt+2400+3668154", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Erst die Fläche, dann der Vertrag",
    text: "Prüfen Sie kostenfrei, ob Ihre Fläche für einen Solarpark infrage kommt.",
    href: pfad("/flaechencheck"),
    label: "Zum Flächencheck",
  },
  cta: {
    title: "Ihre Fläche, fair verpachtet.",
    text: "Stellen Sie Ihre Fläche kostenfrei vor. Wir prüfen Lage, Netzanschluss und Planungsrecht und besprechen mit Ihnen, welches Modell passt.",
    primary: { label: "Zum Flächencheck", href: pfad("/flaechencheck") },
    secondary: { label: "Pacht berechnen", href: pfad("/rechner/pacht") },
  },
};

export default artikel;
