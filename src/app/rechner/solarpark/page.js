import RechnerSeite, { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import SolarparkRechner from "@/components/Rechner/SolarparkRechner";
import { ERLOESE, FINANZIERUNG, FREIFLAECHE, PACHT, STAND, REGIONEN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const PFAD = "/rechner/solarpark";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Solarpark-Renditerechner: IRR, LCOE, DSCR | ÖkoInvest",
  description:
    "Profi-Rechner für Solarparks: Projekt- und EK-IRR, LCOE, Kapitalwert, DSCR und Cashflow über 30 Jahre – mit EEG, PPA oder Merchant und Sensitivitätsmatrix.",
  keywords: ["Solarpark Rendite", "Solarpark Rechner", "IRR Photovoltaik", "LCOE Solarpark", "DSCR Solarpark", "PPA Solarpark", "Freiflächenanlage Wirtschaftlichkeit"],
});

const FAQ = [
  {
    q: "Was ist der Unterschied zwischen Projekt-IRR und Eigenkapital-IRR?",
    a: "Die Projekt-IRR bewertet den Solarpark ohne Finanzierung: Investition gegen Erlöse abzüglich Betriebskosten. Die Eigenkapital-IRR betrachtet nur das eingesetzte Eigenkapital nach Zins und Tilgung. Liegt die Projektrendite über dem Darlehenszins, hebt Fremdkapital die Eigenkapitalrendite (positiver Hebel) – liegt sie darunter, senkt es sie. Beide Werte sind hier vor Steuern gerechnet.",
  },
  {
    q: "Warum begrenzt der Rechner das Darlehen auf einen DSCR?",
    a: `Banken bemessen Projektfinanzierungen nicht an einer festen Quote, sondern am Schuldendienstdeckungsgrad (DSCR): Der Cashflow eines Jahres muss den Schuldendienst mit einem Puffer decken – bei EEG-Projekten meist um 1,10–1,20, bei PPA- und Merchant-Erlösen eher höher. Reicht der Cashflow für die gewünschte Quote nicht, zeigt der Rechner, wie viel Eigenkapital zusätzlich nötig wäre. Voreingestellt ist ein DSCR von ${fmt(FINANZIERUNG.dscrZiel, 2)}.`,
  },
  {
    q: "Wie wird die LCOE berechnet?",
    a: "Die Stromgestehungskosten (LCOE) sind der Barwert aller Kosten – Investition, Betrieb, Pacht, Rückbau – geteilt durch den Barwert der erzeugten Kilowattstunden, abgezinst mit den gewichteten Kapitalkosten (WACC). Wir rechnen nominal: Die LCOE ist damit der über die gesamte Laufzeit feste Strompreis, bei dem der Solarpark genau seine Kapitalkosten verdient. Fraunhofer ISE rechnet in seiner Studie real – die Werte sind daher nur grob vergleichbar.",
  },
  {
    q: "Wie wirkt der EEG-Zuschlag?",
    a: "Im Marktprämienmodell verkauft der Betreiber den Strom über einen Direktvermarkter und erhält zusätzlich die Differenz zum anzulegenden Wert (Zuschlagswert), wenn der Marktwert darunter liegt – 20 Jahre lang. Liegt der Marktwert darüber, bleibt der höhere Marktwert. Der Zuschlag wirkt also wie eine Untergrenze. Für Anlagen, die seit dem Solarspitzengesetz 2025 in Betrieb gehen, entfällt die Marktprämie in Stunden mit negativen Preisen; diese Zeiträume werden nach aktuellem Stand an das Ende des Förderzeitraums angehängt.",
  },
  {
    q: "Welche Werte muss ich für eine belastbare Rechnung ersetzen?",
    a: "Vor allem den spezifischen Ertrag (aus einem Ertragsgutachten mit P50 und P90), die Netzanschlusskosten laut Netzbetreiber, den EPC-Preis aus einem Angebot, den Pachtvertrag und die Finanzierungskonditionen der Bank. Der Rechner zeigt, wie empfindlich die Rendite auf diese Größen reagiert – die Sensitivitätsmatrix macht das auf einen Blick sichtbar.",
  },
  {
    q: "Warum sind die Renditen mit den Standardwerten so knapp?",
    a: `Weil der Wettbewerb in den Ausschreibungen hart ist: Zuschläge um 5 ct/kWh setzen niedrige Baukosten, sehr gute Standorte und günstige Finanzierung voraus. Unsere Standardwerte sind bewusst vorsichtig (EPC ${fmt(FREIFLAECHE.capexProKwp.mittel)} €/kWp ohne Netz, Betriebskosten ${fmt(FREIFLAECHE.opexProKwp)} €/kWp plus Pacht). Große Parks mit Skaleneffekten, bifazialen Modulen, PPA-Aufschlägen oder Co-Location mit einem Speicher erreichen deutlich bessere Werte – probieren Sie es aus.`,
  },
];

export default function Page() {
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="solarpark"
      breadcrumb="Solarpark-Renditerechner"
      eyebrow="Für Investoren · Profi-Rechner"
      title={
        <>
          Solarpark-Rendite, <span className="ov-text-gradient-light">wie Banken rechnen.</span>
        </>
      }
      lead="Projekt- und Eigenkapital-IRR, LCOE, Kapitalwert und DSCR über die gesamte Laufzeit – mit EEG-Zuschlag, PPA oder Merchant, Finanzierung nach Schuldendienstdeckung und Sensitivitätsmatrix."
      chips={["Cashflow über 20–40 Jahre", "EEG, PPA, Merchant", "DSCR-Bemessung", "Sensitivität Capex × Preis"]}
      app={{
        name: "Solarpark-Renditerechner",
        description: "Wirtschaftlichkeitsrechnung für Photovoltaik-Freiflächenanlagen: Projekt-IRR, Eigenkapital-IRR, LCOE, NPV, Amortisation, DSCR und Sensitivitätsanalyse.",
        featureList: ["Projekt-IRR und Eigenkapital-IRR", "Stromgestehungskosten (LCOE)", "Kapitalwert (NPV)", "DSCR und Darlehensbemessung", "Cashflow-Diagramm über die Laufzeit", "Sensitivitätsmatrix Investition × Strompreis"],
      }}
      rechner={<SolarparkRechner />}
      erklaerung={
        <div className="ov-prose max-w-none">
          <h2>So rechnet der Solarpark-Rechner</h2>
          <p>
            Grundlage ist ein Jahresmodell: Aus Region und Bauart ergibt sich der spezifische Ertrag im ersten Jahr, der mit der Degradation sinkt. Die Erlöse folgen dem gewählten Modell –
            EEG-Zuschlag als Untergrenze für 20 Jahre, ein fester PPA-Preis für die Vertragslaufzeit oder direkt der Marktwert. Nach dem Vertrag verkauft der Park zum Marktwert, den wir
            vorsichtig nur um {fmt(ERLOESE.merchantSteigerung * 100, 1)} % pro Jahr steigen lassen.
          </p>
          <p>
            Die Kosten umfassen Betrieb und Verwaltung (mit {fmt(FREIFLAECHE.inflation * 100, 1)} % Inflation), die Pacht je Hektar (indexiert mit {fmt(PACHT.indexierung * 100, 1)} %) und eine
            Rücklage für den Rückbau von {fmt(FREIFLAECHE.rueckbauProKwp)} €/kWp. Das Darlehen ist ein Annuitätendarlehen; auf Wunsch wird es – wie in der Bankpraxis – auf einen
            Mindest-DSCR begrenzt.
          </p>
          <h3>Was der Rechner bewusst nicht abbildet</h3>
          <ul>
            <li>Steuern (Körperschaft- und Gewerbesteuer, Abschreibung) – alle Renditen sind vor Steuern.</li>
            <li>Stunden mit negativen Preisen und Abregelung (Redispatch) – je nach Netzgebiet einige Prozent der Erzeugung.</li>
            <li>Bauzeitzinsen, Reserven, Transaktionskosten und Liquiditätsreserven der Bank (DSRA).</li>
            <li>Zusatzerlöse, etwa aus einem Batteriespeicher am selben Netzanschluss.</li>
          </ul>
          <p>
            Für eine belastbare Bewertung brauchen Sie ein Ertragsgutachten (P50/P90), den Netzanschlussvertrag und ein EPC-Angebot. Projekte mit geprüften Unterlagen finden Sie in der
            Projektbörse – dort sehen Sie nach NDA auch den Datenraum.
          </p>
        </div>
      }
      annahmen={[
        ["Spezifischer Ertrag", `${fmt(Math.min(...REGIONEN.map((r) => r.ertrag)))}–${fmt(Math.max(...REGIONEN.map((r) => r.ertrag)))} kWh/kWp`],
        ["EPC Freifläche", `${fmt(FREIFLAECHE.capexProKwp.min)}–${fmt(FREIFLAECHE.capexProKwp.max)} €/kWp`],
        ["Netz: Kabel / Station", `${fmt(FREIFLAECHE.kabelProMeter)} €/m · ${fmt(FREIFLAECHE.netzanschlussFixProMwp)} €/MWp`],
        ["Betriebskosten", `${fmt(FREIFLAECHE.opexProKwp)} €/kWp·a + Pacht`],
        ["EEG-Zuschläge 2025", ERLOESE.zuschlagsHistorie.map((z) => `${fmt(z.ct, 2)}`).join(" / ") + " ct"],
        ["PPA Solar (10 J.)", `${fmt(ERLOESE.ppaCt.min, 1)}–${fmt(ERLOESE.ppaCt.max, 1)} ct/kWh`],
        ["Marktwert nach Förderung", `${fmt(ERLOESE.merchantCt, 1)} ct/kWh (heute)`],
        ["Zins / Laufzeit", `${fmt(FINANZIERUNG.zins * 100, 1)} % · ${FINANZIERUNG.tilgungJahre} Jahre`],
        ["EK-Renditeerwartung", `${fmt(FINANZIERUNG.diskont * 100, 1)} %`],
        ["Stand", STAND],
      ]}
      quellen={[
        { name: "Bundesnetzagentur – Ausschreibungen Solar", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" },
        { name: "Fraunhofer ISE – Stromgestehungskosten 2024", url: "https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/studie-stromgestehungskosten-erneuerbare-energien.html" },
        { name: "PVGIS", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" },
      ]}
      faq={FAQ}
      faqTitel="Solarpark-Rendite – gut zu wissen"
      querverweise={[
        { href: "/rechner/projektbewertung", titel: "Projektbewertung", text: "Was sind Projektrechte in welcher Phase wert – von der Flächensicherung bis RTB?" },
        { href: "/investoren", titel: "Für Investoren", text: "Projektrechte, RTB und Bestandsanlagen: Phasenmodell, Due Diligence und Ablauf über die Plattform." },
        { href: "/projektboerse", titel: "Projektbörse", text: "Aktuelle Solarprojekte im DACH-Raum – Exposé-Teaser öffentlich, Details nach NDA." },
        { href: "/grossspeicher", titel: "Großspeicher", text: "Co-Location am Solarpark: zusätzliche Erlöse am selben Netzanschluss." },
      ]}
      cta={{
        eyebrow: "Für Investoren kostenfrei",
        title: "Von der Modellrechnung zum Datenraum.",
        text: "Legen Sie ein Suchprofil an – wir melden passende Projekte mit Ertragsgutachten, Netzzusage und Planungsstand. Für Käufer entstehen über die Plattform keine Kosten.",
        primary: { label: "Als Investor registrieren", href: "/registrieren?rolle=investor" },
        secondary: { label: "Zur Projektbörse", href: "/projektboerse" },
      }}
    />
  );
}
