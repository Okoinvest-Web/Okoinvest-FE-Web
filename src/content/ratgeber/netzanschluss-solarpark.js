// Ratgeber: Netzanschluss für Solarparks – Verfahren, Netzverknüpfungspunkt, Kosten, Engpässe, Überbauung
// Recherchestand 29.09.2026: EEG 2023 §§ 8, 8a, 16, 17; Solarspitzengesetz (BGBl. 2025 I Nr. 51, in Kraft
// 25.02.2025, Überblick Clearingstelle EEG|KWKG); Netzpaket – Regierungsentwurf, Kabinett 29.07.2026
// (Stiftung Umweltenergierecht, GÖRG 22.09.2026); E-Control, Aktionsplan Netzanschluss 2025.
// Kostenannahmen aus src/lib/invest/markt.js (FREIFLAECHE.kabelProMeter, netzanschlussFixProMwp).

import { FREIFLAECHE, FINANZIERUNG, REGIONEN, PHASEN, STAND, annuitaet } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtCt } from "@/lib/rechner/annahmen";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
// § 8 Abs. 6 EEG: Frist des Netzbetreibers für Zeitplan, Netzverträglichkeitsprüfung und Kostenvoranschlag
const PRUEF_FRIST_WOCHEN = 8;
// Solarspitzengesetz: flexible Netzanschlussvereinbarungen (§ 8a EEG) in Kraft seit
const SOLARSPITZEN_INKRAFT = "25. Februar 2025";
// Netzpaket (Regierungsentwurf): Kabinettsbeschluss und geplantes Inkrafttreten laut GÖRG, 22.09.2026
const NETZPAKET_KABINETT = "29. Juli 2026";
const NETZPAKET_GEPLANT = "1. Januar 2027";

/* Rechenbeispiel: 10 MWp Süddeutschland, Kabeltrasse unterschiedlich lang */
const MWP = 10;
const KWP = MWP * 1000;
const REGION = REGIONEN.find((r) => r.id === "de-sued");
const MWH = KWP * REGION.ertrag / 1000;
const FIX = MWP * FREIFLAECHE.netzanschlussFixProMwp;
const EPC = KWP * FREIFLAECHE.capexProKwp.mittel;
const VARIANTEN = [0.5, 2, 5, 10].map((km) => {
  const kosten = FIX + km * 1000 * FREIFLAECHE.kabelProMeter;
  const ctKwh = (annuitaet(kosten, FINANZIERUNG.zins, 20) / (MWH * 1000)) * 100;
  return { km, kosten, proKwp: kosten / KWP, anteil: kosten / EPC, ctKwh };
});
const V2 = VARIANTEN[1];
const V10 = VARIANTEN[3];
const NETZPHASE = PHASEN.find((p) => p.id === "netz");
const FLAECHENPHASE = PHASEN.find((p) => p.id === "flaeche");

const artikel = {
  slug: "netzanschluss-solarpark",
  title: "Netzanschluss für Solarparks: Ablauf, Kosten, Engpässe und Überbauung",
  seoTitle: "Netzanschluss Solarpark: Ablauf und Kosten | ÖkoInvest",
  kurzTitel: "Netzanschluss Solarpark",
  description:
    "Netzanschluss für Solarparks: § 8 EEG, Netzverknüpfungspunkt, Mittel- oder Hochspannung, Kosten je Kilometer, Wartezeiten, Überbauung und Netzpaket 2026.",
  excerpt:
    "Ohne Netzanschluss kein Solarpark. Wie das Verfahren nach § 8 EEG abläuft, was Kabel, Übergabestation und Umspannwerk kosten, warum es Wartezeiten gibt und wie Überbauung und Cable Pooling knappe Kapazität besser nutzen.",
  hauptKeyword: "netzanschluss solarpark",
  keywords: [
    "Netzanschluss Solarpark",
    "Netzanschluss Freiflächen-PV Kosten",
    "Netzverknüpfungspunkt Photovoltaik",
    "§ 8 EEG Netzanschluss",
    "Überbauung Netzanschluss",
    "flexible Netzanschlussvereinbarung",
    "Cable Pooling PV Speicher",
    "Netzpaket 2026",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Recht & Genehmigung",
  bild: "/img/pv-wind-abend.jpg",
  bildAlt: "Solarmodule im Vordergrund, dahinter Windenergieanlagen vor abendlichem Himmel",
  badge: { wert: `${fmt(FREIFLAECHE.kabelProMeter)} €/m`, text: "Kabeltrasse Mittelspannung inkl. Tiefbau, Orientierungswert" },

  kurzFazit: [
    `**Netzbetreiber müssen Solarparks nach § 8 EEG vorrangig am technisch und wirtschaftlich günstigsten Verknüpfungspunkt anschließen**; auf ein vollständiges Netzanschlussbegehren folgen binnen ${PRUEF_FRIST_WOCHEN} Wochen Zeitplan, Prüfergebnis und Kostenschätzung.`,
    `Die Kosten bis zum Netzverknüpfungspunkt trägt der Betreiber (§ 16 EEG): als Orientierung rund ${fmtEur(FREIFLAECHE.netzanschlussFixProMwp)} je MWp für Übergabestation und Trafo plus etwa ${fmt(FREIFLAECHE.kabelProMeter)} € je Meter Kabeltrasse.`,
    `Bei ${MWP} MWp und ${fmt(V10.km)} km Trasse kostet der Anschluss rund **${fmtEur(V10.kosten)}** – das entspricht etwa ${fmt(V10.ctKwh, 2)} ct/kWh über 20 Jahre und kann über die Wirtschaftlichkeit entscheiden.`,
    `Seit ${SOLARSPITZEN_INKRAFT} erlauben **flexible Netzanschlussvereinbarungen (§ 8a EEG)** die Überbauung eines Anschlusses; mehrere Anlagen können sich über Cable Pooling einen Netzverknüpfungspunkt teilen.`,
    `Das **Netzpaket** (Kabinett ${NETZPAKET_KABINETT}) soll Reservierung, Priorisierung nach Reifegrad und Baukostenzuschüsse für Erzeuger neu regeln – nach aktuellem Stand ist es noch nicht beschlossen.`,
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Wie bekommt ein Solarpark einen Netzanschluss?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Der Projektierer stellt beim zuständigen Netzbetreiber ein Netzanschlussbegehren; der Netzbetreiber prüft die Netzverträglichkeit, benennt einen Netzverknüpfungspunkt und reserviert – je nach Praxis – Kapazität, bis ein Netzanschlussvertrag geschlossen wird.** Danach baut der Betreiber Kabeltrasse und Übergabestation, weist die technischen Anforderungen per Anlagenzertifikat nach und nimmt den Park in Betrieb.",
        },
        {
          typ: "p",
          text: "Der Netzanschluss ist in vielen Regionen der Engpass der Projektentwicklung – nicht der Bebauungsplan und nicht das Modul. Er entscheidet über den Standort, über die Kosten und über den Zeitplan. Deshalb gehört die Netzanfrage an den Anfang: Ohne [Netzanschlusszusage](/wissen/lexikon#netzanschlusszusage) ist Baurecht wenig wert, und ohne Kapazität findet auch die beste Fläche keinen Käufer.",
        },
        {
          typ: "kennzahl",
          wert: `${fmt(NETZPHASE.preisProKwp.min)}–${fmt(NETZPHASE.preisProKwp.max)} €/kWp`,
          titel: "Projektwert mit Netzanschlusszusage",
          text: `Orientierung für gehandelte Projektrechte; eine reine Flächensicherung liegt bei ${fmt(FLAECHENPHASE.preisProKwp.min)}–${fmt(FLAECHENPHASE.preisProKwp.max)} €/kWp. Die Netzzusage ist einer der wertvollsten Meilensteine.`,
        },
      ],
    },
    {
      id: "rechtsrahmen",
      titel: "§ 8 EEG: Anspruch auf Anschluss und der richtige Netzverknüpfungspunkt",
      tocLabel: "§ 8 EEG",
      bloecke: [
        {
          typ: "p",
          text: "**Netzbetreiber müssen Anlagen zur Stromerzeugung aus erneuerbaren Energien nach § 8 Abs. 1 EEG unverzüglich vorrangig anschließen – an der Stelle, die für die Spannungsebene geeignet ist und die kürzeste Luftlinienentfernung hat, sofern nicht ein anderer Punkt technisch und wirtschaftlich günstiger ist.** Dieser Ort ist der [Netzverknüpfungspunkt](/wissen/lexikon#netzverknuepfungspunkt) (NVP).",
        },
        {
          typ: "tabelle",
          caption: "Die wichtigsten Regeln zum Netzanschluss im EEG, Stand September 2026",
          kopf: ["Regel", "Fundstelle", "Bedeutung für den Solarpark"],
          zeilen: [
            ["Anschlusspflicht und günstigster Verknüpfungspunkt", "§ 8 Abs. 1 EEG", "Gesamtwirtschaftlicher Vergleich: Anschlusskosten des Betreibers und Netzausbaukosten des Netzbetreibers"],
            ["Wahlrecht des Anlagenbetreibers", "§ 8 Abs. 2 EEG", "Anderer NVP möglich, wenn die Mehrkosten des Netzbetreibers nicht erheblich sind – Grundlage auch für gemeinsame Anschlüsse"],
            ["Zuweisung durch den Netzbetreiber", "§ 8 Abs. 3 EEG", "Netzbetreiber kann einen anderen Punkt zuweisen; Mehrkosten trägt dann er (§ 16 Abs. 2 EEG)"],
            ["Zeitplan und Prüfergebnis", "§ 8 Abs. 5 und 6 EEG", `Unverzüglich Zeitplan; spätestens ${PRUEF_FRIST_WOCHEN} Wochen nach vollständigen Unterlagen Ergebnis der Netzverträglichkeitsprüfung und Kostenvoranschlag`],
            ["Kosten des Anschlusses", "§ 16 EEG", "Betreiber zahlt Leitung bis zum NVP und Messeinrichtungen"],
            ["Kosten des Netzausbaus", "§ 17 EEG", "Optimierung, Verstärkung und Ausbau des Netzes trägt grundsätzlich der Netzbetreiber"],
            ["Flexible Netzanschlussvereinbarung", "§ 8a EEG", "Begrenzte Einspeiseleistung vertraglich vereinbart, Überbauung möglich"],
          ],
          minBreite: 760,
          fussnote: "Vereinfachte Darstellung nach gesetze-im-internet.de. Für Speicher gelten ergänzend Regeln des EnWG, etwa § 17 Abs. 2b EnWG für flexible Anschlüsse.",
        },
        {
          typ: "p",
          text: "Die Trennlinie zwischen § 16 und § 17 EEG ist in der Praxis der häufigste Streitpunkt: Was ist noch „Anschluss“ (zahlt der Betreiber), was schon „Netzausbau“ (zahlt der Netzbetreiber)? Muss etwa ein Transformator im bestehenden [Umspannwerk](/wissen/lexikon#umspannwerk) verstärkt werden, spricht viel für Netzausbau. Baut der Betreiber ein eigenes Umspannwerk, weil kein Mittelspannungsnetz die Leistung aufnehmen kann, ist das in der Regel Teil seines Anschlusses. Lassen Sie sich die Kostenaufteilung schriftlich und nachvollziehbar begründen.",
        },
      ],
    },
    {
      id: "ablauf",
      titel: "Vom Netzanschlussbegehren bis zur Inbetriebsetzung",
      tocLabel: "Ablauf",
      bloecke: [
        {
          typ: "p",
          text: "**Das Verfahren hat sechs Stationen – und der Zeitbedarf wird meist nicht durch die gesetzlichen Fristen bestimmt, sondern durch Netzberechnungen, Warteschlangen und Lieferzeiten für Transformatoren.**",
        },
        {
          typ: "ablauf",
          schritte: [
            ["Netzauskunft und Vorprüfung", "Viele Netzbetreiber bieten Portale oder Kapazitätskarten. Eine formlose Auskunft zeigt, ob ein Umspannwerk in Reichweite noch Luft hat – verbindlich ist sie nicht."],
            ["Netzanschlussbegehren", `Vollständiger Antrag mit Lageplan, Leistung, Anlagenkonzept und ggf. Speicher. Ab Vollständigkeit läuft die ${PRUEF_FRIST_WOCHEN}-Wochen-Frist aus § 8 Abs. 6 EEG.`],
            ["Netzverträglichkeitsprüfung und Zusage", "Der Netzbetreiber nennt NVP, Spannungsebene, Kosten und Zeitrahmen. Häufig ist die Reservierung befristet und an Fortschrittsnachweise gebunden."],
            ["Netzanschlussvertrag", "Regelt Anschlussleistung, technische Bedingungen, Eigentumsgrenze, Termine und ggf. Einspeisebegrenzungen."],
            ["Bau und Nachweise", "Kabeltrasse mit Dienstbarkeiten, Übergabe- oder Umspannstation, Schutztechnik, Fernwirktechnik. Ein [Anlagenzertifikat](/wissen/lexikon#anlagenzertifikat) nach VDE-AR-N 4110 oder 4120 ist in der Regel Voraussetzung."],
            ["Inbetriebsetzung und Register", "Zuschaltung durch den Netzbetreiber, Konformitätserklärung, Eintrag im [Marktstammdatenregister](/wissen/lexikon#marktstammdatenregister)."],
          ],
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Die 24-Monats-Frist nach dem Zuschlag",
          text: "Wer einen EEG-Zuschlag erhält, muss den Park innerhalb einer gesetzlichen Frist in Betrieb nehmen; sonst drohen Abschläge und Pönalen. Die Frist läuft ab Zuschlag, nicht ab Netzzusage. Ein Gebot ohne belastbaren Netzanschlusstermin ist deshalb riskant. Mehr im Ratgeber [EEG-Ausschreibung für Freiflächen](/ratgeber/eeg-ausschreibung-freiflaeche).",
        },
      ],
    },
    {
      id: "spannungsebene",
      titel: "Mittelspannung, Hochspannung oder eigenes Umspannwerk?",
      tocLabel: "Spannungsebene",
      bloecke: [
        {
          typ: "p",
          text: "**Kleinere und mittlere Solarparks werden in der Regel an das Mittelspannungsnetz (10 bis 30 kV) angeschlossen, große Parks an das Hochspannungsnetz (110 kV) – dann oft mit einem eigenen Umspannwerk.** Wo die Grenze liegt, hängt vom örtlichen Netz ab und nicht von einer festen Megawattzahl.",
        },
        {
          typ: "tabelle",
          caption: "Anschlussvarianten für Solarparks – Faustregeln, keine festen Grenzen",
          kopf: ["Variante", "Typische Parkgröße", "Was der Betreiber baut", "Einordnung"],
          zeilen: [
            ["Mittelspannung, Einspeisung in bestehende Leitung", "bis wenige MW", "Übergabestation, kurzes Kabel", "günstig, aber Kapazität der Leitung oft gering"],
            ["Mittelspannung, Kabel zum Umspannwerk", "einige MW bis etwa 20 MW", `Übergabestation, Kabeltrasse (rund ${fmt(FREIFLAECHE.kabelProMeter)} €/m)`, "häufigster Fall; Kosten wachsen mit der Entfernung"],
            ["Hochspannung, eigenes Umspannwerk 110 kV", "ab etwa 20 MW", "Umspannwerk mit Trafo, Schaltanlage, ggf. 110-kV-Leitung", "hohe Fixkosten, lohnt erst bei großer Leistung oder Pooling mehrerer Parks"],
            ["Gemeinsamer Anschluss (Cable Pooling)", "beliebig", "Anbindung an vorhandenen NVP, z. B. eines Windparks", "spart Trasse, braucht Zustimmung des Mitnutzers"],
          ],
          minBreite: 760,
          fussnote: "Orientierung. Welche Spannungsebene geeignet ist, legt der Netzbetreiber im Einzelfall fest (§ 8 Abs. 1 EEG). Technische Anschlussregeln: VDE-AR-N 4110 (Mittelspannung), VDE-AR-N 4120 (Hochspannung).",
        },
        {
          typ: "p",
          text: "Ein eigenes Umspannwerk kostet in der Regel einen siebenstelligen Betrag und hat lange Lieferzeiten für den Transformator. Es lohnt sich meist nur, wenn viel Leistung zusammenkommt – etwa mehrere Parks einer Region, ein Solarpark mit [Großspeicher](/grossspeicher) oder die Kombination mit Wind. Dafür ist man dann weniger abhängig von der Auslastung der Mittelspannung.",
        },
      ],
    },
    {
      id: "kosten",
      titel: "Was kostet der Netzanschluss eines Solarparks?",
      tocLabel: "Kosten",
      bloecke: [
        {
          typ: "p",
          text: `**Die Anschlusskosten bestehen im Kern aus einem Fixanteil für Übergabestation und Transformator (Orientierung ${fmtEur(FREIFLAECHE.netzanschlussFixProMwp)} je MWp) und der Kabeltrasse, die mit rund ${fmt(FREIFLAECHE.kabelProMeter)} € je Meter inklusive Tiefbau angesetzt werden kann.** Hinzu kommen Dienstbarkeiten für die Trasse, Gutachten, Anlagenzertifikat und gegebenenfalls Querungen von Straßen, Bahnlinien oder Gewässern.`,
        },
        {
          typ: "tabelle",
          caption: `Netzanschlusskosten für ${MWP} MWp in Abhängigkeit von der Trassenlänge, Stand ${STAND}`,
          kopf: ["Trasse", "Anschlusskosten", "je kWp", "Anteil an der Errichtung", "Mehrkosten je kWh (20 J.)"],
          zeilen: VARIANTEN.map((v) => [
            `${fmt(v.km, v.km < 1 ? 1 : 0)} km`,
            fmtEur(v.kosten),
            `${fmt(v.proKwp)} €`,
            `${fmt(v.anteil * 100)} %`,
            fmtCt(v.ctKwh, 2),
          ]),
          hervorheben: 1,
          markierteZeile: 1,
          minBreite: 700,
          fussnote: `Annahmen aus der ÖkoInvest-Marktübersicht: Fixanteil ${fmtEur(FREIFLAECHE.netzanschlussFixProMwp)}/MWp, Kabel ${fmt(FREIFLAECHE.kabelProMeter)} €/m, Errichtung ohne Netzanschluss ${fmt(FREIFLAECHE.capexProKwp.mittel)} €/kWp, Annuität bei ${fmt(FINANZIERUNG.zins * 100, 1)} % Zins über 20 Jahre, Ertrag ${fmt(REGION.ertrag)} kWh/kWp. Ohne eigenes Umspannwerk, ohne Baukostenzuschuss. Keine Angebote.`,
        },
        {
          typ: "p",
          text: `Die Rechnung zeigt, warum Pachtangebote je nach Entfernung zum Umspannwerk so stark schwanken: Zwischen ${fmt(V2.km)} und ${fmt(V10.km)} km Trasse liegen im Beispiel rund ${fmtEur(V10.kosten - V2.kosten)} – bei Zuschlagswerten um 5 ct/kWh ein spürbarer Teil der Marge. Wie sich das auf den Projektwert auswirkt, können Sie im [Solarpark-Rechner](/rechner/solarpark) und in der [Projektbewertung](/rechner/projektbewertung) durchspielen.`,
        },
        {
          typ: "h3",
          text: "Baukostenzuschuss: heute selten, künftig möglich",
        },
        {
          typ: "p",
          text: `Für reine Erzeugungsanlagen erheben Netzbetreiber in Deutschland bislang in der Regel keinen [Baukostenzuschuss](/wissen/lexikon#baukostenzuschuss); bei Batteriespeichern mit Netzbezug ist er dagegen üblich. Der Regierungsentwurf zum Netzpaket sieht vor, dass künftig auch Betreiber von Erzeugungsanlagen an den Netzausbaukosten beteiligt werden können; Verfahren und Kriterien soll die Bundesnetzagentur festlegen. Kalkulieren Sie Projekte, die erst ab ${NETZPAKET_GEPLANT} ans Netz gehen, deshalb mit einem Puffer.`,
        },
      ],
    },
    {
      id: "engpaesse",
      titel: "Wartezeiten, Netzengpässe und das Netzpaket 2026",
      tocLabel: "Engpässe & Netzpaket",
      bloecke: [
        {
          typ: "p",
          text: "**In vielen ländlichen Netzgebieten übersteigt die angefragte Einspeiseleistung die freie Kapazität um ein Vielfaches; Netzanschlusszusagen werden deshalb mit Wartezeiten von mehreren Jahren, befristeten Reservierungen oder nur mit Einspeisebegrenzung erteilt.** Hinzu kommen Abregelungen im laufenden Betrieb über [Redispatch](/wissen/lexikon#redispatch).",
        },
        {
          typ: "p",
          text: "Bisher galt bei Netzanfragen vielerorts faktisch „wer zuerst kommt, mahlt zuerst“. Das hat Anfragen für Projekte ohne Fläche oder Baurecht begünstigt, die Kapazität blockieren. Die Übertragungsnetzbetreiber haben für ihre Ebene nach Berichten zum 1. April 2026 ein Reifegradverfahren eingeführt; das Netzpaket soll Priorisierung und Reservierung nun gesetzlich regeln.",
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: `Netzpaket: Regierungsentwurf, noch kein geltendes Recht (Stand ${STAND})`,
          text: `Das Bundeskabinett hat den Entwurf am ${NETZPAKET_KABINETT} beschlossen; das parlamentarische Verfahren läuft, ein Inkrafttreten ist nach Berichten zum ${NETZPAKET_GEPLANT} geplant. Vorgesehen sind unter anderem: kapazitätslimitierte Netzgebiete, in denen neue Solar- und Windanlagen einen Anschluss unter Redispatchvorbehalt erhalten und für eine begrenzte Zeit auf einen Teil der Redispatch-Entschädigung verzichten; ein einheitliches Reservierungssystem mit Fristen, die an den Projektfortschritt gebunden sind; Priorisierung nach Reife und weiteren Kriterien; verpflichtende digitale Netzanschlussportale; Baukostenzuschüsse auch für Erzeuger. Einzelheiten können sich im Verfahren noch ändern.`,
        },
        {
          typ: "p",
          text: "Für Flächeneigentümer heißt das: Eine Netzanfrage ohne gesicherte Fläche und ohne Planungsschritte wird künftig eher weniger wert sein. Entwickler werden Pachtverträge, Aufstellungsbeschluss und Netzantrag enger takten. Für Investoren wird die Frage „Anschluss mit oder ohne Redispatchvorbehalt?“ Teil der [Due Diligence](/ratgeber/projektrechte-kaufen-due-diligence).",
        },
      ],
    },
    {
      id: "ueberbauung",
      titel: "Überbauung und Cable Pooling: mehr Leistung am selben Anschluss",
      tocLabel: "Überbauung & Pooling",
      bloecke: [
        {
          typ: "p",
          text: `**Seit ${SOLARSPITZEN_INKRAFT} können Netzbetreiber und Anlagenbetreiber nach § 8a EEG eine flexible Netzanschlussvereinbarung schließen: Die Einspeiseleistung am Anschluss wird begrenzt, dafür darf die installierte Leistung größer sein als die verfügbare Anschlusskapazität.** Diese Überbauung nutzt aus, dass ein Solarpark seine Nennleistung nur an wenigen Stunden im Jahr erreicht.`,
        },
        {
          typ: "p",
          text: "Die Vereinbarung muss nach § 8a Abs. 2 EEG mindestens regeln: die Höhe der begrenzten Einspeiseleistung, Zeitfenster mit unterschiedlichen Grenzen, die Dauer der Begrenzung, technische Anforderungen, die Haftung bei Überschreitung und – bei gemeinsamem Verknüpfungspunkt – die Zustimmung der anderen Betreiber. Weicht der günstigste Verknüpfungspunkt vom nächstgelegenen ab, muss der Netzbetreiber prüfen und mitteilen, ob eine flexible Vereinbarung grundsätzlich möglich wäre (§ 8a Abs. 3 EEG).",
        },
        {
          typ: "tabelle",
          caption: "Modelle, um knappe Netzkapazität besser zu nutzen",
          kopf: ["Modell", "Rechtsgrundlage", "Vorteil", "Worauf achten"],
          zeilen: [
            ["Überbauung per [flexibler Netzanschlussvereinbarung](/wissen/lexikon#flexible-netzanschlussvereinbarung)", "§ 8a EEG (Solarspitzengesetz)", "mehr Leistung ohne Netzausbau, schnellerer Anschluss", "Abregelungsverluste, keine Anschlusspflicht für die Überbauung, Haftung"],
            ["[Cable Pooling](/wissen/lexikon#cable-pooling): PV an bestehenden Anschluss, z. B. Windpark", "§ 8 Abs. 2 EEG, ggf. mit § 8a", "Trasse und Umspannwerk werden geteilt, Wind und Sonne ergänzen sich", "Zustimmung und Vertrag mit dem Mitnutzer, Messkonzept, Redispatch-Zuordnung"],
            ["Solarpark mit Speicher am selben Netzverknüpfungspunkt", "§ 8a EEG, § 17 Abs. 2b EnWG", "Mittagsspitzen werden verschoben, Anschluss besser ausgelastet", "Speicher kann Baukostenzuschuss auslösen, Messkonzept für EEG-Förderung"],
            ["Klassischer Anschluss in voller Höhe", "§ 8 Abs. 1 EEG", "volle Einspeisung, einfach finanzierbar", "oft lange Wartezeit oder hohe Trassenkosten"],
          ],
          minBreite: 780,
          fussnote: "Vereinfachte Übersicht, Stand September 2026. Die Ausgestaltung variiert je Netzbetreiber; Musterverträge und Leitfäden gibt es u. a. von Fachagenturen und Verbänden.",
        },
        {
          typ: "p",
          text: "Wirtschaftlich rechnet sich die Überbauung, wenn die abgeregelte Energie klein ist im Verhältnis zur zusätzlich installierten Leistung. Mit einem Speicher lässt sich ein Teil der Spitze in die Abendstunden verschieben – die Erlösseite erklärt der Ratgeber [Großspeicher-Erlöse](/ratgeber/grossspeicher-erloese). Zusammen mit den Regeln zu negativen Preisen verändert das die Auslegung neuer Parks spürbar; mehr dazu im Ratgeber [Negative Strompreise und Solarspitzengesetz](/ratgeber/negative-strompreise-solarspitzengesetz).",
        },
      ],
    },
    {
      id: "oesterreich-schweiz",
      titel: "Netzanschluss in Österreich und der Schweiz",
      tocLabel: "Österreich & Schweiz",
      bloecke: [
        {
          typ: "p",
          text: "**In Österreich beantragen Sie den Netzzugang beim Verteilernetzbetreiber; die Netzbetreiber müssen verfügbare und gebuchte Kapazitäten je Umspannwerk mindestens vierteljährlich veröffentlichen.** Die Regulierungsbehörde E-Control bündelt die Links und hat mit ihrem Aktionsplan Netzanschluss Verfahren und Transparenz verbessert. Mit dem neuen Elektrizitätswirtschaftsgesetz (ElWG) werden Netzzutritts- und Netzbereitstellungsentgelt zu einem leistungsbezogenen Netzanschlussentgelt zusammengefasst; Details im Ratgeber [Freiflächen-PV in Österreich](/ratgeber/freiflaechen-pv-oesterreich).",
        },
        {
          typ: "p",
          text: "In der **Schweiz** ist der Verteilnetzbetreiber verpflichtet, Elektrizität aus erneuerbaren Anlagen abzunehmen; die Anschlusskosten und die Frage, ob eine Netzverstärkung über die Netznutzung finanziert wird, klärt der Netzbetreiber im Einzelfall. Bei alpinen Anlagen treiben Leitungen und Erschließung die Kosten besonders. Einordnung im Ratgeber [Freiflächen-PV in der Schweiz](/ratgeber/freiflaechen-pv-schweiz).",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "So gehen Sie beim Netzanschluss vor",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "checkliste",
          punkte: [
            "**Früh anfragen:** Netzauskunft vor oder parallel zur Flächensicherung einholen – nicht erst nach dem Bebauungsplan.",
            "**Unterlagen vollständig einreichen:** Erst dann läuft die Acht-Wochen-Frist nach § 8 Abs. 6 EEG.",
            "**NVP-Vorschlag prüfen:** Ist der zugewiesene Punkt wirklich der gesamtwirtschaftlich günstigste? Bei Zuweisung trägt der Netzbetreiber die Mehrkosten.",
            "**Kostenaufteilung schriftlich klären:** Was ist Anschluss (§ 16), was Netzausbau (§ 17)?",
            "**Flexible Optionen erfragen:** Überbauung, Cable Pooling oder Speicher können Jahre sparen.",
            "**Trasse sichern:** Dienstbarkeiten für Kabel über fremde Grundstücke rechtzeitig verhandeln – sie sind oft der unterschätzte Zeitfresser.",
            "**Reservierungsfristen im Blick behalten:** Fortschrittsnachweise einplanen, damit die Zusage nicht verfällt.",
          ],
        },
        {
          typ: "p",
          text: "Wer als Eigentümer eine Fläche anbietet, kann die Netzfrage nicht selbst lösen, sollte sie aber kennen: Die Entfernung zum nächsten Umspannwerk ist eine der ersten Fragen im [Flächencheck](/flaechencheck). Investoren finden Projekte mit gesicherter Netzzusage in der [Projektbörse](/projektboerse).",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Wer zahlt den Netzanschluss eines Solarparks?",
      a: "Die Kosten für die Leitung bis zum Netzverknüpfungspunkt und die Messeinrichtungen trägt der Anlagenbetreiber (§ 16 EEG). Optimierung, Verstärkung und Ausbau des öffentlichen Netzes trägt grundsätzlich der Netzbetreiber (§ 17 EEG).",
    },
    {
      q: "Wie lange dauert ein Netzanschluss für einen Solarpark?",
      a: `Die Prüfung ist nach § 8 Abs. 6 EEG binnen ${PRUEF_FRIST_WOCHEN} Wochen nach vollständigen Unterlagen abzuschließen. Bis zum tatsächlichen Anschluss vergehen je nach Netzgebiet aber oft ein bis mehrere Jahre, vor allem wenn Umspannwerke ausgebaut werden müssen.`,
    },
    {
      q: "Was kostet ein Kilometer Kabeltrasse?",
      a: `Als Orientierung rund ${fmtEur(FREIFLAECHE.kabelProMeter * 1000)} je Kilometer Mittelspannung inklusive Tiefbau (${fmt(FREIFLAECHE.kabelProMeter)} €/m). Querungen, felsiger Untergrund oder Hochspannung können deutlich teurer sein.`,
    },
    {
      q: "Was bedeutet Überbauung des Netzanschlusses?",
      a: `Die installierte Leistung ist größer als die zugesagte Einspeiseleistung; die Einspeisung wird technisch begrenzt. Rechtsgrundlage ist seit ${SOLARSPITZEN_INKRAFT} die flexible Netzanschlussvereinbarung nach § 8a EEG.`,
    },
    {
      q: "Kann ein Solarpark den Anschluss eines Windparks mitnutzen?",
      a: "Ja, das nennt man Cable Pooling. Der Betreiber kann nach § 8 Abs. 2 EEG einen anderen geeigneten Verknüpfungspunkt wählen; nötig sind die Zustimmung des bestehenden Betreibers und klare Regeln zu Messung, Begrenzung und Haftung.",
    },
    {
      q: "Gilt das Netzpaket schon?",
      a: `Nein, Stand ${STAND} ist es ein Regierungsentwurf (Kabinett ${NETZPAKET_KABINETT}), der noch vom Bundestag beschlossen werden muss. Geplant ist ein Inkrafttreten zum ${NETZPAKET_GEPLANT}.`,
    },
  ],

  passend: [
    { href: "/ratgeber/projektrechte-kaufen-due-diligence", titel: "Projektrechte kaufen", text: "Netzzusage und weitere Punkte der Due Diligence." },
    { href: "/ratgeber/negative-strompreise-solarspitzengesetz", titel: "Negative Strompreise", text: "Solarspitzengesetz und was es für Parks bedeutet." },
    { href: "/rechner/projektbewertung", titel: "Projektbewertung", text: "Was ein Projekt mit Netzzusage wert ist." },
    { href: "/grossspeicher", titel: "Großspeicher", text: "Speicher am Netzverknüpfungspunkt des Solarparks." },
    { href: "/rechner/netzanschluss", titel: "Netzanschluss-Rechner", text: "Grobe Kosten für Trasse, Übergabestation und Umspannwerk." },
    { href: "/freiflaeche", titel: "Freiflächen-PV entwickeln", text: "Vom Netzanschluss bis zum Betrieb eines Solarparks." },
  ],

  quellen: [
    { titel: "EEG 2023, § 8 – Anschluss (Netzverknüpfungspunkt, Fristen)", url: "https://www.gesetze-im-internet.de/eeg_2014/__8.html", stand: "09/2026" },
    { titel: "EEG 2023, § 8a – Flexible Netzanschlussvereinbarungen", url: "https://www.gesetze-im-internet.de/eeg_2014/__8a.html", stand: "09/2026" },
    { titel: "EEG 2023, § 16 – Netzanschlusskosten", url: "https://www.gesetze-im-internet.de/eeg_2014/__16.html", stand: "09/2026" },
    { titel: "Clearingstelle EEG|KWKG – Das Solarspitzengesetz: Ein Überblick", url: "https://www.clearingstelle-eeg-kwkg.de/sites/default/files/2025-07/Das_Solarspitzengesetz_Ein_Ueberblick.pdf", stand: "09/2026" },
    { titel: "Stiftung Umweltenergierecht – Netzpaket (Newsletter April 2026)", url: "https://stiftung-umweltenergierecht.de/e-letter/newsletter-april-2026/netzpaket/", stand: "09/2026" },
    { titel: "GÖRG – Bundesregierung beschließt Netzpaket (22.09.2026)", url: "https://www.goerg.de/de/aktuelles/veroeffentlichungen/22-09-2026/bundesregierung-beschliesst-netzpaket-kein-anschluss-unter-dieser-nummer", stand: "09/2026" },
    { titel: "E-Control – Aktionsplan Netzanschluss 2025, Abschlussbericht", url: "https://www.e-control.at/documents/1785851/1811582/Aktionsplan-Netzanschluss-Abschlussbericht.pdf/931405c8-b928-6217-f3cf-8bbf8cd57220?t=1757930324872", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Was kostet Ihr Anschluss?",
    text: "Netzkosten, Ertrag und Rendite überschlägig rechnen.",
    href: "/rechner/solarpark",
    label: "Zum Solarpark-Rechner",
  },
  cta: {
    title: "Fläche mit Netzperspektive?",
    text: "Im Flächencheck schauen wir auf Entfernung zum Umspannwerk, Kulisse und Planungsrecht. Für Flächeneigentümer ist die Plattform von ÖkoInvest kostenfrei.",
    primary: { label: "Zum Flächencheck", href: "/flaechencheck" },
    secondary: { label: "Projekte in der Börse", href: "/projektboerse" },
  },
};

export default artikel;
