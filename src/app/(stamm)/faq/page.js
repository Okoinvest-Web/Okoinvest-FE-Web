import Link from "@/components/Land/Link";
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
import { FAQ_GRUPPEN_EN } from "@/data/faq-en";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand } from "@/components/Land/Laenderteile";

const PFAD = seitenPfad("/faq");

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "FAQ: Solarpark, Agri-PV, Projektbörse, Strom | ÖkoInvest",
  description:
    "Antworten für Flächeneigentümer, Landwirte, Investoren, Anbieter und Unternehmen: Pacht, Agri-PV, Projektbörse, Reststrom-Pool, Portal und Datenschutz.",
  keywords: ["FAQ Solarpark", "Pacht Solarpark Fragen", "Agri-PV FAQ", "Projektbörse Photovoltaik", "Reststrom-Pool"],
});

const metadataEn = {
  title: "FAQ: solar parks, agri-PV, project exchange, power | ÖkoInvest",
  description:
    "Answers for landowners, farmers, investors, project sellers and businesses: lease, agri-PV, project exchange, residual power pool, portal and data protection.",
  keywords: ["solar park FAQ", "solar park lease questions", "agri-PV FAQ", "photovoltaic project exchange", "residual power pool"],
};

// FAQPage-Schema über alle Fragen (ohne Doppelungen), in der Sprache der Seite
const alleFragen = (gruppen) => [...new Map(gruppen.flatMap((g) => g.items).map((it) => [it.q, it])).values()];
const schemaFuer = (alle, sprache) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${abs(PFAD)}/#faq`,
  url: abs(PFAD),
  inLanguage: sprache === "en" ? "en" : "de",
  mainEntity: alle.map((it) => ({
    "@type": "Question",
    name: it.q,
    acceptedAnswer: { "@type": "Answer", text: typeof it.a === "string" ? it.a : it.aText || "" },
  })),
});

const DE = {
  wissen: "Wissen",
  eyebrow: "Häufige Fragen",
  titel: (
    <>
      Kurz gefragt, <span className="ov-text-gradient-light">klar beantwortet.</span>
    </>
  ),
  lead: (n) => `${n} Antworten für Flächeneigentümer, Landwirte, Investoren, Projektanbieter und Unternehmen – durchsuchbar und nach Thema gefiltert.`,
  durchsuchen: "Fragen durchsuchen",
  stellen: "Frage stellen",
  nichtDabei: "Ihre Frage ist nicht dabei?",
  schreiben: "Schreiben Sie uns – unser Projektteam meldet sich persönlich.",
  weiterMit: "Weiter mit",
  links: [
    { titel: "Projektprozess", text: "Schritte, Dauer, Dokumente" },
    { titel: "Selbst rechnen", text: "Pacht, Rendite, Reststrom" },
  ],
  querverweise: [
    { href: seitenPfad("/prozess"), titel: "Projektprozess", text: "Schritte, Dauer und Dokumente – für jede Zielgruppe." },
    { href: seitenPfad("/rechner"), titel: "Rechner & Tools", text: "Pacht, Rendite, Projektwert und Reststrom selbst durchrechnen." },
    { href: "/wissen/lexikon", titel: "Lexikon", text: "Von Aufstellungsbeschluss bis Zuschlagswert." },
  ],
  ctaEyebrow: "Vom Lesen zum Handeln",
  ctaTitel: "Genug gelesen? Dann rechnen wir es für Sie durch.",
};

const EN = {
  wissen: "Knowledge",
  eyebrow: "Frequently asked questions",
  titel: (
    <>
      Short questions, <span className="ov-text-gradient-light">clear answers.</span>
    </>
  ),
  lead: (n) => `${n} answers for landowners, farmers, investors, project sellers and businesses – searchable and filterable by topic.`,
  durchsuchen: "Search questions",
  stellen: "Ask a question",
  nichtDabei: "Can’t find your question?",
  schreiben: "Write to us – our project team will get back to you personally.",
  weiterMit: "Continue with",
  links: [
    { titel: "Project process", text: "Steps, duration, documents" },
    { titel: "Calculate yourself", text: "Lease, returns, residual power" },
  ],
  querverweise: [
    { titel: "Project process", text: "Steps, duration and documents – for every audience." },
    { titel: "Calculators & tools", text: "Work out lease, returns, project value and residual power yourself." },
    { titel: "Glossary", text: "From the decision to draw up a development plan (Aufstellungsbeschluss) to the award value." },
  ],
  ctaEyebrow: "From reading to action",
  ctaTitel: "Read enough? Then we’ll do the maths for you.",
};

export default async function FaqPage({ params }) {
  // Antworten mit deutschen Werten/Regeln: gemeinsam mit „(gilt für Deutschland)“, in AT/CH LandHinweis
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const t = uebersetze({ de: DE, en: EN }, sprache);
  const quelle = uebersetze({ de: FAQ_GRUPPEN, en: FAQ_GRUPPEN_EN }, sprache);
  const alle = alleFragen(quelle);
  const schema = schemaFuer(alle, sprache);
  const gruppen = quelle.map((g) => ({ ...g, items: faqFuerLand(g.items, land, { sprache }) }));
  return (
    <div>
      <JsonLd daten={schema} />

      <NachtHero
        mitLeiste
        breadcrumbs={[{ name: t.wissen, href: "/ratgeber" }, { name: "FAQ" }]}
        eyebrow={t.eyebrow}
        title={t.titel}
        lead={t.lead(alle.length)}
        actions={[
          { label: t.durchsuchen, href: "#suche" },
          { label: t.stellen, href: "/kontakt" },
        ]}
        buehne={<ThemenKacheln gruppen={quelle} sprache={sprache} />}
      />

      <Section tone="sand" space="none" id="suche" className="scroll-mt-20 pb-20 md:pb-32">
        <div className="relative z-10 -mt-12 grid gap-8 md:-mt-16 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          <FaqSuche gruppen={gruppen} />
          <aside className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
            <Reveal className="ov-verlauf-nacht ov-noise relative overflow-hidden rounded-3xl p-7 text-white shadow-e4">
              <MessageCircle aria-hidden="true" className="relative h-7 w-7 text-ov-300" />
              <h2 className="relative mt-5 font-display text-[21px] font-extrabold leading-tight">{t.nichtDabei}</h2>
              <p className="relative mt-3 text-[15px] leading-relaxed text-white/75">{t.schreiben}</p>
              <Link
                href="/kontakt"
                className="group relative mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
              >
                {t.stellen}
                <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
              </Link>
            </Reveal>
            <Reveal delay={80} className="rounded-3xl bg-white p-2 shadow-e1 ring-1 ring-ink-200/70">
              <h2 className="sr-only">{t.weiterMit}</h2>
              {[
                { icon: Route, href: seitenPfad("/prozess"), ...t.links[0] },
                { icon: Calculator, href: seitenPfad("/rechner"), ...t.links[1] },
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

      <Querverweise items={t.querverweise} />
      <CtaBand eyebrow={t.ctaEyebrow} title={t.ctaTitel} />
    </div>
  );
}

export const generateMetadata = seitenMetadata("/faq", metadata, { en: metadataEn });
