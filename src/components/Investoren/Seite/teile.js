// Gemeinsame Bausteine der Seite /investoren (Server-Komponenten)
import { cn } from "@/components/ui/cn";

/** Sichtbare Kennzeichnung fiktiver Werte in Beispielansichten */
export function BeispielPlakette({ hell = false, className }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full font-semibold uppercase leading-none",
        hell
          ? "bg-white/10 px-1.5 py-[3px] text-[9px] tracking-[0.14em] text-white/80 ring-1 ring-white/15"
          : "bg-sun-50 px-2 py-[3px] text-[9.5px] tracking-[0.12em] text-sun-700 ring-1 ring-sun-200",
        className
      )}
    >
      Beispiel
    </span>
  );
}

/** Fensterrahmen für Plattform-Ansichten (ohne echte Adresse) */
export function Fenster({ titel, className, children }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[16px] bg-white ring-1 ring-ink-900/10",
        "shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_2px_4px_-1px_rgba(3,18,43,0.08),0_18px_40px_-14px_rgba(3,18,43,0.28),0_50px_90px_-30px_rgba(3,18,43,0.5)]",
        className
      )}
    >
      <div className="flex h-9 items-center gap-2 border-b border-ink-200/70 bg-gradient-to-b from-ink-50 to-[#f3f5f8] px-3">
        <span className="flex w-[52px] shrink-0 gap-[6px]">
          <span className="h-[9px] w-[9px] rounded-full bg-[#f2a29b] ring-1 ring-inset ring-black/5" />
          <span className="h-[9px] w-[9px] rounded-full bg-[#f3d08c] ring-1 ring-inset ring-black/5" />
          <span className="h-[9px] w-[9px] rounded-full bg-[#a9d39a] ring-1 ring-inset ring-black/5" />
        </span>
        <span className="mx-auto truncate rounded-md bg-white px-3 py-[3px] text-[10.5px] font-medium text-ink-500 ring-1 ring-ink-200/80">{titel}</span>
        <span className="w-[52px] shrink-0" />
      </div>
      {children}
    </div>
  );
}

/** Risikostufen als Punktreihe (0–5) */
export function RisikoPunkte({ stufe, dunkel = false, klein = false }) {
  return (
    <span className="flex gap-1" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={cn(
            "rounded-full",
            klein ? "h-1.5 w-3" : "h-2 w-4",
            s <= stufe ? (stufe >= 4 ? "bg-sun-500" : "bg-sun-400") : dunkel ? "bg-white/15" : "bg-ink-200"
          )}
        />
      ))}
    </span>
  );
}

export const RISIKO_STUFE = { "sehr hoch": 5, hoch: 4, "mittel–hoch": 3, mittel: 2, gering: 1, "sehr gering": 0 };
