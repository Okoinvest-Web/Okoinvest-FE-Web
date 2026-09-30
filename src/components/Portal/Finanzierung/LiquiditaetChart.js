"use client";

// Liquiditätsverlauf: kumulierter Eigenkapital-Cashflow (nach Steuern, sofern eingerechnet) je Finanzierungsvariante als
// Linien (höchstens 3 gleichzeitig, feste Farbreihenfolge, geprüft mit dem Palette-Validator: Grün 700, Navy 500, Sonne –
// Orange mit Direktbeschriftung und Tabelle als Entlastung). Fadenkreuz + Tooltip, Nulllinie, Legende mit Direktlabels.

import { useState } from "react";
import { useBreite, Tooltip } from "@/components/Rechner/bausteine";
import { teur } from "./teile";

export const LINIEN_FARBEN = ["#436621", "#1f5aa1", "#e39400"];
const H = 260;
const R = { l: 64, r: 96, o: 14, u: 30 };

export default function LiquiditaetChart({ reihen = [], titel = "Liquiditätsverlauf (kumulierter Eigenkapital-Cashflow)" }) {
  const [ref, breite] = useBreite(720);
  const [hover, setHover] = useState(null);
  const T = Math.max(1, ...reihen.map((r) => r.werte.length - 1));
  const alle = reihen.flatMap((r) => r.werte);
  const min = Math.min(0, ...alle);
  const max = Math.max(0, ...alle);
  const spanne = max - min || 1;
  const W = Math.max(breite, 300);
  const x = (t) => R.l + (t / T) * (W - R.l - R.r);
  const y = (v) => R.o + ((max - v) / spanne) * (H - R.o - R.u);
  const ticks = [min, min + spanne / 2, max];
  const jahresTicks = [0, Math.round(T / 4), Math.round(T / 2), Math.round((3 * T) / 4), T];

  const bewegen = (ev) => {
    const box = ev.currentTarget.getBoundingClientRect();
    const t = Math.round(((ev.clientX - box.left - R.l) / (W - R.l - R.r)) * T);
    setHover(t >= 0 && t <= T ? t : null);
  };

  return (
    <figure ref={ref} className="relative min-w-0">
      <figcaption className="mb-2 text-[13.5px] font-semibold text-ink-700">{titel}</figcaption>
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-700" aria-label="Legende">
        {reihen.map((r, i) => (
          <li key={r.id} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-[3px] w-5 rounded-full" style={{ background: LINIEN_FARBEN[i] }} />
            {r.label}
          </li>
        ))}
      </ul>
      <svg width={W} height={H} role="img" aria-label={`${titel}: ${reihen.map((r) => `${r.label} Endwert ${teur(r.werte[r.werte.length - 1])}`).join(", ")}`} onMouseMove={bewegen} onMouseLeave={() => setHover(null)} className="block max-w-full touch-none">
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={R.l} x2={W - R.r} y1={y(v)} y2={y(v)} stroke="#eef0f4" strokeWidth="1" />
            <text x={R.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6b7486">{teur(v)}</text>
          </g>
        ))}
        <line x1={R.l} x2={W - R.r} y1={y(0)} y2={y(0)} stroke="#97a0b0" strokeWidth="1" strokeDasharray="4 3" />
        {jahresTicks.map((t) => (
          <text key={t} x={x(t)} y={H - 10} textAnchor="middle" fontSize="11" fill="#6b7486">{t === 0 ? "Start" : `J. ${t}`}</text>
        ))}
        {reihen.map((r, i) => (
          <g key={r.id}>
            <polyline fill="none" stroke={LINIEN_FARBEN[i]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={r.werte.map((v, t) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} />
            <text x={W - R.r + 6} y={y(r.werte[r.werte.length - 1]) + 4 + (i - 1) * 2} fontSize="11" fill="#394050">{r.kurz || r.label}</text>
          </g>
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={R.o} y2={H - R.u} stroke="#97a0b0" strokeWidth="1" />
            {reihen.map((r, i) => (r.werte[hover] !== undefined ? <circle key={r.id} cx={x(hover)} cy={y(r.werte[hover])} r="4.5" fill={LINIEN_FARBEN[i]} stroke="#fff" strokeWidth="2" /> : null))}
          </g>
        )}
      </svg>
      {hover !== null && (
        <Tooltip x={x(hover)} y={20} breite={W}>
          <p className="font-semibold">{hover === 0 ? "Start (Jahr 0)" : `Jahr ${hover}`}</p>
          {reihen.map((r, i) => (
            <p key={r.id} className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: LINIEN_FARBEN[i] }} />
              {r.kurz || r.label}: {teur(r.werte[hover])}
            </p>
          ))}
        </Tooltip>
      )}
    </figure>
  );
}
