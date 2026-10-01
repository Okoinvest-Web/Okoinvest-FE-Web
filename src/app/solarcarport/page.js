import Link from "next/link";
import { ArrowUpRight, BatteryCharging, Building2, Calculator, Car, CircleDollarSign, Handshake, Landmark, PlugZap, ShoppingBag, Sun, TreePine, Warehouse, Wrench, Zap } from "lucide-react";

import PageHero from "@/components/ui/PageHero";
import HeroSzene from "@/components/Landing/HeroSzene";
import { Solarcarport } from "@/components/illustrationen";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import FeatureGrid from "@/components/ui/FeatureGrid";
import SplitMedia from "@/components/ui/SplitMedia";
import Steps from "@/components/ui/Steps";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import CarportIllustration from "@/components/Carport/CarportIllustration";
import AuswahlAnfrage from "@/components/Carport/AuswahlAnfrage";
import { abs, SITE } from "@/data/site";
import { CARPORT, STAND } from "@/lib/invest/markt";
import { rechneCarport } from "@/lib/rechner/carport";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";

const PFAD = "/solarcarport";
const TITEL = "Solarcarport & Parkplatz-PV für Unternehmen | ÖkoInvest";
const BESCHREIBUNG =
  "Solarcarports für Unternehmen, Handel und Kommunen: Solarpflicht je Bundesland, Bauarten, Ladepunkte nach GEIG, Contracting – wir bauen, Sie nutzen den Strom.";

export const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  keywords: ["Solarcarport Unternehmen", "Parkplatz Photovoltaik", "Solarpflicht Parkplatz", "Solarcarport Contracting", "PV Parkplatz Ladeinfrastruktur", "GEIG Ladepunkte"],
  alternates: { canonical: abs(PFAD) },
  openGraph: { type: "website", url: abs(PFAD), siteName: "ÖkoInvest", title: TITEL, description: BESCHREIBUNG, images: [{ url: abs("/img/gewerbedach.jpg"), width: 1280, height: 852, alt: "Gewerbegebäude mit Photovoltaik" }] },
};

/** Solarpflicht für neue Parkplätze – Kurzfassung, ausführlich im Ratgeber (Stand September 2026) */
const PFLICHT = [
  ["Baden-Württemberg", "mehr als 35", "60 % der geeigneten Fläche", "seit 2022"],
  ["Hamburg", "mehr als 35 neue", "40 % der geeigneten Fläche", "seit 2024"],
  ["Hessen", "mehr als 50 (landeseigen: mehr als 35)", "Anlage über der Stellplatzfläche", "Bauanträge ab Ende 2023"],
  ["Niedersachsen", "mehr als 25", "auch bei Erneuerung von mind. 50 % eines Parkplatzes", "seit 2025 (vorher mehr als 50)"],
  ["Nordrhein-Westfalen", "mehr als 35 (Nichtwohngebäude)", "30 % der geeigneten Fläche, alternativ Bäume", "seit 2022"],
  ["Rheinland-Pfalz", "ab 50 (gewerblich, öffentlich)", "60 % der geeigneten Fläche", "seit 2023"],
  ["Saarland", "ab 35 (gewerblich), öffentliche Parkplätze", "60 % der geeigneten Fläche", "seit 2025"],
  ["Schleswig-Holstein", "mehr als 70", "Neubau und grundlegende Sanierung", "Novelle 2025"],
];
const OHNE = "Bayern, Berlin, Bremen, Mecklenburg-Vorpommern, Sachsen, Sachsen-Anhalt, Thüringen; in Brandenburg wurde die Parkplatzpflicht 2026 wieder aufgehoben";

const beispiel = rechneCarport({ stellplaetze: 100, eigenverbrauch: 0.75, ac: 10, dc: 2 });

const FAQ = [
  {
    q: "Ab wie vielen Stellplätzen gilt die Solarpflicht?",
    a: "Das regelt jedes Bundesland selbst: nach aktuellem Stand ab mehr als 25 Stellplätzen in Niedersachsen, ab mehr als 35 in Baden-Württemberg, Hamburg und NRW, ab 35 gewerblich genutzten im Saarland, ab mehr als 50 in Hessen, ab 50 in Rheinland-Pfalz und ab mehr als 70 in Schleswig-Holstein. Sie gilt in der Regel für neue Parkplätze oder große Erweiterungen, nicht für den Bestand. Maßgeblich ist der aktuelle Gesetzestext zum Zeitpunkt des Bauantrags.",
  },
  {
    q: "Was verlangt das GEIG auf Parkplätzen?",
    a: "Das Gebäude-Elektromobilitätsinfrastruktur-Gesetz verlangt bei neuen Nichtwohngebäuden mit mehr als sechs Stellplätzen Leitungsinfrastruktur für mindestens jeden dritten Stellplatz und mindestens einen Ladepunkt; bei größeren Renovierungen mit mehr als zehn Stellplätzen für jeden fünften. Bestehende Nichtwohngebäude mit mehr als 20 Stellplätzen brauchen seit dem 1. Januar 2025 mindestens einen Ladepunkt. Ein Solarcarport ist die naheliegende Stelle dafür.",
  },
  {
    q: "Was kostet ein Solarcarport?",
    a: `Wir rechnen mit ${fmt(CARPORT.capexProKwp.min)}–${fmt(CARPORT.capexProKwp.max)} €/kWp inklusive Stahlbau, Fundamenten und Entwässerung – bei rund ${fmt(CARPORT.kwpProStellplatz, 1)} kWp je Stellplatz also etwa ${fmtEur(CARPORT.kwpProStellplatz * CARPORT.capexProKwp.min)} bis ${fmtEur(CARPORT.kwpProStellplatz * CARPORT.capexProKwp.max)} je Stellplatz. Dazu kommen Ladepunkte: AC rund ${fmtEur(CARPORT.ladepunktAc)}, DC-Schnelllader rund ${fmtEur(CARPORT.ladepunktDc)} je Stück, ohne Netzausbau.`,
  },
  {
    q: "Wie funktioniert das Contracting?",
    a: `Wir planen, finanzieren, bauen und betreiben den Solarcarport. Sie stellen die Fläche und kaufen den Solarstrom, den Sie vor Ort nutzen, zu einem festen Preis – typischerweise über ${CARPORT.contractingJahre} Jahre. Sie binden kein Kapital, Wartung und Versicherung liegen bei uns. Nach Vertragsende kann die Anlage an Sie übergehen. Voraussetzung sind ein ausreichender Eigenverbrauch und eine gesicherte Nutzung der Fläche.`,
  },
  {
    q: "Stahl oder Holz?",
    a: "Stahl ist schlank, wirtschaftlich bei großen Spannweiten und in vielen Systemen vorgefertigt. Holz – meist Brettschichtholz – bindet CO₂, wirkt wärmer und passt zu Kommunen und Handel mit Nachhaltigkeitsanspruch; es braucht konstruktiven Holzschutz und ist oft etwas teurer. Wir planen beides.",
  },
  {
    q: "Gibt es Regeln in Österreich und der Schweiz?",
    a: "In Österreich regeln die Bundesländer Solarpflichten in ihren Bau- und Energiegesetzen unterschiedlich; eine flächendeckende Parkplatzpflicht wie in einigen deutschen Ländern ist uns nach aktuellem Stand nicht bekannt. In der Schweiz verlangen viele Kantone bei Neubauten Eigenstromerzeugung. Zusätzlich sieht die EU-Gebäuderichtlinie von 2024 schrittweise Solarpflichten vor, auch für überdachte Parkplätze an Gebäuden. Wir prüfen die Lage im Einzelfall.",
  },
];

export default function SolarcarportSeite() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Solarcarports und Parkplatz-Photovoltaik",
    serviceType: "Planung, Bau, Finanzierung und Betrieb von Solarcarports mit Ladeinfrastruktur",
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: ["DE", "AT", "CH"],
    audience: { "@type": "BusinessAudience", audienceType: "Unternehmen, Handel, Kommunen" },
    url: abs(PFAD),
    description: BESCHREIBUNG,
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <PageHero
        variant="dark"
        breadcrumbs={[{ name: "Solarcarports & Parkplätze" }]}
        eyebrow="Solarcarports & Parkplatz-PV"
        title={
          <>
            Parkplätze, die <span className="ov-text-gradient-light">Strom erzeugen.</span>
          </>
        }
        lead="Für Unternehmen, Handel und Kommunen: Solarcarports mit Ladepunkten, geplant nach Solarpflicht und GEIG. Selbst investieren oder im Contracting – wir bauen und betreiben, Sie nutzen den Strom."
        points={["Solarpflicht sicher erfüllen", "Ladeinfrastruktur AC & DC", "Kauf oder Contracting", "Stahl oder Holz"]}
        actions={[
          { label: "Carport anfragen", href: "#anfrage" },
          { label: "Carport-Rechner", href: "/rechner/solarcarport", icon: Calculator },
        ]}
        className="[&>div.ov-container]:pb-28 md:[&>div.ov-container]:pb-36"
        szene={
          <HeroSzene>
            <Solarcarport ton="dunkel" animiert />
          </HeroSzene>
        }
      />

      <section aria-label="Solarcarport in Zahlen" className="relative z-10 -mt-20 md:-mt-28">
        <div className="ov-container">
          <Reveal className="rounded-[2rem] bg-white p-5 shadow-[0_40px_80px_-40px_rgba(3,18,43,0.45)] ring-1 ring-ink-200/70 md:p-8">
            <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
              <CarportIllustration className="h-auto w-full" />
              <dl className="grid grid-cols-2 gap-4">
                {[
                  ["Leistung je Stellplatz", `≈ ${fmt(CARPORT.kwpProStellplatz, 1)} kWp`],
                  ["100 Stellplätze", `≈ ${fmt(beispiel.kwp)} kWp`],
                  ["Ertrag (Süd-DE)", `≈ ${fmt(beispiel.ertrag / 1000)} MWh/Jahr`],
                  ["CO₂ vermieden", `≈ ${fmt(beispiel.co2Tonnen)} t/Jahr`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-3xl bg-sand-50 p-4 ring-1 ring-ink-200/70 md:p-5">
                    <dt className="text-[12.5px] text-ink-500 md:text-[13px]">{k}</dt>
                    <dd className="ov-num mt-1 font-display text-[18px] font-extrabold tracking-tight text-ink-900 md:text-[24px]">{v}</dd>
                  </div>
                ))}
                <p className="col-span-2 text-[12.5px] text-ink-500">Beispielwerte aus dem Carport-Rechner, Stand {STAND}.</p>
              </dl>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Zielgruppen ---------------- */}
      <Section tone="white" space="md">
        <SectionHeading eyebrow="Für wen" title="Überall, wo Autos tagsüber stehen." className="mb-12" />
        <FeatureGrid
          cols={3}
          items={[
            { icon: Building2, title: "Unternehmen", text: "Mitarbeiter- und Besucherparkplätze: Strom für Produktion und Büro, Laden für Dienstwagen und E-Flotte – dann, wenn die Sonne scheint." },
            { icon: ShoppingBag, title: "Handel & Freizeit", text: "Kundenparkplätze mit Ladeangebot, Schatten im Sommer und Strom für Kühlung und Beleuchtung – sichtbar nachhaltig." },
            { icon: Landmark, title: "Kommunen", text: "Parkplätze an Rathaus, Schule, Bad und Bahnhof: Solarpflicht erfüllen, Ladeinfrastruktur schaffen, Haushalt entlasten.", href: "/kommunen" },
          ]}
        />
      </Section>

      {/* ---------------- Solarpflicht ---------------- */}
      <Section tone="sand" space="lg" id="solarpflicht">
        <div className="grid gap-10">
          <SectionHeading
            eyebrow="Solarpflicht"
            title="Welche Länder Photovoltaik auf Parkplätzen verlangen."
            lead="In acht Bundesländern gilt eine Solarpflicht für neue Parkplätze – mit unterschiedlichen Schwellen, Stichtagen und Ausnahmen. Ein Überblick, Stand September 2026."
          >
            <p className="mt-5 text-[15px] leading-relaxed text-ink-600">
              Keine Parkplatzpflicht nach aktuellem Stand: {OHNE}. Details, Rechtsgrundlagen und Ausnahmen im{" "}
              <Link href="/ratgeber/parkplatz-solarpflicht-bundeslaender" className="font-semibold text-ov-700 underline decoration-ov-300 underline-offset-2">
                Ratgeber Solarpflicht für Parkplätze
              </Link>
              .
            </p>
          </SectionHeading>
          <Reveal className="min-w-0">
            <div tabIndex={0} role="region" aria-label="Solarpflicht für Parkplätze nach Bundesland" className="overflow-x-auto rounded-3xl bg-white ring-1 ring-ink-200/70">
              <table className="w-full min-w-[720px] text-left text-[14.5px]">
                <caption className="sr-only">Solarpflicht für neue Parkplätze nach Bundesland, Stand September 2026</caption>
                <thead className="bg-sand-100 text-[12px] uppercase tracking-[0.12em] text-ink-600">
                  <tr>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Land</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Stellplätze</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Umfang</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Gilt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {PFLICHT.map(([land, schwelle, umfang, seit]) => (
                    <tr key={land}>
                      <th scope="row" className="px-5 py-3.5 font-semibold text-ink-900">{land}</th>
                      <td className="px-5 py-3.5 text-ink-700">{schwelle}</td>
                      <td className="px-5 py-3.5 text-ink-600">{umfang}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-ink-500">{seit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
              Eigene Zusammenstellung aus Landesrecht, ohne Gewähr. Stichtage beziehen sich meist auf den Bauantrag; Ausnahmen gibt es u. a. bei Unwirtschaftlichkeit oder fehlendem
              Netzanschluss. Landesrecht ändert sich häufig – vor der Planung den aktuellen Stand prüfen.
            </p>
          </Reveal>
        </div>
      </Section>

      {/* ---------------- Bauarten ---------------- */}
      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Bauarten" title="Vom Einzelplatz bis zur Parkplatzreihe." lead="Die Bauart folgt dem Parkplatz: Anordnung, Fahrgassen, Schneelast, Entwässerung und Gestaltungswünsche entscheiden." className="mb-12" />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { titel: "Einzel- und Doppelcarport", text: "Für kleine Flächen, Besucherplätze und Dienstwagen. Schnell montiert, flexibel erweiterbar.", svg: <BauartEinzel /> },
            { titel: "Reihencarport", text: "Die wirtschaftliche Lösung für lange Stellplatzreihen: einseitig geneigt, Stützen im Raster der Stellplätze.", svg: <BauartReihe /> },
            { titel: "Schmetterlingsdach", text: "Zwei Reihen unter einem V-förmigen Dach – deckt beidseitig ab, Wasser läuft in der Mitte ab.", svg: <BauartSchmetterling /> },
          ].map((b, i) => (
            <Reveal key={b.titel} delay={i * 70} className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/70">
              <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-100">{b.svg}</div>
              <h3 className="ov-h3 mt-6 text-ink-900">{b.titel}</h3>
              <p className="mt-2 text-[15.5px] leading-relaxed text-ink-600">{b.text}</p>
            </Reveal>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            { icon: Wrench, titel: "Stahl", text: "Schlank, vorgefertigt, wirtschaftlich bei großen Spannweiten. Feuerverzinkt oder beschichtet, mit Anprallschutz an den Stützen." },
            { icon: TreePine, titel: "Holz", text: "Brettschichtholz mit konstruktivem Holzschutz: bindet CO₂ und passt zu Kommunen, Handel und Standorten mit Gestaltungsanspruch." },
          ].map((m) => (
            <div key={m.titel} className="flex gap-4 rounded-3xl bg-white p-6 ring-1 ring-ink-200/70">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ov-50 text-ov-600">
                <m.icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-[18px] font-bold text-ink-900">{m.titel}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-600">{m.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------------- Laden & GEIG ---------------- */}
      <Section tone="navy" space="lg">
        <SplitMedia
          dark
          reverse
          eyebrow="Ladeinfrastruktur & GEIG"
          title="Solarstrom direkt ins Auto."
          text={[
            "AC-Ladepunkte mit 11 oder 22 kW reichen für Mitarbeiter und Dienstwagen, die Stunden stehen. DC-Schnelllader mit 50 bis 150 kW lohnen sich für Kunden, Flotten mit kurzen Standzeiten und öffentliches Laden – brauchen aber mehr Netzanschlussleistung.",
            "Ein Lastmanagement verteilt die verfügbare Leistung auf die Ladepunkte und bevorzugt Solarstrom. Das GEIG verlangt bei neuen Nichtwohngebäuden mit mehr als sechs Stellplätzen Leitungsinfrastruktur für jeden dritten Stellplatz und mindestens einen Ladepunkt; bestehende Nichtwohngebäude mit mehr als 20 Stellplätzen brauchen seit 2025 mindestens einen Ladepunkt.",
          ]}
          points={[
            { title: "AC 11/22 kW", text: `ab rund ${fmtEur(CARPORT.ladepunktAc)} je Ladepunkt` },
            { title: "DC 50–150 kW", text: `ab rund ${fmtEur(CARPORT.ladepunktDc)} je Lader, ohne Netzausbau` },
            { title: "Lastmanagement", text: "Solarstrom zuerst, Netzanschluss nicht überlasten" },
          ]}
          aside={
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: PlugZap, k: "Leitungsinfrastruktur", v: "jeder 3. Stellplatz", t: "Neubau Nichtwohngebäude, > 6 Stellplätze" },
                { icon: Zap, k: "Mindestens", v: "1 Ladepunkt", t: "Bestand Nichtwohngebäude, > 20 Stellplätze, seit 2025" },
                { icon: BatteryCharging, k: "Speicher", v: "optional", t: "mehr Eigenverbrauch, Lastspitzen kappen" },
                { icon: Sun, k: "Gleichzeitigkeit", v: "tagsüber", t: "wenn Fahrzeuge stehen und die Sonne scheint" },
              ].map((x) => (
                <div key={x.k} className="rounded-3xl bg-white/[0.05] p-5 ring-1 ring-white/10">
                  <x.icon aria-hidden="true" className="h-5 w-5 text-ov-300" />
                  <p className="mt-3 text-[12.5px] text-white/60">{x.k}</p>
                  <p className="font-display text-[20px] font-extrabold text-white">{x.v}</p>
                  <p className="mt-1 text-[12.5px] leading-snug text-white/60">{x.t}</p>
                </div>
              ))}
            </div>
          }
        />
      </Section>

      {/* ---------------- Modelle ---------------- */}
      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Finanzierung" title="Selbst investieren oder Strom kaufen." lead="Beide Wege führen zum Solarcarport – sie unterscheiden sich in Kapitalbindung, Risiko und Vorteil über die Laufzeit." align="center" className="mb-12" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal className="rounded-[2rem] bg-sand-50 p-7 ring-1 ring-ink-200/70 md:p-9">
            <CircleDollarSign aria-hidden="true" className="h-8 w-8 text-ov-600" />
            <h3 className="ov-h3 mt-5 text-ink-900">Kauf</h3>
            <p className="mt-3 text-[15.5px] leading-relaxed text-ink-600">
              Sie investieren, wir planen und bauen. Jede selbst genutzte Kilowattstunde spart den vollen Strompreis, der Überschuss wird eingespeist. Größter Vorteil über die Laufzeit,
              Abschreibung als Wirtschaftsgut.
            </p>
            <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-[14px] text-ink-700 ring-1 ring-ink-200/70">
              Beispiel 100 Stellplätze, 75 % Eigenverbrauch: Amortisation in rund <strong className="ov-num">{fmt(beispiel.kauf.amortisation, 0)} Jahren</strong>, Investition{" "}
              <strong className="ov-num">{fmtEur(Math.round(beispiel.invest.summe / 1000) * 1000)}</strong> inkl. Ladepunkte.
            </p>
          </Reveal>
          <Reveal delay={80} className="rounded-[2rem] bg-navy-950 p-7 text-white md:p-9">
            <Handshake aria-hidden="true" className="h-8 w-8 text-ov-300" />
            <h3 className="ov-h3 mt-5 text-white">Contracting / PPA</h3>
            <p className="mt-3 text-[15.5px] leading-relaxed text-white/70">
              Wir bauen, finanzieren und betreiben. Sie kaufen den Solarstrom vor Ort zu einem festen Preis über {CARPORT.contractingJahre} Jahre – ohne eigenes Kapital, ohne
              Betriebsaufwand. Danach kann die Anlage an Sie übergehen.
            </p>
            <p className="mt-5 rounded-2xl bg-white/[0.06] px-4 py-3 text-[14px] text-white/80 ring-1 ring-white/10">
              Im Beispiel liegt der kostendeckende Solarstrompreis bei rund <strong className="ov-num text-white">{fmt(beispiel.contracting.preisCt, 1)} ct/kWh</strong> – je höher Ihr Eigenverbrauch,
              desto günstiger.
            </p>
          </Reveal>
        </div>
        <div className="mt-8 flex justify-center">
          <Link href="/rechner/solarcarport" className="group inline-flex items-center gap-2 rounded-full bg-ov-50 px-5 py-3 text-[15px] font-semibold text-ov-800 ring-1 ring-ov-200 hover:bg-ov-100">
            <Calculator aria-hidden="true" className="h-4 w-4" /> Mit Ihren Zahlen rechnen <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Section>

      {/* ---------------- Ablauf ---------------- */}
      <Section tone="sand" space="lg">
        <SectionHeading eyebrow="Ablauf" title="Vom Lageplan zum Solarcarport" align="center" className="mb-14" />
        <Steps
          items={[
            { icon: Car, title: "Lageplan & Verbrauch", text: "Stellplätze, Fahrgassen, Leitungen, Lastgang und Ladebedarf – daraus ergeben sich Größe und Layout." },
            { icon: Calculator, title: "Konzept & Angebot", text: "Bauart, Statik, Ladepunkte und Netzanschluss; Kauf und Contracting als Varianten." },
            { icon: Warehouse, title: "Genehmigung & Netz", text: "Baugenehmigung, wo nötig, Anmeldung beim Netzbetreiber, Abstimmung mit Brandschutz und Versicherung." },
            { icon: Zap, title: "Bau & Betrieb", text: "Montage abschnittsweise, damit der Parkplatz nutzbar bleibt; danach Monitoring und Wartung." },
          ]}
        />
      </Section>

      {/* ---------------- Anfrage ---------------- */}
      <Section tone="white" space="lg" id="anfrage">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading eyebrow="Anfrage" title="Ihr Parkplatz, unser Konzept." lead="Ein paar Angaben genügen für eine erste Einschätzung. Lageplan und Lastgang können Sie später im Portal hochladen." />
          <div className="rounded-[2rem] bg-sand-50 p-6 ring-1 ring-ink-200/70 md:p-8">
            <AuswahlAnfrage
              typ="carport"
              felder={["firma", "telefon", "plz", "ort", "nachricht"]}
              button="Carport anfragen"
              gruppen={[
                { id: "stellplaetze", legende: "Stellplätze", optionen: [{ id: "bis50", label: "bis 50" }, { id: "50-150", label: "50–150" }, { id: "150-500", label: "150–500" }, { id: "ueber500", label: "über 500" }], start: "50-150" },
                { id: "art", legende: "Sie sind", optionen: [{ id: "unternehmen", label: "Unternehmen" }, { id: "handel", label: "Handel" }, { id: "kommune", label: "Kommune" }, { id: "sonstige", label: "Sonstige" }] },
                { id: "modell", legende: "Interesse an", optionen: [{ id: "offen", label: "Noch offen" }, { id: "kauf", label: "Kauf" }, { id: "contracting", label: "Contracting" }] },
                { id: "laden", legende: "Ladepunkte", mehrfach: true, optionen: [{ id: "ac", label: "AC" }, { id: "dc", label: "DC-Schnellladen" }], start: ["ac"] },
              ]}
            />
          </div>
        </div>
      </Section>

      {/* ---------------- FAQ ---------------- */}
      <Section tone="sand" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Solarcarports – gut zu wissen" />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/rechner/solarcarport", titel: "Carport-Rechner", text: "Leistung, Ertrag, Investition und Amortisation – Kauf vs. Contracting." },
          { href: "/reststrom", titel: "Reststrom-Pool", text: "Den Strom, den Sie trotz Carport noch kaufen, gebündelt günstiger beziehen." },
          { href: "/ratgeber/parkplatz-solarpflicht-bundeslaender", titel: "Ratgeber Solarpflicht", text: "Alle Bundesländer mit Rechtsgrundlage, Stichtag und Ausnahmen." },
          { href: "/grossspeicher", titel: "Speicher", text: "Mehr Eigenverbrauch und Lastspitzen kappen – vom Gewerbe- bis zum Großspeicher." },
        ]}
      />

      <CtaBand
        eyebrow="Solarcarport"
        title="Schatten für Autos, Strom für den Betrieb."
        text="Wir prüfen Ihren Parkplatz, rechnen Kauf und Contracting und planen Ladepunkte passend zum Netzanschluss – aus einer Hand."
        primary={{ label: "Carport anfragen", href: "#anfrage" }}
        secondary={{ label: "Carport-Rechner", href: "/rechner/solarcarport" }}
      />
    </div>
  );
}

/* Kleine Bauart-Skizzen */
const STAHL = "#394050";
const MODUL = "#1f5aa1";
function BauartEinzel() {
  return (
    <svg viewBox="0 0 240 120" className="h-auto w-full" aria-hidden="true">
      <rect x="0" y="104" width="240" height="4" rx="2" fill="#dfe3ea" />
      <rect x="62" y="44" width="6" height="60" fill={STAHL} />
      <rect x="172" y="36" width="6" height="68" fill={STAHL} />
      <path d="M40 48 L200 34 L200 40 L40 54 Z" fill={MODUL} />
      <rect x="90" y="80" width="60" height="22" rx="8" fill="#97a0b0" />
    </svg>
  );
}
function BauartReihe() {
  return (
    <svg viewBox="0 0 240 120" className="h-auto w-full" aria-hidden="true">
      <rect x="0" y="104" width="240" height="4" rx="2" fill="#dfe3ea" />
      {[20, 120, 220].map((x) => (
        <rect key={x} x={x - 3} y="40" width="6" height="64" fill={STAHL} />
      ))}
      <path d="M8 46 L232 30 L232 36 L8 52 Z" fill={MODUL} />
      {[30, 90, 150].map((x) => (
        <rect key={x} x={x} y="82" width="52" height="20" rx="7" fill={x === 90 ? "#669933" : "#97a0b0"} />
      ))}
    </svg>
  );
}
function BauartSchmetterling() {
  return (
    <svg viewBox="0 0 240 120" className="h-auto w-full" aria-hidden="true">
      <rect x="0" y="104" width="240" height="4" rx="2" fill="#dfe3ea" />
      <rect x="117" y="46" width="6" height="58" fill={STAHL} />
      <path d="M14 30 L120 46 L120 52 L14 36 Z" fill={MODUL} />
      <path d="M226 30 L120 46 L120 52 L226 36 Z" fill="#0b4488" />
      <rect x="30" y="82" width="56" height="20" rx="7" fill="#97a0b0" />
      <rect x="154" y="82" width="56" height="20" rx="7" fill="#669933" />
    </svg>
  );
}
