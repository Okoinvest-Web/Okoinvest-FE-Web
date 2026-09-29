"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Search, X } from "lucide-react";

/**
 * Filterbare Artikelliste der Ratgeber-Übersicht.
 * Bekommt nur schlanke Metadaten (keine Artikelinhalte), damit das
 * Client-Bundle klein bleibt. Alle Karten stehen im Server-HTML – Filter und
 * Suche blenden nur aus, Links bleiben für Suchmaschinen auffindbar.
 */
export default function RatgeberListe({ artikel, kategorien }) {
  const [kategorie, setKategorie] = useState("Alle");
  const [suche, setSuche] = useState("");

  const zaehler = useMemo(() => {
    const z = { Alle: artikel.length };
    for (const a of artikel) z[a.kategorie] = (z[a.kategorie] || 0) + 1;
    return z;
  }, [artikel]);

  const sichtbar = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return new Set(
      artikel
        .filter((a) => kategorie === "Alle" || a.kategorie === kategorie)
        .filter((a) => !q || `${a.title} ${a.excerpt} ${a.keywords.join(" ")}`.toLowerCase().includes(q))
        .map((a) => a.slug)
    );
  }, [artikel, kategorie, suche]);

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Nach Thema filtern" className="ov-no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
          {["Alle", ...kategorien].map((k) => {
            const aktiv = kategorie === k;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={aktiv}
                onClick={() => setKategorie(k)}
                className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[14px] font-semibold transition-all ${
                  aktiv ? "bg-ink-900 text-white shadow-md" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:ring-ink-300"
                }`}
              >
                {k}
                <span className={`ov-num rounded-full px-1.5 text-[12px] ${aktiv ? "bg-white/15 text-white" : "bg-ink-100 text-ink-600"}`}>{zaehler[k] || 0}</span>
              </button>
            );
          })}
        </div>
        <label className="relative block w-full lg:max-w-xs">
          <span className="sr-only">Ratgeber durchsuchen</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Thema suchen, z. B. Speicher"
            className="h-11 w-full rounded-full border-2 border-ink-200 bg-white pl-11 pr-10 text-[15px] text-ink-900 outline-none placeholder:text-ink-500 focus:border-ov-500"
          />
          {suche && (
            <button type="button" onClick={() => setSuche("")} aria-label="Suche leeren" className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </label>
      </div>

      <p aria-live="polite" className="mt-5 text-[14px] text-ink-500">
        {sichtbar.size === artikel.length ? `${artikel.length} Artikel` : `${sichtbar.size} von ${artikel.length} Artikeln`}
      </p>

      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {artikel.map((a) => (
          <li key={a.slug} hidden={!sichtbar.has(a.slug)} className="flex">
            <Karte a={a} />
          </li>
        ))}
      </ul>

      {sichtbar.size === 0 && (
        <div className="mt-6 rounded-3xl bg-white p-8 text-center ring-1 ring-ink-200/70">
          <p className="font-display text-[18px] font-bold text-ink-900">Kein Artikel gefunden.</p>
          <p className="mt-2 text-[15px] text-ink-600">
            Versuchen Sie einen anderen Begriff – oder schauen Sie ins <Link href="/wissen/lexikon" className="font-semibold text-ov-700 underline">Photovoltaik-Lexikon</Link>.
          </p>
        </div>
      )}
    </div>
  );
}

function Karte({ a }) {
  return (
    <article className="group ov-card-hover relative flex w-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-ink-200/70 focus-within:ring-2 focus-within:ring-ov-500 hover:ring-ov-200">
      <div className="relative aspect-[16/9] overflow-hidden bg-ink-100">
        <Image src={a.bild} alt={a.bildAlt} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-ink-800 shadow-sm backdrop-blur">{a.kategorie}</span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-[18.5px] font-extrabold leading-snug tracking-tight text-ink-900 transition-colors group-hover:text-ov-700">
          <Link href={`/ratgeber/${a.slug}`} className="outline-none after:absolute after:inset-0 after:content-['']">
            {a.title}
          </Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-ink-600">{a.excerpt}</p>
        <div className="mt-auto flex items-center justify-between gap-4 pt-6 text-[13px] text-ink-500">
          <span className="flex items-center gap-1.5">
            <Clock aria-hidden="true" className="h-3.5 w-3.5" />
            {a.lesezeit} Min. Lesezeit
          </span>
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-ink-600 transition-all group-hover:bg-ov-500 group-hover:text-white">
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
