// Hero für /agri-pv: Text links, Panorama-Bühne rechts mit schwebenden Normkarten
import { Fragment, isValidElement } from "react";
import { ArrowRight, Calculator, Check, Sprout } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { TextEnthuellung } from "@/components/motion";
import AgriPanorama from "./AgriPanorama";
import Link from "@/components/Land/Link";
import T from "@/components/Sprache/T";

/**
 * pill:    { href, marke, text, textKurz }
 * punkte:  kurze Versprechen (mobil die ersten zwei)
 * karten:  [{ icon, titel, text }] – drei schwebende Hinweiskarten an der Bühne
 */
export default function AgriHero({ breadcrumbs, pill, titel, lead, aktionen, hinweis, punkte = [], karten = [], unterzeile, bildTitel, buehne }) {
  const [k1, k2, k3] = karten;
  return (
    <section data-abschnitt="hero" aria-labelledby="hero-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-10 -z-10 h-[520px] w-[520px] rounded-full bg-sun-400/15 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-navy-950/50" />

      <div className="ov-container pb-24 pt-6 sm:pt-8 md:pb-32 md:pt-10">
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
                  <span className="sm:hidden">{pill.textKurz || pill.text}</span>
                  <span className="max-sm:hidden">{pill.text}</span>
                </span>
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ov-300 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
            )}

            <h1 id="hero-titel" className="ov-h1 mt-6 text-balance md:mt-8">
              {/* Fragment auflösen, damit die Headline Wort für Wort erscheint (Hervorhebung bleibt ein Block) */}
              <TextEnthuellung verzoegerung={80}>{isValidElement(titel) && titel.type === Fragment ? titel.props.children : titel}</TextEnthuellung>
            </h1>

            <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
              {lead}
            </p>

            <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
              {aktionen.map((a, i) => (
                <Button key={a.href} href={a.href} size="lg" pfeil={i === 0} magnetisch={i === 0} variant={i === 0 ? "primary" : "outlineLight"} className="w-full sm:w-auto">
                  {a.label}
                </Button>
              ))}
            </div>
            {unterzeile && (
              <p className="ov-hero-in mt-4 text-[13px] leading-relaxed text-white/70" style={{ "--ov-delay": "300ms" }}>
                {unterzeile}
              </p>
            )}

            {(punkte.length > 0 || hinweis) && (
              <div className="ov-hero-in mt-9 border-t border-white/10 pt-7 md:mt-10" style={{ "--ov-delay": "360ms" }}>
                {punkte.length > 0 && (
                  <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {punkte.map((x, i) => (
                      <li key={x} className={cn("flex items-start gap-2.5 text-[14px] leading-snug text-white/85", i > 1 && "max-sm:hidden")}>
                        <span aria-hidden="true" className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ov-400/15 ring-1 ring-inset ring-ov-300/40">
                          <Check className="h-2.5 w-2.5 text-ov-300" strokeWidth={3.5} />
                        </span>
                        {x}
                      </li>
                    ))}
                  </ul>
                )}
                {hinweis && (
                  <p className="mt-6 flex items-center gap-2 text-[14px] text-white/70">
                    <Calculator aria-hidden="true" className="h-4 w-4 shrink-0 text-sun-300" />
                    <span>
                      {hinweis.text}{" "}
                      <Link href={hinweis.href} className="rounded font-semibold text-white underline decoration-sun-300/70 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">
                        {hinweis.label}
                      </Link>
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>

          {buehne || (
          <figure className="ov-hero-in relative mx-auto w-full max-w-[640px] lg:mx-0 lg:max-w-none xl:-mr-6" style={{ "--ov-delay": "220ms" }}>
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(255,206,84,0.18),transparent_70%)] blur-2xl" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-[10%] -bottom-12 -z-10 h-16 rounded-[50%] bg-navy-950/70 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] shadow-e4 ring-1 ring-white/15 md:rounded-[2.25rem]">
              <AgriPanorama className="block aspect-[16/11] h-auto w-full" titel={bildTitel} />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />
            </div>

            {/* Mobil: Hinweise als ruhige Liste unter der Bühne */}
            {karten.length > 0 && (
              <ul className="mt-4 grid gap-2 sm:hidden">
                {karten.map((k) => (
                  <li key={k.titel} className="flex items-center gap-3 rounded-2xl bg-white/[0.05] px-3.5 py-3 ring-1 ring-inset ring-white/10">
                    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sun-300">
                      {k.icon ? <k.icon className="h-4 w-4" strokeWidth={1.9} /> : <Sprout className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 text-[13.5px] leading-snug">
                      <span className="font-semibold text-ov-300">{k.marke}: </span>
                      <span className="text-white/85">{k.titel}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {k2 && (
              <Karte k={k2} className="max-sm:hidden sm:-left-5 sm:top-[40%] lg:-left-10" verzoegerung="520ms" />
            )}
            {k1 && (
              <Karte k={k1} className="max-sm:hidden sm:-bottom-8 sm:right-10" verzoegerung="620ms" />
            )}
            {k3 && (
              <Karte k={k3} className="max-sm:hidden sm:-right-4 sm:top-8 lg:-right-6" verzoegerung="720ms" hell />
            )}

            <figcaption className="mt-4 text-center text-[12px] text-white/60 sm:text-left"><T de="Schematische Darstellung, nicht maßstäblich" en="Schematic illustration, not to scale" /></figcaption>
          </figure>
          )}
        </div>
      </div>
    </section>
  );
}

function Karte({ k, className, verzoegerung, hell = false }) {
  const Icon = k.icon || Sprout;
  return (
    <div
      className={cn(
        "ov-hero-in absolute z-10 flex max-w-[15.5rem] items-start gap-3 rounded-2xl p-3.5 pr-4 shadow-e4 ring-1 backdrop-blur-md",
        hell ? "bg-white/95 text-ink-900 ring-white" : "bg-navy-950/80 text-white ring-white/15",
        className
      )}
      style={{ "--ov-delay": verzoegerung }}
    >
      <span
        aria-hidden="true"
        className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset", hell ? "bg-ov-50 text-ov-700 ring-ov-200" : "bg-white/10 text-sun-300 ring-white/15")}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </span>
      <span className="min-w-0">
        <span className={cn("block text-[11px] font-bold uppercase tracking-[0.12em]", hell ? "text-ov-700" : "text-ov-300")}>{k.marke}</span>
        <span className="mt-0.5 block font-display text-[15px] font-bold leading-snug tracking-[-0.01em]">{k.titel}</span>
        {k.text && <span className={cn("mt-0.5 block text-[12.5px] leading-snug", hell ? "text-ink-600" : "text-white/70")}>{k.text}</span>}
      </span>
    </div>
  );
}

