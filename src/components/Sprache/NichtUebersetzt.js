"use client";

// Hinweis auf englischen Seiten, die noch nicht übersetzt sind (Entscheidung 3 des Inhabers):
// Die Seite zeigt den deutschen Text; oben steht dezent „not yet available in English“.
// Die Seite trägt bis zur Freigabe noindex (src/lib/sprache/seiten.js, UEBERSETZT).
// Erscheint nur auf /en/… und nur für Seiten aus dem Register, die nicht in UEBERSETZT stehen.

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import { landAusPfad, sprachEntsprechung } from "@/lib/land";
import { hatSprachfassung, uebersetzt } from "@/lib/sprache/seiten";

/** Ist die aktuelle englische Seite noch nicht übersetzt? */
export function nichtUebersetzt(pathname) {
  const { sprache, schluessel } = landAusPfad(pathname || "/");
  return sprache === "en" && hatSprachfassung(schluessel) && !uebersetzt(schluessel, "en");
}

export default function NichtUebersetzt() {
  const pathname = usePathname() || "/";
  if (!nichtUebersetzt(pathname)) return null;
  return (
    <div lang="en" data-nicht-uebersetzt="" className="ov-container">
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-sand-50 px-4 py-2.5 text-[13.5px] leading-snug text-ink-600 ring-1 ring-inset ring-ink-200/70">
        <Languages aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600" />
        <span>This page is not yet available in English – the content below is shown in German.</span>
        <NextLink href={sprachEntsprechung(pathname, "de").href} hrefLang="de" lang="de" className="font-semibold text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-ov-700">
          Deutsche Fassung
        </NextLink>
      </p>
    </div>
  );
}
