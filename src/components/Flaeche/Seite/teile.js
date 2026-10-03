// Gemeinsame Bausteine der Flächen-Seiten (/flaeche-verpachten, /freiflaeche, /flaechencheck, /angebot)
// Markensprache wie /energiegemeinschaften/software: Nachtbühne mit Raster und Lichtschein, überlappende Faktenleiste,
// Häkchen-Chips. Alles Server-Komponenten, Grafiken als Inline-SVG.
import { Check } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { cn } from "@/components/ui/cn";

/** Häkchen-Chip als Aufzählungszeichen */
export function Haken({ dunkel = false, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
        dunkel ? "bg-ov-400/15 text-ov-300 ring-1 ring-inset ring-ov-300/40" : "bg-ov-100 text-ov-700",
        className
      )}
    >
      <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
    </span>
  );
}

/**
 * Dunkle Hero-Bühne (Raster, Lichtkante, grüner Lichtschein, weicher Übergang nach unten).
 * Unten bleibt Luft für eine überlappende <Faktenleiste/>; `unten` als String setzt eigene Abstandsklassen.
 */
export function HeroBuehne({ breadcrumbs, label = "hero-titel", unten = true, className, containerClassName, children }) {
  return (
    <section aria-labelledby={label} className={cn("ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white", className)}>
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-navy-950/50" />
      <div className={cn("ov-container pt-6 sm:pt-8 md:pt-10", typeof unten === "string" ? unten : unten ? "pb-24 md:pb-32" : "pb-16 md:pb-24", containerClassName)}>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} dark className="ov-hero-in mb-8 md:mb-12" />}
        {children}
      </div>
    </section>
  );
}

/** Kleine Hinweis-Pille über der Headline (z. B. Zielgruppe oder Länder) */
export function HeroPille({ marke, children, href }) {
  const Tag = href ? "a" : "p";
  return (
    <Tag
      {...(href ? { href } : {})}
      className={cn(
        "ov-hero-in inline-flex max-w-full items-center gap-2.5 rounded-full bg-white/[0.06] py-1 pl-1 pr-3.5 text-[13px] text-white/85 ring-1 ring-inset ring-white/15",
        href && "transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-300"
      )}
      style={{ "--ov-delay": "40ms" }}
    >
      <span className="shrink-0 rounded-full bg-ov-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-navy-950">{marke}</span>
      <span className="min-w-0 truncate">{children}</span>
    </Tag>
  );
}

/**
 * Faktenleiste, die in den Hero hineinragt.
 * fakten: [{ icon, wert, einheit, text }] – nur belegte Marktwerte/Regeln, keine Unternehmenskennzahlen.
 */
export function Faktenleiste({ titel, fakten }) {
  return (
    <section aria-labelledby="fakten-titel" className="relative z-10 -mt-12 md:-mt-16">
      <h2 id="fakten-titel" className="sr-only">{titel}</h2>
      <div className="ov-container">
        <div className="relative rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70 md:rounded-[2rem]">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <dl className="grid px-5 sm:grid-cols-2 sm:px-2 lg:grid-cols-4 lg:px-0 lg:py-3">
            {fakten.map((f, i) => (
              <div
                key={f.einheit}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 border-ink-100 py-5 sm:px-5 sm:py-6 lg:grid-cols-1 lg:gap-x-0 lg:px-7 lg:py-5 xl:px-8",
                  i > 0 && "border-t",
                  i === 1 && "sm:border-l sm:border-t-0",
                  i === 3 && "sm:border-l",
                  i > 0 && "lg:border-l lg:border-t-0"
                )}
              >
                <dt className="col-start-1 row-start-1 lg:row-start-2">
                  <span className="block font-display text-[16px] font-bold leading-tight tracking-[-0.01em] text-ov-700 lg:mt-2.5 lg:text-[17px]">{f.einheit}</span>
                  <span className="mt-1 block text-pretty text-[14px] leading-snug text-ink-600">{f.text}</span>
                </dt>
                <dd className="col-start-2 row-start-1 flex items-center gap-3 lg:col-start-1">
                  {f.icon && (
                    <span aria-hidden="true" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200 lg:order-last lg:ml-auto lg:flex">
                      <f.icon className="h-4 w-4" />
                    </span>
                  )}
                  <span className="ov-num block whitespace-nowrap text-right font-display text-[26px] font-extrabold leading-none tracking-[-0.03em] text-ink-900 lg:text-left xl:text-[30px]">{f.wert}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/**
 * Flurkarte als Dekor: Feldstücke aus der Vogelperspektive, ein Flurstück mit Modulreihen,
 * Kabeltrasse zum Netzverknüpfungspunkt. Rein dekorativ (aria-hidden).
 */
const FELDER = [
  "M0 40 L150 0 L190 150 L20 200 Z",
  "M150 0 L330 0 L345 120 L190 150 Z",
  "M330 0 L520 0 L540 90 L345 120 Z",
  "M20 200 L190 150 L215 300 L40 360 Z",
  "M345 120 L540 90 L560 260 L370 290 Z",
  "M40 360 L215 300 L235 470 L60 520 Z",
  "M215 300 L370 290 L390 450 L235 470 Z",
  "M370 290 L560 260 L580 430 L390 450 Z",
  "M60 520 L235 470 L250 600 L70 600 Z",
  "M235 470 L390 450 L400 600 L250 600 Z",
];
export function Flurkarte({ className }) {
  // Hervorgehobenes Flurstück: Viereck 190/150 – 345/120 – 370/290 – 215/300
  const reihen = Array.from({ length: 11 }, (_, i) => i);
  return (
    <svg aria-hidden="true" viewBox="0 0 600 600" fill="none" className={className}>
      <defs>
        <clipPath id="flur-clip">
          <path d="M196 156 L342 128 L364 284 L220 294 Z" />
        </clipPath>
        <linearGradient id="flur-trasse" x1="0" x2="1">
          <stop offset="0" stopColor="#f5a70f" stopOpacity="0.9" />
          <stop offset="1" stopColor="#f5a70f" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {FELDER.map((d) => (
        <path key={d} d={d} stroke="currentColor" strokeOpacity="0.16" strokeWidth="1" />
      ))}
      {/* Feldweg */}
      <path d="M0 260 C120 240 180 330 300 320 S520 300 600 360" stroke="currentColor" strokeOpacity="0.22" strokeWidth="5" strokeLinecap="round" />
      {/* Flurstück mit Modulreihen */}
      <path d="M190 150 L345 120 L370 290 L215 300 Z" fill="#8cba58" fillOpacity="0.12" stroke="#aed083" strokeOpacity="0.85" strokeWidth="1.5" />
      <g clipPath="url(#flur-clip)">
        {reihen.map((i) => (
          <rect key={i} x="180" y={140 + i * 15} width="200" height="7" rx="1.5" fill="#aed083" fillOpacity="0.55" transform={`rotate(-7 280 ${140 + i * 15})`} />
        ))}
      </g>
      {/* Kabeltrasse zum Netzverknüpfungspunkt */}
      <path d="M368 250 C430 250 450 200 505 190" stroke="url(#flur-trasse)" strokeWidth="2" strokeDasharray="5 6" />
      <circle cx="510" cy="188" r="9" fill="#f5a70f" fillOpacity="0.9" />
      <circle cx="510" cy="188" r="18" stroke="#f5a70f" strokeOpacity="0.35" />
    </svg>
  );
}
