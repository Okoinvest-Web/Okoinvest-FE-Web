import { BadgePercent, Coins, Eye, EyeOff, FileSignature, Filter, FolderLock, Globe2, KeyRound, Languages, Layers, Lock, Search, ShieldCheck, UserPlus } from "lucide-react";

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import JsonLd from "@/components/JsonLd";
import EnCta from "@/components/En/EnCta";
import EnHero, { Haken } from "@/components/En/EnHero";
import { PHASE_EN } from "@/components/En/PhaseModel";
import { BoersenBuehne, RisikoBalken } from "@/components/En/Buehnen";
import { Ablauf, FaktenLeiste } from "@/components/En/Teile";
import { enMetadata, fmtEn } from "@/components/En/sprachpaare";
import { SITE, abs } from "@/data/site";
import { PHASEN, PROVISION } from "@/lib/invest/markt";

const PFAD = "/en/project-exchange";
const SPANNE = `${fmtEn(PROVISION.verkaeufer.min * 100, 1)}–${fmtEn(PROVISION.verkaeufer.max * 100)}%`;
const BESCHREIBUNG =
  "Solar parks, agri-PV, car park PV and battery storage in DACH: listings checked for plausibility, every stage, one-click NDA, data room – free for investors, the seller pays the fee.";

export const metadata = enMetadata({
  pfad: PFAD,
  title: "Solar project exchange DACH: buy & sell | ÖkoInvest",
  description: BESCHREIBUNG,
  keywords: ["solar project marketplace", "buy solar projects Germany", "sell PV project rights", "solar M&A DACH", "battery storage projects Germany"],
  bild: { src: "/img/solarpark-reihen.jpg", alt: "Rows of modules in a solar park" },
});

const FILTER = [
  ["Technology", ["PV", "Agri-PV", "Car park PV", "Storage"]],
  ["Country", ["Germany", "Austria", "Switzerland"]],
  ["Development stage", [`${PHASEN.length} stages`]],
  ["Capacity", ["Range in MWp"]],
];

const FAQ = [
  {
    q: "What does the project exchange cost?",
    a: `For investors it is free of charge (search profile, NDA, data room). Sellers pay a success fee of ${SPANNE} of the purchase price, only on successful closing – no listing or data room fees.`,
  },
  {
    q: "Why can't I see the exact location?",
    a: "In public we only show region, federal state or canton and key data. Municipality, plots, grid operator and documents are visible to registered investors only after they have accepted the NDA and the back office has released the data room. This protects landowners and sellers.",
  },
  {
    q: "How are projects reviewed?",
    a: "Before publication, the back office checks the information and core documents for completeness and plausibility – such as land security, zoning status and grid connection. This does not replace a legal and technical due diligence, which remains the buyer's responsibility.",
  },
  {
    q: "Which stages are listed?",
    a: `We distinguish ${PHASEN.length} stages – from “${PHASE_EN[PHASEN[0].id].label}” to “${PHASE_EN[PHASEN[PHASEN.length - 1].id].label}”. The further a project has been developed, the lower the risk and the higher the price per kWp.`,
  },
  {
    q: "Is the exchange available in English?",
    a: "The listings and the portal are currently in German. Key figures (capacity, stage, country, region) are self-explanatory; for questions on a specific listing, contact us in English and quote the listing title.",
  },
];

export default function EnProjectExchange() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "ÖkoInvest project exchange",
    serviceType: "Marketplace for solar and storage project rights and operating assets",
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: ["DE", "AT", "CH"],
    url: abs(PFAD),
    inLanguage: "en",
    description: BESCHREIBUNG,
  };

  return (
    <div>
      <JsonLd daten={schema} />

      <EnHero
        pill={{ tag: "DACH", label: "Ground-mounted PV, agri-PV, car park PV and storage", kurz: "PV, agri-PV, car park PV, storage", href: "#listings" }}
        title={
          <>
            Buy and sell solar projects&nbsp;– <span className="ov-text-gradient-light">pre-checked and confidential.</span>
          </>
        }
        lead={
          <>
            <span className="font-medium text-white">Germany, Austria and Switzerland</span> – from secured land to operating assets. Public as an anonymous teaser, details only after NDA.
          </>
        }
        actions={[
          { label: "Open the exchange", href: "/projektboerse", hrefLang: "de" },
          { label: "Register as investor", href: "/registrieren?rolle=investor" },
        ]}
        note="Listings and filters are currently in German · key figures are self-explanatory"
        chips={["Free for investors", `Sellers: ${SPANNE} success fee`, "NDA in one click", "Logged data room"]}
        visual={<BoersenBuehne />}
        caption="Example view with fictional values"
      />

      <FaktenLeiste
        titel="The exchange at a glance"
        items={[
          { icon: ShieldCheck, wert: "€0", einheit: "for investors", text: "search profile, watch list, NDA and data room" },
          { icon: BadgePercent, wert: SPANNE, einheit: "success fee", text: "paid by the seller, only on closing" },
          { icon: Layers, wert: String(PHASEN.length), einheit: "stages", text: "from secured land to operating asset" },
          { icon: Globe2, wert: "3", einheit: "countries covered", text: "listings from Germany, Austria and Switzerland can be offered" },
        ]}
      />

      {/* ---------------- What is listed ---------------- */}
      <Section tone="white" space="lg" id="listings" className="scroll-mt-24">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <SectionHeading
            eyebrow="What you find"
            title="Projects from our own development – and from other developers."
            lead="The exchange lists projects developed by the ÖKOVOLT Group as well as projects offered by third-party developers. All listings go through the same completeness and plausibility check before publication."
          >
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/projektboerse" hrefLang="de" pfeil>
                Browse listings
              </Button>
              <Button href="/en/investors#phases" variant="secondary">
                Phase model & prices
              </Button>
            </div>
            <p className="mt-4 flex items-center gap-2 text-[13.5px] text-ink-500">
              <Languages aria-hidden="true" className="h-4 w-4 text-ov-600" /> Listings and filters are currently in German.
            </p>
          </SectionHeading>

          <Reveal dir="right" className="min-w-0 overflow-hidden rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70">
            <div className="border-b border-ink-100 bg-sand-50/70 p-5 sm:p-6">
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-700">
                <Filter aria-hidden="true" className="h-3.5 w-3.5" /> Filter by
              </p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {FILTER.map(([k, werte]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-[12.5px] font-semibold text-ink-800">{k}</dt>
                    <dd className="mt-2 flex flex-wrap gap-1.5">
                      {werte.map((w) => (
                        <span key={w} className="rounded-full bg-white px-2.5 py-1 text-[12.5px] font-medium text-ink-700 ring-1 ring-ink-200">{w}</span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="p-5 sm:p-6">
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-700">
                <Search aria-hidden="true" className="h-3.5 w-3.5" /> Development stages
              </p>
              <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                {PHASEN.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl bg-sand-50 px-3 py-2.5 ring-1 ring-ink-100">
                    <span className={i === PHASEN.length - 1 ? "ov-num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-950 text-[12px] font-extrabold text-ov-300" : "ov-num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[12px] font-extrabold text-ov-700 ring-1 ring-ov-200"}>
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink-800">{PHASE_EN[p.id].kurz}</span>
                    <RisikoBalken risiko={p.risiko} className="shrink-0" />
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[12.5px] text-ink-500">Bars indicate development risk – the further developed, the lower the risk and the higher the price per kWp.</p>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ---------------- Public vs. NDA ---------------- */}
      <Section tone="sand" space="lg">
        <SectionHeading
          align="center"
          eyebrow="Confidential by design"
          title="What is public – and what opens after the NDA."
          lead="This protects landowners and sellers, and gives investors a clear picture before they commit time."
          className="mb-12"
        />
        <div className="relative mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
          <Reveal className="rounded-[1.6rem] bg-white p-6 ring-1 ring-ink-200/70 md:p-8">
            <p className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200"><Eye aria-hidden="true" className="h-5 w-5" /></span>
              <span>
                <span className="block text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-700">Public</span>
                <span className="block font-display text-[19px] font-bold text-ink-900">Anonymous teaser</span>
              </span>
            </p>
            <ul className="mt-6 space-y-3 text-[15px] text-ink-700">
              {["Technology and capacity", "Development stage", "Region, federal state or canton", "Key data and price indication"].map((t) => (
                <li key={t} className="flex gap-3"><Haken /><span className="min-w-0">{t}</span></li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={90} className="ov-verlauf-nacht ov-noise relative overflow-hidden rounded-[1.6rem] p-6 text-white ring-1 ring-white/10 md:p-8">
            <p className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-ov-300 ring-1 ring-white/15"><KeyRound aria-hidden="true" className="h-5 w-5" /></span>
              <span>
                <span className="block text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-300">After NDA & release</span>
                <span className="block font-display text-[19px] font-bold text-white">Data room</span>
              </span>
            </p>
            <ul className="relative mt-6 space-y-3 text-[15px] text-white/80">
              {["Municipality and plots", "Grid operator and grid connection commitment", "Lease agreements, planning documents, expert reports", "Q&A – every access logged"].map((t) => (
                <li key={t} className="flex gap-3"><Haken dunkel /><span className="min-w-0">{t}</span></li>
              ))}
            </ul>
          </Reveal>
          <span aria-hidden="true" className="absolute left-1/2 top-1/2 z-10 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ov-600 text-white shadow-e4 ring-[6px] ring-sand-50 md:flex">
            <Lock className="h-5 w-5" />
          </span>
        </div>
      </Section>

      {/* ---------------- Process ---------------- */}
      <Section tone="white" space="lg">
        <SectionHeading eyebrow="How it works" title="From teaser to closing – all in the portal" lead="One consistent, traceable process for both sides. Every step is logged." className="mb-12" />
        <Ablauf
          cols={4}
          items={[
            { icon: UserPlus, title: "Register & search profile", text: "Free investor account with size, stages, countries and ticket. Matching projects are shown to you first." },
            { icon: Search, title: "Review the teaser", text: "Key data, stage, grid connection and price indication – anonymous, without exact location." },
            { icon: KeyRound, title: "One-click NDA", text: "Accept the non-disclosure agreement in the portal. After release, the data room opens." },
            { icon: FileSignature, title: "LOI & closing", text: "Submit a letter of intent digitally, due diligence, SPA – supported by the back office." },
          ]}
        />
      </Section>

      {/* ---------------- Both sides ---------------- */}
      <Section tone="sand" space="lg" id="both-sides" className="scroll-mt-24">
        <SectionHeading align="center" eyebrow="Two sides, one set of rules" title="Choose your side." className="mb-12" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal className="flex flex-col rounded-[2rem] bg-white p-8 shadow-e3 ring-1 ring-ink-200/70 md:p-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-50 text-ov-600 ring-1 ring-ov-200"><ShieldCheck aria-hidden="true" className="h-6 w-6" /></span>
            <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-700">For investors</p>
            <h2 className="ov-h3 mt-1 text-ink-900">Free of charge</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-600">Search profile, watch list, NDA and data room are free for investors. You see projects from the ÖKOVOLT Group’s development and from other developers.</p>
            <ul className="mt-5 flex-1 space-y-2.5 text-[15px] text-ink-700">
              <li className="flex gap-2.5"><FolderLock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" /> Data room with download log</li>
              <li className="flex gap-2.5"><Search aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" /> Matching by search profile</li>
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button href="/registrieren?rolle=investor" pfeil>Create investor account</Button>
              <Button href="/en/investors" variant="secondary">For investors</Button>
            </div>
          </Reveal>
          <Reveal delay={100} className="ov-verlauf-nacht ov-noise relative flex flex-col overflow-hidden rounded-[2rem] p-8 text-white ring-1 ring-white/10 md:p-10">
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-ov-300 ring-1 ring-white/15"><BadgePercent aria-hidden="true" className="h-6 w-6" /></span>
            <p className="relative mt-6 text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-300">For developers</p>
            <h2 className="ov-h3 relative mt-1 text-white">Fee only on success</h2>
            <p className="relative mt-3 text-[16px] leading-relaxed text-white/70">List, get reviewed, market confidentially. The success fee is {SPANNE} of the purchase price, only on closing – no listing fees.</p>
            <ul className="relative mt-5 flex-1 space-y-2.5 text-[15px] text-white/80">
              <li className="flex gap-2.5"><Coins aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" /> Transparent statistics: views, watch-list saves, NDA requests</li>
              <li className="flex gap-2.5"><EyeOff aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" /> Anonymous teaser, data room only after NDA</li>
            </ul>
            <div className="relative mt-8">
              <Button href="/en/sell-your-project" variant="white" pfeil>Sell your project</Button>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <SectionHeading eyebrow="FAQ" title="Project exchange: the essentials" lead="Questions about a specific listing? Write to us in English and quote the listing title.">
            <Button href="/en/contact" variant="secondary" className="mt-8" pfeil>
              Contact the team
            </Button>
          </SectionHeading>
          <Faq items={FAQ} />
        </div>
      </Section>

      <EnCta
        eyebrow="Project exchange"
        title="The right project not listed yet?"
        text="Set up a search profile. New projects matching your criteria appear in your portal first."
        primary={{ label: "Create search profile", href: "/registrieren?rolle=investor" }}
        secondary={{ label: "Open the exchange", href: "/projektboerse" }}
      />
    </div>
  );
}
