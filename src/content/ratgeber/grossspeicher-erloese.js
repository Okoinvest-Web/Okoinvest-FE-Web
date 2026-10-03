// Ratgeber: Batteriegroßspeicher – Erlösquellen, Marktlage 2025/26, Rechenbeispiel, Recht
// Recherchestand 29.09.2026 (RWTH ISEA / battery-charts, BGH EnVR 1/24, § 118 Abs. 6 EnWG,
// BNetzA AgNes-Zwischenstand Mai 2026, § 35 Abs. 1 Nr. 11/12 BauGB, dena PPA-Marktanalyse 2025).

import { SPEICHER, irr } from "@/lib/invest/markt";
import { fmt, fmtEur, fmtMio, fmtPct } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* Werte, die (noch) nicht in markt.js stehen – mit Quelle */
// RWTH Aachen ISEA, Battery Revenue Index (battery-charts.de), 2-h-System, €/MW und Jahr,
// berichtet von pv magazine am 23.01.2026. Theoretisches Potenzial; realisiert wird weniger.
const ISEA_2H = { 2024: 309000, 2025: 259000 };
const ISEA_1H = { 2024: 183000, 2025: 151000 };
// Bundesnetzagentur-Monitoring (via pv magazine, 25.08.2026): Anschlussbegehren für Batteriespeicher im Jahr 2025
const ANFRAGEN_GW = 573.5;
const ZUSAGEN_GW = 54.2;
// Bundesnetzagentur, Themenseite Stromspeicher (Stand 15.10.2025): installierte Großbatteriespeicher
const BESTAND_GW = 2.4;
const BESTAND_GWH = 3.2;
// Baukostenzuschuss Hochspannung, Westnetz-Preisblatt ab 01.05.2026 – Beispielwert, je Netzbetreiber verschieden
const BKZ_PRO_KW = 88;
// Rechenannahmen dieses Artikels (keine Marktquelle, zur Veranschaulichung):
const OPEX_ANTEIL = 0.02; // Betriebskosten p. a. in % des Capex (Wartung, Versicherung, Pacht, Messung)
const OPEX_STEIGERUNG = 0.02;
const ERLOES_RUECKGANG = 0.03; // jährlicher Rückgang der Erlöse durch Zubau und Alterung
const LAUFZEIT = 15;

/* Rechenbeispiel 10 MW / 20 MWh */
const MW = 10;
const MWH = 20;
const CAPEX = MWH * 1000 * SPEICHER.capexProKwh.mittel;
const BKZ = MW * 1000 * BKZ_PRO_KW;

function szenario(erloesProMw, mitBkz = true) {
  const e0 = erloesProMw * MW;
  const cf = [-(CAPEX + (mitBkz ? BKZ : 0))];
  let summe = 0;
  for (let t = 1; t <= LAUFZEIT; t++) {
    const netto = e0 * Math.pow(1 - ERLOES_RUECKGANG, t - 1) - CAPEX * OPEX_ANTEIL * Math.pow(1 + OPEX_STEIGERUNG, t - 1);
    cf.push(netto);
    summe += netto;
  }
  return { e0, irr: irr(cf), summe };
}
const S_MIN = szenario(SPEICHER.erloesProMwJahr.min);
const S_MITTEL = szenario(SPEICHER.erloesProMwJahr.mittel);
const S_MAX = szenario(SPEICHER.erloesProMwJahr.max);
const S_MITTEL_OHNE_BKZ = szenario(SPEICHER.erloesProMwJahr.mittel, false);
const pct = (x) => (x === null ? "–" : fmtPct(x, 1));

// Durchsatz: Energie, die pro Jahr entladen wird
const DURCHSATZ_MWH = MWH * SPEICHER.zyklenProJahr * SPEICHER.wirkungsgrad;
const ERLOES_JE_MWH = (SPEICHER.erloesProMwJahr.mittel * MW) / DURCHSATZ_MWH;

const artikel = {
  slug: "grossspeicher-erloese",
  title: "Batteriegroßspeicher: Erlöse, Marktlage 2026 und Rechenbeispiel",
  seoTitle: "Batteriegroßspeicher Erlöse 2026 | ÖkoInvest",
  kurzTitel: "Großspeicher-Erlöse",
  description:
    "Batteriegroßspeicher Erlöse 2026: Arbitrage, Regelenergie, Tolling und Co-Location. Marktlage, Netzentgelte, Baukostenzuschuss und Rechenbeispiel 10 MW/20 MWh.",
  excerpt:
    "Womit ein Großspeicher Geld verdient, warum die Regelenergieerlöse fallen, was das BGH-Urteil zum Baukostenzuschuss bedeutet – und wie sich ein 10-MW-Speicher rechnet.",
  hauptKeyword: "batteriegroßspeicher erlöse",
  keywords: [
    "Batteriegroßspeicher Erlöse",
    "Großspeicher Wirtschaftlichkeit",
    "Batteriespeicher Arbitrage",
    "Regelenergie Batteriespeicher",
    "Baukostenzuschuss Batteriespeicher",
    "Netzentgeltbefreiung Speicher 2029",
    "Batteriespeicher Außenbereich Privilegierung",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Strom, Markt & Gemeinschaft",
  bild: "/img/speicher.jpg",
  bildAlt: "Modularer Batteriespeicher mit darüber montiertem Wechselrichter vor einer blauen Wand",
  badge: { wert: `${fmt(SPEICHER.erloesProMwJahr.min / 1000)}–${fmt(SPEICHER.erloesProMwJahr.max / 1000)} T€`, text: "Erlöse je MW und Jahr, 2-h-Speicher (Orientierung)" },

  kurzFazit: [
    `Ein Großspeicher verdient an **Preisunterschieden (Arbitrage) und an Regelenergie**. Realistisch sind nach unserer Annahme ${fmt(SPEICHER.erloesProMwJahr.min)}–${fmt(SPEICHER.erloesProMwJahr.max)} € je MW und Jahr für einen 2-Stunden-Speicher.`,
    `Die Erlöse sinken: Der Erlösindex der RWTH Aachen fiel für 2-h-Systeme von ${fmt(ISEA_2H[2024])} € (2024) auf ${fmt(ISEA_2H[2025])} € je MW (2025) – unter anderem, weil der Primärregelmarkt (FCR) gesättigt ist und die aFRR-Arbeitspreise gefallen sind.`,
    `Systempreise fallen ebenfalls: rund ${fmt(SPEICHER.capexProKwh.min)}–${fmt(SPEICHER.capexProKwh.max)} €/kWh schlüsselfertig. Im Beispiel 10 MW/20 MWh ergibt das eine Projektrendite von etwa **${pct(S_MIN.irr)} bis ${pct(S_MAX.irr)}** vor Steuern und Finanzierung.`,
    `Der Engpass ist der **Netzanschluss**: 2025 wurden ${fmt(ANFRAGEN_GW, 1)} GW Speicherleistung angefragt, aber nur ${fmt(ZUSAGEN_GW, 1)} GW zugesagt. Baukostenzuschüsse sind laut BGH (Juli 2025) zulässig.`,
    "Speicher, die bis **4. August 2029** in Betrieb gehen, bleiben nach § 118 Abs. 6 EnWG 20 Jahre von Netzentgelten für den Strombezug befreit – nach dem aktuellen AgNes-Stand der Bundesnetzagentur mit Vertrauensschutz.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Womit verdient ein Batteriegroßspeicher Geld?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: "**Ein [Batteriegroßspeicher](/wissen/lexikon#grossspeicher) verdient Geld, indem er Strom günstig lädt und teuer entlädt und indem er dem Übertragungsnetzbetreiber Leistung für die Netzstabilität bereithält.** Die Erlöse kommen aus mehreren Märkten gleichzeitig; ein Optimierer entscheidet täglich, viertelstündlich und teils im Minutentakt, in welchem Markt die Batterie gerade am meisten wert ist. Das nennt man Multi-Market-Vermarktung – und von ihrer Qualität hängt die Rendite fast so stark ab wie vom Kaufpreis der Batterie.",
        },
        {
          typ: "p",
          text: `Die Voraussetzung für das Geschäft ist Volatilität: je mehr Solar- und Windstrom im Netz, desto größer die Preisunterschiede zwischen Mittag und Abend und desto häufiger [negative Strompreise](/wissen/lexikon#negative-strompreise). Nach der PPA-Marktanalyse der dena fiel 2025 knapp ein Viertel der Solarstromerzeugung in Stunden mit negativen Preisen. Genau diese Stunden sind für Speicher die günstigsten Ladezeitpunkte. Gleichzeitig ist der Bestand in Deutschland noch klein: Laut Bundesnetzagentur waren im Oktober 2025 rund ${fmt(BESTAND_GW, 1)} GW bzw. ${fmt(BESTAND_GWH, 1)} GWh an Großbatteriespeichern installiert.`,
        },
        {
          typ: "kennzahl",
          wert: `${fmt(ISEA_2H[2025])} €`,
          titel: "Erlöspotenzial je MW 2025 (2-h-System, RWTH-Index)",
          text: `2024 waren es noch ${fmt(ISEA_2H[2024])} €. Der Index zeigt das theoretische Optimum; gut vermarktete Anlagen erreichen in der Regel nur einen Teil davon.`,
        },
      ],
    },
    {
      id: "erloesquellen",
      titel: "Die Erlösquellen im Überblick",
      tocLabel: "Erlösquellen",
      bloecke: [
        {
          typ: "tabelle",
          caption: "Erlösquellen für Batteriegroßspeicher in Deutschland, Stand September 2026",
          kopf: ["Erlösquelle", "Wie es funktioniert", "Trend 2025/26"],
          zeilen: [
            ["Day-Ahead-Arbitrage", "Laden in den günstigsten, Entladen in den teuersten Stunden des Folgetags (Auktion am Vortag)", "gestiegen (+17 % im 2-h-Index 2025)"],
            ["Intraday-Handel", "Kontinuierlicher Handel bis kurz vor Lieferung; nutzt Prognosefehler bei Wind und Sonne", "wichtigste Säule, 2025 leicht rückläufig"],
            ["Primärregelleistung (FCR)", "Leistung, die bei Frequenzabweichungen in Sekunden reagiert", "stark gefallen (über 90 % Rückgang im 2-h-Index)"],
            ["Sekundärregelleistung (aFRR)", "Leistungsvorhaltung (Kapazität) und Abruf (Arbeit) für den Netzausgleich", "Kapazität gestiegen, Arbeitspreise stark gefallen"],
            ["Tolling / FPA", "Ein Händler mietet die Batterie gegen feste Zahlung und trägt das Marktrisiko", "wachsend, bankable Erlöse"],
            ["Co-Location mit PV", "Speicher am selben Netzanschluss wie ein Solarpark; verschiebt Mittagsstrom in den Abend", "neu attraktiv durch die Abgrenzungsoption (§ 19 EEG)"],
            ["Netzbooster / netzdienlich", "Speicher als Teil des Netzbetriebs, etwa zur Engpassentlastung", "Einzelprojekte, für private Betreiber eng begrenzt"],
          ],
          minBreite: 700,
          fussnote: "Trendangaben zum 2-h-Index: RWTH Aachen ISEA / battery-charts.de, veröffentlicht Januar 2026. Tolling: dena/Marktoffensive Erneuerbare Energien, PPA-Marktanalyse 2025.",
        },
        { typ: "h3", text: "Arbitrage: Day-Ahead und Intraday" },
        {
          typ: "p",
          text: `Bei der [Arbitrage](/wissen/lexikon#arbitrage) ist der Wirkungsgrad entscheidend. Mit ${fmtPct(SPEICHER.wirkungsgrad, 0)} Rundlaufwirkungsgrad kommen von 100 geladenen Megawattstunden nur ${fmt(SPEICHER.wirkungsgrad * 100)} zurück; ein Spread muss diese Verluste und die Alterung der Zellen überkompensieren. Wir rechnen mit rund ${fmt(SPEICHER.zyklenProJahr)} Vollzyklen pro Jahr. Für den Beispielspeicher mit ${MWH} MWh sind das rund ${fmt(DURCHSATZ_MWH)} MWh entladene Energie – rechnerisch bringt jede davon im mittleren Szenario etwa ${fmt(ERLOES_JE_MWH)} € über alle Märkte hinweg.`,
        },
        { typ: "h3", text: "Regelenergie: FCR und aFRR" },
        {
          typ: "p",
          text: "[Regelenergie](/wissen/lexikon#regelenergie) war lange der Erlösanker der ersten Großspeicher. Der FCR-Markt ist klein und inzwischen weitgehend von Batterien gesättigt; die Preise sind entsprechend gefallen, eine Trendwende ist nicht absehbar. Bei der Sekundärregelleistung (aFRR) stiegen 2025 die Kapazitätserlöse, während die Arbeitspreise stark nachgaben. Wer heute kalkuliert, sollte Regelenergie als Beimischung sehen, nicht als Geschäftsmodell für 15 Jahre.",
        },
        { typ: "h3", text: "Tolling und Co-Location" },
        {
          typ: "p",
          text: "Beim **Tolling** (auch Flexibility Purchase Agreement, FPA) zahlt ein Energiehändler eine feste Vergütung je MW und darf die Batterie dafür vermarkten. Der Betreiber tauscht Upside gegen Planbarkeit – für Banken ist das oft die Voraussetzung für eine Fremdfinanzierung. Laut dena-Analyse hat sich das Volumen solcher Verträge in Deutschland 2025 fast verdoppelt, auf 249 MW. Bei der **Co-Location** teilt sich der Speicher Netzanschluss und Fläche mit einem Solarpark. Seit Anfang 2025 dürfen solche Speicher über die Abgrenzungsoption nach § 19 EEG auch aus dem Netz laden – nach Maßgabe der Leitlinien der Bundesnetzagentur –, ohne dass die EEG-Förderung für den Solarstrom verloren geht – das macht Arbitrage und Regelenergie auch für PV-gekoppelte Speicher möglich. Mehr zur Verbindung mit Solarparks unter [Großspeicher](/de/grossspeicher) und [virtuelles Kraftwerk](/wissen/ratgeber/virtuelles-kraftwerk).",
        },
      ],
    },
    {
      id: "rechenbeispiel",
      titel: "Rechenbeispiel: 10 MW / 20 MWh",
      tocLabel: "Rechenbeispiel",
      bloecke: [
        {
          typ: "p",
          text: `**Ein 2-Stunden-Speicher mit ${MW} MW und ${MWH} MWh kostet schlüsselfertig rund ${fmtMio(CAPEX)} – im mittleren Erlösszenario erzielt er eine Projektrendite von etwa ${pct(S_MITTEL.irr)} vor Steuern und Finanzierung.** Die Rechnung geht von ${fmt(SPEICHER.capexProKwh.mittel)} €/kWh Systempreis, einem Baukostenzuschuss von ${fmt(BKZ_PRO_KW)} €/kW (${fmtEur(BKZ)}), ${fmtPct(OPEX_ANTEIL, 0)} Betriebskosten vom Capex pro Jahr, einem Erlösrückgang von ${fmtPct(ERLOES_RUECKGANG, 0)} pro Jahr und ${LAUFZEIT} Jahren Laufzeit ohne Restwert aus.`,
        },
        {
          typ: "tabelle",
          caption: `Wirtschaftlichkeit eines ${MW}-MW-/${MWH}-MWh-Speichers in drei Erlösszenarien`,
          kopf: ["", "Vorsichtig", "Mittel", "Gut"],
          zeilen: [
            ["Erlös je MW im 1. Jahr", fmtEur(SPEICHER.erloesProMwJahr.min), fmtEur(SPEICHER.erloesProMwJahr.mittel), fmtEur(SPEICHER.erloesProMwJahr.max)],
            ["Erlöse gesamt im 1. Jahr", fmtEur(S_MIN.e0), fmtEur(S_MITTEL.e0), fmtEur(S_MAX.e0)],
            ["Investition inkl. BKZ", fmtEur(CAPEX + BKZ), fmtEur(CAPEX + BKZ), fmtEur(CAPEX + BKZ)],
            [`Netto-Cashflow über ${LAUFZEIT} Jahre`, fmtEur(S_MIN.summe), fmtEur(S_MITTEL.summe), fmtEur(S_MAX.summe)],
            ["Projektrendite (IRR)", pct(S_MIN.irr), pct(S_MITTEL.irr), pct(S_MAX.irr)],
          ],
          hervorheben: 2,
          minBreite: 620,
          fussnote: `Orientierungsrechnung, kein Angebot. Ohne Baukostenzuschuss läge die Rendite im mittleren Szenario bei ${pct(S_MITTEL_OHNE_BKZ.irr)}. Nicht enthalten: Netzanschlusskosten außerhalb des BKZ, Zellersatz (Augmentation), Steuern, Fremdfinanzierung und Restwert.`,
        },
        {
          typ: "p",
          text: `Zum Vergleich: Der RWTH-Index wies für 2025 ein theoretisches Potenzial von ${fmt(ISEA_2H[2025])} € je MW für 2-h-Systeme und ${fmt(ISEA_1H[2025])} € für 1-h-Systeme aus. Unsere Spanne liegt bewusst darunter, weil reale Anlagen Prognosefehler, Verfügbarkeitsausfälle, die Marge des Vermarkters und die Zellalterung tragen. Wer mit dem Indexwert rechnet, überschätzt die Rendite. Das Beispiel zeigt auch: Der Baukostenzuschuss kostet im mittleren Szenario gut ${fmt((S_MITTEL_OHNE_BKZ.irr - S_MITTEL.irr) * 100, 0)} Prozentpunkte Rendite.`,
        },
        {
          typ: "tool",
          href: pfad("/rechner/projektbewertung"),
          titel: "Speicherprojekt bewerten",
          text: "Sie entwickeln oder kaufen ein Speicherprojekt? Der Projektbewertungsrechner ordnet Phase, Netzanschluss und Preis ein.",
          label: "Zur Projektbewertung",
        },
      ],
    },
    {
      id: "marktlage",
      titel: "Marktlage 2025/26: Netzanschluss, Baukostenzuschuss, Netzentgelte",
      tocLabel: "Marktlage und Regulierung",
      bloecke: [
        {
          typ: "p",
          text: `**Das knappste Gut für Speicherprojekte ist nicht die Batterie, sondern der Netzanschluss.** Laut Monitoring der Bundesnetzagentur gingen 2025 insgesamt 18.158 Anschlussbegehren für Batteriespeicher mit ${fmt(ANFRAGEN_GW, 1)} GW ein – zugesagt wurden ${fmt(ZUSAGEN_GW, 1)} GW. Viele Vorhaben werden an mehreren Standorten parallel angefragt; die Übertragungsnetzbetreiber haben deshalb ein Verfahren nach Reifegrad vorgeschlagen. Für Investoren heißt das: Eine verbindliche [Netzanschlusszusage](/wissen/lexikon#netzanschlusszusage) ist der wertvollste Baustein eines Speicherprojekts.`,
        },
        {
          typ: "tabelle",
          caption: "Regulatorischer Stand für Großspeicher in Deutschland, September 2026",
          kopf: ["Thema", "Stand", "Bedeutung für Investoren"],
          zeilen: [
            ["Baukostenzuschuss (BKZ)", "BGH, 15.07.2025 (EnVR 1/24): BKZ nach Leistungspreismodell auch für Speicher zulässig", "einmalige Kosten je kW; flexible Anschlussvereinbarungen können sie senken"],
            ["Netzentgelte beim Laden", "§ 118 Abs. 6 EnWG: 20 Jahre Befreiung bei Inbetriebnahme bis 4. August 2029", "wesentlich für Arbitrage-Erlöse"],
            ["Reform der Netzentgelte (AgNes)", "BNetzA-Zwischenstand Mai 2026: Vertrauensschutz bei belastbarer Investitionsentscheidung vor der Festlegung; finale Regeln bis Ende 2026 geplant", "Investitionsentscheidung dokumentieren; nach 2029 Leistungsentgelt möglich"],
            ["Bauplanungsrecht", "§ 35 Abs. 1 Nr. 11 und 12 BauGB: Privilegierung im Außenbereich unter Bedingungen", "Baugenehmigung statt Bebauungsplan möglich"],
          ],
          minBreite: 680,
        },
        {
          typ: "kasten",
          variant: "recht",
          titel: "Rechtslage: Privilegierung von Batteriespeichern im Außenbereich",
          text: "Seit der BauGB-Änderung Ende 2025 sind Batteriespeicher im Außenbereich in zwei Fällen privilegiert: nach § 35 Abs. 1 Nr. 11 BauGB im räumlich-funktionalen Zusammenhang mit einer bestehenden Erneuerbare-Energien-Anlage, nach Nr. 12 als eigenständiger Speicher mit mindestens 4 MW Nennleistung, höchstens 200 m von der Grundstücksgrenze eines Umspannwerks (Hoch-/Mittelspannung oder höher) oder eines Kraftwerks ab 50 MW entfernt. Alle so zugelassenen Speicher einer Gemeinde dürfen zusammen höchstens 0,5 % der Gemeindefläche und maximal 50.000 m² belegen. Außerhalb dieser Fälle braucht es in der Regel einen [Bebauungsplan](/wissen/ratgeber/solarpark-genehmigung-bebauungsplan). Stand September 2026 – Details bitte im Einzelfall rechtlich prüfen lassen.",
        },
        {
          typ: "p",
          text: "Die Netzentgeltbefreiung steht auf einer Verordnungsermächtigung: Nach § 118 Abs. 6 Satz 12 EnWG darf die Bundesnetzagentur abweichende Regeln treffen, auch zum zeitlichen Anwendungsbereich. Nachdem sie das Privileg zunächst grundsätzlich infrage gestellt hatte, hat sie im Mai 2026 einen stärkeren Vertrauensschutz angekündigt. Bis zur finalen AgNes-Festlegung bleibt ein Restrisiko, das in jeder Bewertung als Szenario auftauchen sollte.",
        },
      ],
    },
    {
      id: "risiken",
      titel: "Risiken und Grenzen",
      bloecke: [
        {
          typ: "checkliste",
          punkte: [
            "**Kannibalisierung:** Jeder neue Speicher glättet die Preisspitzen, von denen alle leben. Bei Hunderten Gigawatt in der Warteschlange ist ein weiterer Erlösrückgang wahrscheinlich.",
            "**Regulierung:** Netzentgelte nach 2029, Höhe des Baukostenzuschusses, Regeln für Netzanschluss und Regelenergie können sich ändern.",
            "**Technik und Alterung:** Kapazitätsverlust der Zellen, Verfügbarkeit, Brandschutz und Garantiebedingungen des Herstellers; Zellersatz oder Nachrüstung (Augmentation) im Laufe der Betriebszeit einplanen.",
            "**Vermarktung:** Die Qualität des Optimierers entscheidet über einen großen Teil der Erlöse; Vertragslaufzeiten, Erlösbeteiligung und Mindestgarantien vergleichen.",
            "**Netzanschluss und Zeit:** Lange Wartezeiten binden Entwicklungskapital; Zusagen können an Fristen und Kautionen gebunden sein (die BNetzA nennt rund 1.500 €/MW als angemessene Realisierungskaution).",
          ],
        },
        {
          typ: "kasten",
          variant: "tipp",
          text: "Rechnen Sie mindestens drei Szenarien und prüfen Sie, ob das Projekt auch im vorsichtigen Fall seinen Kapitaldienst trägt. Ein Tolling-Vertrag für einen Teil der Leistung kann die Finanzierung deutlich erleichtern.",
        },
      ],
    },
    {
      id: "dach",
      titel: "Österreich und Schweiz in Kürze",
      tocLabel: "Österreich und Schweiz",
      bloecke: [
        {
          typ: "p",
          text: "**In Österreich ist die Netzentgeltfrage für Speicher nach aktuellem Stand noch offen.** Das neue Elektrizitätswirtschaftsgesetz (ElWG) sieht eine Befreiung für systemdienliche Speicher vor; wie streng die E-Control die Bedingungen in ihrer Verordnung fasst, wurde im September 2026 kontrovers diskutiert. Die Branche fordert Befreiungen, die sich am tatsächlichen Netzverhalten orientieren. Wer in Österreich plant, sollte die endgültige Verordnung abwarten oder sie als Szenario abbilden.",
        },
        {
          typ: "p",
          text: "**In der Schweiz sind reine Speicher ohne Endverbrauch seit 1. Januar 2025 vom Netznutzungsentgelt befreit** (Art. 14a StromVG). Für Speicher mit Endverbrauch wird seit 2026 das Netznutzungsentgelt für die zurückgespeiste Menge rückerstattet – nur für die Arbeitskomponente und mit geeigneter Messung. Das Marktumfeld ist kleiner als in Deutschland, Regelenergie wird über Swissgrid beschafft.",
        },
      ],
    },
    {
      id: "vorgehen",
      titel: "Vorgehen für Investoren und Flächeneigentümer",
      tocLabel: "Vorgehen",
      bloecke: [
        {
          typ: "ablauf",
          schritte: [
            ["Standort prüfen", "Nähe zu einem Umspannwerk, freie Netzkapazität und planungsrechtliche Einordnung (Privilegierung oder B-Plan) klären. Flächeneigentümer können eine Fläche über den [Flächencheck](/de/flaechencheck) einreichen."],
            ["Netzanschluss anfragen", "Anschlussbegehren mit Leistung, Kapazität und Zeitplan stellen; BKZ und mögliche flexible Anschlussvereinbarung erfragen."],
            ["Erlösmodell festlegen", "Merchant, Tolling oder Mischform; Angebote mehrerer Vermarkter einholen und Szenarien rechnen."],
            ["Investitionsentscheidung dokumentieren", "Mit Blick auf den Vertrauensschutz bei den Netzentgelten Beschlüsse, Verträge und Finanzierung sauber datieren."],
            ["Bau und Inbetriebnahme", "Bestellung, Genehmigung, Anschluss – die Inbetriebnahme vor dem 4. August 2029 ist für die Netzentgeltbefreiung entscheidend."],
          ],
        },
        {
          typ: "p",
          text: "Speicherprojekte in Entwicklung oder mit Netzzusage werden auch über die [Projektbörse](/projektboerse) gehandelt. Worauf beim Kauf zu achten ist, erklärt der Ratgeber [Projektrechte kaufen](/wissen/ratgeber/projektrechte-kaufen-due-diligence).",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Wie viel verdient ein Batteriegroßspeicher pro MW?",
      a: `Als Orientierung rechnen wir für 2-h-Speicher mit ${fmt(SPEICHER.erloesProMwJahr.min)}–${fmt(SPEICHER.erloesProMwJahr.max)} € je MW und Jahr. Der Erlösindex der RWTH Aachen zeigte für 2025 ein theoretisches Potenzial von ${fmt(ISEA_2H[2025])} €; reale Anlagen erreichen weniger.`,
    },
    {
      q: "Was kostet ein Batteriegroßspeicher?",
      a: `Schlüsselfertige 2-h-Systeme liegen 2026 bei rund ${fmt(SPEICHER.capexProKwh.min)}–${fmt(SPEICHER.capexProKwh.max)} €/kWh, also etwa ${fmtMio(CAPEX)} für 20 MWh. Hinzu kommen Netzanschluss und Baukostenzuschuss.`,
    },
    {
      q: "Müssen Batteriespeicher Netzentgelte zahlen?",
      a: "Für den Strombezug zum Einspeichern nicht, wenn sie bis 4. August 2029 in Betrieb gehen – dann gilt die Befreiung nach § 118 Abs. 6 EnWG für 20 Jahre. Für spätere Anlagen plant die Bundesnetzagentur im AgNes-Verfahren neue Regeln.",
    },
    {
      q: "Darf der Netzbetreiber einen Baukostenzuschuss verlangen?",
      a: "Ja. Der Bundesgerichtshof hat am 15. Juli 2025 (EnVR 1/24) entschieden, dass Baukostenzuschüsse nach dem Leistungspreismodell auch für netzgekoppelte Batteriespeicher zulässig sind. Die Höhe richtet sich nach dem Preisblatt des jeweiligen Netzbetreibers.",
    },
    {
      q: "Brauche ich für einen Großspeicher einen Bebauungsplan?",
      a: "Nicht immer. Seit Ende 2025 sind Speicher im Außenbereich privilegiert, wenn sie an eine bestehende Erneuerbare-Energien-Anlage gekoppelt sind oder mindestens 4 MW haben und nahe an einem Umspannwerk liegen. Sonst ist meist ein Bebauungsplan nötig.",
    },
    {
      q: "Kann ich meine Fläche für einen Batteriespeicher verpachten?",
      a: "Ja, gefragt sind vor allem Flächen in der Nähe von Umspannwerken. Der Flächenbedarf ist deutlich kleiner als bei einem Solarpark. Mehr dazu unter [Fläche verpachten](/de/flaeche-verpachten).",
    },
  ],

  passend: [
    { href: pfad("/grossspeicher"), titel: "Großspeicher", text: "Speicherprojekte entwickeln, verpachten, investieren." },
    { href: "/wissen/ratgeber/virtuelles-kraftwerk", titel: "Virtuelles Kraftwerk", text: "Wie Speicher, Parks und Verbraucher gemeinsam vermarktet werden." },
    { href: "/wissen/ratgeber/projektrechte-kaufen-due-diligence", titel: "Projektrechte kaufen", text: "Preise, Struktur und Due Diligence." },
    { href: "/wissen/ratgeber/ppa-fuer-unternehmen", titel: "PPA für Unternehmen", text: "Grünstrom langfristig beziehen." },
    { href: pfad("/rechner/grossspeicher"), titel: "Großspeicher-Rechner", text: "Rendite eines Batteriespeichers mit eigenen Werten berechnen." },
    { href: "/projektboerse", titel: "Projektbörse", text: "Speicher- und Solarprojekte im DACH-Raum ansehen." },
  ],

  quellen: [
    { titel: "pv magazine – Erlöspotenziale für stationäre Batteriespeicher sind 2025 zurückgegangen (RWTH Aachen ISEA)", url: "https://www.pv-magazine.de/2026/01/23/erloespotenziale-fuer-stationaere-batteriespeicher-in-deutschland-sind-2025-zurueckgegangen/", stand: "09/2026" },
    { titel: "Bundesgerichtshof – Bundesgerichtshof billigt Baukostenzuschuss für Batteriespeicher (EnVR 1/24)", url: "https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2025/2025129.html", stand: "09/2026" },
    { titel: "Energiewirtschaftsgesetz – § 118 EnWG Übergangsregelungen", url: "https://www.gesetze-im-internet.de/enwg_2005/__118.html", stand: "09/2026" },
    { titel: "Baugesetzbuch – § 35 BauGB Bauen im Außenbereich", url: "https://www.gesetze-im-internet.de/bbaug/__35.html", stand: "09/2026" },
    { titel: "Bundesnetzagentur – Stromspeicher", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Speicher/start.html", stand: "09/2026" },
    { titel: "pv magazine – Netzanschlüsse für Batteriespeicher: 574 Gigawatt angefragt, 54 Gigawatt zugesagt", url: "https://www.pv-magazine.de/2026/08/25/netzanschluesse-fuer-batteriespeicher-574-gigawatt-angefragt-54-gigawatt-zugesagt/", stand: "09/2026" },
    { titel: "pv magazine – Bundesnetzagentur: Netzentgeltbefreiung für Batteriespeicher bleibt bis 2029", url: "https://www.pv-magazine.de/2026/05/27/bundesnetzagentur-netzentgeltbefreiung-fuer-batteriespeicher-bleibt-bis-2029-mehrkosten-fuer-prosumer/", stand: "09/2026" },
    { titel: "dena / Marktoffensive Erneuerbare Energien – PPA-Marktanalyse 2025", url: "https://www.dena.de/fileadmin/dena/Publikationen/PDFs/2026/PPA_Marktanalyse_2025.pdf", stand: "09/2026" },
  ],

  seitenCta: { titel: "Speicherprojekt im Blick?", text: "Phase, Netzanschluss und Preis einordnen.", href: pfad("/rechner/projektbewertung"), label: "Projekt bewerten" },
  cta: {
    title: "Speicherprojekte entwickeln, kaufen oder Fläche anbieten.",
    text: "ÖkoInvest entwickelt Freiflächen-PV, Agri-PV und Großspeicher. In der Projektbörse finden Investoren Projekte nach Phase und Region – kostenfrei.",
    primary: { label: "Zur Projektbörse", href: "/projektboerse" },
    secondary: { label: "Mehr zu Großspeichern", href: pfad("/grossspeicher") },
  },
};

export default artikel;
