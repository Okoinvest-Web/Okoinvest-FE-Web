"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { SITE } from "@/data/site";
import { SPRACHPAARE } from "./sprachpaare";
import Sprachwahl from "./Sprachwahl";
import JsonLd from "@/components/JsonLd";

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
    <div className="relative border-b border-white/10 bg-navy-950 text-white">
      <JsonLd daten={jsonLd} />
      <div className="ov-container flex min-h-12 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2">
        <nav aria-label="Breadcrumb" className="min-w-0 text-[13px]">
          <ol className="flex flex-wrap items-center gap-1.5">
            {kette.map((k, i) => {
              const letzte = i === kette.length - 1;
              return (
                <li key={k.href} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-white/35" />}
                  {letzte ? (
                    <span aria-current="page" className="font-medium text-white">{k.name}</span>
                  ) : (
                    <Link href={k.href} className="rounded text-white/65 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300">{k.name}</Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-[12.5px] text-white/60 sm:inline">English pages for international partners</span>
          <Sprachwahl variante="dunkel" />
        </div>
      </div>
    </div>
  );
}
