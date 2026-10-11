"use client";

import Link from "@/components/Land/Link";
import { Sun, Wind, Leaf, Zap } from "lucide-react";
import useEnergyLive, { fmtCt, fmtGw } from "./useEnergyLive";
import { cn } from "./cn";
import { pfad } from "@/lib/land";
import { useSprache, useTexte } from "@/components/Sprache/SpracheKontext";
import { useSeitenLand } from "@/components/Land/LandKontext";

const TEXTE = {
  de: { sr: "Zum Live-Dashboard: ", boerse: "Börsenstrom", ee: "Erneuerbare", dashboard: "Zum Dashboard →" },
  en: { sr: "To the live dashboard: ", boerse: "Exchange power", ee: "Renewables", dashboard: "To the dashboard →" },
};

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
  const t = useTexte(TEXTE);
  const sprache = useSprache();
  // Länderwahl: Ticker zeigt die Börse des gewählten Landes (Daten über useEnergyLive
  // bereits je Land), dezent beschriftet („Börsenstrom AT/CH“); DE/gemeinsam wie bisher.
  const land = useSeitenLand();
  const boerse = land === "AT" || land === "CH" ? `${t.boerse} ${land}` : t.boerse;

  return (
    <Link
      href={pfad("/energie-live")}
      className={cn("group flex min-w-0 items-center gap-4 text-[12.5px] text-white/75 transition-colors hover:text-white", className)}
    >
      <span className="sr-only">{t.sr}</span>
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
              {boerse} <strong className="ov-num font-semibold text-white">{fmtCt(p.eurMwh, 1, sprache)} ct/kWh</strong>
            </span>
          )}
          {e?.eeAnteil != null && (
            <span className="hidden items-center gap-1.5 md:flex">
              <Leaf aria-hidden="true" className="h-3.5 w-3.5 text-ov-300" />
              {t.ee} <strong className="ov-num font-semibold text-white">{Math.round(e.eeAnteil)} %</strong>
            </span>
          )}
          {e?.solarMw != null && (
            <span className="hidden items-center gap-1.5 lg:flex">
              {solarAktiv ? (
                <>
                  <Sun aria-hidden="true" className="h-3.5 w-3.5 text-sun-300" />
                  Solar <strong className="ov-num font-semibold text-white">{fmtGw(e.solarMw, sprache)} GW</strong>
                </>
              ) : (
                <>
                  <Wind aria-hidden="true" className="h-3.5 w-3.5 text-navy-200" />
                  Wind <strong className="ov-num font-semibold text-white">{fmtGw(e.windMw || 0, sprache)} GW</strong>
                </>
              )}
            </span>
          )}
          <span className="hidden text-white/60 underline-offset-2 group-hover:underline xl:inline">{t.dashboard}</span>
        </span>
      )}
    </Link>
  );
}
