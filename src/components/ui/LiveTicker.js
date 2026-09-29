"use client";

import Link from "next/link";
import { Sun, Wind, Leaf, Zap } from "lucide-react";
import useEnergyLive, { fmtCt, fmtGw } from "./useEnergyLive";
import { cn } from "./cn";

/** Pulsierender Live-Punkt */
export function LiveDot({ className }) {
  return <span aria-hidden="true" className={cn("inline-block h-2 w-2 shrink-0 animate-ov-pulse-dot rounded-full bg-ov-400", className)} />;
}

/**
 * Schlanker Live-Ticker: Börsenstrompreis, Anteil Erneuerbarer, Solar/Wind.
 * Rendert serverseitig einen ruhigen Platzhalter gleicher Höhe (kein Layout-Sprung).
 */
export default function LiveTicker({ className }) {
  const d = useEnergyLive();
  const p = d?.preis?.aktuell;
  const e = d?.erzeugung;
  const solarAktiv = e?.solarMw > 500;

  return (
    <Link
      href="/energie-live"
      className={cn("group flex min-w-0 items-center gap-4 text-[12.5px] text-white/75 transition-colors hover:text-white", className)}
    >
      <span className="sr-only">Zum Live-Dashboard: </span>
      <span className="flex items-center gap-2 font-semibold uppercase tracking-[0.14em] text-ov-300">
        <LiveDot />
        Live
      </span>
      {!d ? (
        <span className="h-3 w-64 animate-ov-shimmer rounded bg-[linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0.16),rgba(255,255,255,0.06))] bg-[length:200%_100%]" />
      ) : (
        <span className="flex min-w-0 items-center gap-4 truncate">
          {p && (
            <span className="flex items-center gap-1.5">
              <Zap aria-hidden="true" className="h-3.5 w-3.5 text-sun-400" />
              Börsenstrom <strong className="ov-num font-semibold text-white">{fmtCt(p.eurMwh)} ct/kWh</strong>
            </span>
          )}
          {e?.eeAnteil != null && (
            <span className="hidden items-center gap-1.5 md:flex">
              <Leaf aria-hidden="true" className="h-3.5 w-3.5 text-ov-300" />
              Erneuerbare <strong className="ov-num font-semibold text-white">{Math.round(e.eeAnteil)} %</strong>
            </span>
          )}
          {e?.solarMw != null && (
            <span className="hidden items-center gap-1.5 lg:flex">
              {solarAktiv ? (
                <>
                  <Sun aria-hidden="true" className="h-3.5 w-3.5 text-sun-300" />
                  Solar <strong className="ov-num font-semibold text-white">{fmtGw(e.solarMw)} GW</strong>
                </>
              ) : (
                <>
                  <Wind aria-hidden="true" className="h-3.5 w-3.5 text-navy-200" />
                  Wind <strong className="ov-num font-semibold text-white">{fmtGw(e.windMw || 0)} GW</strong>
                </>
              )}
            </span>
          )}
          <span className="hidden text-white/60 underline-offset-2 group-hover:underline xl:inline">Zum Dashboard →</span>
        </span>
      )}
    </Link>
  );
}
