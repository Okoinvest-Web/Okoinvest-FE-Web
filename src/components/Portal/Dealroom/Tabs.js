// src/components/Portal/Dealroom/Tabs.js – Reiter des Deal-Rooms als Links (?tab=), mobil horizontal scrollbar

import Link from "next/link";
import { cn } from "@/components/ui/cn";

export default function DealTabs({ basis, aktiv, tabs = [] }) {
  return (
    <nav aria-label="Bereiche des Deal-Rooms" className="-mx-4 mb-6 overflow-x-auto px-4 ov-no-scrollbar md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-1.5 rounded-full bg-white p-1.5 ring-1 ring-ink-200/70 md:min-w-0 md:flex-wrap">
        {tabs.map((t) => {
          const an = t.id === aktiv;
          const Icon = t.icon;
          return (
            <li key={t.id}>
              <Link
                href={`${basis}${t.id === "uebersicht" ? "" : `?tab=${t.id}`}`}
                aria-current={an ? "page" : undefined}
                scroll={false}
                className={cn("inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[14px] font-semibold transition-colors", an ? "bg-navy-900 text-white" : "text-ink-700 hover:bg-ink-50")}
              >
                {Icon && <Icon aria-hidden="true" className="h-4 w-4" />}
                {t.label}
                {t.zaehler ? <span className={cn("ov-num rounded-full px-1.5 text-[11.5px] font-bold", an ? "bg-white/20 text-white" : "bg-ov-600 text-white")}>{t.zaehler}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
