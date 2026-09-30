"use client";

// „?“-Popover an einem Fachbegriff (nicht modal): Klick/Enter öffnet, Esc/Klick daneben schließt,
// Fokus bleibt beim Auslöser. Position fest im Viewport, damit auf 360 px nichts überläuft.

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

const BREITE = 320;

export default function BegriffPopover({ eintrag }) {
  const [offen, setOffen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, breite: BREITE });
  const knopf = useRef(null);
  const panel = useRef(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!offen || !knopf.current) return;
    const r = knopf.current.getBoundingClientRect();
    const breite = Math.min(BREITE, window.innerWidth - 32);
    const left = Math.max(16, Math.min(r.left + r.width / 2 - breite / 2, window.innerWidth - 16 - breite));
    const hoehe = panel.current?.offsetHeight || 160;
    const unten = r.bottom + 8 + hoehe < window.innerHeight;
    setPos({ top: unten ? r.bottom + 8 : Math.max(8, r.top - 8 - hoehe), left, breite });
  }, [offen]);

  useEffect(() => {
    if (!offen) return undefined;
    const klick = (e) => !panel.current?.contains(e.target) && !knopf.current?.contains(e.target) && setOffen(false);
    const taste = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOffen(false);
        knopf.current?.focus();
      }
    };
    const weg = () => setOffen(false);
    document.addEventListener("mousedown", klick);
    document.addEventListener("keydown", taste, true);
    window.addEventListener("scroll", weg, true);
    window.addEventListener("resize", weg);
    return () => {
      document.removeEventListener("mousedown", klick);
      document.removeEventListener("keydown", taste, true);
      window.removeEventListener("scroll", weg, true);
      window.removeEventListener("resize", weg);
    };
  }, [offen]);

  return (
    <>
      <button
        ref={knopf}
        type="button"
        onClick={() => setOffen((o) => !o)}
        aria-expanded={offen}
        aria-controls={offen ? id : undefined}
        aria-label={`Was bedeutet „${eintrag.begriff}“?`}
        className="relative top-[-1px] inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center self-center rounded-full bg-ink-100 text-[11px] font-bold leading-none text-ink-600 ring-1 ring-inset ring-ink-200 transition-colors hover:bg-ov-50 hover:text-ov-700 hover:ring-ov-200 aria-expanded:bg-ov-600 aria-expanded:text-white aria-expanded:ring-ov-600 before:absolute before:-inset-2.5 before:content-['']"
      >
        ?
      </button>
      {offen && (
        <div
          ref={panel}
          id={id}
          role="dialog"
          aria-label={eintrag.begriff}
          style={{ top: pos.top, left: pos.left, width: pos.breite }}
          className="fixed z-[90] rounded-2xl bg-white p-4 text-left shadow-[0_20px_50px_-20px_rgba(3,18,43,0.45)] ring-1 ring-ink-200"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-display text-[15px] font-bold leading-snug text-ink-900">{eintrag.begriff}</p>
            <button type="button" onClick={() => { setOffen(false); knopf.current?.focus(); }} className="-mr-1.5 -mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100" aria-label="Erklärung schließen">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-[13.5px] font-normal normal-case leading-relaxed tracking-normal text-ink-600">{eintrag.kurz}</p>
          <Link href={eintrag.href} className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-semibold normal-case tracking-normal text-ov-700 hover:text-ov-800">
            Im Lexikon lesen <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </>
  );
}
