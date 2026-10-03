import Link from "next/link";
import { ArrowUpRight, BadgeCheck, BatteryCharging, Building2, CalendarClock, Car, Globe2, Handshake, Layers, LineChart, Sprout, Sun, Tag, TrendingUp } from "lucide-react";

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import JsonLd from "@/components/JsonLd";
import CountUp from "@/components/ui/CountUp";
import EnCta from "@/components/En/EnCta";
import EnHero, { Haken } from "@/components/En/EnHero";
import { RtbZeitachse, StartBuehne } from "@/components/En/Buehnen";
import { FaktenLeiste, Wegweiser } from "@/components/En/Teile";
import { AgriPvFeld, Grossspeicher, Solarcarport, SolarparkLandschaft } from "@/components/illustrationen";
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
      "Among others, one-off remuneration (Einmalvergütung) as investment support for PV installations",
      // Source: BFE, large-scale PV (Art. 71a EnG) – partial grid feed-in by 31 Dec 2025 was required; legal confirmation before publication
      "‘Solarexpress’ for large alpine installations required partial grid feed-in by end of 2025 – no longer open to new projects",
      "Self-consumption models (ZEV/vZEV) and local electricity communities (LEG) since 2026",
    ],
  },
];

const KLASSEN = [
  { Motiv: SolarparkLandschaft, icon: Sun, t: "Ground-mounted PV", x: "Utility-scale solar parks on arable or conversion land, typically from a few MWp upwards." },
  { Motiv: AgriPvFeld, icon: Sprout, t: "Agri-PV", x: "Dual land use in line with DIN SPEC 91434 – farming continues under or between the modules." },
  { Motiv: Solarcarport, icon: Car, t: "Car park PV", x: "Solar carports on large car parks, often combined with EV charging and on-site consumption." },
  { Motiv: Grossspeicher, icon: BatteryCharging, t: "Battery storage", x: "Co-located with a solar park at the same grid connection, or stand-alone at grid nodes." },
];

export default function EnStart() {
  return (
    <div>
      <JsonLd daten={schema} />

      <EnHero
        pill={{ tag: "Group", label: `Part of the ÖKOVOLT Group – in solar since ${KENNZAHLEN.erfahrungSeit}`, kurz: "Part of the ÖKOVOLT Group", href: "#who-we-are" }}
        title={
          <>
            Solar projects in the DACH region&nbsp;– <span className="ov-text-gradient-light">developed by an operator.</span>
          </>
        }
        lead={
          <>
            <span className="font-medium text-white">Ground-mounted PV, agri-PV, car park PV and battery storage</span> in Germany, Austria and Switzerland – plus a project exchange where investors and developers meet. Backed by a group that has been operating its own solar parks since 2012.
          </>
        }
        actions={[
          { label: "For investors", href: "/en/investors" },
          { label: "Project exchange", href: "/en/project-exchange" },
        ]}
        note="Free of charge for investors · enquiries in English welcome"
        chips={["Project rights from secured land to RTB", "Operating assets and co-development", "Anonymous teaser, details after NDA", "Development, construction, operation in one group"]}
        visual={<StartBuehne />}
        caption="Market ranges from our phase model (DACH 2025/26) · teaser card with fictional values"
      />

      <FaktenLeiste
        titel="The group in figures"
        items={[
          { icon: CalendarClock, wert: "15+", einheit: "years in solar", text: `ÖKOVOLT Group, building solar plants since ${KENNZAHLEN.erfahrungSeit}` },
          { icon: TrendingUp, wert: `~${KENNZAHLEN.entwicklungMwProJahr}`, einheit: "MWp per year", text: "of new capacity enter our development pipeline" },
          { icon: Globe2, wert: String(KENNZAHLEN.maerkte.length), einheit: "markets", text: "Germany, Austria and Switzerland" },
          { icon: BadgeCheck, wert: "€0", einheit: "for buyers", text: "search profile, NDA and data room free of charge" },
        ]}
      />

      {/* ---------------- Ways to work with us ---------------- */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="What we offer"
          title="Four ways to work with us."
          lead="Whether you buy, sell or co-develop: one team, transparent terms, a digital data room – and a group that knows how solar parks perform over fifteen years."
        />
        <Wegweiser
          className="mt-12"
          items={[
            { href: "/en/investors", icon: LineChart, titel: "Buy projects", text: "Project rights from secured land to RTB, plus operating assets – free of charge for buyers.", label: "For investors", hervor: true },
            { href: "/en/project-exchange", icon: Layers, titel: "Project exchange", text: "Listings checked for completeness and plausibility. Anonymous teaser in public, details after NDA.", label: "How it works" },
            { href: "/en/investors#co-development", icon: Handshake, titel: "Co-development", text: "Enter early, co-fund development costs with milestone payments, secure a right of first refusal at RTB.", label: "Milestones & terms" },
            { href: "/en/sell-your-project", icon: Tag, titel: "Sell your project", text: "List your project confidentially. Success fee only on closing, no listing fees.", label: "For developers" },
          ]}
        />
      </Section>

      {/* ---------------- Who we are ---------------- */}
      <Section tone="sand" space="lg" id="who-we-are" className="scroll-mt-24">
        <div className="grid items-start gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <SectionHeading
            eyebrow="Who we are"
            title="The development company of a group that builds – and keeps – solar parks."
            lead="ÖkoInvest GmbH is based in Ostermiething, Upper Austria, and belongs to the family-owned ÖKOVOLT Group. The group companies in Germany and Austria plan and build PV and storage for commercial, industrial, municipal and agricultural clients. ÖkoInvest takes on the part that takes years: securing land, obtaining planning permission and grid connection, financing and marketing projects."
          >
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Own solar parks in operation since 2012 – each with its own operating company",
                "Own pile-driving company (Deutsche Solar & Rammtechnik GmbH) for ground-mounted foundations",
                "Austrian sister company: 30 MWp of PV installed in 2021 alone (company information)",
                "Development, construction and operation within one group",
              ].map((t) => (
                <li key={t} className="flex gap-3 rounded-2xl bg-white p-4 text-[15px] leading-relaxed text-ink-700 ring-1 ring-ink-200/70">
                  <Haken />
                  <span className="min-w-0">{t}</span>
                </li>
              ))}
            </ul>
          </SectionHeading>
          <Reveal dir="right" className="relative overflow-hidden rounded-[2rem] bg-white shadow-e3 ring-1 ring-ink-200/70">
            <div aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
            <div className="flex items-center gap-3 border-b border-ink-100 px-6 py-5 md:px-8">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200">
                <Building2 aria-hidden="true" className="h-5 w-5" />
              </span>
              <p className="font-display text-[18px] font-bold text-ink-900">Key facts</p>
            </div>
            <dl className="divide-y divide-ink-100 px-6 md:px-8">
              {FAKTEN.map(([k, v]) => (
                <div key={k} className="grid gap-1 py-3.5 text-[15px] sm:grid-cols-[150px_1fr] sm:gap-4">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="font-medium text-ink-900">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="flex items-center justify-between gap-3 border-t border-ink-100 bg-sand-50/70 px-6 py-4 text-[13.5px] text-ink-600 md:px-8">
              <span>
                Track record of the group with register sources:{" "}
                <Link href="/referenzen" hrefLang="de" className="font-semibold text-ov-700 underline underline-offset-2 hover:text-ov-800">
                  references (in German)
                </Link>
              </span>
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-300" />
            </p>
          </Reveal>
        </div>
      </Section>

      {/* ---------------- Pipeline ---------------- */}
      <Section tone="navy" space="lg" className="overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0 opacity-60" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-ov-500/20 blur-[120px]" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <SectionHeading
            dark
            eyebrow="Pipeline – honestly"
            title="Capacity in development, not capacity ready to build."
            lead={`Every year, around ${KENNZAHLEN.entwicklungMwProJahr} MWp of new capacity enters our development pipeline – sites that are secured and screened. Reaching ready-to-build (RTB) status typically takes two to three years: zoning, grid connection and the route to market take time, and not every project makes it. That is why we do not publish completion figures we cannot back up.`}
          />
          <div className="min-w-0">
            <Reveal dir="scale" className="mb-4 flex flex-wrap items-end gap-x-5 gap-y-2 rounded-[1.75rem] bg-white/[0.04] p-6 ring-1 ring-white/10 sm:p-7">
              <p className="ov-kpi-xl ov-num text-white">
                <CountUp value={KENNZAHLEN.entwicklungMwProJahr} prefix="~" />
                <span className="ov-einheit text-ov-300">MWp</span>
              </p>
              <p className="pb-2 text-[14.5px] leading-snug text-white/70">enter development every year – secured and screened sites</p>
            </Reveal>
            <Reveal delay={80}>
              <RtbZeitachse dunkel />
            </Reveal>
          </div>
        </div>
      </Section>

      {/* ---------------- Asset classes ---------------- */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Asset classes"
          title="Utility-scale PV, agri-PV, car park PV and storage."
          lead="We develop projects where land, grid and planning law fit together – and we say early when they do not."
          className="mb-12"
        />
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {KLASSEN.map((k, i) => (
            <Reveal as="li" key={k.t} delay={i * 60} className="flex flex-col overflow-hidden rounded-[1.6rem] bg-white ring-1 ring-ink-200/80">
              <div aria-hidden="true" className="relative isolate aspect-[16/10] overflow-hidden bg-sand-50">
                <div className="ov-grid-bg-light absolute inset-0 -z-10" />
                <div className="absolute inset-0 flex items-center justify-center p-[6%]">
                  <k.Motiv />
                </div>
              </div>
              <div className="flex flex-1 flex-col border-t border-ink-100 p-6">
                <h3 className="flex items-center gap-2.5 font-display text-[18px] font-bold text-ink-900">
                  <k.icon aria-hidden="true" className="h-5 w-5 text-ov-600" /> {k.t}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{k.x}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* ---------------- Markets ---------------- */}
      <Section tone="sand" space="lg">
        <SectionHeading
          align="center"
          eyebrow="Three markets, three frameworks"
          title="Germany, Austria, Switzerland."
          lead="The DACH project market is international – the rules are not. A short orientation; details always depend on the individual project and current legislation."
          className="mb-12"
        />
        <div className="grid gap-4 md:grid-cols-3">
          {MAERKTE.map((m, i) => (
            <Reveal key={m.code} delay={i * 80} className="relative overflow-hidden rounded-[1.6rem] bg-white p-6 shadow-e2 ring-1 ring-ink-200/70 md:p-8">
              <span aria-hidden="true" className="pointer-events-none absolute -right-2 -top-5 font-display text-[104px] font-extrabold leading-none tracking-tighter text-sand-100">{m.code}</span>
              <p className="relative flex items-center gap-3">
                <span className="rounded-lg bg-navy-950 px-2.5 py-1 font-display text-[13px] font-extrabold tracking-[0.08em] text-ov-300">{m.code}</span>
                <span className="font-display text-[21px] font-bold text-ink-900">{m.land}</span>
              </p>
              <ul className="relative mt-6 space-y-3.5 text-[15px] leading-relaxed text-ink-700">
                {m.punkte.map((p) => (
                  <li key={p} className="flex gap-3">
                    <Haken />
                    <span className="min-w-0">{p}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-[13px] text-ink-500">Orientation only, as of 2026 – not legal or tax advice.</p>
      </Section>

      <EnCta />
    </div>
  );
}

