import { BadgePercent, BatteryCharging, Building2, FileSignature, FolderLock, Handshake, Layers, LineChart, Scale, ShieldCheck, Sprout, TrendingUp, UserPlus, Users, Zap } from "lucide-react";

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import JsonLd from "@/components/JsonLd";
import EnCta from "@/components/En/EnCta";
import EnHero, { Haken } from "@/components/En/EnHero";
import PhaseModel, { PHASE_EN } from "@/components/En/PhaseModel";
import DdList, { DD_EN } from "@/components/En/DdList";
import ContactForm from "@/components/En/ContactForm";
import { PhasenLeiter, SuchprofilBuehne } from "@/components/En/Buehnen";
import { Ablauf, FaktenLeiste, LeistungsKarten, LinkKarte, SprungLeiste } from "@/components/En/Teile";
import { datumEn, enMetadata, fmtEn, fmtEurEn } from "@/components/En/sprachpaare";
import { KENNZAHLEN, SITE, abs } from "@/data/site";
import { ERLOESE, PHASEN, PROVISION, STAND } from "@/lib/invest/markt";

const PFAD = "/en/investors";
const BESCHREIBUNG =
  "Buy solar project rights, RTB solar parks and operating assets in Germany, Austria and Switzerland: phase model with prices, due diligence, data room – free.";

export const metadata = enMetadata({
  pfad: PFAD,
  title: "Buy solar projects in DACH: rights & RTB | ÖkoInvest",
  description: BESCHREIBUNG,
  keywords: ["buy solar park Germany", "solar project rights", "RTB solar project", "PV projects Austria investor", "co-development solar", "operating solar assets DACH"],
  bild: { src: "/img/investoren-vor-ort.jpg", alt: "Illustrative photo: visit to a solar park" }, // stock photo, not our own event (package D)
});

const rtb = PHASEN.find((p) => p.id === "rtb");
const BEISPIEL = { mwp: 20, preis: Math.round((rtb.preisProKwp.min + rtb.preisProKwp.max) / 2) };
const beispielKaufpreis = BEISPIEL.mwp * 1000 * BEISPIEL.preis;
const SPANNE = `${fmtEn(PROVISION.verkaeufer.min * 100, 1)}–${fmtEn(PROVISION.verkaeufer.max * 100)}%`;

const FAQ = [
  {
    q: "What does the platform cost me as an investor?",
    a: `Nothing. Search profile, teasers, NDA and data room are free of charge for buyers. The platform is financed by a success fee paid by the seller – ${SPANNE} of the purchase price, only on successful closing.`,
  },
  {
    q: "Which projects do you offer?",
    a: "Projects from the ÖKOVOLT Group's own development and projects from third-party developers listed on the project exchange: ground-mounted PV, agri-PV, car park PV and battery storage in Germany, Austria and Switzerland – from secured land to operating assets. Every listing is checked for completeness of the core documents and plausibility before publication – this does not replace a due diligence.",
  },
  {
    q: "How much ready-to-build capacity is available?",
    a: `Honestly: the ÖKOVOLT Group brings around ${KENNZAHLEN.entwicklungMwProJahr} MWp of new capacity into development every year. Reaching RTB typically takes two to three years, and some projects fail on grid or planning. RTB capacity therefore becomes available with a time lag. Entering earlier – e.g. from grid connection commitment or zoning resolution – means more choice and a lower price, but more risk.`,
  },
  {
    q: "How does access to confidential documents work?",
    a: "In public you see an anonymous teaser with region, size, phase and key data. After registration and a digital non-disclosure agreement (NDA) you get access to the data room with lease agreements, planning documents, grid connection commitment and expert reports – every access is logged.",
  },
  {
    q: "Do you offer co-development?",
    // Target group disclosed (package D): co-development is not promoted to retail investors.
    // Minimum ticket (recommendation E15: EUR 200,000) is an owner decision and therefore not stated yet.
    a: "Yes – for professional and institutional investors only, not for retail investors. You participate early in a project or a pipeline and co-fund the development costs; we develop to RTB. Milestone payments and a right of first refusal or acquisition right at RTB are common. Minimum ticket and terms are agreed per project. Early stages carry a high risk up to total loss if a project is not permitted or not connected.",
  },
  {
    q: "What revenues do buyers currently expect?",
    a: `In Germany, the award from the EEG tender (recent volume-weighted averages ${ERLOESE.zuschlagsHistorie.map((z) => fmtEn(z.ct, 2)).join(", ")} ct/kWh for the 2025 bid dates), PPA prices roughly between ${fmtEn(ERLOESE.ppaCt.min, 1)} and ${fmtEn(ERLOESE.ppaCt.max, 1)} ct/kWh, or combinations. In Austria via the EAG market premium or investment grants, in Switzerland among others via the one-off remuneration.`,
  },
  {
    q: "Are the portal and documents available in English?",
    a: "The portal interface is currently in German. Teasers can be read with the key figures alone, and you are welcome to contact us in English. The language of data room documents depends on the project – German-language permits and contracts are the norm in the DACH region.",
  },
];

export default function EnInvestors() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Brokerage and sale of solar projects to investors",
    serviceType: "Project rights, ready-to-build projects and operating assets (photovoltaics, storage)",
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: ["DE", "AT", "CH"],
    audience: { "@type": "BusinessAudience", audienceType: "Investors, funds, utilities, family offices" },
    url: abs(PFAD),
    description: BESCHREIBUNG,
    inLanguage: "en",
  };

  return (
    <div>
      <JsonLd daten={schema} />

      <EnHero
        pill={{ tag: "Free", label: "Search profile, NDA and data room – free of charge for buyers", kurz: "Free of charge for buyers", href: "#fees" }}
        title={
          <>
            Buy solar projects&nbsp;– <span className="ov-text-gradient-light">at the stage that suits you.</span>
          </>
        }
        lead={
          <>
            <span className="font-medium text-white">Project rights from secured land onwards,</span> ready-to-build solar parks, operating assets and co-development in the DACH region. Documents pre-checked for completeness, a digital data room – and free of charge for buyers.
          </>
        }
        actions={[
          { label: "Send search profile", href: "#search-profile" },
          { label: "Phase model & prices", href: "#phases" },
        ]}
        note="Non-binding · details only after NDA · enquiries in English welcome"
        chips={["Projects from our own development and the exchange", "Matching projects notified first", "Data room with access log", "A contact person from our team"]}
        visual={<SuchprofilBuehne />}
        caption="Example view with fictional values · portal interface currently in German"
      />

      <FaktenLeiste
        titel="Key figures for investors"
        items={[
          { icon: TrendingUp, wert: `~${KENNZAHLEN.entwicklungMwProJahr}`, einheit: "MWp per year", text: "of new capacity enter development in the group" },
          { icon: Layers, wert: String(PHASEN.length), einheit: "stages", text: "from secured land to operating asset – with price ranges" },
          { icon: ShieldCheck, wert: String(DD_EN.length), einheit: "review areas", text: "in our due diligence checklist for every project" },
          { icon: BadgePercent, wert: "€0", einheit: "for buyers", text: "the seller pays a success fee, only on closing" },
        ]}
      />

      <SprungLeiste
        items={[
          { href: "#offer", label: "Offer" },
          { href: "#phases", label: "Phases & prices" },
          { href: "#due-diligence", label: "Due diligence" },
          { href: "#process", label: "Process" },
          { href: "#co-development", label: "Co-development" },
          { href: "#fees", label: "Fees" },
          { href: "#search-profile", label: "Search profile" },
        ]}
      />

      {/* ---------------- Offer ---------------- */}
      <Section tone="white" space="lg" id="offer" className="scroll-mt-24">
        <SectionHeading
          eyebrow="What we offer"
          title="From the first lease agreement to the operating plant."
          lead="You decide how much development risk you want to take. The earlier you enter, the lower the price per kWp – and the more important a partner who takes the project all the way to grid connection."
          className="mb-12"
        />
        <LeistungsKarten
          items={[
            { icon: Layers, title: "Project rights at any stage", text: "From secured land through grid connection commitment and zoning resolution to an adopted zoning plan – with a transparent status and open items." },
            { icon: FileSignature, title: "Ready-to-build (RTB)", text: "Building rights, grid connection, land and reports in place. EPC from within the group on request – including our own pile-driving." },
            { icon: Building2, title: "Operating assets & secondary", text: "Solar parks in operation with yield history, feed-in support or PPA – for investors seeking cash flow rather than development risk." },
            { icon: Handshake, title: "Co-development", text: "Enter early, co-fund development, secure a right of first refusal at RTB – with milestone payments and clear governance." },
            { icon: BatteryCharging, title: "Storage & co-location", text: "Battery storage at the same grid connection as the solar park, or as a stand-alone project at grid nodes." },
            { icon: Users, title: "Citizen participation", text: "Smaller tickets? An energy cooperative for local citizens and farmers is in preparation – shares cannot be subscribed yet (German-language information).", href: "/genossenschaft", hrefLang: "de" },
          ]}
        />
      </Section>

      {/* ---------------- Pipeline + Phase model ---------------- */}
      <Section tone="sand" space="lg" id="phases" className="scroll-mt-24">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Pipeline & phase model"
              title="Risk and price by development stage."
              lead={`Around ${KENNZAHLEN.entwicklungMwProJahr} MWp enter development every year – capacity entering project development, not capacity that is ready to build tomorrow. From land security to RTB typically takes two to three years.`}
            />
            <ul className="mt-8 grid gap-3">
              {[
                "Early stages: wide choice, low price per kWp, higher risk.",
                "From adoption of the zoning plan: predictable, less choice, higher price.",
                "Projects from other developers join via the exchange – with the same review.",
              ].map((t, i) => (
                <Reveal as="li" key={t} delay={i * 60} className="flex gap-3 rounded-2xl bg-white p-4 text-[15px] leading-relaxed text-ink-700 ring-1 ring-ink-200/70">
                  <Haken />
                  <span className="min-w-0">{t}</span>
                </Reveal>
              ))}
            </ul>
          </div>
          <Reveal dir="right" className="min-w-0">
            <PhasenLeiter className="shadow-e4 ring-ink-200/70" />
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">Market ranges for project rights in €/kWp, DACH 2025/26 – orientation for your search profile and valuation.</p>
          </Reveal>
        </div>
        <div className="mt-16 md:mt-20">
          <h3 className="ov-h3 mb-6 text-ink-900">Each stage in detail</h3>
          <PhaseModel />
        </div>
      </Section>

      {/* ---------------- Due diligence ---------------- */}
      <Section tone="white" space="lg" id="due-diligence" className="scroll-mt-24">
        <SectionHeading
          eyebrow="Due diligence"
          title="The checklist we apply to every project."
          lead="Before a project goes live on the exchange, we check the core documents for completeness. The full due diligence remains yours – this list helps structure it."
          className="mb-12"
        />
        <DdList />
        <p className="mt-6 text-[13px] leading-relaxed text-ink-500">
          Orientation only, not legal or tax advice. For transactions we recommend technical, legal and tax advisers – the data room provides all documents they need.
        </p>
      </Section>

      {/* ---------------- Process ---------------- */}
      <Section tone="navy" space="lg" id="process" className="scroll-mt-24 overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0 opacity-60" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-ov-500/20 blur-[120px]" />
        <div className="relative">
          <SectionHeading dark eyebrow="Process on the platform" title="From search profile to closing – digital and traceable." align="center" className="mb-12" />
          <Ablauf
            dunkel
            cols={6}
            items={[
              { icon: UserPlus, title: "Search profile", text: "Define ticket size, stages, countries and technologies – register once, adjust any time." },
              { icon: Zap, title: "Matching", text: "Matching projects are notified to you, often before they appear publicly on the exchange." },
              { icon: ShieldCheck, title: "NDA", text: "Digital non-disclosure agreement in one click – the prerequisite for details and data room access." },
              { icon: FolderLock, title: "Data room", text: "Leases, planning, grid, reports and Q&A in one place; every access is logged." },
              { icon: FileSignature, title: "LOI", text: "Letter of intent with price, payment schedule and exclusivity – the start of in-depth due diligence." },
              { icon: Handshake, title: "SPA & closing", text: "Share or asset purchase agreement, transfer of the project company (SPV), support through to construction." },
            ]}
          />
        </div>
      </Section>

      {/* ---------------- Co-development ---------------- */}
      <Section tone="white" space="lg" id="co-development" className="scroll-mt-24">
        <SectionHeading
          eyebrow="Co-development"
          title="Enter before RTB – with milestones, not blind trust."
          lead="You co-fund development costs of a project or a pipeline; we develop to RTB. Payments are tied to milestones such as grid connection commitment, zoning resolution and adoption of the zoning plan."
          className="mb-12"
        />
        <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <span aria-hidden="true" className="absolute left-0 right-0 top-[22px] hidden h-[2px] bg-gradient-to-r from-sun-400 via-ov-400 to-ov-600 lg:block" />
          {["flaeche", "netz", "aufstellung", "satzung", "rtb"].map((id, i) => {
            const p = PHASEN.find((x) => x.id === id);
            const ziel = id === "rtb";
            return (
              <Reveal as="li" key={id} delay={i * 60} className="relative">
                <span className={ziel ? "relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-ov-600 text-white ring-[6px] ring-white" : "relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white font-display text-[14px] font-extrabold text-ov-700 ring-[6px] ring-white"}>
                  <span className={ziel ? "contents" : "flex h-full w-full items-center justify-center rounded-full ring-2 ring-ov-300"}>{ziel ? <Handshake aria-hidden="true" className="h-5 w-5" /> : i + 1}</span>
                </span>
                <div className={ziel ? "ov-verlauf-nacht mt-4 rounded-2xl p-5 text-white ring-1 ring-white/10" : "mt-4 rounded-2xl bg-sand-50 p-5 ring-1 ring-ink-200/70"}>
                  <p className={ziel ? "text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ov-300" : "text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ov-700"}>
                    {ziel ? "Right of first refusal" : `Milestone ${i + 1}`}
                  </p>
                  <p className={ziel ? "mt-1 font-display text-[16.5px] font-bold text-white" : "mt-1 font-display text-[16.5px] font-bold text-ink-900"}>{PHASE_EN[id].label}</p>
                  <p className={ziel ? "ov-num mt-2 text-[13.5px] text-white/70" : "ov-num mt-2 text-[13.5px] text-ink-600"}>
                    €{fmtEn(p.preisProKwp.min)}–{fmtEn(p.preisProKwp.max)}/kWp
                    <br />
                    {ziel ? "acquisition at RTB" : `≈ ${p.monateBisRtb} months to RTB`}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </ol>
        <p className="mt-6 text-[13px] leading-relaxed text-ink-500">For professional and institutional investors only – not offered to retail investors. Milestone payments and a right of first refusal or acquisition right at RTB are common; minimum ticket and terms are agreed per project. Early stages can result in a total loss.</p>
      </Section>

      {/* ---------------- Commission ---------------- */}
      <Section tone="sand" space="lg" id="fees" className="scroll-mt-24">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <SectionHeading
            eyebrow="Commission model – transparent"
            title="Free of charge for investors. Full stop."
            lead="We only earn when a project changes hands – and then the seller pays. That keeps our interest clear: suitable projects that actually get built."
          />
          <div className="min-w-0">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: LineChart, titel: "Investors", wert: "€0", text: "Search profile, NDA and data room free of charge" },
                { icon: BadgePercent, titel: "Sellers", wert: SPANNE, text: "of the purchase price, only on successful closing" },
                { icon: Sprout, titel: "Landowners", wert: "€0", text: "free of charge for landowners – we earn as a developer on joint projects" },
              ].map((k, i) => (
                <Reveal key={k.titel} delay={i * 70} className={i === 0 ? "ov-verlauf-gruen rounded-[1.4rem] p-6 text-white shadow-e3" : "rounded-[1.4rem] bg-white p-6 ring-1 ring-ink-200/70"}>
                  <k.icon aria-hidden="true" className={i === 0 ? "h-6 w-6 text-white" : "h-6 w-6 text-ov-600"} />
                  <p className={i === 0 ? "mt-4 text-[13px] font-semibold text-white/85" : "mt-4 text-[13px] font-semibold text-ink-500"}>{k.titel}</p>
                  <p className="ov-num mt-1 whitespace-nowrap font-display text-[30px] font-extrabold tracking-tight">{k.wert}</p>
                  <p className={i === 0 ? "mt-2 text-[14px] leading-relaxed text-white/85" : "mt-2 text-[14px] leading-relaxed text-ink-600"}>{k.text}</p>
                </Reveal>
              ))}
            </div>
            <Reveal delay={200} className="mt-4 rounded-[1.4rem] bg-white p-5 ring-1 ring-ink-200/70 sm:p-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ov-700">Example</p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-700">
                {BEISPIEL.mwp} MWp ready-to-build at €{fmtEn(BEISPIEL.preis)}/kWp = <strong className="ov-num text-ink-900">{fmtEurEn(beispielKaufpreis)}</strong> purchase price. The success fee of{" "}
                <strong className="ov-num text-ink-900">
                  {fmtEurEn(beispielKaufpreis * PROVISION.verkaeufer.min)} to {fmtEurEn(beispielKaufpreis * PROVISION.verkaeufer.max)}
                </strong>{" "}
                is borne by the seller, only on closing.
              </p>
              <div aria-hidden="true" className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-ink-100">
                <span className="h-full bg-gradient-to-r from-ov-400 to-ov-600" style={{ width: `${100 - PROVISION.verkaeufer.max * 100}%` }} />
                <span className="h-full bg-sun-400" style={{ width: `${PROVISION.verkaeufer.max * 100}%` }} />
              </div>
              <p className="mt-2 flex justify-between text-[12px] text-ink-500">
                <span>You pay the purchase price – no buyer fee</span>
                <span>Seller fee</span>
              </p>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* ---------------- Tools ---------------- */}
      <Section tone="white" space="md">
        <div className="grid gap-4 md:grid-cols-2">
          <LinkKarte href="/rechner/solarpark" hrefLang="de" icon={LineChart} titel="Solar park return calculator" text="Project and equity IRR, LCOE, DSCR and 30-year cash flow – interface in German." />
          <LinkKarte href="/rechner/projektbewertung" hrefLang="de" icon={Scale} titel="Project valuation" text="Purchase price range per kWp by stage, grid connection, size and offtake – interface in German." />
        </div>
      </Section>

      {/* ---------------- Search profile / form ---------------- */}
      <Section tone="navy" space="lg" id="search-profile" className="scroll-mt-24 overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0 opacity-50" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 bottom-0 h-[420px] w-[420px] rounded-full bg-ov-500/20 blur-[120px]" />
        <div className="relative grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <SectionHeading
              dark
              eyebrow="Search profile"
              title="Tell us what you are looking for."
              lead="Send a short profile – we will come back with matching projects. Or create an account right away to see matches, NDAs and data rooms in the portal."
            />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button href="/registrieren?rolle=investor" variant="white" pfeil>
                Register as investor
              </Button>
              <Button href="/login" variant="outlineLight">
                Already registered? Log in
              </Button>
            </div>
            <ul className="mt-10 space-y-3 border-t border-white/10 pt-8 text-[14.5px] text-white/75">
              {["Free of charge and non-binding", "Confidential: details only after NDA", "Portal interface currently in German", `Market data as of ${datumEn(STAND)}`].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <Haken dunkel />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[2rem] bg-white/[0.04] p-6 ring-1 ring-white/10 md:p-8">
            <ContactForm
              dunkel
              typ="investor"
              daten={{ quelle: "en/investors" }}
              titel="Investor enquiry"
              text="Ticket size, preferred stages, countries and technologies – a few lines are enough."
              button="Send search profile"
            />
          </div>
        </div>
      </Section>

      {/* ---------------- FAQ ---------------- */}
      <Section tone="sand" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="FAQ" title="Good to know for investors" lead="Further questions? We are happy to answer them personally – in English.">
            <Button href="/en/contact" variant="secondary" className="mt-8" pfeil>
              Contact the team
            </Button>
          </SectionHeading>
          <Faq items={FAQ} />
        </div>
      </Section>

      <EnCta
        eyebrow="Free of charge for investors"
        title="The right projects, before everyone sees them."
        text="Set up your search profile. We match it against new projects from our own development and from the exchange – with documents pre-checked for completeness; a contact person from our team will get in touch."
        primary={{ label: "Register as investor", href: "/registrieren?rolle=investor" }}
        secondary={{ label: "Project exchange", href: "/en/project-exchange" }}
      />
    </div>
  );
}
