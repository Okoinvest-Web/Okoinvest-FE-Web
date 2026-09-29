"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, List } from "lucide-react";

/**
 * Inhaltsverzeichnis mit Scrollspy.
 *
 * Desktop: klebt in der rechten Spalte mit, zeigt Lesefortschritt je Abschnitt.
 * Mobil:   klebende, aufklappbare Leiste unter der Navigation, die den
 *          aktuellen Abschnitt anzeigt.
 *
 * Die Seite bindet die Komponente zweimal ein - einmal `variant="mobile"` im
 * Lesefluss, einmal `variant="desktop"` in der Sidebar. Jede Instanz rendert
 * nur ihre eigene Variante.
 *
 * @param {{items: {id: string, label: string}[], variant?: "mobile"|"desktop"}} props
 */
export default function TableOfContents({ items, variant = "desktop" }) {
  const [aktiv, setAktiv] = useState(items[0]?.id ?? "");
  const details = useRef(null);

  useEffect(() => {
    const ueberschriften = items.map((i) => document.getElementById(i.id)).filter(Boolean);
    if (ueberschriften.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const sichtbar = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (sichtbar[0]) setAktiv(sichtbar[0].target.id);
      },
      { rootMargin: "-100px 0px -65% 0px", threshold: 0 }
    );

    ueberschriften.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  const aktivIndex = Math.max(items.findIndex((i) => i.id === aktiv), 0);

  const liste = (
    <ol className="relative space-y-0.5">
      {items.map((item, i) => {
        const ist = aktiv === item.id;
        const gelesen = i < aktivIndex;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={() => details.current && (details.current.open = false)}
              aria-current={ist ? "location" : undefined}
              className={`group flex items-start gap-3 rounded-lg py-2 pl-3 pr-2 text-[14px] leading-snug transition-colors ${
                ist ? "bg-ov-50 font-semibold text-ov-800" : gelesen ? "text-ink-500 hover:text-ink-900" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              }`}
            >
              <span
                className={`ov-num mt-px w-5 shrink-0 text-[12px] font-semibold ${ist ? "text-ov-700" : gelesen ? "text-ov-700" : "text-ink-600"}`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {item.label}
            </a>
          </li>
        );
      })}
    </ol>
  );

  if (variant === "mobile") {
    return (
      <details ref={details} className="group sticky top-[68px] z-30 -mx-5 mb-10 border-y border-ink-200 bg-white/95 backdrop-blur-xl md:-mx-8 lg:hidden">
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-3 px-5 md:px-8 [&::-webkit-details-marker]:hidden">
          <List aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600" />
          <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-ink-500">Inhalt</span>
          <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold text-ink-900">{items[aktivIndex]?.label}</span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-500 transition-transform group-open:rotate-180" />
        </summary>
        <div className="max-h-[60vh] overflow-y-auto px-3 pb-4 md:px-6">{liste}</div>
        <div aria-hidden="true" className="h-0.5 bg-ink-100">
          <div className="h-full bg-ov-500 transition-[width] duration-300" style={{ width: `${((aktivIndex + 1) / items.length) * 100}%` }} />
        </div>
      </details>
    );
  }

  return (
    <nav aria-label="Inhaltsverzeichnis">
      <p className="mb-3 flex items-center justify-between gap-2 px-3 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
        <span className="flex items-center gap-2">
          <List aria-hidden="true" className="h-4 w-4 text-ov-600" />
          Inhalt
        </span>
        <span className="ov-num text-ink-500">
          {aktivIndex + 1}/{items.length}
        </span>
      </p>
      <div aria-hidden="true" className="mx-3 mb-3 h-1 overflow-hidden rounded-full bg-ink-100">
        <div className="h-full rounded-full bg-ov-500 transition-[width] duration-500" style={{ width: `${((aktivIndex + 1) / items.length) * 100}%` }} />
      </div>
      {liste}
    </nav>
  );
}
