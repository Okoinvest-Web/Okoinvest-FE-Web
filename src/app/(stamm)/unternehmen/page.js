import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarClock, Factory, Globe2, Hammer, Landmark, Scale, Sun, TrendingUp, Users } from "lucide-react";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import CountUp from "@/components/ui/CountUp";
import { cn } from "@/components/ui/cn";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import GruppenGrafik from "@/components/Unternehmen/GruppenGrafik";
import Zeitleiste from "@/components/Unternehmen/Zeitleiste";
import Zeitachse from "@/components/Unternehmen/Zeitachse";
import NachtHero from "@/components/Unternehmen/NachtHero";
import Faktenleiste from "@/components/Unternehmen/Faktenleiste";
import FirmenBuehne from "@/components/Unternehmen/FirmenBuehne";
import DauerDiagramm from "@/components/Unternehmen/DauerDiagramm";
import { MEILENSTEINE, PERSONEN, WERTE } from "@/components/Unternehmen/daten";
import { GESELLSCHAFT, KENNZAHLEN, SITE, abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { pfad as seitenPfad } from "@/lib/land";

const PFAD = "/unternehmen";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Über ÖkoInvest – Teil der ÖKOVOLT Gruppe | ÖkoInvest",
  description:
    "ÖkoInvest aus Ostermiething: Projektentwicklung für Freiflächen-PV, Agri-PV und Speicher in der ÖKOVOLT Gruppe, die seit 2012 eigene Solarparks betreibt.",
  keywords: ["ÖkoInvest GmbH", "ÖKOVOLT Gruppe", "Projektentwickler Photovoltaik", "Ostermiething", "Solarpark Entwickler Österreich Deutschland"],
});

const ICONS = { Factory, Scale, Hammer, Users };

/** Was ÖkoInvest in der Gruppe übernimmt – Reihenfolge wie im Lead */
const AUFGABEN = [
  { nr: "01", titel: "Flächen sichern", text: "Eigentümer, Lage, Netz und Restriktionen prüfen" },
  { nr: "02", titel: "Planungsrecht erreichen", text: "Gemeinde, Gutachten, Bebauungsplan oder Widmung" },
  { nr: "03", titel: "Netzanschluss klären", text: "Netzanfrage und Zusage beim Netzbetreiber" },
  { nr: "04", titel: "Finanzieren & vermarkten", text: "Investoren, Vergütung oder Stromliefervertrag" },
];

/** Geschäftsfelder mit eigener Seite */
const FELDER = [
  { icon: Sun, titel: "Projektentwicklung", text: "Freiflächen-PV, Agri-PV, Solarcarports und Großspeicher", href: seitenPfad("/freiflaeche") },
  { icon: Scale, titel: "Contracting & PPA", text: "Solarstrom zum Festpreis über Stromlieferverträge", href: seitenPfad("/rechner/ppa") },
  { icon: Globe2, titel: "Projektbörse", text: "Für Investoren und Projektanbieter im DACH-Raum", href: "/projektboerse" },
  { icon: Factory, titel: "Virtuelles Kraftwerk", text: "Reststrom-Pool für die Unternehmenskunden der Gruppe", href: seitenPfad("/virtuelles-kraftwerk") },
];

const QUERVERWEISE = [
  { href: seitenPfad("/prozess"), titel: "Projektprozess", text: "Von der Anfrage bis zum Betrieb – Schritte, Dauer, Dokumente." },
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
      <JsonLd daten={schema} />

      <NachtHero
        mitLeiste
        breadcrumbs={[{ name: "Über ÖkoInvest" }]}
        hinweis={{ label: "Gruppe", text: "Teil der ÖKOVOLT Gruppe – seit 2010 im Solargeschäft", kurz: "Teil der ÖKOVOLT Gruppe", href: "#gruppe" }}
        title={
          <>
            Wir entwickeln Kraftwerke, <span className="ov-text-gradient-light">die wir selbst betreiben würden.</span>
          </>
        }
        lead={
          <>
            <span className="font-medium text-white">ÖkoInvest ist die Projektgesellschaft der ÖKOVOLT Gruppe.</span> Aus Ostermiething entwickeln wir Solarparks, Agri-PV, Solarcarports und Speicher im DACH-Raum – mit der Erfahrung einer Gruppe, die seit 2010 Solaranlagen baut und seit 2012 eigene Parks betreibt.
          </>
        }
        actions={[
          { label: "Kontakt aufnehmen", href: "/kontakt" },
          { label: "Geschichte ansehen", href: "#geschichte" },
        ]}
        chips={["Familiengeführt, seit 2010 im Solargeschäft", "Eigene Solarparks seit 2012", "Eigene Rammtechnik in der Gruppe", "Deutschland, Österreich, Schweiz"]}
        buehne={<FirmenBuehne />}
      />

      <Faktenleiste
        titel="Die Gruppe in Zahlen"
        items={[
          { icon: CalendarClock, wert: "2010", label: "Gegründet", text: "ÖKOVOLT GmbH in Türkheim – Planung und Bau aus einer Hand" },
          { icon: Sun, wert: "2012", label: "Eigene Solarparks", text: "seither selbst betrieben – über eigene Betreibergesellschaften" },
          { icon: TrendingUp, wert: `~${KENNZAHLEN.entwicklungMwProJahr}`, einheit: "MWp", label: "pro Jahr", text: "gehen neu in die Entwicklung" },
          { icon: Globe2, wert: String(KENNZAHLEN.maerkte.length), label: "Märkte", text: "Deutschland, Österreich und die Schweiz" },
        ]}
      />

      {/* Rolle in der Gruppe */}
      <Section tone="white" space="lg" id="gruppe" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <SectionHeading
            eyebrow="Rolle in der Gruppe"
            title={
              <>
                Die Gruppe baut auf Dächern. <span className="ov-text-gradient">Wir entwickeln auf der Fläche.</span>
              </>
            }
            lead="Die ÖKOVOLT-Gesellschaften in Deutschland und Österreich planen und bauen Photovoltaik und Speicher für Gewerbe, Industrie, Kommunen und Landwirtschaft. ÖkoInvest übernimmt den Teil, der Jahre dauert."
          />
          <Reveal delay={80} className="self-end">
            <p className="ov-overline text-ink-500">Unser Teil der Arbeit</p>
            <ol className="mt-4 grid gap-px overflow-hidden rounded-3xl bg-ink-200/70 ring-1 ring-ink-200/70 sm:grid-cols-2">
              {AUFGABEN.map((a) => (
                <li key={a.nr} className="bg-white p-5">
                  <span className="ov-num font-display text-[13px] font-extrabold text-ov-600">{a.nr}</span>
                  <p className="mt-1.5 font-display text-[16.5px] font-bold leading-snug text-ink-900">{a.titel}</p>
                  <p className="mt-1 text-[14px] leading-snug text-ink-600">{a.text}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>

        <Reveal className="mt-12 md:mt-16">
          <GruppenGrafik />
        </Reveal>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2 md:mt-8 lg:grid-cols-4">
          {FELDER.map((f, i) => (
            <Reveal as="li" key={f.titel} delay={i * 50} className="flex">
              <Link
                href={f.href}
                className="group flex w-full items-start gap-4 rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 transition-colors hover:bg-white hover:ring-ov-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
              >
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ov-600 ring-1 ring-ink-200 transition-colors group-hover:bg-ov-600 group-hover:text-white group-hover:ring-transparent">
                  <f.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 font-display text-[16px] font-bold text-ink-900">
                    {f.titel}
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400 transition-colors group-hover:text-ov-600" />
                  </span>
                  <span className="mt-1 block text-[14px] leading-snug text-ink-600">{f.text}</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* Geschichte */}
      <Section tone="navy" space="lg" id="geschichte" className="ov-verlauf-nacht scroll-mt-24 overflow-clip">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0 opacity-60" />
        <div className="relative grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading
              dark
              eyebrow="Geschichte"
              title="Von der ersten Anlage zum eigenen Solarpark"
              lead="Was uns unterscheidet, ist nicht die Planung – sondern dass die Gruppe ihre frühen Solarparks bis heute selbst betreibt."
            />
            <Reveal delay={80} className="mt-10">
              <Zeitachse marken={MEILENSTEINE.map((m) => Number(m.jahr)).filter(Boolean)} />
            </Reveal>
          </div>
          <Zeitleiste items={MEILENSTEINE} />
        </div>
      </Section>

      {/* Geschäftsführung */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Geschäftsführung"
          title="Die Menschen hinter ÖkoInvest"
          lead="Zwei Geschäftsführer, beide seit vielen Jahren in der ÖKOVOLT Gruppe – vom Bau bis zum Vertrieb."
          className="mb-10 md:mb-14"
        />
        <div className="grid gap-5 md:grid-cols-2">
          {PERSONEN.map((p, i) => (
            <Reveal key={p.name} delay={i * 80} className="ov-flaeche relative flex flex-col gap-6 overflow-hidden p-6 sm:flex-row sm:items-start md:p-8">
              <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-ov-100/70 blur-3xl" />
              <span
                aria-hidden="true"
                className="ov-verlauf-nacht relative flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl font-display text-[32px] font-extrabold tracking-tight shadow-e3 ring-4 ring-ov-100"
              >
                <span className="ov-text-gradient-light">{p.initialen}</span>
              </span>
              <div className="relative">
                <h3 className="font-display text-[22px] font-bold leading-tight text-ink-900">{p.name}</h3>
                <p className="mt-2 inline-flex rounded-full bg-ov-50 px-2.5 py-0.5 text-[13px] font-semibold text-ov-700 ring-1 ring-ov-200">{p.rolle}</p>
                <p className="mt-4 text-[15.5px] leading-relaxed text-ink-600">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Pipeline */}
      <Section tone="sand" space="lg">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Pipeline"
              title="Ehrlich über Zeit"
              lead="Bis aus einer gesicherten Fläche ein baureifes Projekt wird, vergehen in der Regel mehrere Jahre: Planungsrecht, Netzanschluss und Vermarktung brauchen Zeit, und nicht jedes Projekt erreicht die Baureife. Deshalb nennen wir keine Fertigstellungszahlen, die wir nicht belegen können."
            />
            <Reveal delay={60} className="mt-8 flex items-center gap-5 rounded-3xl bg-white p-5 shadow-e2 ring-1 ring-ink-200/70 sm:p-6">
              <span aria-hidden="true" className="ov-verlauf-gruen flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white">
                <TrendingUp className="h-6 w-6" />
              </span>
              <div>
                <p className="ov-kpi-l text-ink-900">
                  <CountUp value={KENNZAHLEN.entwicklungMwProJahr} prefix="~" />
                  <span className="ov-einheit">MWp</span>
                </p>
                <p className="mt-1.5 text-[14.5px] text-ink-600">gehen pro Jahr neu in die Entwicklung – Flächen, die gesichert und geprüft werden</p>
              </div>
            </Reveal>
            <Link href={seitenPfad("/prozess")} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded text-[15px] font-semibold text-ov-700 hover:text-ov-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
              Alle Schritte im Projektprozess
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <Reveal dir="right">
            <DauerDiagramm />
          </Reveal>
        </div>
      </Section>

      {/* Werte */}
      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Werte" title="Wofür wir stehen" className="mb-10 md:mb-14" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WERTE.map((w, i) => {
            const Icon = ICONS[w.icon];
            const hell = i !== 0;
            return (
              <Reveal
                as="li"
                key={w.title}
                delay={i * 60}
                className={cn("relative flex flex-col overflow-hidden rounded-3xl p-6 md:p-7", hell ? "bg-sand-50 ring-1 ring-ink-200/60" : "ov-verlauf-nacht text-white")}
              >
                <span aria-hidden="true" className={cn("ov-num absolute right-5 top-4 font-display text-[44px] font-extrabold leading-none tracking-tight", hell ? "text-ink-900/[0.06]" : "text-white/10")}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span aria-hidden="true" className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", hell ? "bg-white text-ov-600 ring-1 ring-ink-200" : "bg-white/10 text-ov-300 ring-1 ring-white/15")}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className={cn("mt-6 font-display text-[18px] font-bold leading-snug", hell ? "text-ink-900" : "text-white")}>{w.title}</h3>
                <p className={cn("mt-2 text-[14.5px] leading-relaxed", hell ? "text-ink-600" : "text-white/75")}>{w.text}</p>
              </Reveal>
            );
          })}
        </ul>
      </Section>

      {/* Register */}
      <Section tone="sand" space="lg" id="register" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading eyebrow="Registerangaben" title="Gesellschaft & Beteiligungen" lead="Alle Angaben sind im österreichischen Firmenbuch öffentlich abrufbar.">
            <Link href="/impressum" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded text-[14.5px] font-semibold text-ov-700 hover:text-ov-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
              <Landmark aria-hidden="true" className="h-4 w-4" />
              Weitere Pflichtangaben im Impressum
            </Link>
          </SectionHeading>
          <div className="space-y-4">
            <Reveal className="overflow-hidden rounded-3xl bg-white shadow-e2 ring-1 ring-ink-200/70">
              <div className="flex items-center justify-between gap-4 border-b border-ink-100 bg-ink-50/60 px-6 py-4 md:px-8">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-700">
                  <Landmark aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600" />
                  Auszug · {GESELLSCHAFT.gericht}
                </p>
                <span className="ov-num hidden shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[12px] font-semibold text-ink-600 ring-1 ring-ink-200 sm:inline">{GESELLSCHAFT.register}</span>
              </div>
              <dl className="divide-y divide-ink-100 px-6 md:px-8">
                {register.map(([k, v]) => (
                  <div key={k} className="grid gap-1 py-3.5 text-[15px] sm:grid-cols-[190px_1fr] sm:gap-4">
                    <dt className="text-ink-500">{k}</dt>
                    <dd className="font-medium text-ink-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              {GESELLSCHAFT.beteiligungen.map((b, i) => (
                <Reveal key={b.name} delay={i * 70} className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/70">
                  <div className="flex items-center justify-between gap-3">
                    <p className="ov-overline text-ov-700">Beteiligung</p>
                    <span className="ov-num rounded-full bg-ov-50 px-2.5 py-0.5 text-[13px] font-bold text-ov-700 ring-1 ring-ov-200">{b.anteil}</span>
                  </div>
                  <h3 className="mt-3 font-display text-[18px] font-bold text-ink-900">{b.name}</h3>
                  <p className="ov-num mt-1 text-[13.5px] text-ink-500">{b.register}</p>
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
        secondary={{ label: "Projektprozess ansehen", href: seitenPfad("/prozess") }}
      />
    </div>
  );
}
