// Seitenkopf aller Rechnerseiten (Server-Komponente)
// Aufbau: Brotkrumen → Werkzeug-Pill → Headline → Lead → Kurzversprechen | Ergebnis-Steckbrief (ab lg)
// Unten bleibt Luft, weil der Rechner den Kopf überlappt.
import { Fragment, isValidElement } from "react";
import { ArrowDown, Check, Lock, Sparkles } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { cn } from "@/components/ui/cn";
import { TOOLS } from "./tools";
import { STAND } from "@/lib/rechner/annahmen";
import { TextEnthuellung } from "@/components/motion";

// Titel kommen oft als <>Text <span …>Betonung</span></> – das Fragment auflösen,
// damit die Wörter einzeln erscheinen und die Betonung ein Block bleibt.
const ohneFragment = (t) => (isValidElement(t) && t.type === Fragment ? t.props.children : t);

export default function RechnerKopf({ toolId, breadcrumb, eyebrow, title, lead, chips = [], app }) {
  const tool = TOOLS.find((t) => t.id === toolId);
  const Icon = tool?.icon || Sparkles;
  const leistungen = (app?.featureList || []).slice(0, 6);

  return (
    <section aria-labelledby="rechner-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      {/* Bühne: Raster, Lichtkante, Lichtschein, weicher Übergang nach unten */}
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-10 -z-10 h-[420px] w-[420px] rounded-full bg-navy-400/25 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-navy-950/50" />

      <div className="ov-container pb-28 pt-6 sm:pt-8 md:pb-36 md:pt-10">
        <Breadcrumbs items={[{ name: "Rechner & Tools", href: "/rechner" }, { name: breadcrumb }]} dark className="ov-hero-in mb-8 md:mb-10" />

        <div className="grid items-end gap-y-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-x-14 xl:gap-x-20">
          <div className="max-w-[42rem]">
            {eyebrow && (
              <p
                className="ov-hero-in inline-flex max-w-full items-center gap-2.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] font-medium text-white/85 ring-1 ring-inset ring-white/15"
                style={{ "--ov-delay": "40ms" }}
              >
                <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ov-300 text-navy-950">
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                </span>
                <span className="min-w-0 truncate">{eyebrow}</span>
              </p>
            )}

            <h1 id="rechner-titel" className="ov-h1 mt-6 text-balance md:mt-7">
              <TextEnthuellung verzoegerung={80}>{ohneFragment(title)}</TextEnthuellung>
            </h1>

            {lead && (
              <p className="ov-lead ov-hero-in mt-5 max-w-[38rem] text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
                {lead}
              </p>
            )}

            {chips.length > 0 && (
              <ul className="ov-hero-in mt-7 grid gap-x-6 gap-y-2.5 border-t border-white/10 pt-5 sm:grid-cols-2 md:pt-6" style={{ "--ov-delay": "260ms" }}>
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
          </div>

          {/* Steckbrief: was der Rechner liefert – nur ab lg, mobil steht der Rechner direkt darunter */}
          {leistungen.length > 0 && (
            <aside aria-label={`${app.name}: Ergebnisse auf einen Blick`} className="ov-hero-in relative hidden lg:block" style={{ "--ov-delay": "220ms" }}>
              <div aria-hidden="true" className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-[radial-gradient(closest-side,rgba(140,186,88,0.18),transparent_75%)] blur-2xl" />
              <div className="ov-glass rounded-[1.75rem] p-6 shadow-kante xl:p-7">
                <div className="flex items-center gap-3.5">
                  <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-ov-300 to-ov-500 text-navy-950 shadow-[0_8px_24px_-10px_rgba(140,186,88,0.8)]">
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ov-300">Das Ergebnis</p>
                    <p className="line-clamp-2 font-display text-[17px] font-bold leading-snug text-white">{app.name}</p>
                  </div>
                </div>
                <ol className="mt-5 divide-y divide-white/10 border-y border-white/10">
                  {leistungen.map((x, i) => (
                    <li key={x} className="flex items-baseline gap-3.5 py-2.5 text-[14px] leading-snug text-white/85">
                      <span aria-hidden="true" className="ov-num w-5 shrink-0 text-[11.5px] font-bold text-white/40">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {x}
                    </li>
                  ))}
                </ol>
                <div className="mt-5 flex items-center justify-between gap-4">
                  <p className="flex items-center gap-1.5 text-[12.5px] text-white/60">
                    <Lock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    Kostenlos · Stand {STAND}
                  </p>
                  <a
                    href="#rechner"
                    className="group inline-flex shrink-0 items-center gap-1.5 rounded-full text-[13.5px] font-semibold text-white transition-colors hover:text-ov-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950"
                  >
                    Zum Rechner
                    <ArrowDown aria-hidden="true" className="h-3.5 w-3.5 text-ov-300 transition-transform duration-200 group-hover:translate-y-0.5 motion-reduce:transition-none" />
                  </a>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
