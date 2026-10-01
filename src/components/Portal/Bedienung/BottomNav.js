"use client";

// Mobile Bottom-Navigation: die 4 wichtigsten Ziele je Rolle + Suche (Befehlspalette).
// Nur unter lg sichtbar; Daumen-freundlich (≥ 56 px), mit Safe-Area-Abstand.
// Aktiver Eintrag: Indikator (Pille + Kante oben) gleitet per transform zwischen den Spalten.

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
  const spalten = ziele.length + 1; // + Suche
  const aktivIdx = ziele.findIndex((z) => aktiv(pfad, z.href, z.exakt));
  return (
    <nav aria-label="Schnellnavigation" id="portal-bottomnav" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_rgba(3,18,43,0.18)] backdrop-blur-xl backdrop-saturate-150 lg:hidden">
      <div className="relative mx-auto max-w-[560px]">
        <span
          aria-hidden="true"
          className="pr-bn-indikator"
          style={{ width: `${100 / spalten}%`, transform: `translate3d(${Math.max(0, aktivIdx) * 100}%, 0, 0)`, opacity: aktivIdx < 0 ? 0 : 1 }}
        >
          <span className="absolute left-1/2 top-0 h-[3px] w-7 -translate-x-1/2 rounded-b-full bg-ov-600" />
          <span className="absolute left-1/2 top-[9px] h-7 w-12 -translate-x-1/2 rounded-full bg-ov-50" />
        </span>
        <ul className="relative grid" style={{ gridTemplateColumns: `repeat(${spalten}, minmax(0, 1fr))` }}>
          {ziele.map((z) => {
            const ist = aktiv(pfad, z.href, z.exakt);
            const Icon = z.icon;
            const zaehler = z.id === "nav-nachrichten" && ungelesen > 0 ? ungelesen : 0;
            return (
              <li key={z.id}>
                <Link
                  href={z.href}
                  aria-current={ist ? "page" : undefined}
                  className={cn("ov-press relative flex h-[60px] flex-col items-center justify-center gap-1 text-[11.5px] font-semibold transition-colors duration-150", ist ? "text-ov-700" : "text-ink-500 hover:text-ink-800")}
                >
                  <span className="flex h-7 w-12 items-center justify-center rounded-full">
                    <Icon aria-hidden="true" className="h-[20px] w-[20px]" strokeWidth={ist ? 2.2 : 2} />
                  </span>
                  <span className="max-w-full truncate px-1">{z.kurz}</span>
                  {zaehler > 0 && (
                    <span className="ov-num absolute right-[calc(50%-22px)] top-1.5 min-w-[18px] rounded-full bg-ov-600 px-1 text-center text-[11px] font-bold leading-[18px] text-white ring-2 ring-white">
                      {zaehler > 9 ? "9+" : zaehler}
                      <span className="sr-only"> ungelesen</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={onSuche} className="ov-press flex h-[60px] w-full flex-col items-center justify-center gap-1 text-[11.5px] font-semibold text-ink-500 transition-colors duration-150 hover:text-ink-800" aria-label="Suche und Befehle öffnen">
              <span className="flex h-7 w-12 items-center justify-center rounded-full">
                <Search aria-hidden="true" className="h-[20px] w-[20px]" />
              </span>
              <span aria-hidden="true">Suche</span>
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
