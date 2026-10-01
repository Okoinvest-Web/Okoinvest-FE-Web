import Link from "next/link";
import { ArrowUpRight, ChevronDown, Info } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import { TOOLS } from "./tools";
import { STAND } from "@/lib/rechner/annahmen";
import "./rechner.css";

import { SITE } from "@/data/site";

const BASE = SITE.url;

/** Metadaten für eine Rechner-Seite */
export function rechnerMetadata({ pfad, title, description, keywords = [] }) {
  const url = `${BASE}${pfad}`;
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      url,
      siteName: "ÖkoInvest",
      title,
      description,
      images: [{ url: `${BASE}/img/solarpark-himmel.jpg`, width: 1280, height: 852, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`${BASE}/img/solarpark-himmel.jpg`] },
  };
}

/**
 * Gemeinsamer Seitenrahmen aller Rechner: kompakter dunkler Hero, Rechner
 * überlappend darunter (above the fold), Erklärung + Annahmen, FAQ,
 * weitere Tools, Querverweise und Abschluss-CTA. Liefert WebApplication-Schema.
 */
export default function RechnerSeite({
  pfad,
  toolId,
  breadcrumb,
  eyebrow,
  title,
  lead,
  chips = [],
  app,
  rechner,
  erklaerung,
  annahmen = [],
  quellen = [],
  faq = [],
  faqTitel = "Häufige Fragen",
  querverweise = [],
  cta,
}) {
  const url = `${BASE}${pfad}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${url}/#app`,
        name: app.name,
        url,
        description: app.description,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        browserRequirements: "Requires JavaScript",
        inLanguage: "de-DE",
        isAccessibleForFree: true,
        featureList: app.featureList,
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
        publisher: { "@id": `${BASE}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${url}/#webpage`,
        url,
        name: app.name,
        isPartOf: { "@id": `${BASE}/#website` },
        about: { "@id": `${BASE}/#organization` },
        dateModified: new Date().toISOString().split("T")[0],
        mainEntity: { "@id": `${url}/#app` },
      },
    ],
  };

  return (
    <div className="ov-rechnerseite">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* Kopf nur für Druck/PDF */}
      <div className="ov-druck-ein mb-6 hidden px-1">
        <p className="font-display text-[22px] font-extrabold text-ink-900">{app.name} · ÖkoInvest</p>
        <p className="text-[13px] text-ink-600">
          {url} · Stand der Annahmen {STAND} · Orientierung, kein Angebot
        </p>
      </div>

      <div className="ov-druck-aus">
      <PageHero
        variant="dark"
        breadcrumbs={[{ name: "Rechner & Tools", href: "/rechner" }, { name: breadcrumb }]}
        eyebrow={eyebrow}
        title={title}
        lead={lead}
        points={chips}
        className="[&>div.ov-container]:pb-28 md:[&>div.ov-container]:pb-36"
      />
      </div>

      {/* Rechner überlappt den Hero – sofort sichtbar */}
      <section aria-label="Rechner" className="relative z-10 -mt-20 pb-6 md:-mt-28 md:pb-10 print:mt-0">
        <div className="ov-container">{rechner}</div>
      </section>

      <Section tone="white" space="md">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="ov-druck-aus">{erklaerung}</div>
          <Reveal>
            <AnnahmenBox punkte={annahmen} quellen={quellen} />
          </Reveal>
        </div>
      </Section>

      <div className="ov-druck-aus">
      {faq.length > 0 && (
        <Section tone="sand" space="md">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <SectionHeading
              eyebrow="Häufige Fragen"
              title={faqTitel}
              lead="Ihre Frage ist nicht dabei? Unser Projektteam beantwortet sie persönlich."
            />
            <Faq items={faq} />
          </div>
        </Section>
      )}

      <WeitereRechner ohne={toolId} />
      <Querverweise items={querverweise} />
      <CtaBand {...cta} />
      </div>
    </div>
  );
}

const ANNAHMEN_SICHTBAR = 6;

function AnnahmenZeilen({ punkte }) {
  return punkte.map(([k, v]) => (
    <div key={k} className="flex items-baseline justify-between gap-4 py-2.5 text-[14px]">
      <dt className="text-ink-600">{k}</dt>
      <dd className="ov-num shrink-0 text-right font-semibold text-ink-900">{v}</dd>
    </div>
  ));
}

/**
 * Annahmen & Grenzen eines Rechners. Sprungziel #annahmen (Werkzeugleiste
 * unter dem Ergebnis). Ab sieben Punkten bleiben die ersten sechs sichtbar,
 * der Rest steht in einem Aufklapper – im Druck immer vollständig.
 */
export function AnnahmenBox({ punkte = [], quellen = [] }) {
  const sichtbar = punkte.length > ANNAHMEN_SICHTBAR + 1 ? punkte.slice(0, ANNAHMEN_SICHTBAR) : punkte;
  const rest = punkte.length > ANNAHMEN_SICHTBAR + 1 ? punkte.slice(ANNAHMEN_SICHTBAR) : [];
  return (
    <aside id="annahmen" aria-labelledby="annahmen-titel" className="scroll-mt-28 rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/70 md:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-ov-600 ring-1 ring-ink-200">
          <Info aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <h2 id="annahmen-titel" className="font-display text-[19px] font-bold text-ink-900">Annahmen & Grenzen</h2>
          <p className="text-[12.5px] text-ink-500">Stand {STAND} · Orientierung, kein Angebot</p>
        </div>
      </div>
      <dl className="mt-6 divide-y divide-ink-200/70">
        <AnnahmenZeilen punkte={sichtbar} />
      </dl>
      {rest.length > 0 && (
        <details className="group border-t border-ink-200/70">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl py-2.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Alle {punkte.length} Annahmen anzeigen</span>
            <span className="hidden group-open:inline">Weniger anzeigen</span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <dl className="animate-ov-einblenden divide-y divide-ink-200/70 border-t border-ink-200/70">
            <AnnahmenZeilen punkte={rest} />
          </dl>
        </details>
      )}
      {quellen.length > 0 && (
        <p className="mt-5 text-[12.5px] leading-relaxed text-ink-500">
          Quellen: {quellen.map((q, i) => (
            <span key={q.name}>
              {i > 0 && " · "}
              {q.url ? (
                <a href={q.url} target="_blank" rel="noopener noreferrer" className="underline decoration-ink-300 underline-offset-2 hover:text-ink-800">
                  {q.name}
                </a>
              ) : (
                q.name
              )}
            </span>
          ))}
        </p>
      )}
    </aside>
  );
}

export function WeitereRechner({ ohne, titel = "Weitere Rechner & Tools" }) {
  const liste = TOOLS.filter((t) => t.id !== ohne).slice(0, 6);
  return (
    <section aria-labelledby="weitere-rechner" className="bg-white">
      <div className="ov-container pt-16 md:pt-24">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-ink-200 pb-6">
          <h2 id="weitere-rechner" className="ov-h3 text-ink-900 md:text-[28px]">{titel}</h2>
          <Link href="/rechner" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-ov-700 hover:text-ov-800">
            Alle Tools <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {liste.map((t, i) => {
            const Icon = t.icon;
            return (
              <Reveal as="li" key={t.id} delay={i * 60} className="flex">
                <Link
                  href={t.href}
                  className="group ov-lift flex w-full items-start gap-4 rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 transition-colors hover:bg-white hover:ring-ov-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ov-600 ring-1 ring-ink-200 transition-colors group-hover:bg-ov-500 group-hover:text-white group-hover:ring-ov-500">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-[17px] font-bold leading-snug text-ink-900">{t.titel}</span>
                    <span className="mt-1 block text-[14px] leading-relaxed text-ink-600">{t.kurz}</span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
