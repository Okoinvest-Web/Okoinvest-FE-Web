// src/app/rechner/bestandsanlage/page.js – Bewertung von PV-Bestandsanlagen
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur; Regeln:
// src/lib/sprache/woerterbuch.js). Zahlen im Format der Sprache (src/lib/sprache/zahlformat.js).

import Link from "@/components/Land/Link";
import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import BestandsRechner from "@/components/Bestand/BestandsRechner";
import SectionHeading from "@/components/ui/SectionHeading";
import { BESTAND, ERLOESE, FREIFLAECHE, PACHT, PROVISION } from "@/lib/invest/markt";
import { PHASE_BESTAND } from "@/lib/rechner/bestandsanlage";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand, NurDEBlock } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";
import { provisionTextEn } from "@/lib/sprache/rechnerBegriffe";

const PFAD = seitenPfad("/rechner/bestandsanlage");
const e = formate("en");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "PV-Bestandsanlage bewerten: Ertragswert | ÖkoInvest",
  description:
    "Was ist Ihre PV-Anlage wert? Ertragswert nach DCF mit EEG-Restlaufzeit, Ertragshistorie, Wechselrichtertausch, Pacht und Marktpreis nach Förderende.",
  keywords: ["PV Bestandsanlage bewerten", "Solarpark Wert berechnen", "Photovoltaik Anlage verkaufen Wert", "Ertragswert PV-Anlage", "Bestandsanlage kaufen Preis pro kWp"],
});

const metadataEn = rechnerMetadataEn({
  title: "Value an operating PV plant: income value | ÖkoInvest",
  description:
    "What is your PV plant worth? Income value by DCF with remaining EEG term, yield history, inverter replacement, lease and market price after the subsidy ends.",
  keywords: ["value operating PV plant", "solar park valuation", "sell PV plant value", "PV plant income value", "operating asset price per kWp"],
});

const FAQ = [
  {
    q: "Wie wird eine PV-Bestandsanlage bewertet?",
    a: "Üblich ist das Ertragswert- bzw. DCF-Verfahren: Man schätzt die künftigen Einnahmen (Vergütung, danach Marktpreis) und Ausgaben (Betrieb, Pacht, Ersatzinvestitionen, Rückbau) Jahr für Jahr und zinst sie mit der Renditeerwartung des Käufers ab. Die Summe ist der Wert der Anlage ohne Fremdkapital. Vergleichspreise je kWp dienen nur zur Plausibilisierung.",
  },
  {
    q: "Welchen Diskontsatz sollte ich ansetzen?",
    a: `Für unverschuldete Bestandsanlagen liegen die Renditeerwartungen meist zwischen ${fmt(BESTAND.diskont.min * 100, 1)} und ${fmt(BESTAND.diskont.max * 100, 1)} %. Niedriger bei großen, gut dokumentierten Anlagen mit langer Förderrestlaufzeit, höher bei kleinen Anlagen, kurzer Restlaufzeit, Ertragsproblemen oder hohem Merchant-Anteil. Ein Prozentpunkt verändert den Wert oft um 5–10 %.`,
    nurDE: "Rechenwerte",
  },
  {
    q: "Was passiert nach dem Ende der EEG-Vergütung?",
    a: `Die Anlage verkauft den Strom dann am Markt, meist über einen Direktvermarkter oder per PPA. Wir rechnen vorsichtig mit einem heutigen Solar-Marktwert von ${fmt(ERLOESE.merchantCt, 1)} ct/kWh, der nur langsam steigt, abzüglich Vermarktungskosten. Für kleine ausgeförderte Anlagen gibt es in Deutschland Sonderregeln; Details hängen von Größe und Messkonzept ab.`,
    nurDE: "Förderregeln",
  },
  {
    q: "Warum ist die Ertragshistorie so wichtig?",
    a: "Weil sie zeigt, was die Anlage wirklich liefert. Liegt der gemessene Ertrag deutlich unter der Prognose für Standort und Alter, stecken oft Ursachen dahinter, die sich beheben lassen – defekte Strings, Wechselrichterausfälle, Verschattung, Verschmutzung – oder Mängel, die den Wert dauerhaft mindern. Eine technische Due Diligence mit Thermografie und Kennlinienmessung klärt das.",
  },
  {
    q: "Was kostet der Verkauf über die Plattform?",
    a: `Für Käufer nichts. Verkäufer zahlen eine Erfolgsprovision von ${PROVISION.verkaeufer.text}. Keine Einstell- oder Listungsgebühren.`,
  },
];

const FAQ_EN = [
  {
    q: "How is an operating PV plant valued?",
    a: "The usual approach is the income value or DCF (discounted cash flow) method: future income (feed-in remuneration, then market price) and expenses (operation, lease, replacement investments, decommissioning) are estimated year by year and discounted at the buyer’s expected return. The total is the value of the plant without debt. Comparable prices per kWp only serve as a plausibility check.",
  },
  {
    q: "Which discount rate should I use?",
    a: `For unlevered operating plants, expected returns usually lie between ${e.fmt(BESTAND.diskont.min * 100, 1)}% and ${e.pct(BESTAND.diskont.max * 100, 1)}. Lower for large, well-documented plants with a long remaining subsidy term; higher for small plants, a short remaining term, yield problems or a high merchant share. One percentage point often changes the value by 5–10%.`,
    nurDE: "Figures",
  },
  {
    q: "What happens after the EEG remuneration ends?",
    a: `The plant then sells its power on the market, usually via a direct marketer or a PPA. We cautiously assume today’s solar market value of ${e.fmt(ERLOESE.merchantCt, 1)} ct/kWh, rising only slowly, less marketing costs. Germany has special rules for small plants whose EEG support (German Renewable Energy Sources Act) has expired; details depend on size and metering concept.`,
    nurDE: "Subsidy rules",
  },
  {
    q: "Why is the yield history so important?",
    a: "Because it shows what the plant really delivers. If the measured yield is well below the forecast for location and age, there are often fixable causes – faulty strings, inverter failures, shading, soiling – or defects that permanently reduce the value. A technical due diligence with thermography and I-V curve measurement clarifies this.",
  },
  {
    q: "What does selling via the platform cost?",
    a: `Nothing for buyers. Sellers pay a success fee of ${provisionTextEn(PROVISION.verkaeufer.text)}. No listing fees.`,
  },
];

const DE = {
  breadcrumb: "Bestandsanlage bewerten",
  eyebrow: "Bewertung Bestandsanlagen",
  title: <>Was ist Ihre laufende PV-Anlage <span className="ov-text-gradient-light">heute wert?</span></>,
  lead: "Ertragswert nach dem DCF-Verfahren: Förderrestlaufzeit, gemessener Ertrag, Betriebskosten, Pacht, Wechselrichtertausch und Marktpreis nach Förderende – mit Spanne, Wert je kWp und Sensitivität.",
  chips: ["Kostenlos & ohne Anmeldung", "DCF mit Spanne", "Für Käufer und Verkäufer"],
  app: {
    name: "ÖkoInvest Bewertung PV-Bestandsanlagen",
    description: "Ermittelt den Ertragswert laufender Photovoltaikanlagen nach dem DCF-Verfahren – mit EEG-Restlaufzeit, Ertragshistorie, Betriebskosten, Pacht, Wechselrichtertausch und Marktpreis nach Förderende.",
    featureList: ["Ertragswert mit Spanne", "Wert je kWp und Einordnung", "Feste Vergütung oder Marktprämie", "Pacht- und Dachvertrag mit Laufzeit", "Wechselrichtertausch", "Sensitivitätsmatrix und Werttreiber", "Käuferrendite für einen Kaufpreis"],
  },
  methodik: {
    eyebrow: "So rechnen wir",
    title: "Eine Anlage ist so viel wert wie ihre künftigen Cashflows.",
    lead: "Wir rechnen offen Jahr für Jahr – so sehen Sie, woher der Wert kommt und welche Annahme ihn am stärksten bewegt.",
  },
  annahmen: [
    ["Bewertung ab", String(BESTAND.bewertungsjahr)],
    ["Diskontsatz (Spanne)", `${fmt(BESTAND.diskont.min * 100, 1)}–${fmt(BESTAND.diskont.max * 100, 1)} %`],
    ["Degradation", `${fmt(BESTAND.degradation * 100, 1)} % p. a.`],
    ["Betriebskosten Bestand", `${fmt(BESTAND.opexProKwp)} €/kWp·a`],
    ["Wechselrichtertausch", `${fmt(BESTAND.wechselrichterProKwp.min)}–${fmt(BESTAND.wechselrichterProKwp.max)} €/kWp`],
    ["Marktwert nach Förderung", `${fmt(ERLOESE.merchantCt, 1)} ct/kWh, +${fmt(ERLOESE.merchantSteigerung * 100)} % p. a.`],
    ["Nutzungsdauer", `${BESTAND.nutzungsdauer} Jahre (${BESTAND.nutzungsdauerSpanne.min}–${BESTAND.nutzungsdauerSpanne.max})`],
    ["Rückbau", `${fmt(FREIFLAECHE.rueckbauProKwp)} €/kWp`],
    ["Übliche Preise Bestand", `${fmt(PHASE_BESTAND.preisProKwp.min)}–${fmt(PHASE_BESTAND.preisProKwp.max)} €/kWp`],
  ],
  quellen: [
    { name: "Bundesnetzagentur – Ausschreibungen Solar", url: "https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Ausschreibungen/Solaranlagen1/start.html" },
    { name: "EEG 2023", url: "https://www.gesetze-im-internet.de/eeg_2014/" },
    { name: "PVGIS", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" },
  ],
  querverweise: [
    { href: seitenPfad("/bestandsanlagen"), titel: "Bestandsanlagen", text: "Verkaufen oder kaufen: Bewertung, Due Diligence, Ablauf und Provision." },
    { href: "/projektboerse?phase=cod", titel: "Bestand in der Börse", text: "Laufende Anlagen in der Projektbörse – Teaser öffentlich, Details nach NDA." },
    { href: seitenPfad("/rechner/projektbewertung"), titel: "Projektbewertung", text: "Projektrechte vor dem Bau: Kaufpreisspanne je Phase." },
  ],
  cta: {
    eyebrow: "Für Verkäufer und Käufer",
    title: "Aus der Rechnung eine belastbare Bewertung machen?",
    text: "Mit Ihren Ertragsdaten, Verträgen und Wartungsprotokollen bewerten wir die Anlage konkret – und bringen sie auf Wunsch vertraulich in die Projektbörse.",
    primary: { label: "Anlage bewerten lassen", href: seitenPfad("/bestandsanlagen#anfrage") },
    secondary: { label: "Bestand in der Börse", href: "/projektboerse?phase=cod" },
  },
};

const EN = {
  breadcrumb: "Value an operating asset",
  eyebrow: "Operating asset valuation",
  title: <>What is your operating PV plant <span className="ov-text-gradient-light">worth today?</span></>,
  lead: "Income value by the DCF method: remaining subsidy term, measured yield, operating costs, lease, inverter replacement and market price after the subsidy ends – with a range, value per kWp and sensitivity.",
  chips: ["Free & no sign-up", "DCF with range", "For buyers and sellers"],
  app: {
    name: "ÖkoInvest valuation of operating PV plants",
    description: "Determines the income value of operating photovoltaic plants using the DCF method – with remaining EEG term, yield history, operating costs, lease, inverter replacement and market price after the subsidy ends.",
    featureList: ["Income value with range", "Value per kWp and benchmark", "Fixed feed-in tariff or market premium", "Land or roof lease with term", "Inverter replacement", "Sensitivity matrix and value drivers", "Buyer’s return for a purchase price"],
  },
  methodik: {
    eyebrow: "How we calculate",
    title: "A plant is worth as much as its future cash flows.",
    lead: "We calculate openly, year by year – so you can see where the value comes from and which assumption moves it most.",
  },
  annahmen: [
    ["Valuation from", String(BESTAND.bewertungsjahr)],
    ["Discount rate (range)", `${e.fmt(BESTAND.diskont.min * 100, 1)}–${e.pct(BESTAND.diskont.max * 100, 1)}`],
    ["Degradation", `${e.pct(BESTAND.degradation * 100, 1)} p.a.`],
    ["Operating costs, existing plant", e.eur(BESTAND.opexProKwp, "/kWp·yr")],
    ["Inverter replacement", `${e.eur(BESTAND.wechselrichterProKwp.min)}–${e.eur(BESTAND.wechselrichterProKwp.max, "/kWp")}`],
    ["Market value after subsidy", `${e.fmt(ERLOESE.merchantCt, 1)} ct/kWh, +${e.pct(ERLOESE.merchantSteigerung * 100)} p.a.`],
    ["Useful life", `${BESTAND.nutzungsdauer} years (${BESTAND.nutzungsdauerSpanne.min}–${BESTAND.nutzungsdauerSpanne.max})`],
    ["Decommissioning", e.eur(FREIFLAECHE.rueckbauProKwp, "/kWp")],
    ["Typical prices, operating assets", `${e.eur(PHASE_BESTAND.preisProKwp.min)}–${e.eur(PHASE_BESTAND.preisProKwp.max, "/kWp")}`],
  ],
  quellen: [
    { name: "Bundesnetzagentur (Federal Network Agency) – solar tenders" },
    { name: "EEG 2023 (German Renewable Energy Sources Act)" },
    { name: "PVGIS" },
  ],
  querverweise: [
    { titel: "Operating assets", text: "Sell or buy: valuation, due diligence, process and fee." },
    { titel: "Operating assets on the exchange", text: "Operating plants on the project exchange – teaser public, details after NDA." },
    { titel: "Project valuation", text: "Project rights before construction: purchase price range by phase." },
  ],
  cta: {
    eyebrow: "For sellers and buyers",
    title: "Turn the calculation into a robust valuation?",
    text: "With your yield data, contracts and maintenance records, we value the plant specifically – and, if you wish, list it confidentially on the project exchange.",
    primary: { label: "Have the plant valued" },
    secondary: { label: "Operating assets on the exchange" },
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
      toolId="bestandsanlage"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      chips={t.chips}
      app={t.app}
      rechner={<BestandsRechner />}
      erklaerung={
        <>
          <SectionHeading eyebrow={t.methodik.eyebrow} title={t.methodik.title} lead={t.methodik.lead} />
          <NurDEBlock land={land} thema="Rechenwerte und Annahmen" themaEn="Figures and assumptions">
            <div className="ov-prose mt-8 max-w-2xl">
              {en ? (
                <>
                  <p>
                    The starting point is the <strong>measured yield</strong> of recent years, projected forward with {e.pct(BESTAND.degradation * 100, 1)} degradation per year. Until the end of the <strong>subsidy</strong>, the fixed feed-in tariff or the award value applies as the floor; thereafter the solar <strong>market value</strong> less {e.fmt(BESTAND.direktvermarktungCt, 1)} ct/kWh of marketing costs.
                  </p>
                  <p>
                    We deduct operating costs (with {e.pct(FREIFLAECHE.inflation * 100)} inflation), the lease (indexed at {e.pct(PACHT.indexierung * 100, 1)}), an <strong>inverter replacement</strong> and, in the final year, decommissioning at {e.eur(FREIFLAECHE.rueckbauProKwp, "/kWp")}. If the land or roof lease ends without a secured extension, the calculation ends there. The range results from ±1 percentage point on the discount rate and ±5% on yield.
                  </p>
                  <p>
                    The typical price range of {e.eur(PHASE_BESTAND.preisProKwp.min)}–{e.eur(PHASE_BESTAND.preisProKwp.max, "/kWp")} applies to younger plants with today’s tariffs – older plants with a high tariff are often well above it, plants close to the end of their subsidy below it. Read more about selling under <Link href={seitenPfad("/bestandsanlagen")}>Operating assets</Link>.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Ausgangspunkt ist der <strong>gemessene Ertrag</strong> der letzten Jahre, fortgeschrieben mit {fmt(BESTAND.degradation * 100, 1)} % Degradation pro Jahr. Bis zum Ende der <strong>Förderung</strong> gilt die feste Vergütung bzw. der anzulegende Wert als Untergrenze, danach der <strong>Marktwert</strong> Solar abzüglich {fmt(BESTAND.direktvermarktungCt, 1)} ct/kWh Vermarktungskosten.
                  </p>
                  <p>
                    Abgezogen werden Betriebskosten (mit {fmt(FREIFLAECHE.inflation * 100)} % Inflation), die Pacht (indexiert mit {fmt(PACHT.indexierung * 100, 1)} %), ein <strong>Wechselrichtertausch</strong> und im letzten Jahr der Rückbau mit {fmt(FREIFLAECHE.rueckbauProKwp)} €/kWp. Endet der Pacht- oder Dachvertrag ohne gesicherte Verlängerung, endet die Rechnung dort. Die Spanne ergibt sich aus ±1 Prozentpunkt Diskontsatz und ±5 % Ertrag.
                  </p>
                  <p>
                    Die übliche Preisspanne von {fmt(PHASE_BESTAND.preisProKwp.min)}–{fmt(PHASE_BESTAND.preisProKwp.max)} €/kWp gilt für jüngere Anlagen mit heutigen Tarifen – ältere Anlagen mit hohem Tarif liegen oft deutlich darüber, Anlagen kurz vor Förderende darunter. Mehr zum Verkauf lesen Sie unter <Link href={seitenPfad("/bestandsanlagen")}>Bestandsanlagen</Link>.
                  </p>
                </>
              )}
            </div>
          </NurDEBlock>
        </>
      }
      annahmen={t.annahmen}
      quellen={t.quellen}
      faq={faqFuerLand(uebersetze({ de: FAQ, en: FAQ_EN }, sprache), land, { sprache })}
      querverweise={t.querverweise}
      cta={t.cta}
    />
  );
}

export const generateMetadata = seitenMetadata("/rechner/bestandsanlage", metadata, { en: metadataEn });
