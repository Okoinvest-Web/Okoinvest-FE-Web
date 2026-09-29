import Link from "next/link";
import { Building2, Clock, Languages, LineChart, MapPin, Tag } from "lucide-react";

import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import ContactForm from "@/components/En/ContactForm";
import { enMetadata } from "@/components/En/sprachpaare";
import { GESELLSCHAFT, KONTAKT, SITE, abs } from "@/data/site";

const PFAD = "/en/contact";

export const metadata = enMetadata({
  pfad: PFAD,
  title: "Contact – solar projects in DACH | ÖkoInvest",
  description:
    "Contact ÖkoInvest in Ostermiething, Austria: buying or selling solar projects, co-development and general enquiries in English – reply within two working days.",
  keywords: ["ÖkoInvest contact", "solar project developer Austria contact", "solar investment enquiry"],
});

const THEMEN = [
  { typ: "investor", label: "Buying projects / co-development" },
  { typ: "projekt", label: "Selling a project" },
  { typ: "flaeche", label: "Land for a solar park" },
  { typ: "kontakt", label: "General enquiry" },
];

const TAGE_EN = { "Mo – Do": "Mon – Thu", Fr: "Fri", "Mo – Fr": "Mon – Fri" };

const schema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  url: abs(PFAD),
  name: "Contact ÖkoInvest",
  inLanguage: "en",
  about: { "@id": `${SITE.url}/#organization` },
};

export default function EnContact() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <PageHero
        variant="dark"
        eyebrow="Contact"
        title={
          <>
            Talk to the team – <span className="ov-text-gradient-light">in English.</span>
          </>
        }
        lead="Buying or selling solar projects, co-development or a general question: send us a short message. We usually reply within two working days."
      />

      <Section tone="sand" space="lg">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-14">
          <Reveal className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-ink-200/70 md:p-10">
            <ContactForm themen={THEMEN} daten={{ quelle: "en/contact" }} titel="Your enquiry" text="Fields marked * are required." />
          </Reveal>

          <div className="space-y-5">
            <Reveal className="rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 md:p-8">
              <p className="flex items-center gap-2 font-display text-[18px] font-bold text-ink-900">
                <Building2 aria-hidden="true" className="h-5 w-5 text-ov-600" /> {GESELLSCHAFT.name}
              </p>
              <address className="mt-4 flex gap-3 not-italic text-[15.5px] leading-relaxed text-ink-700">
                <MapPin aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ov-600" />
                <span>
                  {KONTAKT.strasse}
                  <br />
                  {KONTAKT.ort}
                  <br />
                  Austria
                </span>
              </address>
              <p className="mt-4 text-[14px] text-ink-500">
                Company register {GESELLSCHAFT.register}, Regional Court of Ried im Innkreis
              </p>
              {KONTAKT.oeffnungszeiten?.length > 0 && (
                <div className="mt-5 border-t border-ink-100 pt-5">
                  <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-700">
                    <Clock aria-hidden="true" className="h-4 w-4 text-ov-600" /> Office hours (CET/CEST)
                  </p>
                  <dl className="mt-2 space-y-1 text-[14.5px] text-ink-600">
                    {KONTAKT.oeffnungszeiten.map((o) => (
                      <div key={o.tage} className="flex justify-between gap-4">
                        <dt>{TAGE_EN[o.tage] || o.tage}</dt>
                        <dd className="ov-num">{o.zeit}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </Reveal>

            <Reveal delay={80} className="rounded-3xl bg-navy-950 p-6 text-white md:p-8">
              <p className="font-display text-[18px] font-bold">Faster routes</p>
              <ul className="mt-4 space-y-3 text-[15px] text-white/75">
                <li className="flex gap-3">
                  <LineChart aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" />
                  <span>
                    Investors: <Link href="/en/investors#search-profile" className="font-semibold text-white underline underline-offset-2">send a search profile</Link>
                  </span>
                </li>
                <li className="flex gap-3">
                  <Tag aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" />
                  <span>
                    Developers: <Link href="/en/sell-your-project#enquiry" className="font-semibold text-white underline underline-offset-2">offer a project</Link>
                  </span>
                </li>
                <li className="flex gap-3">
                  <Languages aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" />
                  <span>Portal and legal pages are currently in German.</span>
                </li>
              </ul>
            </Reveal>
          </div>
        </div>
      </Section>
    </div>
  );
}
