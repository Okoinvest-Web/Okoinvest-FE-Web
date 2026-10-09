"use client";

// Länderwechsler in der Kopfleiste (Ländermodell): DE · AT · CH.
// Wechselt auf DIESELBE Seite im anderen Land (jede öffentliche Seite hat eine Länderfassung)
// und speichert die Wahl im Cookie „land“ – erst der Klick ist eine aktive Wahl.
// Hervorgehoben ist das Land der Seite (URL); auf der gemeinsamen Seite keins.
// Die Sprache bleibt erhalten (/en/at/x → /en/ch/x, Sprachmodell).

import Link from "next/link";
import { MapPin } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { LAENDER, LAND_CODES, entsprechung } from "@/lib/land";
import useLand from "./useLand";
import { useSprache, useTexte } from "@/components/Sprache/SpracheKontext";

const TEXTE = {
  de: { label: "Land wählen", titel: { DE: "Inhalte für Deutschland", AT: "Inhalte für Österreich", CH: "Inhalte für die Schweiz" } },
  en: { label: "Choose country", titel: { DE: "Content for Germany", AT: "Content for Austria", CH: "Content for Switzerland" } },
};

/**
 * Props:
 *  variante  "hell" (auf Weiß/Sand) | "dunkel" (auf Navy, z. B. Live-Leiste)
 *  kompakt   ohne Symbol
 *  label     Name der Navigation (eindeutig je Seite, z. B. im Menü)
 */
export default function Laenderwahl({ variante = "hell", kompakt = false, label, className }) {
  const { pfad, land, waehlen } = useLand();
  const t = useTexte(TEXTE);
  const sprache = useSprache();
  const dunkel = variante === "dunkel";

  return (
    <nav aria-label={label || t.label} className={cn("flex items-center gap-1.5", className)}>
      {!kompakt && <MapPin aria-hidden="true" className={cn("h-3.5 w-3.5", dunkel ? "text-white/60" : "text-ink-400")} />}
      <ul className={cn("flex items-center rounded-full p-0.5 ring-1 ring-inset", dunkel ? "ring-white/20" : "bg-white ring-ink-200")}>
        {LAND_CODES.map((code) => {
          const info = LAENDER[code];
          const z = entsprechung(pfad, code);
          const aktiv = land === code;
          const titel = t.titel[code];
          return (
            <li key={code}>
              <Link
                href={z.href}
                hrefLang={sprache === "en" ? "en" : info.lang}
                title={titel}
                aria-current={aktiv ? "page" : undefined}
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
