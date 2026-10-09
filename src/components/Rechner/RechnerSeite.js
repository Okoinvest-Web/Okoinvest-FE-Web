import Link from "@/components/Land/Link";
import { ArrowUpRight, ChevronDown, Info } from "lucide-react";
import RechnerKopf from "./RechnerKopf";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import { TOOLS, TOOL_BEGRIFFE_EN, toolsFuer } from "./tools";
import { STAND } from "@/lib/rechner/annahmen";
import { STAND_RECHENLOGIK } from "@/lib/invest/markt";
import JsonLd from "@/components/JsonLd";
import "./rechner.css";

import { SITE } from "@/data/site";
import { LAENDER, landHinweisText, landHinweisTextEn, pfad as seitenPfad } from "@/lib/land";
import { landDerAnfrage, spracheDerAnfrage } from "@/lib/land/seite";
import { datumText } from "@/lib/sprache/format";
import { uebersetze } from "@/lib/sprache/woerterbuch";

// Sprachmodell: feste Texte des Rahmens (die Seiten geben ihre eigenen Texte schon übersetzt mit)
const TEXTE = {
  de: {
    druck: (url, stand) => `${url} · Stand der Annahmen ${stand} · Orientierung, kein Angebot`,
    rechner: "Rechner",
    methodik: "Methodik",
    themaRechenwerte: "Rechenwerte",
    themaAnnahmen: "Annahmen und Rechenwerte",
    faqEyebrow: "Häufige Fragen",
    faqTitel: "Häufige Fragen",
    faqLead: "Ihre Frage ist nicht dabei? Unser Projektteam beantwortet sie persönlich.",
    nurLand: (fuerLand, rest) => `Dieser Rechner rechnet mit Recht und Werten ${fuerLand}. ${rest}.`,
  },
  en: {
    druck: (url, stand) => `${url} · Assumptions as of ${stand} · For guidance only, not an offer`,
    rechner: "Calculator",
    methodik: "Methodology",
    themaRechenwerte: "Figures",
    themaAnnahmen: "Assumptions and figures",
    faqEyebrow: "Frequently asked questions",
    faqTitel: "Frequently asked questions",
    faqLead: "Your question isn’t here? Our project team will answer it personally.",
    nurLand: (fuerLand, rest) => `This calculator uses the law and figures ${fuerLand}. ${rest}.`,
  },
};

const BOX = {
  de: { titel: "Annahmen & Grenzen", stand: "Stand", orientierung: "Orientierung, kein Angebot", alle: (n) => `Alle ${n} Annahmen anzeigen`, weniger: "Weniger anzeigen", quellen: "Quellen:" },
  en: { titel: "Assumptions & limits", stand: "As of", orientierung: "for guidance only, not an offer", alle: (n) => `Show all ${n} assumptions`, weniger: "Show less", quellen: "Sources:" },
};

const WEITER = {
  de: { eyebrow: "Weiterrechnen", titel: "Weitere Rechner & Tools", alle: (n) => `Alle ${n} Tools`, oeffnen: "Öffnen", mehr: "Mehr zum Thema" },
  en: { eyebrow: "Keep calculating", titel: "More calculators & tools", alle: (n) => `All ${n} tools`, oeffnen: "Open", mehr: "More on this topic" },
};
import { GiltFuer, LandHinweis } from "@/components/Land/LandHinweis";

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
      locale: "de_DE",
      url,
      siteName: "ÖkoInvest",
      title,
      description,
      images: [{ url: `${BASE}/img/solarpark-himmel.jpg`, width: 1280, height: 852, alt: "Solarpark unter blauem Himmel" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`${BASE}/img/solarpark-himmel.jpg`] },
  };
}

/**
 * Englische Metadaten einer Rechner-Seite (Sprachmodell) – für seitenMetadata(pfad, metadata, { en: … }).
 * Wird tief über rechnerMetadata() gelegt; Schlüsselwörter ersetzen die deutsche Liste vollständig.
 */
export function rechnerMetadataEn({ title, description, keywords }) {
  return {
    title,
    description,
    ...(keywords ? { keywords: () => keywords } : {}),
    openGraph: { title, description, images: [{ alt: "Solar park under a blue sky" }] },
    twitter: { title, description },
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
  faqTitel,
  querverweise = [],
  cta,
}) {
  // Ländermodell: Land der Seite (null = gemeinsam). Rechner, die im Land nicht richtig rechnen
  // (tools.js: laender), und die Annahmen mit deutschen Werten zeigen in AT/CH den LandHinweis.
  const land = landDerAnfrage();
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  const tool = TOOLS.find((t) => t.id === toolId);
  const rechnetImLand = !land || !tool?.laender || tool.laender.includes(land);
  // Die Annahmen-Werte gelten für ein Land: bei Rechnern nur für ein Land dieses, sonst Deutschland
  const annahmenLand = tool?.laender?.length === 1 ? tool.laender[0] : "DE";
  const annahmenModus = !land ? "gemeinsam" : land === annahmenLand ? "zeigen" : "hinweis";
  // Rechner nur für ein anderes Land (z. B. EAG-Rechner für Österreich): das offen sagen
  const hinweisText =
    tool?.laender?.length === 1 && land && !tool.laender.includes(land)
      ? t.nurLand(LAENDER[tool.laender[0]].fuerLand, landHinweisText(land))
      : undefined;
  const hinweisTextEn =
    hinweisText && en ? TEXTE.en.nurLand(LAENDER[tool.laender[0]].en.fuerLand, landHinweisTextEn(land)) : undefined;
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
        inLanguage: en ? "en" : "de-DE",
        isAccessibleForFree: true,
        featureList: app.featureList,
        publisher: { "@id": `${BASE}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${url}/#webpage`,
        url,
        name: app.name,
        isPartOf: { "@id": `${BASE}/#website` },
        about: { "@id": `${BASE}/#organization` },
        // Stand der Rechenlogik statt Build-/Abrufdatum (Paket E): ändert sich nur bei echter Änderung an markt.js/Rechnern
        dateModified: STAND_RECHENLOGIK,
        mainEntity: { "@id": `${url}/#app` },
      },
    ],
  };

  return (
    <div className="ov-rechnerseite">
      <JsonLd daten={schema} />

      {/* Kopf nur für Druck/PDF */}
      <div className="ov-druck-ein mb-6 hidden px-1">
        <p className="font-display text-[22px] font-extrabold text-ink-900">{app.name} · ÖkoInvest</p>
        <p className="text-[13px] text-ink-600">
          {t.druck(url, datumText(STAND, sprache))}
        </p>
      </div>

      <div className="ov-druck-aus">
      <RechnerKopf toolId={toolId} breadcrumb={breadcrumb} eyebrow={eyebrow} title={title} lead={lead} chips={chips} app={app} />
      </div>

      {/* Rechner überlappt den Hero – sofort sichtbar */}
      <section id="rechner" aria-label={t.rechner} className="relative z-10 -mt-20 scroll-mt-24 pb-6 md:-mt-28 md:pb-10 print:mt-0">
        <div className="ov-container">{rechnetImLand ? rechner : <LandHinweis land={land} thema={TEXTE.de.themaRechenwerte} themaEn={TEXTE.en.themaRechenwerte} text={hinweisText} textEn={hinweisTextEn} className="shadow-e2" />}</div>
      </section>

      <Section tone="white" space="md">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 xl:gap-24">
          <div className="ov-druck-aus min-w-0">
            <p className="mb-5 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-ov-700">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-500" />
              {t.methodik}
            </p>
            <div className="ov-rechner-methodik max-w-[42rem]">{erklaerung}</div>
          </div>
          <Reveal className="min-w-0 lg:sticky lg:top-28">
            {annahmenModus === "hinweis" ? (
              <LandHinweis land={land} thema={TEXTE.de.themaAnnahmen} themaEn={TEXTE.en.themaAnnahmen} />
            ) : (
              <AnnahmenBox punkte={annahmen} quellen={quellen} giltFuer={annahmenModus === "gemeinsam" ? annahmenLand : null} />
            )}
          </Reveal>
        </div>
      </Section>

      <div className="ov-druck-aus">
      {faq.length > 0 && (
        <Section tone="sand" space="md">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <SectionHeading eyebrow={t.faqEyebrow} title={faqTitel ?? t.faqTitel} lead={t.faqLead} />
            <Faq items={faq} />
          </div>
        </Section>
      )}

      <WeitereRechner ohne={toolId} verweise={querverweise} />
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
export function AnnahmenBox({ punkte = [], quellen = [], giltFuer = null }) {
  const sprache = spracheDerAnfrage();
  const b = BOX[sprache] || BOX.de;
  const sichtbar = punkte.length > ANNAHMEN_SICHTBAR + 1 ? punkte.slice(0, ANNAHMEN_SICHTBAR) : punkte;
  const rest = punkte.length > ANNAHMEN_SICHTBAR + 1 ? punkte.slice(ANNAHMEN_SICHTBAR) : [];
  return (
    <aside id="annahmen" aria-labelledby="annahmen-titel" className="scroll-mt-28 rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/70 md:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-ov-600 ring-1 ring-ink-200">
          <Info aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <h2 id="annahmen-titel" className="font-display text-[19px] font-bold text-ink-900">{b.titel}</h2>
          <p className="text-[12.5px] text-ink-500">
            {b.stand} {datumText(STAND, sprache)} · {b.orientierung}
            {giltFuer && (
              <>
                {" "}
                <GiltFuer land={giltFuer} />
              </>
            )}
          </p>
        </div>
      </div>
      <dl className="mt-6 divide-y divide-ink-200/70">
        <AnnahmenZeilen punkte={sichtbar} />
      </dl>
      {rest.length > 0 && (
        <details className="group border-t border-ink-200/70">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl py-2.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">{b.alle(punkte.length)}</span>
            <span className="hidden group-open:inline">{b.weniger}</span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <dl className="animate-ov-einblenden divide-y divide-ink-200/70 border-t border-ink-200/70">
            <AnnahmenZeilen punkte={rest} />
          </dl>
        </details>
      )}
      {quellen.length > 0 && (
        <p className="mt-5 text-[12.5px] leading-relaxed text-ink-500">
          {b.quellen} {quellen.map((q, i) => (
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

const TAG_TON = {
  Neu: "bg-ov-100 text-ov-800",
  Profi: "bg-sun-100 text-sun-700",
  Beliebt: "bg-navy-50 text-navy-700",
};

function passendeTools(ohne, anzahl, ausser = [], sprache = "de") {
  const alle = toolsFuer(sprache);
  const aktuell = alle.find((t) => t.id === ohne);
  const andere = alle.filter((t) => t.id !== ohne && !ausser.includes(t.href));
  const sortiert = aktuell ? [...andere.filter((t) => t.zielgruppe === aktuell.zielgruppe), ...andere.filter((t) => t.zielgruppe !== aktuell.zielgruppe)] : andere;
  return sortiert.slice(0, anzahl);
}

function ToolKachel({ t, w = WEITER.de, en = false }) {
  const Icon = t.icon;
  const tagText = en ? TOOL_BEGRIFFE_EN.tag[t.tag] ?? t.tag : t.tag;
  const tag = (klasse) => t.tag && <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${TAG_TON[t.tag] || "bg-ink-100 text-ink-700"} ${klasse}`}>{tagText}</span>;
  return (
    <Link
      href={t.href}
      className="group ov-lift flex w-full gap-4 rounded-3xl bg-gradient-to-br from-sand-50 to-white p-5 ring-1 ring-ink-200/70 transition-colors hover:ring-ov-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 sm:flex-col sm:gap-0 md:p-6"
    >
      <span className="flex shrink-0 items-start justify-between gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ov-600 shadow-e2 ring-1 ring-ink-200/70 transition-colors duration-200 group-hover:bg-ov-600 group-hover:text-white group-hover:ring-ov-600">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        {tag("max-sm:hidden")}
      </span>
      <span className="min-w-0 flex-1 sm:mt-4 sm:flex sm:flex-col">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-display text-[17px] font-bold leading-snug text-ink-900">{t.titel}</span>
          {tag("sm:hidden !py-0.5")}
        </span>
        <span className="mt-1 block text-[14px] leading-relaxed text-ink-600">{t.kurz}</span>
        <span className="mt-auto hidden items-center gap-1.5 pt-4 text-[14px] font-semibold text-ov-700 sm:inline-flex">
          {w.oeffnen}
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </span>
      </span>
      <ArrowUpRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ink-400 sm:hidden" />
    </Link>
  );
}

/**
 * Weitere Rechner – Werkzeuge derselben Zielgruppe zuerst. Mit `verweise`
 * (Querverweise der Seite: [{ href, titel, text }]) steht daneben eine
 * dunkle Spalte „Mehr zum Thema“. Signatur rückwärtskompatibel ({ ohne, titel }).
 */
export function WeitereRechner({ ohne, titel: eigenerTitel, verweise = [] }) {
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const w = WEITER[sprache] || WEITER.de;
  const titel = eigenerTitel ?? w.titel;
  const mitVerweisen = verweise.length > 0;
  const liste = passendeTools(ohne, mitVerweisen ? 4 : 6, verweise.map((v) => v.href), sprache);
  return (
    <section aria-labelledby="weitere-rechner" className="bg-white">
      <div className="ov-container pb-4 pt-16 md:pt-24">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-ov-700">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-500" />
              {w.eyebrow}
            </p>
            <h2 id="weitere-rechner" className="ov-h3 text-ink-900 md:text-[28px]">{titel}</h2>
          </div>
          <Link
            href={seitenPfad("/rechner")}
            className="group inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-[15px] font-semibold text-ov-700 hover:text-ov-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
          >
            {w.alle(TOOLS.length)}
            <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </div>
        <div className={mitVerweisen ? "grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-5" : undefined}>
          <ul className={`grid gap-3 sm:grid-cols-2 lg:gap-4 ${mitVerweisen ? "lg:h-full lg:auto-rows-fr" : "lg:grid-cols-3"}`}>
            {liste.map((t, i) => (
              <Reveal as="li" key={t.id} delay={i * 50} className="flex">
                <ToolKachel t={t} w={w} en={en} />
              </Reveal>
            ))}
          </ul>
          {mitVerweisen && (
            <Reveal delay={120} className="min-w-0">
              <nav aria-labelledby="mehr-zum-thema" className="ov-verlauf-nacht ov-noise relative h-full overflow-hidden rounded-3xl p-6 text-white shadow-kante md:p-7">
                <h3 id="mehr-zum-thema" className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-ov-300">{w.mehr}</h3>
                <ul className="mt-4 divide-y divide-white/10">
                  {verweise.map((v) => (
                    <li key={v.href}>
                      <Link
                        href={v.href}
                        className="group flex items-start justify-between gap-4 rounded-xl py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
                      >
                        <span className="min-w-0">
                          <span className="block font-display text-[16px] font-bold leading-snug text-white transition-colors group-hover:text-ov-200">{v.titel}</span>
                          {v.text && <span className="mt-1 block text-[13.5px] leading-relaxed text-white/65">{v.text}</span>}
                        </span>
                        <ArrowUpRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ov-300 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
