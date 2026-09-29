"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Kleinschreibung, Umlaute/ß vereinheitlicht, Sonderzeichen entfernt – für tolerante Suche. */
const norm = (s) =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9% ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Photovoltaik-Lexikon mit Live-Suche, Themenfilter und klebender A–Z-Leiste.
 * Alle Begriffe werden serverseitig vollständig gerendert (SEO, Anker-IDs);
 * Filter blenden nur aus.
 *
 * props:
 *  gruppen    [[buchstabe, [begriff, ...]], ...]
 *  kategorien [{ id, label }]
 *  namen      { id: begriff } – für Beschriftung verwandter Begriffe
 */
export default function LexikonExplorer({ gruppen, kategorien, namen }) {
  const [suche, setSuche] = useState("");
  const [kategorie, setKategorie] = useState("alle");
  const q = useDeferredValue(suche);

  const index = useMemo(
    () =>
      new Map(
        gruppen.flatMap(([, liste]) =>
          liste.map((b) => [
            b.id,
            { titel: norm(`${b.begriff} ${(b.synonyme || []).join(" ")}`), voll: norm(`${b.kurz} ${b.text}`) },
          ])
        )
      ),
    [gruppen]
  );

  const gefiltert = useMemo(() => {
    const nq = norm(q);
    const woerter = nq ? nq.split(" ") : [];
    return gruppen
      .map(([l, liste]) => {
        const treffer = liste
          .filter((b) => kategorie === "alle" || b.kategorie === kategorie)
          .map((b) => {
            if (!woerter.length) return { b, score: 0 };
            const i = index.get(b.id);
            let score = 0;
            for (const w of woerter) {
              if (i.titel.startsWith(w)) score += 5;
              else if (i.titel.includes(w)) score += 3;
              else if (i.voll.includes(w)) score += 1;
              else return null;
            }
            return { b, score };
          })
          .filter(Boolean)
          .sort((x, y) => y.score - x.score)
          .map((x) => x.b);
        return [l, treffer];
      })
      .filter(([, t]) => t.length > 0);
  }, [gruppen, index, q, kategorie]);

  const anzahl = gefiltert.reduce((a, [, t]) => a + t.length, 0);
  const vorhanden = new Set(gefiltert.map(([l]) => l));
  const aktivFilter = q.trim() !== "" || kategorie !== "alle";

  const springe = (l) => {
    const el = document.getElementById(`buchstabe-${l}`);
    if (!el) return;
    el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  return (
    <div>
      {/* ---------- Themen ---------- */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Nach Thema filtern">
        {[{ id: "alle", label: "Alle Themen" }, ...kategorien].map((k) => {
          const aktiv = kategorie === k.id;
          return (
            <button
              key={k.id}
              type="button"
              aria-pressed={aktiv}
              onClick={() => setKategorie(k.id)}
              className={`h-11 rounded-full px-4 text-[14px] font-semibold transition-all ${
                aktiv ? "bg-ink-900 text-white shadow-md" : "bg-white text-ink-600 ring-1 ring-ink-200 hover:text-ink-900 hover:ring-ink-300"
              }`}
            >
              {k.label}
            </button>
          );
        })}
      </div>

      {/* ---------- Klebende Leiste: Suche + A–Z ---------- */}
      <div className="sticky top-[68px] z-30 -mx-5 mt-6 border-y border-ink-200/80 bg-sand-50/90 px-5 py-3 backdrop-blur-xl md:-mx-8 md:px-8 lg:mx-0 lg:rounded-2xl lg:border lg:bg-white/90 lg:px-3 lg:py-3 lg:shadow-[0_10px_30px_-18px_rgba(21,26,36,0.25)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          <div className="relative lg:w-[300px] lg:shrink-0">
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-400" />
            <label htmlFor="lexikon-suche" className="sr-only">
              Begriff suchen
            </label>
            <input
              id="lexikon-suche"
              type="search"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder="Begriff suchen, z. B. Autarkie"
              autoComplete="off"
              className="h-12 w-full rounded-full bg-white pl-11 pr-11 text-[15px] text-ink-900 ring-1 ring-ink-200 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-ov-500 lg:bg-ink-50 [&::-webkit-search-cancel-button]:hidden"
            />
            {suche && (
              <button
                type="button"
                onClick={() => setSuche("")}
                aria-label="Suche leeren"
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 hover:text-ink-900"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </div>

          <nav aria-label="Alphabetische Sprungleiste" className="ov-no-scrollbar -mx-5 overflow-x-auto px-5 md:-mx-8 md:px-8 lg:mx-0 lg:flex-1 lg:px-0">
            <ul className="flex min-w-max gap-0.5 lg:min-w-0 lg:justify-between">
              {ALPHABET.map((l) => {
                const ok = vorhanden.has(l);
                return (
                  <li key={l}>
                    <button
                      type="button"
                      disabled={!ok}
                      onClick={() => springe(l)}
                      aria-label={ok ? `Zu Buchstabe ${l}` : `Buchstabe ${l} – keine Begriffe`}
                      className="flex h-10 w-9 items-center justify-center rounded-lg font-display text-[14.5px] font-bold text-ink-800 transition-colors hover:bg-ov-500 hover:text-white disabled:cursor-default disabled:text-ink-300 disabled:hover:bg-transparent lg:h-9 lg:w-8"
                    >
                      {l}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      <p className="mt-6 text-[14px] text-ink-500" aria-live="polite">
        {aktivFilter ? (
          <>
            <span className="ov-num font-semibold text-ink-900">{anzahl}</span> {anzahl === 1 ? "Begriff" : "Begriffe"} gefunden
            <button
              type="button"
              onClick={() => {
                setSuche("");
                setKategorie("alle");
              }}
              className="ml-3 font-semibold text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current"
            >
              Filter zurücksetzen
            </button>
          </>
        ) : (
          <>
            <span className="ov-num font-semibold text-ink-900">{anzahl}</span> Fachbegriffe von A bis Z
          </>
        )}
      </p>

      {/* ---------- Begriffe ---------- */}
      {gefiltert.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-white p-10 text-center ring-1 ring-ink-200/70">
          <p className="font-display text-[20px] font-extrabold text-ink-900">Kein Begriff gefunden</p>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-ink-600">
            Versuchen Sie ein anderes Stichwort – oder fragen Sie uns direkt. Wir ergänzen das Lexikon laufend.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/faqs" className="inline-flex h-11 items-center rounded-full bg-ink-900 px-5 text-[14px] font-semibold text-white hover:bg-ink-800">
              Häufige Fragen
            </Link>
            <a href="tel:+498245967880" className="inline-flex h-11 items-center rounded-full px-5 text-[14px] font-semibold text-ink-800 ring-1 ring-ink-200 hover:bg-ink-50">
              08245 96 788 0
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          {gefiltert.map(([l, liste]) => (
            <section key={l} id={`buchstabe-${l}`} aria-labelledby={`buchstabe-${l}-titel`} className="scroll-mt-[220px] border-t border-ink-200 pt-8 first:border-t-0 lg:scroll-mt-[160px]">
              <div className="grid gap-6 pb-10 lg:grid-cols-[88px_minmax(0,1fr)] lg:gap-10">
                <h2 id={`buchstabe-${l}-titel`} className="font-display text-[44px] font-extrabold leading-none tracking-tight text-ov-500 lg:sticky lg:top-[160px] lg:self-start lg:text-[64px]">
                  {l}
                </h2>
                <dl className="grid gap-4 md:grid-cols-2">
                  {liste.map((b) => (
                    <Eintrag key={b.id} b={b} namen={namen} kategorien={kategorien} />
                  ))}
                </dl>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Eintrag({ b, namen, kategorien }) {
  const kat = kategorien.find((k) => k.id === b.kategorie)?.label;
  return (
    <div
      id={b.id}
      className="group relative flex scroll-mt-[220px] flex-col rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 transition-shadow duration-300 target:ring-2 target:ring-ov-500 target:shadow-[0_0_0_6px_rgba(102,153,51,0.15)] hover:ring-ov-200 lg:scroll-mt-[170px] md:p-7"
    >
      {/* dl-Gruppe enthält nur dt/dd – Themen-Chip steckt mit im dt */}
      <dt className="flex flex-col-reverse items-start gap-2 sm:flex-row sm:justify-between sm:gap-3">
        <a href={`#${b.id}`} className="font-display text-[19px] font-extrabold leading-snug tracking-tight text-ink-900 hover:text-ov-700">
          {b.begriff}
        </a>
        {kat && (
          <span className="mt-0.5 shrink-0 rounded-full bg-sand-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-600">
            <span className="sr-only">Thema: </span>
            {kat}
          </span>
        )}
      </dt>
      <dd className="mt-3 flex flex-1 flex-col">
        <p className="text-[15.5px] font-medium leading-relaxed text-ink-800">{b.kurz}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{b.text}</p>
        {b.synonyme?.length > 0 && (
          <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
            <span className="font-semibold text-ink-600">Auch:</span> {b.synonyme.join(", ")}
          </p>
        )}
        {(b.verwandt?.length > 0 || b.link) && (
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
            {b.verwandt?.map((v) => (
              <a key={v} href={`#${v}`} className="inline-flex min-h-[32px] items-center rounded-full bg-ink-50 px-3 text-[12.5px] font-medium text-ink-600 ring-1 ring-ink-100 transition-colors hover:bg-ov-50 hover:text-ov-800 hover:ring-ov-200">
                {namen[v] || v}
              </a>
            ))}
            {b.link && (
              <Link href={b.link.href} className="ml-auto inline-flex min-h-[32px] items-center gap-1 text-[13.5px] font-semibold text-ov-700 hover:text-ov-800">
                {b.link.label}
                <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        )}
      </dd>
    </div>
  );
}
