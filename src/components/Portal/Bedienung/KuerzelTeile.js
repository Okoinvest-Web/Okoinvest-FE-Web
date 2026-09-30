"use client";

// Kleine Bausteine rund um Tastenkürzel: Tastenkappen und Schalter „Kürzel an/aus“.

import { useEffect, useState } from "react";
import { cn } from "@/components/ui/cn";
import { EREIGNIS_KUERZEL_EINSTELLUNG, KUERZEL_AUS, speicherLesen, speicherSchreiben } from "./speicher";

export function Tasten({ tasten = [], folge = false }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={tasten.join(folge ? " dann " : " + ")}>
      {tasten.map((t, i) => (
        <span key={`${t}-${i}`} className="inline-flex items-center gap-1" aria-hidden="true">
          {i > 0 && <span className="text-[11px] text-ink-400">{folge ? "dann" : "+"}</span>}
          <kbd className="min-w-[26px] rounded-lg bg-white px-2 py-1 text-center font-sans text-[12px] font-semibold text-ink-700 shadow-[0_1px_0_rgba(3,18,43,0.12)] ring-1 ring-inset ring-ink-200">{t}</kbd>
        </span>
      ))}
    </span>
  );
}

/** Schalter; ohne Props liest/schreibt er die Vorliebe selbst (z. B. auf der Hilfeseite) */
export function KuerzelSchalter({ an: anProp, setAn: setAnProp }) {
  const gesteuert = typeof anProp === "boolean";
  const [anEigen, setAnEigen] = useState(true);
  useEffect(() => {
    if (gesteuert) return undefined;
    const lesen = () => setAnEigen(!speicherLesen(KUERZEL_AUS, false));
    lesen();
    window.addEventListener(EREIGNIS_KUERZEL_EINSTELLUNG, lesen);
    return () => window.removeEventListener(EREIGNIS_KUERZEL_EINSTELLUNG, lesen);
  }, [gesteuert]);
  const an = gesteuert ? anProp : anEigen;
  const setzen = (wert) => {
    if (gesteuert) setAnProp(wert);
    else {
      speicherSchreiben(KUERZEL_AUS, wert ? null : true);
      setAnEigen(wert);
      window.dispatchEvent(new CustomEvent(EREIGNIS_KUERZEL_EINSTELLUNG));
    }
  };
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={an}
        onClick={() => setzen(!an)}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2", an ? "bg-ov-600" : "bg-ink-300")}
      >
        <span aria-hidden="true" className={cn("absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform", an ? "translate-x-6" : "translate-x-1")} />
        <span className="sr-only">Einzeltasten-Kürzel</span>
      </button>
      <span className="text-[14px] text-ink-700">
        <span className="font-semibold text-ink-900">Einzeltasten-Kürzel {an ? "an" : "aus"}</span>
        <span className="block text-[12.5px] text-ink-500">g d, g b, n, ? … – Strg/⌘ + K bleibt immer aktiv.</span>
      </span>
    </label>
  );
}
