import Link from "next/link";
import { ArrowUpRight, BatteryCharging, Building2, Car, Handshake, Hammer, Layers, LineChart, Search, Sprout, Sun, Tag, TrendingUp } from "lucide-react";

import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import FeatureGrid from "@/components/ui/FeatureGrid";
import Reveal from "@/components/ui/Reveal";
import CountUp from "@/components/ui/CountUp";
import Querverweise from "@/components/Reusable/Querverweise";
import EnCta from "@/components/En/EnCta";
import { enMetadata } from "@/components/En/sprachpaare";
import { GESELLSCHAFT, KENNZAHLEN, SITE, abs } from "@/data/site";

const PFAD = "/en";

export const metadata = enMetadata({
  pfad: PFAD,
  title: "Solar project development & exchange DACH | ÖkoInvest",
  description:
    "ÖkoInvest develops ground-mounted PV, agri-PV and storage in Germany, Austria and Switzerland – with a project exchange and co-development for investors.",
  keywords: ["solar project developer Germany", "buy solar projects DACH", "PV project rights Austria", "co-development solar", "RTB solar Germany"],
});

const schema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${abs(PFAD)}/#webpage`,
  url: abs(PFAD),
  name: "ÖkoInvest – solar project development in the DACH region",
  inLanguage: "en",
  isPartOf: { "@id": `${SITE.url}/#website` },
  about: { "@id": `${SITE.url}/#organization` },
};

const FAKTEN = [
  ["Company", GESELLSCHAFT.name],
  ["Registered office", `${GESELLSCHAFT.sitz}, ${GESELLSCHAFT.plz} ${GESELLSCHAFT.ort}, Austria`],
  ["Company register", `${GESELLSCHAFT.register}, Regional Court of Ried im Innkreis`],
  ["Registered", "10 September 2020"],
  ["Managing directors", GESELLSCHAFT.geschaeftsfuehrung.join(", ")],
  ["Group", "ÖKOVOLT Group – parent company in Türkheim, Bavaria (since 2010)"],
];

const MAERKTE = [
  {
    land: "Germany",
    code: "DE",
    punkte: [
      "Revenues via EEG tenders (Federal Network Agency), PPAs or a combination",
      "Planning law usually via a project-specific zoning plan (B-Plan); privileged corridor of 200 m along motorways and double-track railways under § 35 BauGB",
      "Municipal participation of up to 0.2 ct/kWh under § 6 EEG",
    ],
  },
  {
    land: "Austria",
    code: "AT",
    punkte: [
      "Support under the Renewable Energy Expansion Act (EAG): market premium or investment grants",
      "Zoning as ‘Grünland-Photovoltaik’ – rules differ by federal state",
      "Environmental impact assessment required above certain sizes and in sensitive areas",
    ],
  },
  {
    land: "Switzerland",
    code: "CH",
    punkte: [
      "One-off remuneration (Einmalvergütung) as investment support for PV installations",
      "‘Solarexpress’ framework for large alpine installations",
      "Self-consumption models (ZEV/vZEV) and local electricity communities (LEG) since 2026",
    ],
  },
];

export default function EnStart() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <PageHero
        variant="immersive"
        eyebrow="ÖkoInvest · Part of the ÖKOVOLT Group"
        title={
          <>
            Solar projects in the DACH region – <span className="ov-text-gradient-light">developed by an operator.</span>
          </>
        }
        lead="We develop ground-mounted PV, agri-PV, car park PV and battery storage in Germany, Austria and Switzerland – and run a project exchange where investors and developers meet. Backed by a group that has been operating its own solar parks since 2012."
        image={{ src: "/img/solarpark-himmel.jpg", alt: "Solar park under a blue sky" }}
        actions={[
          { label: "For investors", href: "/en/investors" },
          { label: "Project exchange", href: "/en/project-exchange", icon: Search },
        ]}
        stats={[
          { value: 15, suffix: "+", label: `years in solar (group, since ${KENNZAHLEN.erfahrungSeit})` },
          { value: KENNZAHLEN.entwicklungMwProJahr, prefix: "~", suffix: " MWp", label: "enter development every year" },
          { value: KENNZAHLEN.maerkte.length, label: "markets: DE, AT, CH" },
        ]}
      />

      {/* ---------------- Who we are ---------------- */}
      <Section tone="white" space="lg">
        <div className="grid items-start gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <SectionHeading
            eyebrow="Who we are"
            title="The development company of a group that builds – and keeps – solar parks."
            lead="ÖkoInvest GmbH is based in Ostermiething, Upper Austria, and belongs to the family-owned ÖKOVOLT Group. The group companies in Germany and Austria plan and build PV and storage for commercial, industrial, municipal and agricultural clients. ÖkoInvest takes on the part that takes years: securing land, obtaining planning permission and grid connection, financing and marketing projects."
          >
            <ul className="mt-8 space-y-3 text-[15.5px] leading-relaxed text-ink-700">
              {[
                "Own solar parks in operation since 2012 – each with its own operating company",
                "Own pile-driving company (Deutsche Solar & Rammtechnik GmbH) for ground-mounted foundations",
                "Austrian sister company: 30 MWp of PV installed in 2021 alone",
                "Development, construction and operation within one group",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" />
                  {t}
                </li>
              ))}
            </ul>
          </SectionHeading>
          <Reveal dir="right" className="rounded-[2rem] bg-sand-50 p-6 ring-1 ring-ink-200/70 md:p-8">
            <p className="flex items-center gap-2 font-display text-[18px] font-bold text-ink-900">
              <Building2 aria-hidden="true" className="h-5 w-5 text-ov-600" /> Key facts
            </p>
            <dl className="mt-4 divide-y divide-ink-200/70">
              {FAKTEN.map(([k, v]) => (
                <div key={k} className="grid gap-1 py-3 text-[15px] sm:grid-cols-[160px_1fr] sm:gap-4">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="font-medium text-ink-900">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[13.5px] text-ink-500">
              Verified track record of the group:{" "}
              <Link href="/referenzen" hrefLang="de" className="font-semibold text-ov-700 underline underline-offset-2">
                references (in German)
              </Link>
            </p>
          </Reveal>
        </div>
      </Section>

      {/* ---------------- Pipeline ---------------- */}
      <Section tone="green" space="lg">
        <div className="grid items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-16">
          <Reveal dir="scale" className="rounded-[2rem] bg-white p-8 text-center shadow-xl ring-1 ring-ov-200 md:p-10">
            <TrendingUp aria-hidden="true" className="mx-auto h-8 w-8 text-ov-600" />
            <p className="mt-4 font-display text-[clamp(3rem,2.4rem+2.6vw,4.5rem)] font-extrabold leading-none tracking-tight text-ink-900">
              <CountUp value={KENNZAHLEN.entwicklungMwProJahr} prefix="~" suffix=" MWp" />
            </p>
            <p className="mt-3 text-[15px] text-ink-600">enter development every year</p>
          </Reveal>
          <SectionHeading
            eyebrow="Pipeline – honestly"
            title="Capacity in development, not capacity ready to build."
            lead={`Every year, around ${KENNZAHLEN.entwicklungMwProJahr} MWp of new capacity enters our development pipeline – sites that are secured and screened. Reaching ready-to-build (RTB) status typically takes two to three years: zoning, grid connection and the route to market take time, and not every project makes it. That is why we do not publish completion figures we cannot back up.`}
          />
        </div>
      </Section>

      {/* ---------------- What we offer ---------------- */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="What we offer"
          title="Four ways to work with us."
          lead="Whether you buy, sell or co-develop: one team, transparent terms, a digital data room – and a group that knows how solar parks perform over fifteen years."
          className="mb-12"
        />
        <FeatureGrid
          cols={4}
          items={[
            { icon: LineChart, title: "Buy projects", text: "Project rights from secured land to RTB, plus operating assets – free of charge for buyers.", href: "/en/investors" },
            { icon: Layers, title: "Project exchange", text: "Vetted listings across the DACH region. Anonymous teaser in public, details after NDA.", href: "/en/project-exchange" },
            { icon: Handshake, title: "Co-development", text: "Enter early, co-fund development costs with milestone payments, secure a right of first refusal at RTB.", href: "/en/investors#co-development" },
            { icon: Tag, title: "Sell your project", text: "List your project confidentially. Success fee only on closing, no listing fees.", href: "/en/sell-your-project" },
          ]}
        />
      </Section>

      {/* ---------------- Technologies ---------------- */}
      <Section tone="sand" space="lg">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <SectionHeading
            eyebrow="Asset classes"
            title="Utility-scale PV, agri-PV, car park PV and storage."
            lead="We develop projects where land, grid and planning law fit together – and we say early when they do not."
          />
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Sun, t: "Ground-mounted PV", x: "Utility-scale solar parks on arable or conversion land, typically from a few MWp upwards." },
              { icon: Sprout, t: "Agri-PV", x: "Dual land use in line with DIN SPEC 91434 – farming continues under or between the modules." },
              { icon: Car, t: "Car park PV", x: "Solar carports on large car parks, often combined with EV charging and on-site consumption." },
              { icon: BatteryCharging, t: "Battery storage", x: "Co-located with a solar park at the same grid connection, or stand-alone at grid nodes." },
            ].map((k, i) => (
              <Reveal as="li" key={k.t} delay={i * 60} className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/70">
                <k.icon aria-hidden="true" className="h-6 w-6 text-ov-600" />
                <h3 className="mt-4 font-display text-[18px] font-bold text-ink-900">{k.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{k.x}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      {/* ---------------- Markets ---------------- */}
      <Section tone="navy" space="lg" className="overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div className="relative">
          <SectionHeading
            dark
            align="center"
            eyebrow="Three markets, three frameworks"
            title="Germany, Austria, Switzerland."
            lead="The DACH project market is international – the rules are not. A short orientation; details always depend on the individual project and current legislation."
            className="mb-12"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {MAERKTE.map((m, i) => (
              <Reveal key={m.code} delay={i * 80} className="rounded-3xl bg-white/[0.04] p-6 ring-1 ring-white/10 md:p-8">
                <p className="flex items-center gap-3">
                  <span className="rounded-md bg-white/10 px-2 py-1 font-display text-[13px] font-extrabold text-ov-300">{m.code}</span>
                  <span className="font-display text-[20px] font-bold text-white">{m.land}</span>
                </p>
                <ul className="mt-5 space-y-3 text-[15px] leading-relaxed text-white/75">
                  {m.punkte.map((p) => (
                    <li key={p} className="flex gap-3">
                      <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-400" />
                      {p}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-center text-[13px] text-white/50">Orientation only, as of 2026 – not legal or tax advice.</p>
        </div>
      </Section>

      {/* ---------------- Group ---------------- */}
      <Section tone="white" space="md">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { href: "/en/contact", icon: Handshake, titel: "Talk to the team", text: "Send us your search profile, a project or a question – in English." },
            { href: "/referenzen", icon: Hammer, titel: "Track record of the group", text: "Own solar parks since 2012, register data and sources (page in German).", de: true },
          ].map((t) => (
            <Link key={t.href} href={t.href} hrefLang={t.de ? "de" : undefined} className="group ov-card-hover flex items-start gap-5 rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/70 md:p-8">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-ov-600 ring-1 ring-ink-200 transition-colors group-hover:bg-ov-500 group-hover:text-white">
                <t.icon aria-hidden="true" className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3 font-display text-[20px] font-bold text-ink-900">
                  {t.titel}
                  <ArrowUpRight aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-300 transition-colors group-hover:text-ov-600" />
                </span>
                <span className="mt-2 block text-[15px] leading-relaxed text-ink-600">{t.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Querverweise
        ueberschrift="Continue reading"
        items={[
          { href: "/en/investors", titel: "For investors", text: "Phase model with price ranges, due diligence and the process to closing." },
          { href: "/en/project-exchange", titel: "Project exchange", text: "How listings, NDA and data room work – for buyers and sellers." },
          { href: "/en/sell-your-project", titel: "Sell your project", text: "Confidential marketing with a success fee only on closing." },
        ]}
      />

      <EnCta />
    </div>
  );
}
