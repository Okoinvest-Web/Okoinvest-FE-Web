"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LiveDot } from "@/components/ui/LiveTicker";
import useLiveDaten from "./useLiveDaten";
import { preisTage, zeitfenster, ct, uhr, spanne } from "./berechnung";

/**
 * Einbettbares Live-Widget: Börsenstrompreis jetzt, Tagesverlauf, günstigste 3 Stunden.
 *
 * import LivePreisKarte from "@/components/EnergieLive/LivePreisKarte";
 * <LivePreisKarte tone="dark" />            // auf dunklen Flächen (Glas)
 * <LivePreisKarte tone="light" initial={snapshot} className="max-w-sm" />
 *
 * props:
 *  tone     "light" (Standard, weiße Karte) | "dark" (Glas auf Navy)
 *  initial  optional: Ergebnis von getEnergySnapshot() für Server-HTML ohne Platzhalter
 *  href     Ziel des Links (Standard /energie-live)
 */
export default function LivePreisKarte({ tone = "light", initial = null, href = "/energie-live", className = "" }) {
  const { daten, jetzt } = useLiveDaten(initial);
  const tage = useMemo(() => preisTage(daten.preis, jetzt), [daten.preis, jetzt]);
  const heute = tage.heute;
  const fenster = useMemo(() => (heute ? zeitfenster(heute.punkte, 180, tage.schrittMs).guenstig : null), [heute, tage.schrittMs]);
  const dunkel = tone === "dark";
  const a = tage.aktuell;

  const W = 300;
  const H = 56;
  // Sparkline-Geometrie: Pfad, Fenster-Band, Jetzt-Linie
  const d = { d: "", fx: null, fw: 0 };
  let jx = null;
  if (heute) {
    const werte = heute.punkte.map((p) => p.eurMwh);
    const lo = Math.min(0, ...werte);
    const hi = Math.max(...werte, lo + 1);
    const x = (t) => ((t - heute.start) / (heute.ende - heute.start)) * W;
    const y = (v) => 4 + (1 - (v - lo) / (hi - lo)) * (H - 8);
    d.d = heute.punkte.map((p, i) => `${i ? "L" : "M"}${x(p.t + tage.schrittMs / 2).toFixed(1)},${y(p.eurMwh).toFixed(1)}`).join("");
    if (jetzt >= heute.start && jetzt < heute.ende) jx = x(jetzt);
    if (fenster) {
      d.fx = x(fenster.start);
      d.fw = x(fenster.ende) - x(fenster.start);
    }
  }

  return (
    <Link
      href={href}
      className={`group block rounded-3xl p-5 transition-all sm:p-6 ${
        dunkel ? "ov-glass text-white hover:bg-white/[0.12]" : "ov-card-hover bg-white text-ink-900 ring-1 ring-ink-200/70 hover:ring-ov-200"
      } ${className}`}
      aria-label={a ? `Börsenstrompreis jetzt ${ct(a.eurMwh)} Cent je kWh – zum Live-Dashboard` : "Zum Live-Dashboard Strommarkt"}
    >
      <div className="flex items-center justify-between gap-3 text-[12.5px]">
        <span className={`flex items-center gap-2 font-semibold uppercase tracking-[0.14em] ${dunkel ? "text-ov-300" : "text-ov-600"}`}>
          <LiveDot />
          Börsenstrom jetzt
        </span>
        {daten.stand && <span className={dunkel ? "text-white/50" : "text-ink-500"}>Stand {uhr(Date.parse(daten.stand))}</span>}
      </div>

      {a ? (
        <p className="mt-3 flex items-baseline gap-2 font-display font-extrabold leading-none tracking-tight">
          <span className="text-[44px]">{ct(a.eurMwh)}</span>
          <span className={`text-[16px] font-bold ${dunkel ? "text-white/65" : "text-ink-500"}`}>ct/kWh</span>
        </p>
      ) : (
        <p className={`mt-3 h-11 w-40 animate-ov-shimmer rounded-lg bg-[length:200%_100%] ${dunkel ? "bg-[linear-gradient(90deg,rgba(255,255,255,0.06),rgba(255,255,255,0.16),rgba(255,255,255,0.06))]" : "bg-[linear-gradient(90deg,#eef0f4,#f7f8fa,#eef0f4)]"}`} />
      )}

      {heute && (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-4 block h-14 w-full" aria-hidden="true">
          {d.fx != null && <rect x={d.fx} y="0" width={d.fw} height={H} rx="3" fill={dunkel ? "rgba(140,186,88,0.2)" : "rgba(102,153,51,0.14)"} />}
          <path d={d.d} fill="none" stroke={dunkel ? "rgba(255,255,255,0.85)" : "#1f5aa1"} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {jx != null && <line x1={jx} x2={jx} y1="0" y2={H} stroke={dunkel ? "#ffc53d" : "#151a24"} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
        </svg>
      )}

      <div className={`mt-3 flex items-center justify-between gap-3 text-[13px] ${dunkel ? "text-white/70" : "text-ink-600"}`}>
        <span>
          {fenster ? (
            <>
              Günstigste 3 h: <strong className={dunkel ? "text-white" : "text-ink-900"}>{spanne(fenster.start, fenster.ende)}</strong>
            </>
          ) : (
            "Day-Ahead-Preis Deutschland"
          )}
        </span>
        <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
