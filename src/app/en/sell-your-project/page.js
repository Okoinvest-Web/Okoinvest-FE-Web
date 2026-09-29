import { BadgePercent, BarChart3, ClipboardCheck, EyeOff, FileCheck2, FolderLock, Handshake, LayoutList, Send, ShieldCheck, UserPlus, Users } from "lucide-react";

import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import FeatureGrid from "@/components/ui/FeatureGrid";
import Steps from "@/components/ui/Steps";
import Faq from "@/components/ui/Faq";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import EnCta from "@/components/En/EnCta";
import ContactForm from "@/components/En/ContactForm";
import { enMetadata, fmtEn, fmtEurEn } from "@/components/En/sprachpaare";
import { SITE, abs } from "@/data/site";
import { PHASEN, PROVISION } from "@/lib/invest/markt";

const PFAD = "/en/sell-your-project";
const SPANNE = `${fmtEn(PROVISION.verkaeufer.min * 100, 1)}–${fmtEn(PROVISION.verkaeufer.max * 100)}%`;
const BESCHREIBUNG = `Sell your solar park or project rights in DACH: anonymous teaser, one-click NDA, digital data room. Success fee of ${SPANNE} only on closing – no listing fees.`;

export const metadata = enMetadata({
  pfad: PFAD,
  title: "Sell your solar project in DACH | ÖkoInvest",
  description: BESCHREIBUNG,
  keywords: ["sell solar project", "sell PV project rights Germany", "solar project buyer Austria", "RTB solar project sale", "solar developer exit"],
  bild: { src: "/img/planer-tablet.jpg", alt: "Project developer reviewing plans on a tablet" },
});

const RTB = PHASEN.find((p) => p.id === "rtb");
const BEISPIEL_MWP = 10;
const BEISPIEL_PREIS_KWP = Math.round((RTB.preisProKwp.min + RTB.preisProKwp.max) / 2);
const BEISPIEL_KAUFPREIS = BEISPIEL_MWP * 1000 * BEISPIEL_PREIS_KWP;

const FAQ = [
  {
    q: "What does it cost to list a project?",
    a: `Nothing. There are no listing or data room fees. Only if an investor introduced via the project exchange acquires your project is a success fee of ${SPANNE} of the purchase price due.`,
  },
  {
    q: "How is the fee rate set?",
    a: `The rate lies between ${fmtEn(PROVISION.verkaeufer.min * 100, 1)}% and ${fmtEn(PROVISION.verkaeufer.max * 100)}% of the purchase price and usually depends on project size and effort. It is fixed before publication and visible in your portal. You accept the agreement when submitting – logged with a timestamp.`,
  },
  {
    q: "Who sees my project data?",
    a: "In public only an anonymous teaser appears: type, capacity, stage, region, federal state or canton and price indication. Municipality, plots, grid operator and documents are visible only to the back office and to investors whose NDA has been released. You can see views, watch-list saves and NDA requests at any time.",
  },
  {
    q: "Which projects do you accept?",
    a: "Ground-mounted PV, agri-PV, car park and carport PV as well as battery storage in Germany, Austria and Switzerland – from secured land to operating assets. We need traceable information on land security, planning status and grid connection.",
  },
  {
    q: "Can I withdraw my project?",
    a: "Yes. As long as no sale has been completed, you can remove the project from the exchange with one click and continue editing it as a draft.",
  },
  {
    q: "Does ÖkoInvest itself act as a buyer?",
    a: "The ÖKOVOLT Group develops and operates solar parks itself and may be interested in individual projects. We disclose this; on the exchange, the same rules apply to all interested parties.",
  },
];

export default function EnSellYourProject() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Marketing of solar and storage projects to investors",
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: ["DE", "AT", "CH"],
    audience: { "@type": "BusinessAudience", audienceType: "Project developers, landowners with project rights, asset owners" },
    url: abs(PFAD),
    inLanguage: "en",
    description: BESCHREIBUNG,
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <PageHero
        eyebrow="For project developers"
        title={
          <>
            Your solar project in front of the <span className="ov-text-gradient">right investors</span> – confidentially.
          </>
        }
        lead={`Anonymous teaser, one-click NDA and a digital data room: you keep control, we bring buyers and sellers together. Success fee ${SPANNE} of the purchase price, only on closing.`}
        image={{ src: "/img/planer-tablet.jpg", alt: "Project developer reviewing plans on a tablet" }}
        actions={[
          { label: "Register as seller", href: "/registrieren?rolle=anbieter" },
          { label: "Send project details", href: "#enquiry" },
        ]}
        points={["No listing fees", "Anonymous until NDA", "Real-time statistics", "Across DACH"]}
        badge={
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-700">Success fee</p>
            <p className="ov-num mt-1 font-display text-[28px] font-extrabold text-ink-900">{SPANNE}</p>
            <p className="text-[13px] text-ink-500">only on closing</p>
          </div>
        }
      />

      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Why here"
          title="Market your project without giving it out of your hands"
          lead="The exchange is part of a group that has been planning, building and operating solar power plants since 2010. We know the questions buyers ask – and prepare your project accordingly."
        />
        <FeatureGrid
          className="mt-12"
          items={[
            { icon: EyeOff, title: "Anonymous until NDA", text: "In public only region, capacity, stage and price indication. No municipality, no plots – landowners and municipalities are not approached prematurely." },
            { icon: FolderLock, title: "Data room with log", text: "Only released investors see the documents. Every access is logged." },
            { icon: BarChart3, title: "Transparent statistics", text: "Views, watch-list saves, NDA requests and LOIs in your portal – you see how your project is received." },
            { icon: ShieldCheck, title: "Quality review", text: "We review every project before publication. That builds trust on the buyer side – and saves you follow-up questions." },
            { icon: Users, title: "Investors with search profiles", text: "Registered investors set size, stages, countries and ticket. They see matching projects first." },
            { icon: Handshake, title: "Support to closing", text: "From LOI through due diligence to the SPA, one fixed contact person in the back office supports you." },
          ]}
        />
      </Section>

      <Section tone="sand" space="lg">
        <SectionHeading eyebrow="Process" title="Five steps to a reviewed listing" />
        <Steps
          className="mt-12"
          cols={3}
          items={[
            { icon: UserPlus, title: "Create a seller account", text: "Register free of charge. Your account is ready to use immediately." },
            { icon: LayoutList, title: "Enter the project", text: "Basic data, development stage, teaser and confidential details – every step is saved." },
            { icon: BadgePercent, title: "Accept the fee", text: `Success fee ${SPANNE} of the purchase price, only on closing – digitally, with timestamp.` },
            { icon: ClipboardCheck, title: "Back-office review", text: "We check information and documents and raise any questions in the portal." },
            { icon: Send, title: "Publication & marketing", text: "Anonymous teaser on the exchange, data room after NDA, LOIs and closing in the portal." },
          ]}
        />
        <p className="mt-8 text-[13.5px] text-ink-500">
          The listing form in the portal is currently in German. Prefer to start in English? Send us the key data below and we will set up the listing with you.
        </p>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Commission model"
              title="Transparent – and only on success"
              lead="No base fee, no minimum term, no exclusivity for the listing. The seller pays the fee only if an investor introduced via the exchange buys."
            />
            <ul className="mt-8 space-y-3 text-[15.5px] text-ink-700">
              <li className="flex gap-3"><FileCheck2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" /> Rate between {fmtEn(PROVISION.verkaeufer.min * 100, 1)}% and {fmtEn(PROVISION.verkaeufer.max * 100)}% of the purchase price</li>
              <li className="flex gap-3"><FileCheck2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" /> Fixed before publication, visible in the portal</li>
              <li className="flex gap-3"><FileCheck2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" /> Free of charge for investors (search profile, NDA, data room)</li>
            </ul>
          </div>
          <Reveal className="ov-noise relative overflow-hidden rounded-[2rem] bg-navy-950 p-7 text-white md:p-10">
            <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ov-500/30 blur-[100px]" />
            <p className="relative text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">Worked example</p>
            <p className="relative mt-3 text-[15px] text-white/70">
              Ready-to-build ground-mounted project with {BEISPIEL_MWP} MWp, purchase price in the middle of the usual range (€{fmtEn(BEISPIEL_PREIS_KWP)}/kWp):
            </p>
            <dl className="relative mt-6 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-white/10 pb-4">
                <dt className="text-white/70">Purchase price, project rights</dt>
                <dd className="ov-num font-display text-[24px] font-extrabold">{fmtEurEn(BEISPIEL_KAUFPREIS)}</dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <dt className="text-white/70">Success fee ({SPANNE})</dt>
                <dd className="ov-num font-display text-[24px] font-extrabold text-ov-300">
                  {fmtEurEn(BEISPIEL_KAUFPREIS * PROVISION.verkaeufer.min)} – {fmtEurEn(BEISPIEL_KAUFPREIS * PROVISION.verkaeufer.max)}
                </dd>
              </div>
            </dl>
            <p className="relative mt-6 text-[12.5px] leading-relaxed text-white/50">
              Example based on the market range for ready-to-build projects (€{fmtEn(RTB.preisProKwp.min)}–{fmtEn(RTB.preisProKwp.max)}/kWp, DACH). The actual price depends on grid connection, remuneration, location and negotiation.
            </p>
          </Reveal>
        </div>
      </Section>

      <Section tone="ink" space="lg">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <SectionHeading eyebrow="Quality review" title="What we check before publication" lead="Not a due diligence – but enough for investors to take your project seriously." />
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ["Land security", "Lease, option or use agreements and their term"],
              ["Planning law", "Status of the zoning plan (B-Plan), zoning designation or permit"],
              ["Grid connection", "Grid enquiry, commitment or reservation, distance to the point of connection"],
              ["Plausibility", "Capacity vs. area, yield assumptions, schedule to COD"],
              ["Price indication", "Benchmark against usual ranges for the respective stage"],
              ["Anonymity", "Title and description without clues to the exact location"],
            ].map(([t, x]) => (
              <li key={t} className="rounded-2xl bg-white p-5 ring-1 ring-ink-200/70">
                <p className="font-display text-[16px] font-bold text-ink-900">{t}</p>
                <p className="mt-1 text-[14.5px] leading-relaxed text-ink-600">{x}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ---------------- Enquiry ---------------- */}
      <Section tone="navy" space="lg" id="enquiry" className="scroll-mt-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <SectionHeading
              dark
              eyebrow="Offer a project"
              title="Send us the key data."
              lead="Technology, capacity, country and region, development stage (land secured, grid commitment, zoning, RTB, COD) and your price expectation. We come back with an assessment and the next steps."
            />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button href="/registrieren?rolle=anbieter" variant="white" pfeil>
                Register as seller
              </Button>
              <Button href="/projektboerse/anbieten" hrefLang="de" variant="outlineLight">
                Listing page (German)
              </Button>
            </div>
          </div>
          <div className="rounded-[2rem] bg-white/[0.04] p-6 ring-1 ring-white/10 md:p-8">
            <ContactForm
              dunkel
              typ="projekt"
              daten={{ quelle: "en/sell-your-project" }}
              titel="Project offer"
              text="No documents needed at this point – a short description is enough."
              button="Send project details"
            />
          </div>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading eyebrow="FAQ" title="Selling via the exchange" />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        ueberschrift="Continue reading"
        items={[
          { href: "/en/project-exchange", titel: "Project exchange", text: "How teaser, NDA and data room work for both sides." },
          { href: "/en/investors", titel: "For investors", text: "Phase model with price ranges and the buyer's due diligence checklist." },
          { href: "/en/contact", titel: "Contact", text: "General questions in English to the team in Ostermiething." },
        ]}
      />

      <EnCta
        eyebrow="For developers"
        title="List confidentially. Pay only on success."
        text={`No listing fees, no exclusivity. Success fee of ${SPANNE} of the purchase price – only when an investor introduced via the exchange buys.`}
        primary={{ label: "Register as seller", href: "/registrieren?rolle=anbieter" }}
        secondary={{ label: "Project exchange", href: "/en/project-exchange" }}
      />
    </div>
  );
}
