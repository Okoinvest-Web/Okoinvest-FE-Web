// Gemeinsame Helfer der Seite /energiegemeinschaften/software
import { Check } from "lucide-react";
import { cn } from "@/components/ui/cn";

/** Häkchen-Chip als Aufzählungszeichen (BadgeCheck bleibt der Vergleichstabelle vorbehalten) */
export function Haken({ dunkel = false }) {
  return (
    <span aria-hidden="true" className={cn("mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full", dunkel ? "bg-white/10 text-ov-300" : "bg-ov-100 text-ov-700")}>
      <Check className="h-2.5 w-2.5" strokeWidth={3} />
    </span>
  );
}
