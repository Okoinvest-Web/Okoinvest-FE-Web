// Hero der Seite /energiegemeinschaften/software
// Aufbau: Hinweis-Pill (ElWG) → Headline → Lead → Handlungen → Versprechen (2×2) | Produktbühne (HeroKomposition)
import { ArrowRight, Calculator, Check } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { HeroKomposition } from "@/components/Portal/EG/Produkt/Mockups";
import TextEnthuellung from "@/components/motion/TextEnthuellung";
import { pfad } from "@/lib/land";

/** Kurzversprechen – mobil die ersten zwei, ab sm alle vier */
const HERO_CHIPS = [
  "Geführte Zustimmung beim Netzbetreiber",
  "Mehrfachteilnahme bis fünf Gemeinschaften",
  "Gründung, Wechsel und Betrieb",
  "EDA-Rolle bleibt bei der Gemeinschaft",
];

export default function Hero() {
  return (
    <section data-abschnitt="hero" aria-labelledby="hero-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      {/* Bühne: Raster, Lichtkante oben, weicher Übergang zur Faktenleiste */}
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-navy-950/50" />

      <div className="ov-container pb-24 pt-6 sm:pt-8 md:pb-32 md:pt-10">
        <Breadcrumbs items={[{ name: "Energiegemeinschaften", href: pfad("/energiegemeinschaften") }, { name: "Software" }]} dark className="ov-hero-in mb-8 md:mb-12" />

        <div className="grid items-center gap-y-16 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-x-12 xl:gap-x-16">
          {/* Text */}
          <div className="max-w-[36rem]">
            <a
              href="#elwg"
              className="ov-hero-in group inline-flex max-w-full items-center gap-2.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] text-white/85 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
              style={{ "--ov-delay": "40ms" }}
            >
              <span className="shrink-0 rounded-full bg-ov-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">Neu</span>
              <span className="min-w-0 truncate"><span className="sm:hidden">Neue ElWG-Regeln – was sich ändert</span><span className="max-sm:hidden">Seit 1. Oktober 2026: neue ElWG-Regeln – was sich ändert</span></span>
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ov-300 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </a>

            <h1 id="hero-titel" className="ov-h1 mt-6 text-balance md:mt-8">
              <TextEnthuellung verzoegerung={80}>
                Die Gemeinschaft <span className="whitespace-nowrap">führen&nbsp;–</span> <span className="ov-text-gradient-light">nicht nur abrechnen.</span>
              </TextEnthuellung>
            </h1>

            <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 [hyphens:manual] md:mt-6" style={{ "--ov-delay": "180ms" }}>
              <span className="font-medium text-white">Für Energiegemeinschaften in Österreich:</span> Mitgliederportal, Abrechnung mit Vier-Augen-Freigabe und geführte Zustimmung beim Netzbetreiber – als Software für Ihren Vorstand oder mit uns als Organisator im Betrieb.
            </p>

            <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
              <Button href="#anfrage" size="lg" pfeil magnetisch className="w-full sm:w-auto">Angebot anfragen</Button>
              <Button href="#produkt" size="lg" variant="outlineLight" className="w-full sm:w-auto">Plattform ansehen</Button>
            </div>
            <p className="ov-hero-in mt-4 text-[13px] leading-relaxed text-white/70" style={{ "--ov-delay": "300ms" }}>
              Unverbindlich · Angebot nach Größe und Paket · auch für bestehende Gemeinschaften
            </p>

            <div className="ov-hero-in mt-9 border-t border-white/10 pt-7 md:mt-10" style={{ "--ov-delay": "360ms" }}>
              <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {HERO_CHIPS.map((x, i) => (
                  <li key={x} className={cn("flex items-start gap-2.5 text-[14px] leading-snug text-white/85", i > 1 && "max-sm:hidden")}>
                    <span aria-hidden="true" className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ov-400/15 ring-1 ring-inset ring-ov-300/40">
                      <Check className="h-2.5 w-2.5 text-ov-300" strokeWidth={3.5} />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
              <p className="mt-6 flex items-center gap-2 text-[14px] text-white/70">
                <Calculator aria-hidden="true" className="h-4 w-4 shrink-0 text-sun-300" />
                <span>Mitglied oder Interessent? <a href="#rechner" className="rounded font-semibold text-white underline decoration-sun-300/70 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">Ersparnis rechnen</a></span>
              </p>
            </div>
          </div>

          {/* Produktbühne: volle Spaltenbreite, unten Luft für überlappende Karten der Komposition */}
          <figure className="relative mx-auto w-full max-w-[640px] lg:mx-0 lg:max-w-none xl:-mr-6">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.24),transparent_70%)] blur-2xl" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-[10%] -bottom-14 -z-10 h-16 rounded-[50%] bg-navy-950/70 blur-2xl" />
            <HeroKomposition />
            <figcaption className="mt-8 text-center text-[12px] text-white/60 sm:mt-6 lg:mt-10">
              Beispielansicht mit fiktiven Werten
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
