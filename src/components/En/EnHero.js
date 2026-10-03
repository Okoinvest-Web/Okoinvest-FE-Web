// Hero aller englischen Seiten – gleiche Markensprache wie die Referenzseite
// /energiegemeinschaften/software (Nachtverlauf, Raster, Lichtkante, Bühne rechts).
// Aufbau: Hinweis-Pill → H1 → Lead → Handlungen → Notiz → Versprechen (2×2) | Bühne (visual)
import { ArrowRight, Check } from "lucide-react";
import HeroTitel from "@/components/Unternehmen/HeroTitel";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

/**
 * Props:
 *  pill     { tag, label, kurz?, href } – kleine Hinweis-Pille über der Headline
 *  title    JSX (H1)
 *  lead     JSX/String
 *  actions  [{ label, href, variant?: "primary" | "outline", hrefLang? }]
 *  note     kleine Zeile unter den Buttons
 *  chips    ["Versprechen", …] – mobil die ersten zwei, ab sm alle
 *  extra    JSX unter den Versprechen
 *  visual   JSX – Bühne rechts (ab lg), mobil unter dem Text
 *  caption  Bildunterschrift der Bühne
 *  kompakt  weniger Höhe (Kontaktseite)
 */
export default function EnHero({ id = "hero-titel", pill, title, lead, actions = [], note, chips = [], extra, visual, caption, kompakt = false, className }) {
  return (
    <section data-abschnitt="hero" aria-labelledby={id} className={cn("ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white", className)}>
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-navy-950/50" />

      <div className={cn("ov-container", kompakt ? "pb-16 pt-10 md:pb-24 md:pt-16" : "pb-20 pt-10 md:pb-28 md:pt-16")}>
        <div className={cn("grid items-center gap-y-14", visual && "lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-x-12 xl:gap-x-16")}>
          <div className={cn(visual ? "max-w-[36rem]" : "max-w-3xl")}>
            {pill && (
              <a
                href={pill.href}
                className="ov-hero-in group inline-flex max-w-full items-center gap-2.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] text-white/85 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
                style={{ "--ov-delay": "40ms" }}
              >
                <span className="shrink-0 rounded-full bg-ov-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">{pill.tag}</span>
                <span className="min-w-0 truncate">
                  {pill.kurz ? (
                    <>
                      <span className="sm:hidden">{pill.kurz}</span>
                      <span className="max-sm:hidden">{pill.label}</span>
                    </>
                  ) : (
                    pill.label
                  )}
                </span>
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ov-300 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </a>
            )}

            <h1 id={id} className="ov-h1 mt-6 text-balance md:mt-8">
              <HeroTitel>{title}</HeroTitel>
            </h1>

            {lead && (
              <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
                {lead}
              </p>
            )}

            {actions.length > 0 && (
              <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
                {actions.map((a, i) => (
                  <Button key={a.href} href={a.href} hrefLang={a.hrefLang} size="lg" pfeil={i === 0} magnetisch={i === 0} variant={i === 0 ? "primary" : "outlineLight"} className="w-full sm:w-auto">
                    {a.label}
                  </Button>
                ))}
              </div>
            )}
            {note && (
              <p className="ov-hero-in mt-4 text-[13px] leading-relaxed text-white/70" style={{ "--ov-delay": "300ms" }}>
                {note}
              </p>
            )}

            {(chips.length > 0 || extra) && (
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
                {extra}
              </div>
            )}
          </div>

          {visual && (
            <figure className="relative mx-auto w-full max-w-[600px] lg:mx-0 lg:max-w-none">
              <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_70%)] blur-2xl" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-[10%] -bottom-14 -z-10 h-16 rounded-[50%] bg-navy-950/70 blur-2xl" />
              {visual}
              {caption && <figcaption className="mt-8 text-center text-[12px] text-white/60">{caption}</figcaption>}
            </figure>
          )}
        </div>
      </div>
    </section>
  );
}

/** Häkchen-Chip als Aufzählungszeichen (wie Referenzseite) */
export function Haken({ dunkel = false }) {
  return (
    <span aria-hidden="true" className={cn("mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full", dunkel ? "bg-white/10 text-ov-300" : "bg-ov-100 text-ov-700")}>
      <Check className="h-2.5 w-2.5" strokeWidth={3} />
    </span>
  );
}
