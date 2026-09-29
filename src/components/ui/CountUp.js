"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Zählt eine Zahl hoch, sobald sie sichtbar wird.
 * Server-HTML enthält bereits den Endwert (SEO, kein Layout-Sprung).
 */
export default function CountUp({ value, decimals = 0, duration = 1600, prefix = "", suffix = "", className }) {
  const ref = useRef(null);
  const ziel = Number(value) || 0;
  const [anzeige, setAnzeige] = useState(ziel);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const schritt = (t) => {
          const p = Math.min((t - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 4);
          setAnzeige(ziel * eased);
          if (p < 1) raf = requestAnimationFrame(schritt);
        };
        setAnzeige(0);
        raf = requestAnimationFrame(schritt);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ziel, duration]);

  return (
    <span ref={ref} className={className ? `ov-num ${className}` : "ov-num"}>
      {prefix}
      {anzeige.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}
