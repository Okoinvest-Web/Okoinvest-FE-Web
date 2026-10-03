// Faktenleiste unter dem Hero – überlappt den Hero, vier Regeln/Richtwerte
// Mobil: Liste (Zahl links), ab sm 2×2, ab lg vier Spalten. Nur Regeln und Richtwerte, keine Unternehmenskennzahlen.
import { cn } from "@/components/ui/cn";

/** fakten: [{ icon, wert, einheit, text }] */
export default function Faktenleiste({ titel, fakten, quelle }) {
  return (
    <section data-abschnitt="fakten" aria-labelledby="fakten-titel" className="relative z-10 -mt-12 md:-mt-16">
      <h2 id="fakten-titel" className="sr-only">{titel}</h2>
      <div className="ov-container">
        <div className="relative rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70 md:rounded-[2rem]">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <dl className="grid px-5 sm:grid-cols-2 sm:px-2 lg:grid-cols-4 lg:px-0 lg:py-3">
            {fakten.map((f, i) => (
              <div
                key={f.einheit}
                className={cn(
                  "grid grid-cols-[minmax(4.5rem,auto)_minmax(0,1fr)] content-start items-start gap-x-4 border-ink-100 py-5 sm:px-5 sm:py-6 lg:grid-cols-1 lg:gap-x-0 lg:px-7 lg:py-5 xl:px-8",
                  i > 0 && "border-t",
                  i === 1 && "sm:border-l sm:border-t-0",
                  i === 3 && "sm:border-l",
                  i > 0 && "lg:border-l lg:border-t-0"
                )}
              >
                <dt className="col-start-2 row-start-1 lg:col-start-1 lg:row-start-2">
                  <span className="block font-display text-[16px] font-bold leading-tight tracking-[-0.01em] text-ov-700 lg:mt-2.5 lg:text-[17px]">{f.einheit}</span>
                  <span className="mt-1 block text-pretty text-[14px] leading-snug text-ink-600">{f.text}</span>
                </dt>
                <dd className="col-start-1 row-start-1 flex items-center gap-3">
                  {f.icon && (
                    <span aria-hidden="true" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200 lg:order-last lg:ml-auto lg:flex">
                      <f.icon className="h-4 w-4" />
                    </span>
                  )}
                  <span className="ov-kpi-l block whitespace-nowrap text-ink-900">
                    {f.wert}
                    {f.suffix && <span className="ov-einheit">{f.suffix}</span>}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        {quelle && <p className="mt-3 px-2 text-[12.5px] text-ink-500">{quelle}</p>}
      </div>
    </section>
  );
}
