"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "./cn";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Tabs nach WAI-ARIA (Pfeiltasten, Pos1/Ende, automatische Aktivierung).
 * Der Indikator gleitet per transform zum aktiven Tab.
 *
 * tabs: Liste von { id, label, icon?, zaehler?, inhalt? }
 * wert / onWechsel: kontrolliert; sonst start (Standard: erster Tab)
 * variante: linie (Unterstrich, Seiten-Navigation) | pille (Segmented Control, Ansichten)
 * dunkel: auf Navy-Flächen
 * Inhalt: entweder je Tab `inhalt` oder children als Funktion (aktiveId) => JSX.
 */
export default function Tabs({ tabs = [], wert, onWechsel, start, variante = "linie", dunkel = false, label = "Ansicht", className, panelClassName, children }) {
  const basisId = useId();
  const [intern, setIntern] = useState(start ?? tabs[0]?.id);
  const aktiv = wert ?? intern;
  const knoepfe = useRef({});
  const leiste = useRef(null);
  const [indikator, setIndikator] = useState(null);

  const waehlen = useCallback(
    (id) => {
      if (wert === undefined) setIntern(id);
      onWechsel?.(id);
    },
    [wert, onWechsel]
  );

  const messen = useCallback(() => {
    const el = knoepfe.current[aktiv];
    if (!el) return;
    setIndikator({ x: el.offsetLeft, w: el.offsetWidth, y: el.offsetTop, h: el.offsetHeight });
  }, [aktiv]);

  useIsoLayoutEffect(messen, [messen, tabs.length]);
  useEffect(() => {
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(messen) : null;
    if (ro && leiste.current) ro.observe(leiste.current);
    return () => ro?.disconnect();
  }, [messen]);

  const tasten = (e, i) => {
    const n = tabs.length;
    let ziel = null;
    if (e.key === "ArrowRight") ziel = (i + 1) % n;
    else if (e.key === "ArrowLeft") ziel = (i - 1 + n) % n;
    else if (e.key === "Home") ziel = 0;
    else if (e.key === "End") ziel = n - 1;
    if (ziel === null) return;
    e.preventDefault();
    const t = tabs[ziel];
    waehlen(t.id);
    knoepfe.current[t.id]?.focus();
  };

  const pille = variante === "pille";
  const aktiverTab = tabs.find((t) => t.id === aktiv);
  const inhalt = typeof children === "function" ? children(aktiv) : aktiverTab?.inhalt ?? children;

  return (
    <div className={className}>
      <div
        ref={leiste}
        role="tablist"
        aria-label={label}
        className={cn(
          "ov-no-scrollbar relative flex max-w-full overflow-x-auto",
          pille
            ? cn("w-fit gap-1 rounded-full p-1", dunkel ? "bg-white/10" : "bg-ink-100")
            : cn("gap-1 border-b", dunkel ? "border-white/15" : "border-ink-200")
        )}
      >
        {indikator && (
          <span
            aria-hidden="true"
            className={cn(
              "ov-tab-indikator",
              pille ? cn("rounded-full shadow-e2", dunkel ? "bg-white/15" : "bg-white") : cn("bottom-0 h-0.5 rounded-full", dunkel ? "bg-ov-300" : "bg-ov-600")
            )}
            style={{
              transform: `translateX(${indikator.x}px) scaleX(${indikator.w / 100})`,
              ...(pille ? { top: indikator.y, height: indikator.h } : {}),
            }}
          />
        )}
        {tabs.map((t, i) => {
          const an = t.id === aktiv;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              ref={(el) => (knoepfe.current[t.id] = el)}
              type="button"
              role="tab"
              id={`${basisId}-tab-${t.id}`}
              aria-selected={an}
              aria-controls={`${basisId}-panel`}
              tabIndex={an ? 0 : -1}
              onClick={() => waehlen(t.id)}
              onKeyDown={(e) => tasten(e, i)}
              className={cn(
                "relative z-10 inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold transition-colors",
                pille ? "h-9 rounded-full px-4 text-[13.5px]" : "h-11 px-3.5 text-[14.5px]",
                an
                  ? dunkel ? "text-white" : pille ? "text-ink-900" : "text-ov-700"
                  : dunkel ? "text-white/65 hover:text-white" : "text-ink-500 hover:text-ink-900"
              )}
            >
              {Icon && <Icon aria-hidden="true" className="h-4 w-4" />}
              {t.label}
              {t.zaehler != null && (
                <span
                  className={cn(
                    "ov-num rounded-full px-1.5 py-px text-[11.5px] font-bold",
                    an ? (dunkel ? "bg-ov-300 text-navy-950" : "bg-ov-600 text-white") : dunkel ? "bg-white/10 text-white/80" : "bg-ink-200/70 text-ink-600"
                  )}
                >
                  {t.zaehler}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {inhalt != null && (
        <div
          key={aktiv}
          role="tabpanel"
          id={`${basisId}-panel`}
          aria-labelledby={`${basisId}-tab-${aktiv}`}
          tabIndex={0}
          className={cn("ov-tab-panel mt-5 focus-visible:outline-offset-4", panelClassName)}
        >
          {inhalt}
        </div>
      )}
    </div>
  );
}
