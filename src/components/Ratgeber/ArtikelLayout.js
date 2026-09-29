import { Calculator } from "lucide-react";

import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import CtaBand from "@/components/ui/CtaBand";
import Button from "@/components/ui/Button";
import ReadingProgress from "./ReadingProgress";
import TableOfContents from "./TableOfContents";
import Teilen from "@/components/ui/Teilen";
import { artikelPfad } from "@/lib/ratgeber";
import { ArtikelMeta, Autorenbox, WeitereArtikel } from "./Bausteine";
import KiZusammenfassen from "./KiZusammenfassen";

const BASE_URL = "https://www.oekovolt.de";
const TEILEN_NETZE = ["whatsapp", "linkedin", "facebook", "xing", "x", "telegram"];

/**
 * Gemeinsames Gerüst aller Ratgeber-Artikel (Magazin-Look):
 * Artikel-Hero mit Autor/Lesezeit → Text mit klebendem Inhaltsverzeichnis
 * → Autorenbox → Weiterlesen → Abschluss-CTA.
 *
 * props:
 *  artikel   Eintrag aus @/lib/ratgeber
 *  toc       [{ id, label }]
 *  titel     h1 (JSX erlaubt)
 *  badge     JSX – schwebende Kennzahl auf dem Hero-Bild
 *  seitenCta { titel, text, href, label } – Karte unter dem Inhaltsverzeichnis
 *  cta       Props für <CtaBand/>
 */
export default function ArtikelLayout({ artikel, toc, titel, badge, seitenCta, cta = {}, children }) {
  const url = `${BASE_URL}${artikelPfad(artikel.slug)}`;
  const teilenText = artikel.excerpt || artikel.description;

  return (
    <>
      <ReadingProgress />

      <PageHero
        breadcrumbs={[{ name: "Ratgeber", href: "/ratgeber" }, { name: artikel.kurzTitel }]}
        eyebrow={artikel.kategorie}
        title={titel || artikel.title}
        lead={artikel.excerpt}
        image={{ src: artikel.bild, alt: artikel.bildAlt }}
        badge={badge}
      >
        <ArtikelMeta artikel={artikel} />
      </PageHero>

      <Section tone="white" space="none" className="pb-16 pt-10 md:pb-24 md:pt-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_270px] lg:gap-14 xl:gap-20">
          <article className="min-w-0">
            <TableOfContents items={toc} variant="mobile" />
            <div className="max-w-[52rem]">
              <KiZusammenfassen url={url} titel={artikel.title} className="mb-10 rounded-2xl bg-sand-50 px-4 py-3.5 ring-1 ring-ink-200/60 md:px-5" />
              {children}
              <div className="mt-14 flex flex-col gap-3 rounded-3xl border border-ink-200 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
                <p className="font-display text-[17px] font-bold text-ink-900">Hilfreich? Teilen Sie den Artikel.</p>
                <Teilen url={url} titel={artikel.title} text={teilenText} netze={TEILEN_NETZE} kampagne="ratgeber" kompakt />
              </div>
              <Autorenbox artikel={artikel} />
            </div>
          </article>

          {/* kein <aside>: Seitenleiste liegt innerhalb des Hauptinhalts (landmark-complementary-is-top-level) */}
          <div className="hidden lg:block">
            <div className="sticky top-28 space-y-6">
              <TableOfContents items={toc} variant="desktop" />
              <Teilen url={url} titel={artikel.title} text={teilenText} netze={["whatsapp", "linkedin", "facebook"]} kampagne="ratgeber" label="Artikel teilen" className="border-t border-ink-100 pt-5" />
              {seitenCta && (
                <div className="ov-noise relative overflow-hidden rounded-3xl bg-navy-950 p-6 text-white">
                  <div aria-hidden="true" className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-ov-500/35 blur-3xl" />
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-ov-300">
                    <Calculator aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <p className="relative mt-4 font-display text-[18px] font-extrabold leading-snug">{seitenCta.titel}</p>
                  <p className="relative mt-2 text-[14px] leading-relaxed text-white/65">{seitenCta.text}</p>
                  <Button href={seitenCta.href} size="sm" pfeil className="relative mt-5 w-full">
                    {seitenCta.label}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section tone="sand" space="md">
        <SectionHeading eyebrow="Weiterlesen" title="Mehr aus dem Ratgeber" className="mb-10" />
        <WeitereArtikel slug={artikel.slug} />
      </Section>

      <CtaBand {...cta} />
    </>
  );
}
