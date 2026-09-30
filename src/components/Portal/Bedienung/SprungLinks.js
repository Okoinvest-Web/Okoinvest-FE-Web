"use client";

// Zusätzliche Sprunglinks (WCAG 2.4.1) neben „Zum Inhalt springen“: zur Navigation
// (Desktop: Seitenleiste, mobil: Bottom-Navigation) und direkt zur Suche.

import { paletteOeffnen } from "./speicher";

const klasse = "sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-ink-900 focus:shadow-lg";

function zurNavigation(e) {
  e.preventDefault();
  const desktop = window.matchMedia("(min-width: 1024px)").matches;
  const ziel = document.querySelector(desktop ? "#portal-navigation a[href]" : "#portal-bottomnav a[href]");
  ziel?.focus();
}

export default function SprungLinks() {
  return (
    <>
      <a href="#portal-navigation" onClick={zurNavigation} className={klasse}>Zur Navigation springen</a>
      <a
        href="#suche"
        onClick={(e) => {
          e.preventDefault();
          paletteOeffnen();
        }}
        className={klasse}
      >
        Zur Suche springen
      </a>
    </>
  );
}
