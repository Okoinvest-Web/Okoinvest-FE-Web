// Ratgeber: Ertragsgutachten P50/P90 – Einstrahlungsdaten, Verlustkette, Unsicherheiten, Bankfinanzierung
// Recherchestand 29.09.2026 (IEA PVPS T13-12:2018 Uncertainties in PV System Yield Predictions;
// Ineichen 2011, Year-to-year variability of global irradiation; PVGIS-Handbuch JRC; IEC 61724-1:2021;
// IEA PVPS T13-14:2021 Bifacial). Standardwerte aus src/lib/invest/markt.js, Rechenkern src/lib/rechner/solarpark.js.

import { REGIONEN, FINANZIERUNG, BAUART, ERLOESE, annuitaet, STAND } from "@/lib/invest/markt";
import { rechneSolarpark, STANDARD } from "@/lib/rechner/solarpark";
import { fmt, fmtEur, fmtMio, fmtPct, fmtCt } from "@/lib/rechner/annahmen";
import { pfad } from "../../lib/land/index.js";

/* Werte, die (noch) nicht in markt.js stehen – Vorschlag zur Übernahme */
// z-Werte der Standardnormalverteilung für die Überschreitungswahrscheinlichkeiten (einseitig)
const Z = { p75: 0.674, p90: 1.282, p99: 2.326 };
// Unsicherheiten (1 Sigma, relativ) für das Rechenbeispiel – Größenordnungen nach IEA PVPS T13-12:2018:
// Satellitendaten mit 2–6 % RMSE für Jahressummen, Trend-/Dimming-Unsicherheit rund 3 % in Deutschland.
const U_EINSTRAHLUNG = 0.04; // Langzeitmittel der Einstrahlung (Datensatz + Trend), eigene Setzung im Rahmen der Quelle
const U_MODELL = 0.02; // Transposition, Modul- und Wechselrichtermodell
const U_VERLUSTE = 0.03; // Verschmutzung, Verfügbarkeit, Degradation, sonstige Verluste
// Ineichen (2011): Schwankung der Jahressumme der Globalstrahlung an europäischen Stationen meist 3–7 %
const U_JAHR = 0.05; // interannuelle Variabilität, gewählter Mittelwert für Mitteleuropa
// PVGIS-Handbuch (JRC): voreingestellter Gesamtverlust für die Systemsimulation
const PVGIS_VERLUST = 0.14;
// IEA PVPS T13-14:2021: bifazialer Mehrertrag unter üblichen Bedingungen etwa 2–10 %
const BIFAZIAL = { min: 0.02, max: 0.1 };

/* ---------- P-Werte ---------- */
const REGION = REGIONEN.find((r) => r.id === "de-sued");
const P50 = REGION.ertrag; // kWh/kWp im ersten Jahr
const uLang2 = U_EINSTRAHLUNG ** 2 + U_MODELL ** 2 + U_VERLUSTE ** 2;
const sigma = (jahre) => Math.sqrt(uLang2 + U_JAHR ** 2 / jahre);
const S1 = sigma(1);
const S10 = sigma(10);
const pWert = (z, s) => P50 * (1 - z * s);
const P = {
  p75_1: pWert(Z.p75, S1),
  p90_1: pWert(Z.p90, S1),
  p99_1: pWert(Z.p99, S1),
  p75_10: pWert(Z.p75, S10),
  p90_10: pWert(Z.p90, S10),
  p99_10: pWert(Z.p99, S10),
};
const kwh = (x) => `${fmt(x)} kWh/kWp`;
const anteil = (x) => fmtPct(x / P50, 1);

/* ---------- Bankrechnung: 10 MWp, Schuldendienst auf P50 und P90 dimensioniert ---------- */
const BASIS = rechneSolarpark();
const TJ = STANDARD.tilgungJahre;
const faktorRate = annuitaet(1, FINANZIERUNG.zins, TJ);
/** minimaler Cashflow in der Tilgungsphase, wenn die Erzeugung um den Faktor f vom P50 abweicht */
const minCfads = (f) => Math.min(...BASIS.jahre.slice(0, TJ).map((j) => j.erloes * f - j.kosten));
const F90_1 = P.p90_1 / P50;
const F90_10 = P.p90_10 / P50;
const FK_P50 = minCfads(1) / FINANZIERUNG.dscrZiel / faktorRate;
const FK_P90_1 = minCfads(F90_1) / FINANZIERUNG.dscrZiel / faktorRate;
const FK_P90_10 = minCfads(F90_10) / FINANZIERUNG.dscrZiel / faktorRate;
const INV = BASIS.investition.summe;
const RATE_P90_1 = FK_P90_1 * faktorRate;
// DSCR im ersten Jahr, wenn tatsächlich P50 eintritt, bei auf P90 (1 Jahr) dimensioniertem Darlehen
const DSCR_BEI_P50 = BASIS.jahre[0].ebitda / RATE_P90_1;
const ERLOES_1 = BASIS.jahre[0].erloes;
const pct = (x) => fmtPct(x, 0);

const artikel = {
  slug: "ertragsgutachten-p50-p90",
  title: "Ertragsgutachten P50/P90: So rechnen Banken mit dem Solarertrag",
  seoTitle: "Ertragsgutachten P50/P90 für Solarparks | ÖkoInvest",
  kurzTitel: "Ertragsgutachten P50/P90",
  description:
    "Ertragsgutachten P50/P90 für Solarparks: Einstrahlungsdaten, Verlustkette, Unsicherheiten, z-Werte für P90 über 1 und 10 Jahre und die Wirkung auf den Kredit.",
  excerpt:
    "Warum ein Solarpark mit demselben erwarteten Ertrag je nach Gutachten mehr oder weniger Kredit bekommt: Einstrahlungsdaten, Verlustkette und Unsicherheiten – mit durchgerechnetem P50/P90-Beispiel.",
  hauptKeyword: "ertragsgutachten p50 p90",
  keywords: [
    "Ertragsgutachten Solarpark",
    "P50 P90 Photovoltaik",
    "P90 Ertrag berechnen",
    "Ertragsprognose PV-Freifläche",
    "Performance Ratio Solarpark",
    "Unsicherheit Einstrahlung",
    "DSCR P90",
  ],
  veroeffentlicht: "2026-09-29",
  aktualisiert: "2026-09-29",
  kategorie: "Investieren & Projektbörse",
  bild: "/img/planer-tablet.jpg",
  bildAlt: "Ingenieur mit weißem Schutzhelm prüft Daten auf einem Tablet vor aufgeständerten Solarmodulen",
  badge: { wert: anteil(P.p90_1), text: "P90 (1 Jahr) im Verhältnis zum P50 im Rechenbeispiel" },

  kurzFazit: [
    "**P50 ist der erwartete Jahresertrag, der mit 50 % Wahrscheinlichkeit übertroffen wird; P90 wird mit 90 % Wahrscheinlichkeit erreicht.** P50 treibt den Kaufpreis, P90 die Kredithöhe.",
    `Der Abstand ergibt sich aus der Gesamtunsicherheit: **P90 = P50 × (1 − ${fmt(Z.p90, 3)} × σ**). Im Beispiel liegt σ für ein Einzeljahr bei ${fmtPct(S1, 1)}, der P90 damit bei ${anteil(P.p90_1)} des P50.`,
    `**P90 über 10 Jahre liegt höher als P90 für ein Jahr**, weil sich gute und schlechte Wetterjahre ausgleichen – im Beispiel ${anteil(P.p90_10)} statt ${anteil(P.p90_1)}.`,
    `Banken bemessen das Darlehen meist so, dass der Schuldendienstdeckungsgrad (DSCR) auch beim P90 mindestens um ${fmt(FINANZIERUNG.dscrZiel, 2)} liegt. Im 10-MWp-Beispiel kostet der Unterschied zwischen P50- und P90-Dimensionierung rund **${fmtMio(FK_P50 - FK_P90_1)} Fremdkapital**.`,
    "Die größten Stellschrauben im Gutachten sind **Einstrahlungsdatensatz, Verlustannahmen und die Behandlung von Unsicherheiten** – nicht die Simulationssoftware.",
  ],

  abschnitte: [
    {
      id: "antwort",
      titel: "Was bedeuten P50 und P90 im Ertragsgutachten?",
      tocLabel: "Kurze Antwort",
      bloecke: [
        {
          typ: "p",
          text: `**P50 und P90 sind Überschreitungswahrscheinlichkeiten: Der P50-Wert wird im langjährigen Mittel mit 50 % Wahrscheinlichkeit erreicht oder übertroffen, der P90-Wert mit 90 %.** Für einen gut geplanten Solarpark in Süddeutschland rechnen die ÖkoInvest-Rechner mit einem P50 um ${kwh(P50)} im ersten Jahr. Mit den Unsicherheiten aus unserem Beispiel ergibt sich daraus ein P90 für ein einzelnes Jahr von rund ${kwh(P.p90_1)} – knapp ${fmt((1 - P.p90_1 / P50) * 100, 0)} % weniger.`,
        },
        {
          typ: "p",
          text: `Ein Ertragsgutachten (englisch Energy Yield Assessment) ist die zentrale technische Unterlage für Kauf, Finanzierung und Versicherung eines Parks. Es beantwortet zwei Fragen: Wie viel Strom erzeugt die Anlage im Mittel – und wie sicher ist diese Zahl? Die erste Frage bestimmt die erwartete Rendite, die zweite, wie viel Kredit eine Bank gibt. Die Begriffe sind im Lexikon unter [P50/P90](/wissen/lexikon#p50-p90) und [spezifischer Ertrag](/wissen/lexikon#spezifischer-ertrag) kurz erklärt; hier geht es um die Berechnung und ihre Folgen.`,
        },
        {
          typ: "kennzahl",
          wert: `${fmt(P.p90_1)} kWh/kWp`,
          titel: "P90 (1 Jahr) bei P50 = " + fmt(P50) + " kWh/kWp",
          text: `Rechenbeispiel Süddeutschland mit Gesamtunsicherheit ${fmtPct(S1, 1)} (1 Sigma). Über 10 Jahre gemittelt: ${kwh(P.p90_10)}.`,
        },
      ],
    },
    {
      id: "einstrahlung",
      titel: "Einstrahlungsdaten: PVGIS, Meteonorm oder SolarGIS?",
      tocLabel: "Einstrahlungsdaten",
      bloecke: [
        {
          typ: "p",
          text: "**Am Anfang jedes Gutachtens steht ein langjähriger Einstrahlungsdatensatz für den Standort – und seine Wahl verschiebt den P50 oft stärker als jede andere Annahme.** Üblich sind satellitengestützte Zeitreihen, ergänzt oder abgeglichen mit Bodenmessungen von Wetterstationen.",
        },
        {
          typ: "tabelle",
          caption: "Gängige Einstrahlungsquellen für Ertragsgutachten, Stand " + STAND,
          kopf: ["Datenquelle", "Art", "Typischer Einsatz"],
          zeilen: [
            ["PVGIS (EU-Kommission, JRC)", "frei zugänglich; für Europa standardmäßig Satellitendatensatz SARAH-3 (stündlich, Jahre 2005–2023)", "Vorprüfung, Plausibilisierung, Flächenbewertung"],
            ["Meteonorm", "kommerziell; interpolierte Stationsdaten und Satellit, synthetische typische Jahre", "Standard in vielen Simulationsprogrammen, Planungsphase"],
            ["SolarGIS, Solcast u. a.", "kommerziell; satellitengestützte Zeitreihen hoher Auflösung mit Unsicherheitsangabe", "bankfähige Gutachten, Transaktionen"],
            ["Messung vor Ort", "Pyranometer bzw. Referenzzellen am Standort", "Kalibrierung von Satellitendaten, Betrieb (Performance Ratio)"],
          ],
          hervorheben: 1,
          minBreite: 640,
          fussnote: "Hersteller- und Produktnamen dienen der Einordnung, keine Empfehlung. Bankfähig ist ein Gutachten vor allem dann, wenn es von einem unabhängigen, bei Kreditgebern anerkannten Gutachter stammt und die Datenquellen offenlegt.",
        },
        {
          typ: "p",
          text: "Laut dem Unsicherheitsbericht der Internationalen Energieagentur (IEA PVPS Task 13) liegen die Abweichungen satellitengestützter Einstrahlung für Jahressummen meist zwischen 2 und 6 %. Hinzu kommt ein oft unterschätzter Effekt: Die Einstrahlung in Deutschland hat seit den 1980er-Jahren zugenommen („Global Brightening“). Wer mit einem 30-jährigen Mittel rechnet, liegt laut IEA-Bericht tendenziell zu niedrig; empfohlen wird eher ein jüngerer Zeitraum von rund zehn Jahren. Zwei Gutachten mit unterschiedlichen Referenzzeiträumen können deshalb um mehrere Prozent auseinanderliegen, ohne dass eines „falsch“ ist.",
        },
        {
          typ: "tool",
          href: pfad("/rechner/solarpark"),
          titel: "Ertrag und Rendite überschlagen",
          text: "Region, Bauart und Leistung wählen – der Solarpark-Rechner zeigt Ertrag, Cashflow und DSCR über die Laufzeit.",
          label: "Zum Solarpark-Rechner",
        },
      ],
    },
    {
      id: "verlustkette",
      titel: "Die Verlustkette: Von der Einstrahlung zum eingespeisten Strom",
      tocLabel: "Verlustkette",
      bloecke: [
        {
          typ: "p",
          text: `**Zwischen der Einstrahlung auf die Modulebene und der Einspeisung am Netzverknüpfungspunkt gehen in der Regel 10 bis 20 % der Energie verloren – diese Verlustkette ist der zweite große Hebel im Gutachten.** PVGIS setzt für eine einfache Simulation pauschal ${fmtPct(PVGIS_VERLUST, 0)} Gesamtverlust an; bankfähige Gutachten zerlegen die Verluste einzeln und begründen jede Position.`,
        },
        {
          typ: "liste",
          nummeriert: true,
          punkte: [
            "**Einstrahlung auf die Modulebene:** Umrechnung der horizontalen Einstrahlung auf Neigung und Ausrichtung (Transposition), Verschattung durch Horizont und Nachbarreihen.",
            "**Optische Verluste:** Einfallswinkel, Verschmutzung, Schnee, Spektrum.",
            "**Modulverluste:** Temperatur (im Sommer der größte Einzelposten), Schwachlicht, Toleranzen, Mismatch, lichtinduzierte Degradation im ersten Jahr.",
            "**Elektrische Verluste:** Gleichstromkabel, Wechselrichter-Wirkungsgrad, Abregelung bei Überdimensionierung (DC/AC-Verhältnis), Wechselstromkabel, Transformator.",
            "**Betrieb:** technische Verfügbarkeit, Netzabregelung, Eigenverbrauch der Anlage, jährliche [Degradation](/wissen/lexikon#degradation).",
          ],
        },
        {
          typ: "p",
          text: `Das Verhältnis aus tatsächlich eingespeister Energie und der theoretisch möglichen Energie bei gemessener Einstrahlung heißt [Performance Ratio](/wissen/lexikon#performance-ratio). Moderne Freiflächenanlagen erreichen in der Regel 80 bis 90 %; die Standardwerte der Website unterstellen rund 85 %. Wie die Performance Ratio im Betrieb gemessen wird, regelt die Norm **IEC 61724-1** (Monitoring von PV-Anlagen), die auch Genauigkeitsklassen für Sensoren und Messsysteme festlegt. Für Käufer ist das wichtig: Nur mit sauberem Monitoring lässt sich später prüfen, ob der Park das Gutachten erfüllt.`,
        },
        {
          typ: "h3",
          text: "Bifaziale Module und Tracker",
        },
        {
          typ: "p",
          text: `Bei [bifazialen](/wissen/lexikon#bifazial) Modulen kommt die Rückseite hinzu. Der Mehrertrag hängt stark von der Bodenreflexion (Albedo), der Aufständerungshöhe und dem Reihenabstand ab; die IEA nennt unter üblichen Bedingungen etwa ${fmtPct(BIFAZIAL.min, 0)} bis ${fmtPct(BIFAZIAL.max, 0)}. Weil die Albedo einer Wiese über das Jahr schwankt, ist die Unsicherheit dieses Postens höher als bei monofazialen Anlagen. Einachsige [Tracker](/wissen/lexikon#tracker) erhöhen den Ertrag gegenüber fester Süd-Aufständerung deutlich – die Rechner setzen dafür den Faktor ${fmt(BAUART.tracker.faktor, 2)} an –, bringen aber zusätzliche Unsicherheiten durch Mechanik, Windstellung und Verfügbarkeit ins Gutachten.`,
        },
      ],
    },
    {
      id: "unsicherheiten",
      titel: "Welche Unsicherheiten in den P90 eingehen",
      tocLabel: "Unsicherheiten",
      bloecke: [
        {
          typ: "p",
          text: "**Die Gesamtunsicherheit setzt sich aus unabhängigen Einzelunsicherheiten zusammen, die quadratisch addiert werden: σ = √(σ₁² + σ₂² + …).** Dabei ist zu unterscheiden zwischen Unsicherheiten, die über die ganze Laufzeit gleich bleiben (etwa ein zu optimistischer Einstrahlungsdatensatz), und solchen, die sich von Jahr zu Jahr ausgleichen (das Wetter).",
        },
        {
          typ: "tabelle",
          caption: "Unsicherheiten im Rechenbeispiel (1 Sigma, relativ zum P50)",
          kopf: ["Quelle der Unsicherheit", "Wert im Beispiel", "Verhalten über die Zeit"],
          zeilen: [
            ["Langzeitmittel der Einstrahlung (Datensatz, Trend)", fmtPct(U_EINSTRAHLUNG, 1), "bleibt – mittelt sich nicht heraus"],
            ["Simulationsmodell (Transposition, Modul, Wechselrichter)", fmtPct(U_MODELL, 1), "bleibt"],
            ["Verlustannahmen (Verschmutzung, Verfügbarkeit, Degradation)", fmtPct(U_VERLUSTE, 1), "bleibt"],
            ["Wetter von Jahr zu Jahr (interannuell)", fmtPct(U_JAHR, 1), "sinkt mit √N über N Jahre"],
            ["**Gesamt, 1 Jahr**", `**${fmtPct(S1, 1)}**`, "Maßstab für den Schuldendienst eines Einzeljahres"],
            ["**Gesamt, Mittel über 10 Jahre**", `**${fmtPct(S10, 1)}**`, `interannuell nur noch ${fmtPct(U_JAHR / Math.sqrt(10), 1)}`],
          ],
          hervorheben: 1,
          markierteZeile: 4,
          minBreite: 640,
          fussnote: "Größenordnungen nach IEA PVPS T13-12:2018 (Satellitendaten 2–6 % für Jahressummen, Trendunsicherheit rund 3 %) und Ineichen (2011, Schwankung der Jahressumme an europäischen Stationen meist 3–7 %). Ein reales Gutachten weist standortspezifische Werte aus.",
        },
        {
          typ: "kasten",
          variant: "info",
          titel: "Warum der Wetteranteil durch √N geteilt wird",
          text: "Die Abweichungen einzelner Jahre sind weitgehend voneinander unabhängig. Im Mittel über N Jahre schrumpft ihre Standardabweichung deshalb auf σ/√N. Die Unsicherheit des Datensatzes dagegen ist systematisch: Ist das Langzeitmittel zu hoch angesetzt, ist es in jedem Jahr zu hoch.",
        },
      ],
    },
    {
      id: "berechnung",
      titel: "P50, P75, P90 und P99 berechnen: Rechenbeispiel",
      tocLabel: "Berechnung",
      bloecke: [
        {
          typ: "p",
          text: `**Unter der Annahme einer Normalverteilung gilt: P(x) = P50 × (1 − z × σ). Für P75 ist z = ${fmt(Z.p75, 3)}, für P90 z = ${fmt(Z.p90, 3)} und für P99 z = ${fmt(Z.p99, 3)}.** Mit dem P50 von ${kwh(P50)} und den Unsicherheiten aus der Tabelle oben ergeben sich folgende Werte:`,
        },
        {
          typ: "tabelle",
          caption: `P-Werte für einen Solarpark in Süddeutschland, P50 = ${kwh(P50)}`,
          kopf: ["Wert", "z", "1 Jahr (σ = " + fmtPct(S1, 1) + ")", "Mittel 10 Jahre (σ = " + fmtPct(S10, 1) + ")"],
          zeilen: [
            ["P50", "0", `${kwh(P50)} (100 %)`, `${kwh(P50)} (100 %)`],
            ["P75", fmt(Z.p75, 3), `${kwh(P.p75_1)} (${anteil(P.p75_1)})`, `${kwh(P.p75_10)} (${anteil(P.p75_10)})`],
            ["**P90**", fmt(Z.p90, 3), `**${kwh(P.p90_1)} (${anteil(P.p90_1)})**`, `**${kwh(P.p90_10)} (${anteil(P.p90_10)})**`],
            ["P99", fmt(Z.p99, 3), `${kwh(P.p99_1)} (${anteil(P.p99_1)})`, `${kwh(P.p99_10)} (${anteil(P.p99_10)})`],
          ],
          hervorheben: 2,
          markierteZeile: 2,
          minBreite: 620,
          fussnote: "Erstes Betriebsjahr, ohne Degradation. Vereinfachte Normalverteilung; manche Gutachter modellieren Unsicherheiten per Monte-Carlo-Simulation und erhalten leicht abweichende Werte.",
        },
        {
          typ: "p",
          text: `Für einen Park mit ${fmt(STANDARD.mwp)} MWp bedeutet das: Der P50-Ertrag liegt bei rund ${fmt((P50 * STANDARD.mwp * 1000) / 1e6, 1)} GWh im Jahr, der P90 (1 Jahr) bei ${fmt((P.p90_1 * STANDARD.mwp * 1000) / 1e6, 1)} GWh. Beim EEG-Zuschlag von ${fmtCt(ERLOESE.eegFreiflaecheCt)} entspricht die Differenz im ersten Jahr rund ${fmtEur(Math.round((ERLOES_1 * (1 - F90_1)) / 1000) * 1000)} Umsatz. Das ist kein erwarteter Verlust, sondern der Sicherheitspuffer, den die Bank in ihre Rechnung einbaut.`,
        },
      ],
    },
    {
      id: "banken",
      titel: "Warum Banken auf P90 finanzieren: DSCR und Kredithöhe",
      tocLabel: "Bedeutung für Banken",
      bloecke: [
        {
          typ: "p",
          text: `**Banken bemessen das Darlehen so, dass der Cashflow auch in einem schwachen Jahr Zins und Tilgung mit Sicherheitsabstand deckt – dafür rechnen sie mit P90 statt P50.** Maßstab ist der Schuldendienstdeckungsgrad ([DSCR](/wissen/lexikon#dscr)). Die Website rechnet mit einem Mindest-DSCR von ${fmt(FINANZIERUNG.dscrZiel, 2)}, ${fmtPct(FINANZIERUNG.zins, 1)} Zins und ${fmt(TJ)} Jahren Tilgung. In der Praxis verlangen Kreditgeber oft zwei Bedingungen gleichzeitig – etwa einen Mindest-DSCR auf P50 und einen niedrigeren auf P90 –, und die strengere bestimmt die Kredithöhe.`,
        },
        {
          typ: "tabelle",
          caption: `Maximales Darlehen für ${fmt(STANDARD.mwp)} MWp in Süddeutschland je nach Ertragsbasis (DSCR ${fmt(FINANZIERUNG.dscrZiel, 2)})`,
          kopf: ["Ertragsbasis", "Ertrag Jahr 1", "Max. Darlehen", "Anteil an Investition"],
          zeilen: [
            ["P50", kwh(P50), fmtMio(FK_P50), pct(FK_P50 / INV)],
            ["P90 (10 Jahre)", kwh(P.p90_10), fmtMio(FK_P90_10), pct(FK_P90_10 / INV)],
            ["**P90 (1 Jahr)**", kwh(P.p90_1), `**${fmtMio(FK_P90_1)}**`, `**${pct(FK_P90_1 / INV)}**`],
          ],
          hervorheben: 2,
          markierteZeile: 2,
          minBreite: 600,
          fussnote: `Investition ${fmtMio(INV)} inkl. Netzanschluss und Entwicklung; Erlöse, Betriebskosten und Pacht wie im Solarpark-Rechner (EEG ${fmtCt(ERLOESE.eegFreiflaecheCt)}, danach Marktwert). Maßgeblich ist das schwächste Jahr der Tilgungsphase. Vereinfachte Rechnung vor Steuern, keine Finanzierungszusage.`,
        },
        {
          typ: "p",
          text: `Das Beispiel zeigt die Hebelwirkung: Ein paar Prozent weniger P90 kosten schnell mehrere Hunderttausend Euro Kredit, die als Eigenkapital nachgeschossen werden müssen – und senken so die Eigenkapitalrendite. Tritt später tatsächlich der P50 ein, liegt der DSCR im ersten Jahr bei rund ${fmt(DSCR_BEI_P50, 2)}; der Überschuss fließt an die Eigentümer. Ein Gutachten mit gut begründeter, niedriger Unsicherheit ist deshalb bares Geld wert. Wie Rendite und Hebel zusammenhängen, erklärt der Ratgeber [Solarpark als Investment](/wissen/ratgeber/solarpark-investment-rendite); einen ausführlichen Blick auf Vermarktungsrisiken gibt der Ratgeber [Direktvermarktung](/wissen/ratgeber/direktvermarktung-solarpark).`,
        },
        {
          typ: "kasten",
          variant: "wichtig",
          titel: "Was das Gutachten nicht abdeckt",
          text: "Ein Ertragsgutachten prognostiziert Energie, nicht Erlöse. Abregelung bei [negativen Strompreisen](/wissen/ratgeber/negative-strompreise-solarspitzengesetz), Netzengpässe und sinkende Marktwerte müssen im Finanzmodell separat abgebildet werden. Auch Versicherungsschäden und längere Ausfälle sind nicht enthalten – dazu der Ratgeber [Solarpark-Versicherung](/wissen/ratgeber/solarpark-versicherung).",
        },
      ],
    },
    {
      id: "gutachten-pruefen",
      titel: "Ertragsgutachten beauftragen und prüfen",
      tocLabel: "Beauftragen & prüfen",
      bloecke: [
        {
          typ: "p",
          text: "**Ein bankfähiges Gutachten stammt von einem unabhängigen Gutachter, legt Datenquellen und Verlustannahmen offen und weist P50, P75 und P90 für ein Jahr und für mehrere Jahre aus.** Die Kosten hängen von Größe, Technik und Umfang ab; für einen einzelnen Freiflächenpark bewegen sie sich nach unserer Marktbeobachtung in der Regel im mittleren vier- bis unteren fünfstelligen Eurobereich. Das ist gering im Vergleich zur Wirkung auf Kaufpreis und Kredit.",
        },
        {
          typ: "checkliste",
          punkte: [
            "**Datenquelle und Referenzzeitraum** benannt, mit Begründung – und Abgleich mit mindestens einer zweiten Quelle.",
            "**Verlustkette einzeln** aufgeführt: Verschattung, Temperatur, Verschmutzung, Kabel, Wechselrichter, Transformator, Verfügbarkeit.",
            "**Layout und Komponenten** entsprechen der aktuellen Planung (Modul- und Wechselrichtertyp, DC/AC-Verhältnis, Reihenabstand).",
            "**Unsicherheiten** getrennt nach systematisch und interannuell, P-Werte für 1 und 10 Jahre.",
            "**Degradation** über die Laufzeit und bei bifazialen Modulen eine begründete Albedo-Annahme.",
            "**Bei Bestandsanlagen:** Abgleich mit Monitoringdaten mehrerer Betriebsjahre, bereinigt um Einstrahlung und Ausfälle.",
          ],
        },
        {
          typ: "p",
          text: "Beim Kauf eines Parks ersetzt der gemessene Ertrag nach und nach die Prognose. Wie Monitoringdaten, Degradation und Thermografie in den Kaufpreis eingehen, zeigt der Ratgeber [Wert einer Bestandsanlage](/wissen/ratgeber/solarpark-bestandsanlage-wert). Für Projekte vor dem Bau gehört das Gutachten in den [Datenraum](/wissen/lexikon#datenraum) und in die [Due Diligence](/wissen/ratgeber/projektrechte-kaufen-due-diligence). Passende Projekte finden Investoren in der [Projektbörse](/projektboerse).",
        },
      ],
    },
  ],

  faq: [
    {
      q: "Was ist der Unterschied zwischen P50 und P90?",
      a: "P50 ist der Ertrag, der mit 50 % Wahrscheinlichkeit übertroffen wird – der Erwartungswert. P90 wird mit 90 % Wahrscheinlichkeit erreicht und dient Banken als vorsichtige Basis für die Kreditbemessung.",
    },
    {
      q: "Wie berechnet man den P90-Wert?",
      a: `Bei Normalverteilung gilt P90 = P50 × (1 − ${fmt(Z.p90, 3)} × σ), wobei σ die relative Gesamtunsicherheit ist. Bei σ = ${fmtPct(S1, 1)} liegt der P90 bei ${anteil(P.p90_1)} des P50.`,
    },
    {
      q: "Warum ist der 10-Jahres-P90 höher als der 1-Jahres-P90?",
      a: "Weil sich gute und schlechte Wetterjahre über längere Zeit ausgleichen. Die wetterbedingte Unsicherheit sinkt mit der Wurzel der Jahresanzahl, die systematischen Unsicherheiten des Gutachtens bleiben bestehen.",
    },
    {
      q: "Was kostet ein Ertragsgutachten für einen Solarpark?",
      a: "Das hängt von Größe, Technik und Umfang ab. Für einen einzelnen Freiflächenpark liegen die Kosten nach unserer Marktbeobachtung meist im mittleren vier- bis unteren fünfstelligen Eurobereich. Holen Sie mehrere Angebote ein und klären Sie vorab, welche Gutachter Ihre Bank akzeptiert.",
    },
    {
      q: "Reicht eine PVGIS-Berechnung als Ertragsgutachten?",
      a: "Für eine erste Einschätzung ja, für Finanzierung oder Kauf meist nicht. PVGIS rechnet mit pauschalen Verlusten und liefert keine projektspezifische Unsicherheitsanalyse. Banken verlangen in der Regel ein unabhängiges Gutachten.",
    },
    {
      q: "Welche Performance Ratio ist bei Freiflächenanlagen üblich?",
      a: "Moderne Freiflächenanlagen erreichen in der Regel 80 bis 90 %. Deutlich niedrigere Werte im Betrieb deuten auf Ausfälle, Verschmutzung, Verschattung oder defekte Komponenten hin und sollten technisch geprüft werden.",
    },
  ],

  passend: [
    { href: "/wissen/ratgeber/solarpark-investment-rendite", titel: "Solarpark als Investment", text: "Rendite, Hebel und Sensitivitäten im 10-MWp-Beispiel." },
    { href: "/wissen/ratgeber/solarpark-bestandsanlage-wert", titel: "Wert einer Bestandsanlage", text: "DCF, Multiplikatoren und technische Due Diligence." },
    { href: pfad("/rechner/solarpark"), titel: "Solarpark-Rechner", text: "Ertrag, Cashflow und DSCR mit eigenen Werten." },
    { href: "/investoren", titel: "Für Investoren", text: "Suchprofil anlegen und passende Projekte finden." },
  ],

  quellen: [
    { titel: "IEA PVPS Task 13 – Uncertainties in PV System Yield Predictions and Assessments (Report T13-12:2018)", url: "https://iea-pvps.org/wp-content/uploads/2020/01/Uncertainties_in_PV_System_Yield_Predictions_and_Assessments_by_Task_13.pdf", stand: "09/2026" },
    { titel: "Ineichen, P. – Global irradiation: average and typical year, and year to year annual variability (2011)", url: "https://www.cuepe.ch/html/biblio/pdf/Ineichen_2011-global_irradiance_typical_year_and_annual_variability(swc).pdf", stand: "09/2026" },
    { titel: "EU JRC – PVGIS User Manual", url: "https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/pvgis-user-manual_en", stand: "09/2026" },
    { titel: "EU JRC – PVGIS Photovoltaic Geographical Information System", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/", stand: "09/2026" },
    { titel: "IEC 61724-1:2021 – Photovoltaic system performance, Part 1: Monitoring", url: "https://webstore.iec.ch/en/publication/65561", stand: "09/2026" },
    { titel: "IEA PVPS Task 13 – Bifacial Photovoltaic Modules and Systems (T13-14:2021, Executive Summary)", url: "https://iea-pvps.org/wp-content/uploads/2021/04/IEA-PVPS-T13-14_2021-Bifacial-Photovoltaic-Modules-and-Systems-executive-summary.pdf", stand: "09/2026" },
  ],

  seitenCta: { titel: "Ertrag und DSCR rechnen", text: "Cashflow, Kredithöhe und Rendite mit eigenen Annahmen.", href: pfad("/rechner/solarpark"), label: "Zum Solarpark-Rechner" },
  cta: {
    title: "Projekte mit geprüften Unterlagen finden.",
    text: "In der Projektbörse erhalten Investoren nach NDA Zugang zu Datenraum und Gutachten. Für Käufer ist die Plattform kostenfrei.",
    primary: { label: "Zur Projektbörse", href: "/projektboerse" },
    secondary: { label: "Für Investoren", href: "/investoren" },
  },
};

export default artikel;
