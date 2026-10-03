"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, UserPlus } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { GRUPPEN, ROLLE_EREIGNIS, ROLLE_SPEICHER } from "./zielgruppen";

/**
 * Weiche im Hero: Wer sind Sie? → passender Nutzen, drei Fakten, zwei Wege + Konto.
 * Echte Tabs (Pfeiltasten, Pos1/Ende, aria-selected), serverseitig mit erster Gruppe gerendert.
 *
 * Bewegung mit Bedeutung: Eine weiße Marke gleitet per transform zur gewählten Gruppe
 * (zeigt, was sich gerade ändert), das Panel blendet über ov-tab-panel ein.
 * Die Wahl wird in sessionStorage gemerkt – der Abschluss der Seite (RollenCtaBand)
 * greift sie auf, statt allen denselben Fläche-Aufruf zu zeigen.
 */
export default function ZielgruppenWahl() {
  const basis = useId();
  const [aktiv, setAktiv] = useState(0);
  const g = GRUPPEN[aktiv];

  function waehle(n) {
    setAktiv(n);
    try {
      sessionStorage.setItem(ROLLE_SPEICHER, GRUPPEN[n].id);
    } catch {}
    window.dispatchEvent(new CustomEvent(ROLLE_EREIGNIS, { detail: GRUPPEN[n].id }));
  }

  function taste(e) {
    const max = GRUPPEN.length - 1;
    const ziel = { ArrowRight: aktiv === max ? 0 : aktiv + 1, ArrowLeft: aktiv === 0 ? max : aktiv - 1, Home: 0, End: max }[e.key];
    if (ziel === undefined) return;
    e.preventDefault();
    waehle(ziel);
    document.getElementById(`${basis}-tab-${ziel}`)?.focus();
  }

  return (
    <div className="ov-glass rounded-[2rem] p-3 shadow-2xl sm:p-4">
      <p className="px-3 pb-3 pt-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-white/60">Wer sind Sie?</p>
      <div role="tablist" aria-label="Zielgruppe wählen" onKeyDown={taste} className="relative grid grid-cols-5 gap-1 rounded-2xl bg-navy-950/60 p-1">
        {/* Gleitende Marke: Breite = eine Spalte, Versatz = Index × (Spalte + gap-1) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-xl bg-white shadow-lg transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ width: "calc((100% - 1.5rem) / 5)", transform: `translate3d(calc(${aktiv} * (100% + 0.25rem)), 0, 0)` }}
        />
        {GRUPPEN.map((x, i) => {
          const an = i === aktiv;
          return (
            <button
              key={x.id}
              id={`${basis}-tab-${i}`}
              role="tab"
              type="button"
              aria-selected={an}
              aria-controls={`${basis}-panel`}
              tabIndex={an ? 0 : -1}
              onClick={() => waehle(i)}
              className={cn(
                "relative flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-0.5 py-2 text-[11px] font-semibold transition-colors duration-300 sm:text-[12.5px]",
                an ? "text-navy-900" : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <x.icon aria-hidden="true" className={cn("h-5 w-5 transition-colors duration-300", an ? "text-ov-600" : "")} />
              <span className="leading-none">{x.label}</span>
            </button>
          );
        })}
      </div>

      <div id={`${basis}-panel`} role="tabpanel" aria-labelledby={`${basis}-tab-${aktiv}`} key={g.id} className="ov-tab-panel mt-3 rounded-3xl bg-white p-6 text-ink-900 sm:p-7">
        <p className="text-[13px] font-semibold text-ov-700">{g.lang}</p>
        <p className="mt-2 font-display text-[clamp(1.3rem,1.1rem+0.6vw,1.6rem)] font-extrabold leading-tight tracking-tight">{g.titel}</p>
        <ul className="mt-5 space-y-2.5">
          {g.punkte.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-[15px] text-ink-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ov-500 text-white">
                <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Link href={g.primaer.href} className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ov-600 px-5 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] transition-colors hover:bg-ov-700 sm:flex-1">
            {g.primaer.label}
            <ArrowRight aria-hidden="true" className="ov-pfeil h-4 w-4" />
          </Link>
          <Link href={g.sekundaer.href} className="inline-flex h-12 items-center justify-center rounded-full px-5 text-[15px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 transition-colors hover:bg-ink-50 sm:flex-1">
            {g.sekundaer.label}
          </Link>
        </div>
        <Link
          href={`/registrieren?rolle=${g.id}`}
          className="group mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-ink-600 transition-colors hover:text-ov-700"
        >
          <UserPlus aria-hidden="true" className="h-4 w-4 text-ov-600" />
          <span>
            Konto anlegen als <span className="text-ink-900 group-hover:text-ov-700">{g.konto}</span>
          </span>
          <ArrowRight aria-hidden="true" className="ov-pfeil h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
