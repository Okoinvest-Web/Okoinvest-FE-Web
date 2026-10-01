"use client";

// src/components/formular/Schritte.js
//
// Bausteine für Assistenten:
//  • SchrittFortschritt – Leiste (scaleX, kein width-Repaint) + Schrittpunkte, erledigte Schritte anklickbar
//  • SchrittBuehne      – Inhalt wechselt mit Richtung (ov-step-vor / ov-step-zurueck), Fokus auf Überschrift
//  • useSchrittRichtung – "vor" | "zurueck" aus dem Wechsel des Index

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/components/ui/cn";

/** Richtung des letzten Schrittwechsels */
export function useSchrittRichtung(index) {
  const [stand, setStand] = useState({ index, richtung: "vor" });
  if (stand.index !== index) setStand({ index, richtung: index > stand.index ? "vor" : "zurueck" });
  return stand.richtung;
}

/**
 * schritte: [{ id?, titel, kurz? }]; aktiv: Index; erledigt?: Index-Set/Array (sonst alle < aktiv);
 * onSchritt(i): Sprung (nur erledigte bzw. bereits besuchte Schritte); dunkel; kompakt (nur Leiste + Text)
 */
export function SchrittFortschritt({ schritte = [], aktiv = 0, erledigt, onSchritt, dunkel = false, kompakt = false, label = "Fortschritt", className }) {
  const n = schritte.length || 1;
  const fertig = new Set(erledigt ? Array.from(erledigt) : schritte.map((_, i) => i).filter((i) => i < aktiv));
  const anteil = Math.min(1, Math.max(0, (aktiv + (fertig.has(aktiv) ? 1 : 0)) / n));
  const aktuell = schritte[aktiv];

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className={cn("font-semibold", dunkel ? "text-white" : "text-ink-900")}>
          Schritt <span className="ov-num">{Math.min(aktiv + 1, n)}</span> von <span className="ov-num">{n}</span>
          {aktuell && <span className={cn("font-normal", dunkel ? "text-white/75" : "text-ink-600")}> · {aktuell.kurz || aktuell.titel}</span>}
        </span>
        <span className={cn("ov-num", dunkel ? "text-white/70" : "text-ink-500")}>{Math.round(anteil * 100)} %</span>
      </div>
      <div
        className={cn("mt-2 h-1.5 overflow-hidden rounded-full", dunkel ? "bg-white/15" : "bg-ink-100")}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={n}
        aria-valuenow={Math.min(aktiv + 1, n)}
        aria-valuetext={`Schritt ${Math.min(aktiv + 1, n)} von ${n}${aktuell ? `: ${aktuell.titel}` : ""}`}
      >
        <div className={cn("ov-fortschritt h-full rounded-full", dunkel ? "bg-ov-300" : "bg-ov-500")} style={{ transform: `scaleX(${Math.max(0.04, anteil)})` }} />
      </div>
      {!kompakt && schritte.length > 1 && (
        <ol className="mt-4 flex gap-1.5 overflow-x-auto pb-1 sm:gap-2" aria-label="Schritte">
          {schritte.map((s, i) => {
            const istAktiv = i === aktiv;
            const istFertig = fertig.has(i) && !istAktiv;
            const klickbar = !!onSchritt && !istAktiv && (istFertig || i < aktiv);
            const inhalt = (
              <>
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors duration-200",
                    istFertig ? (dunkel ? "bg-ov-300 text-navy-950" : "bg-ov-600 text-white") : istAktiv ? (dunkel ? "bg-white text-navy-950" : "bg-navy-900 text-white") : dunkel ? "bg-white/10 text-white/75" : "bg-ink-100 text-ink-600"
                  )}
                >
                  {istFertig ? <Check aria-hidden="true" className="ov-erfolg h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className={cn("hidden min-w-0 truncate text-[13px] sm:inline", istAktiv ? (dunkel ? "font-semibold text-white" : "font-semibold text-ink-900") : dunkel ? "text-white/75" : "text-ink-600")}>{s.kurz || s.titel}</span>
                <span className="sr-only">{istFertig ? " – erledigt" : istAktiv ? " – aktueller Schritt" : " – offen"}</span>
              </>
            );
            return (
              <li key={s.id || i} className="min-w-0 flex-1" aria-current={istAktiv ? "step" : undefined}>
                {klickbar ? (
                  <button type="button" onClick={() => onSchritt(i)} className={cn("flex w-full min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-2 text-left transition-colors", dunkel ? "hover:bg-white/10" : "hover:bg-ink-50")} aria-label={`Zu Schritt ${i + 1}: ${s.titel}`}>
                    {inhalt}
                  </button>
                ) : (
                  <div className="flex min-w-0 items-center gap-2 py-1 pl-1 pr-2">{inhalt}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/**
 * Wechselt den Inhalt mit Richtungsanimation. `schluessel` ändert sich je Schritt.
 * fokusZiel: Selektor innerhalb der Bühne, der nach dem Wechsel fokussiert wird (Standard: erste Überschrift).
 */
export function SchrittBuehne({ schluessel, richtung = "vor", fokusZiel = "h1, h2, h3, [data-schritt-titel]", className, children }) {
  const ref = useRef(null);
  const erster = useRef(true);
  useEffect(() => {
    if (erster.current) {
      erster.current = false;
      return;
    }
    if (!fokusZiel) return;
    const el = ref.current?.querySelector(fokusZiel);
    if (el) {
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: false });
    }
  }, [schluessel, fokusZiel]);
  return (
    <div ref={ref} key={schluessel} className={cn(richtung === "zurueck" ? "ov-step-zurueck" : "ov-step-vor", className)}>
      {children}
    </div>
  );
}
