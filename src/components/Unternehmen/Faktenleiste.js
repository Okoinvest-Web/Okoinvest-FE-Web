// Weiße Faktenleiste, die den Nachtkopf unten überlappt (wie auf der Referenzseite).
// Mobil: ruhige Liste (Zahl rechts), ab sm 2×2, ab lg n Spalten.
// Nur belegte Angaben übergeben – keine erfundenen Kennzahlen.
import { cn } from "@/components/ui/cn";
import Zaehler from "@/components/motion/Zaehler";

/** Kleine Mengen („3“, „~50“) zählen hoch, sobald die Leiste sichtbar ist – Jahreszahlen und Spannen bleiben stehen. */
function Wert({ wert, i }) {
  const m = /^(~?)(\d{1,3})$/.exec(String(wert));
  if (!m || Number(m[2]) === 0) return wert;
  return <Zaehler wert={Number(m[2])} vor={m[1]} dauer={1200} verzoegerung={i * 120} />;
}

/**
 * items: [{ icon, wert, einheit?, label, text }]
 *  wert    große Zahl/Kurzwert, einheit kleiner dahinter
 *  label   grüne Zeile, text erklärend darunter
 */
export default function Faktenleiste({ titel, items = [], unten, className }) {
  const n = items.length;
  return (
    <section aria-label={titel} className={cn("relative z-10 -mt-12 md:-mt-16", unten === "navy" && "bg-[linear-gradient(to_bottom,transparent_50%,var(--color-navy-950)_50%)]", className)}>
      <div className="ov-container">
        <div className="relative rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70 md:rounded-[2rem]">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <dl className={cn("grid px-5 sm:grid-cols-2 sm:px-2 lg:px-0 lg:py-3", n === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
            {items.map((f, i) => (
              <div
                key={f.label}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 border-ink-100 py-5 sm:px-5 sm:py-6 lg:grid-cols-1 lg:px-7 lg:py-5 xl:px-8",
                  i > 0 && "border-t",
                  i % 2 === 1 && "sm:border-l",
                  i === 1 && "sm:border-t-0",
                  i > 0 && "lg:border-l lg:border-t-0"
                )}
              >
                <dt className="col-start-1 row-start-1 lg:row-start-2">
                  <span className="block font-display text-[16px] font-bold leading-tight tracking-[-0.01em] text-ov-700 lg:mt-2.5 lg:text-[17px]">{f.label}</span>
                  <span className="mt-1 block text-pretty text-[14px] leading-snug text-ink-600">{f.text}</span>
                </dt>
                <dd className="col-start-2 row-start-1 flex items-center gap-3 lg:col-start-1 lg:h-12">
                  {f.icon && (
                    <span aria-hidden="true" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200 lg:order-last lg:ml-auto lg:flex">
                      <f.icon className="h-4 w-4" />
                    </span>
                  )}
                  <span className="ov-kpi-l block whitespace-nowrap text-right text-ink-900 lg:text-left">
                    <Wert wert={f.wert} i={i} />
                    {f.einheit && <span className="ov-einheit">{f.einheit}</span>}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
