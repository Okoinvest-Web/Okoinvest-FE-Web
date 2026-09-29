"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { fmt } from "@/lib/rechner/annahmen";

/* ------------------------------------------------------------------
   Gemeinsame Bedienelemente aller Rechner unter /rechner
   ------------------------------------------------------------------ */

const bewegungReduziert = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Zahl, die bei Änderungen weich zum neuen Wert gleitet.
 * Server-HTML enthält den Endwert; bei reduzierter Bewegung springt sie direkt.
 */
export function Zahl({ wert, stellen = 0, prefix = "", suffix = "", className, dauer = 520 }) {
  const ziel = Number.isFinite(wert) ? wert : 0;
  const [anzeige, setAnzeige] = useState(ziel);
  const aktuell = useRef(ziel);

  useEffect(() => {
    if (bewegungReduziert()) {
      aktuell.current = ziel;
      setAnzeige(ziel);
      return;
    }
    const von = aktuell.current;
    if (Math.abs(von - ziel) < 1e-9) return;
    let raf;
    const start = performance.now();
    const schritt = (t) => {
      const p = Math.min((t - start) / dauer, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const v = von + (ziel - von) * e;
      aktuell.current = v;
      setAnzeige(v);
      if (p < 1) raf = requestAnimationFrame(schritt);
    };
    raf = requestAnimationFrame(schritt);
    return () => cancelAnimationFrame(raf);
  }, [ziel, dauer]);

  if (!Number.isFinite(wert)) return <span className={cn("ov-num", className)}>–</span>;
  return (
    <span className={cn("ov-num", className)}>
      {prefix}
      {fmt(anzeige, stellen)}
      {suffix}
    </span>
  );
}

/** Schieberegler mit großem Griff, Wertanzeige und Min/Max-Beschriftung. */
export function Regler({ label, wert, min, max, step = 1, einheit, onChange, hinweis, format, stellen = 0, dunkel = false, minLabel, maxLabel }) {
  const id = useId();
  const anteil = ((wert - min) / (max - min)) * 100;
  const text = format ? format(wert) : `${fmt(wert, stellen)}${einheit ? ` ${einheit}` : ""}`;
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={cn("text-[14.5px] font-semibold", dunkel ? "text-white" : "text-ink-800")}>
          {label}
        </label>
        <output htmlFor={id} className={cn("ov-num shrink-0 font-display text-[17px] font-extrabold tracking-tight", dunkel ? "text-ov-300" : "text-ink-900")}>
          {text}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={wert}
        aria-valuetext={text}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ov-range block cursor-pointer"
        // Große Trefferfläche (44 px), die sichtbare Spur bleibt 8 px hoch
        style={{
          "--ov-fill": `${Math.max(0, Math.min(100, anteil))}%`,
          height: 44,
          backgroundSize: "100% 8px",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          borderRadius: 0,
        }}
      />
      <div className={cn("-mt-1.5 flex justify-between text-[12px]", dunkel ? "text-white/45" : "text-ink-500")}>
        <span>{minLabel ?? (format ? format(min) : `${fmt(min, stellen)}${einheit ? ` ${einheit}` : ""}`)}</span>
        <span>{maxLabel ?? (format ? format(max) : `${fmt(max, stellen)}${einheit ? ` ${einheit}` : ""}`)}</span>
      </div>
      {hinweis && <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{hinweis}</p>}
    </div>
  );
}

/** Segmentierte Auswahl (echte Radio-Inputs, per Tastatur bedienbar). */
export function Auswahl({ legende, optionen, wert, onChange, spalten, klein = false }) {
  const name = useId();
  return (
    <fieldset>
      {legende && <legend className="mb-2.5 text-[14.5px] font-semibold text-ink-800">{legende}</legend>}
      <div
        className={cn("grid gap-1.5 rounded-2xl bg-ink-100/80 p-1.5")}
        style={{ gridTemplateColumns: `repeat(${spalten || optionen.length}, minmax(0, 1fr))` }}
      >
        {optionen.map((o) => {
          const aktiv = wert === o.id;
          return (
            <label
              key={o.id}
              className={cn(
                "relative flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-xl px-2 py-1.5 text-center leading-tight transition-all duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
                klein ? "text-[13px]" : "text-[14px]",
                aktiv ? "bg-white font-semibold text-ink-900 shadow-[0_2px_8px_-2px_rgba(21,26,36,0.18)] ring-1 ring-ink-200/70" : "text-ink-600 hover:text-ink-800"
              )}
            >
              <input type="radio" name={name} value={o.id} checked={aktiv} onChange={() => onChange(o.id)} className="sr-only" />
              <span>{o.label}</span>
              {o.sub && <span className={cn("mt-0.5 text-[11.5px] font-normal", aktiv ? "text-ov-700" : "text-ink-500")}>{o.sub}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Ein/Aus-Schalter mit Icon und optionaler Zusatzzeile. */
export function Schalter({ label, beschreibung, an, onChange, icon: Icon, children }) {
  const id = useId();
  return (
    <div className={cn("rounded-2xl ring-1 transition-colors", an ? "bg-white ring-ov-300" : "bg-white/60 ring-ink-200")}>
      <label htmlFor={id} className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3">
        {Icon && (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors", an ? "bg-ov-500 text-white" : "bg-ink-100 text-ink-500")}>
            <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-semibold text-ink-800">{label}</span>
          {beschreibung && <span className="block text-[12.5px] leading-snug text-ink-500">{beschreibung}</span>}
        </span>
        <input id={id} type="checkbox" role="switch" checked={an} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span
          aria-hidden="true"
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 peer-focus-visible:ring-2 peer-focus-visible:ring-ov-500 peer-focus-visible:ring-offset-2",
            an ? "bg-ov-500" : "bg-ink-300"
          )}
        >
          <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300", an ? "translate-x-6" : "translate-x-1")} />
        </span>
      </label>
      {an && children && <div className="border-t border-ink-100 px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}

/** Überschrift eines Eingabeblocks */
export function Gruppe({ titel, children, className }) {
  return (
    <div className={cn("space-y-5", className)}>
      {titel && <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink-500">{titel}</p>}
      {children}
    </div>
  );
}

/** Beobachtet die Breite eines Elements (für Diagramme ohne Skalierung der Schrift). */
export function useBreite(standard = 720) {
  const ref = useRef(null);
  const [breite, setBreite] = useState(standard);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      if (w > 0) setBreite(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, breite];
}

/** Kennzahl-Kachel */
export function Kennzahl({ label, children, zusatz, icon: Icon, ton = "hell", className }) {
  const toene = {
    hell: "bg-white ring-1 ring-ink-200/70 text-ink-900",
    gruen: "bg-ov-600 text-white",
    navy: "bg-navy-950 text-white",
    sand: "bg-sand-50 ring-1 ring-ink-200/60 text-ink-900",
  };
  const dunkel = ton === "gruen" || ton === "navy";
  return (
    <div className={cn("relative overflow-hidden rounded-2xl p-4 md:p-5", toene[ton], className)}>
      <p className={cn("flex items-center gap-1.5 text-[12.5px] font-medium", ton === "gruen" ? "text-white" : dunkel ? "text-white/75" : "text-ink-500")}>
        {Icon && <Icon aria-hidden="true" className={cn("h-3.5 w-3.5", dunkel ? "text-white/80" : "text-ov-600")} />}
        {label}
      </p>
      <p className="mt-1 whitespace-nowrap font-display text-[clamp(1.4rem,1.15rem+0.7vw,1.85rem)] font-extrabold leading-tight tracking-tight">{children}</p>
      {zusatz && <p className={cn("mt-1 text-[12.5px] leading-snug", ton === "gruen" ? "text-white" : dunkel ? "text-white/70" : "text-ink-500")}>{zusatz}</p>}
    </div>
  );
}

/** Diagramm-Tooltip (absolut positioniert im relativen Container) */
export function Tooltip({ x, y, breite, children }) {
  const links = x > breite / 2;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-[150px] rounded-xl bg-ink-900 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-white shadow-xl"
      style={{ top: Math.max(y, 0), ...(links ? { right: breite - x + 14 } : { left: x + 14 }) }}
    >
      {children}
    </div>
  );
}
