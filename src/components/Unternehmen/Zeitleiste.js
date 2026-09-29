import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";

/**
 * Chronologie auf dunklem Grund. Mobil: Linie links; ab md: abwechselnd
 * links/rechts der Mittellinie, leicht versetzt.
 * items: [{ jahr, titel, text, hervorgehoben? }]
 */
export default function Zeitleiste({ items = [] }) {
  return (
    <ol className="relative mx-auto max-w-5xl">
      <div aria-hidden="true" className="absolute bottom-6 left-[19px] top-6 w-px bg-gradient-to-b from-ov-400 via-white/20 to-ov-400 md:left-1/2" />
      {items.map((e, i) => {
        const rechts = i % 2 === 1;
        return (
          <Reveal
            as="li"
            key={e.jahr}
            delay={i * 50}
            dir={rechts ? "right" : "left"}
            className={cn("relative pb-10 pl-14 last:pb-0 md:w-1/2 md:pb-4 md:pl-0", rechts ? "md:ml-auto md:pl-12" : "md:pr-12 md:text-right", i > 0 && "md:-mt-16")}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-full",
                rechts ? "md:-left-5" : "md:left-auto md:-right-5",
                e.hervorgehoben ? "bg-ov-500 shadow-[0_0_0_6px_rgba(102,153,51,0.25)]" : "bg-navy-950 ring-2 ring-ov-400"
              )}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", e.hervorgehoben ? "bg-white" : "bg-ov-400")} />
            </span>
            <p className="font-display text-[clamp(1.6rem,1.2rem+1.3vw,2.4rem)] font-extrabold leading-none tracking-tight text-white">{e.jahr}</p>
            <div className={cn("ov-glass mt-4 rounded-3xl p-5 text-left md:p-6", e.hervorgehoben && "ring-1 ring-ov-400/40")}>
              <h3 className="font-display text-[17px] font-bold text-white">{e.titel}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-white/65">{e.text}</p>
            </div>
          </Reveal>
        );
      })}
    </ol>
  );
}
