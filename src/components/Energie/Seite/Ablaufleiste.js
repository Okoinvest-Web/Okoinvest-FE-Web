// Ablauf als Zeitleiste: ab lg horizontal mit Verbindungslinie, darunter vertikal
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";

/** items: [{ icon, title, text, tag? }] */
export default function Ablaufleiste({ items = [], className }) {
  return (
    <ol className={cn("relative grid gap-0 lg:gap-6", items.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3", className)}>
      <span aria-hidden="true" className="absolute left-[2.25rem] top-[2.25rem] hidden h-px bg-gradient-to-r from-ov-400 via-ov-300 to-navy-300 lg:block" style={{ right: `calc((100% - ${items.length - 1} * 1.5rem) / ${items.length} - 2.25rem)` }} />
      {items.map((s, i) => (
        <Reveal as="li" key={s.title} delay={i * 80} className="relative flex gap-5 pb-9 last:pb-0 lg:flex-col lg:gap-0 lg:pb-0">
          {i < items.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[2.25rem] top-[4.5rem] w-px bg-gradient-to-b from-ov-300 to-ink-200 lg:hidden" />}
          <span aria-hidden="true" className="relative z-10 flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-[1.4rem] bg-white text-ov-600 shadow-e3 ring-1 ring-ink-200/70">
            <s.icon className="h-7 w-7" />
            <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ov-600 text-[12px] font-bold text-white ring-4 ring-white">{i + 1}</span>
          </span>
          <div className="min-w-0 pt-2 lg:mt-6 lg:pt-0">
            {s.tag && <p className="ov-overline text-ink-500">{s.tag}</p>}
            <h3 className="mt-1 font-display text-[19px] font-bold leading-snug text-ink-900">
              <span className="sr-only">Schritt {i + 1}: </span>
              {s.title}
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{s.text}</p>
          </div>
        </Reveal>
      ))}
    </ol>
  );
}
