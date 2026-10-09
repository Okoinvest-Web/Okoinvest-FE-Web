"use client";

// Sprachwahl in der Kopfleiste (Sprachmodell): DE · EN.
// Wechselt auf DIESELBE Seite im selben Land in der anderen Sprache (/at/freiflaeche ↔
// /en/at/freiflaeche) und speichert die Wahl im Cookie „sprache“ – erst der Klick ist eine aktive
// Wahl. Seiten ohne Sprachfassung (Login, Portal …) führen auf die Startseite der Sprache.
// Gleiches Aussehen wie der Länderwechsler daneben (Laenderwahl).

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { sprachEntsprechung } from "@/lib/land";
import { SPRACHEN, SPRACH_INFO } from "@/lib/sprache/sprachen";
import { spracheWaehlen, useSprache } from "./SpracheKontext";

/**
 * Props:
 *  variante  "hell" (auf Weiß/Sand) | "dunkel" (auf Navy, z. B. Live-Leiste)
 *  kompakt   ohne Globus-Symbol
 *  label     Name der Navigation (eindeutig je Seite, z. B. im Menü)
 */
export default function Sprachwahl({ variante = "hell", kompakt = false, label, className }) {
  const pfad = usePathname() || "/";
  const sprache = useSprache();
  const dunkel = variante === "dunkel";
  const name = label || (sprache === "en" ? "Language" : "Sprache");

  return (
    <nav aria-label={name} className={cn("flex items-center gap-1.5", className)}>
      {!kompakt && <Globe aria-hidden="true" className={cn("h-3.5 w-3.5", dunkel ? "text-white/60" : "text-ink-400")} />}
      <ul className={cn("flex items-center rounded-full p-0.5 ring-1 ring-inset", dunkel ? "ring-white/20" : "ring-ink-200 bg-white")}>
        {SPRACHEN.map((code) => {
          const info = SPRACH_INFO[code];
          const aktiv = sprache === code;
          return (
            <li key={code}>
              <NextLink
                href={sprachEntsprechung(pfad, code).href}
                hrefLang={info.lang}
                lang={info.lang}
                title={info.name}
                aria-label={info.name}
                aria-current={aktiv ? "true" : undefined}
                onClick={() => spracheWaehlen(code)}
                className={cn(
                  "flex h-7 min-w-[34px] items-center justify-center rounded-full px-2 text-[12px] font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500",
                  aktiv ? (dunkel ? "bg-white text-navy-950" : "bg-ov-600 text-white") : dunkel ? "text-white/70 hover:text-white" : "text-ink-600 hover:text-ink-900",
                )}
              >
                {info.kurz}
              </NextLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
