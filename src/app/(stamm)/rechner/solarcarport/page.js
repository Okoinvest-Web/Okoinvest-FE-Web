// src/app/rechner/solarcarport/page.js – Solarcarport-Rechner
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur; Regeln:
// src/lib/sprache/woerterbuch.js). Zahlen im Format der Sprache (src/lib/sprache/zahlformat.js).

import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import CarportRechner from "@/components/Rechner/CarportRechner";
import { CARPORT, ERLOESE, FREIFLAECHE, STAND } from "@/lib/invest/markt";
import { STROMPREIS_STANDARD } from "@/lib/rechner/carport";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand, NurDEBlock } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";
import { datumText } from "@/lib/sprache/format";

const PFAD = seitenPfad("/rechner/solarcarport");
const e = formate("en");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Solarcarport-Rechner: Kosten & Amortisation | ÖkoInvest",
  description:
    "Solarcarport für Unternehmen und Kommunen berechnen: Leistung je Stellplatz, Ertrag, Investition, Ersparnis, Amortisation – Kauf und Contracting im Vergleich.",
  keywords: ["Solarcarport Rechner", "Solarcarport Kosten", "Parkplatz PV Rechner", "Solarcarport Amortisation", "Solarcarport Contracting", "PV Parkplatz Unternehmen"],
});

const metadataEn = rechnerMetadataEn({
  title: "Solar carport calculator: costs & payback | ÖkoInvest",
  description:
    "Calculate a solar carport for businesses and municipalities: capacity per parking space, yield, investment, savings, payback – purchase and contracting compared.",
  keywords: ["solar carport calculator", "solar carport costs", "car park PV calculator", "solar carport payback", "solar carport contracting", "car park PV business"],
});

const FAQ = [
  {
    q: "Wie viel Leistung passt auf einen Stellplatz?",
    a: `Bei einem Standardstellplatz von 2,5 × 5 m und modernen Modulen rechnen wir mit rund ${fmt(CARPORT.kwpProStellplatz, 1)} kWp je Stellplatz. Bei Reihenanlagen, die Fahrgassen teilweise mit überdecken, kann es mehr sein; bei Einzelcarports oder Schmetterlingsdächern etwas weniger.`,
  },
  {
    q: "Warum ist ein Solarcarport teurer als eine Dachanlage?",
    a: `Weil zur Photovoltaik ein komplettes Tragwerk kommt: Stahl- oder Holzkonstruktion, Fundamente, Anprallschutz, Entwässerung und oft Beleuchtung. Wir rechnen mit ${fmt(CARPORT.capexProKwp.min)}–${fmt(CARPORT.capexProKwp.max)} €/kWp inklusive Stahlbau – ein Mehrfaches einer Freiflächenanlage. Dafür entsteht Nutzen doppelt: Strom und ein überdachter Parkplatz.`,
    nurDE: "Kostenwerte",
  },
  {
    q: "Wie wird der Contracting-Preis berechnet?",
    a: `Aus den Vollkosten: Investition verzinst mit marktüblichen Kapitalkosten über ${CARPORT.contractingJahre} Jahre, Betrieb und Wartung, abzüglich der Erlöse für den Überschuss, plus ${fmt(CARPORT.contractingMarge * 100)} % Aufschlag. Umgelegt auf den Strom, den Sie vor Ort nutzen. Je höher Ihr Eigenverbrauch, desto günstiger der Preis. Ein verbindliches Angebot hängt von Standort, Statik, Netzanschluss und Bonität ab.`,
    nurDE: "Rechenwerte",
  },
  {
    q: "Was passiert mit dem Überschuss?",
    a: `Strom, den Gebäude und Ladepunkte nicht direkt nutzen, wird ins Netz eingespeist. Wir bewerten ihn vorsichtig mit ${fmt(ERLOESE.merchantCt, 1)} ct/kWh. Je nach Größe gibt es eine Einspeisevergütung oder eine Vermarktung über einen Direktvermarkter; ein Speicher kann den Eigenverbrauch erhöhen.`,
    nurDE: "Vergütungswerte",
  },
  {
    q: "Ist die Förderung schon eingerechnet?",
    a: "Nein. Manche Länder und Kommunen fördern Solarcarports oder Ladeinfrastruktur zeitweise. Programme ändern sich häufig – wir prüfen im Einzelfall, was für Ihr Vorhaben aktuell verfügbar ist.",
  },
];

const FAQ_EN = [
  {
    q: "How much capacity fits on one parking space?",
    a: `For a standard 2.5 × 5 m parking space with modern modules, we calculate with around ${e.fmt(CARPORT.kwpProStellplatz, 1)} kWp per space. With row structures that partly cover the driving lanes, it can be more; with single carports or butterfly roofs, somewhat less.`,
  },
  {
    q: "Why is a solar carport more expensive than a rooftop plant?",
    a: `Because the photovoltaics come with a complete supporting structure: steel or timber construction, foundations, impact protection, drainage and often lighting. We calculate with ${e.eur(CARPORT.capexProKwp.min)}–${e.eur(CARPORT.capexProKwp.max, "/kWp")} including steelwork – several times the cost of a ground-mounted plant. In return, you benefit twice: electricity and a covered car park.`,
    nurDE: "Cost figures",
  },
  {
    q: "How is the contracting price calculated?",
    a: `From the full costs: investment with interest at market-rate cost of capital over ${CARPORT.contractingJahre} years, operation and maintenance, minus the revenue for the surplus, plus a ${e.pct(CARPORT.contractingMarge * 100)} mark-up. Allocated to the power you use on site. The higher your self-consumption, the lower the price. A binding offer depends on location, structural engineering, grid connection and creditworthiness.`,
    nurDE: "Figures",
  },
  {
    q: "What happens to the surplus?",
    a: `Power that the building and charging points do not use directly is fed into the grid. We value it cautiously at ${e.fmt(ERLOESE.merchantCt, 1)} ct/kWh. Depending on the size, there is a feed-in tariff or marketing via a direct marketer; storage can increase self-consumption.`,
    nurDE: "Remuneration figures",
  },
  {
    q: "Are subsidies already included?",
    a: "No. Some states and municipalities subsidise solar carports or charging infrastructure from time to time. Programmes change frequently – we check case by case what is currently available for your project.",
  },
];

const DE = {
  breadcrumb: "Carport-Rechner",
  eyebrow: "Für Unternehmen & Kommunen",
  title: (
    <>
      Was bringt Ihr Parkplatz <span className="ov-text-gradient-light">als Kraftwerk?</span>
    </>
  ),
  lead: "Stellplätze, Strompreis und Ladepunkte eingeben – Sie sehen Leistung, Ertrag, Investition, Ersparnis und Amortisation. Und ob sich Kauf oder Contracting für Sie mehr lohnt.",
  chips: ["Kauf vs. Contracting", "AC- und DC-Ladepunkte", "Eigenverbrauch einstellbar", "DACH-Regionen"],
  app: {
    name: "Solarcarport-Rechner",
    description: "Wirtschaftlichkeit von Solarcarports und Parkplatz-Photovoltaik mit Ladeinfrastruktur – Kauf und Contracting im Vergleich.",
    featureList: ["Leistung und Ertrag je Stellplatz", "Investition inkl. Ladepunkte", "Ersparnis und Amortisation", "Contracting-Preis aus Vollkosten", "Kumulierter Vorteil über 25 Jahre"],
  },
  annahmen: [
    ["Leistung je Stellplatz", `${fmt(CARPORT.kwpProStellplatz, 1)} kWp`],
    ["Baukosten Carport", `${fmt(CARPORT.capexProKwp.min)}–${fmt(CARPORT.capexProKwp.max)} €/kWp`],
    ["Ertrag ggü. Freifläche", `${fmt(CARPORT.ertragFaktor * 100)} %`],
    ["AC-Ladepunkt", fmtEur(CARPORT.ladepunktAc)],
    ["DC-Schnelllader", fmtEur(CARPORT.ladepunktDc)],
    ["Betrieb", `${fmt(CARPORT.opexProKwp)} €/kWp·a`],
    ["Strompreis Mittelstand", `${fmt(STROMPREIS_STANDARD, 1)} ct/kWh netto`],
    ["Einspeisung Überschuss", `${fmt(ERLOESE.merchantCt, 1)} ct/kWh`],
    ["Betrachtung", `${CARPORT.laufzeit} Jahre`],
    ["Stand", STAND],
  ],
  quellen: [
    { name: "BDEW-Strompreisanalyse", url: "https://www.bdew.de/service/daten-und-grafiken/bdew-strompreisanalyse/" },
    { name: "PVGIS", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" },
    { name: "GEIG", url: "https://www.gesetze-im-internet.de/geig/" },
  ],
  faqTitel: "Solarcarport – gut zu wissen",
  querverweise: [
    { href: seitenPfad("/solarcarport"), titel: "Solarcarports", text: "Bauarten, Solarpflicht nach Bundesland, GEIG und Contracting im Überblick." },
    { href: seitenPfad("/rechner/reststrom"), titel: "Reststrom-Rechner", text: "Den Strom, den Sie trotz PV noch kaufen, günstiger über den Pool beziehen." },
    { href: seitenPfad("/kommunen"), titel: "Für Kommunen", text: "Parkplätze an Rathaus, Schule und Bad: Solarcarports als Beitrag zur Wärme- und Verkehrswende." },
  ],
  cta: {
    eyebrow: "Solarcarport",
    title: "Aus dem Parkplatz wird ein Kraftwerk.",
    text: "Schicken Sie uns Lageplan und Verbrauch – wir rechnen Kauf und Contracting mit Ihren Daten und prüfen Statik, Netz und Ladeinfrastruktur.",
    primary: { label: "Carport anfragen", href: seitenPfad("/solarcarport#anfrage") },
    secondary: { label: "Mehr zu Solarcarports", href: seitenPfad("/solarcarport") },
  },
};

const EN = {
  breadcrumb: "Carport calculator",
  eyebrow: "For businesses & municipalities",
  title: (
    <>
      What does your car park bring <span className="ov-text-gradient-light">as a power plant?</span>
    </>
  ),
  lead: "Enter parking spaces, electricity price and charging points – you see capacity, yield, investment, savings and payback. And whether purchase or contracting pays off better for you.",
  chips: ["Purchase vs. contracting", "AC and DC charging points", "Adjustable self-consumption", "DACH regions"],
  app: {
    name: "Solar carport calculator",
    description: "Economics of solar carports and car park photovoltaics with charging infrastructure – purchase and contracting compared.",
    featureList: ["Capacity and yield per parking space", "Investment incl. charging points", "Savings and payback", "Contracting price from full costs", "Cumulative benefit over 25 years"],
  },
  annahmen: [
    ["Capacity per parking space", `${e.fmt(CARPORT.kwpProStellplatz, 1)} kWp`],
    ["Carport construction costs", `${e.eur(CARPORT.capexProKwp.min)}–${e.eur(CARPORT.capexProKwp.max, "/kWp")}`],
    ["Yield vs. ground-mounted", e.pct(CARPORT.ertragFaktor * 100)],
    ["AC charging point", e.fmtEur(CARPORT.ladepunktAc)],
    ["DC fast charger", e.fmtEur(CARPORT.ladepunktDc)],
    ["Operation", e.eur(CARPORT.opexProKwp, "/kWp·yr")],
    ["Electricity price, SMEs", `${e.fmt(STROMPREIS_STANDARD, 1)} ct/kWh net`],
    ["Feed-in of surplus", `${e.fmt(ERLOESE.merchantCt, 1)} ct/kWh`],
    ["Period under review", `${CARPORT.laufzeit} years`],
    ["As of", datumText(STAND, "en")],
  ],
  quellen: [{ name: "BDEW electricity price analysis" }, { name: "PVGIS" }, { name: "GEIG (German Building Electromobility Infrastructure Act)" }],
  faqTitel: "Solar carports – good to know",
  querverweise: [
    { titel: "Solar carports", text: "Designs, solar obligations by federal state, GEIG and contracting at a glance." },
    { titel: "Residual power calculator", text: "Buy the power you still need despite PV more cheaply through the pool." },
    { titel: "For municipalities", text: "Car parks at the town hall, school and swimming pool: solar carports as a contribution to the heat and transport transition." },
  ],
  cta: {
    eyebrow: "Solar carport",
    title: "Turn your car park into a power plant.",
    text: "Send us a site plan and your consumption – we calculate purchase and contracting with your data and check structural engineering, grid and charging infrastructure.",
    primary: { label: "Enquire about a carport" },
    secondary: { label: "More on solar carports" },
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
      toolId="solarcarport"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      chips={t.chips}
      app={t.app}
      rechner={<CarportRechner />}
      erklaerung={
        <NurDEBlock land={land} thema="Rechenwerte und Annahmen" themaEn="Figures and assumptions">
          {en ? (
            <div className="ov-prose max-w-none">
              <h2>How the carport calculator works</h2>
              <p>
                The capacity follows from the number of parking spaces. The yield follows from the region, minus around {e.pct((1 - CARPORT.ertragFaktor) * 100)} compared with an optimally oriented ground-mounted plant, because carport roofs have a flatter pitch and are partly shaded.
              </p>
              <p>
                <strong>Purchase:</strong> every kilowatt hour you use yourself saves your full grid electricity price, which rises by {e.pct(FREIFLAECHE.inflation * 100)} per year. The surplus is fed into the grid. Operation and maintenance are deducted from this ({e.eur(CARPORT.opexProKwp, "/kWp")} per year).
              </p>
              <p>
                <strong>Contracting:</strong> we finance, build and operate the carport. You only pay for the solar power you use – at a fixed price over {CARPORT.contractingJahre} years. After that, the plant usually passes to you. In both variants, we count the charging points as your investment; if you wish, they can be financed as well.
              </p>
              <h3>Do not forget your obligations</h3>
              <p>
                In several German federal states, a solar obligation applies to new, larger car parks, and the Building Electromobility Infrastructure Act (GEIG) requires cabling infrastructure and charging points. You will find an overview by federal state on the Solar carports page.
              </p>
            </div>
          ) : (
            <div className="ov-prose max-w-none">
              <h2>So rechnet der Carport-Rechner</h2>
              <p>
                Die Leistung ergibt sich aus der Zahl der Stellplätze. Der Ertrag folgt aus der Region, abzüglich rund {fmt((1 - CARPORT.ertragFaktor) * 100)} % gegenüber einer optimal
                ausgerichteten Freiflächenanlage, weil Carportdächer flacher geneigt und teils verschattet sind.
              </p>
              <p>
                <strong>Kauf:</strong> Jede selbst genutzte Kilowattstunde spart Ihren vollen Netzstrompreis, der mit {fmt(FREIFLAECHE.inflation * 100)} % pro Jahr steigt. Der Überschuss wird
                eingespeist. Davon gehen Betrieb und Wartung ab ({fmt(CARPORT.opexProKwp)} €/kWp im Jahr).
              </p>
              <p>
                <strong>Contracting:</strong> Wir finanzieren, bauen und betreiben den Carport. Sie zahlen nur für den Solarstrom, den Sie nutzen – zu einem festen Preis über{" "}
                {CARPORT.contractingJahre} Jahre. Danach geht die Anlage in der Regel an Sie über. Die Ladepunkte rechnen wir in beiden Varianten als Ihre Investition; auf Wunsch lassen sie sich
                mitfinanzieren.
              </p>
              <h3>Pflichten nicht vergessen</h3>
              <p>
                In mehreren Bundesländern gilt für neue größere Parkplätze eine Solarpflicht, und das Gebäude-Elektromobilitätsinfrastruktur-Gesetz (GEIG) verlangt Leitungsinfrastruktur und
                Ladepunkte. Einen Überblick nach Bundesland finden Sie auf der Seite Solarcarports.
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

export const generateMetadata = seitenMetadata("/rechner/solarcarport", metadata, { en: metadataEn });
