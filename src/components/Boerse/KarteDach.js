"use client";

// Kartenansicht der Projektbörse: stilisierte DACH-Karte (Inline-SVG) mit Projekt-Clustern je
// Bundesland bzw. Kanton. Bewusst nur grobe Region – nie die genaue Lage. Klick/Enter auf einen
// Cluster wählt die Region; die Liste darunter zeigt dann nur deren Projekte (Filter synchron,
// Zustand steht in der URL, siehe BoerseListe).

import { useMemo, useState } from "react";
import { MapPin, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { LAENDER } from "@/lib/plattform/konstanten";
import { fmt } from "@/lib/rechner/annahmen";
import { KARTE, LAENDER_PFADE, REGION_MITTE, projiziere, regionPunkt } from "./KarteGeo";

function cluster(projekte) {
  const m = new Map();
  for (const p of projekte) {
    const key = `${p.land}|${p.bundesland || ""}`;
    const c = m.get(key) || { key, land: p.land, bundesland: p.bundesland || LAENDER[p.land] || p.land, anzahl: 0, mwp: 0, typen: new Set() };
    c.anzahl++;
    c.mwp += Number(p.mwp) || 0;
    c.typen.add(p.typ);
    m.set(key, c);
  }
  return [...m.values()]
    .map((c) => ({ ...c, mwp: Math.round(c.mwp * 10) / 10, punkt: regionPunkt(c.land, c.bundesland) }))
    .filter((c) => c.punkt)
    .sort((a, b) => b.anzahl - a.anzahl || b.mwp - a.mwp);
}

export default function KarteDach({ projekte = [], region = "", onRegion, titel = "Projekte nach Region" }) {
  const [hover, setHover] = useState("");
  const liste = useMemo(() => cluster(projekte), [projekte]);
  const max = Math.max(1, ...liste.map((c) => c.anzahl));
  const gewaehlt = liste.find((c) => c.bundesland === region);
  const waehle = (b) => onRegion?.(region === b ? "" : b);
  const punkte = useMemo(() => Object.entries(REGION_MITTE).flatMap(([land, r]) => Object.entries(r).map(([name, p]) => ({ land, name, xy: projiziere(p) }))), []);

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <figure className="relative min-w-0 overflow-hidden rounded-3xl bg-sand-50 ring-1 ring-ink-200/70">
        <svg viewBox={`-10 -10 ${KARTE.breite + 20} ${KARTE.hoehe + 20}`} className="mx-auto block h-auto w-full max-w-[520px]" role="group" aria-label={`${titel}: stilisierte Karte Deutschland, Österreich, Schweiz`}>
          <defs>
            <pattern id="karte-raster" width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.9" className="fill-ink-200" />
            </pattern>
          </defs>
          <rect x="-10" y="-10" width={KARTE.breite + 20} height={KARTE.hoehe + 20} fill="url(#karte-raster)" opacity="0.55" />
          {LAENDER_PFADE.map((l) => {
            const [x, y] = projiziere(l.label);
            return (
              <g key={l.id}>
                <path d={l.pfad} className="fill-white stroke-ink-300" strokeWidth="1.4" strokeLinejoin="round" />
                <text x={x} y={y + (l.id === "DE" ? 0 : 26)} textAnchor="middle" className="fill-ink-300 font-display text-[22px] font-extrabold tracking-[0.2em]" aria-hidden="true">
                  {l.id}
                </text>
              </g>
            );
          })}
          {punkte.map((p) => (
            <circle key={`${p.land}-${p.name}`} cx={p.xy[0]} cy={p.xy[1]} r="2.2" className="fill-ink-300">
              <title>{p.name}</title>
            </circle>
          ))}
          {liste.map((c) => {
            const r = 11 + 9 * Math.sqrt(c.anzahl / max);
            const aktiv = c.bundesland === region;
            const hervor = aktiv || hover === c.key;
            return (
              <g
                key={c.key}
                role="button"
                tabIndex={0}
                aria-pressed={aktiv}
                aria-label={`${c.bundesland}: ${c.anzahl} ${c.anzahl === 1 ? "Projekt" : "Projekte"}, ${fmt(c.mwp, 1)} MWp`}
                onClick={() => waehle(c.bundesland)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    waehle(c.bundesland);
                  }
                }}
                onMouseEnter={() => setHover(c.key)}
                onMouseLeave={() => setHover("")}
                onFocus={() => setHover(c.key)}
                onBlur={() => setHover("")}
                className="cursor-pointer outline-none [&:focus-visible>circle.ring]:stroke-ov-500"
              >
                <circle cx={c.punkt[0]} cy={c.punkt[1]} r={r + 7} className={cn("ring transition-opacity", hervor ? "fill-ov-500/25" : "fill-ov-500/10")} strokeWidth="3" stroke="transparent" />
                <circle cx={c.punkt[0]} cy={c.punkt[1]} r={r} className={cn("transition-colors", aktiv ? "fill-navy-800" : "fill-ov-600")} stroke="white" strokeWidth="2.5" />
                <text x={c.punkt[0]} y={c.punkt[1] + 5} textAnchor="middle" className="pointer-events-none fill-white font-display text-[15px] font-extrabold">
                  {c.anzahl}
                </text>
                {hervor && (
                  <g className="pointer-events-none">
                    <rect x={c.punkt[0] - 78} y={c.punkt[1] - r - 36} width="156" height="26" rx="13" className="fill-navy-950" />
                    <text x={c.punkt[0]} y={c.punkt[1] - r - 18.5} textAnchor="middle" className="fill-white text-[12px] font-semibold">
                      {c.bundesland.length > 18 ? `${c.bundesland.slice(0, 17)}…` : c.bundesland} · {fmt(c.mwp, 1)} MWp
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
        <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-200/70 bg-white/70 px-4 py-2.5 text-[12px] text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-ov-600" /> Projekte je Bundesland / Kanton
          </span>
          <span>Stilisiert – keine genaue Lage</span>
        </figcaption>
      </figure>

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-[17px] font-bold text-ink-900">{titel}</h2>
          {region && (
            <button type="button" onClick={() => onRegion?.("")} className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-600 hover:text-ink-900">
              <X aria-hidden="true" className="h-4 w-4" /> Alle Regionen
            </button>
          )}
        </div>
        {gewaehlt && (
          <p className="mt-2 rounded-2xl bg-navy-50 px-4 py-3 text-[14px] text-navy-900 ring-1 ring-inset ring-navy-100" aria-live="polite">
            <span className="font-semibold">{gewaehlt.bundesland}</span> ({LAENDER[gewaehlt.land]}): {gewaehlt.anzahl} {gewaehlt.anzahl === 1 ? "Projekt" : "Projekte"} mit zusammen {fmt(gewaehlt.mwp, 1)} MWp – Liste unten gefiltert.
          </p>
        )}
        {liste.length ? (
          <ul className="mt-3 divide-y divide-ink-100 overflow-hidden rounded-2xl bg-white ring-1 ring-ink-200/70">
            {liste.map((c) => (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => waehle(c.bundesland)}
                  aria-pressed={c.bundesland === region}
                  onMouseEnter={() => setHover(c.key)}
                  onMouseLeave={() => setHover("")}
                  className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition-colors", c.bundesland === region ? "bg-ov-50" : "hover:bg-sand-50")}
                >
                  <MapPin aria-hidden="true" className={cn("h-4 w-4 shrink-0", c.bundesland === region ? "text-navy-800" : "text-ov-600")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold text-ink-900">{c.bundesland}</span>
                    <span className="block text-[12.5px] text-ink-500">{LAENDER[c.land]}</span>
                  </span>
                  <span className="ov-num shrink-0 text-right text-[13px] text-ink-600">
                    <span className="block font-bold text-ink-900">{c.anzahl} {c.anzahl === 1 ? "Projekt" : "Projekte"}</span>
                    {fmt(c.mwp, 1)} MWp
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-ink-200 px-4 py-6 text-center text-[14px] text-ink-500">Keine Projekte zu den gewählten Filtern.</p>
        )}
      </div>
    </div>
  );
}
