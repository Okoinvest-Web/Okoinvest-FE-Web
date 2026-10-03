"use client";

import { useId, useRef, useState } from "react";
import { AlertCircle, Check, Handshake } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { LAENDER } from "./laender";

/** Länder-Tabs mit Details: So funktioniert es, Grenzen, Rolle von ÖkoInvest. */
/** start: zuerst geöffnetes Land ("de" | "at" | "ch") – auf /at/energiegemeinschaften Österreich (Welle 2). */
export default function LaenderTabs({ start = "de" }) {
  const [aktiv, setAktiv] = useState(start);
  const basis = useId();
  const refs = useRef({});
  const land = LAENDER.find((l) => l.id === aktiv);

  const tastatur = (e) => {
    const i = LAENDER.findIndex((l) => l.id === aktiv);
    let n = null;
    if (e.key === "ArrowRight") n = (i + 1) % LAENDER.length;
    if (e.key === "ArrowLeft") n = (i - 1 + LAENDER.length) % LAENDER.length;
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = LAENDER.length - 1;
    if (n != null) {
      e.preventDefault();
      setAktiv(LAENDER[n].id);
      refs.current[LAENDER[n].id]?.focus();
    }
  };

  return (
    <div>
      <div role="tablist" aria-label="Land wählen" onKeyDown={tastatur} className="grid grid-cols-3 gap-1.5 rounded-2xl bg-sand-100 p-1.5 ring-1 ring-inset ring-ink-200/70 sm:inline-grid">
        {LAENDER.map((l) => {
          const an = l.id === aktiv;
          return (
            <button
              key={l.id}
              ref={(el) => (refs.current[l.id] = el)}
              type="button"
              role="tab"
              id={`${basis}-t-${l.id}`}
              aria-selected={an}
              aria-controls={`${basis}-p-${l.id}`}
              aria-label={l.name}
              tabIndex={an ? 0 : -1}
              onClick={() => setAktiv(l.id)}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-[14.5px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 sm:px-6",
                an ? "bg-navy-950 text-white shadow-e2" : "text-ink-600 hover:bg-white hover:text-ink-900"
              )}
            >
              <span className={cn("text-[12px] font-bold", an ? "text-ov-300" : "text-ink-500")}>{l.kurz}</span>
              <span className="hidden sm:inline">{l.name}</span>
            </button>
          );
        })}
      </div>

      <div
        key={land.id}
        id={`${basis}-p-${land.id}`}
        role="tabpanel"
        aria-labelledby={`${basis}-t-${land.id}`}
        tabIndex={0}
        className="ov-tab-panel mt-6 grid gap-5 focus-visible:outline-none lg:grid-cols-[1.15fr_0.85fr]"
      >
        <div className="rounded-[1.75rem] bg-sand-50 p-6 ring-1 ring-ink-200/70 md:p-8">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ov-700">{land.name}</p>
          <h3 className="mt-2 font-display text-[clamp(1.35rem,1.1rem+0.8vw,1.75rem)] font-extrabold leading-tight text-ink-900">{land.titel}</h3>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-600">{land.intro}</p>
          <ul className="mt-6 space-y-3">
            {land.punkte.map((p) => (
              <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-ink-700">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ov-100 text-ov-700">
                  <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-6 flex gap-3 rounded-2xl bg-white p-4 text-[14.5px] leading-relaxed text-ink-600 ring-1 ring-ink-200/60">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sun-500" />
            <span>
              <strong className="text-ink-900">Grenzen: </strong>
              {land.grenzen}
            </span>
          </p>
        </div>
        <div className="ov-verlauf-nacht relative overflow-hidden rounded-[1.75rem] p-6 text-white md:p-8">
          <div aria-hidden="true" className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-ov-500/25 blur-[80px]" />
          <Handshake aria-hidden="true" className="relative h-7 w-7 text-ov-300" />
          <h3 className="relative mt-5 font-display text-[21px] font-extrabold leading-tight">Was ÖkoInvest in {land.name === "Schweiz" ? "der Schweiz" : land.name} beiträgt</h3>
          <p className="relative mt-3 text-[15.5px] leading-relaxed text-white/70">{land.rolle}</p>
          <dl className="relative mt-6 space-y-3 border-t border-white/10 pt-5 text-[14px]">
            <div>
              <dt className="text-white/50">Vorteil beim Netzentgelt</dt>
              <dd className="mt-0.5 font-semibold text-white">{land.werte.vorteil}</dd>
            </div>
            <div>
              <dt className="text-white/50">Möglich seit</dt>
              <dd className="mt-0.5 font-semibold text-white">{land.werte.seit}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
