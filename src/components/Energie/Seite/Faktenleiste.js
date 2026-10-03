// Faktenleiste, die in den Hero ragt – wie auf /energiegemeinschaften/software.
// Mobil: ruhige Liste (Zahl links, Einheit + Erklärung rechts), ab sm 2×2, ab lg vier Spalten.
import { cn } from "@/components/ui/cn";
import Zaehler from "@/components/motion/Zaehler";

/**
 * items: [{ icon, wert, einheit, text, zahl? }] – nur belegte Regeln, Annahmen oder Rechnerwerte
 *        zahl: { wert, nachkomma?, vor?, nach? } – optional: derselbe Wert als Zahl, zählt beim Eintritt
 *        hoch (Zaehler; Server-HTML enthält den Endwert). Jahreszahlen und Paragrafen nicht zählen.
 * titel: Überschrift für Screenreader
 * fussnote: kleine Quellenzeile unter der Karte
 */
export default function Faktenleiste({ items = [], titel, fussnote, id = "fakten-titel" }) {
  const lg4 = items.length >= 4;
  return (
    <section data-abschnitt="fakten" aria-labelledby={id} className="relative z-10 -mt-14 md:-mt-20">
      <h2 id={id} className="sr-only">
        {titel}
      </h2>
      <div className="ov-container">
        <div className="relative rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70 md:rounded-[2rem]">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <dl className={cn("grid px-5 sm:grid-cols-2 sm:px-2 lg:px-0 lg:py-3", lg4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
            {items.map((f, i) => (
              <div
                key={f.einheit + f.text}
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
                  <span className="ov-kpi-l ov-num block w-full whitespace-nowrap text-left text-ink-900 lg:w-auto">
                    {f.zahl ? <Zaehler {...f.zahl} verzoegerung={i * 120} dauer={1200} className="[&>span:last-child]:text-left" /> : f.wert}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        {fussnote && <p className="mt-3 px-2 text-center text-[12px] text-ink-500">{fussnote}</p>}
      </div>
    </section>
  );
}
