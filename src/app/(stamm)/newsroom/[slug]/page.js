// src/app/(stamm)/newsroom/[slug]/page.js – einzelne Meldung des Newsrooms (Welle 3, Paket NL)
//
// Nur freigegebene Meldungen (src/lib/newsroom.js) – Entwürfe und Vorlagen liefern 404. Inhalt wie Ratgeber
// (ArtikelInhalt: kurzFazit, abschnitte, quellen). Länderfassungen: eine Meldung erscheint nur in den Ländern aus
// m.laender (gemeinsame Seite: immer). noindex wie /newsroom (Register index: false), nicht in der Sitemap.
// Englisch: Meldungen sind deutsch (nicht übersetzt → Hinweis „not yet available in English“ und noindex).

import { notFound } from "next/navigation";
import { FileText, Mail, Megaphone } from "lucide-react";
import Section from "@/components/ui/Section";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ArtikelInhalt from "@/components/Ratgeber/ArtikelInhalt";
import JsonLd from "@/components/JsonLd";
import { GESELLSCHAFT, SITE, abs } from "@/data/site";
import { MELDUNGEN } from "@/content/newsroom";
import { istOeffentlich, meldungNachSlug, meldungPfad, pressekontakt } from "@/lib/newsroom";
import { seitenLand, seitenMetadata } from "@/lib/land/seite";

export const dynamicParams = false;

export function generateStaticParams() {
  return MELDUNGEN.filter(istOeffentlich).map((m) => ({ slug: m.slug }));
}

const TYP = { pressemitteilung: "Pressemitteilung", fachbeitrag: "Fachbeitrag" };

const datumLang = (iso) => {
  const [j, m, t] = String(iso).split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, t)).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

async function basisMetadata(p) {
  const m = meldungNachSlug(p.slug);
  if (!m) return { robots: { index: false, follow: false } };
  return {
    title: `${m.title} | ÖkoInvest`,
    description: m.description,
    alternates: { canonical: abs(meldungPfad(m.slug)) },
    robots: { index: false, follow: true }, // wie /newsroom: erst nach Freigabe des Newsrooms indexieren
    openGraph: { type: "article", url: abs(meldungPfad(m.slug)), siteName: SITE.name, title: m.title, description: m.description, publishedTime: m.datum },
  };
}

export const generateMetadata = seitenMetadata(({ slug }) => meldungPfad(slug), (land, p) => basisMetadata(p));

export default async function MeldungSeite({ params }) {
  const land = await seitenLand(params);
  const { slug } = await params;
  const m = meldungNachSlug(slug);
  if (!m || (land && !m.laender.includes(land))) notFound();
  const presse = pressekontakt();
  const Icon = m.typ === "pressemitteilung" ? Megaphone : FileText;
  const schema = {
    "@context": "https://schema.org",
    "@type": m.typ === "pressemitteilung" ? "NewsArticle" : "Article",
    headline: m.title,
    description: m.description,
    datePublished: m.datum,
    inLanguage: "de",
    ...(m.ort ? { dateline: m.ort } : {}),
    author: { "@type": "Organization", name: GESELLSCHAFT.name, url: abs("/") },
    publisher: { "@id": `${abs("/")}/#organization` },
    mainEntityOfPage: abs(meldungPfad(m.slug)),
    ...(m.quellen?.length ? { citation: m.quellen.map((q) => ({ "@type": "CreativeWork", name: q.titel, url: q.url })) } : {}),
  };

  return (
    <>
      <JsonLd daten={schema} />
      <Section tone="sand" space="none" className="pb-12 pt-6 sm:pt-8 md:pb-16 md:pt-10">
        <Breadcrumbs items={[{ name: "Newsroom", href: "/newsroom" }, { name: m.title }]} className="mb-8 md:mb-12" />
        <div className="max-w-3xl">
          <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ov-50 px-2.5 py-0.5 text-ov-800 ring-1 ring-inset ring-ov-200">
              <Icon aria-hidden="true" className="h-3.5 w-3.5" />
              {TYP[m.typ]}
            </span>
            <span>{[m.ort, datumLang(m.datum)].filter(Boolean).join(", ")}</span>
          </p>
          <h1 className="ov-h1 mt-4 text-balance text-ink-900">{m.title}</h1>
          {m.excerpt && <p className="ov-lead mt-5 text-pretty text-ink-600">{m.excerpt}</p>}
        </div>
      </Section>
      <Section tone="white" space="none" className="pb-16 pt-10 md:pb-24 md:pt-14">
        <article className="mx-auto min-w-0 max-w-3xl">
          <ArtikelInhalt artikel={{ kurzFazit: m.kurzFazit || [], abschnitte: m.abschnitte || [], faq: [], quellen: m.quellen || [] }} />
          {(presse.email || presse.telefon) && (
            <aside className="mt-12 flex items-start gap-3 rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60">
              <Mail aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ov-600" />
              <p className="text-[14.5px] leading-relaxed text-ink-700">
                <strong className="font-semibold text-ink-900">Pressekontakt: </strong>
                {[presse.ansprechpartner, presse.email, presse.telefon].filter(Boolean).join(" · ")}
              </p>
            </aside>
          )}
        </article>
      </Section>
    </>
  );
}
