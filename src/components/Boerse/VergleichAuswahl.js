"use client";

// Auswahl der zu vergleichenden Projekte (2–4 aus der Merkliste), steht in der URL (?ids=…)

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/components/ui/cn";

export default function VergleichAuswahl({ projekte = [], gewaehlt = [], max = 4 }) {
  const router = useRouter();

  function umschalten(id) {
    const an = gewaehlt.includes(id);
    if (!an && gewaehlt.length >= max) return;
    const neu = an ? gewaehlt.filter((x) => x !== id) : [...gewaehlt, id];
    router.replace(`/portal/boerse/vergleich?ids=${neu.join(",")}`, { scroll: false });
  }

  return (
    <fieldset>
      <legend className="mb-2 text-[13px] text-ink-600">
        Wählen Sie 2 bis {max} Projekte aus Ihrer Merkliste ({gewaehlt.length} gewählt).
      </legend>
      <div className="flex flex-wrap gap-2">
        {projekte.map((p) => {
          const an = gewaehlt.includes(p.id);
          const gesperrt = !an && gewaehlt.length >= max;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => umschalten(p.id)}
              aria-pressed={an}
              disabled={gesperrt}
              title={gesperrt ? `Höchstens ${max} Projekte` : undefined}
              className={cn(
                "inline-flex min-h-9 max-w-full items-center gap-2 rounded-full px-3.5 py-1.5 text-left text-[13.5px] font-medium ring-1 ring-inset transition-colors disabled:opacity-40",
                an ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300"
              )}
            >
              <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded ring-1", an ? "bg-white text-ov-700 ring-white" : "ring-ink-300")}>
                {an && <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0 truncate">{p.titel}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
