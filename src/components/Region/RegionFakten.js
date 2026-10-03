// Faktenleiste unter dem Hero des Regionen-Hubs – überlappt den Hero (gleiches Muster wie die Referenzseite).
import { cn } from "@/components/ui/cn";

/** fakten: [{ wert, einheit, text }] */
export default function RegionFakten({ fakten = [], titel = "Die Regionalseiten in Zahlen" }) {
  return (
    <section aria-label={titel} className="relative z-10 -mt-12 md:-mt-16">
      <div className="ov-container">
        <div className="relative rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70 md:rounded-[2rem]">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <dl className="grid px-5 sm:grid-cols-2 sm:px-2 lg:grid-cols-4 lg:px-0 lg:py-3">
            {fakten.map((f, i) => (
              <div
                key={f.text}
                className={cn(
                  "block border-ink-100 py-4 sm:px-5 sm:py-6 lg:px-7 lg:py-5",
                  i > 0 && "border-t",
                  i === 1 && "sm:border-l sm:border-t-0",
                  i === 3 && "sm:border-l",
                  i > 0 && "lg:border-l lg:border-t-0"
                )}
              >
                <dt className="sr-only">{f.text}</dt>
                <dd className="ov-num whitespace-nowrap font-display text-[26px] font-extrabold leading-none tracking-tight text-ink-900 md:text-[30px]">
                  {f.wert}<span className="ml-1.5 text-[14px] font-bold tracking-normal text-ov-700">{f.einheit}</span>
                </dd>
                <dd className="mt-1.5 text-[13px] leading-snug text-ink-500 sm:mt-2">{f.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
