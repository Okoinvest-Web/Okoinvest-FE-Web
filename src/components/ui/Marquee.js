"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "./cn";

/**
 * Endloses Laufband (z. B. Herstellerlogos, Vertrauenspunkte).
 * Inhalte werden doppelt gerendert; die zweite Kopie ist für Screenreader verborgen.
 * Pausiert bei Hover und bei Tastaturfokus auf einem Link im Band, lässt sich per Knopf anhalten (WCAG 2.2.2)
 * und steht bei reduzierter Bewegung still.
 */
export default function Marquee({ children, className, speed = 40, fade = "from-white" }) {
  const [angehalten, setAngehalten] = useState(false);
  return (
    <div className={cn("group relative overflow-hidden", className)}>
      <div aria-hidden="true" className={cn("pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r to-transparent md:w-32", fade)} />
      <div aria-hidden="true" className={cn("pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l to-transparent md:w-32", fade)} />
      <div
        className={cn(
          "flex w-max animate-ov-marquee items-center group-hover:[animation-play-state:paused] group-has-[a:focus-visible]:[animation-play-state:paused] motion-reduce:animate-none",
          angehalten && "[animation-play-state:paused]"
        )}
        style={{ animationDuration: `${speed}s` }}
      >
        <div className="flex shrink-0 items-center gap-12 pr-12 md:gap-16 md:pr-16">{children}</div>
        <div aria-hidden="true" className="flex shrink-0 items-center gap-12 pr-12 md:gap-16 md:pr-16">
          {children}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setAngehalten((a) => !a)}
        aria-label={angehalten ? "Laufband fortsetzen" : "Laufband anhalten"}
        title={angehalten ? "Laufband fortsetzen" : "Laufband anhalten"}
        className="absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-600 ring-1 ring-ink-200 transition-colors hover:text-ink-900 motion-reduce:hidden"
      >
        {angehalten ? <Play aria-hidden="true" className="h-3.5 w-3.5" /> : <Pause aria-hidden="true" className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
