// src/app/rechner/ppa/page.js – PPA-Rechner für Unternehmen
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur; Regeln:
// src/lib/sprache/woerterbuch.js). Zahlen im Format der Sprache (src/lib/sprache/zahlformat.js).

import Link from "@/components/Land/Link";
import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import PpaRechner from "@/components/Rechner/PpaRechner";
import { ALLGEMEIN, ERLOESE, STROM } from "@/lib/invest/markt";
import { GLEICHZEITIG } from "@/lib/rechner/ppa";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand, NurDEBlock } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";

const PFAD = seitenPfad("/rechner/ppa");
const P = STROM.ppa;
const e = formate("en");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "PPA-Rechner für Unternehmen: Solarstrom-PPA | ÖkoInvest",
  description:
    "PPA-Rechner für den Mittelstand: Ersparnis und Risiko eines Solar-PPA bei fallenden, stabilen oder steigenden Preisen – pay-as-produced oder Baseload, mit CO₂.",
  keywords: ["PPA Rechner", "Power Purchase Agreement Unternehmen", "Solar PPA Mittelstand", "PPA pay as produced", "Baseload PPA", "Stromliefervertrag Solarpark"],
});

const metadataEn = rechnerMetadataEn({
  title: "PPA calculator for businesses: solar PPA | ÖkoInvest",
  description:
    "PPA calculator for SMEs: savings and risk of a solar PPA with falling, stable or rising prices – pay-as-produced or baseload, with CO₂.",
  keywords: ["PPA calculator", "power purchase agreement business", "solar PPA SME", "pay-as-produced PPA", "baseload PPA", "solar park power supply contract"],
});

const FAQ = [
  {
    q: "Was ist ein PPA und für wen lohnt es sich?",
    a: "Ein Power Purchase Agreement ist ein langfristiger Stromliefervertrag direkt aus einer bestimmten Anlage – hier einem Solarpark – zu einem über Jahre festen Preis. Es lohnt sich vor allem für Unternehmen mit planbarem Verbrauch ab einigen hundert Megawattstunden im Jahr, die sich gegen steigende Strompreise absichern und ihren Strom nachweislich aus erneuerbaren Anlagen beziehen wollen.",
  },
  {
    q: "Pay-as-produced oder Baseload – was ist der Unterschied?",
    a: `Bei pay-as-produced nehmen Sie den Strom genau dann ab, wenn der Park erzeugt – mittags viel, nachts nichts. Was Sie in dem Moment nicht verbrauchen, wird weiterverkauft, meist zu einem niedrigeren Solar-Marktwert. Bei einem Baseload- oder Profil-PPA formt ein Lieferant die Solarmengen in ein gleichmäßiges Band oder Ihr Lastprofil. Das ist bequemer und sicherer, kostet aber einen Strukturierungsaufschlag – grob ${fmt(P.strukturierungCt.min, 1)}–${fmt(P.strukturierungCt.max, 1)} ct/kWh.`,
    nurDE: "Rechenwerte",
  },
  {
    q: "Warum spare ich bei fallenden Strompreisen weniger – oder zahle drauf?",
    a: "Der PPA-Preis ist fest. Fällt der Börsenpreis deutlich, wäre die Beschaffung am Markt günstiger gewesen. Das ist der Preis der Absicherung – wie bei einer Versicherung. Der Rechner zeigt deshalb drei Szenarien und den Marktpreis, ab dem sich das PPA nicht mehr rechnet. Viele Unternehmen decken daher nur einen Teil ihres Verbrauchs über ein PPA.",
  },
  {
    q: "Was passiert bei negativen Strompreisen?",
    a: `Das ist eine zentrale Vertragsfrage. 2025 fiel laut dena/Pexapark rund ${fmt(P.negativAnteilSolar * 100)} % der deutschen Solarerzeugung in Stunden mit negativen Preisen. Üblich sind Klauseln, nach denen der Park in diesen Stunden abgeregelt wird oder der Abnehmer nicht zahlen muss – die vereinbarte Menge und damit Ihre Deckung sinken dann entsprechend.`,
    nurDE: "Marktwerte",
  },
  {
    q: "Wie hängen PPA und Reststrom-Pool zusammen?",
    a: "Ein PPA deckt vor allem die Tagesstunden. Den Strom, den Sie abends, nachts und im Winter weiter brauchen, beschaffen Sie wie bisher – oder gebündelt über den Reststrom-Pool von ÖkoInvest. Beides lässt sich kombinieren.",
  },
  {
    q: "Wie werden die CO₂-Einsparungen gerechnet?",
    a: `Mit dem Vermeidungsfaktor des Umweltbundesamts von rund ${fmt(ALLGEMEIN.co2KgProKwh * 1000)} g CO₂ je kWh Solarstrom. Er gilt für Strom aus einer zusätzlichen, neuen Anlage. Für die Bilanz Ihres Unternehmens (Scope 2, marktbasiert) zählt der Nachweis über Herkunftsnachweise – das sollte im Vertrag geregelt sein.`,
    nurDE: "Rechenwerte",
  },
];

const FAQ_EN = [
  {
    q: "What is a PPA and who is it worthwhile for?",
    a: "A power purchase agreement is a long-term electricity supply contract directly from a specific plant – here a solar park – at a price fixed for years. It is particularly worthwhile for businesses with predictable consumption from a few hundred megawatt hours a year that want to hedge against rising electricity prices and source their power verifiably from renewable plants.",
  },
  {
    q: "Pay-as-produced or baseload – what is the difference?",
    a: `With pay-as-produced, you take the power exactly when the park generates it – a lot at midday, nothing at night. Whatever you do not consume at that moment is resold, usually at a lower solar market value. With a baseload or profile PPA, a supplier shapes the solar volumes into an even band or your load profile. This is more convenient and safer but costs a shaping surcharge – roughly ${e.fmt(P.strukturierungCt.min, 1)}–${e.fmt(P.strukturierungCt.max, 1)} ct/kWh.`,
    nurDE: "Figures",
  },
  {
    q: "Why do I save less – or pay extra – when electricity prices fall?",
    a: "The PPA price is fixed. If the exchange price falls significantly, buying on the market would have been cheaper. That is the price of hedging – as with insurance. The calculator therefore shows three scenarios and the market price below which the PPA no longer pays off. Many businesses therefore cover only part of their consumption through a PPA.",
  },
  {
    q: "What happens with negative electricity prices?",
    a: `This is a central contractual question. According to dena/Pexapark, around ${e.pct(P.negativAnteilSolar * 100)} of German solar generation in 2025 fell into hours with negative prices. Clauses are usual under which the park is curtailed during these hours or the offtaker does not have to pay – the agreed volume, and therefore your coverage, then falls accordingly.`,
    nurDE: "Market figures",
  },
  {
    q: "How are a PPA and the residual power pool connected?",
    a: "A PPA mainly covers daytime hours. The power you still need in the evening, at night and in winter you buy as before – or pooled via the ÖkoInvest residual power pool. The two can be combined.",
  },
  {
    q: "How are the CO₂ savings calculated?",
    a: `Using the German Environment Agency’s (Umweltbundesamt) avoidance factor of around ${e.fmt(ALLGEMEIN.co2KgProKwh * 1000)} g CO₂ per kWh of solar power. It applies to power from an additional, new plant. For your company’s carbon footprint (Scope 2, market-based), proof via guarantees of origin is what counts – this should be regulated in the contract.`,
    nurDE: "Figures",
  },
];

const DE = {
  breadcrumb: "PPA-Rechner",
  eyebrow: "Für Unternehmen · Strombeschaffung",
  title: (
    <>
      Solarstrom zum Festpreis – <span className="ov-text-gradient-light">was bringt ein PPA?</span>
    </>
  ),
  lead: "Verbrauch, Lastprofil, heutiger Preis und PPA-Angebot eingeben: Sie sehen Ersparnis und Risiko in drei Börsenpreis-Szenarien, den Grad der Preisabsicherung und die CO₂-Wirkung.",
  chips: ["Pay-as-produced oder Baseload", "Drei Preisszenarien", "Break-even-Preis", "CO₂-Wirkung"],
  app: {
    name: "PPA-Rechner für Unternehmen",
    description: "Vergleicht die Energiekosten eines Unternehmens mit und ohne Solar-PPA über die Laufzeit – pay-as-produced oder Baseload, in drei Marktpreis-Szenarien, mit Preisabsicherung und CO₂-Vermeidung.",
    featureList: ["Lastprofil und Gleichzeitigkeit", "Pay-as-produced mit Überschuss-Weiterverkauf", "Baseload mit Strukturierungsaufschlag", "Szenarien Preisverfall, seitwärts, Anstieg", "Break-even-Marktpreis", "Preisabsicherung und CO₂"],
  },
  annahmen: [
    ["Terminmarkt Base (Cal-27)", `rund ${fmt(P.baseTerminCt, 1)} ct/kWh`],
    ["Solar-Capture-Rate (Jahr)", `rund ${fmt(P.captureRate * 100)} %`],
    ["Liefer-PPA Solar (10 J.)", `${fmt(P.pppCt.min, 1)}–${fmt(P.pppCt.max, 1)} ct/kWh`],
    ["Strukturierung Baseload", `${fmt(P.strukturierungCt.min, 1)}–${fmt(P.strukturierungCt.max, 1)} ct/kWh`],
    ["Bilanzierung pay-as-produced", `${fmt(P.bilanzierungCt, 1)} ct/kWh`],
    ["Gleichzeitig nutzbar (max.)", `${fmt(GLEICHZEITIG * 100)} % der Tageslast`],
    ["Solar in negativen Stunden 2025", `${fmt(P.negativAnteilSolar * 100, 1)} %`],
    ["CO₂-Vermeidung", `${fmt(ALLGEMEIN.co2KgProKwh * 1000)} g/kWh`],
  ],
  quellen: [
    { name: "dena – PPA-Marktanalyse 2025", url: "https://www.dena.de/fileadmin/dena/Publikationen/PDFs/2026/PPA_Marktanalyse_2025.pdf" },
    { name: "EEX – Terminmarkt Strom", url: "https://www.eex.com/de/marktdaten/strom" },
    { name: "Umweltbundesamt – Emissionsbilanz", url: "https://www.umweltbundesamt.de/publikationen" },
  ],
  faqTitel: "PPA für Unternehmen – gut zu wissen",
  querverweise: [
    { href: seitenPfad("/reststrom"), titel: "Reststrom-Pool", text: "Den Strom, den Sie trotz PV und PPA noch brauchen, gebündelt beschaffen." },
    { href: seitenPfad("/rechner/reststrom"), titel: "Reststrom-Rechner", text: "Was Bündelung, Solar-PPA und Flexibilität bei Ihrem Reststrom sparen können." },
    { href: seitenPfad("/virtuelles-kraftwerk"), titel: "Virtuelles Kraftwerk", text: "Wie Parks, Speicher und flexible Verbraucher zusammenspielen." },
    { href: "/ratgeber/ppa-fuer-unternehmen", titel: "Ratgeber PPA", text: "Vertragsarten, Laufzeiten, Klauseln und worauf Einkäufer achten sollten." },
  ],
  cta: {
    eyebrow: "Für Unternehmen",
    title: "Solarstrom aus Parks der Region – zum Festpreis.",
    text: "Wir prüfen, ob ein PPA aus einem unserer Parks zu Ihrem Lastgang passt, und kombinieren es auf Wunsch mit dem Reststrom-Pool. Unverbindlich.",
    primary: { label: "PPA anfragen", href: "/kontakt?anliegen=reststrom#formular" },
    secondary: { label: "Reststrom-Pool ansehen", href: seitenPfad("/reststrom") },
  },
};

const EN = {
  breadcrumb: "PPA calculator",
  eyebrow: "For businesses · power procurement",
  title: (
    <>
      Solar power at a fixed price – <span className="ov-text-gradient-light">what does a PPA bring?</span>
    </>
  ),
  lead: "Enter consumption, load profile, current price and PPA offer: you see savings and risk in three exchange-price scenarios, the degree of price hedging and the CO₂ effect.",
  chips: ["Pay-as-produced or baseload", "Three price scenarios", "Break-even price", "CO₂ effect"],
  app: {
    name: "PPA calculator for businesses",
    description: "Compares a business’s energy costs with and without a solar PPA over the term – pay-as-produced or baseload, in three market price scenarios, with price hedging and CO₂ avoidance.",
    featureList: ["Load profile and simultaneity", "Pay-as-produced with resale of surplus", "Baseload with shaping surcharge", "Scenarios: price decline, sideways, increase", "Break-even market price", "Price hedging and CO₂"],
  },
  annahmen: [
    ["Futures market base (Cal-27)", `around ${e.fmt(P.baseTerminCt, 1)} ct/kWh`],
    ["Solar capture rate (year)", `around ${e.pct(P.captureRate * 100)}`],
    ["Supply PPA solar (10 yrs)", `${e.fmt(P.pppCt.min, 1)}–${e.fmt(P.pppCt.max, 1)} ct/kWh`],
    ["Baseload shaping", `${e.fmt(P.strukturierungCt.min, 1)}–${e.fmt(P.strukturierungCt.max, 1)} ct/kWh`],
    ["Balancing pay-as-produced", `${e.fmt(P.bilanzierungCt, 1)} ct/kWh`],
    ["Usable simultaneously (max.)", `${e.pct(GLEICHZEITIG * 100)} of daytime load`],
    ["Solar in negative hours 2025", e.pct(P.negativAnteilSolar * 100, 1)],
    ["CO₂ avoidance", `${e.fmt(ALLGEMEIN.co2KgProKwh * 1000)} g/kWh`],
  ],
  quellen: [{ name: "dena – PPA market analysis 2025" }, { name: "EEX – power futures market" }, { name: "German Environment Agency – emissions balance" }],
  faqTitel: "PPAs for businesses – good to know",
  querverweise: [
    { titel: "Residual power pool", text: "Buy the power you still need despite PV and a PPA – pooled." },
    { titel: "Residual power calculator", text: "What pooling, solar PPAs and flexibility can save on your residual power." },
    { titel: "Virtual power plant", text: "How parks, storage and flexible consumers work together." },
    { titel: "Guide: PPAs", text: "Contract types, terms, clauses and what buyers should look out for." },
  ],
  cta: {
    eyebrow: "For businesses",
    title: "Solar power from parks in your region – at a fixed price.",
    text: "We check whether a PPA from one of our parks suits your load profile and, if you wish, combine it with the residual power pool. Without obligation.",
    primary: { label: "Enquire about a PPA" },
    secondary: { label: "View the residual power pool" },
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
      toolId="ppa"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      chips={t.chips}
      app={t.app}
      rechner={<PpaRechner />}
      erklaerung={
        <NurDEBlock land={land} thema="Rechenwerte und Annahmen" themaEn="Figures and assumptions">
          {en ? (
            <div className="ov-prose max-w-none">
              <h2>How the PPA calculator works</h2>
              <p>
                Only the <strong>energy component</strong> of your electricity price – procurement and sales – is compared. You pay grid fees, levies and electricity tax at the same level with and without a PPA. In the calculator, your current energy price follows the chosen scenario: over four years it moves to 70%, 100% or 130% of today’s level and then stays there. The PPA price remains fixed over the term.
              </p>
              <p>
                With <strong>pay-as-produced</strong>, the PPA volume follows the solar profile. We assume that at most {e.pct(GLEICHZEITIG * 100)} of your consumption can be covered simultaneously during sunshine hours (summer surplus, winter gap). Anything above that is resold at the solar market value – around {e.pct(P.captureRate * 100)} of the base price, less a {e.pct(P.vermarktungsAbschlag * 100)} discount. Because the cheap midday hours drop out, the remaining residual power becomes slightly more expensive per kWh.
              </p>
              <p>
                With <strong>baseload</strong>, a supplier takes over this shaping for a surcharge. The <strong>price hedge</strong> shows by what percentage the range of your energy costs between price decline and price increase shrinks.
              </p>
              <h3>Context</h3>
              <p>
                For comparison: according to dena, pure producer PPAs for solar (pay-as-produced, 10 years) were around €35–45/MWh in 2025 – supply contracts with businesses are higher because of sales, balancing and the higher 2026 futures market. The EEG award for new ground-mounted plants was around {e.fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh in 2025. More on contracts and clauses in the guide <Link href="/ratgeber/ppa-fuer-unternehmen">PPAs for businesses</Link>.
              </p>
            </div>
          ) : (
            <div className="ov-prose max-w-none">
              <h2>So rechnet der PPA-Rechner</h2>
              <p>
                Verglichen wird nur der <strong>Energieanteil</strong> Ihres Strompreises – Beschaffung und Vertrieb. Netzentgelte, Umlagen und Stromsteuer zahlen Sie mit und ohne PPA in
                gleicher Höhe. Ihr heutiger Energiepreis folgt im Rechner dem gewählten Szenario: Er bewegt sich über vier Jahre auf 70 %, 100 % oder 130 % des heutigen Niveaus und bleibt dann
                dort. Der PPA-Preis bleibt über die Laufzeit fest.
              </p>
              <p>
                Bei <strong>pay-as-produced</strong> fällt die PPA-Menge im Solarprofil an. Wir nehmen an, dass höchstens {fmt(GLEICHZEITIG * 100)} % Ihres Verbrauchs in den Sonnenstunden
                gleichzeitig gedeckt werden können (Sommer-Überschuss, Winter-Lücke). Was darüber liegt, wird zum Solar-Marktwert weiterverkauft – rund {fmt(P.captureRate * 100)} % des
                Base-Preises, abzüglich {fmt(P.vermarktungsAbschlag * 100)} % Abschlag. Weil die günstigen Mittagsstunden wegfallen, wird der verbleibende Reststrom je kWh etwas teurer.
              </p>
              <p>
                Bei <strong>Baseload</strong> übernimmt ein Lieferant diese Formung gegen einen Aufschlag. Die <strong>Preisabsicherung</strong> zeigt, um wie viel Prozent die Spanne Ihrer
                Energiekosten zwischen Preisverfall und Preisanstieg schrumpft.
              </p>
              <h3>Einordnung</h3>
              <p>
                Zum Vergleich: Reine Erzeuger-PPAs für Solar (pay-as-produced, 10 Jahre) lagen 2025 laut dena bei etwa 35–45 €/MWh – Lieferverträge an Unternehmen liegen wegen Vertrieb,
                Bilanzierung und dem höheren Terminmarkt 2026 darüber. Der EEG-Zuschlag für neue Freiflächenanlagen lag 2025 um {fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh. Mehr zu Verträgen und
                Klauseln im Ratgeber <Link href="/ratgeber/ppa-fuer-unternehmen">PPA für Unternehmen</Link>.
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

export const generateMetadata = seitenMetadata("/rechner/ppa", metadata, { en: metadataEn });
