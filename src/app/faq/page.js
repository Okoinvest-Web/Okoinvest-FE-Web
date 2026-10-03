import Link from "next/link";
import { ArrowRight, Calculator, MessageCircle, Route } from "lucide-react";
import Section from "@/components/ui/Section";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import FaqSuche from "@/components/Faq/FaqSuche";
import ThemenKacheln from "@/components/Faq/ThemenKacheln";
import NachtHero from "@/components/Unternehmen/NachtHero";
import { FAQ_GRUPPEN } from "@/data/faq";
import { abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";

const PFAD = "/faq";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "FAQ: Solarpark, Agri-PV, Projektbörse, Strom | ÖkoInvest",
  description:
    "Antworten für Flächeneigentümer, Landwirte, Investoren, Anbieter und Unternehmen: Pacht, Agri-PV, Projektbörse, Reststrom-Pool, Portal und Datenschutz.",
  keywords: ["FAQ Solarpark", "Pacht Solarpark Fragen", "Agri-PV FAQ", "Projektbörse Photovoltaik", "Reststrom-Pool"],
});

// FAQPage-Schema über alle Fragen (ohne Doppelungen)
const alle = [...new Map(FAQ_GRUPPEN.flatMap((g) => g.items).map((it) => [it.q, it])).values()];
const schema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${abs(PFAD)}/#faq`,
  url: abs(PFAD),
  mainEntity: alle.map((it) => ({
    "@type": "Question",
    name: it.q,
    acceptedAnswer: { "@type": "Answer", text: typeof it.a === "string" ? it.a : it.aText || "" },
  })),
};

const QUERVERWEISE = [
  { href: "/prozess", titel: "Projektprozess", text: "Schritte, Dauer und Dokumente – für jede Zielgruppe." },
  { href: "/rechner", titel: "Rechner & Tools", text: "Pacht, Rendite, Projektwert und Reststrom selbst durchrechnen." },
  { href: "/wissen/lexikon", titel: "Lexikon", text: "Von Aufstellungsbeschluss bis Zuschlagswert." },
];

export default function FaqPage() {
  return (
    <div>
      <JsonLd daten={schema} />

      <NachtHero
        mitLeiste
        breadcrumbs={[{ name: "Wissen", href: "/ratgeber" }, { name: "FAQ" }]}
        eyebrow="Häufige Fragen"
        title={
          <>
            Kurz gefragt, <span className="ov-text-gradient-light">klar beantwortet.</span>
          </>
        }
        lead={`${alle.length} Antworten für Flächeneigentümer, Landwirte, Investoren, Projektanbieter und Unternehmen – durchsuchbar und nach Thema gefiltert.`}
        actions={[
          { label: "Fragen durchsuchen", href: "#suche" },
          { label: "Frage stellen", href: "/kontakt" },
        ]}
        buehne={<ThemenKacheln gruppen={FAQ_GRUPPEN} />}
      />

      <Section tone="sand" space="none" id="suche" className="scroll-mt-20 pb-20 md:pb-32">
        <div className="relative z-10 -mt-12 grid gap-8 md:-mt-16 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          <FaqSuche gruppen={FAQ_GRUPPEN} />
          <aside className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
            <Reveal className="ov-verlauf-nacht ov-noise relative overflow-hidden rounded-3xl p-7 text-white shadow-e4">
              <MessageCircle aria-hidden="true" className="relative h-7 w-7 text-ov-300" />
              <h2 className="relative mt-5 font-display text-[21px] font-extrabold leading-tight">Ihre Frage ist nicht dabei?</h2>
              <p className="relative mt-3 text-[15px] leading-relaxed text-white/75">
                Schreiben Sie uns – unser Projektteam meldet sich persönlich.
              </p>
              <Link
                href="/kontakt"
                className="group relative mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
              >
                Frage stellen
                <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
              </Link>
            </Reveal>
            <Reveal delay={80} className="rounded-3xl bg-white p-2 shadow-e1 ring-1 ring-ink-200/70">
              <h2 className="sr-only">Weiter mit</h2>
              {[
                { icon: Route, href: "/prozess", titel: "Projektprozess", text: "Schritte, Dauer, Dokumente" },
                { icon: Calculator, href: "/rechner", titel: "Selbst rechnen", text: "Pacht, Rendite, Reststrom" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="group flex items-center gap-3.5 rounded-2xl p-3.5 transition-colors hover:bg-sand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
                >
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-100">
                    <l.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[15.5px] font-bold text-ink-900">{l.titel}</span>
                    <span className="block text-[13.5px] text-ink-500">{l.text}</span>
                  </span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400 transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-ov-600 motion-reduce:transition-none" />
                </Link>
              ))}
            </Reveal>
          </aside>
        </div>
      </Section>

      <Querverweise items={QUERVERWEISE} />
      <CtaBand eyebrow="Vom Lesen zum Handeln" title="Genug gelesen? Dann rechnen wir es für Sie durch." />
    </div>
  );
}
