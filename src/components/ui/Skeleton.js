import { cn } from "./cn";

/**
 * Platzhalter beim Laden – exakt in der Größe des späteren Inhalts, damit
 * nichts springt (CLS 0). Der Lichtstreifen läuft per transform und
 * steht bei reduzierter Bewegung still.
 *
 * Für Screenreader: den umgebenden Bereich mit aria-busy="true" markieren;
 * Skeletons selbst sind aria-hidden.
 */
export default function Skeleton({ className, dunkel = false, rund = false, style }) {
  return (
    <span
      aria-hidden="true"
      className={cn("ov-skeleton block", dunkel && "ov-skeleton-dunkel", rund && "rounded-full", className)}
      style={style}
    />
  );
}

/** Mehrere Textzeilen, letzte kürzer. */
export function SkeletonText({ zeilen = 3, className, dunkel = false }) {
  return (
    <span aria-hidden="true" className={cn("block space-y-2.5", className)}>
      {Array.from({ length: zeilen }, (_, i) => (
        <Skeleton key={i} dunkel={dunkel} className="h-3.5" style={{ width: i === zeilen - 1 && zeilen > 1 ? "62%" : "100%" }} />
      ))}
    </span>
  );
}

/** Karte mit Kopf, Kennzahl und Text – Standard-Ladezustand für Kacheln. */
export function SkeletonKarte({ className, dunkel = false, zeilen = 2 }) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-3xl p-5 md:p-6", dunkel ? "bg-navy-950 ring-1 ring-white/10" : "bg-white ring-1 ring-ink-200/70", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <Skeleton dunkel={dunkel} className="h-3.5 w-28" />
        <Skeleton dunkel={dunkel} className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton dunkel={dunkel} className="mt-4 h-8 w-24" />
      <SkeletonText dunkel={dunkel} zeilen={zeilen} className="mt-4" />
    </div>
  );
}

/** Tabellenzeilen als Platzhalter. */
export function SkeletonTabelle({ zeilen = 5, spalten = 4, className }) {
  return (
    <div aria-hidden="true" className={cn("divide-y divide-ink-100", className)}>
      {Array.from({ length: zeilen }, (_, z) => (
        <div key={z} className="grid gap-4 py-3.5" style={{ gridTemplateColumns: `2fr repeat(${spalten - 1}, 1fr)` }}>
          {Array.from({ length: spalten }, (_, s) => (
            <Skeleton key={s} className="h-3.5" style={{ width: s === 0 ? "80%" : "60%" }} />
          ))}
        </div>
      ))}
    </div>
  );
}
