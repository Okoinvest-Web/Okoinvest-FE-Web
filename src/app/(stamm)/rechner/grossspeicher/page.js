// src/app/rechner/grossspeicher/page.js – Rendite eines Batteriegroßspeichers
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur; Regeln:
// src/lib/sprache/woerterbuch.js). Zahlen im Format der Sprache (src/lib/sprache/zahlformat.js).

import Link from "@/components/Land/Link";
import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import GrossspeicherRechner from "@/components/Rechner/GrossspeicherRechner";
import { FREIFLAECHE, SPEICHER } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage, landDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand, NurDEBlock } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";
import { datumText } from "@/lib/sprache/format";
import { schreibweiseBaum } from "@/components/Land/SchweizerSchreibweise";

// Schweiz (/ch, /en/ch): fest geschriebene Texte ohne „ß“ (W3-0, src/components/Land/SchweizerSchreibweise.js)
const chBaum = (el) => schreibweiseBaum(el, landDerAnfrage());

const PFAD = seitenPfad("/rechner/grossspeicher");
const S = SPEICHER;
const e = formate("en");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Großspeicher-Rechner: BESS-Rendite und IRR | ÖkoInvest",
  description:
    "Rendite eines Batteriegroßspeichers berechnen: Arbitrage, aFRR und FCR, Co-Location oder Stand-alone, Baukostenzuschuss, Netzentgelte – IRR und Cashflow.",
  keywords: ["Großspeicher Rendite", "BESS Rechner", "Batteriespeicher Wirtschaftlichkeit", "Co-Location Speicher", "Baukostenzuschuss Speicher", "aFRR Erlöse Batteriespeicher"],
});

const metadataEn = rechnerMetadataEn({
  title: "Battery storage calculator: BESS return and IRR | ÖkoInvest",
  description:
    "Calculate the return of a utility-scale battery: arbitrage, aFRR and FCR, co-location or stand-alone, construction cost contribution, grid fees – IRR and cash flow.",
  keywords: ["battery storage return", "BESS calculator", "battery storage economics", "co-located storage", "construction cost contribution storage", "aFRR revenue battery"],
});

const FAQ = [
  {
    q: "Womit verdient ein Batteriegroßspeicher Geld?",
    a: `Mit drei Erlösquellen: Arbitrage (günstig laden, teuer entladen am Day-Ahead- und Intraday-Markt), Sekundärregelleistung (aFRR) und Primärregelleistung (FCR). 2025 hat sich der Schwerpunkt verschoben: Laut ISEA-Index stiegen die aFRR-Leistungserlöse deutlich, während FCR durch den Speicherzubau an Bedeutung verlor. Wir rechnen im Mittel mit ${fmt(S.erloesMix.afrr * 100)} % aFRR, ${fmt(S.erloesMix.arbitrage * 100)} % Arbitrage und ${fmt(S.erloesMix.fcr * 100)} % FCR.`,
    nurDE: "Erlöswerte",
  },
  {
    q: "Warum liegen Ihre Erlöse unter dem Index?",
    a: `Der ISEA Battery Revenue Index weist für ein 2-h-System 2025 rund ${fmt(S.indexErloes2025.gesamt2h / 1000)} T€ je MW aus – gerechnet mit perfekter Voraussicht und ohne Netzrestriktionen. In der Praxis erreichen Vermarkter davon erfahrungsgemäß nur einen Teil. Unsere Spanne von ${fmt(S.erloesProMwJahr.min / 1000)}–${fmt(S.erloesProMwJahr.max / 1000)} T€/MW ist deshalb bewusst vorsichtig.`,
    nurDE: "Erlöswerte",
  },
  {
    q: "Co-Location oder Stand-alone – was ist besser?",
    a: "Co-Location nutzt den Netzanschluss eines Solarparks mit: Das spart Anschlusskosten und in der Regel den Baukostenzuschuss, begrenzt aber die Fahrweise, weil Park und Speicher sich die Anschlussleistung teilen. Stand-alone-Speicher am Umspannwerk sind frei in der Vermarktung, brauchen aber einen eigenen, oft knappen Netzanschluss und zahlen einen Baukostenzuschuss. Der Rechner zeigt beide Varianten nebeneinander.",
  },
  {
    q: "Was bedeutet der Baukostenzuschuss für Speicher?",
    a: `Nach dem Beschluss des Bundesgerichtshofs vom 15. Juli 2025 (EnVR 1/24) dürfen Netzbetreiber auch von Batteriespeichern einen Baukostenzuschuss nach dem Leistungspreismodell verlangen. Als Beispiel rechnen wir mit den Sätzen der Bayernwerk Netz 2025 – rund ${fmt(S.bkzProKw.ms)} €/kW in der Mittelspannung und ${fmt(S.bkzProKw.hs)} €/kW in der Hochspannung. Einzelne Netzbetreiber gewähren Abschläge für netzdienlichen Betrieb.`,
    nurDE: "Regeln zu Anschlusskosten",
  },
  {
    q: "Zahlt ein Speicher Netzentgelte?",
    a: `Nach § 118 Abs. 6 EnWG sind Speicher, die bis zum ${S.netzentgeltBefreiungBis} in Betrieb gehen, für 20 Jahre von den Netzentgelten für den Ladestrom befreit, soweit der Strom wieder eingespeist wird. Wie es danach weitergeht, ist Teil der laufenden Netzentgeltreform. Im Rechner können Sie die Befreiung abschalten.`,
    nurDE: "Regeln zu Netzentgelten für Speicher",
  },
  {
    q: "Wie wirken Degradation und Zyklen?",
    a: `Lithium-Eisenphosphat-Speicher verlieren je nach Fahrweise rund ${fmt(S.degradation * 100)} % Kapazität pro Jahr. Wir lassen die Arbitrage-Erlöse mit der Kapazität sinken, die Regelleistung – die an der Leistung hängt – nur halb so stark. Eine Erweiterung (Augmentation) nach einigen Jahren ist nicht eingerechnet; sie kann die Erlöse stabilisieren, kostet aber zusätzlich.`,
  },
];

const FAQ_EN = [
  {
    q: "How does a utility-scale battery make money?",
    a: `From three revenue streams: arbitrage (charging cheaply and discharging at high prices on the day-ahead and intraday markets), secondary control reserve (aFRR) and primary control reserve (FCR). In 2025 the focus shifted: according to the ISEA index, aFRR capacity revenues rose significantly, while FCR lost importance as more storage was added. On average we calculate with ${e.pct(S.erloesMix.afrr * 100)} aFRR, ${e.pct(S.erloesMix.arbitrage * 100)} arbitrage and ${e.pct(S.erloesMix.fcr * 100)} FCR.`,
    nurDE: "Revenue figures",
  },
  {
    q: "Why are your revenues below the index?",
    a: `For a 2-hour system in 2025, the ISEA Battery Revenue Index shows around €${e.fmt(S.indexErloes2025.gesamt2h / 1000)}k per MW – calculated with perfect foresight and without grid restrictions. In practice, experience shows that marketers achieve only part of this. Our range of €${e.fmt(S.erloesProMwJahr.min / 1000)}–${e.fmt(S.erloesProMwJahr.max / 1000)}k/MW is therefore deliberately cautious.`,
    nurDE: "Revenue figures",
  },
  {
    q: "Co-location or stand-alone – which is better?",
    a: "Co-location shares the grid connection of a solar park: this saves connection costs and usually the construction cost contribution, but limits the operating strategy because park and storage share the connection capacity. Stand-alone storage at a substation is free in its marketing, but needs its own, often scarce, grid connection and pays a construction cost contribution. The calculator shows both variants side by side.",
  },
  {
    q: "What does the construction cost contribution mean for storage?",
    a: `Following the decision of the German Federal Court of Justice (BGH) of 15 July 2025 (EnVR 1/24), grid operators may also charge battery storage a construction cost contribution (Baukostenzuschuss) based on the capacity price model. As an example, we use the 2025 rates of Bayernwerk Netz – around ${e.eur(S.bkzProKw.ms, "/kW")} at medium voltage and ${e.eur(S.bkzProKw.hs, "/kW")} at high voltage. Some grid operators grant discounts for grid-supportive operation.`,
    nurDE: "Rules on connection costs",
  },
  {
    q: "Does a storage system pay grid fees?",
    a: `Under § 118(6) EnWG (German Energy Industry Act), storage systems commissioned by ${datumText(S.netzentgeltBefreiungBis, "en")} are exempt from grid fees on charging power for 20 years, insofar as the power is fed back into the grid. What happens after that is part of the ongoing grid fee reform. You can switch off the exemption in the calculator.`,
    nurDE: "Rules on grid fees for storage",
  },
  {
    q: "How do degradation and cycles affect the result?",
    a: `Depending on how they are operated, lithium iron phosphate batteries lose around ${e.pct(S.degradation * 100)} of capacity per year. We let arbitrage revenues fall with capacity, and control reserve revenues – which depend on power – only half as much. An expansion (augmentation) after a few years is not included; it can stabilise revenues but costs extra.`,
  },
];

const DE = {
  breadcrumb: "Großspeicher-Rechner",
  eyebrow: "Für Investoren · Batteriegroßspeicher",
  title: (
    <>
      Großspeicher-Rendite <span className="ov-text-gradient-light">mit ehrlichem Erlösmix.</span>
    </>
  ),
  lead: "Leistung, Dauer, Systempreis und Standort wählen, Erlöse aus Arbitrage, aFRR und FCR anpassen: Sie erhalten Projekt-IRR, Kapitalwert, Amortisation und den Cashflow – Co-Location und Stand-alone im direkten Vergleich.",
  chips: ["Arbitrage, aFRR, FCR", "Co-Location vs. Stand-alone", "Baukostenzuschuss", "Degradation & Zyklen"],
  app: {
    name: "Großspeicher-Renditerechner",
    description: "Wirtschaftlichkeit eines Batteriegroßspeichers: Investition mit Netzanschluss und Baukostenzuschuss, Erlösmix aus Arbitrage und Regelenergie, Degradation, Netzentgelte, Projekt-IRR, Kapitalwert und Cashflow.",
    featureList: ["Leistung und Speicherdauer 1–4 h", "Erlösmix Arbitrage, aFRR, FCR", "Co-Location und Stand-alone", "Baukostenzuschuss nach Netzebene", "Netzentgeltbefreiung § 118 Abs. 6 EnWG", "IRR, NPV, Amortisation, Cashflow-Diagramm"],
  },
  annahmen: [
    ["Systempreis 2-h (2026)", `${fmt(S.capexProKwh.min)}–${fmt(S.capexProKwh.max)} €/kWh`],
    ["Erlöse real (2-h)", `${fmt(S.erloesProMwJahr.min / 1000)}–${fmt(S.erloesProMwJahr.max / 1000)} T€/MW·a`],
    ["ISEA-Index 2025 (theoretisch)", `${fmt(S.indexErloes2025.gesamt2h / 1000)} T€/MW·a`],
    ["Mix aFRR / Arbitrage / FCR", `${fmt(S.erloesMix.afrr * 100)} / ${fmt(S.erloesMix.arbitrage * 100)} / ${fmt(S.erloesMix.fcr * 100)} %`],
    ["Degradation / Erlöstrend", `${fmt(S.degradation * 100)} % / ${fmt(S.erloesTrend * 100)} % p. a.`],
    ["Betrieb / Vermarktung", `${fmt(S.opexAnteilCapex * 100, 1)} % Capex / ${fmt(S.vermarktungAnteil * 100)} % Erlöse`],
    ["BKZ-Beispiel MS / HS", `${fmt(S.bkzProKw.ms)} / ${fmt(S.bkzProKw.hs)} €/kW`],
    ["Netzanschluss Co-Loc. / MS / HS", `${fmt(S.netzanschlussProKw.coLocation)} / ${fmt(S.netzanschlussProKw.ms)} / ${fmt(S.netzanschlussProKw.hs)} €/kW`],
    ["Wirkungsgrad", `${fmt(S.wirkungsgrad * 100)} %`],
    ["Diskontsatz", `${fmt(S.diskont * 100)} %`],
  ],
  quellen: [
    { name: "pv magazine – ISEA Battery Revenue Index 2025", url: "https://www.pv-magazine.de/2026/01/23/erloespotenziale-fuer-stationaere-batteriespeicher-in-deutschland-sind-2025-zurueckgegangen/" },
    { name: "BGH, Beschluss vom 15.07.2025 (EnVR 1/24)", url: "https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2025/2025129.html" },
    { name: "Bayernwerk Netz – Baukostenzuschuss 2025", url: "https://www.bayernwerk-netz.de/content/dam/revu-global/bayernwerk-netz/files/energie-anschliessen/anschluss-mittel-und-hochspannung/baukostenzuschuss_2025.pdf" },
    { name: "§ 118 EnWG", url: "https://www.gesetze-im-internet.de/enwg_2005/__118.html" },
  ],
  faqTitel: "Großspeicher – gut zu wissen",
  querverweise: [
    { href: seitenPfad("/grossspeicher"), titel: "Großspeicher", text: "Co-Location, Stand-alone, Netzanschluss, LFP-Technik und Sicherheit." },
    { href: seitenPfad("/rechner/netzanschluss"), titel: "Netzanschluss-Check", text: "Kosten, Zeitrahmen und Risiken des Anschlusses – mit Überbauung und Speicher." },
    { href: seitenPfad("/rechner/solarpark"), titel: "Solarpark-Renditerechner", text: "IRR, LCOE und DSCR des Solarparks, an dem der Speicher stehen kann." },
  ],
  cta: {
    eyebrow: "Speicher am Solarpark",
    title: "Fläche, Netzanschluss oder Projekt für einen Speicher?",
    text: "Wir prüfen Co-Location an bestehenden und geplanten Parks und entwickeln Stand-alone-Standorte an Netzknoten – gemeinsam mit Ihnen.",
    primary: { label: "Speicher-Standort anfragen", href: "/kontakt?anliegen=speicher#formular" },
    secondary: { label: "Großspeicher ansehen", href: seitenPfad("/grossspeicher") },
  },
};

const EN = {
  breadcrumb: "Battery storage calculator",
  eyebrow: "For investors · utility-scale batteries",
  title: (
    <>
      Battery storage returns <span className="ov-text-gradient-light">with an honest revenue mix.</span>
    </>
  ),
  lead: "Choose power, duration, system price and location, and adjust revenues from arbitrage, aFRR and FCR: you get the project IRR, net present value, payback and cash flow – co-location and stand-alone compared side by side.",
  chips: ["Arbitrage, aFRR, FCR", "Co-location vs. stand-alone", "Construction cost contribution", "Degradation & cycles"],
  app: {
    name: "Battery storage return calculator",
    description: "Economics of a utility-scale battery: investment including grid connection and construction cost contribution, revenue mix from arbitrage and balancing services, degradation, grid fees, project IRR, net present value and cash flow.",
    featureList: ["Power and storage duration 1–4 h", "Revenue mix arbitrage, aFRR, FCR", "Co-location and stand-alone", "Construction cost contribution by voltage level", "Grid fee exemption under § 118(6) EnWG", "IRR, NPV, payback, cash flow chart"],
  },
  annahmen: [
    ["System price 2 h (2026)", `${e.eur(S.capexProKwh.min)}–${e.eur(S.capexProKwh.max, "/kWh")}`],
    ["Realistic revenue (2 h)", `€${e.fmt(S.erloesProMwJahr.min / 1000)}–${e.fmt(S.erloesProMwJahr.max / 1000)}k/MW·yr`],
    ["ISEA index 2025 (theoretical)", `€${e.fmt(S.indexErloes2025.gesamt2h / 1000)}k/MW·yr`],
    ["Mix aFRR / arbitrage / FCR", `${e.fmt(S.erloesMix.afrr * 100)} / ${e.fmt(S.erloesMix.arbitrage * 100)} / ${e.pct(S.erloesMix.fcr * 100)}`],
    ["Degradation / revenue trend", `${e.pct(S.degradation * 100)} / ${e.pct(S.erloesTrend * 100)} p.a.`],
    ["Operation / marketing", `${e.pct(S.opexAnteilCapex * 100, 1)} of capex / ${e.pct(S.vermarktungAnteil * 100)} of revenue`],
    ["Construction cost contribution, example MV / HV", `${e.eur(S.bkzProKw.ms)} / ${e.eur(S.bkzProKw.hs, "/kW")}`],
    ["Grid connection co-loc. / MV / HV", `${e.eur(S.netzanschlussProKw.coLocation)} / ${e.eur(S.netzanschlussProKw.ms)} / ${e.eur(S.netzanschlussProKw.hs, "/kW")}`],
    ["Round-trip efficiency", e.pct(S.wirkungsgrad * 100)],
    ["Discount rate", e.pct(S.diskont * 100)],
  ],
  quellen: [
    { name: "pv magazine – ISEA Battery Revenue Index 2025" },
    { name: "German Federal Court of Justice (BGH), decision of 15 July 2025 (EnVR 1/24)" },
    { name: "Bayernwerk Netz – construction cost contribution 2025" },
    { name: "§ 118 EnWG (German Energy Industry Act)" },
  ],
  faqTitel: "Battery storage – good to know",
  querverweise: [
    { titel: "Battery storage", text: "Co-location, stand-alone, grid connection, LFP technology and safety." },
    { titel: "Grid connection check", text: "Costs, time frame and risks of the connection – with overbuilding and storage." },
    { titel: "Solar park return calculator", text: "IRR, LCOE and DSCR of the solar park where the storage can be located." },
  ],
  cta: {
    eyebrow: "Storage at the solar park",
    title: "Land, grid connection or a project for storage?",
    text: "We assess co-location at existing and planned parks and develop stand-alone sites at grid nodes – together with you.",
    primary: { label: "Enquire about a storage site" },
    secondary: { label: "View battery storage" },
  },
};

export default async function Page({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze({ de: DE, en: EN }, sprache);
  return chBaum(
    <RechnerSeite
      pfad={PFAD}
      toolId="grossspeicher"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      chips={t.chips}
      app={t.app}
      rechner={<GrossspeicherRechner />}
      erklaerung={
        <NurDEBlock land={land} thema="Rechenwerte und Annahmen" themaEn="Figures and assumptions">
          {en ? (
            <div className="ov-prose max-w-none">
              <h2>How the battery storage calculator works</h2>
              <p>
                The <strong>investment</strong> comprises the turnkey storage system (€/kWh), the grid connection (€/kW) and – for stand-alone only – the construction cost contribution. You enter the <strong>revenues</strong> per MW for a 2-hour system; for shorter or longer storage durations we scale with a factor based on the ISEA index (there, 1 h achieves around 58% of the revenue of a 2-hour system). Co-location receives a discount of {e.pct((1 - S.coLocationErloesFaktor) * 100)}.
              </p>
              <p>
                As <strong>costs</strong>, we calculate operation, maintenance and insurance at {e.pct(S.opexAnteilCapex * 100, 1)} of system costs per year (with {e.pct(FREIFLAECHE.inflation * 100)} inflation) and a marketing fee of {e.pct(S.vermarktungAnteil * 100)} of revenue. The general revenue trend of {e.pct(S.erloesTrend * 100)} per year reflects that more storage in the market compresses price spreads and balancing prices.
              </p>
              <h3>What the calculator deliberately leaves out</h3>
              <ul>
                <li>Financing and taxes – the return is a project return before tax.</li>
                <li>Tolling or floor contracts, which banks usually require for financing.</li>
                <li>Expansion (augmentation), residual value and decommissioning at the end of the term.</li>
                <li>Additional benefits at the solar park, such as avoided curtailment or higher solar market values.</li>
              </ul>
              <p>
                More on technology, grid connection and safety under <Link href={seitenPfad("/grossspeicher")}>Battery storage</Link>; the markets in detail in the guide <Link href="/ratgeber/grossspeicher-erloese">Storage revenues</Link>.
              </p>
            </div>
          ) : (
            <div className="ov-prose max-w-none">
              <h2>So rechnet der Großspeicher-Rechner</h2>
              <p>
                Die <strong>Investition</strong> setzt sich aus dem schlüsselfertigen Speichersystem (€/kWh), dem Netzanschluss (€/kW) und – nur bei Stand-alone – dem Baukostenzuschuss
                zusammen. Die <strong>Erlöse</strong> geben Sie je MW für ein 2-h-System ein; für kürzere oder längere Speicher skalieren wir mit einem Faktor, der sich am ISEA-Index orientiert
                (1 h erzielt dort rund 58 % der Erlöse eines 2-h-Systems). Co-Location erhält einen Abschlag von {fmt((1 - S.coLocationErloesFaktor) * 100)} %.
              </p>
              <p>
                Als <strong>Kosten</strong> rechnen wir Betrieb, Wartung und Versicherung mit {fmt(S.opexAnteilCapex * 100, 1)} % der Systemkosten pro Jahr (mit {fmt(FREIFLAECHE.inflation * 100)} %
                Inflation) und ein Vermarktungsentgelt von {fmt(S.vermarktungAnteil * 100)} % der Erlöse. Der allgemeine Erlöstrend von {fmt(S.erloesTrend * 100)} % pro Jahr bildet ab, dass mehr
                Speicher im Markt Preisspreads und Regelenergiepreise drücken.
              </p>
              <h3>Was der Rechner bewusst nicht abbildet</h3>
              <ul>
                <li>Finanzierung und Steuern – die Rendite ist eine Projektrendite vor Steuern.</li>
                <li>Tolling- oder Floor-Verträge, die Banken für eine Finanzierung meist verlangen.</li>
                <li>Erweiterung (Augmentation), Restwert und Rückbau am Laufzeitende.</li>
                <li>Zusatznutzen am Solarpark, etwa vermiedene Abregelung oder höhere Solar-Marktwerte.</li>
              </ul>
              <p>
                Mehr zu Technik, Netzanschluss und Sicherheit unter <Link href={seitenPfad("/grossspeicher")}>Großspeicher</Link>; die Märkte im Detail im Ratgeber{" "}
                <Link href="/ratgeber/grossspeicher-erloese">Speichererlöse</Link>.
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

export const generateMetadata = seitenMetadata("/rechner/grossspeicher", metadata, { en: metadataEn });
