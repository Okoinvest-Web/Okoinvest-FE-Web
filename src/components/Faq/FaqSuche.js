"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import Faq from "@/components/ui/Faq";
import { cn } from "@/components/ui/cn";
import { THEMEN, themaIcon } from "./themen";

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");

/**
 * Zentrale FAQ mit Suchfeld und Gruppenfilter. Das FAQPage-Schema liefert
 * die Seite serverseitig (alle Fragen), hier daher schema={false}.
 * Am Ende jeder Gruppe steht der passende nächste Schritt (Rechner, Check,
 * Registrierung) als normaler Link. Filterwechsel: Liste blendet sanft neu ein.
 * gruppen: [{ id, titel, items: [{ q, a }] }]
 */
export default function FaqSuche({ gruppen = [] }) {
  const [suche, setSuche] = useState("");
  const [filter, setFilter] = useState("alle");
  const id = useId();

  // Anker (#investoren) als Filter übernehmen – beim Laden und bei Klicks auf Themenkacheln
  useEffect(() => {
    const lesen = () => {
      const h = window.location.hash.replace("#", "");
      if (gruppen.some((g) => g.id === h)) setFilter(h);
    };
    lesen();
    window.addEventListener("hashchange", lesen);
    return () => window.removeEventListener("hashchange", lesen);
  }, [gruppen]);

  const begriffe = norm(suche).split(/\s+/).filter(Boolean);
  const ergebnis = useMemo(
    () =>
      gruppen
        .filter((g) => filter === "alle" || g.id === filter)
        .map((g) => ({
          ...g,
          items: g.items.filter((it) => {
            if (!begriffe.length) return true;
            const text = norm(`${it.q} ${typeof it.a === "string" ? it.a : ""}`);
            return begriffe.every((b) => text.includes(b));
          }),
        }))
        .filter((g) => g.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gruppen, filter, suche]
  );
  const anzahl = ergebnis.reduce((s, g) => s + g.items.length, 0);

  const waehlen = (f) => {
    setFilter(f);
    try {
      window.history.replaceState(null, "", f === "alle" ? window.location.pathname : `#${f}`);
    } catch {}
  };

  return (
    <div>
      {/* Sprungziele für Themenkacheln (#investoren …) */}
      {gruppen.map((g) => (
        <span key={g.id} id={g.id} aria-hidden="true" className="block scroll-mt-28" />
      ))}
      <div className="relative rounded-[2rem] bg-white p-5 shadow-e4 ring-1 ring-ink-200/70 sm:p-7">
        <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
        <label htmlFor={`${id}-s`} className="sr-only">
          Fragen durchsuchen
        </label>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
          <input
            id={`${id}-s`}
            type="search"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Suchen, z. B. Pacht oder GAP"
            className="block h-14 w-full rounded-2xl bg-sand-50 pl-12 pr-12 text-[16px] text-ink-900 outline-none ring-1 ring-ink-200 placeholder:text-ink-400 focus-visible:ring-2 focus-visible:ring-ov-500"
          />
          {suche && (
            <button
              type="button"
              onClick={() => setSuche("")}
              aria-label="Suche leeren"
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>

        <fieldset className="mt-5">
          <legend className="sr-only">Nach Thema filtern</legend>
          <div className="flex flex-wrap gap-2">
            {[{ id: "alle", titel: "Alle Themen" }, ...gruppen].map((g) => {
              const an = filter === g.id;
              const n = g.id === "alle" ? gruppen.reduce((s, x) => s + x.items.length, 0) : g.items.length;
              return (
                <label
                  key={g.id}
                  className={cn(
                    "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-[14px] font-medium ring-1 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
                    an ? "bg-navy-950 font-semibold text-white ring-navy-950" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300"
                  )}
                >
                  <input type="radio" name={`${id}-f`} value={g.id} checked={an} onChange={() => waehlen(g.id)} className="sr-only" />
                  {g.titel}
                  <span className={cn("rounded-full px-1.5 text-[11.5px] font-semibold", an ? "bg-white/15 text-white" : "bg-ink-100 text-ink-500")}>{n}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <p className="mt-4 text-[13.5px] text-ink-500" role="status" aria-live="polite">
          {anzahl === 1 ? "1 Frage" : `${anzahl} Fragen`}
          {suche ? ` zu „${suche}"` : ""}
        </p>
      </div>

      <div key={filter} className="ov-tab-panel mt-8 space-y-5 md:mt-10 md:space-y-6">
        {ergebnis.map((g) => {
          const Icon = themaIcon(g.id);
          return (
            <section
              key={g.id}
              id={`gruppe-${g.id}`}
              aria-labelledby={`${id}-${g.id}`}
              className="scroll-mt-28 rounded-[1.75rem] bg-white px-5 pb-2 pt-5 shadow-e1 ring-1 ring-ink-200/70 sm:px-7 sm:pt-7"
            >
              <h2 id={`${id}-${g.id}`} className="flex items-center gap-3 border-b border-ink-100 pb-4 font-display text-[20px] font-bold text-ink-900 md:text-[22px]">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-100">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">{g.titel}</span>
                <span className="ov-num shrink-0 rounded-full bg-ink-50 px-2.5 py-0.5 text-[12.5px] font-semibold text-ink-500 ring-1 ring-ink-200">
                  {g.items.length === 1 ? "1 Frage" : `${g.items.length} Fragen`}
                </span>
              </h2>
              <Faq items={g.items} schema={false} />
              {THEMEN[g.id]?.weiter && <Weiter {...THEMEN[g.id].weiter} />}
            </section>
          );
        })}
        {anzahl === 0 && (
          <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-ink-200/70">
            <p className="font-display text-[20px] font-bold text-ink-900">Keine passende Frage gefunden</p>
            <p className="mt-2 text-[15px] text-ink-600">Versuchen Sie einen anderen Begriff – oder stellen Sie uns Ihre Frage direkt.</p>
            <button
              type="button"
              onClick={() => {
                setSuche("");
                waehlen("alle");
              }}
              className="mt-5 inline-flex h-11 items-center rounded-full px-5 text-[14.5px] font-semibold text-ov-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"
            >
              Filter zurücksetzen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Nächster Schritt passend zur Gruppe – ruhig, ohne Druck */
function Weiter({ text, primaer, sekundaer }) {
  return (
    <div className="-mx-5 -mb-2 mt-2 flex flex-col gap-3 rounded-b-[1.75rem] border-t border-ink-100 bg-sand-50/70 px-5 py-4 sm:-mx-7 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <p className="text-[14px] leading-snug text-ink-600">{text}</p>
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
        <Link
          href={primaer.href}
          className="group inline-flex min-h-11 items-center gap-1.5 rounded-full bg-navy-950 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2"
        >
          {primaer.label}
          <ArrowRight aria-hidden="true" className="ov-pfeil h-4 w-4" />
        </Link>
        {sekundaer && (
          <Link href={sekundaer.href} className="inline-flex min-h-11 items-center rounded text-[14px] font-semibold text-ov-700 hover:text-ov-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
            {sekundaer.label}
          </Link>
        )}
      </div>
    </div>
  );
}
