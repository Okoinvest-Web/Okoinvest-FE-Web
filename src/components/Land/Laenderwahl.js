"use client";

// Länderwechsler (Welle 2, Masterplan Abschnitt 4): DE · AT · CH.
// Springt auf die Entsprechung der aktuellen Seite im anderen Land; gibt es sie dort nicht,
// auf dessen Einstiegsseite (sichtbar im Titel und für Screenreader angesagt).
// Ein Klick ist eine aktive Wahl: erst dann wird das Cookie „land“ gesetzt.

import Link from "next/link";
import { MapPin } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { LAENDER, LAND_CODES, entsprechung } from "@/lib/land";
import useLand from "./useLand";

/**
 * Props:
 *  variante  "hell" (auf Weiß/Sand) | "dunkel" (auf Navy, z. B. Live-Leiste)
 *  kompakt   ohne Symbol
 *  label     Name der Navigation (eindeutig je Seite, z. B. im Fußbereich)
 */
export default function Laenderwahl({ variante = "hell", kompakt = false, label = "Land wählen", className }) {
  const { pfad, routenLand, gewaehlt, waehlen } = useLand();
  const aktuell = routenLand || gewaehlt;
  const dunkel = variante === "dunkel";

  return (
    <nav aria-label={label} className={cn("flex items-center gap-1.5", className)}>
      {!kompakt && <MapPin aria-hidden="true" className={cn("h-3.5 w-3.5", dunkel ? "text-white/60" : "text-ink-400")} />}
      <ul className={cn("flex items-center rounded-full p-0.5 ring-1 ring-inset", dunkel ? "ring-white/20" : "bg-white ring-ink-200")}>
        {LAND_CODES.map((code) => {
          const info = LAENDER[code];
          const z = entsprechung(pfad, code);
          const aktiv = aktuell === code;
          const titel = z.art === "entsprechung" ? `Seiten ${info.fuerLand}` : `Seiten ${info.fuerLand} – Übersicht (diese Seite gibt es dort noch nicht)`;
          return (
            <li key={code}>
              <Link
                href={z.href}
                hrefLang={info.lang}
                title={titel}
                aria-current={routenLand === code ? "page" : aktiv ? "true" : undefined}
                onClick={() => waehlen(code)}
                className={cn(
                  "flex h-7 min-w-[34px] items-center justify-center rounded-full px-2 text-[12px] font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500",
                  aktiv ? (dunkel ? "bg-white text-navy-950" : "bg-ov-600 text-white") : dunkel ? "text-white/70 hover:text-white" : "text-ink-600 hover:text-ink-900",
                )}
              >
                <span aria-hidden="true">{code}</span>
                <span className="sr-only">{titel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
