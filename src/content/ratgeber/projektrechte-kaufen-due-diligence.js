// Ratgeber: Projektrechte kaufen – Phasen, Preise, Transaktionsstruktur, Due Diligence
// Recherchestand 29.09.2026 (BGB §§ 1090, 1092; GmbHG § 15; GrEStG § 1; EEG 2023 § 37;
// öGmbHG § 76; Preise je Phase aus src/lib/invest/markt.js).

import { PHASEN, PROVISION, FREIFLAECHE, phaseById } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtPct } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

// Beispielprojekt für die Rechenbeispiele im Text
const MWP = 20;
const KWP = MWP * 1000;

const spanne = (p) => `${fmt(p.preisProKwp.min)}–${fmt(p.preisProKwp.max)} €/kWp`;
const kaufpreis = (p) => `${fmtEur(p.preisProKwp.min * KWP)} – ${fmtEur(p.preisProKwp.max * KWP)}`;
const monate = (p) => (p.id === "cod" ? "in Betrieb" : p.monateBisRtb === 0 ? "baureif" : `ca. ${p.monateBisRtb} Monate`);

const AUFSTELLUNG = phaseById("aufstellung");
const SATZUNG = phaseById("satzung");
const RTB = phaseById("rtb");
const RTB_MITTEL = (RTB.preisProKwp.min + RTB.preisProKwp.max) / 2;
const RTB_PREIS = RTB_MITTEL * KWP;
const PROV_MIN = RTB_PREIS * PROVISION.verkaeufer.min;
const PROV_MAX = RTB_PREIS * PROVISION.verkaeufer.max;

// Meilensteinstruktur im Beispiel (Anteile am Gesamtkaufpreis)
const TRANCHEN = [
  { name: "Signing (Unterzeichnung SPA)", anteil: 0.2, bedingung: "Kaufvertrag beurkundet, Gesellschaftsanteile übertragen oder aufschiebend bedingt" },
  { name: "Satzungsbeschluss B-Plan", anteil: 0.3, bedingung: "Bebauungsplan in Kraft, Rechtsmittelfristen abgewartet" },
  { name: "Ready-to-Build", anteil: 0.4, bedingung: "Baugenehmigung, Netzanschlusszusage mit Kapazität, alle Dienstbarkeiten eingetragen" },
  { name: "Earn-out", anteil: 0.1, bedingung: "z. B. Zuschlag in der EEG-Ausschreibung oder PPA zu einem vereinbarten Mindestpreis" },
];

const EPC_MITTEL = FREIFLAECHE.capexProKwp.mittel;

const artikel = {
  slug: "projektrechte-kaufen-due-diligence",
  title: "Projektrechte kaufen: Preise, Vertragsstruktur und Due Diligence",
  seoTitle: "Projektrechte Solarpark kaufen: Due Diligence | ÖkoInvest",
  kurzTitel: "Projektrechte kaufen",
  description:
    "Projektrechte für Solarparks kaufen: Preise je Entwicklungsphase in €/kWp, Share Deal oder Asset Deal, Meilensteinzahlungen und die Due-Diligence-Checkliste.",
  excerpt:
    "Was ein Solarprojekt in welcher Phase wert ist, wie Käufer das Entwicklungsrisiko über Meilensteine absichern und welche Unterlagen in der Due Diligence nicht fehlen dürfen.",
  hauptKeyword: "projektrechte kaufen",
  keywords: [
    "Projektrechte kaufen",
    "Solarpark Projektrechte",
    "Due Diligence Solarpark",
    "PV-Projekt kaufen",
    "Share Deal Solarpark",
    "Ready-to-Build Solarprojekt Preis",
    "Projektbörse Photovoltaik",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-10-03", // Rechtsstand nachgeprüft (Welle 1, Paket G)
  kategorie: "Investieren & Projektbörse",
  bild: "/img/investoren-vor-ort.jpg",
  bildAlt: "Drei Personen mit weißen Schutzhelmen und Plänen gehen zwischen Modulreihen eines Solarparks",
  badge: { wert: spanne(RTB), text: "übliche Entwicklungsprämie für baureife Projekte" },

  kurzFazit: [
    `**Der Preis folgt dem Risiko:** Für eine reine Flächensicherung werden oft nur ${spanne(phaseById("flaeche"))} gezahlt, für baureife Projekte (RTB) ${spanne(RTB)} – Orientierungswerte DACH, Stand 2026.`,
    "Üblich ist der **Share Deal**: Der Käufer übernimmt die Projektgesellschaft (SPV) mit allen Pacht-, Netz- und Planungsrechten. Ein Asset Deal ist möglich, aber aufwendiger.",
    "Käufer früher Phasen sichern sich über **Meilensteinzahlungen und Earn-outs** ab: Gezahlt wird erst, wenn Satzungsbeschluss, Netzzusage oder Baugenehmigung tatsächlich vorliegen.",
    "Die Due Diligence entscheidet über den Preis. Typische Deal-Breaker sind **lückenhafte Flächensicherung, eine unsichere Netzanschlusszusage und ein angreifbarer Bebauungsplan**.",
    `Über die [Projektbörse](/projektboerse) ist die Suche für Investoren kostenfrei; Verkäufer zahlen ${PROVISION.verkaeufer.text}.`,
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Was kosten Projektrechte für einen Solarpark?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: `**Projektrechte für Freiflächen-Solarparks werden in der Regel als Entwicklungsprämie in Euro je Kilowatt-Peak (€/kWp) gehandelt – von rund ${fmt(phaseById("flaeche").preisProKwp.min)} €/kWp für eine gesicherte Fläche bis rund ${fmt(RTB.preisProKwp.max)} €/kWp für ein baureifes Projekt.** Für ein Projekt mit ${MWP} MWp entspricht das je nach Phase einem Kaufpreis zwischen gut hunderttausend und über zwei Millionen Euro. Die Errichtung selbst ist darin nicht enthalten; sie kostet schlüsselfertig zusätzlich rund ${fmt(EPC_MITTEL)} €/kWp.`,
        },
        {
          typ: "p",
          text: "[Projektrechte](/wissen/lexikon#projektrechte) sind kein einzelnes Dokument, sondern ein Bündel: Nutzungsverträge und Dienstbarkeiten für die Fläche, das Planungsrecht (Bebauungsplan oder Privilegierung), die Netzanschlusszusage, Gutachten und – je nach Phase – die Baugenehmigung. Wer ein Projekt kauft, bezahlt dafür, dass ein anderer Zeit, Geld und Risiko in genau diese Bausteine gesteckt hat. Je mehr davon rechtssicher vorliegt, desto höher der Preis und desto geringer das Risiko, dass das Projekt nie gebaut wird.",
        },
        {
          typ: "kennzahl",
          wert: `${fmt(RTB.preisProKwp.min)}–${fmt(RTB.preisProKwp.max)} €`,
          titel: "je kWp für ein baureifes Projekt (RTB)",
          text: "Entwicklungsprämie ohne Anlagenbau. Netzanschluss, Größe, Vergütungsweg (EEG oder PPA) und Standort verschieben den Wert deutlich.",
        },
      ],
    },
    {
      id: "phasen",
      titel: "Preise und Risiko nach Entwicklungsphase",
      tocLabel: "Preise je Phase",
      bloecke: [
        {
          typ: "p",
          text: "**Mit jedem abgeschlossenen Entwicklungsschritt sinkt das Ausfallrisiko – und der Preis je kWp steigt.** Die folgende Übersicht zeigt übliche Spannen im DACH-Raum und den typischen Abstand bis zur Baureife. Die Werte sind Orientierung, keine Angebote: Ein Projekt mit schwieriger Netzsituation kann trotz Baurecht deutlich weniger wert sein als eines in früherer Phase mit gesichertem Anschluss am Umspannwerk.",
        },
        {
          typ: "tabelle",
          caption: `Übliche Kaufpreise für Freiflächen-Projektrechte nach Phase, Beispiel ${MWP} MWp, Stand September 2026`,
          kopf: ["Phase", "Preis je kWp", `Kaufpreis ${MWP} MWp`, "Risiko", "Zeit bis RTB"],
          zeilen: PHASEN.map((p) => [p.label, spanne(p), kaufpreis(p), p.risiko, monate(p)]),
          hervorheben: 1,
          markierteZeile: 4,
          minBreite: 720,
          fussnote:
            "Orientierungswerte für die Entwicklungsprämie, DACH 2025/26. Beim Bestand (COD) ist die errichtete Anlage im Preis enthalten; der Wert ergibt sich dort aus den Cashflows, nicht aus einer Prämie. Zeiten bis RTB sind Durchschnittswerte und hängen stark von Gemeinde, Netzbetreiber und Gutachten ab.",
        },
        {
          typ: "p",
          text: `Auffällig ist der Sprung zwischen [Aufstellungsbeschluss](/wissen/lexikon#aufstellungsbeschluss) (${spanne(AUFSTELLUNG)}) und [Satzungsbeschluss](/wissen/lexikon#satzungsbeschluss) (${spanne(SATZUNG)}): Erst mit dem beschlossenen Bebauungsplan steht fest, dass auf der Fläche tatsächlich gebaut werden darf. Wie das Verfahren abläuft, erklärt der Ratgeber zu [Genehmigung und Bebauungsplan](/ratgeber/solarpark-genehmigung-bebauungsplan). Einen ersten Wert für ein konkretes Projekt liefert der [Projektbewertungsrechner](/rechner/projektbewertung).`,
        },
        {
          typ: "tool",
          href: pfad("/rechner/projektbewertung"),
          titel: "Was ist Ihr Projekt wert?",
          text: "Phase, Leistung, Netzsituation und Vergütungsweg eingeben – der Rechner zeigt eine Preisspanne je kWp und den Weg bis zur Baureife.",
          label: "Zur Projektbewertung",
        },
      ],
    },
    {
      id: "struktur",
      titel: "Share Deal oder Asset Deal: So wird die Transaktion aufgesetzt",
      tocLabel: "Transaktionsstruktur",
      bloecke: [
        {
          typ: "p",
          text: "**In Deutschland und Österreich werden Solarprojekte überwiegend als Share Deal verkauft: Der Käufer erwirbt die Anteile an einer Projektgesellschaft (SPV), in der alle Rechte gebündelt sind.** Verträge mit Grundeigentümern, Netzbetreiber und Gemeinde bleiben dadurch unverändert bestehen – es wechselt nur der Gesellschafter.",
        },
        {
          typ: "tabelle",
          caption: "Share Deal und Asset Deal im Vergleich",
          kopf: ["Kriterium", "Share Deal (SPV-Anteile)", "Asset Deal (einzelne Rechte)"],
          zeilen: [
            ["Was wird übertragen?", "Gesellschaftsanteile – Verträge bleiben in der SPV", "Jeder Vertrag, jede Zusage und jedes Recht einzeln"],
            ["Zustimmung Dritter", "meist nicht nötig; Change-of-Control-Klauseln prüfen", "häufig nötig (Verpächter, Netzbetreiber, Gemeinde)"],
            ["Altlasten und Haftung", "gehen mit der Gesellschaft über – Garantien im SPA nötig", "nur ausdrücklich übernommene Pflichten"],
            ["Form (DE / AT)", "notarielle Beurkundung (§ 15 GmbHG) / Notariatsakt (§ 76 öGmbHG)", "je nach Recht; Grundbuchrechte mit eigener Form"],
            ["Aufwand", "geringer, schneller", "höher, fehleranfälliger"],
            ["Typischer Einsatz", "Standard ab Netzzusage bzw. B-Plan", "sehr frühe Phasen, Teilflächen, Umstrukturierung"],
          ],
          hervorheben: 1,
          minBreite: 640,
          fussnote: "Grunderwerbsteuer: Hält die SPV eigene Grundstücke, sind beim Share Deal die Anteilsschwellen des § 1 GrEStG (90 % innerhalb von zehn Jahren) zu prüfen. Steuerliche Fragen bitte mit Steuerberatung klären.",
        },
        { typ: "h3", text: "Die Dokumente in der richtigen Reihenfolge" },
        {
          typ: "ablauf",
          schritte: [
            ["NDA", "Die [Vertraulichkeitsvereinbarung](/wissen/lexikon#nda) öffnet den Zugang zu Lageplan, Netzdaten und Verträgen. Ohne NDA gibt es nur einen anonymisierten Teaser."],
            ["LOI und Exklusivität", "Der [Letter of Intent](/wissen/lexikon#loi) hält Preisrahmen, Struktur und Zeitplan fest – meist unverbindlich bis auf Exklusivität (meist für die Dauer der Prüfung) und Vertraulichkeit."],
            ["Due Diligence", "Prüfung im [Datenraum](/wissen/lexikon#datenraum): technisch, rechtlich, kommerziell, steuerlich. Ergebnis ist ein Red-Flag-Report."],
            ["SPA", "Der Anteilskaufvertrag ([SPA](/wissen/lexikon#spa)) regelt Kaufpreis, Meilensteine, Garantien, Freistellungen und Vollzugsbedingungen."],
            ["Signing und Closing", "Unterzeichnung, Erfüllung der Vollzugsbedingungen, Übertragung der Anteile, Zahlung der ersten Tranche."],
          ],
        },
        { typ: "h3", text: "Meilensteinzahlungen und Earn-out" },
        {
          typ: "p",
          text: `Bei Projekten vor Baureife zahlt der Käufer selten den vollen Preis sofort. Üblich ist ein Gesamtpreis auf RTB-Basis, der in Tranchen fällig wird, sobald ein Meilenstein nachweislich erreicht ist. Für unser ${MWP}-MWp-Beispiel mit einem RTB-Preis von ${fmt(RTB_MITTEL)} €/kWp (${fmtEur(RTB_PREIS)}) könnte das so aussehen:`,
        },
        {
          typ: "tabelle",
          caption: `Beispiel einer Meilensteinstruktur, ${MWP} MWp, Gesamtpreis ${fmtEur(RTB_PREIS)}`,
          kopf: ["Tranche", "Anteil", "Betrag", "Bedingung"],
          zeilen: TRANCHEN.map((t) => [t.name, fmtPct(t.anteil, 0), fmtEur(RTB_PREIS * t.anteil), t.bedingung]),
          minBreite: 680,
          fussnote: "Beispielhafte Struktur zur Veranschaulichung. Anteile, Bedingungen und Fristen werden im Einzelfall verhandelt; für jeden Meilenstein sollte ein Long-Stop-Date mit Rücktritts- oder Rückübertragungsregel vereinbart werden.",
        },
        {
          typ: "p",
          text: "Wichtig sind klare, objektiv prüfbare Bedingungen („Satzungsbeschluss öffentlich bekannt gemacht“ statt „B-Plan weitgehend gesichert“) und eine Regel, was passiert, wenn ein Meilenstein ausbleibt: Rückübertragung der Anteile, Preisanpassung oder Weiterentwicklung auf Kosten einer Seite. Ein **Earn-out** knüpft einen Teil des Preises an den späteren Erfolg, etwa an einen Zuschlag in der [EEG-Ausschreibung](/ratgeber/eeg-ausschreibung-freiflaeche) oder an einen PPA-Preis oberhalb einer Schwelle.",
        },
      ],
    },
    {
      id: "due-diligence",
      titel: "Due-Diligence-Checkliste für Solarprojekte",
      tocLabel: "Due-Diligence-Checkliste",
      bloecke: [
        {
          typ: "p",
          text: "**Die [Due Diligence](/wissen/lexikon#due-diligence) prüft, ob die verkauften Rechte tatsächlich bestehen, übertragbar sind und zum geplanten Park führen.** Bei Projekten vor Baureife ist der rechtliche Teil der wichtigste; technische und kommerzielle Prüfungen werden mit zunehmender Reife tiefer.",
        },
        { typ: "h3", text: "Rechtlich: Fläche, Planung, Netz" },
        {
          typ: "checkliste",
          punkte: [
            "**Flächensicherung vollständig:** Nutzungsverträge für alle Flurstücke des Parks, der Kabeltrasse und der Zuwegung – mit Laufzeit, Verlängerungsoptionen, Pachthöhe und Kündigungsrechten. Details im Ratgeber [Pachtvertrag Solarpark](/ratgeber/pachtvertrag-solarpark).",
            "**Dienstbarkeiten bewilligt oder eingetragen:** Beschränkte persönliche [Dienstbarkeiten](/wissen/lexikon#dienstbarkeit) (§ 1090 BGB) für Park und Trasse, möglichst mit Eintrittsrecht für finanzierende Bank und Käufer. Nach § 1092 Abs. 3 BGB sind sie für juristische Personen bei Erneuerbare-Energien-Anlagen übertragbar.",
            "**Rangverhältnisse im Grundbuch:** Vorrangige Grundschulden oder Zwangsversteigerungsrisiken; gegebenenfalls Rangrücktritte der Banken.",
            "**Planungsrecht:** Aufstellungsbeschluss, Stand der Beteiligung, Umweltbericht, Artenschutz, Satzungsbeschluss und Bekanntmachung; bei Privilegierung nach § 35 BauGB die Voraussetzungen (etwa 200-m-Korridor).",
            "**Städtebaulicher Vertrag:** Kostenübernahme, Rückbauverpflichtung, Ausgleichsflächen, zugesagte Kommunalbeteiligung.",
            "**Netzanschlusszusage:** Einspeiseleistung, Verknüpfungspunkt, Fristen und Reservierungsbedingungen, Kostenschätzung des Netzbetreibers, Anforderungen an das Anlagenzertifikat.",
            "**EEG-Fähigkeit:** Liegt die Fläche in einer zulässigen Kategorie nach § 37 EEG (z. B. 500-m-Randstreifen, Konversionsfläche, benachteiligtes Gebiet mit Landesöffnung)?",
            "**Gesellschaftsrecht:** Satzung der SPV, Gesellschafterliste, bestehende Verbindlichkeiten, Verträge mit dem Entwickler (Entwicklungs- oder Servicevertrag).",
          ],
        },
        { typ: "h3", text: "Technisch, kommerziell, steuerlich" },
        {
          typ: "checkliste",
          punkte: [
            "**Technisch:** Layout und Belegung, Ertragsgutachten (P50/P90), Baugrund und Rammtests, Hochwasser- und Starkregenrisiko, Leitungsbestand, Zufahrt, Blendgutachten an Straßen und Schienen.",
            "**Netzkosten:** Länge und Trassenverlauf der Kabelverbindung zum Verknüpfungspunkt; Kosten für Umspannwerk oder Übergabestation.",
            "**Kommerziell:** Vergütungsweg (EEG-Zuschlag, PPA, Marktwert), Annahmen zu Capture Rate und negativen Preisen, Pacht und Nebenkosten im Businessplan.",
            "**Steuerlich:** Organschaften, Verlustvorträge, Grunderwerbsteuer bei Grundbesitz, Umsatzsteuer auf Entwicklungsleistungen; in Österreich und der Schweiz eigene Regeln.",
            "**Genehmigungen und Fristen:** Laufzeit der Baugenehmigung, Auflagen, Ausgleichsmaßnahmen, Monitoringpflichten.",
          ],
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Rechtslage: Form und Übertragbarkeit",
          text: "Die Abtretung von GmbH-Anteilen bedarf in Deutschland der notariellen Beurkundung (§ 15 Abs. 3 und 4 GmbHG), in Österreich eines Notariatsakts (§ 76 GmbHG). Auch Vorverträge, die zur Abtretung verpflichten, sind formbedürftig. Beschränkte persönliche Dienstbarkeiten sind grundsätzlich nicht übertragbar (§ 1092 Abs. 1 BGB) – für Anlagen zur Nutzung erneuerbarer Energien macht Abs. 3 für juristische Personen eine Ausnahme. Diese Übersicht ersetzt keine Rechts- oder Steuerberatung.",
        },
      ],
    },
    {
      id: "red-flags",
      titel: "Red Flags: Wann Sie genauer hinsehen sollten",
      tocLabel: "Red Flags",
      bloecke: [
        {
          typ: "p",
          text: "**Viele Projektkäufe scheitern nicht am Preis, sondern an einer Lücke in der Rechtekette, die erst spät auffällt.** Diese Warnsignale sollten Sie in der Due Diligence aktiv abfragen:",
        },
        {
          typ: "karten",
          cols: 2,
          items: [
            { titel: "Lücken in der Fläche", text: "Einzelne Flurstücke nur mündlich zugesagt, Trasse nicht gesichert, Erbengemeinschaften ohne alle Unterschriften oder Pachtverträge mit Rücktrittsrecht bis Baubeginn." },
            { titel: "Netzzusage ohne Substanz", text: "Nur eine Netzauskunft statt einer verbindlichen Zusage, ablaufende Reservierungsfristen oder ein Verknüpfungspunkt, der erst nach einem Netzausbau verfügbar wird." },
            { titel: "Angreifbarer Bebauungsplan", text: "Formfehler bei Bekanntmachung oder Beteiligung, fehlende Artenschutzkartierung, offener Streit in der Gemeinde oder anhängige Normenkontrollanträge." },
            { titel: "Unklare Kette der Rechte", text: "Verträge auf Privatpersonen oder eine andere Gesellschaft als die SPV geschlossen, fehlende Abtretungsklauseln, Vorkaufsrechte Dritter." },
            { titel: "Optimistische Ertragsrechnung", text: "Keine P90-Betrachtung, PPA-Preise ohne Profil- und Abregelungsrisiko, Capex von vor zwei Jahren oder fehlende Rückbau-Rücklage." },
            { titel: "Mehrfachvermarktung", text: "Dasselbe Projekt wird parallel über mehrere Vermittler angeboten, ohne dass der Verkäufer die Exklusivität geklärt hat." },
          ],
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Garantien ersetzen keine Prüfung",
          text: "Garantien und Freistellungen im SPA sind nur so viel wert wie die Bonität dessen, der sie gibt. Bei kleinen Entwicklergesellschaften sind Einbehalte, Treuhandkonten oder Meilensteinzahlungen oft wirksamer als umfangreiche Garantiekataloge.",
        },
      ],
    },
    {
      id: "projektboerse",
      titel: "Welche Rolle eine Projektbörse spielt",
      tocLabel: "Rolle der Projektbörse",
      bloecke: [
        {
          typ: "p",
          text: "**Eine Projektbörse bringt Verkäufer und Käufer von Projektrechten strukturiert zusammen – sie ersetzt aber weder die eigene Due Diligence noch die rechtliche Beratung.** Ihr Nutzen liegt vor allem in drei Punkten: Käufer sehen einen breiteren Markt, als sie über persönliche Kontakte erreichen; Verkäufer erreichen mehrere qualifizierte Investoren; und der Prozess aus Teaser, NDA und Datenraum folgt einem einheitlichen Standard.",
        },
        {
          typ: "tabelle",
          caption: "Kostenmodell der ÖkoInvest-Projektbörse",
          kopf: ["Rolle", "Kosten", "Beispiel"],
          zeilen: [
            ["Verkäufer / Projektentwickler", PROVISION.verkaeufer.text, `${fmtEur(PROV_MIN)} – ${fmtEur(PROV_MAX)} bei ${fmtEur(RTB_PREIS)} Kaufpreis`],
            ["Investor / Käufer", PROVISION.kaeufer.text, "keine Gebühr"],
            ["Flächeneigentümer", PROVISION.flaeche.text, "keine Gebühr"],
          ],
          minBreite: 560,
        },
        {
          typ: "p",
          text: `Die ÖkoInvest GmbH mit Sitz in Ostermiething ist Teil der ÖKOVOLT Gruppe, die seit 2012 eigene Solarparks betreibt. Wer als Investor ein Suchprofil hinterlegt, bekommt passende Projekte angezeigt; wer ein Projekt verkaufen möchte, kann es über [Projekt anbieten](/projektboerse/anbieten) einstellen. Einen Überblick über Angebot und Ablauf finden Sie unter [Investoren](/investoren) und im [Entwicklungsprozess](/prozess). Wie sich der Kauf am Ende rechnet, zeigt der Ratgeber [Solarpark-Investment und Rendite](/ratgeber/solarpark-investment-rendite).`,
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "Vorgehen: In sechs Schritten zum Projektkauf",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Suchprofil festlegen", "Phase, Größe, Region, Vergütungsweg und maximale Zeit bis RTB definieren. Frühe Phasen bieten mehr Marge, binden aber länger Kapital und Personal."],
            ["Vorprüfung am Teaser", "Lage, Netzsituation und Planungsstand grob plausibilisieren; bei Zweifeln früh absagen spart Beraterkosten."],
            ["NDA und Datenraum", "Unterlagen anfordern, Fragenliste strukturieren und Red Flags zuerst klären."],
            ["Bewertung", "Preis je kWp aus Phase, Risiko und Businessplan ableiten – etwa mit dem [Projektbewertungsrechner](/rechner/projektbewertung) als erstem Anker."],
            ["LOI und Exklusivität", "Preisrahmen, Meilensteine und Zeitplan festhalten; Exklusivität auf den Prüfzeitraum begrenzen."],
            ["SPA und Closing", "Garantien, Bedingungen und Long-Stop-Dates verhandeln, beurkunden, vollziehen."],
          ],
        },
      ],
    },
  ],

  faq: [
    {
      q: "Was bedeutet Ready-to-Build (RTB) bei Solarprojekten?",
      a: `[RTB](/wissen/lexikon#rtb) heißt: Alle Rechte für den Bau liegen vor – Flächensicherung mit Dienstbarkeiten, rechtskräftiges Planungsrecht, Baugenehmigung und Netzanschlusszusage. Übliche Preise liegen bei ${spanne(RTB)}.`,
    },
    {
      q: "Warum sind frühe Projektphasen so viel günstiger?",
      a: "Weil ein großer Teil früher Projekte nie gebaut wird – etwa weil der Gemeinderat nicht zustimmt oder der Netzanschluss zu teuer ist. Der Käufer übernimmt dieses Risiko und die weiteren Entwicklungskosten; der niedrige Preis ist die Kompensation dafür.",
    },
    {
      q: "Share Deal oder Asset Deal – was ist besser?",
      a: "Für die meisten Solarprojekte der Share Deal, weil alle Verträge in der Projektgesellschaft bleiben und keine Zustimmung von Verpächtern oder Netzbetreiber nötig ist. Dafür übernehmen Sie auch Altlasten der Gesellschaft, die über Garantien abgesichert werden müssen.",
    },
    {
      q: "Wie lange dauert eine Due Diligence?",
      a: "Bei einem gut aufbereiteten Datenraum in der Regel einige Wochen, bei frühen Projekten mit wenigen Unterlagen auch weniger. Fehlende Unterlagen, offene Grundbuchfragen oder Rückfragen beim Netzbetreiber verlängern das deutlich – deshalb wird die Exklusivität im LOI meist auf diesen Zeitraum abgestimmt.",
    },
    {
      q: "Was kostet die Projektbörse für Käufer?",
      a: `Nichts. Für Investoren ist die Nutzung ${PROVISION.kaeufer.text.replace("für Investoren ", "")}. Verkäufer zahlen ${PROVISION.verkaeufer.text}. Mehr unter [Projektbörse](/projektboerse).`,
    },
    {
      q: "Gilt das auch für Projekte in Österreich und der Schweiz?",
      a: "Der Ablauf ist ähnlich, die Rechtsgrundlagen unterscheiden sich: In Österreich sind Flächenwidmung, Netzzugangszusage sowie elektrizitäts- und naturschutzrechtliche Bewilligungen zentral (einen eigenen UVP-Tatbestand für Photovoltaik kennt das UVP-G nicht), die Anteilsübertragung verlangt einen Notariatsakt. In der Schweiz spielen Raumplanung und kantonales Recht die Hauptrolle. Lassen Sie die Prüfung von lokal zugelassenen Fachleuten begleiten.",
    },
  ],

  passend: [
    { href: "/ratgeber/solarpark-investment-rendite", titel: "Solarpark-Investment und Rendite", text: "Wie sich Kaufpreis, Capex und Erlöse zu einer Rendite verdichten." },
    { href: "/ratgeber/solarpark-genehmigung-bebauungsplan", titel: "Genehmigung und Bebauungsplan", text: "Vom Aufstellungs- zum Satzungsbeschluss." },
    { href: pfad("/rechner/projektbewertung"), titel: "Projektbewertung", text: "Preisspanne je kWp für Ihr Projekt." },
    { href: "/projektboerse", titel: "Projektbörse", text: "Aktuelle Projekte ansehen oder Suchprofil anlegen." },
    { href: "/investoren", titel: "Solarprojekte kaufen", text: "Phasenmodell, Preise und Datenraum für Investoren." },
    { href: pfad("/bestandsanlagen"), titel: "Bestandsanlagen kaufen", text: "Laufende Solarparks auf dem Zweitmarkt." },
  ],

  quellen: [
    { titel: "Bürgerliches Gesetzbuch – § 1090 BGB (Beschränkte persönliche Dienstbarkeit)", url: "https://www.gesetze-im-internet.de/bgb/__1090.html", stand: "09/2026" },
    { titel: "Bürgerliches Gesetzbuch – § 1092 BGB (Übertragbarkeit)", url: "https://www.gesetze-im-internet.de/bgb/__1092.html", stand: "09/2026" },
    { titel: "GmbH-Gesetz – § 15 GmbHG (Übertragung von Geschäftsanteilen)", url: "https://www.gesetze-im-internet.de/gmbhg/__15.html", stand: "09/2026" },
    { titel: "Grunderwerbsteuergesetz – § 1 GrEStG (Erwerbsvorgänge)", url: "https://www.gesetze-im-internet.de/grestg_1983/__1.html", stand: "09/2026" },
    { titel: "EEG 2023 – § 37 Gebote für Solaranlagen des ersten Segments", url: "https://www.gesetze-im-internet.de/eeg_2014/__37.html", stand: "09/2026" },
    { titel: "RIS – GmbH-Gesetz (Österreich) § 76", url: "https://www.ris.bka.gv.at/eli/rgbl/1906/58/P76/NOR12040505", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Ausschreibungen Solaranlagen erstes Segment", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html", stand: "09/2026" },
  ],

  seitenCta: { titel: "Was ist Ihr Projekt wert?", text: "Preisspanne je kWp nach Phase und Netzsituation.", href: pfad("/rechner/projektbewertung"), label: "Zur Projektbewertung" },
  cta: {
    title: "Projekte finden, die zu Ihrem Suchprofil passen.",
    text: "In der Projektbörse sehen Sie Solar-, Agri-PV- und Speicherprojekte nach Phase und Region – für Investoren kostenfrei, mit NDA und Datenraum.",
    primary: { label: "Zur Projektbörse", href: "/projektboerse" },
    secondary: { label: "Projekt bewerten", href: pfad("/rechner/projektbewertung") },
  },
};

export default artikel;
