"use client";

// Kontexthilfe je Portalseite (Querschnitt): „?“-Knopf in der Kopfzeile mit Kurzhilfe zur aktuellen Seite,
// Link zum passenden Handbuch (je Rolle) und zur Übersicht der Tastenkürzel. Inhalte: src/lib/plattform/querschnitt.js.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookOpen, CircleHelp, Keyboard } from "lucide-react";
import { hilfeFuer } from "@/lib/plattform/querschnitt";

export default function KontextHilfe({ rollen = [] }) {
  const pfad = usePathname() || "/portal";
  const [offen, setOffen] = useState(false);
  const ref = useRef(null);
  const h = hilfeFuer(pfad, rollen);

  useEffect(() => setOffen(false), [pfad]);
  useEffect(() => {
    if (!offen) return undefined;
    const klick = (e) => !ref.current?.contains(e.target) && setOffen(false);
    const taste = (e) => e.key === "Escape" && setOffen(false);
    document.addEventListener("mousedown", klick);
    document.addEventListener("keydown", taste);
    return () => {
      document.removeEventListener("mousedown", klick);
      document.removeEventListener("keydown", taste);
    };
  }, [offen]);

  if (!h) return null;
  return (
    <div className="relative hidden min-[420px]:block" ref={ref}>{/* unter 420 px kein Platz in der Kopfzeile – Hilfe dort über Menü/Bottom-Navigation */}
      <button type="button" onClick={() => setOffen((o) => !o)} aria-expanded={offen} aria-controls="kontext-hilfe" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 hover:bg-ink-100" aria-label={`Hilfe zu dieser Seite: ${h.titel}`}>
        <CircleHelp aria-hidden="true" className="h-5 w-5" />
      </button>
      {offen && (
        <div id="kontext-hilfe" role="dialog" aria-label={`Hilfe: ${h.titel}`} className="absolute right-0 top-12 z-40 w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-white p-4 shadow-[0_20px_50px_-20px_rgba(3,18,43,0.45)] ring-1 ring-ink-200">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ov-700">Hilfe zu dieser Seite</p>
          <p className="mt-1 font-display text-[16px] font-bold text-ink-900">{h.titel}</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-600">{h.text}</p>
          <div className="mt-3 flex flex-col gap-1.5">
            {h.handbuch && (
              <Link href={`/portal/hilfe/handbuch/${h.handbuch}`} className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-[13.5px] font-semibold text-ov-700 hover:bg-ov-50">
                <BookOpen aria-hidden="true" className="h-4 w-4" /> Handbuch: {h.handbuchTitel}
              </Link>
            )}
            <Link href="/portal/hilfe" className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-[13.5px] font-semibold text-ink-700 hover:bg-ink-50">
              <Keyboard aria-hidden="true" className="h-4 w-4" /> Hilfe & Tastenkürzel
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
