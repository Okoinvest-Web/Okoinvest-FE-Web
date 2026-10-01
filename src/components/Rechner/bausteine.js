"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { fmt } from "@/lib/rechner/annahmen";

/* ------------------------------------------------------------------
   Gemeinsame Bedienelemente aller Rechner unter /rechner
   ------------------------------------------------------------------ */

const bewegungReduziert = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const sanft = (p) => 1 - Math.pow(1 - p, 3);

/* Zeitpunkt der letzten Nutzereingabe (Regler, Auswahl, Schalter, Zahlenfeld).
   Delta-Plaketten erscheinen nur als Antwort auf eine Eingabe – nicht beim
   Laden oder beim Wiederherstellen eines geteilten Links. */
let letzteEingabe = -1e9;
export const eingabeMerken = () => {
  letzteEingabe = typeof performance !== "undefined" ? performance.now() : 0;
};
const geradeEingegeben = () => typeof performance !== "undefined" && performance.now() - letzteEingabe < 700;

const vorzeichen = (text, d) => (d > 0 ? `+${text}` : `−${String(text).replace("-", "").replace("−", "")}`);

/**
 * Zahl, die bei Änderungen weich zum neuen Wert gleitet (Live-Ergebnis beim
 * Tippen und Schieben). Server-HTML enthält den Endwert; bei reduzierter
 * Bewegung springt sie direkt.
 *
 * format   eigene Formatierung je Frame, z. B. (v) => fmtMio(v) – sonst fmt(v, stellen)
 * einlauf  zählt beim ersten Sichtbarwerden einmal von 0 hoch (nur für die Hauptzahl)
 * delta    "hell" | "dunkel": nach einer Eingabe kurz die Veränderung zeigen („+0,3 %“)
 * deltaFormat  eigene Formatierung der Veränderung (Betrag), z. B. (d) => `${fmt(d, 1)} %-Pkt.`
 */
export function Zahl({ wert, stellen = 0, prefix = "", suffix = "", format, className, dauer = 520, einlauf = false, delta, deltaFormat }) {
  const ziel = Number.isFinite(wert) ? wert : 0;
  const [anzeige, setAnzeige] = useState(ziel);
  const aktuell = useRef(ziel);
  const el = useRef(null);
  const zielRef = useRef(ziel);
  zielRef.current = ziel;

  // Delta-Plakette: summiert eine Eingabe-Serie (z. B. Regler ziehen) und blendet nach 1,8 s aus
  const [veraenderung, setVeraenderung] = useState(null);
  const basis = useRef(null);
  const vorher = useRef(ziel);
  const timer = useRef(null);
  useEffect(() => {
    if (!delta) return undefined;
    const alt = vorher.current;
    vorher.current = ziel;
    if (Math.abs(alt - ziel) < 1e-9) return undefined;
    if (!geradeEingegeben()) {
      basis.current = null;
      return undefined;
    }
    if (basis.current == null) basis.current = alt;
    const d = ziel - basis.current;
    setVeraenderung(Math.abs(d) < 1e-9 ? null : d);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      basis.current = null;
      setVeraenderung(null);
    }, 1800);
    return undefined;
  }, [ziel, delta]);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Einmaliger Einlauf beim ersten Sichtbarwerden (1,4 s, wie CountUp)
  useEffect(() => {
    if (!einlauf || bewegungReduziert() || typeof IntersectionObserver === "undefined" || !el.current) return;
    let raf;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const schritt = (t) => {
          const p = Math.min((t - start) / 1400, 1);
          const v = zielRef.current * (1 - Math.pow(1 - p, 4));
          aktuell.current = v;
          setAnzeige(v);
          if (p < 1) raf = requestAnimationFrame(schritt);
        };
        raf = requestAnimationFrame(schritt);
      },
      { threshold: 0.4 }
    );
    io.observe(el.current);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [einlauf]);

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
      const v = von + (ziel - von) * sanft(p);
      aktuell.current = v;
      setAnzeige(v);
      if (p < 1) raf = requestAnimationFrame(schritt);
    };
    raf = requestAnimationFrame(schritt);
    return () => cancelAnimationFrame(raf);
  }, [ziel, dauer]);

  if (!Number.isFinite(wert)) return <span className={cn("ov-num", className)}>–</span>;
  // Im letzten Frame exakt den Zielwert formatieren (keine Rundungsreste)
  const v = Math.abs(anzeige - ziel) < 1e-9 ? ziel : anzeige;
  const zahl = (
    <>
      {prefix}
      {format ? format(v) : fmt(v, stellen)}
      {suffix}
    </>
  );
  if (!delta) {
    return (
      <span ref={el} className={cn("ov-num", className)}>
        {zahl}
      </span>
    );
  }
  const betrag = veraenderung == null ? "" : deltaFormat ? deltaFormat(Math.abs(veraenderung)) : `${format ? format(Math.abs(veraenderung)) : fmt(Math.abs(veraenderung), stellen)}${suffix}`;
  return (
    <span ref={el} className={cn("ov-num relative inline-block", className)}>
      {zahl}
      {/* Veränderung seit Beginn der Eingabe – absolut, kein Layout-Sprung */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-full right-0 mb-1 whitespace-nowrap rounded-full px-2 py-0.5 font-sans text-[11.5px] font-bold leading-4 tracking-normal transition-[opacity,transform] duration-200 ease-ov-out",
          delta === "dunkel" ? "bg-white/15 text-white" : "bg-navy-50 text-navy-700 ring-1 ring-navy-100",
          veraenderung == null ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
        )}
      >
        {veraenderung != null && (
          <>
            <span className="mr-0.5">{veraenderung > 0 ? "▲" : "▼"}</span>
            {vorzeichen(betrag, veraenderung)}
          </>
        )}
      </span>
    </span>
  );
}

const stellenVon = (step) => (String(step).split(".")[1] || "").length;

/**
 * Schieberegler mit großem Griff, Wertanzeige, Wertblase über dem Griff
 * (beim Ziehen und bei Tastaturfokus) und Min/Max-Beschriftung.
 * Tastatur: Pfeiltasten = ein Schritt, Umschalt + Pfeil = zehn Schritte,
 * Bild auf/ab = großer Sprung, Pos1/Ende = Minimum/Maximum (nativ).
 */
export function Regler({ label, wert, min, max, step = 1, einheit, onChange, hinweis, format, stellen = 0, dunkel = false, minLabel, maxLabel }) {
  const id = useId();
  const hilfeId = `${id}-hilfe`;
  const [blase, setBlase] = useState(false);
  const anteil = Math.max(0, Math.min(100, ((wert - min) / (max - min || 1)) * 100));
  const text = format ? format(wert) : `${fmt(wert, stellen)}${einheit ? ` ${einheit}` : ""}`;

  const runden = (v) => {
    const s = Math.round((v - min) / step) * step + min;
    return Number(Math.max(min, Math.min(max, s)).toFixed(stellenVon(step)));
  };

  const taste = (e) => {
    setBlase(true);
    if (!e.shiftKey) return;
    const richtung = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!richtung) return;
    e.preventDefault();
    const neu = runden(wert + richtung * step * 10);
    eingabeMerken();
    if (neu !== wert) onChange(neu);
  };

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
      <div className="relative">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={wert}
          aria-valuetext={text}
          aria-describedby={hinweis ? hilfeId : undefined}
          aria-keyshortcuts="Shift+ArrowLeft Shift+ArrowRight"
          onChange={(e) => {
            eingabeMerken();
            onChange(Number(e.target.value));
          }}
          onPointerDown={() => setBlase(true)}
          onPointerUp={() => setBlase(false)}
          onPointerCancel={() => setBlase(false)}
          onKeyDown={taste}
          onFocus={(e) => {
            try {
              if (e.currentTarget.matches(":focus-visible")) setBlase(true);
            } catch {
              /* ältere Browser ohne :focus-visible */
            }
          }}
          onBlur={() => setBlase(false)}
          className="ov-range block cursor-pointer"
          // Große Trefferfläche (44 px), die sichtbare Spur bleibt 8 px hoch
          style={{
            "--ov-fill": `${anteil}%`,
            height: 44,
            backgroundSize: "100% 8px",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            borderRadius: 0,
          }}
        />
        {/* Wertblase: folgt dem Griff (26 px breit), Pfeil zeigt exakt auf dessen Mitte */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute z-10"
          style={{ bottom: "calc(100% - 4px)", left: `calc(${anteil}% + ${13 - anteil * 0.26}px)`, transform: `translateX(-${anteil}%)` }}
        >
          <span
            className={cn(
              "relative block whitespace-nowrap rounded-lg px-2.5 py-1 font-display text-[13px] font-extrabold tracking-tight shadow-e3 transition-[opacity,transform] duration-200 ease-ov-out",
              dunkel ? "bg-white text-ink-900" : "bg-navy-950 text-white",
              blase ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            )}
          >
            <span className="ov-num">{text}</span>
            <span
              className={cn("absolute -bottom-1 h-2 w-2 -translate-x-1/2 rotate-45 rounded-[1px]", dunkel ? "bg-white" : "bg-navy-950")}
              style={{ left: `clamp(10px, ${anteil}%, calc(100% - 10px))` }}
            />
          </span>
        </span>
      </div>
      <div className={cn("-mt-1.5 flex justify-between text-[12px]", dunkel ? "text-white/75" : "text-ink-500")}>
        <span>{minLabel ?? (format ? format(min) : `${fmt(min, stellen)}${einheit ? ` ${einheit}` : ""}`)}</span>
        <span>{maxLabel ?? (format ? format(max) : `${fmt(max, stellen)}${einheit ? ` ${einheit}` : ""}`)}</span>
      </div>
      {hinweis && (
        <p id={hilfeId} className={cn("mt-2 text-[13px] leading-relaxed", dunkel ? "text-white/75" : "text-ink-500")}>
          {hinweis}
        </p>
      )}
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
              <input
                type="radio"
                name={name}
                value={o.id}
                checked={aktiv}
                onChange={() => {
                  eingabeMerken();
                  onChange(o.id);
                }}
                className="sr-only"
              />
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
        <input id={id} type="checkbox" role="switch" checked={an} onChange={(e) => {
            eingabeMerken();
            onChange(e.target.checked);
          }}
          className="peer sr-only"
        />
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

/**
 * Kennzahl-Kachel (Beleg unter der Hauptzahl).
 * ton: hell (Standard) | akzent (leise Marken-Betonung) | sand | gruen | navy
 */
export function Kennzahl({ label, children, zusatz, icon: Icon, ton = "hell", className }) {
  const toene = {
    hell: "bg-white ring-1 ring-ink-200/70 shadow-e1 text-ink-900",
    akzent: "bg-ov-50 ring-1 ring-ov-200 text-ink-900",
    gruen: "bg-ov-600 text-white shadow-e1",
    navy: "ov-verlauf-nacht ring-1 ring-white/10 shadow-kante text-white",
    sand: "bg-sand-50 ring-1 ring-ink-200/60 text-ink-900",
  };
  const dunkel = ton === "gruen" || ton === "navy";
  return (
    <div className={cn("relative min-w-0 overflow-hidden rounded-2xl p-4 md:p-5", toene[ton] || toene.hell, className)}>
      <p className={cn("flex items-center gap-1.5 text-[12.5px] font-medium", ton === "gruen" ? "text-white" : dunkel ? "text-white/75" : "text-ink-500")}>
        {Icon && <Icon aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0", dunkel ? "text-white/80" : ton === "akzent" ? "text-ov-700" : "text-ov-600")} />}
        <span className="min-w-0">{label}</span>
      </p>
      <p className="ov-num mt-1 whitespace-nowrap font-display text-[clamp(1.4rem,1.15rem+0.7vw,1.85rem)] font-extrabold leading-tight tracking-tight">{children}</p>
      {zusatz && <p className={cn("mt-1 text-[12.5px] leading-snug", ton === "gruen" ? "text-white" : dunkel ? "text-white/75" : "text-ink-500")}>{zusatz}</p>}
    </div>
  );
}

/**
 * Hauptzahl eines Rechners – die eine laute Stelle im Ergebnis.
 * Dunkle Karte, große Zahl (ov-kpi-l), Kontext darunter; `rechts` nimmt
 * eine kleine Einordnung auf (z. B. Spanne, Ring, Vergleichsbalken).
 * Belege (weitere Kennzahlen) folgen darunter in <Belege>.
 */
export function Hauptzahl({ label, icon: Icon, children, zusatz, rechts, className }) {
  return (
    <div className={cn("ov-verlauf-nacht relative overflow-hidden rounded-3xl p-5 text-white ring-1 ring-white/10 shadow-kante md:p-6", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-medium text-white/75">
            {Icon && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-ov-300">
                <Icon aria-hidden="true" className="h-4 w-4" />
              </span>
            )}
            {label}
          </p>
          <p className="ov-kpi-l mt-2 text-white">{children}</p>
          {zusatz && <p className="mt-1.5 text-[13.5px] leading-snug text-white/75">{zusatz}</p>}
        </div>
        {rechts && <div className="min-w-0 shrink-0">{rechts}</div>}
      </div>
    </div>
  );
}

/** Raster der Belege unter der Hauptzahl (2 Spalten, ab xl 3). */
export function Belege({ children, spalten = 3, className }) {
  return <div className={cn("mt-3 grid grid-cols-2 gap-3", spalten === 3 ? "xl:grid-cols-3" : spalten === 4 ? "xl:grid-cols-4" : "", className)}>{children}</div>;
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
