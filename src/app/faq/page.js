import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import FaqSuche from "@/components/Faq/FaqSuche";
import { FAQ_GRUPPEN } from "@/data/faq";
import { abs } from "@/data/site";

const PFAD = "/faq";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "FAQ: Solarpark, Agri-PV, Projektbörse, Strom | ÖkoInvest",
  description:
    "Antworten für Flächeneigentümer, Landwirte, Investoren, Projektanbieter und Unternehmen: Pacht, Agri-PV, Projektbörse, Reststrom-Pool, Portal und Datenschutz.",
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <PageHero
        variant="dark"
        breadcrumbs={[{ name: "Wissen", href: "/ratgeber" }, { name: "FAQ" }]}
        eyebrow="Häufige Fragen"
        title={
          <>
            Kurz gefragt, <span className="ov-text-gradient-light">klar beantwortet.</span>
          </>
        }
        lead={`${alle.length} Antworten für Flächeneigentümer, Landwirte, Investoren, Projektanbieter und Unternehmen – durchsuchbar und nach Thema gefiltert.`}
        points={FAQ_GRUPPEN.map((g) => g.titel)}
      />

      <Section tone="sand" space="lg" className="pt-12 md:pt-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
          <FaqSuche gruppen={FAQ_GRUPPEN} />
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <Reveal className="relative overflow-hidden rounded-3xl bg-navy-950 p-7 text-white">
              <div aria-hidden="true" className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ov-500/30 blur-[80px]" />
              <MessageCircle aria-hidden="true" className="relative h-7 w-7 text-ov-300" />
              <h2 className="relative mt-5 font-display text-[21px] font-extrabold leading-tight">Ihre Frage ist nicht dabei?</h2>
              <p className="relative mt-3 text-[15px] leading-relaxed text-white/70">
                Schreiben Sie uns – unser Projektteam antwortet in der Regel innerhalb von zwei Werktagen.
              </p>
              <Link
                href="/kontakt"
                className="group relative mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white hover:bg-ov-700"
              >
                Frage stellen
                <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </aside>
        </div>
      </Section>

      <Querverweise items={QUERVERWEISE} />
      <CtaBand eyebrow="Vom Lesen zum Handeln" title="Genug gelesen? Dann rechnen wir es für Sie durch." />
    </div>
  );
}
