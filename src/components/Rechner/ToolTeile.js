"use client";

import { useState } from "react";
import { CheckCircle2, CircleAlert, OctagonAlert, Printer } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Legende } from "./InvestTeile";
import { Tooltip, eingabeMerken, useBreite } from "./bausteine";
import { fmt } from "@/lib/rechner/annahmen";

/* ------------------------------------------------------------------
   Ergänzende Bausteine der Tools aus Ausbaustufe 2 (Pachtangebot-Check,
   PPA, Großspeicher, Beteiligung, Energy Sharing, Netzanschluss):
   Ampel-Marke, Balken- und Liniendiagramm, Druckknopf.
   ------------------------------------------------------------------ */

export const FARBEN = { gruen: "#669933", gruenHell: "#aed083", navy: "#1f5aa1", navyDunkel: "#03285a", sun: "#f5a70f", sunHell: "#ffc53d", grau: "#c4cad5", ink: "#151a24", raster: "#eef0f4", null: "#97a0b0" };

export const AMPEL = {
  gut: { label: "Marktüblich", kurz: "Gut", icon: CheckCircle2, klasse: "bg-ov-50 text-ov-800 ring-ov-200", punkt: "bg-ov-500", iconKlasse: "text-ov-600" },
  pruefen: { label: "Nachfragen", kurz: "Prüfen", icon: CircleAlert, klasse: "bg-sun-300/30 text-ink-900 ring-sun-400/60", punkt: "bg-sun-400", iconKlasse: "text-sun-500" },
  kritisch: { label: "Kritisch", kurz: "Kritisch", icon: OctagonAlert, klasse: "bg-ink-900 text-white ring-ink-900", punkt: "bg-ink-900", iconKlasse: "text-sun-400" },
};

/** Ampel-Plakette mit Icon und Text (nie nur Farbe) */
export function AmpelMarke({ ampel, klein = false, className }) {
  const a = AMPEL[ampel] || AMPEL.pruefen;
  const Icon = a.icon;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold ring-1", klein ? "px-2 py-0.5 text-[11.5px]" : "px-2.5 py-1 text-[12.5px]", a.klasse, className)}>
      <Icon aria-hidden="true" className={cn(klein ? "h-3 w-3" : "h-3.5 w-3.5", ampel === "kritisch" ? "text-sun-300" : a.iconKlasse)} />
      {a.label}
    </span>
  );
}

/** Druckknopf (öffnet die Druckansicht des Browsers) */
export function Druckknopf({ children = "Druckansicht / PDF", className }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 transition-colors hover:bg-ink-50 hover:ring-ink-300 print:hidden",
        className
      )}
    >
      <Printer aria-hidden="true" className="h-4 w-4" />
      {children}
    </button>
  );
}

/** Runde Achsenschritte */
export function achse(min, max, ziel = 5) {
  const spanne = max - min || 1;
  const roh = spanne / ziel;
  const pot = Math.pow(10, Math.floor(Math.log10(roh)));
  const s = [1, 2, 2.5, 5, 10].map((f) => f * pot).find((v) => spanne / v <= ziel + 1) || pot * 10;
  const out = [];
  for (let v = Math.ceil(min / s) * s; v <= max + 1e-9; v += s) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/** Kompakte €-Beschriftung für Achsen */
export const achsenEur = (v, waehrung = "") => {
  const a = Math.abs(v);
  const vz = v < 0 ? "−" : "";
  const w = waehrung ? ` ${waehrung}` : "";
  if (a >= 1e6) return `${vz}${fmt(a / 1e6, a >= 1e7 ? 0 : 1)} Mio.${w}`;
  if (a >= 1e3) return `${vz}${fmt(a / 1e3)} Tsd.${w}`;
  return `${vz}${fmt(a)}${w}`;
};

/**
 * Tastatur für Diagramme: Pfeile wandern durch die Punkte, Pos1/Ende springen,
 * Esc schließt den Tooltip. Fokus per Tastatur zeigt sofort den ersten Punkt.
 */
export function useDiagrammTastatur(n, setHover) {
  return {
    tabIndex: 0,
    onKeyDown: (e) => {
      const schritt = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (schritt) {
        e.preventDefault();
        setHover((h) => Math.max(0, Math.min(n - 1, (h ?? (schritt > 0 ? -1 : n)) + schritt)));
      } else if (e.key === "Home") {
        e.preventDefault();
        setHover(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setHover(n - 1);
      } else if (e.key === "Escape") {
        setHover(null);
      }
    },
    onFocus: (e) => {
      try {
        if (e.currentTarget.matches(":focus-visible")) setHover((h) => h ?? 0);
      } catch {
        /* ältere Browser */
      }
    },
    onBlur: () => setHover(null),
  };
}

const diagrammFokus = "rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2";

/**
 * Balkendiagramm je Jahr: positive Serien nach oben gestapelt, negative nach
 * unten; optional eine Linie (z. B. kumuliert oder Cashflow) auf derselben Skala.
 * Balken wachsen beim Einscrollen (ov-balken-y), Wertänderungen gleiten per
 * transform; per Tastatur (Pfeile) durch die Jahre.
 * zeilen: [{ label, werte: { key: zahl } }]
 */
export function BalkenJahre({ zeilen, serien, linie, ariaLabel, tooltip, hoehe, markierung, achsenFormat = achsenEur }) {
  const [ref, W] = useBreite(720);
  const [hover, setHover] = useState(null);
  const schmal = W < 520;
  const H = hoehe || (schmal ? 240 : 290);
  const P = { l: schmal ? 54 : 62, r: 12, t: 16, b: 28 };
  const n = zeilen.length;
  const tastatur = useDiagrammTastatur(n, setHover);
  const oben = zeilen.map((z) => serien.reduce((s, x) => s + Math.max(0, z.werte[x.key] || 0), 0));
  const unten = zeilen.map((z) => serien.reduce((s, x) => s + Math.min(0, z.werte[x.key] || 0), 0));
  const linienWerte = linie ? zeilen.map((z) => z.werte[linie.key] || 0) : [];
  const max = Math.max(0, ...oben, ...linienWerte) * 1.08 || 1;
  const min = Math.min(0, ...unten, ...linienWerte) * 1.08;
  const y = (v) => Math.round((P.t + ((max - v) / (max - min || 1)) * (H - P.t - P.b)) * 10) / 10;
  const band = (W - P.l - P.r) / n;
  const bw = Math.max(2, Math.min(34, band * 0.66));
  const x = (i) => P.l + i * band + (band - bw) / 2;
  const ticks = achse(min, max, schmal ? 4 : 5);
  const aus = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    return Math.max(0, Math.min(n - 1, Math.floor((px - P.l) / band)));
  };
  const labelJeder = n > 24 ? 5 : n > 12 ? (schmal ? 5 : 2) : schmal && n > 8 ? 2 : 1;
  // Balken als Einheitsrechteck, Lage und Höhe per transform (gleitet bei neuen Werten)
  const balken = (key, x0, yTop, h, farbe) => (
    <rect key={key} x={0} y={0} width={1} height={1} fill={farbe} className="ov-rechner-balken" style={{ transform: `translate(${x0}px, ${yTop}px) scale(${bw}, ${Math.max(0, h)})` }} />
  );

  return (
    <div ref={ref} className="ov-reveal relative px-2 pb-4 pt-2 md:px-3" data-dir="ohne" suppressHydrationWarning>
      <div {...tastatur} role="group" aria-label={`${ariaLabel} Mit den Pfeiltasten durch die Werte.`} className={diagrammFokus}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="block touch-pan-y select-none" role="img" aria-label={ariaLabel}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={Math.abs(v) < 1e-9 ? FARBEN.null : FARBEN.raster} />
              <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="fill-ink-500 text-[10.5px]">
                {achsenFormat(v)}
              </text>
            </g>
          ))}
          {markierung && markierung.index > 0 && markierung.index < n && (
            <g>
              <line x1={P.l + markierung.index * band} x2={P.l + markierung.index * band} y1={P.t - 4} y2={H - P.b} stroke={FARBEN.sun} strokeDasharray="3 4" />
              <text x={P.l + markierung.index * band + 4} y={P.t + 8} className="fill-sun-700 text-[10.5px] font-semibold">
                {markierung.text}
              </text>
            </g>
          )}
          {hover != null && <rect x={P.l + hover * band} y={P.t} width={band} height={H - P.t - P.b} fill={FARBEN.raster} opacity="0.7" pointerEvents="none" />}
          {zeilen.map((z, i) => {
            let yo = 0;
            let yu = 0;
            return (
              <g key={i} opacity={hover == null || hover === i ? 1 : 0.55} className="transition-opacity duration-150">
                <g className="ov-balken-y" style={{ "--i": Math.min(i, 30) * 0.5 }}>
                  {serien.map((s) => {
                    const v = z.werte[s.key] || 0;
                    if (v === 0) return null;
                    if (v > 0) {
                      const y1 = y(yo + v);
                      const y0 = y(yo);
                      yo += v;
                      return balken(s.key, x(i), y1, y0 - y1, s.farbe);
                    }
                    const y0 = y(yu);
                    const y1 = y(yu + v);
                    yu += v;
                    return balken(s.key, x(i), y0, y1 - y0, s.farbe);
                  })}
                </g>
              </g>
            );
          })}
          {linie && (
            <path
              d={linienWerte.map((v, i) => `${i ? "L" : "M"}${(x(i) + bw / 2).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
              fill="none"
              stroke={linie.farbe}
              strokeWidth="2.25"
              strokeLinejoin="round"
              pathLength="1"
              className="ov-linie"
              style={{ "--ov-delay": "300ms" }}
            />
          )}
          {zeilen.map((z, i) =>
            i % labelJeder === 0 || i === n - 1 ? (
              <text key={i} x={x(i) + bw / 2} y={H - P.b + 17} textAnchor="middle" className="fill-ink-500 text-[10.5px]">
                {z.label}
              </text>
            ) : null
          )}
          <rect x={0} y={0} width={W} height={H} fill="transparent" onPointerMove={(e) => setHover(aus(e))} onPointerDown={(e) => setHover(aus(e))} onPointerLeave={() => setHover(null)} />
        </svg>
      </div>
      {hover != null && tooltip && (
        <Tooltip x={x(hover) + bw / 2} y={Math.max(y(oben[hover]) - 30, 0)} breite={W}>
          {tooltip(zeilen[hover], hover)}
        </Tooltip>
      )}
      <div className="mt-1 px-3">
        <Legende items={[...serien.map((s) => ({ label: s.label, farbe: s.farbe })), ...(linie ? [{ label: linie.label, farbe: linie.farbe, linie: true }] : [])]} />
      </div>
    </div>
  );
}

/**
 * Liniendiagramm mit mehreren Serien über gemeinsame x-Werte.
 * Durchgezogene Linien zeichnen sich beim Einscrollen (ov-linie),
 * gestrichelte blenden ein; per Tastatur (Pfeile) durch die Punkte.
 * serien: [{ key, label, farbe, werte: [..], dick?, gestrichelt? }]
 */
export function Linien({ xLabels, serien, ariaLabel, tooltip, hoehe, achsenFormat = achsenEur, nullLinie = true }) {
  const [ref, W] = useBreite(720);
  const [hover, setHover] = useState(null);
  const schmal = W < 520;
  const H = hoehe || (schmal ? 240 : 280);
  const P = { l: schmal ? 54 : 62, r: 14, t: 16, b: 28 };
  const n = xLabels.length;
  const tastatur = useDiagrammTastatur(n, setHover);
  const alle = serien.flatMap((s) => s.werte);
  const max = Math.max(nullLinie ? 0 : -Infinity, ...alle);
  const min = Math.min(nullLinie ? 0 : Infinity, ...alle);
  const pad = (max - min) * 0.08 || 1;
  const hi = max + pad;
  const lo = min < 0 || !nullLinie ? min - pad : 0;
  const x = (i) => Math.round((P.l + (n > 1 ? i / (n - 1) : 0.5) * (W - P.l - P.r)) * 10) / 10;
  const y = (v) => Math.round((P.t + ((hi - v) / (hi - lo || 1)) * (H - P.t - P.b)) * 10) / 10;
  const ticks = achse(lo, hi, schmal ? 4 : 5);
  const aus = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    return Math.max(0, Math.min(n - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (n - 1))));
  };
  const labelJeder = n > 24 ? 5 : n > 12 ? (schmal ? 5 : 2) : schmal && n > 8 ? 2 : 1;

  return (
    <div ref={ref} className="ov-reveal relative px-2 pb-4 pt-2 md:px-3" data-dir="ohne" suppressHydrationWarning>
      <div {...tastatur} role="group" aria-label={`${ariaLabel} Mit den Pfeiltasten durch die Werte.`} className={diagrammFokus}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="block touch-pan-y select-none" role="img" aria-label={ariaLabel}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke={Math.abs(v) < 1e-9 ? FARBEN.null : FARBEN.raster} />
              <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="fill-ink-500 text-[10.5px]">
                {achsenFormat(v)}
              </text>
            </g>
          ))}
          {xLabels.map((l, i) =>
            i % labelJeder === 0 || i === n - 1 ? (
              <text key={i} x={x(i)} y={H - P.b + 17} textAnchor={i === n - 1 && n > 1 ? "end" : "middle"} className="fill-ink-500 text-[10.5px]">
                {l}
              </text>
            ) : null
          )}
          {serien.map((s, si) => (
            <path
              key={s.key}
              d={s.werte.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")}
              fill="none"
              stroke={s.farbe}
              strokeWidth={s.dick ? 3 : 2}
              strokeDasharray={s.gestrichelt ? "5 5" : undefined}
              strokeLinejoin="round"
              // pathLength nur bei durchgezogenen Linien – sonst verzerrt es das Strichmuster
              pathLength={s.gestrichelt ? undefined : 1}
              className={s.gestrichelt ? "ov-flaeche-ein" : "ov-linie"}
              style={{ "--ov-delay": `${si * 120}ms` }}
            />
          ))}
          {hover != null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke={FARBEN.null} strokeDasharray="2 3" />
              {serien.map((s) => (
                <circle key={s.key} cx={x(hover)} cy={y(s.werte[hover])} r="4.5" fill="#fff" stroke={s.farbe} strokeWidth="2.5" />
              ))}
            </g>
          )}
          <rect x={0} y={0} width={W} height={H} fill="transparent" onPointerMove={(e) => setHover(aus(e))} onPointerDown={(e) => setHover(aus(e))} onPointerLeave={() => setHover(null)} />
        </svg>
      </div>
      {hover != null && tooltip && (
        <Tooltip x={x(hover)} y={Math.max(Math.min(...serien.map((s) => y(s.werte[hover]))) - 40, 0)} breite={W}>
          {tooltip(hover)}
        </Tooltip>
      )}
      <div className="mt-1 px-3">
        <Legende items={serien.map((s) => ({ label: s.label, farbe: s.farbe, linie: true, gestrichelt: s.gestrichelt }))} />
      </div>
    </div>
  );
}

/** Rahmen für ein Diagramm mit Titel und optionalem Umschalter */
export function DiagrammKarte({ titel, zusatz, rechts, children, className }) {
  return (
    <div className={cn("rounded-3xl bg-white shadow-e1 ring-1 ring-ink-200/70", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 md:px-6">
        <div className="min-w-0">
          <h3 className="font-display text-[17px] font-bold text-ink-900">{titel}</h3>
          {zusatz && <p className="text-[12.5px] text-ink-500">{zusatz}</p>}
        </div>
        {rechts}
      </div>
      {children}
    </div>
  );
}

/** Zahlenfeld (für exakte Eingaben, z. B. aus einem Angebot) */
export function ZahlFeld({ label, wert, onChange, min = 0, max, step = 1, einheit, hinweis, id }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[14.5px] font-semibold text-ink-800">
        {label}
      </label>
      <div className="flex items-center overflow-hidden rounded-2xl bg-white ring-1 ring-ink-200 focus-within:ring-2 focus-within:ring-ov-500">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(wert) ? wert : ""}
          onChange={(e) => {
            const v = Number(e.target.value);
            eingabeMerken();
            if (Number.isFinite(v)) onChange(max != null ? Math.min(max, Math.max(min, v)) : Math.max(min, v));
          }}
          className="ov-num h-12 w-full min-w-0 bg-transparent px-4 font-display text-[17px] font-bold text-ink-900 outline-none"
        />
        {einheit && <span className="shrink-0 pr-4 text-[13.5px] font-medium text-ink-500">{einheit}</span>}
      </div>
      {hinweis && <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{hinweis}</p>}
    </div>
  );
}
