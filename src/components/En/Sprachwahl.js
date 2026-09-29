"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { deZu, enZu, istEnglisch } from "./sprachpaare";

/**
 * Kleine Sprachumschaltung DE/EN.
 *
 * Springt auf das inhaltliche Gegenstück der aktuellen Seite (siehe
 * SPRACHPAARE); gibt es keins, auf die Startseite der anderen Sprache.
 * Funktioniert auf deutschen und englischen Seiten gleichermaßen und kann
 * daher auch in die Navbar eingebaut werden.
 *
 * Props:
 *  variante  "hell" (auf Weiß/Sand) | "dunkel" (auf Navy, z. B. Live-Leiste)
 *  kompakt   ohne Globus-Symbol
 */
export default function Sprachwahl({ variante = "hell", kompakt = false, className }) {
  const pfad = usePathname() || "/";
  const en = istEnglisch(pfad);
  const ziele = [
    { code: "de", label: "DE", titel: "Deutsch", href: en ? deZu(pfad) : pfad, aktiv: !en },
    { code: "en", label: "EN", titel: "English", href: en ? pfad : enZu(pfad), aktiv: en },
  ];
  const dunkel = variante === "dunkel";

  return (
    <nav aria-label={en ? "Language" : "Sprache"} className={cn("flex items-center gap-1.5", className)}>
      {!kompakt && <Globe aria-hidden="true" className={cn("h-3.5 w-3.5", dunkel ? "text-white/60" : "text-ink-400")} />}
      <ul className={cn("flex items-center rounded-full p-0.5 ring-1 ring-inset", dunkel ? "ring-white/20" : "ring-ink-200 bg-white")}>
        {ziele.map((z) => (
          <li key={z.code}>
            <Link
              href={z.href}
              hrefLang={z.code}
              lang={z.code}
              title={z.titel}
              aria-label={z.titel}
              aria-current={z.aktiv ? "true" : undefined}
              className={cn(
                "flex h-7 min-w-[34px] items-center justify-center rounded-full px-2 text-[12px] font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500",
                z.aktiv
                  ? dunkel
                    ? "bg-white text-navy-950"
                    : "bg-ov-600 text-white"
                  : dunkel
                    ? "text-white/70 hover:text-white"
                    : "text-ink-600 hover:text-ink-900"
              )}
            >
              {z.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
