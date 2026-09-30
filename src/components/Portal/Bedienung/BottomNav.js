"use client";

// Mobile Bottom-Navigation: die 4 wichtigsten Ziele je Rolle + Suche (Befehlspalette).
// Nur unter lg sichtbar; Daumen-freundlich (≥ 56 px), mit Safe-Area-Abstand.

import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { bottomNavZiele } from "./befehle";

function aktiv(pfad, href, exakt = false) {
  if (exakt || href === "/portal" || href === "/portal/admin") return pfad === href;
  return pfad === href || pfad.startsWith(href + "/");
}

export default function BottomNav({ rollen, nutzer = null, pfad, ungelesen = 0, onSuche }) {
  const ziele = bottomNavZiele(rollen, nutzer);
  return (
    <nav aria-label="Schnellnavigation" id="portal-bottomnav" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className={cn("mx-auto grid max-w-[560px]", ziele.length === 3 ? "grid-cols-4" : "grid-cols-5")}>
        {ziele.map((z) => {
          const ist = aktiv(pfad, z.href, z.exakt);
          const Icon = z.icon;
          const zaehler = z.id === "nav-nachrichten" && ungelesen > 0 ? ungelesen : 0;
          return (
            <li key={z.id}>
              <Link
                href={z.href}
                aria-current={ist ? "page" : undefined}
                className={cn("relative flex h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-semibold", ist ? "text-ov-700" : "text-ink-500 hover:text-ink-800")}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", ist ? "bg-ov-50" : "")}>
                  <Icon aria-hidden="true" className="h-[20px] w-[20px]" />
                </span>
                <span className="max-w-full truncate px-1">{z.kurz}</span>
                {zaehler > 0 && (
                  <span className="ov-num absolute right-[calc(50%-22px)] top-1.5 min-w-[18px] rounded-full bg-ov-600 px-1 text-center text-[10.5px] font-bold leading-[18px] text-white ring-2 ring-white">
                    {zaehler > 9 ? "9+" : zaehler}
                    <span className="sr-only"> ungelesen</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={onSuche} className="flex h-[60px] w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold text-ink-500 hover:text-ink-800" aria-label="Suche und Befehle öffnen">
            <span className="flex h-7 w-12 items-center justify-center rounded-full">
              <Search aria-hidden="true" className="h-[20px] w-[20px]" />
            </span>
            <span aria-hidden="true">Suche</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
