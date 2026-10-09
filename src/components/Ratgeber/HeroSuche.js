"use client";

import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useLandHref } from "@/components/Land/Link";

/** Vorschläge unter dem Suchfeld – nur Stichwörter, die in Artikeln (bzw. deren englischen Titeln) vorkommen */
const TEXTE = {
  de: {
    vorschlaege: ["Pacht", "Agri-PV", "Bebauungsplan", "PPA", "Netzanschluss"],
    label: "Ratgeber durchsuchen",
    platzhalter: "Wonach suchen Sie?",
    knopf: "Suchen",
    oft: "Oft gesucht:",
  },
  en: {
    vorschlaege: ["Lease", "Agri-PV", "Development plan", "PPA", "Grid connection"],
    label: "Search the guides",
    platzhalter: "What are you looking for?",
    knopf: "Search",
    oft: "Popular searches:",
  },
};

/**
 * Suchfeld im Ratgeber-Hero. Übergibt den Begriff an die Artikelliste
 * (Ereignis „ratgeber:suche“) und springt dorthin. Ohne JavaScript greift
 * das normale GET-Formular (?q=…#alle-artikel), das die Liste beim Laden liest.
 */
export default function HeroSuche() {
  const [q, setQ] = useState("");
  const t = useTexte(TEXTE);
  const ziel = useLandHref("/ratgeber");

  const suche = (begriff) => {
    const wert = begriff.trim();
    window.dispatchEvent(new CustomEvent("ratgeber:suche", { detail: wert }));
    const ziel = document.getElementById("alle-artikel");
    if (ziel) {
      const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      ziel.scrollIntoView({ behavior: ruhig ? "auto" : "smooth", block: "start" });
    }
  };

  return (
    <div>
      <form
        role="search"
        action={`${ziel}#alle-artikel`}
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          suche(q);
        }}
        className="group relative flex items-center rounded-full bg-white p-1.5 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.65)] ring-1 ring-white/20 transition-shadow focus-within:ring-4 focus-within:ring-ov-300/50"
      >
        <Search aria-hidden="true" className="pointer-events-none absolute left-5 h-5 w-5 text-ink-400" />
        <label htmlFor="ratgeber-hero-suche" className="sr-only">
          {t.label}
        </label>
        <input
          id="ratgeber-hero-suche"
          name="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.platzhalter}
          autoComplete="off"
          className="h-12 min-w-0 flex-1 rounded-full bg-transparent pl-12 pr-3 text-[16px] text-ink-900 outline-none placeholder:text-ink-500 [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="submit"
          className="ov-press inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-ov-600 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300 focus-visible:ring-offset-2 sm:px-6"
        >
          <span className="max-sm:sr-only">{t.knopf}</span>
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </form>
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-[13.5px]">
        <span className="mr-1 text-white/60">{t.oft}</span>
        {t.vorschlaege.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setQ(v);
              suche(v);
            }}
            className="inline-flex min-h-[34px] items-center rounded-full bg-white/[0.06] px-3.5 font-medium text-white/85 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
