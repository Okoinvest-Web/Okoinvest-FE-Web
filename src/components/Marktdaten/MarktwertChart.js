"use client";

import { useState } from "react";
import { useBreite, Tooltip } from "@/components/Rechner/bausteine";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";

/**
 * Jahresmarktwert Spot (Base) vs. Jahresmarktwert Solar je Jahr als
 * gruppierte Balken, Capture Rate als Beschriftung unter jeder Gruppe.
 *
 * props:
 *  daten  MARKTWERTE aus @/data/marktdaten ({ jahr, spot, solar, capture })
 */

const SPOT = "#1f5aa1"; // navy-500
const SOLAR = "#669933"; // ov-500
const ACHSE = "#6b7486";
const RASTER = "#eef0f4";

export default function MarktwertChart({ daten }) {
  const en = useSprache() === "en";
  const f = useFormate();
  const { fmt } = f;
  const [ref, breite] = useBreite(720);
  const [aktiv, setAktiv] = useState(null);
  const n = daten.length;
  const schmal = breite < 520;
  const H = schmal ? 290 : 340;
  const m = { l: schmal ? 34 : 44, r: 8, t: 26, b: 50 };
  const pw = Math.max(10, breite - m.l - m.r);
  const ph = H - m.t - m.b;
  const yMax = 25;
  const band = pw / n;
  const bw = Math.min(30, (band - 12) / 2);
  const x = (i) => m.l + band * (i + 0.5);
  const y = (v) => m.t + (1 - v / yMax) * ph;
  const ticks = [0, 5, 10, 15, 20, 25];
  const a = aktiv != null ? daten[aktiv] : null;

  // Balken wachsen beim Eintritt gestaffelt (ov-balken-y, ausgelöst vom umgebenden Reveal)
  const balken = (x0, wert, farbe, i) => {
    const y0 = y(0);
    const y1 = y(wert);
    const h = Math.max(0, y0 - y1);
    const r = Math.min(4, h, bw / 2);
    return <path d={`M${x0},${y0}V${y1 + r}Q${x0},${y1} ${x0 + r},${y1}H${x0 + bw - r}Q${x0 + bw},${y1} ${x0 + bw},${y1 + r}V${y0}Z`} fill={farbe} className="ov-balken-y" style={{ "--i": i }} />;
  };

  const setzen = (clientX, el) => {
    const r = el.getBoundingClientRect();
    setAktiv(Math.max(0, Math.min(n - 1, Math.floor((clientX - r.left - m.l) / band))));
  };

  return (
    <figure>
      <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-600">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-[3px]" style={{ background: SPOT }} />
          {en ? "Annual market value, spot (base)" : "Jahresmarktwert Spot (Base)"}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-[3px]" style={{ background: SOLAR }} />
          {en ? "Annual market value, solar" : "Jahresmarktwert Solar"}
        </li>
      </ul>
      <div ref={ref} className="relative">
        <svg
          width="100%"
          height={H}
          viewBox={`0 0 ${breite} ${H}`}
          role="img"
          tabIndex={0}
          aria-label={
            en
              ? `Bar chart: annual market value spot and solar ${daten[0].jahr} to ${daten[n - 1].jahr} in ct/kWh, most recently ${fmt(daten[n - 1].spot, 2)} and ${fmt(daten[n - 1].solar, 2)} ct/kWh, capture rate ${fmt(daten[n - 1].capture * 100)} percent. Use the arrow keys to move through the years.`
              : `Balkendiagramm: Jahresmarktwert Spot und Solar ${daten[0].jahr} bis ${daten[n - 1].jahr} in ct/kWh, zuletzt ${fmt(daten[n - 1].spot, 2)} und ${fmt(daten[n - 1].solar, 2)} ct/kWh, Capture Rate ${fmt(daten[n - 1].capture * 100)} Prozent. Mit Pfeiltasten durch die Jahre blättern.`
          }
          className="block touch-pan-y select-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2"
          onPointerMove={(e) => setzen(e.clientX, e.currentTarget)}
          onPointerDown={(e) => setzen(e.clientX, e.currentTarget)}
          onPointerLeave={() => setAktiv(null)}
          onBlur={() => setAktiv(null)}
          onKeyDown={(e) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault();
            const d = e.key === "ArrowRight" ? 1 : -1;
            setAktiv((v) => (v == null ? (d > 0 ? 0 : n - 1) : Math.max(0, Math.min(n - 1, v + d))));
          }}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line x1={m.l} x2={breite - m.r} y1={y(v)} y2={y(v)} stroke={RASTER} />
              <text x={m.l - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize="11.5" fill={ACHSE} className="ov-num">
                {v}
              </text>
            </g>
          ))}
          <text x={2} y={10} fontSize="10.5" fill={ACHSE}>
            ct/kWh
          </text>
          {a && <rect x={m.l + band * aktiv + 2} y={m.t} width={band - 4} height={ph} rx="8" fill="#151a24" fillOpacity="0.04" />}
          {daten.map((d, i) => (
            <g key={d.jahr}>
              {balken(x(i) - bw - 1, d.spot, SPOT, i * 1.5)}
              {balken(x(i) + 1, d.solar, SOLAR, i * 1.5 + 0.75)}
              <text x={x(i)} y={H - 30} textAnchor="middle" fontSize="11.5" fill={ACHSE} className="ov-num">
                {d.jahr}
              </text>
              {/* Capture Rate erscheint nach den Balken – sie ist das Verhältnis der beiden */}
              <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="#151a24" className="ov-num ov-flaeche-ein" style={{ animationDelay: `${700 + i * 60}ms` }}>
                {f.fmtPct(d.capture, 0)}
              </text>
            </g>
          ))}
        </svg>
        {a && (
          <Tooltip x={x(aktiv)} y={y(Math.max(a.spot, a.solar)) - 10} breite={breite}>
            <p className="font-semibold">{a.jahr}</p>
            <p>
              {en ? "Spot (base):" : "Spot (Base):"} <strong className="ov-num">{fmt(a.spot, 2)} ct/kWh</strong>
            </p>
            <p>
              Solar: <strong className="ov-num">{fmt(a.solar, 2)} ct/kWh</strong>
            </p>
            <p className="text-white/75">{en ? "Capture rate" : "Capture Rate"} {f.fmtPct(a.capture, 1)}</p>
          </Tooltip>
        )}
      </div>
      <figcaption className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
        {en
          ? "Percentages below the years: capture rate = annual market value solar ÷ annual market value spot. Source: transmission system operators (netztransparenz.de), own calculation."
          : "Prozentwerte unter den Jahren: Capture Rate = Jahresmarktwert Solar ÷ Jahresmarktwert Spot. Quelle: Übertragungsnetzbetreiber (netztransparenz.de), eigene Berechnung."}
      </figcaption>
    </figure>
  );
}
