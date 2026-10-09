// Gemeinsamer Hero für /grossspeicher, /solarcarport und /virtuelles-kraftwerk
// Aufbau wie die Referenzseite /energiegemeinschaften/software:
// Hinweis-Pill → Headline → Lead → Handlungen → Kurzversprechen | Bühne (eigene Grafik je Seite)
import { Fragment, isValidElement } from "react";
import { ArrowRight, Check } from "lucide-react";
import TextEnthuellung from "@/components/motion/TextEnthuellung";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import Link from "@/components/Land/Link";

/**
 * breadcrumbs: [{ name, href? }]
 * pill:        { marke, text, kurz?, href } – kleine Hinweiszeile über der Headline
 * titel:       ReactNode (h1)
 * lead:        ReactNode
 * primaer / sekundaer: { label, href, icon? }
 * hinweis:     kleine Zeile unter den Buttons
 * chips:       string[] – mobil die ersten zwei, ab sm alle
 * fuss:        ReactNode unter den Chips (z. B. Rechner-Link)
 * buehne:      ReactNode – Grafik rechts
 * bildunterschrift: string unter der Bühne
 * id:          id der h1 (aria-labelledby)
 */
/** Fragment auspacken, damit TextEnthuellung Wort für Wort arbeitet (Elemente bleiben ein Block) */
const kinder = (knoten) => (isValidElement(knoten) && knoten.type === Fragment ? knoten.props.children : knoten);

export default function SeitenHero({ breadcrumbs, pill, titel, lead, primaer, sekundaer, hinweis, chips = [], fuss, buehne, bildunterschrift, id = "hero-titel", className }) {
  return (
    <section data-abschnitt="hero" aria-labelledby={id} className={cn("ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white", className)}>
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50 [mask-image:radial-gradient(80%_70%_at_70%_40%,#000,transparent)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 bottom-0 -z-10 h-[420px] w-[420px] rounded-full bg-navy-500/25 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-navy-950/50" />

      <div className="ov-container pb-28 pt-6 sm:pt-8 md:pb-36 md:pt-10">
        <Breadcrumbs items={breadcrumbs} dark className="ov-hero-in mb-8 md:mb-12" />

        <div className="grid items-center gap-y-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-x-12 xl:gap-x-16">
          <div className="max-w-[36rem]">
            {pill && (
              <Link
                href={pill.href}
                className="ov-hero-in group inline-flex max-w-full items-center gap-2.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] text-white/85 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
                style={{ "--ov-delay": "40ms" }}
              >
                <span className="shrink-0 rounded-full bg-ov-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">{pill.marke}</span>
                <span className="min-w-0 truncate">
                  {pill.kurz ? (
                    <>
                      <span className="sm:hidden">{pill.kurz}</span>
                      <span className="max-sm:hidden">{pill.text}</span>
                    </>
                  ) : (
                    pill.text
                  )}
                </span>
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ov-300 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
            )}

            <h1 id={id} className="ov-h1 mt-6 text-balance md:mt-8">
              <TextEnthuellung verzoegerung={80}>{kinder(titel)}</TextEnthuellung>
            </h1>

            <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
              {lead}
            </p>

            <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
              {primaer && (
                <Button href={primaer.href} size="lg" pfeil magnetisch className="w-full sm:w-auto">
                  {primaer.label}
                </Button>
              )}
              {sekundaer && (
                <Button href={sekundaer.href} size="lg" variant="outlineLight" icon={sekundaer.icon} className="w-full sm:w-auto">
                  {sekundaer.label}
                </Button>
              )}
            </div>
            {hinweis && (
              <p className="ov-hero-in mt-4 text-[13px] leading-relaxed text-white/70" style={{ "--ov-delay": "300ms" }}>
                {hinweis}
              </p>
            )}

            {(chips.length > 0 || fuss) && (
              <div className="ov-hero-in mt-9 border-t border-white/10 pt-7 md:mt-10" style={{ "--ov-delay": "360ms" }}>
                {chips.length > 0 && (
                  <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {chips.map((x, i) => (
                      <li key={x} className={cn("flex items-start gap-2.5 text-[14px] leading-snug text-white/85", i > 1 && "max-sm:hidden")}>
                        <span aria-hidden="true" className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ov-400/15 ring-1 ring-inset ring-ov-300/40">
                          <Check className="h-2.5 w-2.5 text-ov-300" strokeWidth={3.5} />
                        </span>
                        {x}
                      </li>
                    ))}
                  </ul>
                )}
                {fuss && <div className={cn(chips.length > 0 && "mt-6")}>{fuss}</div>}
              </div>
            )}
          </div>

          {buehne && (
            <figure className="ov-hero-in relative mx-auto w-full max-w-[640px] lg:mx-0 lg:max-w-none xl:-mr-6" style={{ "--ov-delay": "220ms" }}>
              <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_70%)] blur-2xl" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-[10%] -bottom-14 -z-10 h-16 rounded-[50%] bg-navy-950/70 blur-2xl" />
              {buehne}
              {bildunterschrift && <figcaption className="mt-6 text-center text-[12px] text-white/60 lg:mt-8">{bildunterschrift}</figcaption>}
            </figure>
          )}
        </div>
      </div>
    </section>
  );
}
