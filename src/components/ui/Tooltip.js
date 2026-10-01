"use client";

import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from "react";
import { cn } from "./cn";

/**
 * Kurzer erklärender Text bei Hover UND Tastaturfokus (WCAG 1.4.13):
 * bleibt sichtbar, solange Zeiger/Fokus darauf liegt, Esc schließt.
 * Nur für ergänzende Hinweise – nie für Pflichtinformation (Touch!).
 * Für längere Erklärungen: Popover/Dialog.
 *
 *   <Tooltip text="Interner Zinsfuß über 30 Jahre"><button>IRR</button></Tooltip>
 *
 * seite: oben | unten; ausrichtung: mitte | start | ende; dunkel: true (Standard) | false
 */
export default function Tooltip({ text, children, seite = "oben", ausrichtung = "mitte", dunkel = true, verzoegerung = 250, className }) {
  const id = useId();
  const [offen, setOffen] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!offen) return;
    const esc = (e) => e.key === "Escape" && setOffen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [offen]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const zeigen = (sofort) => {
    clearTimeout(timer.current);
    if (sofort) setOffen(true);
    else timer.current = setTimeout(() => setOffen(true), verzoegerung);
  };
  const verbergen = () => {
    clearTimeout(timer.current);
    setOffen(false);
  };

  const ausloeser = isValidElement(children)
    ? cloneElement(children, { "aria-describedby": cn(children.props["aria-describedby"], offen && id) || undefined })
    : children;

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => zeigen(false)}
      onMouseLeave={verbergen}
      onFocus={() => zeigen(true)}
      onBlur={verbergen}
    >
      {ausloeser}
      {offen && (
        <span
          role="tooltip"
          id={id}
          className={cn(
            "ov-tooltip pointer-events-none absolute z-[80] w-max max-w-[min(18rem,80vw)] rounded-xl px-3 py-2 text-left text-[12.5px] font-medium leading-snug shadow-e3",
            dunkel ? "bg-ink-900 text-white" : "bg-white text-ink-800 ring-1 ring-ink-200",
            seite === "unten" ? "top-full mt-2" : "bottom-full mb-2",
            ausrichtung === "start" ? "left-0" : ausrichtung === "ende" ? "right-0" : "left-1/2 -translate-x-1/2"
          )}
        >
          {text}
        </span>
      )}
    </span>
  );
}
