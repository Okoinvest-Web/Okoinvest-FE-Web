"use client";

// Grobe DACH-Karte der Anlagen (Inline-SVG, Geometrie aus Boerse/KarteGeo): je Bundesland/Kanton ein Punkt,
// Farbe = schlechteste Ampel der Anlagen dort, Größe nach Leistung. Keine genaue Lage.
// Klick/Enter wählt die Region (Filter der Liste), Tooltip mit Anlagen der Region.

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { KARTE, LAENDER_PFADE, projiziere, regionPunkt } from "@/components/Boerse/KarteGeo";
import { kw, kwpText } from "@/lib/plattform/anlagen";
import { AMPEL_KLASSE, AmpelBadge } from "./teile";

const RANG = { stoerung: 3, offline: 2, warnung: 1, laeuft: 0 };

export default function AnlagenKarte({ anlagen = [], region = "", onRegion }) {
  const [hover, setHover] = useState("");
  const gruppen = useMemo(() => {
    const m = new Map();
    for (const a of anlagen) {
      const key = `${a.land}|${a.bundesland}`;
      const g = m.get(key) || { key, land: a.land, bundesland: a.bundesland, anlagen: [], kwp: 0, ampel: "laeuft" };
      g.anlagen.push(a);
      g.kwp += Number(a.kwp) || Number(a.speicherKwh) / 2 || 0;
      if (RANG[a.ampel?.id] > RANG[g.ampel]) g.ampel = a.ampel.id;
      m.set(key, g);
    }
    return [...m.values()].map((g) => ({ ...g, punkt: regionPunkt(g.land, g.bundesland) })).filter((g) => g.punkt);
  }, [anlagen]);
  const max = Math.max(1, ...gruppen.map((g) => g.kwp));
  const aktiv = gruppen.find((g) => g.key === (hover || region)) || null;

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <figure className="relative min-w-0 overflow-hidden rounded-3xl bg-sand-50 ring-1 ring-ink-200/70">
        <svg viewBox={`-10 -10 ${KARTE.breite + 20} ${KARTE.hoehe + 20}`} className="mx-auto block h-auto w-full max-w-[460px]" role="group" aria-label="Anlagen nach Region: stilisierte Karte Deutschland, Österreich, Schweiz">
          {LAENDER_PFADE.map((l) => {
            const [x, y] = projiziere(l.label);
            return (
              <g key={l.id}>
                <path d={l.pfad} className="fill-white stroke-ink-300" strokeWidth="1.4" strokeLinejoin="round" />
                <text x={x} y={y + (l.id === "DE" ? 0 : 26)} textAnchor="middle" className="fill-ink-200 font-display text-[22px] font-extrabold tracking-[0.2em]" aria-hidden="true">
                  {l.id}
                </text>
              </g>
            );
          })}
          {gruppen.map((g) => {
            const r = 9 + 11 * Math.sqrt(g.kwp / max);
            const an = g.key === region || g.key === hover;
            return (
              <g
                key={g.key}
                role="button"
                tabIndex={0}
                aria-pressed={g.key === region}
                aria-label={`${g.bundesland}: ${g.anlagen.length} ${g.anlagen.length === 1 ? "Anlage" : "Anlagen"}, Zustand ${g.ampel}`}
                onClick={() => onRegion?.(region === g.key ? "" : g.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onRegion?.(region === g.key ? "" : g.key);
                  }
                }}
                onMouseEnter={() => setHover(g.key)}
                onMouseLeave={() => setHover("")}
                onFocus={() => setHover(g.key)}
                onBlur={() => setHover("")}
                className="cursor-pointer outline-none"
              >
                <circle cx={g.punkt[0]} cy={g.punkt[1]} r={r + 7} className={cn(AMPEL_KLASSE[g.ampel].fill, an ? "opacity-30" : "opacity-15")} />
                <circle cx={g.punkt[0]} cy={g.punkt[1]} r={r} className={cn(AMPEL_KLASSE[g.ampel].fill)} stroke={an ? "#03122b" : "white"} strokeWidth="2.5" />
                <text x={g.punkt[0]} y={g.punkt[1] + 5} textAnchor="middle" className="pointer-events-none fill-white font-display text-[14px] font-extrabold">
                  {g.anlagen.length}
                </text>
              </g>
            );
          })}
        </svg>
        <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-200/70 bg-white/70 px-4 py-2.5 text-[12px] text-ink-500">
          {["laeuft", "warnung", "stoerung", "offline"].map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", AMPEL_KLASSE[id].punkt)} />
              {{ laeuft: "Läuft", warnung: "Warnung", stoerung: "Störung", offline: "Offline" }[id]}
            </span>
          ))}
          <span className="ml-auto">Grob je Bundesland/Kanton</span>
        </figcaption>
      </figure>
      <div className="min-w-0">
        {aktiv ? (
          <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70" aria-live="polite">
            <p className="font-display text-[17px] font-bold text-ink-900">{aktiv.bundesland}</p>
            <ul className="mt-3 divide-y divide-ink-100">
              {aktiv.anlagen.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <Link href={`/portal/anlagen/${a.id}`} className="block truncate text-[14.5px] font-semibold text-ink-900 hover:text-ov-700">{a.name}</Link>
                    <span className="text-[12.5px] text-ink-500">{a.typLabel} · {a.kwp ? kwpText(a.kwp) : `${a.speicherKwh} kWh`} · jetzt {kw(a.live?.pvKw)}</span>
                  </span>
                  <AmpelBadge id={a.ampel?.id} grund={a.ampel?.grund} klein />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-3xl border border-dashed border-ink-200 bg-white/60 p-5 text-[14px] leading-relaxed text-ink-600">
            Wählen Sie eine Region auf der Karte, um die Anlagen dort zu sehen und die Liste zu filtern. Die Farbe zeigt den schlechtesten Zustand in der Region.
          </p>
        )}
      </div>
    </div>
  );
}
