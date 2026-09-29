"use client";

/** Kompakte, mitlaufende Ergebniszeile auf dem Handy (über den Eingaben eines Rechners). */
export default function MobilKurz({ werte }) {
  return (
    <div className="sticky top-[76px] z-20 -mx-5 -mt-5 mb-6 border-b border-white/10 bg-navy-950/95 px-5 py-3 text-white backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 lg:hidden">
      <dl className="grid grid-cols-3 gap-2">
        {werte.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="truncate text-[11px] text-white/60">{k}</dt>
            <dd className="truncate font-display text-[16px] font-extrabold leading-tight tracking-tight">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
