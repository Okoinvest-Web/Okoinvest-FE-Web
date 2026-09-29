"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";

/** Merkliste an/aus (Investor) */
export default function MerkenKnopf({ projektId, gemerkt: anfang = false, mitText = false, className }) {
  const router = useRouter();
  const [gemerkt, setGemerkt] = useState(anfang);
  const [laeuft, setLaeuft] = useState(false);

  async function umschalten(e) {
    e.preventDefault();
    e.stopPropagation();
    setLaeuft(true);
    const neu = !gemerkt;
    setGemerkt(neu);
    try {
      await senden(`/api/portal/boerse/${projektId}/merken`, { body: { an: neu } });
      router.refresh();
    } catch {
      setGemerkt(!neu);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <button
      type="button"
      onClick={umschalten}
      disabled={laeuft}
      aria-pressed={gemerkt}
      aria-label={mitText ? undefined : gemerkt ? "Von der Merkliste entfernen" : "Auf die Merkliste"}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors",
        mitText ? "h-10 px-4 text-[14px] ring-1 ring-inset" : "h-10 w-10",
        gemerkt ? "bg-ov-50 text-ov-700 ring-ov-200" : "bg-white text-ink-600 ring-ink-200 hover:text-ov-700",
        !mitText && "ring-1 ring-inset",
        className
      )}
    >
      <Heart aria-hidden="true" className={cn("h-[18px] w-[18px]", gemerkt && "fill-current")} />
      {mitText && (gemerkt ? "Gemerkt" : "Merken")}
    </button>
  );
}
