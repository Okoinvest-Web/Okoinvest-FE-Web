// src/app/rechner/solarpark/page.js – Solarpark-Renditerechner
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur; Regeln:
// src/lib/sprache/woerterbuch.js). Zahlen im Format der Sprache (src/lib/sprache/zahlformat.js).

import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import SolarparkRechner from "@/components/Rechner/SolarparkRechner";
import { ERLOESE, FINANZIERUNG, FREIFLAECHE, PACHT, STAND, REGIONEN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand, NurDEBlock } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";
import { datumText } from "@/lib/sprache/format";

const PFAD = seitenPfad("/rechner/solarpark");
const e = formate("en");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Solarpark-Renditerechner: IRR, LCOE, DSCR | ÖkoInvest",
  description:
    "Profi-Rechner für Solarparks: Projekt- und EK-IRR, LCOE, Kapitalwert, DSCR und Cashflow über 30 Jahre – mit EEG, PPA oder Merchant und Sensitivitätsmatrix.",
  keywords: ["Solarpark Rendite", "Solarpark Rechner", "IRR Photovoltaik", "LCOE Solarpark", "DSCR Solarpark", "PPA Solarpark", "Freiflächenanlage Wirtschaftlichkeit"],
});

const metadataEn = rechnerMetadataEn({
  title: "Solar park return calculator: IRR, LCOE, DSCR | ÖkoInvest",
  description:
    "Professional calculator for solar parks: project and equity IRR, LCOE, net present value, DSCR and cash flow over 30 years – with EEG, PPA or merchant and a sensitivity matrix.",
  keywords: ["solar park return", "solar park calculator", "photovoltaic IRR", "solar park LCOE", "solar park DSCR", "solar park PPA", "ground-mounted PV economics"],
});

const FAQ = [
  {
    q: "Was ist der Unterschied zwischen Projekt-IRR und Eigenkapital-IRR?",
    a: "Die Projekt-IRR bewertet den Solarpark ohne Finanzierung: Investition gegen Erlöse abzüglich Betriebskosten. Die Eigenkapital-IRR betrachtet nur das eingesetzte Eigenkapital nach Zins und Tilgung. Liegt die Projektrendite über dem Darlehenszins, hebt Fremdkapital die Eigenkapitalrendite (positiver Hebel) – liegt sie darunter, senkt es sie. Beide Werte sind hier vor Steuern gerechnet.",
  },
  {
    q: "Warum begrenzt der Rechner das Darlehen auf einen DSCR?",
    a: `Banken bemessen Projektfinanzierungen nicht an einer festen Quote, sondern am Schuldendienstdeckungsgrad (DSCR): Der Cashflow eines Jahres muss den Schuldendienst mit einem Puffer decken – bei EEG-Projekten meist um 1,10–1,20, bei PPA- und Merchant-Erlösen eher höher. Reicht der Cashflow für die gewünschte Quote nicht, zeigt der Rechner, wie viel Eigenkapital zusätzlich nötig wäre. Voreingestellt ist ein DSCR von ${fmt(FINANZIERUNG.dscrZiel, 2)}.`,
    nurDE: "Finanzierungs- und Förderwerte",
  },
  {
    q: "Wie wird die LCOE berechnet?",
    a: "Die Stromgestehungskosten (LCOE) sind der Barwert aller Kosten – Investition, Betrieb, Pacht, Rückbau – geteilt durch den Barwert der erzeugten Kilowattstunden, abgezinst mit den gewichteten Kapitalkosten (WACC). Wir rechnen nominal: Die LCOE ist damit der über die gesamte Laufzeit feste Strompreis, bei dem der Solarpark genau seine Kapitalkosten verdient. Fraunhofer ISE rechnet in seiner Studie real – die Werte sind daher nur grob vergleichbar.",
  },
  {
    q: "Wie wirkt der EEG-Zuschlag?",
    a: "Im Marktprämienmodell verkauft der Betreiber den Strom über einen Direktvermarkter und erhält zusätzlich die Differenz zum anzulegenden Wert (Zuschlagswert), wenn der Marktwert darunter liegt – 20 Jahre lang. Liegt der Marktwert darüber, bleibt der höhere Marktwert. Der Zuschlag wirkt also wie eine Untergrenze. Für Anlagen, die seit dem Solarspitzengesetz 2025 in Betrieb gehen, entfällt die Marktprämie in Stunden mit negativen Preisen; diese Zeiträume werden nach aktuellem Stand an das Ende des Förderzeitraums angehängt.",
    nurDE: "Förderregeln",
  },
  {
    q: "Welche Werte muss ich für eine belastbare Rechnung ersetzen?",
    a: "Vor allem den spezifischen Ertrag (aus einem Ertragsgutachten mit P50 und P90), die Netzanschlusskosten laut Netzbetreiber, den EPC-Preis aus einem Angebot, den Pachtvertrag und die Finanzierungskonditionen der Bank. Der Rechner zeigt, wie empfindlich die Rendite auf diese Größen reagiert – die Sensitivitätsmatrix macht das auf einen Blick sichtbar.",
  },
  {
    q: "Warum sind die Renditen mit den Standardwerten so knapp?",
    a: `Weil der Wettbewerb in den Ausschreibungen hart ist: Zuschläge um 5 ct/kWh setzen niedrige Baukosten, sehr gute Standorte und günstige Finanzierung voraus. Unsere Standardwerte sind bewusst vorsichtig (EPC ${fmt(FREIFLAECHE.capexProKwp.mittel)} €/kWp ohne Netz, Betriebskosten ${fmt(FREIFLAECHE.opexProKwp)} €/kWp plus Pacht). Große Parks mit Skaleneffekten, bifazialen Modulen, PPA-Aufschlägen oder Co-Location mit einem Speicher erreichen deutlich bessere Werte – probieren Sie es aus.`,
    nurDE: "Rechenwerte",
  },
];

const FAQ_EN = [
  {
    q: "What is the difference between project IRR and equity IRR?",
    a: "The project IRR evaluates the solar park without financing: investment against revenue less operating costs. The equity IRR looks only at the equity invested, after interest and repayment. If the project return is above the loan interest rate, debt raises the equity return (positive leverage) – if it is below, debt lowers it. Both values are calculated here before tax.",
  },
  {
    q: "Why does the calculator cap the loan at a DSCR?",
    a: `Banks do not size project finance by a fixed ratio but by the debt service coverage ratio (DSCR): a year’s cash flow must cover the debt service with a buffer – usually around 1.10–1.20 for EEG projects, rather higher for PPA and merchant revenue. If the cash flow is not sufficient for the desired ratio, the calculator shows how much additional equity would be needed. The default DSCR is ${e.fmt(FINANZIERUNG.dscrZiel, 2)}.`,
    nurDE: "Financing and subsidy figures",
  },
  {
    q: "How is the LCOE calculated?",
    a: "The levelised cost of electricity (LCOE) is the present value of all costs – investment, operation, lease, decommissioning – divided by the present value of the kilowatt hours generated, discounted at the weighted average cost of capital (WACC). We calculate in nominal terms: the LCOE is thus the electricity price, fixed over the entire term, at which the solar park earns exactly its cost of capital. Fraunhofer ISE calculates in real terms in its study – the figures are therefore only roughly comparable.",
  },
  {
    q: "How does the EEG award work?",
    a: "In the market premium model, the operator sells the power via a direct marketer and additionally receives the difference to the award value (anzulegender Wert) if the market value is below it – for 20 years. If the market value is higher, the higher market value is retained. The award therefore acts as a floor. For plants commissioned since the 2025 Solar Peak Act (Solarspitzengesetz), the market premium does not apply in hours with negative prices; as things stand, these periods are added to the end of the support period.",
    nurDE: "Subsidy rules",
  },
  {
    q: "Which values do I need to replace for a robust calculation?",
    a: "Above all the specific yield (from a yield assessment with P50 and P90), the grid connection costs according to the grid operator, the EPC price from an offer, the lease contract and the bank’s financing terms. The calculator shows how sensitive the return is to these variables – the sensitivity matrix makes this visible at a glance.",
  },
  {
    q: "Why are the returns so tight with the default values?",
    a: `Because competition in the tenders is fierce: awards of around 5 ct/kWh require low construction costs, very good sites and favourable financing. Our default values are deliberately cautious (EPC ${e.eur(FREIFLAECHE.capexProKwp.mittel, "/kWp")} excluding grid, operating costs ${e.eur(FREIFLAECHE.opexProKwp, "/kWp")} plus lease). Large parks with economies of scale, bifacial modules, PPA premiums or co-location with storage achieve considerably better values – try it out.`,
    nurDE: "Figures",
  },
];

const DE = {
  breadcrumb: "Solarpark-Renditerechner",
  eyebrow: "Für Investoren · Profi-Rechner",
  title: (
    <>
      Solarpark-Rendite, <span className="ov-text-gradient-light">wie Banken rechnen.</span>
    </>
  ),
  lead: "Projekt- und Eigenkapital-IRR, LCOE, Kapitalwert und DSCR über die gesamte Laufzeit – mit EEG-Zuschlag, PPA oder Merchant, Finanzierung nach Schuldendienstdeckung und Sensitivitätsmatrix.",
  chips: ["Cashflow über 20–40 Jahre", "EEG, PPA, Merchant", "DSCR-Bemessung", "Sensitivität Capex × Preis"],
  app: {
    name: "Solarpark-Renditerechner",
    description: "Wirtschaftlichkeitsrechnung für Photovoltaik-Freiflächenanlagen: Projekt-IRR, Eigenkapital-IRR, LCOE, NPV, Amortisation, DSCR und Sensitivitätsanalyse.",
    featureList: ["Projekt-IRR und Eigenkapital-IRR", "Stromgestehungskosten (LCOE)", "Kapitalwert (NPV)", "DSCR und Darlehensbemessung", "Cashflow-Diagramm über die Laufzeit", "Sensitivitätsmatrix Investition × Strompreis"],
  },
  annahmen: [
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
  ],
  quellen: [
    { name: "Bundesnetzagentur – Ausschreibungen Solar", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" },
    { name: "Fraunhofer ISE – Stromgestehungskosten 2024", url: "https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/studie-stromgestehungskosten-erneuerbare-energien.html" },
    { name: "PVGIS", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" },
  ],
  faqTitel: "Solarpark-Rendite – gut zu wissen",
  querverweise: [
    { href: seitenPfad("/rechner/projektbewertung"), titel: "Projektbewertung", text: "Was sind Projektrechte in welcher Phase wert – von der Flächensicherung bis RTB?" },
    { href: "/investoren", titel: "Für Investoren", text: "Projektrechte, RTB und Bestandsanlagen: Phasenmodell, Due Diligence und Ablauf über die Plattform." },
    { href: "/projektboerse", titel: "Projektbörse", text: "Aktuelle Solarprojekte im DACH-Raum – Exposé-Teaser öffentlich, Details nach NDA." },
    { href: seitenPfad("/grossspeicher"), titel: "Großspeicher", text: "Co-Location am Solarpark: zusätzliche Erlöse am selben Netzanschluss." },
  ],
  cta: {
    eyebrow: "Für Investoren kostenfrei",
    title: "Von der Modellrechnung zum Datenraum.",
    text: "Legen Sie ein Suchprofil an – wir melden passende Projekte mit Ertragsgutachten, Netzzusage und Planungsstand. Für Käufer entstehen über die Plattform keine Kosten.",
    primary: { label: "Als Investor registrieren", href: "/registrieren?rolle=investor" },
    secondary: { label: "Zur Projektbörse", href: "/projektboerse" },
  },
};

const EN = {
  breadcrumb: "Solar park return calculator",
  eyebrow: "For investors · professional calculator",
  title: (
    <>
      Solar park returns, <span className="ov-text-gradient-light">calculated the way banks do.</span>
    </>
  ),
  lead: "Project and equity IRR, LCOE, net present value and DSCR over the entire term – with EEG award, PPA or merchant, financing sized by debt service coverage and a sensitivity matrix.",
  chips: ["Cash flow over 20–40 years", "EEG, PPA, merchant", "DSCR sizing", "Sensitivity capex × price"],
  app: {
    name: "Solar park return calculator",
    description: "Economic analysis of ground-mounted photovoltaic plants: project IRR, equity IRR, LCOE, NPV, payback, DSCR and sensitivity analysis.",
    featureList: ["Project IRR and equity IRR", "Levelised cost of electricity (LCOE)", "Net present value (NPV)", "DSCR and loan sizing", "Cash flow chart over the term", "Sensitivity matrix investment × electricity price"],
  },
  annahmen: [
    ["Specific yield", `${e.fmt(Math.min(...REGIONEN.map((r) => r.ertrag)))}–${e.fmt(Math.max(...REGIONEN.map((r) => r.ertrag)))} kWh/kWp`],
    ["EPC ground-mounted", `${e.eur(FREIFLAECHE.capexProKwp.min)}–${e.eur(FREIFLAECHE.capexProKwp.max, "/kWp")}`],
    ["Grid: cable / station", `${e.eur(FREIFLAECHE.kabelProMeter, "/m")} · ${e.eur(FREIFLAECHE.netzanschlussFixProMwp, "/MWp")}`],
    ["Operating costs", `${e.eur(FREIFLAECHE.opexProKwp, "/kWp·yr")} + lease`],
    ["EEG awards 2025", ERLOESE.zuschlagsHistorie.map((z) => `${e.fmt(z.ct, 2)}`).join(" / ") + " ct"],
    ["Solar PPA (10 yrs)", `${e.fmt(ERLOESE.ppaCt.min, 1)}–${e.fmt(ERLOESE.ppaCt.max, 1)} ct/kWh`],
    ["Market value after subsidy", `${e.fmt(ERLOESE.merchantCt, 1)} ct/kWh (today)`],
    ["Interest / term", `${e.pct(FINANZIERUNG.zins * 100, 1)} · ${FINANZIERUNG.tilgungJahre} years`],
    ["Expected equity return", e.pct(FINANZIERUNG.diskont * 100, 1)],
    ["As of", datumText(STAND, "en")],
  ],
  quellen: [{ name: "Bundesnetzagentur (Federal Network Agency) – solar tenders" }, { name: "Fraunhofer ISE – levelised cost of electricity 2024" }, { name: "PVGIS" }],
  faqTitel: "Solar park returns – good to know",
  querverweise: [
    { titel: "Project valuation", text: "What are project rights worth in which phase – from securing the land to RTB?" },
    { titel: "For investors", text: "Project rights, RTB and operating assets: phase model, due diligence and process via the platform." },
    { titel: "Project exchange", text: "Current solar projects in the DACH region – exposé teasers public, details after NDA." },
    { titel: "Battery storage", text: "Co-location at the solar park: additional revenue at the same grid connection." },
  ],
  cta: {
    eyebrow: "Free of charge for investors",
    title: "From the model calculation to the data room.",
    text: "Create a search profile – we will notify you of suitable projects with yield assessments, grid commitment and planning status. Buyers incur no costs via the platform.",
    primary: { label: "Register as an investor" },
    secondary: { label: "To the project exchange" },
  },
};

export default async function Page({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze({ de: DE, en: EN }, sprache);
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="solarpark"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      chips={t.chips}
      app={t.app}
      rechner={<SolarparkRechner />}
      erklaerung={
        <NurDEBlock land={land} thema="Rechenwerte und Annahmen" themaEn="Figures and assumptions">
          {en ? (
            <div className="ov-prose max-w-none">
              <h2>How the solar park calculator works</h2>
              <p>
                It is based on an annual model: region and design determine the specific yield in the first year, which declines with degradation. Revenue follows the chosen model – the EEG award as a floor for 20 years, a fixed PPA price for the contract term or the market value directly. After the contract, the park sells at market value, which we cautiously let rise by only {e.pct(ERLOESE.merchantSteigerung * 100, 1)} per year.
              </p>
              <p>
                Costs include operation and administration (with {e.pct(FREIFLAECHE.inflation * 100, 1)} inflation), the lease per hectare (indexed at {e.pct(PACHT.indexierung * 100, 1)}) and a decommissioning reserve of {e.eur(FREIFLAECHE.rueckbauProKwp, "/kWp")}. The loan is an annuity loan; if you wish, it is capped at a minimum DSCR – as in banking practice.
              </p>
              <h3>What the calculator deliberately leaves out</h3>
              <ul>
                <li>Taxes (corporate income and trade tax, depreciation) – all returns are before tax.</li>
                <li>Hours with negative prices and curtailment (redispatch) – a few percent of generation, depending on the grid area.</li>
                <li>Interest during construction, contingencies, transaction costs and the bank’s liquidity reserves (DSRA).</li>
                <li>Additional revenue, for example from a battery storage system at the same grid connection.</li>
              </ul>
              <p>
                For a robust valuation, you need a yield assessment (P50/P90), the grid connection contract and an EPC offer. You will find projects with reviewed documents on the project exchange – where, after an NDA, you can also see the data room.
              </p>
            </div>
          ) : (
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
          )}
        </NurDEBlock>
      }
      annahmen={t.annahmen}
      quellen={t.quellen}
      faq={faqFuerLand(uebersetze({ de: FAQ, en: FAQ_EN }, sprache), land, { sprache })}
      faqTitel={t.faqTitel}
      querverweise={t.querverweise}
      cta={t.cta}
    />
  );
}

export const generateMetadata = seitenMetadata("/rechner/solarpark", metadata, { en: metadataEn });
