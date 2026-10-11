"use client";

// Live-Countdown bis zu einer Frist (aktualisiert je Minute bzw. je Sekunde in der letzten Stunde).
// Der Server entscheidet über den Fristablauf – der Countdown ist nur Anzeige.

import { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { restzeit } from "@/lib/plattform/dealroom";
import { datumZeit } from "@/lib/plattform/format";

export default function Countdown({ frist, label = "Frist", className, gross = false }) {
  const [jetzt, setJetzt] = useState(null);
  useEffect(() => {
    setJetzt(Date.now());
    const rest = new Date(frist).getTime() - Date.now();
    const t = setInterval(() => setJetzt(Date.now()), rest < 3600e3 ? 1000 : 30000);
    return () => clearInterval(t);
  }, [frist]);
  const ms = new Date(frist).getTime() - (jetzt ?? Date.now());
  const ab = ms <= 0;
  const knapp = !ab && ms < 48 * 3600e3;
  const sek = !ab && ms < 3600e3 ? ` ${Math.floor((ms / 1000) % 60)} Sek.` : "";
  return (
    <div
      className={cn(
        "inline-flex min-w-0 items-center gap-2.5 rounded-2xl px-3.5 py-2 ring-1 ring-inset",
        ab ? "bg-ink-50 text-ink-600 ring-ink-200" : knapp ? "bg-sun-300/25 text-ink-900 ring-sun-400/50" : "bg-ov-50 text-ov-900 ring-ov-200",
        className
      )}
      role="timer"
      aria-live="off"
    >
      <Hourglass aria-hidden="true" className={cn("shrink-0", gross ? "h-5 w-5" : "h-4 w-4")} />
      <span className="min-w-0">
        {/* Ohne opacity-70: die kleine Fristzeile fiel damit unter 4,5:1 Kontrast (axe-portal, WCAG 1.4.3) */}
        <span className="block text-[11.5px] font-semibold uppercase tracking-wider">{label} · {datumZeit(frist)}</span>
        <span className={cn("ov-num block font-display font-extrabold leading-tight", gross ? "text-[22px]" : "text-[16px]")} suppressHydrationWarning>
          {ab ? "Frist abgelaufen" : `noch ${restzeit(frist, jetzt ?? Date.now())}${sek}`}
        </span>
      </span>
    </div>
  );
}
