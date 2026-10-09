// src/app/ratgeber/[slug]/page.js
//
// Rendert alle inhaltsgetriebenen Ratgeber-Artikel aus src/content/ratgeber.

import { notFound } from "next/navigation";

import ArtikelLayout from "@/components/Ratgeber/ArtikelLayout";
import ArtikelInhalt from "@/components/Ratgeber/ArtikelInhalt";
import { klartext } from "@/components/Ratgeber/InlineText";
import { INHALTS_ARTIKEL, artikelInSprache, artikelPfad } from "@/lib/ratgeber";
import { SITE, abs } from "@/data/site";
import JsonLd from "@/components/JsonLd";
import { seitenLand, seitenMetadata, spracheAusParams, spracheDerAnfrage } from "@/lib/land/seite";

const BASE_URL = SITE.url;

export const dynamicParams = false;

export function generateStaticParams() {
  return INHALTS_ARTIKEL.map((a) => ({ slug: a.slug }));
}

const finde = (slug) => INHALTS_ARTIKEL.find((a) => a.slug === slug);

async function basisMetadata({ params }) {
  const p = await params;
  const roh = finde(p.slug);
  if (!roh) return {};
  // Englisch: Metadaten aus der englischen Fassung (Titel und Beschreibung gibt es für alle Artikel)
  const a = artikelInSprache(roh, spracheAusParams(p));
  const url = abs(artikelPfad(a.slug));
  const bild = abs(a.bild);
  return {
    title: a.seoTitle || `${a.kurzTitel || a.title} | ÖkoInvest`,
    description: a.description,
    keywords: a.keywords,
    alternates: { canonical: url },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: {
      type: "article",
      url,
      siteName: "ÖkoInvest",
      locale: "de_DE",
      title: a.title,
      description: a.description,
      publishedTime: a.veroeffentlicht,
      modifiedTime: a.aktualisiert,
      section: a.kategorie,
      images: [{ url: bild, alt: a.bildAlt }],
    },
    twitter: { card: "summary_large_image", title: a.title, description: a.description, images: [bild] },
  };
}

export const generateMetadata = seitenMetadata(({ slug }) => artikelPfad(slug), (land, p) => basisMetadata({ params: p }));

export default async function RatgeberArtikelPage({ params }) {
  await seitenLand(params);
  const { slug } = await params;
  const roh = finde(slug);
  if (!roh) notFound();
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const a = artikelInSprache(roh, sprache);

  const url = abs(artikelPfad(a.slug));

  const toc = [
    ...(a.kurzFazit?.length ? [{ id: "kurz", label: en ? "Key points at a glance" : "Das Wichtigste in Kürze" }] : []),
    ...a.abschnitte.map((s) => ({ id: s.id, label: s.tocLabel || s.titel })),
    ...(a.faq?.length ? [{ id: "faq", label: en ? "Frequently asked questions" : "Häufige Fragen" }] : []),
  ];

  const graph = [
    {
      "@type": "Article",
      "@id": `${url}/#article`,
      headline: a.title,
      description: a.description,
      inLanguage: en && a.englisch ? "en" : "de-DE",
      datePublished: a.veroeffentlicht,
      dateModified: a.aktualisiert,
      author: { "@type": "Organization", "@id": `${BASE_URL}/#organization`, name: "ÖkoInvest", url: BASE_URL },
      publisher: { "@id": `${BASE_URL}/#organization` },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      image: [abs(a.bild)],
      articleSection: a.kategorie,
      keywords: (a.keywords || []).join(", "),
      wordCount: a.woerter,
      timeRequired: `PT${a.lesezeit}M`,
      abstract: (a.kurzFazit || []).map(klartext).join(" "),
      ...(a.quellen?.length ? { citation: a.quellen.map((q) => ({ "@type": "CreativeWork", name: q.titel, url: q.url })) } : {}),
    },
  ];

  if (a.howTo?.schritte?.length) {
    graph.push({
      "@type": "HowTo",
      "@id": `${url}/#howto`,
      name: a.howTo.name,
      inLanguage: en && a.englisch ? "en" : "de-DE",
      step: a.howTo.schritte.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: klartext(s.text) })),
    });
  }

  return (
    <>
      <JsonLd daten={{ "@context": "https://schema.org", "@graph": graph }} />
      <ArtikelLayout
        artikel={a}
        toc={toc}
        kennzahl={a.badge}
        seitenCta={a.seitenCta}
        cta={a.cta}
      >
        <ArtikelInhalt artikel={a} />
      </ArtikelLayout>
    </>
  );
}
