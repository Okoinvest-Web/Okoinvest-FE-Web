"use client";

import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useLandHref } from "@/components/Land/Link";

const TEXTE = {
  de: { label: "Begriff im Lexikon suchen", platzhalter: "Begriff suchen, z. B. Dienstbarkeit", knopf: "Nachschlagen" },
  en: { label: "Search the glossary", platzhalter: "Search for a term, e.g. easement", knopf: "Look up" },
};

/**
 * Suchfeld im Lexikon-Hero. Übergibt den Begriff an den LexikonExplorer
 * (Ereignis „lexikon:suche“) und springt zur Liste. Ohne JavaScript:
 * GET-Formular (?q=…#lexikon), das der Explorer beim Laden liest.
 */
export default function HeroSuche() {
  const [q, setQ] = useState("");
  const t = useTexte(TEXTE);
  const ziel = useLandHref("/wissen/lexikon");

  return (
    <form
      role="search"
      action={`${ziel}#lexikon`}
      method="get"
      onSubmit={(e) => {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("lexikon:suche", { detail: q.trim() }));
        const ziel = document.getElementById("lexikon");
        if (ziel) {
          const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          ziel.scrollIntoView({ behavior: ruhig ? "auto" : "smooth", block: "start" });
        }
      }}
      className="relative flex items-center rounded-full bg-white p-1.5 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.65)] ring-1 ring-white/20 transition-shadow focus-within:ring-4 focus-within:ring-ov-300/50"
    >
      <Search aria-hidden="true" className="pointer-events-none absolute left-5 h-5 w-5 text-ink-400" />
      <label htmlFor="lexikon-hero-suche" className="sr-only">
        {t.label}
      </label>
      <input
        id="lexikon-hero-suche"
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
  );
}
