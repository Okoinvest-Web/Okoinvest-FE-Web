"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ScrollFortschritt – 3 px Lesefortschritt am oberen Rand (über dem Seitenkopf).
 *
 * Moderne Browser: reines CSS (`animation-timeline: scroll()`), läuft außerhalb des
 * Hauptthreads. Sonst und bei reduzierter Bewegung: rAF-gebündelter Scroll-Listener,
 * der nur `transform: scaleX()` setzt. Dekorativ (aria-hidden) – kein Ersatz für
 * Navigation. Auf Langseiten automatisch aktiv (siehe LayoutWrapper); manuell
 * einbinden nur auf weiteren langen Leseseiten.
 *
 * Wann: Ratgeber-Artikel, Lexikon, Rechtstexte, lange FAQ.
 * Wann NICHT: Landingpages, Rechner, Formulare, Seiten unter ~3 Bildschirmhöhen.
 *
 * @example
 * <ScrollFortschritt />
 */
export default function ScrollFortschritt() {
  const ref = useRef(null);
  const [css, setCss] = useState(false);

  useEffect(() => {
    const unterstuetzt =
      typeof CSS !== "undefined" &&
      CSS.supports?.("animation-timeline: scroll()") &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (unterstuetzt) {
      setCss(true);
      return undefined;
    }
    const el = ref.current;
    let raf = 0;
    const zeichnen = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      el?.style.setProperty("--ov-sf", p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(zeichnen);
    };
    zeichnen();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="ov-scroll-fortschritt" data-css={css ? "" : undefined} />;
}
