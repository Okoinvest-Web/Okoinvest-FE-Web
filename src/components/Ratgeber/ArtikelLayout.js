import { Calculator } from "lucide-react";

import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import CtaBand from "@/components/ui/CtaBand";
import Button from "@/components/ui/Button";
import TableOfContents from "./TableOfContents";
import Teilen from "@/components/ui/Teilen";
import { artikelPfad } from "@/lib/ratgeber";
import { abs } from "@/data/site";
import { Autorenbox, WeitereArtikel } from "./Bausteine";
import ArtikelHero from "./ArtikelHero";

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
 *  kennzahl  { wert, text } – schwebende Kennzahl auf dem Hero-Bild
 *  badge     JSX – Alternative zu kennzahl (ältere Aufrufe)
 *  seitenCta { titel, text, href, label } – Karte unter dem Inhaltsverzeichnis
 *  cta       Props für <CtaBand/>
 */
export default function ArtikelLayout({ artikel, toc, titel, kennzahl, badge, seitenCta, cta = {}, children }) {
  const url = abs(artikelPfad(artikel.slug));
  const teilenText = artikel.excerpt || artikel.description;

  return (
    <>
      {/* Lesefortschritt kommt global (ScrollFortschritt im LayoutWrapper) – kein zweiter Balken */}
      <ArtikelHero artikel={artikel} titel={titel} kennzahl={kennzahl} badge={badge} abschnitte={artikel.abschnitte?.length || 0} />

      <Section tone="white" space="none" className="pb-16 pt-10 md:pb-24 md:pt-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_270px] lg:gap-14 xl:gap-20">
          <article className="min-w-0">
            <TableOfContents items={toc} variant="mobile" />
            <div className="max-w-[52rem]">
              {children}
              {seitenCta && <SeitenCta {...seitenCta} className="mt-14 lg:hidden" />}
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
              {seitenCta && <SeitenCta {...seitenCta} />}
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

/** Dunkle Handlungskarte: Rechner oder Seite zum Artikelthema */
function SeitenCta({ titel, text, href, label, className = "" }) {
  return (
    <div className={`ov-verlauf-nacht ov-noise relative isolate overflow-hidden rounded-3xl p-6 text-white md:p-7 ${className}`}>
      <div aria-hidden="true" className="absolute -right-12 -top-12 -z-10 h-40 w-40 rounded-full bg-ov-500/35 blur-3xl" />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
        <div className="flex min-w-0 flex-1 items-start gap-4 lg:block">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-ov-300 ring-1 ring-inset ring-white/15">
            <Calculator aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0 lg:mt-4">
            <p className="font-display text-[18px] font-extrabold leading-snug">{titel}</p>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/70">{text}</p>
          </div>
        </div>
        <Button href={href} size="md" pfeil className="w-full shrink-0 sm:w-auto lg:w-full">
          {label}
        </Button>
      </div>
    </div>
  );
}
