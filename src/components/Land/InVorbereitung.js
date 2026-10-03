// „In Vorbereitung“ – Platzhalter für Seiten, die im gestuften Start für ein Land vorgesehen,
// aber noch nicht fachlich freigegeben sind (stufen.js: inVorbereitung). noindex, nicht in der
// Sitemap. Zeigt bewusst KEINE Zahlen und keine Rechtsaussagen.

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { HeroBuehne } from "@/components/Flaeche/Seite/teile";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { LAENDER, einstiegPfad } from "@/lib/land";

/**
 * @param {{ land: string, titel: string, worum: string, weiter?: Array<{ href: string, titel: string, text: string }> }} p
 */
export default function InVorbereitung({ land, titel, worum, weiter = [] }) {
  const info = LAENDER[land];
  return (
    <div>
      <HeroBuehne breadcrumbs={[{ name: info.name, href: einstiegPfad(land) }, { name: titel }]} unten="pb-16 md:pb-20">
        <div className="max-w-[44rem] pb-6">
          <p className="ov-hero-in inline-flex items-center gap-2 rounded-full bg-sun-400/15 px-3.5 py-1.5 text-[13px] font-semibold text-sun-200 ring-1 ring-inset ring-sun-300/30">
            <Clock aria-hidden="true" className="h-4 w-4" />
            In Vorbereitung
          </p>
          <h1 id="hero-titel" className="ov-h1 ov-hero-in mt-6 text-balance" style={{ "--ov-delay": "80ms" }}>
            {titel} <span className="ov-text-gradient-light">{info.fuerLand}</span>
          </h1>
          <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75" style={{ "--ov-delay": "160ms" }}>
            {worum} Die Seite erscheint, sobald Inhalt, Zahlen und Begriffe {info.fuerLand} fachlich geprüft sind.
          </p>
        </div>
      </HeroBuehne>

      <Section tone="white" space="lg">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading eyebrow="Bis dahin" title="Diese Wege gibt es schon" lead="Schreiben Sie uns gern direkt – wir melden uns persönlich." />
          <ul className="grid gap-3 sm:grid-cols-2">
            {[...weiter, { href: einstiegPfad(land), titel: `Übersicht ${info.name}`, text: `Alle Seiten ${info.fuerLand} und was in Vorbereitung ist.` }, { href: "/kontakt", titel: "Kontakt", text: "Anfrage an das Projektteam." }].map((w, i) => (
              <Reveal as="li" key={w.href} delay={i * 60} className="flex">
                <Link href={w.href} className="group flex w-full flex-col rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/70 transition-colors hover:bg-ov-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
                  <span className="flex items-center justify-between gap-3 font-display text-[17px] font-bold text-ink-900">
                    {w.titel}
                    <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600 transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-1.5 text-[14.5px] leading-relaxed text-ink-600">{w.text}</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>
    </div>
  );
}
