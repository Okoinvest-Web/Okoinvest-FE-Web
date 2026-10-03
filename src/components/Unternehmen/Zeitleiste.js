import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import s from "./vertrauen.module.css";

/**
 * Chronologie auf dunklem Grund. Eine Linie links, Jahr groß in eigener
 * Spalte (ab md), Karte rechts – ruhig lesbar statt Zickzack.
 * Bewegung: Die Linie füllt sich beim Scrollen bis zur Bildschirmmitte, jeder
 * Punkt „zündet“, wenn die Füllung ihn erreicht – die Geschichte wird
 * mitgelesen statt nur gezeigt. Ohne Unterstützung / reduzierte Bewegung:
 * Linie und Punkte stehen vollständig (wie bisher).
 * items: [{ jahr, titel, text, hervorgehoben? }]
 */
export default function Zeitleiste({ items = [] }) {
  return (
    <ol className="relative">
      <div aria-hidden="true" className="absolute bottom-8 left-[15px] top-3 w-px bg-white/15 md:left-[120px]">
        <span className={cn(s.strahl, "absolute inset-x-[-0.5px] inset-y-0 rounded-full bg-gradient-to-b from-ov-300 via-ov-400 to-ov-500")} />
      </div>
      {items.map((e, i) => (
        <Reveal
          as="li"
          key={e.jahr}
          delay={i * 40}
          className="relative grid gap-x-16 pb-8 pl-11 last:pb-0 md:grid-cols-[88px_minmax(0,1fr)] md:pl-0"
        >
          <p className="ov-num pt-1 font-display text-[26px] font-extrabold leading-none tracking-tight text-white md:text-right md:text-[28px]">{e.jahr}</p>
          <span
            aria-hidden="true"
            className={cn(
              s.knoten,
              "absolute left-[5px] top-2 flex h-[21px] w-[21px] items-center justify-center rounded-full md:left-[110px]",
              e.hervorgehoben ? "bg-ov-500 shadow-[0_0_0_5px_rgba(102,153,51,0.25)]" : "bg-navy-950 ring-2 ring-ov-400/80"
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", e.hervorgehoben ? "bg-white" : "bg-ov-400")} />
          </span>
          <div
            className={cn(
              "mt-3 rounded-2xl p-5 md:mt-0 md:p-6",
              e.hervorgehoben ? "bg-white/[0.08] ring-1 ring-ov-400/40" : "bg-white/[0.04] ring-1 ring-white/10"
            )}
          >
            <h3 className="font-display text-[17px] font-bold text-white">{e.titel}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-white/70">{e.text}</p>
          </div>
        </Reveal>
      ))}
    </ol>
  );
}
