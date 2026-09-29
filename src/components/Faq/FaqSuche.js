"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import Faq from "@/components/ui/Faq";
import { cn } from "@/components/ui/cn";

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
 * gruppen: [{ id, titel, items: [{ q, a }] }]
 */
export default function FaqSuche({ gruppen = [] }) {
  const [suche, setSuche] = useState("");
  const [filter, setFilter] = useState("alle");
  const id = useId();

  // Anker (#investoren) als Filter übernehmen
  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (gruppen.some((g) => g.id === h)) setFilter(h);
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
      <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-ink-200/70 sm:p-7">
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

      <div className="mt-10 space-y-12">
        {ergebnis.map((g) => (
          <section key={g.id} id={`gruppe-${g.id}`} aria-labelledby={`${id}-${g.id}`} className="scroll-mt-28">
            <h2 id={`${id}-${g.id}`} className="ov-h3 flex items-baseline gap-3 border-b border-ink-200 pb-4 text-ink-900 md:text-[26px]">
              {g.titel}
              <span className="text-[14px] font-medium text-ink-400">{g.items.length}</span>
            </h2>
            <Faq items={g.items} schema={false} />
          </section>
        ))}
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
