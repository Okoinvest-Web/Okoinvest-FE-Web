"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import useFreieUnterkante from "@/components/motion/useFreieUnterkante";
import { useSprache } from "@/components/Sprache/SpracheKontext";

/**
 * Nach-oben-Button mit Lesefortschritt als Ring.
 *
 * - erscheint nach 600 px Scrollweg
 * - tritt zurück, solange ein Eingabefeld fokussiert ist, nach dem Scrollen ein
 *   Bedienelement unter ihm läge oder die Seite `data-ov-keine-leiste` trägt
 * - auf Handy/Tablet übernimmt die MobileCta-Leiste den Knopf, solange sie sichtbar
 *   ist (globals.css: body.ov-cta-sichtbar .ov-nach-oben)
 * - Ring per stroke-dashoffset direkt am DOM (kein React-Render pro Scroll-Frame)
 */
export default function ToTopButton() {
  const pfad = usePathname();
  const en = useSprache() === "en";
  const [sichtbar, setSichtbar] = useState(false);
  const ring = useRef(null);
  const { zuruecktreten } = useFreieUnterkante({ pfad, breite: 112 });
  const r = 22;
  const umfang = 2 * Math.PI * r;

  useEffect(() => {
    let raf = 0;
    const pruefen = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      ring.current?.setAttribute("stroke-dashoffset", String(umfang * (1 - p)));
      setSichtbar(window.scrollY > 600);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(pruefen);
    };
    pruefen();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [umfang]);

  const an = sichtbar && !zuruecktreten;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      aria-label={en ? "Back to top" : "Nach oben"}
      tabIndex={an ? 0 : -1}
      aria-hidden={!an || undefined}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      className={`ov-nach-oben group fixed bottom-6 right-5 z-[9500] flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink-800 shadow-[0_10px_30px_-10px_rgba(3,18,43,0.45)] ring-1 ring-ink-200 transition-[transform,opacity,color] duration-500 ease-ov-out hover:text-ov-700 active:scale-95 md:bottom-8 md:right-8 ${
        an ? "translate-y-0 opacity-100 hover:-translate-y-0.5" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <svg aria-hidden="true" viewBox="0 0 48 48" className="absolute inset-0 h-full w-full -rotate-90">
        <circle ref={ring} cx="24" cy="24" r={r} fill="none" stroke="#669933" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={umfang} strokeDashoffset={umfang} />
      </svg>
      <ArrowUp aria-hidden="true" className="h-[18px] w-[18px] transition-transform duration-300 ease-ov-out group-hover:-translate-y-0.5" />
    </button>
  );
}
