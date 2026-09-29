import { cn } from "./cn";
import Reveal from "./Reveal";

/**
 * Prozess in nummerierten Schritten mit Verbindungslinie.
 * items: [{ title, text, icon? }]
 */
export default function Steps({ items = [], tone = "light", cols, className }) {
  const dunkel = tone === "dark";
  return (
    <ol className={cn("relative grid gap-6 md:gap-5", cols === 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : cols === 4 || (!cols && items.length >= 4) ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3", className)}>
      <div
        aria-hidden="true"
        className={cn(
          cn("absolute left-0 right-0 top-7 hidden h-px", cols === 2 ? "" : "lg:block"),
          dunkel ? "bg-gradient-to-r from-transparent via-white/20 to-transparent" : "bg-gradient-to-r from-transparent via-ov-300 to-transparent"
        )}
      />
      {items.map((s, i) => {
        const Icon = s.icon;
        return (
          <Reveal as="li" key={s.title} delay={i * 110} className="relative">
            <div
              className={cn(
                "relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl font-display text-[18px] font-extrabold shadow-lg",
                dunkel ? "bg-ov-600 text-white shadow-ov-900/40" : "bg-white text-ov-600 ring-1 ring-ov-200"
              )}
            >
              {Icon ? <Icon aria-hidden="true" className="h-6 w-6" /> : String(i + 1).padStart(2, "0")}
            </div>
            <h3 className={cn("ov-h3 mt-6", dunkel ? "text-white" : "text-ink-900")}>
              {Icon && <span className={cn("mr-2 font-display text-[14px] font-bold", dunkel ? "text-ov-300" : "text-ov-700")}>{String(i + 1).padStart(2, "0")}</span>}
              {s.title}
            </h3>
            <p className={cn("mt-3 text-[15.5px] leading-relaxed", dunkel ? "text-white/65" : "text-ink-600")}>{s.text}</p>
          </Reveal>
        );
      })}
    </ol>
  );
}
