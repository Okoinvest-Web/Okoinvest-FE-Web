// Ratgeber: Negative Strompreise und Solarspitzengesetz für Freiflächen-Solarparks
// Recherchestand 29.09.2026: EEG 2023 §§ 51, 51a, 100 Abs. 47 (Fassung Solarspitzengesetz, in Kraft
// seit 25.02.2025), Bundesnetzagentur/SMARD (negative Stunden 2023–2025), LfL Bayern (Anteil der
// Solarerzeugung bei negativen Preisen), naturstrom-Auswertung H1 2026 auf SMARD-Basis.
// Marktzahlen aus src/lib/invest/markt.js.

import { ERLOESE, REGIONEN, BAUART, SPEICHER, FINANZIERUNG, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtPct, fmtCt } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* ------------------------------------------------------------------ */
/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
/* ------------------------------------------------------------------ */

// Bundesnetzagentur/SMARD, Pressemitteilungen zum Strommarkt 2023, 2024, 2025:
// Stunden mit negativem Day-Ahead-Preis in Deutschland
const NEG_STUNDEN = [
  { jahr: 2022, stunden: 69, von: 8760 },
  { jahr: 2023, stunden: 301, von: 8760 },
  { jahr: 2024, stunden: 457, von: 8784 },
  { jahr: 2025, stunden: 573, von: 8760 },
];
// naturstrom-Strommarktanalyse vom 01.07.2026 (Datenbasis SMARD/ENTSO-E): erstes Halbjahr
const NEG_H1 = { 2025: 389, 2026: 291 };
// LfL Bayern: Anteil der Solarstromerzeugung in Stunden mit negativen Großhandelspreisen
const SOLAR_ANTEIL_NEG = { 2024: 0.145, 2025: 0.234 };
// netztransparenz.de / LfL Bayern: Jahresmarktwert Solar 2025, ct/kWh
const JW_2025 = 4.508;
// § 51a Abs. 2 EEG: Gewichtung der Viertelstunden bei Solaranlagen
const FAKTOR_SOLAR = 0.5;
// § 100 Abs. 47 EEG: Erhöhung des anzulegenden Werts bei freiwilligem Wechsel von Bestandsanlagen
const OPT_IN_CT = 0.6;

/* ------------------------------------------------------------------ */
/* Rechenbeispiel: 10 MWp Süddeutschland, Zuschlag nach Solarspitzengesetz */
/* ------------------------------------------------------------------ */

const MWP = 10;
const REGION = REGIONEN.find((r) => r.id === "de-sued");
const MWH = MWP * REGION.ertrag;
const AW = ERLOESE.eegFreiflaecheCt;
const ANTEIL = SOLAR_ANTEIL_NEG[2025];
const MWH_NEG = MWH * ANTEIL;

// Verlust an Marktprämie je Jahr bei verschiedenen Jahresmarktwerten (Prämie = AW − JW)
const SZ = [
  { name: "Jahresmarktwert wie 2025", jw: JW_2025 },
  { name: "vorsichtiger Marktwert der ÖkoInvest-Rechner", jw: ERLOESE.merchantCt },
  { name: "weiter sinkender Marktwert (Annahme)", jw: 3.5 },
].map((s) => {
  const praemie = Math.max(0, AW - s.jw);
  return { ...s, praemie, verlust: (praemie / 100) * MWH_NEG * 1000 };
});

// Nachholung: Viertelstunden × 0,5 = Volllastviertelstunden (je 0,25 h Volllast)
const VIERTELSTUNDEN_2025 = NEG_STUNDEN[3].stunden * 4;
const VLVS_JAHR = VIERTELSTUNDEN_2025 * FAKTOR_SOLAR;
const NACHHOL_MWH_JAHR = VLVS_JAHR * 0.25 * MWP; // MWh-Äquivalent je Förderjahr
// Barwertfaktor: Nachholung ab Jahr 21 statt heute (vereinfacht 20 Jahre Verschiebung)
const BARWERT_FAKTOR = 1 / Math.pow(1 + FINANZIERUNG.diskont, 20);

const OSTWEST = BAUART.ostWest;
const TRACKER = BAUART.tracker;

const artikel = {
  slug: "negative-strompreise-solarspitzengesetz",
  title: "Negative Strompreise und Solarspitzengesetz: Folgen für Solarparks",
  seoTitle: "Negative Strompreise & Solarspitzengesetz | ÖkoInvest",
  kurzTitel: "Negative Strompreise",
  description:
    "Negative Strompreise und Solarspitzengesetz: was § 51 EEG für Solarparks bedeutet, wie oft Preise negativ sind und welche Strategien Erlöse sichern.",
  excerpt:
    "Seit Februar 2025 gibt es für neue Solarparks in jeder Viertelstunde mit negativem Preis keine Marktprämie. Was das kostet, wie die Nachholung am Förderende funktioniert und wie sich Betreiber schützen.",
  hauptKeyword: "negative strompreise solarpark",
  keywords: [
    "negative Strompreise Solarpark",
    "Solarspitzengesetz Freifläche",
    "§ 51 EEG negative Preise",
    "§ 51a EEG Verlängerung Vergütungszeitraum",
    "negative Strompreise Stunden 2025",
    "Solarpark Speicher negative Preise",
    "Capture Rate Solar",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Strom, Markt & Gemeinschaft",
  bild: "/img/pv-wind-abend.jpg",
  bildAlt: "Solarmodule im Vordergrund, dahinter Windräder als Silhouette vor orangefarbenem Abendhimmel",
  badge: { wert: `${fmt(NEG_STUNDEN[3].stunden)} h`, text: "mit negativen Börsenpreisen in Deutschland 2025" },

  kurzFazit: [
    `**Für Solarparks mit Inbetriebnahme seit dem Solarspitzengesetz (25. Februar 2025) sinkt der anzulegende Wert in jeder Viertelstunde mit negativem Spotpreis auf null (§ 51 EEG).** In diesen Zeiträumen gibt es keine Marktprämie.`,
    `Die entfallenen Viertelstunden werden **am Ende der 20 Jahre angehängt** (§ 51a EEG) – bei Solar mit dem Faktor ${fmt(FAKTOR_SOLAR, 1)} gewichtet und über ein gesetzliches Monatskontingent umgerechnet.`,
    `Negative Preise nehmen zu: **${NEG_STUNDEN.map((s) => `${fmt(s.stunden)} Stunden ${s.jahr}`).slice(1).join(", ")}** laut Bundesnetzagentur. 2025 fiel rund ${fmtPct(SOLAR_ANTEIL_NEG[2025], 0)} der Solarerzeugung in solche Stunden.`,
    "Der direkte Prämienverlust ist bei hohem Marktwert klein, wächst aber mit jedem Cent, um den der Marktwert Solar unter den Zuschlagswert fällt. Der größere Effekt ist die sinkende **Capture Rate**.",
    "Wirksame Gegenmittel sind **Abregelung in negativen Viertelstunden, Speicher, Ost-West- oder nachgeführte Anlagen** und PPA-Klauseln, die negative Preise ausdrücklich regeln.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Was bedeuten negative Strompreise für einen Solarpark?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Bei negativen Strompreisen bezahlt, wer einspeist – und ein neuer Solarpark erhält in diesen Viertelstunden seit dem Solarspitzengesetz auch keine Marktprämie mehr.** Wer weiter einspeist, zahlt also drauf; wer abregelt, verdient in dieser Zeit nichts. Die entgangene Förderzeit wird erst nach Ablauf der 20 Jahre nachgeholt.",
        },
        {
          typ: "p",
          text: `[Negative Strompreise](/wissen/lexikon#negative-strompreise) entstehen, wenn viel unflexible Erzeugung auf geringe Nachfrage trifft – typischerweise an sonnigen Wochenenden und Feiertagen im Frühjahr und Sommer um die Mittagszeit. Für Solarparks ist das doppelt unangenehm: Die Stunden mit dem höchsten Ertrag sind genau die Stunden mit den niedrigsten Preisen. Das drückt den [Marktwert Solar](/wissen/lexikon#marktwert-solar) und damit die Erlöse aller Parks, die ohne feste Vergütung vermarkten. Wie die Marktprämie grundsätzlich funktioniert, erklärt der Ratgeber [Direktvermarktung für Solarparks](/wissen/ratgeber/direktvermarktung-solarpark).`,
        },
        {
          typ: "kennzahl",
          wert: fmtPct(SOLAR_ANTEIL_NEG[2025], 1),
          titel: "der Solarstromerzeugung 2025 bei negativen Preisen",
          text: `Nach Auswertung der Bayerischen Landesanstalt für Landwirtschaft; 2024 waren es ${fmtPct(SOLAR_ANTEIL_NEG[2024], 1)}.`,
        },
      ],
    },
    {
      id: "haeufigkeit",
      titel: "Wie oft sind Strompreise in Deutschland negativ?",
      tocLabel: "Häufigkeit 2022–2026",
      bloecke: [
        {
          typ: "p",
          text: `**Die Zahl der Stunden mit negativem Day-Ahead-Preis hat sich seit 2022 mehr als verachtfacht: von ${NEG_STUNDEN[0].stunden} auf ${NEG_STUNDEN[3].stunden} Stunden im Jahr 2025.** Das sind gut ${fmtPct(NEG_STUNDEN[3].stunden / NEG_STUNDEN[3].von, 1)} aller Stunden – konzentriert auf die ertragreichsten Monate.`,
        },
        {
          typ: "tabelle",
          caption: "Stunden mit negativen Großhandelspreisen am Day-Ahead-Markt, Deutschland",
          kopf: ["Jahr", "Stunden mit negativem Preis", "Anteil an allen Stunden", "Anteil der Solarerzeugung"],
          zeilen: NEG_STUNDEN.map((s) => [
            s.jahr === 2025 ? `**${s.jahr}**` : String(s.jahr),
            s.jahr === 2025 ? `**${fmt(s.stunden)}**` : fmt(s.stunden),
            fmtPct(s.stunden / s.von, 1),
            SOLAR_ANTEIL_NEG[s.jahr] ? fmtPct(SOLAR_ANTEIL_NEG[s.jahr], 1) : "–",
          ]),
          hervorheben: 1,
          markierteZeile: 3,
          minBreite: 600,
          fussnote: "Stunden: Bundesnetzagentur/SMARD (Pressemitteilungen zum Strommarkt 2023, 2024 und 2025; 2024 war ein Schaltjahr mit 8.784 Stunden). Solaranteil: LfL Bayern. Seit Herbst 2025 wird am Day-Ahead-Markt in Viertelstunden gehandelt; Stunden- und Viertelstundenzählungen sind daher nicht vollständig vergleichbar.",
        },
        {
          typ: "p",
          text: `Das erste Halbjahr 2026 brachte nach einer Auswertung auf Basis der SMARD-Daten ${NEG_H1[2026]} Stunden unter null – weniger als im Vorjahreszeitraum (${NEG_H1[2025]} Stunden). Ein Trendbruch ist das nicht zwingend: Wetter, Gaspreise, Exportmöglichkeiten und der Zubau von Großspeichern bestimmen die Zahl von Jahr zu Jahr. Für die Projektplanung sollten Sie mit einem weiter hohen Niveau rechnen. Aktuelle Preise zeigt [Energie live](/de/energie-live), Jahreswerte und Marktwerte die [Marktdaten](/de/marktdaten).`,
        },
      ],
    },
    {
      id: "paragraf-51",
      titel: "§ 51 und § 51a EEG: Was das Solarspitzengesetz geändert hat",
      tocLabel: "§ 51, § 51a und Übergang",
      bloecke: [
        {
          typ: "p",
          text: "**Seit dem 25. Februar 2025 gilt für neue Anlagen: Für jede Viertelstunde mit negativem Spotmarktpreis verringert sich der anzulegende Wert auf null.** Früher griff die Regel erst ab mehreren zusammenhängenden negativen Stunden. Im Gegenzug verlängert § 51a EEG den Vergütungszeitraum.",
        },
        { typ: "h3", text: "So funktioniert die Nachholung am Förderende" },
        {
          typ: "ablauf",
          schritte: [
            ["Viertelstunden zählen", "Gezählt werden alle Viertelstunden, in denen der anzulegende Wert im Inbetriebnahmejahr und den folgenden 19 Kalenderjahren nach § 51 auf null gefallen ist. Strombörse und Netzbetreiber veröffentlichen die Zeiträume jährlich bis Ende Januar."],
            ["Gewichten", `Bei Solaranlagen wird die Zahl mit ${fmt(FAKTOR_SOLAR, 1)} multipliziert. Das Ergebnis heißt Volllastviertelstunden – der Gesetzgeber berücksichtigt damit, dass Solaranlagen nicht in jeder Viertelstunde mit voller Leistung laufen.`],
            ["In Monate umrechnen", "Die Volllastviertelstunden werden über ein gesetzliches Zeitkontingent je Kalendermonat (von 87 im Januar bis 73 im Dezember, § 51a Abs. 2 EEG) in eine Verlängerung umgerechnet, die sich über mehrere Monate erstrecken kann."],
            ["Nach 20 Jahren anhängen", "Um diesen Zeitraum verlängert sich der Anspruch auf Marktprämie nach dem regulären Förderende."],
          ],
        },
        {
          typ: "tabelle",
          caption: `Welche Regel für negative Preise gilt? Stand ${STAND}`,
          kopf: ["Anlage", "Wann entfällt die Förderung?", "Nachholung"],
          zeilen: [
            ["Inbetriebnahme ab 25.02.2025", "**in jeder Viertelstunde mit negativem Spotmarktpreis**", "ja, nach § 51a EEG am Ende der Förderdauer"],
            ["Bestandsanlagen (vor 25.02.2025)", "nach der Fassung zum Zeitpunkt der Inbetriebnahme – je nach Jahrgang erst ab mehreren zusammenhängenden negativen Stunden (z. B. sechs Stunden im EEG 2017, vier im EEG 2021, danach gestaffelt kürzer)", "in der Regel nein"],
            ["Bestandsanlage mit freiwilligem Wechsel", "wie Neuanlagen, frühestens ab Ablauf des Jahres, in dem ein intelligentes Messsystem eingebaut wird", `ja; zusätzlich steigt der anzulegende Wert um ${fmt(OPT_IN_CT, 1)} ct/kWh (§ 100 Abs. 47 EEG)`],
            ["Kleinanlagen", "Ausnahmen, etwa für Anlagen unter 100 kW vor Einbau eines intelligenten Messsystems (§ 51 Abs. 2 EEG)", "–"],
          ],
          hervorheben: 1,
          markierteZeile: 0,
          minBreite: 700,
          fussnote: "Vereinfachte Darstellung. Welche Fassung für eine Bestandsanlage gilt, hängt von Inbetriebnahme- bzw. Zuschlagsdatum ab und sollte im Einzelfall anhand der Übergangsbestimmungen in § 100 EEG geprüft werden. Keine Rechtsberatung.",
        },
        {
          typ: "p",
          text: "Die Regel gilt unabhängig davon, ob der Zuschlag aus der [EEG-Ausschreibung](/wissen/ratgeber/eeg-ausschreibung-freiflaeche) stammt oder der [anzulegende Wert](/wissen/lexikon#anzulegender-wert) gesetzlich festgelegt ist. Für Bieter heißt das: Negative Preise gehören heute in die Gebotskalkulation, nicht in die Fußnote.",
        },
      ],
    },
    {
      id: "erloese",
      titel: "Was kosten negative Preise einen Solarpark? Ein Rechenbeispiel",
      tocLabel: "Rechenbeispiel",
      bloecke: [
        {
          typ: "p",
          text: `**Bei einem Zuschlagswert von ${fmtCt(AW, 1)} und dem Jahresmarktwert 2025 kostet § 51 einen 10-MWp-Park im direkten Prämienverlust nur einige tausend Euro im Jahr – je tiefer der Marktwert fällt, desto teurer wird es.** Der Grund: Seit 2023 wird die Prämie mit dem Jahresmarktwert berechnet, und verloren geht nur die Prämie, nicht der ganze Zuschlagswert.`,
        },
        {
          typ: "p",
          text: `Annahmen: ${MWP} MWp in Süddeutschland mit rund ${fmt(MWH)} MWh im Jahr, davon wie im Bundesdurchschnitt 2025 ${fmtPct(ANTEIL, 1)} (${fmt(MWH_NEG)} MWh) in Zeiten negativer Preise. In diesen Zeiten wird abgeregelt, damit keine negativen Preise gezahlt werden müssen.`,
        },
        {
          typ: "tabelle",
          caption: `Entgangene Marktprämie je Jahr durch § 51 EEG, ${MWP} MWp, anzulegender Wert ${fmtCt(AW, 1)}`,
          kopf: ["Szenario", "Jahresmarktwert Solar", "Prämie je kWh", "Entgangene Prämie je Jahr"],
          zeilen: SZ.map((s, i) => [
            s.name,
            fmtCt(s.jw, 2),
            fmtCt(s.praemie, 2),
            i === 0 ? `**${fmtEur(Math.round(s.verlust / 100) * 100)}**` : fmtEur(Math.round(s.verlust / 100) * 100),
          ]),
          hervorheben: 3,
          markierteZeile: 0,
          minBreite: 640,
          fussnote: "Eigene vereinfachte Rechnung: entgangene Prämie = (anzulegender Wert − Jahresmarktwert) × Erzeugung in negativen Zeiträumen. Ohne Nachholung, Profilwert, Degradation und Entgelte. Das dritte Szenario ist eine Annahme, keine Prognose.",
        },
        {
          typ: "p",
          text: `Die Nachholung gleicht das nur teilweise aus. Mit ${fmt(NEG_STUNDEN[3].stunden)} negativen Stunden wie 2025 kämen je Förderjahr rund ${fmt(VLVS_JAHR)} Volllastviertelstunden zusammen – umgerechnet grob ${fmt(NACHHOL_MWH_JAHR)} MWh Volllast-Äquivalent. Diese Menge wird aber erst nach 20 Jahren mit der dann gültigen Prämie vergütet. Abgezinst mit ${fmtPct(FINANZIERUNG.diskont, 1)} ist ein Euro in 20 Jahren heute nur rund ${fmt(BARWERT_FAKTOR * 100)} Cent wert. Zudem sind die Anlagen dann älter, und die Prämie ist bei steigendem Marktwert womöglich null.`,
        },
        {
          typ: "kasten",
          variant: "info",
          titel: "Der größere Effekt: die sinkende Capture Rate",
          text: `Wichtiger als der Prämienverlust ist, dass negative und sehr niedrige Mittagspreise den Marktwert Solar selbst drücken. 2025 erlöste Solarstrom im Jahresmittel nur rund die Hälfte des durchschnittlichen Börsenpreises. Diese [Capture Rate](/wissen/lexikon#capture-rate) bestimmt, was ein Park nach Förderende, im PPA oder als Merchant-Anlage verdient. Wer mit ${fmtCt(ERLOESE.merchantCt, 1)} Merchant-Erlös rechnet, sollte Sensitivitäten nach unten prüfen – etwa im [Solarpark-Rechner](/de/rechner/solarpark).`,
        },
      ],
    },
    {
      id: "strategien",
      titel: "Strategien gegen negative Preise: Speicher, Ausrichtung, Abregelung",
      tocLabel: "Strategien",
      bloecke: [
        {
          typ: "p",
          text: "**Die wirksamste Einzelmaßnahme ist die konsequente Abregelung in negativen Viertelstunden; den größten wirtschaftlichen Hebel hat ein gekoppelter Speicher, der Mittagsstrom in die Abendstunden verschiebt.** Ausrichtung und Nachführung verbessern das Profil dauerhaft, kosten aber Fläche oder Ertrag.",
        },
        {
          typ: "tabelle",
          caption: "Maßnahmen gegen negative Preise im Vergleich",
          kopf: ["Maßnahme", "Wirkung", "Kosten und Grenzen"],
          zeilen: [
            ["Abregelung durch den Direktvermarkter", "keine Zahlung negativer Preise; für Neuanlagen ohnehin keine Prämie in diesen Viertelstunden", "Fernsteuerbarkeit nach § 10b EEG nötig; Ertrag geht verloren"],
            ["Batteriespeicher am Netzanschluss", "lädt mittags, verkauft abends; nutzt [Arbitrage](/wissen/lexikon#arbitrage) und ggf. Regelenergie", `Systempreis derzeit etwa ${fmt(SPEICHER.capexProKwh.min)}–${fmt(SPEICHER.capexProKwh.max)} €/kWh, Wirkungsgrad rund ${fmtPct(SPEICHER.wirkungsgrad, 0)}; Netzanschluss- und Messkonzept`],
            ["Ost-West-Aufständerung", "flacheres Profil mit mehr Morgen- und Abendstrom", `Ertragsfaktor rund ${fmt(OSTWEST.faktor, 2)}, dafür nur ${fmt(OSTWEST.haProMwp, 2)} ha je MWp`],
            ["Einachsige Nachführung", "mehr Ertrag in den Randstunden", `Ertragsfaktor rund ${fmt(TRACKER.faktor, 2)}, aber ${fmt(TRACKER.haProMwp, 1)} ha je MWp und höhere Kosten`],
            ["Vertikale, bifaziale Agri-PV", "Spitzen morgens und nachmittags statt mittags", "geringerer Jahresertrag, Kombination mit Landwirtschaft"],
            ["PPA mit Regel für negative Preise", "Abnehmer übernimmt Mengen oder Preisrisiko vertraglich", "Abschlag auf den Preis; Bonität des Abnehmers"],
          ],
          minBreite: 720,
          fussnote: "Ertragsfaktoren relativ zu fester Süd-Aufständerung und Flächenbedarf aus den Marktannahmen der Website; Speicherkosten als Spanne für schlüsselfertige 2-Stunden-Systeme. Orientierungswerte, keine Angebote.",
        },
        {
          typ: "h3",
          text: "Speicher am Solarpark: Was das Solarspitzengesetz erleichtert",
        },
        {
          typ: "p",
          text: "Bis 2025 verlor ein Speicher am EEG-Park seine Förderfähigkeit schnell, wenn er auch Strom aus dem Netz lud. Mit der **Abgrenzungs- und der Pauschaloption** (§ 19 Abs. 3b und 3c EEG) kann ein Speicher nach aktuellem Stand gemischt betrieben werden, ohne dass der Solarstrom seinen Förderanspruch verliert; die Marktprämie wird dann mit dem Jahresmarktwert berechnet. Die Details – Messkonzept, Abrechnung, Pauschalmengen – sind anspruchsvoll und sollten mit Netzbetreiber und Direktvermarkter abgestimmt werden. Wie Speicher Geld verdienen, zeigt der Ratgeber [Großspeicher-Erlöse](/wissen/ratgeber/grossspeicher-erloese); zur Entwicklung eigener Projekte siehe [Großspeicher](/de/grossspeicher).",
        },
        {
          typ: "p",
          text: "Ein oft übersehener Punkt ist der Netzanschluss: Wer den Speicher hinter demselben Netzverknüpfungspunkt betreibt, kann den Park überbauen und Spitzen zwischenspeichern, statt sie abzuregeln. Welche Kapazität verfügbar ist und was ein Anschluss kostet, erklärt der Ratgeber [Netzanschluss für Solarparks](/wissen/ratgeber/netzanschluss-solarpark).",
        },
      ],
    },
    {
      id: "vertraege",
      titel: "Was in Pacht-, PPA- und Direktvermarktungsverträge gehört",
      tocLabel: "Verträge",
      bloecke: [
        {
          typ: "p",
          text: "**Negative Preise sollten in jedem Vertrag rund um einen Solarpark ausdrücklich geregelt sein – vom Direktvermarktungsvertrag über das PPA bis zur Umsatzpacht.** Sonst entscheidet im Streitfall die Auslegung.",
        },
        {
          typ: "checkliste",
          punkte: [
            "**Direktvermarktungsvertrag:** Wer entscheidet über Abregelung, ab welchem Preis, und wie werden abgeregelte Mengen vergütet?",
            "**PPA:** Muss der Abnehmer in negativen Viertelstunden abnehmen und zahlen, oder entfällt die Liefer- und Zahlungspflicht? Gilt ein Preisboden? Mehr im Ratgeber [PPA für Unternehmen](/wissen/ratgeber/ppa-fuer-unternehmen).",
            "**Umsatzpacht:** Zählen nachgeholte Förderzeiträume nach Jahr 20 zur Umsatzbasis, und gilt dann noch der Pachtvertrag?",
            "**Finanzierung:** Rechnet die Bank mit Abregelungsquoten und einem vorsichtigen Marktwert? Belastbare Szenarien erleichtern die Kreditzusage.",
            "**Ertragsgutachten:** Enthält es Abregelungs- und Preisszenarien, nicht nur die physikalische Erzeugung?",
          ],
        },
        {
          typ: "p",
          text: "Auch in Österreich schränkt das EAG die Marktprämie bei negativen Preisen nach aktuellem Stand ein; die genauen Bedingungen sollten Sie für Ihr Projekt prüfen. Speicher und ein günstiges Profil lohnen sich dort aus denselben Gründen. Einen Überblick über den Markt dort gibt [Freiflächen-PV in Österreich](/wissen/ratgeber/freiflaechen-pv-oesterreich).",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Bekommt ein Solarpark bei negativen Strompreisen eine Vergütung?",
      a: "Anlagen, die seit dem 25. Februar 2025 in Betrieb gehen, erhalten in jeder Viertelstunde mit negativem Spotpreis keine Marktprämie. Ältere Anlagen folgen den Regeln ihres Inbetriebnahmejahres, die meist erst bei mehreren zusammenhängenden negativen Stunden greifen.",
    },
    {
      q: "Wird die entgangene Förderung nachgeholt?",
      a: `Ja, für Neuanlagen verlängert sich der Förderzeitraum nach § 51a EEG. Bei Solar werden die betroffenen Viertelstunden mit ${fmt(FAKTOR_SOLAR, 1)} gewichtet und nach einem Monatskontingent am Ende der 20 Jahre angehängt. Wirtschaftlich ist die späte Nachholung weniger wert als eine Zahlung heute.`,
    },
    {
      q: "Wie viele Stunden mit negativen Strompreisen gab es 2025?",
      a: `Laut Bundesnetzagentur ${fmt(NEG_STUNDEN[3].stunden)} von ${fmt(NEG_STUNDEN[3].von)} Stunden, nach ${fmt(NEG_STUNDEN[2].stunden)} im Jahr 2024 und ${fmt(NEG_STUNDEN[1].stunden)} im Jahr 2023. Aktuelle Preise sehen Sie unter [Energie live](/de/energie-live).`,
    },
    {
      q: "Lohnt sich ein Speicher am Solarpark wegen negativer Preise?",
      a: "Häufig ja, wenn Netzanschluss und Messkonzept passen: Der Speicher verschiebt Mittagsstrom in teurere Abendstunden und kann zusätzlich Regelenergie anbieten. Ob es sich rechnet, hängt vor allem von Speicherkosten, Preisspreads und Netzentgelten ab.",
    },
    {
      q: "Können Bestandsanlagen in die neue Regel wechseln?",
      a: `Ja, freiwillig per Erklärung in Textform gegenüber dem Netzbetreiber, frühestens zum Ablauf des Jahres, in dem ein intelligentes Messsystem eingebaut wird. Im Gegenzug steigt der anzulegende Wert um ${fmt(OPT_IN_CT, 1)} ct/kWh.`,
    },
    {
      q: "Was ist das Solarspitzengesetz?",
      a: "So wird die EEG- und EnWG-Novelle vom Februar 2025 genannt. Sie hat unter anderem die Viertelstundenregel bei negativen Preisen, die Nachholung am Förderende, neue Speicheroptionen und Regeln zur Steuerbarkeit neuer Anlagen eingeführt.",
    },
  ],

  passend: [
    { href: "/wissen/ratgeber/direktvermarktung-solarpark", titel: "Direktvermarktung für Solarparks", text: "Marktprämie, Jahresmarktwert und Direktvermarkter." },
    { href: "/wissen/ratgeber/grossspeicher-erloese", titel: "Großspeicher-Erlöse", text: "Womit Batteriespeicher Geld verdienen." },
    { href: "/wissen/ratgeber/eeg-ausschreibung-freiflaeche", titel: "EEG-Ausschreibung Freifläche", text: "Termine, Zuschläge und Regeln." },
    { href: pfad("/marktdaten"), titel: "Marktdaten", text: "Marktwert Solar und Capture Rate im Zeitverlauf." },
  ],

  quellen: [
    { titel: "EEG 2023, § 51 – Verringerung des Zahlungsanspruchs bei negativen Preisen", url: "https://www.gesetze-im-internet.de/eeg_2014/__51.html", stand: "09/2026" },
    { titel: "EEG 2023, § 51a – Verlängerung des Vergütungszeitraums bei negativen Preisen", url: "https://www.gesetze-im-internet.de/eeg_2014/__51a.html", stand: "09/2026" },
    { titel: "EEG 2023, § 100 – Übergangsbestimmungen (Abs. 47: freiwilliger Wechsel)", url: "https://www.gesetze-im-internet.de/eeg_2014/__100.html", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Bundesnetzagentur veröffentlicht Daten zum Strommarkt 2025 (SMARD)", url: "https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2026/20260105_Smard.html", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Bundesnetzagentur veröffentlicht Daten zum Strommarkt 2023 (SMARD)", url: "https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/DE/2024/20240103_SMARD.html", stand: "09/2026" },
    { titel: "Bayerische Landesanstalt für Landwirtschaft – Solar/Photovoltaik: Strommarkt 2023 bis 2025", url: "https://www.lfl.bayern.de/iba/energie/372343/index.php", stand: "09/2026" },
    { titel: "Naturstrom – Strompreisanalyse erstes Halbjahr 2026 (Datenbasis SMARD, ENTSO-E)", url: "https://www.naturstrom.de/ueber-uns/presse/news-detail/strompreisanalyse-erstes-halbjahr-2026", stand: "09/2026" },
    { titel: "Bundesverband Solarwirtschaft – FAQ Solarspitzengesetz", url: "https://www.solarwirtschaft.de/unsere-themen/photovoltaik/standpunkte/faq-solarspitzengesetz/", stand: "09/2026" },
  ],

  seitenCta: {
    titel: "Wie robust ist Ihr Projekt?",
    text: "Erlöse mit niedrigerem Marktwert durchrechnen.",
    href: pfad("/rechner/solarpark"),
    label: "Zum Solarpark-Rechner",
  },
  cta: {
    title: "Solarpark mit Speicher denken.",
    text: "ÖkoInvest entwickelt Freiflächen-PV und Großspeicher. Prüfen Sie, ob Ihre Fläche für Park, Speicher oder beides infrage kommt – für Flächeneigentümer kostenfrei.",
    primary: { label: "Zum Flächencheck", href: pfad("/flaechencheck") },
    secondary: { label: "Großspeicher", href: pfad("/grossspeicher") },
  },
};

export default artikel;
