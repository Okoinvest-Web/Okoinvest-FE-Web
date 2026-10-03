// Kennzahlenleiste (überlappt den Hero) + Sprungnavigation zu den Datenkapiteln
import { cn } from "@/components/ui/cn";
import Zaehler from "@/components/motion/Zaehler";

const KAPITEL = [
  { href: "#ausschreibungen", label: "Ausschreibungen" },
  { href: "#marktwert-solar", label: "Marktwert & Capture Rate" },
  { href: "#zubau", label: "Zubau DACH" },
  { href: "#pacht", label: "Pachtniveau" },
  { href: "#live", label: "Börsenpreis live" },
];

/** kennzahlen: [{ icon, wert, zahl?, stellen?, einheit, text }] */
export default function Kennzahlen({ kennzahlen }) {
  return (
    <section data-abschnitt="kennzahlen" aria-labelledby="kennzahlen-titel" className="relative z-10 -mt-12 md:-mt-16">
      <h2 id="kennzahlen-titel" className="sr-only">Kennzahlen auf einen Blick</h2>
      <div className="ov-container">
        <div className="relative rounded-[1.75rem] bg-white shadow-e4 ring-1 ring-ink-200/70 md:rounded-[2rem]">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {kennzahlen.map((k, i) => (
              <div key={k.text} className={cn("flex flex-col gap-2 border-ink-100 p-5 sm:p-6 lg:px-8", i % 2 === 1 && "border-l", i >= 2 && "border-t lg:border-t-0", i === 2 && "lg:border-l")}>
                <dt className="order-2 text-[13.5px] leading-snug text-ink-600">{k.text}</dt>
                <dd className="order-1 flex items-center justify-between gap-3">
                  <span className="flex items-baseline gap-1.5">
                    <span className="ov-kpi text-ink-900">
                      {/* Count-up nur, wenn der formatierte Wert exakt der Zahl entspricht (sonst statisch) */}
                      {typeof k.zahl === "number" ? <Zaehler wert={k.zahl} nachkomma={k.stellen || 0} verzoegerung={i * 90} dauer={1200} /> : k.wert}
                    </span>
                    <span className="text-[14px] font-bold text-ink-500">{k.einheit}</span>
                  </span>
                  <span aria-hidden="true" className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-600 ring-1 ring-ov-200 sm:flex">
                    <k.icon className="h-4 w-4" />
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <nav aria-label="Kapitel der Marktdaten" className="mt-8 md:mt-10">
          <ul className="ov-no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {KAPITEL.map((k, i) => (
              <li key={k.href} className="shrink-0">
                <a
                  href={k.href}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-ink-700 ring-1 ring-ink-200 transition-colors hover:bg-ov-50 hover:text-ov-800 hover:ring-ov-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500"
                >
                  <span className="ov-num text-[11px] font-bold text-ov-600">{String(i + 1).padStart(2, "0")}</span>
                  {k.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
