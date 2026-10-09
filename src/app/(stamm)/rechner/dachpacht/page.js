// src/app/rechner/dachpacht/page.js – Dachpacht-Rechner
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur; Regeln:
// src/lib/sprache/woerterbuch.js). Zahlen im Format der Sprache (src/lib/sprache/zahlformat.js).

import Link from "@/components/Land/Link";
import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import DachpachtRechner from "@/components/Dach/DachpachtRechner";
import SectionHeading from "@/components/ui/SectionHeading";
import { DACH, FREIFLAECHE } from "@/lib/invest/markt";
import { NETZSTROM_CT } from "@/lib/rechner/dachpacht";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand, NurDEBlock } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";

const PFAD = seitenPfad("/rechner/dachpacht");
const e = formate("en");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Dachpacht-Rechner Photovoltaik | ÖkoInvest",
  description:
    "Dachfläche für PV verpachten: Leistung, Ertrag und Pachtspanne Ihres Gewerbedachs – dazu Dachpacht, Dachstrom-PPA und Eigeninvestition im Vergleich. Kostenlos.",
  keywords: ["Dachpacht Rechner", "Dachfläche verpachten Photovoltaik", "Dachpacht pro m²", "Gewerbedach PV Pacht", "Dach vermieten Solar"],
});

const metadataEn = rechnerMetadataEn({
  title: "Roof lease calculator for photovoltaics | ÖkoInvest",
  description:
    "Lease your roof for PV: capacity, yield and lease range of your commercial roof – plus roof lease, rooftop PPA and own investment compared. Free of charge.",
  keywords: ["roof lease calculator", "lease roof for photovoltaics", "roof lease per m²", "commercial roof PV lease", "rent out roof for solar"],
});

const FAQ = [
  {
    q: "Wie viel Pacht bringt ein Gewerbedach?",
    a: `Als Orientierung rechnen wir mit ${fmt(DACH.pachtProM2.min, 2)}–${fmt(DACH.pachtProM2.max, 2)} € je m² und Jahr bzw. ${fmt(DACH.pachtProKwp.min)}–${fmt(DACH.pachtProKwp.max)} € je installiertem kWp. Höhere Werte, wie sie manche Anbieter nennen, sind bei heutigen Zuschlagswerten nur für sehr große, gut ausgerichtete Dächer mit Netzanschluss am Gebäude realistisch. Entscheidend ist, dass die Pacht zum Stromerlös passt – sonst wird das Projekt nicht gebaut.`,
    nurDE: "Pachtwerte",
  },
  {
    q: "Warum zeigt der Rechner Faserzement als „nicht belegbar“?",
    a: "Faserzement-Wellplatten aus der Zeit vor 1993 enthalten häufig Asbest. Diese Dächer dürfen nach der Gefahrstoffverordnung nicht überbaut oder angebohrt werden. Auch asbestfreie Wellplatten tragen Module selten dauerhaft sicher. Möglich ist eine Sanierung vorab – teils als Gegenleistung des Betreibers.",
  },
  {
    q: "Einmalzahlung oder jährliche Pacht?",
    a: `Die Einmalzahlung ist der auf heute abgezinste Wert aller künftigen Pachten – bei ${DACH.laufzeit} Jahren etwa das 12- bis 13-Fache einer Jahrespacht, nicht die Summe. Sie ist attraktiv, wenn Sie Kapital für eine Dachsanierung oder Investition brauchen. Die jährliche Pacht bringt in Summe mehr und lässt sich an einen Index koppeln.`,
    nurDE: "Pachtwerte",
  },
  {
    q: "Was bedeutet „Pacht + Dachstrom (PPA)“?",
    a: `Der Betreiber baut und betreibt die Anlage und liefert Ihnen (oder Ihrem Mieter) den Strom direkt vom Dach – meist deutlich günstiger als Netzstrom, weil Netzentgelte und Teile der Abgaben entfallen. Dafür fällt die Pacht oft niedriger aus; wir rechnen mit ${fmt(DACH.ppaPachtAnteil * 100)} % der Pacht. Lohnend ist das, wenn tagsüber viel Strom im Gebäude verbraucht wird.`,
    nurDE: "Rechenwerte",
  },
  {
    q: "Lohnt sich die Eigeninvestition mehr?",
    a: "Rechnerisch oft ja – wenn Sie einen hohen Eigenverbrauch haben, Kapital binden wollen und Betrieb, Versicherung, Wartung und Wechselrichtertausch selbst organisieren. Die Pacht ist dagegen ohne Kapital und ohne Betriebsrisiko. Steuerlich kann der Eigenbetrieb Folgen haben (etwa eine gewerbliche Infizierung von Vermietungseinkünften) – vor der Entscheidung zur Steuerberatung.",
  },
];

const FAQ_EN = [
  {
    q: "How much lease does a commercial roof earn?",
    a: `As a guide, we calculate with ${e.eur(DACH.pachtProM2.min, "", 2)}–${e.eur(DACH.pachtProM2.max, "", 2)} per m² per year, or ${e.eur(DACH.pachtProKwp.min)}–${e.eur(DACH.pachtProKwp.max)} per installed kWp. Higher figures, as quoted by some providers, are only realistic at today’s award values for very large, well-oriented roofs with a grid connection at the building. What matters is that the lease matches the power revenue – otherwise the project will not be built.`,
    nurDE: "Lease rates",
  },
  {
    q: "Why does the calculator show fibre cement as “not usable”?",
    a: "Corrugated fibre cement sheets from before 1993 often contain asbestos. Under the German Hazardous Substances Ordinance, such roofs must not be built over or drilled. Even asbestos-free corrugated sheets rarely carry modules safely in the long term. Refurbishment beforehand is possible – sometimes as a consideration provided by the operator.",
  },
  {
    q: "One-off payment or annual lease?",
    a: `The one-off payment is the present value of all future lease payments – over ${DACH.laufzeit} years roughly 12 to 13 times an annual lease, not the total. It is attractive if you need capital for a roof refurbishment or an investment. The annual lease yields more in total and can be linked to an index.`,
    nurDE: "Lease rates",
  },
  {
    q: "What does “lease + rooftop power (PPA)” mean?",
    a: `The operator builds and runs the plant and supplies you (or your tenant) with power directly from the roof – usually considerably cheaper than grid power, because grid fees and some levies do not apply. In return, the lease is often lower; we calculate with ${e.pct(DACH.ppaPachtAnteil * 100)} of the lease. This pays off if a lot of power is consumed in the building during the day.`,
    nurDE: "Figures",
  },
  {
    q: "Is investing yourself more worthwhile?",
    a: "Mathematically, often yes – if you have high self-consumption, are willing to tie up capital and organise operation, insurance, maintenance and inverter replacement yourself. The lease, by contrast, requires no capital and carries no operating risk. Running the plant yourself can have tax consequences (for example, rental income becoming treated as trading income in Germany) – consult your tax adviser before deciding.",
  },
];

const DE = {
  breadcrumb: "Dachpacht-Rechner",
  eyebrow: "Dachpacht-Rechner",
  title: <>Was ist Ihr Dach <span className="ov-text-gradient-light">als Kraftwerk wert?</span></>,
  lead: "Dachfläche, Dachart, Ausrichtung und Region – Sie sehen Leistung, Ertrag und Pachtspanne und vergleichen Dachpacht, Dachstrom-PPA und Eigeninvestition über die Laufzeit.",
  chips: ["Kostenlos & ohne Anmeldung", "Pacht, PPA und Eigeninvestition", "Gewerbe-, Hallen- und Agrardächer"],
  app: {
    name: "ÖkoInvest Dachpacht-Rechner",
    description: "Berechnet Leistung, Ertrag und Pachtspanne großer Dachflächen für Photovoltaik und vergleicht Dachpacht, Stromlieferung vom Dach (PPA) und Eigeninvestition.",
    featureList: ["Dachart und Ausrichtung", "Pachtspanne je m² und kWp", "Einmalzahlung als Barwert", "Vergleich Pacht, PPA und Eigeninvestition", "Kumulierte Werte über 15–30 Jahre"],
  },
  methodik: {
    eyebrow: "So rechnen wir",
    title: "Die Pacht muss zum Strom passen – sonst wird nicht gebaut.",
    lead: "Wir leiten die Pacht nicht aus Werbewerten ab, sondern prüfen sie gegen den Stromerlös, den die Anlage auf Ihrem Dach erzielen kann.",
  },
  annahmen: [
    ["Dachpacht (Orientierung)", `${fmt(DACH.pachtProM2.min, 2)}–${fmt(DACH.pachtProM2.max, 2)} €/m²·a`],
    ["entspricht", `${fmt(DACH.pachtProKwp.min)}–${fmt(DACH.pachtProKwp.max)} €/kWp·a`],
    ["Umsatzbeteiligung üblich", `${fmt(DACH.umsatzbeteiligung.min * 100)}–${fmt(DACH.umsatzbeteiligung.max * 100)} %`],
    ["Zuschläge Dach 2025", DACH.zuschlagsHistorie.map((z) => fmt(z.ct, 2)).join(" · ") + " ct"],
    ["Überschuss bei Eigenverbrauch", `${fmt(DACH.ueberschussCt, 1)} ct/kWh`],
    ["Investition Gewerbedach", `${fmt(DACH.capexProKwp.min)}–${fmt(DACH.capexProKwp.max)} €/kWp`],
    ["Betriebskosten", `${fmt(DACH.opexProKwp)} €/kWp·a`],
    ["Einmalzahlung abgezinst mit", `${fmt(DACH.einmalDiskont * 100, 1)} %`],
    ["Pacht bei zusätzlichem PPA", `${fmt(DACH.ppaPachtAnteil * 100)} % der Pacht`],
  ],
  quellen: DACH.quellen.slice(0, 2).map((q) => ({ name: q.titel, url: q.url })).concat([{ name: "PVGIS", url: "https://re.jrc.ec.europa.eu/pvg_tools/de/" }]),
  querverweise: [
    { href: seitenPfad("/dachflaeche-verpachten"), titel: "Dachfläche verpachten", text: "Modelle, Voraussetzungen, Vertrag, Steuern und Ablauf – für Gewerbe-, Hallen- und Agrardächer." },
    { href: seitenPfad("/rechner/pacht"), titel: "Pachtrechner Freifläche", text: "Acker oder Grünland statt Dach? Solarpacht je Hektar über 30 Jahre." },
    { href: seitenPfad("/reststrom"), titel: "Reststrom-Pool", text: "Den Strom, den Sie trotz Dachanlage noch kaufen, gebündelt günstiger beziehen." },
  ],
  cta: {
    eyebrow: "Für Dacheigentümer kostenfrei",
    title: "Aus der Rechnung ein echtes Angebot machen?",
    text: "Wir prüfen Statik, Dachzustand, Brandschutz und Netzanschluss und legen Ihnen ein Angebot mit Vertragsentwurf vor – ohne Kosten und ohne Verpflichtung.",
    primary: { label: "Dach prüfen lassen", href: seitenPfad("/dachflaeche-verpachten#anfrage") },
    secondary: { label: "Dachfläche verpachten", href: seitenPfad("/dachflaeche-verpachten") },
  },
};

const EN = {
  breadcrumb: "Roof lease calculator",
  eyebrow: "Roof lease calculator",
  title: <>What is your roof worth <span className="ov-text-gradient-light">as a power plant?</span></>,
  lead: "Roof area, roof type, orientation and region – you see capacity, yield and lease range, and compare roof lease, rooftop PPA and own investment over the term.",
  chips: ["Free & no sign-up", "Lease, PPA and own investment", "Commercial, warehouse and farm roofs"],
  app: {
    name: "ÖkoInvest roof lease calculator",
    description: "Calculates the capacity, yield and lease range of large roof areas for photovoltaics and compares roof lease, power supply from the roof (PPA) and own investment.",
    featureList: ["Roof type and orientation", "Lease range per m² and kWp", "One-off payment as present value", "Comparison of lease, PPA and own investment", "Cumulative values over 15–30 years"],
  },
  methodik: {
    eyebrow: "How we calculate",
    title: "The lease has to match the power – otherwise nothing gets built.",
    lead: "We do not derive the lease from advertising figures; we check it against the power revenue the plant on your roof can generate.",
  },
  annahmen: [
    ["Roof lease (guide)", `${e.eur(DACH.pachtProM2.min, "", 2)}–${e.eur(DACH.pachtProM2.max, "/m²·yr", 2)}`],
    ["equivalent to", `${e.eur(DACH.pachtProKwp.min)}–${e.eur(DACH.pachtProKwp.max, "/kWp·yr")}`],
    ["Typical revenue share", `${e.fmt(DACH.umsatzbeteiligung.min * 100)}–${e.pct(DACH.umsatzbeteiligung.max * 100)}`],
    ["Rooftop awards 2025", DACH.zuschlagsHistorie.map((z) => e.fmt(z.ct, 2)).join(" · ") + " ct"],
    ["Surplus with self-consumption", `${e.fmt(DACH.ueberschussCt, 1)} ct/kWh`],
    ["Investment, commercial roof", `${e.eur(DACH.capexProKwp.min)}–${e.eur(DACH.capexProKwp.max, "/kWp")}`],
    ["Operating costs", e.eur(DACH.opexProKwp, "/kWp·yr")],
    ["One-off payment discounted at", e.pct(DACH.einmalDiskont * 100, 1)],
    ["Lease with additional PPA", `${e.pct(DACH.ppaPachtAnteil * 100)} of the lease`],
  ],
  quellen: [{ name: "Bundesnetzagentur (Federal Network Agency) – tenders for rooftop solar (second segment)" }, { name: "Fraunhofer ISE – levelised cost of electricity from renewables" }, { name: "PVGIS" }],
  querverweise: [
    { titel: "Lease your roof", text: "Models, requirements, contract, taxes and process – for commercial, warehouse and farm roofs." },
    { titel: "Ground-mounted lease calculator", text: "Arable land or grassland instead of a roof? Solar lease per hectare over 30 years." },
    { titel: "Residual power pool", text: "Buy the power you still need despite a rooftop plant more cheaply through pooling." },
  ],
  cta: {
    eyebrow: "Free of charge for roof owners",
    title: "Turn the calculation into a real offer?",
    text: "We check structural load, roof condition, fire protection and grid connection, and send you an offer with a draft contract – at no cost and with no obligation.",
    primary: { label: "Have your roof checked" },
    secondary: { label: "Lease your roof" },
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
      toolId="dachpacht"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      chips={t.chips}
      app={t.app}
      rechner={<DachpachtRechner />}
      erklaerung={
        <>
          <SectionHeading eyebrow={t.methodik.eyebrow} title={t.methodik.title} lead={t.methodik.lead} />
          <NurDEBlock land={land} thema="Rechenwerte und Annahmen" themaEn="Figures and assumptions">
            <div className="ov-prose mt-8 max-w-2xl">
              {en ? (
                <>
                  <p>
                    The <strong>capacity</strong> follows from the roof area: on pitched trapezoidal and sandwich roofs we calculate with around {e.fmt(DACH.dacharten[0].m2ProKwp)} m² per kWp, on flat roofs with east/west mounting with around {e.fmt(DACH.dacharten[2].m2ProKwp)} m² – including edge clearances and fire-protection strips. We derive the <strong>yield</strong> from the irradiation in your region, adjusted for roof pitch and orientation, with {e.pct(FREIFLAECHE.degradation * 100, 1)} degradation per year.
                  </p>
                  <p>
                    For the <strong>comparison</strong>, we set your grid electricity price (guide value {e.fmt(NETZSTROM_CT, 1)} ct/kWh for SMEs) against the PPA price from the roof and against your own plant, whose surplus is remunerated at {e.fmt(DACH.ueberschussCt, 1)} ct/kWh. We calculate present values with the discount rate so that one-off amounts and annual payments become comparable.
                  </p>
                  <p>
                    What the roof use agreement should contain and which requirements your roof must meet is explained under <Link href={seitenPfad("/dachflaeche-verpachten")}>Lease your roof</Link>.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Die <strong>Leistung</strong> ergibt sich aus der Dachfläche: Auf geneigten Trapez- und Sandwichdächern rechnen wir mit rund {fmt(DACH.dacharten[0].m2ProKwp)} m² je kWp, auf Flachdächern mit Ost/West-Aufständerung mit rund {fmt(DACH.dacharten[2].m2ProKwp)} m² – inklusive Randabständen und Brandschutzstreifen. Den <strong>Ertrag</strong> leiten wir aus der Einstrahlung Ihrer Region ab, abzüglich Dachneigung und Ausrichtung, mit {fmt(FREIFLAECHE.degradation * 100, 1)} % Degradation pro Jahr.
                  </p>
                  <p>
                    Für den <strong>Vergleich</strong> setzen wir Ihren Netzstrompreis (Richtwert {fmt(NETZSTROM_CT, 1)} ct/kWh für den Mittelstand) gegen den PPA-Preis vom Dach und gegen eine eigene Anlage, deren Überschuss mit {fmt(DACH.ueberschussCt, 1)} ct/kWh vergütet wird. Barwerte rechnen wir mit dem Kalkulationszins, damit Einmalbeträge und Jahreszahlungen vergleichbar werden.
                  </p>
                  <p>
                    Was im Dachnutzungsvertrag stehen sollte und welche Voraussetzungen Ihr Dach erfüllen muss, lesen Sie unter <Link href={seitenPfad("/dachflaeche-verpachten")}>Dachfläche verpachten</Link>.
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

export const generateMetadata = seitenMetadata("/rechner/dachpacht", metadata, { en: metadataEn });
