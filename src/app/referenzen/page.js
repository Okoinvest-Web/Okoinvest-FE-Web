import Link from "next/link";
import { ArrowUpRight, Building2, FileCheck2, Gauge, Globe2, Hammer, HardHat, Landmark, LineChart, MapPin, PencilRuler, ScrollText, Sprout, Sun, Users, Zap, Handshake, Factory } from "lucide-react";

import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import DachKarte from "@/components/Referenzen/DachKarte";
import { BETRIEB_CHRONIK, KOMPETENZEN, PARKS, QUELLEN_REFERENZEN, REFERENZEN_STAND } from "@/data/referenzen";
import { KENNZAHLEN, SITE, abs } from "@/data/site";

const PFAD = "/referenzen";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Referenzen: seit 2012 eigene Solarparks | ÖkoInvest",
  description:
    "Belegt statt behauptet: Die ÖKOVOLT Gruppe betreibt eigene Solarparks in Irsingen, Artern und Tilleda seit 2012 – mit eigener Rammtechnik, Bau und Betrieb.",
  keywords: ["ÖKOVOLT Referenzen", "Solarpark Betreiber", "Solarpark Tilleda", "Solarpark Artern", "Solarpark Irsingen", "Rammtechnik Photovoltaik"],
});

const ICONS = { PencilRuler, HardHat, Hammer, Gauge, Zap, Globe2 };

const ZIELGRUPPEN = [
  {
    icon: Sprout,
    titel: "Flächeneigentümer & Landwirte",
    text: "Ihr Vertragspartner kennt Solarparks über ihre ganze Laufzeit – vom Rammen der Fundamente bis zum Wechselrichtertausch. Pachtverträge und Rückbau planen wir aus Betreibersicht.",
    href: "/flaeche-verpachten",
    link: "Fläche verpachten",
  },
  {
    icon: Landmark,
    titel: "Kommunen",
    text: "Parks mit eigener Betreibergesellschaft je Standort: klare Zuständigkeit für Gemeinde, Netzbetreiber und Behörden – auch Jahre nach der Inbetriebnahme.",
    href: "/kommunen",
    link: "Für Kommunen",
  },
  {
    icon: LineChart,
    titel: "Investoren",
    text: "Projekte aus einer Gruppe, die selbst Betreiber ist: Projektgesellschaften nach bewährter Struktur und auf Wunsch Bau aus der Gruppe – mit eigener Rammtechnik.",
    href: "/investoren",
    link: "Für Investoren",
  },
  {
    icon: Handshake,
    titel: "Projektentwickler",
    text: "Wer ein Projekt über die Börse anbietet, spricht mit Leuten, die Due Diligence aus Käufer- und Betreibersicht kennen – und wissen, welche Unterlagen fehlen.",
    href: "/projektboerse/anbieten",
    link: "Projekt anbieten",
  },
  {
    icon: Factory,
    titel: "Unternehmen",
    text: "Die Gruppe baut PV und Speicher für Gewerbe und Industrie. Den Reststrom bündeln wir über das virtuelle Kraftwerk – mit Erfahrung aus dem eigenen Parkbetrieb.",
    href: "/reststrom",
    link: "Reststrom-Pool",
  },
  {
    icon: Users,
    titel: "Bürger",
    text: "Beteiligung an Parks vor Ort über die Genossenschaft – entwickelt von einer Gruppe, die ihre eigenen Anlagen seit über einem Jahrzehnt selbst betreibt.",
    href: "/genossenschaft",
    link: "Zur Genossenschaft",
  },
];

const schema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${abs(PFAD)}/#webpage`,
  url: abs(PFAD),
  name: "Referenzen der ÖKOVOLT Gruppe",
  isPartOf: { "@id": `${abs("/")}/#website` },
  about: { "@id": `${SITE.url}/#organization` },
  mentions: PARKS.map((p) => ({
    "@type": "Organization",
    name: p.gesellschaft,
    address: { "@type": "PostalAddress", addressLocality: p.ort, addressRegion: p.region, addressCountry: "DE" },
  })),
};

function QuellenMarke({ ids }) {
  return (
    <span className="ml-1 inline-flex gap-1 align-super text-[10.5px] font-semibold text-ov-700">
      {ids.map((id) => (
        <a key={id} href={`#quelle-${id}`} className="rounded px-0.5 hover:bg-ov-50" aria-label={`Quelle ${id}`}>
          [{id}]
        </a>
      ))}
    </span>
  );
}

export default function ReferenzenSeite() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <PageHero
        breadcrumbs={[{ name: "Referenzen" }]}
        eyebrow="Referenzen & Vertrauen"
        title={
          <>
            Nicht versprochen. <span className="ov-text-gradient">Gebaut – und selbst betrieben.</span>
          </>
        }
        lead="Die ÖKOVOLT Gruppe baut seit 2010 Solaranlagen und betreibt seit 2012 eigene Solarparks. Auf dieser Seite steht nur, was sich belegen lässt – mit Register und Quelle."
        image={{ src: "/img/solarpark-reihen.jpg", alt: "Modulreihen eines Solarparks" }}
        badge={
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ov-600 text-white">
              <Sun aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-[16px] font-bold text-ink-900">Seit 2012 im Eigenbetrieb</p>
              <p className="text-[13px] text-ink-500">Je Park eine eigene Betreibergesellschaft</p>
            </div>
          </div>
        }
        stats={[
          { value: 15, suffix: "+", label: `Jahre Solargeschäft der Gruppe (seit ${KENNZAHLEN.gruppeGegruendet})` },
          { value: 30, suffix: " MWp", label: "errichtet von der AT-Schwester allein 2021" },
          { value: KENNZAHLEN.entwicklungMwProJahr, prefix: "~", suffix: " MWp", label: "gehen pro Jahr neu in Entwicklung" },
        ]}
      />

      {/* ---------------- Seit 2012 selbst betrieben ---------------- */}
      <Section tone="navy" space="lg" className="overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -right-40 top-20 h-[460px] w-[460px] rounded-full bg-ov-500/20 blur-[130px]" />
        <div className="relative grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <SectionHeading
            dark
            eyebrow="Seit 2012 selbst betrieben"
            title="Wir kennen Solarparks nicht nur vom Bau."
            lead="Die Gründer der Gruppe haben ihre ersten Solarparks nicht verkauft, sondern behalten. Sie werden bis heute in der Gruppe betrieben – über eine eigene Betreibergesellschaft je Park."
          >
            <p className="mt-6 text-[15.5px] leading-relaxed text-white/70">
              Daraus kommt das Wissen, das in der Entwicklung zählt: wie sich Ertrag, Wartung, Netzbetreiber und Vermarktung über zehn, zwölf, fünfzehn Jahre verhalten. Genau diese Erfahrung prüfen wir in jedem Projekt mit, das wir entwickeln oder über die Börse anbieten.
            </p>
          </SectionHeading>
          <ol className="relative space-y-4 before:absolute before:bottom-4 before:left-[27px] before:top-4 before:w-px before:bg-white/15">
            {BETRIEB_CHRONIK.map((c, i) => (
              <Reveal as="li" key={c.jahr} delay={i * 70} className="relative flex gap-5">
                <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ov-600 font-display text-[14px] font-extrabold text-white shadow-lg shadow-ov-900/40">
                  {c.jahr}
                </span>
                <div className="min-w-0 rounded-3xl bg-white/[0.04] p-5 ring-1 ring-white/10">
                  <h3 className="font-display text-[18px] font-bold text-white">{c.titel}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-white/70">{c.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </Section>

      {/* ---------------- Bestandsparks ---------------- */}
      <Section tone="sand" space="lg" id="parks" className="scroll-mt-24">
        <SectionHeading
          eyebrow="Bestandsparks"
          title="Jeder Park hat seine eigene Gesellschaft."
          lead="Jede Anlage wird über eine eigene GmbH & Co. KG betrieben – so lassen sich Finanzierung, Haftung und Betrieb je Park sauber trennen. Leistungsangaben nennen wir nur dort, wo sie öffentlich belegt sind."
          className="mb-12"
        />
        <ul className="grid gap-5 lg:grid-cols-3">
          {PARKS.map((p, i) => (
            <Reveal as="li" key={p.id} delay={i * 80} className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-50 text-ov-600">
                  <Sun aria-hidden="true" className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11.5px] font-semibold text-ink-600">{p.region}</span>
              </div>
              <h3 className="ov-h3 mt-6 text-ink-900">{p.name}</h3>
              <p className="mt-1.5 flex items-start gap-1.5 text-[14.5px] text-ink-600">
                <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
                {p.ort}
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-600">{p.text}</p>
              <dl className="mt-6 space-y-3 border-t border-ink-100 pt-5 text-[14.5px]">
                <div>
                  <dt className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-700">Betreibergesellschaft</dt>
                  <dd className="mt-0.5 font-medium text-ink-900">
                    {p.gesellschaft}
                    <QuellenMarke ids={["HR"]} />
                  </dd>
                  <dd className="text-[13.5px] text-ink-500">{p.register}</dd>
                </div>
                <div>
                  <dt className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-700">Im Betrieb der Gruppe</dt>
                  <dd className="mt-0.5 font-medium text-ink-900">
                    {p.seit}
                    <QuellenMarke ids={["U"]} />
                  </dd>
                </div>
                {p.eckdaten.map((e) => (
                  <div key={e.label}>
                    <dt className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-700">{e.label}</dt>
                    <dd className="mt-0.5 font-medium text-ink-900">
                      {e.wert}
                      <QuellenMarke ids={[e.quelle]} />
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          ))}
        </ul>
        <p className="mt-6 max-w-4xl text-[13.5px] leading-relaxed text-ink-500">
          Eigentum: Seit 2021 sind die Solarparks in der AWSM Beteiligung GmbH gebündelt, der Beteiligungsgesellschaft der Gründer Andreas Wegscheider und Susanne Messmer. Die ÖKOVOLT Solarstrom Betriebs GmbH führt als Komplementärin die Park-KGs. Die Parks sind kein Vermögen der ÖkoInvest GmbH.
        </p>
      </Section>

      {/* ---------------- Karte ---------------- */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="DACH-Raum"
          title="Von Türkheim und Ostermiething aus."
          lead="Die Muttergesellschaft sitzt im Allgäu, ÖkoInvest und die österreichische Schwester in Ostermiething im Innviertel. Die eigenen Parks liegen in Bayern, Thüringen und Sachsen-Anhalt."
          className="mb-12"
        />
        <Reveal>
          <DachKarte />
        </Reveal>
      </Section>

      {/* ---------------- Kompetenzen ---------------- */}
      <Section tone="green" space="lg">
        <SectionHeading
          eyebrow="Kompetenzen der Gruppe"
          title="Planung, Bau, Rammtechnik, Betrieb – in einer Gruppe."
          lead="Jede Kompetenz mit der Gesellschaft, die sie trägt. Was die Gruppe nicht selbst macht, sagen wir dazu."
          className="mb-12"
        />
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-5">
          {KOMPETENZEN.map((k, i) => {
            const Icon = ICONS[k.icon] || Building2;
            return (
              <Reveal as="li" key={k.titel} delay={i * 70} className="rounded-3xl bg-white p-7 ring-1 ring-ov-100 md:p-8">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-50 text-ov-600">
                  <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
                </span>
                <h3 className="ov-h3 mt-6 text-ink-900">{k.titel}</h3>
                <p className="mt-1 text-[13.5px] font-semibold text-ov-700">{k.gesellschaft}</p>
                <p className="mt-3 text-[15.5px] leading-relaxed text-ink-600">{k.text}</p>
              </Reveal>
            );
          })}
        </ul>
      </Section>

      {/* ---------------- Was das für Sie bedeutet ---------------- */}
      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Was das für Sie bedeutet" title="Betreibererfahrung – je nachdem, wer Sie sind." className="mb-12" />
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-5">
          {ZIELGRUPPEN.map((z, i) => (
            <Reveal as="li" key={z.titel} delay={i * 60} className="flex">
              <article className="group ov-card-hover relative flex w-full flex-col rounded-3xl bg-sand-50 p-7 ring-1 ring-ink-200/60 focus-within:ring-2 focus-within:ring-ov-500 hover:bg-white">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-ov-600 ring-1 ring-ink-200 transition-colors group-hover:bg-ov-500 group-hover:text-white group-hover:ring-ov-500">
                    <z.icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
                  </span>
                  <ArrowUpRight aria-hidden="true" className="h-5 w-5 text-ink-300 transition-colors group-hover:text-ov-600" />
                </div>
                <h3 className="ov-h3 mt-6 text-ink-900">{z.titel}</h3>
                <p className="mt-3 flex-1 text-[15.5px] leading-relaxed text-ink-600">{z.text}</p>
                <Link href={z.href} className="mt-5 text-[15px] font-semibold text-ov-700 outline-none after:absolute after:inset-0 after:rounded-3xl after:content-['']">
                  {z.link}
                </Link>
              </article>
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* ---------------- Quellen ---------------- */}
      <Section tone="sand" space="md" id="quellen" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading eyebrow="Quellen" title="Woher die Angaben stammen" lead={`Stand: ${REFERENZEN_STAND}. Kundenprojekte, Zitate oder Logos veröffentlichen wir nur mit Zustimmung der Kunden.`}>
            <p className="mt-6 text-[14px] leading-relaxed text-ink-500">
              <ScrollText aria-hidden="true" className="mr-2 inline h-4 w-4 align-[-3px] text-ov-600" />
              Registerangaben der ÖkoInvest GmbH: <Link href="/unternehmen#register" className="font-semibold text-ov-700 underline underline-offset-2">Über ÖkoInvest</Link>
            </p>
          </SectionHeading>
          <ol className="space-y-3">
            {QUELLEN_REFERENZEN.map((q) => (
              <li key={q.id} id={`quelle-${q.id}`} className="scroll-mt-28 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6">
                <p className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-md bg-ov-50 px-2 py-0.5 font-display text-[13px] font-extrabold text-ov-700">{q.id}</span>
                  <span className="min-w-0">
                    <a href={q.url} target="_blank" rel="noopener noreferrer" className="font-display text-[16px] font-bold text-ink-900 underline-offset-2 hover:text-ov-700 hover:underline">
                      {q.titel}
                    </a>
                    <span className="mt-1 block text-[14.5px] leading-relaxed text-ink-600">{q.text}</span>
                  </span>
                  <FileCheck2 aria-hidden="true" className="ml-auto mt-0.5 hidden h-5 w-5 shrink-0 text-ov-500 sm:block" />
                </p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/unternehmen", titel: "Über ÖkoInvest", text: "Rolle in der Gruppe, Geschäftsführung und Registerangaben." },
          { href: "/prozess", titel: "Projektprozess", text: "Von der Fläche bis zum Betrieb – Schritte, Dauer, Dokumente." },
          { href: "/projektboerse", titel: "Projektbörse", text: "Projekte in allen Phasen für Investoren im DACH-Raum." },
        ]}
      />

      <CtaBand
        eyebrow="Zusammenarbeiten"
        title="Mit einer Gruppe entwickeln, die selbst betreibt."
        text="Fläche, Projekt oder Kapital: Sprechen Sie mit uns – ehrliche Ersteinschätzung, fester Ansprechpartner, Status im Portal."
        primary={{ label: "Kontakt aufnehmen", href: "/kontakt" }}
        secondary={{ label: "Über ÖkoInvest", href: "/unternehmen" }}
      />
    </div>
  );
}
