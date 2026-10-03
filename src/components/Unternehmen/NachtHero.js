// Seitenkopf der Vertrauensseiten (/unternehmen, /kontakt, /prozess, /faq,
// /warum-oekoinvest, /referenzen) – gleiche Markensprache wie die Referenzseite
// /energiegemeinschaften/software: Nachtverlauf, Raster, Lichtkante, Bühne rechts.
import { ArrowRight, Check } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import HeroTitel from "./HeroTitel";

/**
 * props:
 *  breadcrumbs  [{ name, href }]
 *  hinweis      { label, text, kurz?, href } – Pill über der Headline (optional)
 *  eyebrow      Überzeile, falls kein Hinweis
 *  title        JSX, lead JSX/String
 *  actions      [{ label, href, variant? }] – erste = primär
 *  notiz        Kleiner Satz unter den Buttons
 *  chips        ["…"] – Kurzversprechen (mobil die ersten zwei)
 *  buehne       JSX rechts (ab lg zweispaltig, darunter gestapelt)
 *  mitLeiste    true: unten Platz für eine überlappende Faktenleiste
 *  schmal       true: ohne Bühne, Text breiter
 */
export default function NachtHero({
  breadcrumbs,
  hinweis,
  eyebrow,
  title,
  lead,
  actions = [],
  notiz,
  chips = [],
  buehne,
  mitLeiste = false,
  children,
  className,
}) {
  return (
    <section aria-labelledby="seiten-titel" className={cn("ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white", className)}>
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-navy-950/50" />

      <div className={cn("ov-container pt-6 sm:pt-8 md:pt-10", mitLeiste ? "pb-24 md:pb-32" : "pb-16 md:pb-24")}>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} dark className="ov-hero-in mb-8 md:mb-12" />}

        <div className={cn("grid grid-cols-[minmax(0,1fr)] items-center gap-y-14", buehne && "lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-x-12 xl:gap-x-16")}>
          <div className={buehne ? "max-w-[37rem]" : "max-w-3xl"}>
            {hinweis ? (
              <a
                href={hinweis.href}
                className="ov-hero-in group inline-flex max-w-full items-center gap-2.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] text-white/85 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
                style={{ "--ov-delay": "40ms" }}
              >
                <span className="shrink-0 rounded-full bg-ov-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">{hinweis.label}</span>
                <span className="min-w-0 truncate">
                  {hinweis.kurz ? (
                    <>
                      <span className="sm:hidden">{hinweis.kurz}</span>
                      <span className="max-sm:hidden">{hinweis.text}</span>
                    </>
                  ) : (
                    hinweis.text
                  )}
                </span>
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ov-300 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </a>
            ) : (
              eyebrow && (
                <p className="ov-hero-in ov-overline flex items-center gap-2 text-ov-300" style={{ "--ov-delay": "40ms" }}>
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-300" />
                  {eyebrow}
                </p>
              )
            )}

            {/* Headline baut sich Wort für Wort auf (CSS, LCP-sicher) – kein ov-hero-in auf derselben Überschrift */}
            <h1 id="seiten-titel" className="ov-h1 mt-6 text-balance md:mt-8">
              <HeroTitel>{title}</HeroTitel>
            </h1>

            {lead && (
              <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
                {lead}
              </p>
            )}

            {actions.length > 0 && (
              <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
                {actions.map((a, i) => (
                  <Button key={a.label} href={a.href} size="lg" pfeil={i === 0} magnetisch={i === 0} variant={a.variant || (i === 0 ? "primary" : "outlineLight")} className="w-full sm:w-auto">
                    {a.label}
                  </Button>
                ))}
              </div>
            )}
            {notiz && (
              <p className="ov-hero-in mt-4 text-[13px] leading-relaxed text-white/70" style={{ "--ov-delay": "300ms" }}>
                {notiz}
              </p>
            )}

            {(chips.length > 0 || children) && (
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
                {children}
              </div>
            )}
          </div>

          {buehne && (
            <div className="ov-hero-in relative mx-auto w-full max-w-[640px] lg:mx-0 lg:max-w-none" style={{ "--ov-delay": "200ms" }}>
              <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_70%)] blur-2xl" />
              {buehne}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
