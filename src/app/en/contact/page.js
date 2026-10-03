import Link from "next/link";
import { ArrowUpRight, Building2, Clock, Languages, Layers, LineChart, MapPin, Tag } from "lucide-react";

import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import JsonLd from "@/components/JsonLd";
import EnHero from "@/components/En/EnHero";
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

const ROUTEN = [
  { href: "/en/investors#search-profile", icon: LineChart, wer: "Investors", label: "Send a search profile" },
  { href: "/en/sell-your-project#enquiry", icon: Tag, wer: "Developers", label: "Offer a project" },
  { href: "/en/project-exchange", icon: Layers, wer: "Everyone", label: "How the project exchange works" },
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
      <JsonLd daten={schema} />

      <EnHero
        kompakt
        pill={{ tag: "EN", label: "Enquiries in English – team in Ostermiething, Austria", kurz: "Enquiries in English", href: "#enquiry" }}
        title={
          <>
            Talk to the team&nbsp;– <span className="ov-text-gradient-light">in English.</span>
          </>
        }
        lead="Buying or selling solar projects, co-development or a general question: send us a short message. We usually reply within two working days."
        actions={[{ label: "Write to us", href: "#enquiry" }]}
        note="Portal and legal pages are currently in German."
        visual={
          <div className="ov-hero-in mx-auto max-w-[520px] lg:ml-auto lg:mr-0" style={{ "--ov-delay": "220ms" }}>
            <div className="rounded-[1.6rem] bg-white/[0.06] p-5 ring-1 ring-white/15 backdrop-blur sm:p-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-300">Faster routes</p>
              <ul className="mt-4 grid gap-2.5">
                {ROUTEN.map((r) => (
                  <li key={r.href}>
                    <Link
                      href={r.href}
                      className="group flex items-center gap-4 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 transition-colors hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ov-400/15 text-ov-300 ring-1 ring-ov-300/30">
                        <r.icon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] text-white/60">{r.wer}</span>
                        <span className="block font-semibold text-white">{r.label}</span>
                      </span>
                      <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        }
      />

      <Section tone="sand" space="lg" id="enquiry" className="scroll-mt-24">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-14">
          <Reveal className="relative overflow-hidden rounded-[2rem] bg-white p-6 shadow-e4 ring-1 ring-ink-200/70 md:p-10">
            <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
            <ContactForm themen={THEMEN} daten={{ quelle: "en/contact" }} titel="Your enquiry" text="Fields marked * are required." />
          </Reveal>

          <div className="space-y-5 lg:sticky lg:top-28">
            <Reveal className="overflow-hidden rounded-[1.6rem] bg-white ring-1 ring-ink-200/70">
              <div className="flex items-center gap-3 border-b border-ink-100 px-6 py-5 md:px-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200">
                  <Building2 aria-hidden="true" className="h-5 w-5" />
                </span>
                <p className="font-display text-[17px] font-bold text-ink-900">{GESELLSCHAFT.name}</p>
              </div>
              <div className="px-6 py-5 md:px-7">
                <address className="flex gap-3 not-italic text-[15.5px] leading-relaxed text-ink-700">
                  <MapPin aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ov-600" />
                  <span>
                    {KONTAKT.strasse}
                    <br />
                    {KONTAKT.ort}
                    <br />
                    Austria
                  </span>
                </address>
                <p className="mt-4 text-[13.5px] text-ink-500">
                  Company register {GESELLSCHAFT.register}, Regional Court of Ried im Innkreis
                </p>
              </div>
              {KONTAKT.oeffnungszeiten?.length > 0 && (
                <div className="border-t border-ink-100 bg-sand-50/70 px-6 py-5 md:px-7">
                  <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-700">
                    <Clock aria-hidden="true" className="h-4 w-4 text-ov-600" /> Office hours (CET/CEST)
                  </p>
                  <dl className="mt-3 space-y-1.5 text-[14.5px] text-ink-600">
                    {KONTAKT.oeffnungszeiten.map((o) => (
                      <div key={o.tage} className="flex justify-between gap-4">
                        <dt>{TAGE_EN[o.tage] || o.tage}</dt>
                        <dd className="ov-num font-medium text-ink-800">{o.zeit}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </Reveal>

            <Reveal delay={80} className="rounded-[1.6rem] bg-white p-6 ring-1 ring-ink-200/70 md:p-7">
              <p className="font-display text-[17px] font-bold text-ink-900">What happens next</p>
              <ol className="mt-4 space-y-3.5">
                {[
                  "We read your message and assign one contact person.",
                  "You get a reply – usually within two working days.",
                  "If it fits: a call, a search profile or a project review.",
                ].map((t, i) => (
                  <li key={t} className="flex gap-3 text-[14.5px] leading-relaxed text-ink-700">
                    <span className="ov-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ov-50 text-[12px] font-extrabold text-ov-700 ring-1 ring-ov-200">{i + 1}</span>
                    <span className="min-w-0">{t}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 flex items-start gap-2 border-t border-ink-100 pt-4 text-[13px] text-ink-500">
                <Languages aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
                Portal and legal pages are currently in German.
              </p>
            </Reveal>
          </div>
        </div>
      </Section>
    </div>
  );
}
