import { Factory, Hammer, Scale, Users, Landmark, TrendingUp } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import FeatureGrid from "@/components/ui/FeatureGrid";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import CountUp from "@/components/ui/CountUp";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import GruppenGrafik from "@/components/Unternehmen/GruppenGrafik";
import Zeitleiste from "@/components/Unternehmen/Zeitleiste";
import { MEILENSTEINE, PERSONEN, WERTE } from "@/components/Unternehmen/daten";
import { GESELLSCHAFT, KENNZAHLEN, SITE, abs } from "@/data/site";

const PFAD = "/unternehmen";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Über ÖkoInvest – Teil der ÖKOVOLT Gruppe | ÖkoInvest",
  description:
    "ÖkoInvest GmbH aus Ostermiething: Projektentwicklung für Freiflächen-PV, Agri-PV und Speicher in der ÖKOVOLT Gruppe, die seit 2012 eigene Solarparks betreibt.",
  keywords: ["ÖkoInvest GmbH", "ÖKOVOLT Gruppe", "Projektentwickler Photovoltaik", "Ostermiething", "Solarpark Entwickler Österreich Deutschland"],
});

const ICONS = { Factory, Scale, Hammer, Users };

const QUERVERWEISE = [
  { href: "/prozess", titel: "Projektprozess", text: "Von der Anfrage bis zum Betrieb – Schritte, Dauer, Dokumente." },
  { href: "/projektboerse", titel: "Projektbörse", text: "Projekte in allen Phasen für Investoren im DACH-Raum." },
  { href: "/kontakt", titel: "Kontakt", text: "Anfrage an das Projektteam in Ostermiething." },
];

const schema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": `${abs(PFAD)}/#webpage`,
  url: abs(PFAD),
  name: "Über ÖkoInvest",
  isPartOf: { "@id": `${abs("/")}/#website` },
  mainEntity: {
    "@type": "Organization",
    "@id": `${abs("/")}/#organization`,
    name: SITE.name,
    legalName: GESELLSCHAFT.name,
    url: abs("/"),
    foundingDate: "2020-09-10",
    description: GESELLSCHAFT.gegenstand,
    address: {
      "@type": "PostalAddress",
      streetAddress: GESELLSCHAFT.sitz,
      postalCode: GESELLSCHAFT.plz,
      addressLocality: GESELLSCHAFT.ort,
      addressCountry: "AT",
    },
    identifier: { "@type": "PropertyValue", propertyID: "Firmenbuchnummer", value: GESELLSCHAFT.register },
    employee: GESELLSCHAFT.geschaeftsfuehrung.map((n) => ({ "@type": "Person", name: n, jobTitle: "Geschäftsführer" })),
    parentOrganization: { "@type": "Organization", name: SITE.gruppe, url: SITE.gruppeUrl },
    subOrganization: GESELLSCHAFT.beteiligungen.map((b) => ({ "@type": "Organization", name: b.name })),
    areaServed: KENNZAHLEN.maerkte.map((m) => ({ "@type": "Country", name: m })),
  },
};

export default function UnternehmenPage() {
  const register = [
    ["Firma", GESELLSCHAFT.name],
    ["Sitz", `${GESELLSCHAFT.sitz}, ${GESELLSCHAFT.plz} ${GESELLSCHAFT.ort}, ${GESELLSCHAFT.land}`],
    ["Firmenbuch", GESELLSCHAFT.register],
    ["Firmenbuchgericht", GESELLSCHAFT.gericht],
    ["Eingetragen", GESELLSCHAFT.eingetragen],
    ["Geschäftsführung", GESELLSCHAFT.geschaeftsfuehrung.join(", ")],
    ["UID-Nummer", GESELLSCHAFT.uid],
    ["Unternehmensgegenstand", GESELLSCHAFT.gegenstand],
  ].filter(([, v]) => v);

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <PageHero
        breadcrumbs={[{ name: "Über ÖkoInvest" }]}
        eyebrow="Unternehmen · Teil der ÖKOVOLT Gruppe"
        title={
          <>
            Wir entwickeln Kraftwerke, <span className="ov-text-gradient">die wir selbst betreiben würden.</span>
          </>
        }
        lead="ÖkoInvest ist die Projektgesellschaft der ÖKOVOLT Gruppe. Aus Ostermiething entwickeln wir Solarparks, Agri-PV, Solarcarports und Speicher im DACH-Raum – mit der Erfahrung einer Gruppe, die seit 2010 Solaranlagen baut und seit 2012 eigene Parks betreibt."
        image={{ src: "/img/firmensitz.jpg", alt: "Firmensitz der ÖKOVOLT Gruppe" }}
        stats={[
          { value: 15, suffix: "+", label: "Jahre Solargeschäft der Gruppe" },
          { value: KENNZAHLEN.maerkte.length, label: "Märkte: DE, AT, CH" },
          { value: KENNZAHLEN.entwicklungMwProJahr, suffix: " MWp", label: "neu in Entwicklung pro Jahr" },
        ]}
      />

      {/* Rolle in der Gruppe */}
      <Section tone="white" space="lg">
        <div className="grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Rolle in der Gruppe"
              title="Die Gruppe baut auf Dächern. Wir entwickeln auf der Fläche."
              lead="Die ÖKOVOLT-Gesellschaften in Deutschland und Österreich planen und bauen Photovoltaik und Speicher für Gewerbe, Industrie, Kommunen und Landwirtschaft. ÖkoInvest übernimmt den Teil, der Jahre dauert: Flächen sichern, Planungsrecht und Netzanschluss erreichen, Projekte finanzieren und vermarkten."
            />
            <ul className="mt-8 space-y-3 text-[15.5px] leading-relaxed text-ink-700">
              {[
                "Projektentwicklung für Freiflächen-PV, Agri-PV, Solarcarports und Großspeicher",
                "Contracting und Stromlieferverträge (PPA)",
                "Projektbörse für Investoren und Projektanbieter",
                "Virtuelles Kraftwerk und Reststrom-Pool für die Unternehmenskunden der Gruppe",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <Reveal dir="right">
            <GruppenGrafik />
          </Reveal>
        </div>
      </Section>

      {/* Geschichte */}
      <Section tone="navy" space="lg" className="overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -left-40 top-40 h-[460px] w-[460px] rounded-full bg-ov-500/20 blur-[130px]" />
        <div className="relative">
          <SectionHeading
            dark
            align="center"
            eyebrow="Geschichte"
            title="Von der ersten Anlage zum eigenen Solarpark"
            lead="Was uns unterscheidet, ist nicht die Planung – sondern dass die Gruppe ihre frühen Solarparks bis heute selbst betreibt."
            className="mb-14 md:mb-20"
          />
          <Zeitleiste items={MEILENSTEINE} />
        </div>
      </Section>

      {/* Geschäftsführung */}
      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Geschäftsführung" title="Die Menschen hinter ÖkoInvest" className="mb-10 md:mb-14" />
        <div className="grid gap-5 md:grid-cols-2">
          {PERSONEN.map((p, i) => (
            <Reveal key={p.name} delay={i * 80} className="flex flex-col gap-5 rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/70 sm:flex-row sm:items-start md:p-8">
              <span
                aria-hidden="true"
                className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-ov-100 to-sand-100 font-display text-[34px] font-extrabold text-ov-600 ring-1 ring-ov-200"
              >
                {p.initialen}
              </span>
              <div>
                <h3 className="font-display text-[22px] font-bold leading-tight text-ink-900">{p.name}</h3>
                <p className="mt-1 text-[14.5px] font-semibold text-ov-700">{p.rolle}</p>
                <p className="mt-3 text-[15.5px] leading-relaxed text-ink-600">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Pipeline */}
      <Section tone="green" space="lg">
        <div className="grid items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-16">
          <Reveal dir="scale" className="rounded-[2rem] bg-white p-8 text-center shadow-xl ring-1 ring-ov-200 md:p-10">
            <TrendingUp aria-hidden="true" className="mx-auto h-8 w-8 text-ov-600" />
            <p className="mt-4 font-display text-[clamp(3rem,2.4rem+2.6vw,4.5rem)] font-extrabold leading-none tracking-tight text-ink-900">
              <CountUp value={KENNZAHLEN.entwicklungMwProJahr} prefix="~" suffix=" MWp" />
            </p>
            <p className="mt-3 text-[15px] text-ink-600">gehen pro Jahr neu in die Entwicklung</p>
          </Reveal>
          <SectionHeading
            eyebrow="Pipeline"
            title="Ehrlich über Zeit"
            lead="Wir nehmen jedes Jahr rund 50 MWp neu in die Entwicklung – Flächen, die gesichert und geprüft werden. Bis daraus baureife Projekte werden, vergehen in der Regel mehrere Jahre: Planungsrecht, Netzanschluss und Vermarktung brauchen Zeit, und nicht jedes Projekt erreicht die Baureife. Deshalb nennen wir keine Fertigstellungszahlen, die wir nicht belegen können."
          />
        </div>
      </Section>

      {/* Werte */}
      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Werte" title="Wofür wir stehen" className="mb-10 md:mb-14" />
        <FeatureGrid items={WERTE.map((w) => ({ ...w, icon: ICONS[w.icon] }))} cols={4} />
      </Section>

      {/* Register */}
      <Section tone="sand" space="lg" id="register" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            eyebrow="Registerangaben"
            title="Gesellschaft & Beteiligungen"
            lead="Alle Angaben sind im österreichischen Firmenbuch öffentlich abrufbar."
          >
            <p className="mt-6 flex items-center gap-2 text-[14px] text-ink-500">
              <Landmark aria-hidden="true" className="h-4 w-4 text-ov-600" />
              Weitere Pflichtangaben im Impressum
            </p>
          </SectionHeading>
          <div className="space-y-5">
            <Reveal className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 md:p-8">
              <dl className="divide-y divide-ink-200/70">
                {register.map(([k, v]) => (
                  <div key={k} className="grid gap-1 py-3 text-[15px] sm:grid-cols-[180px_1fr] sm:gap-4">
                    <dt className="text-ink-500">{k}</dt>
                    <dd className="font-medium text-ink-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {GESELLSCHAFT.beteiligungen.map((b, i) => (
                <Reveal key={b.name} delay={i * 70} className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/70">
                  <p className="text-[12.5px] font-semibold uppercase tracking-[0.12em] text-ov-700">Beteiligung · {b.anteil}</p>
                  <h3 className="mt-2 font-display text-[18px] font-bold text-ink-900">{b.name}</h3>
                  <p className="mt-1 text-[14px] text-ink-500">{b.register}</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{b.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Querverweise items={QUERVERWEISE} />
      <CtaBand
        eyebrow="Zusammenarbeiten"
        title="Fläche, Projekt, Kapital oder Strombedarf? Sprechen wir darüber."
        primary={{ label: "Kontakt aufnehmen", href: "/kontakt" }}
        secondary={{ label: "Projektprozess ansehen", href: "/prozess" }}
      />
    </div>
  );
}
