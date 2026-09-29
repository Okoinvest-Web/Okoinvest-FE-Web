"use client";

import { cn } from "@/components/ui/cn";

/* ------------------------------------------------------------------
   Ergänzende Bausteine für die Investoren-, Carport- und Kommunal-
   Rechner (Solarpark, Projektbewertung, Solarcarport, Kommune).
   Die Grundbausteine stehen in ./bausteine.js.
   ------------------------------------------------------------------ */

/**
 * Äußerer Rahmen: Eingaben links (Sand), Ergebnis rechts. Bei `mitlaufend`
 * bleibt das Ergebnis am Desktop sichtbar, während links gescrollt wird.
 * `unten`: volle Breite unter beiden Spalten (Matrix, Tabellen).
 */
export function RechnerRahmen({ eingaben, ergebnis, unten, breiteLinks = 410, mitlaufend = false }) {
  return (
    <div className="overflow-clip rounded-[2rem] bg-white shadow-[0_40px_80px_-40px_rgba(3,18,43,0.45)] ring-1 ring-ink-200/70">
      <div className="grid lg:grid-cols-[minmax(0,var(--links))_minmax(0,1fr)]" style={{ "--links": `${breiteLinks}px` }}>
        <div className="relative border-b border-ink-100 bg-sand-50 p-5 sm:p-6 md:p-8 lg:border-b-0 lg:border-r">{eingaben}</div>
        <div className="min-w-0 p-5 sm:p-6 md:p-8">
          <div className={mitlaufend ? "lg:sticky lg:top-24" : undefined}>{ergebnis}</div>
        </div>
      </div>
      {unten && <div className="border-t border-ink-100 p-5 sm:p-6 md:p-8">{unten}</div>}
    </div>
  );
}

/** Kompakte, mitlaufende Ergebniszeile auf dem Handy (über den Eingaben) */
export function MobilKurz({ werte }) {
  return (
    <div className="sticky top-[76px] z-20 -mx-5 -mt-5 mb-6 border-b border-white/10 bg-navy-950/95 px-5 py-3 text-white backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 lg:hidden">
      <dl className={cn("grid gap-2", werte.length === 4 ? "grid-cols-4" : "grid-cols-3")}>
        {werte.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="truncate text-[11px] text-white/60">{k}</dt>
            <dd className="truncate font-display text-[16px] font-extrabold leading-tight tracking-tight min-[400px]:text-[17px]">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Überschrift des Ergebnisbereichs mit Status-Plakette */
export function ErgebnisKopf({ titel = "Ihr Ergebnis", plakette }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-[22px] font-extrabold tracking-tight text-ink-900 md:text-[26px]">{titel}</h2>
      {plakette && (
        <span className="inline-flex items-center gap-2 rounded-full bg-ov-50 px-3 py-1 text-[12.5px] font-semibold text-ov-700 ring-1 ring-ov-200">
          <span className="h-1.5 w-1.5 rounded-full bg-ov-500" aria-hidden="true" />
          {plakette}
        </span>
      )}
    </div>
  );
}

/** Hinweiszeile im Ergebnis (neutral | warnung | gut) */
export function Hinweis({ ton = "neutral", icon: Icon, children, className }) {
  const toene = {
    neutral: "bg-ink-50 text-ink-700 ring-ink-200/70",
    warnung: "bg-sun-300/20 text-ink-800 ring-sun-400/50",
    gut: "bg-ov-50 text-ink-800 ring-ov-200",
  };
  return (
    <p className={cn("flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ring-1", toene[ton], className)}>
      {Icon && <Icon aria-hidden="true" className={cn("mt-0.5 h-4 w-4 shrink-0", ton === "warnung" ? "text-sun-500" : ton === "gut" ? "text-ov-600" : "text-ink-500")} />}
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Umschalter für Diagramm-Ansichten (echte Radio-Buttons) */
export function Ansicht({ name, optionen, wert, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-ink-100 p-1">
      {optionen.map((o) => (
        <label
          key={o.id}
          className={cn(
            "cursor-pointer rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
            wert === o.id ? "bg-white text-ink-900 shadow-sm" : "text-ink-600 hover:text-ink-900"
          )}
        >
          <input type="radio" name={name} value={o.id} checked={wert === o.id} onChange={() => onChange(o.id)} className="sr-only" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

/** Legendenpunkt */
export function Legende({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-ink-600">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          {i.linie ? (
            <span className="h-[3px] w-5 rounded-full" style={{ background: i.farbe }} aria-hidden="true" />
          ) : (
            <span className="h-3 w-3 rounded-[3px]" style={{ background: i.farbe }} aria-hidden="true" />
          )}
          {i.label}
        </li>
      ))}
    </ul>
  );
}
