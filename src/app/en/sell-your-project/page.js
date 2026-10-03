import { BadgePercent, BarChart3, ClipboardCheck, Eye, EyeOff, FolderLock, Handshake, Languages, LayoutList, Send, ShieldCheck, UserPlus, Users, Wallet } from "lucide-react";

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import JsonLd from "@/components/JsonLd";
import EnCta from "@/components/En/EnCta";
import EnHero, { Haken } from "@/components/En/EnHero";
import ContactForm from "@/components/En/ContactForm";
import { ProvisionBuehne } from "@/components/En/Buehnen";
import { Ablauf, FaktenLeiste, LeistungsKarten } from "@/components/En/Teile";
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

const PRUEFUNG = [
  ["Land security", "Lease, option or use agreements and their term"],
  ["Planning law", "Status of the zoning plan (B-Plan), zoning designation or permit"],
  ["Grid connection", "Grid enquiry, commitment or reservation, distance to the point of connection"],
  ["Plausibility", "Capacity vs. area, yield assumptions, schedule to COD"],
  ["Price indication", "Benchmark against usual ranges for the respective stage"],
  ["Anonymity", "Title and description without clues to the exact location"],
];

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
      <JsonLd daten={schema} />

      <EnHero
        pill={{ tag: "€0", label: "No listing fees, no exclusivity – fee only on closing", kurz: "No listing fees", href: "#fees" }}
        title={
          <>
            Your solar project in front of the <span className="ov-text-gradient-light">right investors</span>&nbsp;– confidentially.
          </>
        }
        lead={
          <>
            <span className="font-medium text-white">Anonymous teaser, one-click NDA and a digital data room:</span> you keep control, we bring buyers and sellers together. Success fee {SPANNE} of the purchase price, only on closing.
          </>
        }
        actions={[
          { label: "Send project details", href: "#enquiry" },
          { label: "Register as seller", href: "/registrieren?rolle=anbieter" },
        ]}
        note="No documents needed for a first assessment · enquiries in English welcome"
        chips={["No listing fees", "Anonymous until NDA", "Real-time statistics", "Across DACH"]}
        visual={<ProvisionBuehne mwp={BEISPIEL_MWP} />}
        caption={`Worked example in the middle of the RTB market range (€${fmtEn(RTB.preisProKwp.min)}–${fmtEn(RTB.preisProKwp.max)}/kWp, DACH) – the actual price depends on the project`}
      />

      <FaktenLeiste
        titel="Selling via the exchange"
        items={[
          { icon: Wallet, wert: "€0", einheit: "listing fees", text: "no base fee, no minimum term, no exclusivity" },
          { icon: BadgePercent, wert: SPANNE, einheit: "success fee", text: "of the purchase price, only on closing" },
          { icon: ClipboardCheck, wert: String(PRUEFUNG.length), einheit: "checks", text: "before your teaser goes live" },
          { icon: LayoutList, wert: "5", einheit: "steps", text: "to a reviewed listing – all in the portal" },
        ]}
      />

      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Why here"
          title="Market your project without giving it out of your hands"
          lead="The exchange is part of a group that has been planning, building and operating solar power plants since 2010. We know the questions buyers ask – and prepare your project accordingly."
          className="mb-12"
        />
        <LeistungsKarten
          items={[
            { icon: EyeOff, title: "Anonymous until NDA", text: "In public only region, capacity, stage and price indication. No municipality, no plots – landowners and municipalities are not approached prematurely." },
            { icon: FolderLock, title: "Data room with log", text: "Only released investors see the documents. Every access is logged." },
            { icon: BarChart3, title: "Transparent statistics", text: "Views, watch-list saves, NDA requests and LOIs in your portal – you see how your project is received." },
            { icon: ShieldCheck, title: "Quality review", text: "We review every project before publication. That builds trust on the buyer side – and saves you follow-up questions." },
            { icon: Users, title: "Investors with search profiles", text: "Registered investors set size, stages, countries and ticket. They see matching projects first." },
            { icon: Handshake, title: "Support to closing", text: "From LOI through due diligence to the SPA, a contact person in the back office supports you." },
          ]}
        />
      </Section>

      <Section tone="sand" space="lg">
        <SectionHeading eyebrow="Process" title="Five steps to a reviewed listing" className="mb-12" />
        <Ablauf
          cols={5}
          items={[
            { icon: UserPlus, title: "Create a seller account", text: "Register free of charge. Your account is ready to use immediately." },
            { icon: LayoutList, title: "Enter the project", text: "Basic data, development stage, teaser and confidential details – every step is saved." },
            { icon: BadgePercent, title: "Accept the fee", text: `Success fee ${SPANNE} of the purchase price, only on closing – digitally, with timestamp.` },
            { icon: ClipboardCheck, title: "Back-office review", text: "We check information and documents and raise any questions in the portal." },
            { icon: Send, title: "Publication & marketing", text: "Anonymous teaser on the exchange, data room after NDA, LOIs and closing in the portal." },
          ]}
        />
        <p className="mt-8 flex items-start gap-2.5 text-[14px] leading-relaxed text-ink-600">
          <Languages aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
          <span>
            The listing form in the portal is currently in German. Prefer to start in English?{" "}
            <a href="#enquiry" className="font-semibold text-ov-700 underline underline-offset-2 hover:text-ov-800">Send us the key data</a> and we will set up the listing with you.
          </span>
        </p>
      </Section>

      {/* ---------------- Commission ---------------- */}
      <Section tone="white" space="lg" id="fees" className="scroll-mt-24">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Commission model"
              title="Transparent – and only on success"
              lead="No base fee, no minimum term, no exclusivity for the listing. The seller pays the fee only if an investor introduced via the exchange buys."
            />
            <ul className="mt-8 space-y-3 text-[15.5px] text-ink-700">
              <li className="flex gap-3"><Haken /><span className="min-w-0">Rate between {fmtEn(PROVISION.verkaeufer.min * 100, 1)}% and {fmtEn(PROVISION.verkaeufer.max * 100)}% of the purchase price</span></li>
              <li className="flex gap-3"><Haken /><span className="min-w-0">Fixed before publication, visible in the portal</span></li>
              <li className="flex gap-3"><Haken /><span className="min-w-0">Free of charge for investors (search profile, NDA, data room)</span></li>
            </ul>
          </div>
          <Reveal dir="right" className="ov-verlauf-nacht ov-noise relative overflow-hidden rounded-[2rem] p-6 text-white ring-1 ring-white/10 md:p-9">
            <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 opacity-40" />
            <p className="relative text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300">When is a fee due?</p>
            <ol className="relative mt-6 space-y-3">
              {[
                { icon: LayoutList, t: "Listing & review", fee: "€0" },
                { icon: Eye, t: "Teaser views, watch list, NDA requests", fee: "€0" },
                { icon: FolderLock, t: "Data room & LOI", fee: "€0" },
                { icon: Handshake, t: "Closing with an investor from the exchange", fee: SPANNE, ziel: true },
              ].map((s) => (
                <li key={s.t} className={s.ziel ? "flex items-center gap-4 rounded-2xl bg-white p-4 text-ink-900" : "flex items-center gap-4 rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10"}>
                  <span className={s.ziel ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ov-600 text-white" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-ov-300"}>
                    <s.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className={s.ziel ? "min-w-0 flex-1 text-[15px] font-semibold" : "min-w-0 flex-1 text-[15px] text-white/80"}>{s.t}</span>
                  <span className={s.ziel ? "ov-num shrink-0 whitespace-nowrap font-display text-[20px] font-extrabold text-ov-700" : "ov-num shrink-0 font-display text-[18px] font-extrabold text-white"}>{s.fee}</span>
                </li>
              ))}
            </ol>
            <p className="relative mt-6 text-[13px] leading-relaxed text-white/60">
              Example: {BEISPIEL_MWP} MWp ready-to-build at €{fmtEn(BEISPIEL_PREIS_KWP)}/kWp = {fmtEurEn(BEISPIEL_KAUFPREIS)} purchase price → success fee {fmtEurEn(BEISPIEL_KAUFPREIS * PROVISION.verkaeufer.min)} – {fmtEurEn(BEISPIEL_KAUFPREIS * PROVISION.verkaeufer.max)}. Based on the market range for ready-to-build projects (€{fmtEn(RTB.preisProKwp.min)}–{fmtEn(RTB.preisProKwp.max)}/kWp, DACH); the actual price depends on grid connection, remuneration, location and negotiation.
            </p>
          </Reveal>
        </div>
      </Section>

      <Section tone="sand" space="lg">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <SectionHeading eyebrow="Quality review" title="What we check before publication" lead="Not a due diligence – but enough for investors to take your project seriously." />
          <ol className="grid gap-3 sm:grid-cols-2">
            {PRUEFUNG.map(([t, x], i) => (
              <Reveal as="li" key={t} delay={i * 50} className="flex gap-4 rounded-2xl bg-white p-5 ring-1 ring-ink-200/70">
                <span className="ov-num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 font-display text-[13px] font-extrabold text-ov-700 ring-1 ring-ov-200">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="block font-display text-[16px] font-bold text-ink-900">{t}</span>
                  <span className="mt-1 block text-[14.5px] leading-relaxed text-ink-600">{x}</span>
                </span>
              </Reveal>
            ))}
          </ol>
        </div>
      </Section>

      {/* ---------------- Enquiry ---------------- */}
      <Section tone="navy" space="lg" id="enquiry" className="scroll-mt-24 overflow-hidden">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0 opacity-50" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 bottom-0 h-[420px] w-[420px] rounded-full bg-ov-500/20 blur-[120px]" />
        <div className="relative grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
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
            <ul className="mt-10 space-y-3 border-t border-white/10 pt-8 text-[14.5px] text-white/75">
              {["No documents needed at this point", "Confidential – nothing is published without your release", "Reply in English"].map((t) => (
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
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <SectionHeading eyebrow="FAQ" title="Selling via the exchange" lead="Anything else? We are happy to answer in English.">
            <Button href="/en/contact" variant="secondary" className="mt-8" pfeil>
              Contact the team
            </Button>
          </SectionHeading>
          <Faq items={FAQ} />
        </div>
      </Section>

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
