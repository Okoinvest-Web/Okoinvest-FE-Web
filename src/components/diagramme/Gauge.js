// src/components/diagramme/Gauge.js
//
// Halbkreis-Tacho für Quoten mit Ziel: Eigendeckung, Autarkie, Performance Ratio, Auslastung.
// Server-tauglich (ohne Hooks). role="meter" mit aria-valuenow/-text; Wert zusätzlich als Text (nie nur Farbe).
// Bogen läuft beim Einscrollen ein (ov-ring-wert über --ov-p), Zielmarke als Strich mit Beschriftung.
//
// Props: wert, min = 0, max = 1, ziel?, label, wertText? (fertiger Text), prozent = true (Wert 0–1 → %),
//        ton: "marke" | "navy" | "auto" (auto: unter Ziel Sonne, ab Ziel Grün), groesse (Breite px), dunkel, hinweis

import { cn } from "@/components/ui/cn";
import { ACHSE, STATUS } from "@/components/ui/datenfarben";
import { bogenLinie, wertText as zahlText } from "./skala";

const TON = { marke: "#558227", navy: "#003473" };

export default function Gauge({ wert, min = 0, max = 1, ziel, label, wertText, prozent = true, stellen = 0, ton = "auto", groesse = 220, dunkel = false, hinweis, className }) {
  const v = Number.isFinite(Number(wert)) ? Number(wert) : null;
  const anteil = v == null ? 0 : Math.max(0, Math.min(1, (v - min) / (max - min || 1)));
  const zielAnteil = Number.isFinite(ziel) ? Math.max(0, Math.min(1, (ziel - min) / (max - min || 1))) : null;
  const f = dunkel ? ACHSE.dunkel : ACHSE.hell;
  const farbe = ton === "auto" ? (zielAnteil != null && anteil < zielAnteil ? STATUS.warn : dunkel ? "#aed083" : TON.marke) : TON[ton] || TON.marke;
  const text = (x) => (prozent ? `${zahlText(x * 100, { stellen })} %` : zahlText(x, { stellen }));
  const anzeige = v == null ? "–" : wertText ?? text(v);

  const w = groesse;
  const dicke = Math.max(12, w * 0.085);
  const r = w / 2 - dicke / 2 - 2;
  const cx = w / 2;
  const cy = r + dicke / 2 + 2;
  const h = cy + 6;
  const A0 = -Math.PI / 2;
  const A1 = Math.PI / 2;
  const zielWinkel = zielAnteil != null ? A0 + zielAnteil * Math.PI : null;
  const bogen = bogenLinie(cx, cy, r, A0, A1);

  return (
    <div className={cn("ov-reveal inline-flex flex-col items-center", className)} data-dir="ohne" style={{ width: w }}>
      <div
        role="meter"
        aria-valuemin={prozent ? min * 100 : min}
        aria-valuemax={prozent ? max * 100 : max}
        aria-valuenow={v == null ? undefined : prozent ? Math.round(v * 1000) / 10 : v}
        aria-valuetext={`${anzeige}${zielAnteil != null ? `, Ziel ${text(ziel)}` : ""}`}
        aria-label={label}
        className="relative"
        style={{ width: w, height: h }}
      >
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="block overflow-visible">
          <path d={bogen} fill="none" stroke={f.raster} strokeWidth={dicke} strokeLinecap="round" />
          {anteil > 0 && (
            <path d={bogen} pathLength="1" fill="none" stroke={farbe} strokeWidth={dicke} strokeLinecap="round" className="ov-ring-wert" style={{ "--ov-p": anteil.toFixed(4) }} />
          )}
          {zielWinkel != null && (
            <g>
              <line
                x1={cx + (r - dicke / 2 - 3) * Math.sin(zielWinkel)}
                y1={cy - (r - dicke / 2 - 3) * Math.cos(zielWinkel)}
                x2={cx + (r + dicke / 2 + 3) * Math.sin(zielWinkel)}
                y2={cy - (r + dicke / 2 + 3) * Math.cos(zielWinkel)}
                stroke={f.textStark}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          )}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className={cn("ov-num font-display font-extrabold leading-none tracking-tight", dunkel ? "text-white" : "text-ink-900")} style={{ fontSize: Math.round(w * 0.15) }}>
            {anzeige}
          </span>
        </div>
      </div>
      <div className="mt-2 flex w-full items-center justify-between text-[12px]">
        <span className={dunkel ? "text-white/60" : "text-ink-500"}>{text(min)}</span>
        {label && <span className={cn("px-2 text-center text-[13px] font-semibold", dunkel ? "text-white/85" : "text-ink-700")}>{label}</span>}
        <span className={dunkel ? "text-white/60" : "text-ink-500"}>{text(max)}</span>
      </div>
      {(zielAnteil != null || hinweis) && (
        <p className={cn("mt-1 text-center text-[12.5px]", dunkel ? "text-white/70" : "text-ink-500")}>
          {zielAnteil != null && (
            <>
              Ziel {text(ziel)}
              {v != null && <> · {anteil >= zielAnteil ? "erreicht" : `noch ${text(ziel - v)}`}</>}
            </>
          )}
          {zielAnteil != null && hinweis ? " · " : ""}
          {hinweis}
        </p>
      )}
    </div>
  );
}
