// Ratgeber: PPA für Unternehmen und Mittelstand – Modelle, Preise, Risiken, Stromsteuer
// Recherchestand 29.09.2026 (dena/Marktoffensive PPA-Marktanalyse 2025, Pexapark via pv magazine,
// StromStG §§ 9, 9b, Bundestag 13.11.2025, UBA Herkunftsnachweisregister).

import { ERLOESE, STROM } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtPct } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* Werte, die (noch) nicht in markt.js stehen – mit Quelle */
// dena / Marktoffensive Erneuerbare Energien, PPA-Marktanalyse 2025 (April 2026):
// indikative Preise 10 Jahre, pay-as-produced, €/MWh
const DENA_PPA = { solar: { min: 35, max: 45 }, onshore: { min: 55, max: 65 } };
// dena: Zahl der PPA- und FPA-Abschlüsse in Deutschland
const DENA_ANZAHL_PPA = { 2024: 51, 2025: 27 };
// Stromsteuer-Entlastung produzierendes Gewerbe: Mindestverbrauch 12,5 MWh/Jahr (Bundestag, 13.11.2025)
const STROMSTEUER_MINDESTVERBRAUCH_MWH = 12.5;

const ct = (id) => STROM.bestandteile.find((b) => b.id === id).ct;
const BESCHAFFUNG = ct("beschaffung");
const STROMSTEUER_REGEL = ct("stromsteuer");
const GESAMT = STROM.bestandteile.reduce((s, b) => s + b.ct, 0);
const ctFmt = (n) => `${fmt(n, 1)} ct/kWh`;

/* Rechenbeispiel: Mittelständler mit 3 GWh Jahresverbrauch */
const VERBRAUCH_KWH = 3_000_000;
const PPA_ANTEIL = (STROM.ppaDeckungsanteil.min + STROM.ppaDeckungsanteil.max) / 2;
const PPA_KWH = VERBRAUCH_KWH * PPA_ANTEIL;
const beispiel = (preis) => ({
  preis,
  differenz: BESCHAFFUNG - preis,
  vorteil: ((BESCHAFFUNG - preis) / 100) * PPA_KWH,
});
const B_MIN = beispiel(ERLOESE.ppaCt.min);
const B_MITTEL = beispiel(ERLOESE.ppaCt.mittel);
const B_MAX = beispiel(ERLOESE.ppaCt.max);
const STEUER_ERSPARNIS = ((STROMSTEUER_REGEL - STROM.stromsteuerProduzierend) / 100) * VERBRAUCH_KWH;

const POOL_MIN = STROM.poolHebel.reduce((s, h) => s + h.ct.min, 0);
const POOL_MAX = STROM.poolHebel.reduce((s, h) => s + h.ct.max, 0);

const artikel = {
  slug: "ppa-fuer-unternehmen",
  title: "PPA für Unternehmen: Grünstrom direkt vom Solarpark beziehen",
  seoTitle: "PPA für Unternehmen und Mittelstand 2026 | ÖkoInvest",
  kurzTitel: "PPA für Unternehmen",
  description:
    "PPA für Unternehmen: On-site oder Off-site, physisch oder virtuell, Preise 2026, Risiken, Herkunftsnachweise und Stromsteuer – und ab wann sich ein PPA lohnt.",
  excerpt:
    "Ein Power Purchase Agreement sichert Strompreise über Jahre ab. Welche Modelle es gibt, was Solar-PPAs kosten, welche Risiken beim Abnehmer bleiben und welche Alternative es für kleinere Betriebe gibt.",
  hauptKeyword: "ppa für unternehmen",
  keywords: [
    "PPA für Unternehmen",
    "Power Purchase Agreement Mittelstand",
    "Solar-PPA Preis",
    "Corporate PPA",
    "virtuelles PPA",
    "PPA Herkunftsnachweise",
    "Stromsteuer produzierendes Gewerbe",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Strom, Markt & Gemeinschaft",
  bild: "/img/gewerbedach.jpg",
  bildAlt: "Techniker mit Schutzhelm und Warnjacke kniet auf dem Flachdach einer Gewerbehalle zwischen Solarmodulen",
  badge: { wert: `${fmt(DENA_PPA.solar.min)}–${fmt(DENA_PPA.solar.max)} €/MWh`, text: "Solar-PPA, 10 Jahre, indikativ 2025 (dena)" },

  kurzFazit: [
    "Ein **PPA (Power Purchase Agreement)** ist ein langfristiger Liefervertrag direkt mit einem Erzeuger – meist über 3 bis 15 Jahre, zu einem festen oder begrenzten Preis.",
    `Solar-PPAs mit 10 Jahren Laufzeit lagen 2025 laut dena-Marktanalyse indikativ bei **${fmt(DENA_PPA.solar.min)}–${fmt(DENA_PPA.solar.max)} €/MWh** (3,5–4,5 ct/kWh) auf Erzeugerebene. Für Abnehmer kommen Kosten für Strukturierung und Ausgleich hinzu.`,
    "Der Preis ist nicht alles: Ein Solar-PPA liefert **mittags viel und nachts nichts**. Das Profil-, Volumen- und Kreditrisiko entscheidet, ob sich der Vertrag rechnet.",
    `Produzierendes Gewerbe zahlt seit 1. Januar 2026 dauerhaft nur noch **${fmt(STROM.stromsteuerProduzierend, 2)} ct/kWh Stromsteuer** statt ${fmt(STROMSTEUER_REGEL, 2)} ct (über den Entlastungsantrag).`,
    "Off-site-PPAs lohnen sich in der Regel erst bei größeren Mengen. Für kleinere Betriebe kann ein **gebündelter Einkauf** die Alternative sein.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Was ist ein PPA – und für wen lohnt es sich?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Ein [PPA](/wissen/lexikon#ppa) ist ein langfristiger Stromliefervertrag zwischen einem Unternehmen und dem Betreiber einer Erneuerbare-Energien-Anlage, der den Strompreis für einen Teil des Verbrauchs über viele Jahre festschreibt.** Unternehmen sichern sich damit gegen steigende Großhandelspreise ab und können den Grünstrom mit [Herkunftsnachweisen](/wissen/lexikon#herkunftsnachweis) belegen. Betreiber bekommen im Gegenzug planbare Erlöse, mit denen sie einen Solarpark ohne EEG-Förderung finanzieren können.",
        },
        {
          typ: "p",
          text: "Ob sich ein PPA lohnt, hängt weniger vom Preis pro Kilowattstunde ab als von drei Fragen: Passt das Erzeugungsprofil zu Ihrem Verbrauch? Ist die abgenommene Menge groß genug, dass sich Vertragsaufwand und Strukturierung verteilen? Und wie viel Preisrisiko möchten Sie über zehn Jahre fest binden? Für einen Betrieb mit Einschichtbetrieb und hoher Tageslast passt ein Solar-PPA gut; für einen Kühlhausbetreiber mit gleichmäßiger Last rund um die Uhr nur als Baustein.",
        },
        {
          typ: "kennzahl",
          wert: `${fmt(DENA_PPA.solar.min)}–${fmt(DENA_PPA.solar.max)} €/MWh`,
          titel: "indikativer Solar-PPA-Preis 2025, 10 Jahre, pay-as-produced",
          text: `Onshore-Wind lag bei ${fmt(DENA_PPA.onshore.min)}–${fmt(DENA_PPA.onshore.max)} €/MWh. Quelle: dena / Marktoffensive Erneuerbare Energien, PPA-Marktanalyse 2025. Aktuelle Preise veröffentlicht Pexapark.`,
        },
      ],
    },
    {
      id: "modelle",
      titel: "Die PPA-Modelle im Überblick",
      tocLabel: "PPA-Modelle",
      bloecke: [
        {
          typ: "p",
          text: "**PPAs unterscheiden sich in drei Dimensionen: wo die Anlage steht (on-site oder off-site), ob Strom physisch geliefert oder nur finanziell abgerechnet wird, und in welchem Profil geliefert wird.** Daraus ergeben sich sehr unterschiedliche Verträge.",
        },
        {
          typ: "tabelle",
          caption: "PPA-Modelle für Unternehmen im Vergleich",
          kopf: ["Modell", "Funktionsweise", "Geeignet für", "Worauf achten"],
          zeilen: [
            ["On-site-PPA", "Anlage auf dem eigenen Dach, Parkplatz oder Grundstück; Betreiber ist ein Dritter, Strom fließt ohne öffentliches Netz", "Betriebe mit großer Dach- oder Parkfläche und Tageslast", "Stromsteuer-Befreiung und Netzentgelt-Vorteile prüfen; Laufzeit an Dach und Mietvertrag koppeln"],
            ["Off-site-PPA, physisch (sleeved)", "Strom aus einem entfernten Park wird über das Netz geliefert; ein Versorger übernimmt Bilanzkreis und Reststrom", "mittlere und größere Verbraucher", "Kosten für Sleeving, Profil und Ausgleichsenergie"],
            ["Virtuelles / finanzielles PPA", "Differenzvertrag: Erzeuger verkauft am Markt, beide Seiten gleichen die Differenz zum Festpreis aus; Herkunftsnachweise werden separat übertragen", "große, oft international tätige Unternehmen", "bilanzielle Behandlung als Derivat möglich; Basisrisiko"],
          ],
          minBreite: 760,
        },
        { typ: "h3", text: "Pay-as-produced, Baseload oder Profil" },
        {
          typ: "p",
          text: "Beim **Pay-as-produced**-PPA nehmen Sie jede erzeugte Kilowattstunde zum Festpreis ab – egal, wann sie anfällt. Das ist die günstigste Struktur, lässt aber das Profilrisiko beim Abnehmer: An sonnigen Mittagen kommt mehr Strom, als Sie brauchen, abends fehlt er. Beim **Baseload**-PPA liefert der Erzeuger ein gleichmäßiges Band; die Differenz zur tatsächlichen Erzeugung muss er selbst beschaffen, was den Preis erhöht. Dazwischen liegen **Profil-PPAs**, die sich an Ihrem Lastgang orientieren. Solar-PPAs mit Speicher (Hybrid) gewinnen an Bedeutung, weil sie Mittagsstrom in den Abend verschieben können – mehr dazu im Ratgeber [Großspeicher-Erlöse](/ratgeber/grossspeicher-erloese).",
        },
        {
          typ: "p",
          text: `Die Laufzeiten werden kürzer: Laut dena-Analyse schlossen Unternehmen 2025 vermehrt PPAs unter fünf Jahren ab, und die Zahl der PPA- und FPA-Abschlüsse in Deutschland sank von ${DENA_ANZAHL_PPA[2024]} auf ${DENA_ANZAHL_PPA[2025]}. Neue Solarparks ohne EEG-Zuschlag brauchen für die Finanzierung aber meist 10 Jahre oder mehr.`,
        },
      ],
    },
    {
      id: "preise",
      titel: "Was kostet ein PPA – und was spart es?",
      tocLabel: "Preise und Rechenbeispiel",
      bloecke: [
        {
          typ: "p",
          text: `**Der PPA-Preis ersetzt nur die Beschaffungskomponente Ihres Strompreises – Netzentgelte, Umlagen und Steuern bleiben.** Von rund ${ctFmt(GESAMT)} netto, die ein Mittelständler 2026 nach unserer Aufschlüsselung zahlt, entfallen etwa ${ctFmt(BESCHAFFUNG)} auf Beschaffung und Vertrieb. Nur dieser Teil lässt sich durch ein PPA beeinflussen.`,
        },
        {
          typ: "tabelle",
          caption: "Bestandteile des gewerblichen Strompreises in Deutschland, Neuverträge 2026 (Orientierung)",
          kopf: ["Bestandteil", "ct/kWh netto", "durch PPA beeinflussbar?"],
          zeilen: [
            ...STROM.bestandteile.map((b) => [b.label, fmt(b.ct, 2), b.beeinflussbar ? "ja" : "nein"]),
            ["Summe", fmt(GESAMT, 2), ""],
          ],
          markierteZeile: 0,
          minBreite: 520,
          fussnote: `Grobe Aufteilung auf Basis der BDEW-Strompreisanalyse und eigener Einschätzung. Für produzierendes Gewerbe sinkt die Stromsteuer nach Entlastung auf ${fmt(STROM.stromsteuerProduzierend, 2)} ct/kWh.`,
        },
        {
          typ: "p",
          text: `**Rechenbeispiel:** Ein Betrieb verbraucht ${fmt(VERBRAUCH_KWH / 1000)} MWh im Jahr und deckt ${fmtPct(PPA_ANTEIL, 0)} davon (${fmt(PPA_KWH / 1000)} MWh) über ein Solar-PPA – typisch sind ${fmtPct(STROM.ppaDeckungsanteil.min, 0)} bis ${fmtPct(STROM.ppaDeckungsanteil.max, 0)}, weil Solarstrom nur tagsüber anfällt. Die Tabelle zeigt die rechnerische Differenz zur Beschaffungskomponente von ${ctFmt(BESCHAFFUNG)} – vor den Kosten für Profil, Ausgleichsenergie und Sleeving.`,
        },
        {
          typ: "tabelle",
          caption: `Rechnerischer Beschaffungsvorteil bei ${fmt(PPA_KWH / 1000)} MWh PPA-Menge pro Jahr`,
          kopf: ["", "PPA günstig", "PPA mittel", "PPA teuer"],
          zeilen: [
            ["PPA-Preis (Abnehmer)", ctFmt(B_MIN.preis), ctFmt(B_MITTEL.preis), ctFmt(B_MAX.preis)],
            ["Differenz zur Beschaffung", ctFmt(B_MIN.differenz), ctFmt(B_MITTEL.differenz), ctFmt(B_MAX.differenz)],
            ["Brutto-Vorteil pro Jahr", fmtEur(B_MIN.vorteil), fmtEur(B_MITTEL.vorteil), fmtEur(B_MAX.vorteil)],
            ["Break-even: max. Aufschlag für Profil und Ausgleich", ctFmt(B_MIN.differenz), ctFmt(B_MITTEL.differenz), ctFmt(B_MAX.differenz)],
          ],
          hervorheben: 2,
          minBreite: 620,
          fussnote: "Vereinfachte Rechnung. Der Beschaffungsanteil enthält Vertriebsmarge und Strukturierung des bisherigen Liefervertrags; der Reststrom wird nach einem PPA teurer, weil ihm die günstigen Mittagsstunden fehlen. Der tatsächliche Vorteil ist deshalb deutlich kleiner als der Brutto-Wert und muss mit echten Angeboten und Ihrem Lastgang gerechnet werden.",
        },
        {
          typ: "p",
          text: `Die PPA-Preise in unseren Rechnern (${ctFmt(ERLOESE.ppaCt.min)} bis ${ctFmt(ERLOESE.ppaCt.max)}) liegen bewusst über den dena-Werten auf Erzeugerebene, weil kleinere Abnahmemengen und Lieferung über einen Versorger Aufschläge verursachen. Den eigenen Fall rechnen Sie mit dem [Reststrom-Rechner](/rechner/reststrom).`,
        },
        {
          typ: "tool",
          href: pfad("/rechner/reststrom"),
          titel: "Was kostet Ihr Reststrom – und was ließe sich sparen?",
          text: "Verbrauch, Eigenerzeugung und Branche eingeben: Der Rechner zeigt die Preisbestandteile und das Potenzial eines gebündelten Einkaufs.",
          label: "Zum Reststrom-Rechner",
        },
      ],
    },
    {
      id: "risiken",
      titel: "Risiken, die beim Abnehmer bleiben",
      tocLabel: "Risiken",
      bloecke: [
        {
          typ: "karten",
          cols: 2,
          items: [
            { titel: "Profilrisiko", text: "Solarstrom kommt zur Mittagszeit, wenn er ohnehin billig ist. 2025 fiel laut dena knapp ein Viertel der Solarerzeugung in Stunden mit negativen Preisen. Überschüsse müssen Sie verkaufen, Lücken zukaufen – die sinkende [Capture Rate](/wissen/lexikon#capture-rate) trifft bei Pay-as-produced den Abnehmer." },
            { titel: "Volumenrisiko", text: "Ein schlechtes Solarjahr liefert weniger, eine Produktionsdrosselung im eigenen Betrieb senkt den Bedarf. Mindest- und Höchstmengen sowie Regeln für negative Preisstunden gehören in den Vertrag." },
            { titel: "Preisrisiko", text: "Fällt der Großhandelspreis unter den PPA-Preis, zahlen Sie über Jahre mehr als der Markt. Ein PPA ist eine Absicherung, keine garantierte Ersparnis." },
            { titel: "Kreditrisiko", text: "Der Erzeuger will wissen, ob Sie zehn Jahre zahlen können – oft werden Sicherheiten oder Bürgschaften verlangt. Umgekehrt sollten Sie prüfen, ob die Anlage tatsächlich gebaut wird." },
          ],
        },
        { typ: "h3", text: "Bilanzkreis und Ausgleichsenergie" },
        {
          typ: "p",
          text: "Physisch gelieferter Strom muss viertelstundengenau in einen Bilanzkreis eingeplant werden. Weicht die Erzeugung von der Prognose ab, fällt Ausgleichsenergie an. Die meisten Mittelständler haben keinen eigenen Bilanzkreis; diese Aufgabe übernimmt beim Sleeved-PPA ein Versorger, der den PPA-Strom mit dem Reststrom zu einer Vollversorgung zusammenführt – gegen eine Gebühr. Fragen Sie in Angeboten gezielt nach, welche Kosten für Profil, Ausgleichsenergie und Herkunftsnachweise enthalten sind.",
        },
      ],
    },
    {
      id: "recht",
      titel: "Herkunftsnachweise und Stromsteuer",
      tocLabel: "Herkunftsnachweise und Steuern",
      bloecke: [
        {
          typ: "p",
          text: "**Grünstrom aus einem PPA lässt sich nur mit Herkunftsnachweisen belegen – und die gibt es in Deutschland ausschließlich für Strom, der keine EEG-Förderung erhält.** Das Umweltbundesamt führt das Herkunftsnachweisregister und verhindert so die Doppelvermarktung. Für Nachhaltigkeitsberichte (etwa Scope-2-Bilanz nach marktbasierter Methode) sollten Sie deshalb auf einen PPA mit einer ungeförderten Anlage achten und die Übertragung der Herkunftsnachweise vertraglich regeln.",
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Rechtslage Stromsteuer (Deutschland, Stand September 2026)",
          text: `Der Regelsatz beträgt ${fmt(STROMSTEUER_REGEL, 2)} ct/kWh. Unternehmen des produzierenden Gewerbes sowie der Land- und Forstwirtschaft werden seit 1. Januar 2026 dauerhaft auf den EU-Mindestsatz von ${fmt(STROM.stromsteuerProduzierend, 2)} ct/kWh entlastet, sofern sie mehr als ${fmt(STROMSTEUER_MINDESTVERBRAUCH_MWH, 1)} MWh im Jahr verbrauchen (Beschluss des Bundestags vom 13.11.2025; Entlastung auf Antrag beim Hauptzollamt nach § 9b StromStG). Bei einem On-site-PPA kann Strom aus Anlagen bis 2 MW, der im räumlichen Zusammenhang zur Anlage verbraucht wird, nach § 9 Abs. 1 Nr. 3 StromStG steuerbefreit sein. Voraussetzungen und Anzeigepflichten bitte mit Steuerberatung und Hauptzollamt klären.`,
        },
        {
          typ: "p",
          text: `Für ein produzierendes Unternehmen mit ${fmt(VERBRAUCH_KWH / 1000)} MWh Verbrauch macht die Entlastung rund ${fmtEur(STEUER_ERSPARNIS)} pro Jahr aus – unabhängig davon, ob ein PPA abgeschlossen wird. In **Österreich** werden Herkunftsnachweise über die E-Control abgewickelt, und statt der Stromsteuer gilt die Elektrizitätsabgabe mit eigenen Sätzen. In der **Schweiz** stellt Pronovo die Herkunftsnachweise aus. Grundsätze und Risiken eines PPA sind in allen drei Ländern vergleichbar.`,
        },
      ],
    },
    {
      id: "mittelstand",
      titel: "Zu klein für ein PPA? Gebündelt einkaufen",
      tocLabel: "Alternative für den Mittelstand",
      bloecke: [
        {
          typ: "p",
          text: "**Ein eigenes Off-site-PPA lohnt sich in der Regel erst ab Abnahmemengen, bei denen Vertragsverhandlung, Bonitätsprüfung und Strukturierung im Verhältnis zur Ersparnis stehen – für viele Mittelständler ist das nicht der Fall.** Eine Alternative ist die Bündelung: Mehrere Unternehmen kaufen ihren Reststrom gemeinsam ein, strukturiert in Tranchen und mit einem Anteil Solarstrom aus Parks für die Tagesstunden.",
        },
        {
          typ: "p",
          text: "Genau dafür ist der [Reststrom-Pool](/reststrom) gedacht: Unternehmen, denen die ÖKOVOLT Gruppe Photovoltaik und Speicher baut, brauchen trotzdem Strom aus dem Netz – nachts, im Winter und bei Lastspitzen. Diesen Reststrom bündelt ÖkoInvest über ihr [virtuelles Kraftwerk](/virtuelles-kraftwerk). Die möglichen Hebel sind in der Tabelle vorsichtig beziffert; sie wirken ausschließlich auf die Beschaffungskomponente und sind keine Zusage.",
        },
        {
          typ: "tabelle",
          caption: "Mögliche Hebel eines gebündelten Reststrom-Einkaufs (vorsichtige Einschätzung)",
          kopf: ["Hebel", "Wirkung auf die Beschaffung"],
          zeilen: [
            ...STROM.poolHebel.map((h) => [h.label, `${fmt(h.ct.min, 1)}–${fmt(h.ct.max, 1)} ct/kWh`]),
            ["Summe (nicht additiv garantiert)", `${fmt(POOL_MIN, 1)}–${fmt(POOL_MAX, 1)} ct/kWh`],
          ],
          minBreite: 480,
          fussnote: "Orientierungswerte, abhängig von Lastgang, Marktlage und Vertragszeitpunkt. Netzentgelte, Umlagen und Steuern bleiben unverändert.",
        },
        {
          typ: "p",
          text: "Wer lieber lokal teilt als bündelt, findet im Ratgeber [Energy Sharing und Energiegemeinschaften](/ratgeber/energy-sharing-energiegemeinschaften) die Modelle in Deutschland, Österreich und der Schweiz. Wie ein virtuelles Kraftwerk Erzeuger, Speicher und Verbraucher verbindet, erklärt der Ratgeber [Virtuelles Kraftwerk](/ratgeber/virtuelles-kraftwerk).",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "Vorgehen: So bereiten Sie ein PPA vor",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Lastgang auswerten", "Viertelstundenwerte eines Jahres vom Messstellenbetreiber anfordern. Daraus ergibt sich, wie viel Solarstrom Sie tatsächlich nutzen können."],
            ["Ziel festlegen", "Preisabsicherung, Grünstromnachweis für die Berichterstattung oder beides? Das bestimmt Modell, Laufzeit und Menge."],
            ["Eigenerzeugung prüfen", "Dach, Parkplatz ([Solarcarport](/solarcarport)) und Speicher zuerst ausschöpfen – eigener Strom ist meist günstiger als jeder Liefervertrag."],
            ["Angebote vergleichen", "Mehrere Angebote mit gleichen Annahmen einholen: Preis, Profil, Mengenkorridor, negative Preise, Herkunftsnachweise, Sicherheiten."],
            ["Vertrag prüfen lassen", "Laufzeit, Kündigung, Force Majeure und bilanzielle Behandlung mit Rechts- und Steuerberatung klären."],
          ],
        },
      ],
    },
  ],

  faq: [
    {
      q: "Was kostet ein Solar-PPA 2026?",
      a: `Die dena-Marktanalyse nennt für 2025 indikativ ${fmt(DENA_PPA.solar.min)}–${fmt(DENA_PPA.solar.max)} €/MWh für 10-jährige Solar-PPAs (pay-as-produced) auf Erzeugerebene. Für Abnehmer im Mittelstand kommen Aufschläge für Lieferung, Profil und Ausgleich hinzu; aktuelle Marktpreise veröffentlicht Pexapark.`,
    },
    {
      q: "Ab welchem Stromverbrauch lohnt sich ein PPA?",
      a: "Eine feste Grenze gibt es nicht. Off-site-PPAs werden in der Regel von Unternehmen mit großen Mengen abgeschlossen, weil Vertragsaufwand und Strukturierung sich sonst kaum lohnen. Kleinere Betriebe fahren oft mit Eigenerzeugung plus gebündeltem Einkauf besser.",
    },
    {
      q: "Was ist der Unterschied zwischen physischem und virtuellem PPA?",
      a: "Beim physischen PPA wird der Strom tatsächlich (meist über einen Versorger) an Sie geliefert. Beim virtuellen PPA verkauft der Erzeuger den Strom am Markt, und beide Seiten gleichen nur die Differenz zu einem Festpreis finanziell aus; die Herkunftsnachweise werden separat übertragen.",
    },
    {
      q: "Bekomme ich mit einem PPA echten Grünstrom?",
      a: "Nachweisbar ist Grünstrom über Herkunftsnachweise. In Deutschland erhalten nur Anlagen ohne EEG-Förderung Herkunftsnachweise – achten Sie deshalb darauf, dass die Anlage ungefördert ist und die Nachweise vertraglich an Sie übertragen werden.",
    },
    {
      q: "Wie lange läuft ein PPA?",
      a: "Für neue Solarparks meist 10 Jahre oder länger, weil die Finanzierung daran hängt. Für Bestandsanlagen und nach Förderende sind auch kürzere Laufzeiten unter fünf Jahren üblich; laut dena nahm dieser Anteil 2025 zu.",
    },
    {
      q: "Zahlt produzierendes Gewerbe 2026 noch Stromsteuer?",
      a: `Ja, aber nur noch ${fmt(STROM.stromsteuerProduzierend, 2)} ct/kWh nach Entlastung – ab einem Jahresverbrauch von ${fmt(STROMSTEUER_MINDESTVERBRAUCH_MWH, 1)} MWh und auf Antrag beim Hauptzollamt. Die Regelung gilt seit 1. Januar 2026 dauerhaft.`,
    },
  ],

  passend: [
    { href: pfad("/reststrom"), titel: "Reststrom-Pool", text: "Gebündelter Stromeinkauf für Unternehmen." },
    { href: pfad("/rechner/reststrom"), titel: "Reststrom-Rechner", text: "Preisbestandteile und Sparpotenzial für Ihren Verbrauch." },
    { href: "/ratgeber/virtuelles-kraftwerk", titel: "Virtuelles Kraftwerk", text: "Wie Erzeugung, Speicher und Verbrauch zusammen vermarktet werden." },
    { href: "/ratgeber/grossspeicher-erloese", titel: "Großspeicher-Erlöse", text: "Warum Speicher Solar-PPAs wertvoller machen." },
    { href: pfad("/rechner/ppa"), titel: "PPA-Rechner", text: "Ersparnis und Risiko eines Solar-PPA in drei Preisszenarien." },
    { href: pfad("/solarcarport"), titel: "Solarcarport für Unternehmen", text: "Solarstrom direkt auf dem Firmenparkplatz erzeugen." },
  ],

  quellen: [
    { titel: "dena / Marktoffensive Erneuerbare Energien – PPA-Marktanalyse 2025", url: "https://www.dena.de/fileadmin/dena/Publikationen/PDFs/2026/PPA_Marktanalyse_2025.pdf", stand: "09/2026" },
    { titel: "pv magazine – Pexapark records 12 European PPAs for 724 MW in January 2026", url: "https://www.pv-magazine.com/2026/02/18/pexapark-records-12-european-ppas-for-724-mw-in-january/", stand: "09/2026" },
    { titel: "Deutscher Bundestag – Stromsteuersenkung für Produzenten und Landwirte verstetigt", url: "https://www.bundestag.de/dokumente/textarchiv/2025/kw46-de-energiesteuer-1126268", stand: "09/2026" },
    { titel: "Stromsteuergesetz – § 9 StromStG Steuerbefreiungen", url: "https://www.gesetze-im-internet.de/stromstg/__9.html", stand: "09/2026" },
    { titel: "Umweltbundesamt – Was ist ein Herkunftsnachweis?", url: "https://www.umweltbundesamt.de/service/uba-fragen/was-ist-ein-herkunftsnachweis", stand: "09/2026" },
    { titel: "BDEW – Strompreisanalyse", url: "https://www.bdew.de/service/daten-und-grafiken/bdew-strompreisanalyse/", stand: "09/2026" },
  ],

  seitenCta: { titel: "Was kostet Ihr Reststrom?", text: "Preisbestandteile und Potenzial eines gebündelten Einkaufs.", href: pfad("/rechner/reststrom"), label: "Zum Reststrom-Rechner" },
  cta: {
    title: "Strom für Ihr Unternehmen planbarer einkaufen.",
    text: "Ob PPA, Eigenerzeugung oder gebündelter Reststrom: Rechnen Sie Ihren Fall mit echten Preisbestandteilen durch und sprechen Sie uns dann an.",
    primary: { label: "Reststrom berechnen", href: pfad("/rechner/reststrom") },
    secondary: { label: "Kontakt aufnehmen", href: "/kontakt" },
  },
};

export default artikel;
