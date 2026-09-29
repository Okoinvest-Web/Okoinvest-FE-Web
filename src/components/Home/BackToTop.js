"use client";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** Nach-oben-Button mit Lesefortschritt als Ring. */
export default function ToTopButton() {
  const [fortschritt, setFortschritt] = useState(0);
  const [sichtbar, setSichtbar] = useState(false);

  useEffect(() => {
    let raf = 0;
    const pruefen = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setFortschritt(max > 0 ? window.scrollY / max : 0);
        setSichtbar(window.scrollY > 600);
      });
    };
    pruefen();
    window.addEventListener("scroll", pruefen, { passive: true });
    return () => {
      window.removeEventListener("scroll", pruefen);
      cancelAnimationFrame(raf);
    };
  }, []);

  const r = 22;
  const umfang = 2 * Math.PI * r;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Nach oben"
      tabIndex={sichtbar ? 0 : -1}
      className={`fixed bottom-6 right-5 z-[9500] flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink-800 shadow-[0_10px_30px_-10px_rgba(3,18,43,0.45)] ring-1 ring-ink-200 transition-all duration-500 hover:-translate-y-0.5 hover:text-ov-700 md:bottom-8 md:right-8 ${
        sichtbar ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <svg aria-hidden="true" viewBox="0 0 48 48" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#669933" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={umfang} strokeDashoffset={umfang * (1 - fortschritt)} />
      </svg>
      <ArrowUp aria-hidden="true" className="h-[18px] w-[18px]" />
    </button>
  );
}
