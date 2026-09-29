import { BadgePercent, Coins, EyeOff, FileSignature, FolderLock, KeyRound, Languages, Search, ShieldCheck, UserPlus, Filter } from "lucide-react";

import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Steps from "@/components/ui/Steps";
import Faq from "@/components/ui/Faq";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import EnCta from "@/components/En/EnCta";
import { PHASE_EN } from "@/components/En/PhaseModel";
import { enMetadata, fmtEn } from "@/components/En/sprachpaare";
import { SITE, abs } from "@/data/site";
import { PHASEN, PROVISION } from "@/lib/invest/markt";

const PFAD = "/en/project-exchange";
const SPANNE = `${fmtEn(PROVISION.verkaeufer.min * 100, 1)}–${fmtEn(PROVISION.verkaeufer.max * 100)}%`;
const BESCHREIBUNG =
  "Solar parks, agri-PV, car park PV and battery storage in DACH: vetted projects at every stage, one-click NDA, digital data room – free for investors.";

export const metadata = enMetadata({
  pfad: PFAD,
  title: "Solar project exchange DACH: buy & sell | ÖkoInvest",
  description: BESCHREIBUNG,
  keywords: ["solar project marketplace", "buy solar projects Germany", "sell PV project rights", "solar M&A DACH", "battery storage projects Germany"],
  bild: { src: "/img/solarpark-reihen.jpg", alt: "Rows of modules in a solar park" },
});

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <PageHero
        variant="dark"
        eyebrow="Project exchange DACH"
        title={
          <>
            Buy and sell solar projects – <span className="ov-text-gradient-light">vetted and confidential.</span>
          </>
        }
        lead="Ground-mounted PV, agri-PV, car park PV and battery storage in Germany, Austria and Switzerland – from secured land to operating assets. Public as an anonymous teaser, details only after NDA."
        actions={[
          { label: "Open the exchange", href: "/projektboerse" },
          { label: "Register as investor", href: "/registrieren?rolle=investor" },
        ]}
        points={["Free for investors", `Sellers: ${SPANNE} success fee`, "NDA in one click", "Logged data room"]}
      />

      {/* ---------------- What is listed ---------------- */}
      <Section tone="white" space="lg">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionHeading
            eyebrow="What you find"
            title="Projects from our own development – and from other developers."
            lead="The exchange lists projects developed by the ÖKOVOLT Group as well as projects offered by third-party developers. All listings go through the same review before publication."
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Reveal className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/70">
              <Filter aria-hidden="true" className="h-6 w-6 text-ov-600" />
              <h3 className="mt-4 font-display text-[18px] font-bold text-ink-900">Filter by</h3>
              <ul className="mt-3 space-y-2 text-[15px] text-ink-700">
                {["Technology: PV, agri-PV, car park PV, storage", "Country: Germany, Austria, Switzerland", "Development stage", "Capacity in MWp"].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" />
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={80} className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/70">
              <Search aria-hidden="true" className="h-6 w-6 text-ov-600" />
              <h3 className="mt-4 font-display text-[18px] font-bold text-ink-900">Stages</h3>
              <ol className="mt-3 space-y-2 text-[15px] text-ink-700">
                {PHASEN.map((p, i) => (
                  <li key={p.id} className="flex gap-2.5">
                    <span className="ov-num w-5 shrink-0 font-semibold text-ov-700">{i + 1}</span>
                    {PHASE_EN[p.id].kurz}
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* ---------------- Process ---------------- */}
      <Section tone="sand" space="lg">
        <SectionHeading eyebrow="How it works" title="From teaser to closing – all in the portal" lead="One consistent, traceable process for both sides. Every step is logged." />
        <Steps
          className="mt-12"
          items={[
            { icon: UserPlus, title: "Register & search profile", text: "Free investor account with size, stages, countries and ticket. Matching projects are shown to you first." },
            { icon: Search, title: "Review the teaser", text: "Key data, stage, grid connection and price indication – anonymous, without exact location." },
            { icon: KeyRound, title: "One-click NDA", text: "Accept the non-disclosure agreement in the portal. After release, the data room opens." },
            { icon: FileSignature, title: "LOI & closing", text: "Submit a letter of intent digitally, due diligence, SPA – supported by the back office." },
          ]}
        />
      </Section>

      {/* ---------------- Both sides ---------------- */}
      <Section tone="ink" space="lg">
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal className="rounded-[2rem] bg-white p-8 ring-1 ring-ink-200/70 md:p-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-50 text-ov-600"><ShieldCheck aria-hidden="true" className="h-6 w-6" /></span>
            <h2 className="ov-h3 mt-6 text-ink-900">For investors: free of charge</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-600">Search profile, watch list, NDA and data room are free for investors. You see projects from the ÖKOVOLT Group’s development and from other developers.</p>
            <ul className="mt-5 space-y-2 text-[15px] text-ink-700">
              <li className="flex gap-2"><FolderLock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" /> Data room with download log</li>
              <li className="flex gap-2"><Search aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" /> Matching by search profile</li>
            </ul>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button href="/registrieren?rolle=investor" pfeil>Create investor account</Button>
              <Button href="/en/investors" variant="secondary">For investors</Button>
            </div>
          </Reveal>
          <Reveal delay={100} className="ov-noise relative overflow-hidden rounded-[2rem] bg-navy-950 p-8 text-white md:p-10">
            <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-ov-500/30 blur-[90px]" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-ov-300"><BadgePercent aria-hidden="true" className="h-6 w-6" /></span>
            <h2 className="ov-h3 relative mt-6 text-white">For developers: fee only on success</h2>
            <p className="relative mt-3 text-[16px] leading-relaxed text-white/70">List, get reviewed, market confidentially. The success fee is {SPANNE} of the purchase price, only on closing – no listing fees.</p>
            <ul className="relative mt-5 space-y-2 text-[15px] text-white/80">
              <li className="flex gap-2"><Coins aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" /> Transparent statistics: views, watch-list saves, NDA requests</li>
              <li className="flex gap-2"><EyeOff aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" /> Anonymous teaser, data room only after NDA</li>
            </ul>
            <Button href="/en/sell-your-project" variant="white" className="relative mt-7" pfeil>Sell your project</Button>
          </Reveal>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading eyebrow="FAQ" title="Project exchange: the essentials" />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        ueberschrift="Continue reading"
        items={[
          { href: "/en/investors", titel: "For investors", text: "Phase model with price ranges, due diligence checklist and process to closing." },
          { href: "/en/sell-your-project", titel: "Sell your project", text: "What we review before publication and how the success fee works." },
          { href: "/en/contact", titel: "Contact", text: "Questions about a listing? Write to us in English." },
        ]}
      />

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
