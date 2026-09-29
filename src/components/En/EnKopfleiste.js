"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { SITE } from "@/data/site";
import { SPRACHPAARE } from "./sprachpaare";
import Sprachwahl from "./Sprachwahl";

/**
 * Schmale Leiste über jeder englischen Seite: englische Brotkrumen (samt
 * BreadcrumbList-Schema) und Sprachumschaltung. Ersetzt auf /en/** die
 * deutschen Brotkrumen des PageHero.
 */
export default function EnKopfleiste() {
  const pfad = (usePathname() || "/en").replace(/\/$/, "");
  const aktuell = SPRACHPAARE.find((p) => p.en === pfad);
  const kette = [{ name: "Home", href: "/en" }, ...(aktuell && aktuell.en !== "/en" ? [{ name: aktuell.name, href: aktuell.en }] : [])];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: kette.map((k, i) => ({ "@type": "ListItem", position: i + 1, name: k.name, item: `${SITE.url}${k.href}` })),
  };

  return (
    <div className="border-b border-ink-200/70 bg-sand-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="ov-container flex min-h-12 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2">
        <nav aria-label="Breadcrumb" className="min-w-0 text-[13px]">
          <ol className="flex flex-wrap items-center gap-1.5">
            {kette.map((k, i) => {
              const letzte = i === kette.length - 1;
              return (
                <li key={k.href} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-ink-300" />}
                  {letzte ? (
                    <span aria-current="page" className="font-medium text-ink-800">{k.name}</span>
                  ) : (
                    <Link href={k.href} className="text-ink-500 transition-colors hover:text-ov-600">{k.name}</Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-[12.5px] text-ink-500 sm:inline">English pages for international partners</span>
          <Sprachwahl />
        </div>
      </div>
    </div>
  );
}
